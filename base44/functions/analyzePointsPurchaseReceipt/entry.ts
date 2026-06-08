import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { purchase_id } = await req.json();

    if (!purchase_id) {
      return Response.json({ error: 'purchase_id required' }, { status: 400 });
    }

    // Get the purchase record
    const purchase = await base44.asServiceRole.entities.PointsPurchase.read(purchase_id);

    if (!purchase) {
      return Response.json({ error: 'Purchase not found' }, { status: 404 });
    }

    // Update status to analyzing
    await base44.asServiceRole.entities.PointsPurchase.update(purchase_id, {
      status: 'analyzing'
    });

    // Use InvokeLLM to analyze the receipt
    const analysisResult = await base44.integrations.Core.InvokeLLM({
      prompt: `Analise este comprovante de depósito bancário e extraia as seguintes informações:

1. Nome do titular/beneficiário: ${purchase.user_name}
2. Valor do depósito: R$ ${purchase.amount_paid}
3. Data do depósito (não pode ter mais de 24 horas atrás)

Retorne um JSON com:
{
  "name_found": string ou null (nome encontrado no comprovante),
  "amount_found": number ou null (valor encontrado),
  "date_found": string ou null (data encontrada no formato YYYY-MM-DD),
  "observations": string (observações sobre o comprovante)
}

Por favor, seja rigoroso. Se algo não estiver claro, reporte como não encontrado.`,
      add_context_from_internet: false,
      response_json_schema: {
        type: "object",
        properties: {
          name_found: { type: ["string", "null"] },
          amount_found: { type: ["number", "null"] },
          date_found: { type: ["string", "null"] },
          observations: { type: "string" }
        }
      }
    });

    const analysis = analysisResult.data;

    // Validate the analysis
    const now = new Date();
    const depositDate = analysis.date_found ? new Date(analysis.date_found) : null;
    const hoursDiff = depositDate ? (now - depositDate) / (1000 * 60 * 60) : 999;

    const nameMatch = analysis.name_found && analysis.name_found.toLowerCase().includes(purchase.user_name.split(' ')[0].toLowerCase());
    const amountMatch = analysis.amount_found === purchase.amount_paid;
    const dateValid = hoursDiff >= 0 && hoursDiff <= 24;
    const isValid = nameMatch && amountMatch && dateValid;

    // If all checks pass → approved. Otherwise → analyzing (manual review)
    let status = 'approved';
    let rejectionReason = null;
    
    if (!isValid) {
      status = 'analyzing'; // Will be reviewed manually
      // Don't set rejection reason - let admin review without bias
    }

    await base44.asServiceRole.entities.PointsPurchase.update(purchase_id, {
      status,
      rejection_reason: rejectionReason,
      receipt_analysis: {
        name_match: nameMatch,
        amount_match: amountMatch,
        date_valid: dateValid,
        is_valid: isValid,
        analysis_text: analysis.observations
      }
    });

    // If approved, credit the points
    if (isValid) {
      const userPoints = await base44.asServiceRole.entities.UserPoints.filter({ user_email: purchase.user_email });

      if (userPoints.length > 0) {
        await base44.asServiceRole.entities.UserPoints.update(userPoints[0].id, {
          balance: (userPoints[0].balance || 0) + purchase.points_requested,
          total_earned: (userPoints[0].total_earned || 0) + purchase.points_requested
        });
      } else {
        await base44.asServiceRole.entities.UserPoints.create({
          user_email: purchase.user_email,
          user_name: purchase.user_name,
          balance: purchase.points_requested,
          total_earned: purchase.points_requested
        });
      }

      await base44.asServiceRole.entities.PointsTransaction.create({
        user_email: purchase.user_email,
        user_name: purchase.user_name,
        type: 'earned_bonus',
        points: purchase.points_requested,
        description: `Compra de ${purchase.points_requested} pontos por R$ ${purchase.amount_paid}`
      });
    }

    return Response.json({
      purchase_id,
      status,
      is_valid: isValid,
      rejection_reason: rejectionReason,
      analysis
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});