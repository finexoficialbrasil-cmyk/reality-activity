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
    const purchases = await base44.asServiceRole.entities.PointsPurchase.filter({ id: purchase_id });
    const purchase = purchases[0];

    if (!purchase) {
      return Response.json({ error: 'Purchase not found' }, { status: 404 });
    }

    // Verifica se o comprovante pertence ao usuário autenticado
    if (purchase.user_email !== user.email && user.role !== 'admin') {
      return Response.json({ error: 'Acesso negado a este comprovante' }, { status: 403 });
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

    // Always send to admin for manual review (never auto-approve)
    await base44.asServiceRole.entities.PointsPurchase.update(purchase_id, {
      status: 'analyzing',
      receipt_analysis: {
        name_match: nameMatch,
        amount_match: amountMatch,
        date_valid: dateValid,
        is_valid: isValid,
        analysis_text: analysis.observations
      }
    });

    return Response.json({
      purchase_id,
      status: 'analyzing',
      is_valid: isValid,
      analysis
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});