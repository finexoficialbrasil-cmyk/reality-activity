import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Gera um hash simples baseado no tamanho e primeiros bytes da URL do arquivo
async function simpleHash(str: string): Promise<string> {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `h${Math.abs(hash).toString(36)}_${str.length}`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { purchase_id } = await req.json();

    if (!purchase_id) {
      return Response.json({ error: 'purchase_id obrigatório' }, { status: 400 });
    }

    // Busca a compra
    const purchases = await base44.asServiceRole.entities.PointsPurchase.filter({ id: purchase_id });
    const purchase = purchases[0];

    if (!purchase) {
      return Response.json({ error: 'Compra não encontrada' }, { status: 404 });
    }

    // Verifica permissão
    if (purchase.user_email !== user.email && user.role !== 'admin') {
      return Response.json({ error: 'Acesso negado' }, { status: 403 });
    }

    // Busca configurações
    const settingsList = await base44.asServiceRole.entities.PurchaseSettings.list();
    const settings = settingsList[0] || {
      price_per_point: 0.1,
      bank_holder_name: 'MARCIO JOSE GOMES DE SOUZA',
      bank_cpf: '00568194128',
      bank_name: 'XP INVESTIMENTOS',
      auto_approve_enabled: true,
      ai_analysis_enabled: true
    };

    // Marca como analisando
    await base44.asServiceRole.entities.PointsPurchase.update(purchase_id, {
      status: 'analyzing'
    });

    // ========================================================================
    // DETECÇÃO DE DUPLICIDADE
    // ========================================================================
    const receiptHash = await simpleHash(purchase.receipt_image_url);

    const existingPurchases = await base44.asServiceRole.entities.PointsPurchase.filter({
      receipt_hash: receiptHash
    });

    const duplicates = existingPurchases.filter(p => p.id !== purchase_id);
    const duplicateSuspected = duplicates.length > 0;

    // ========================================================================
    // ANÁLISE POR IA
    // ========================================================================
    let analysis = {
      name_found: null,
      cpf_found: null,
      bank_found: null,
      amount_found: null,
      date_found: null,
      transaction_code_found: null,
      name_match: false,
      cpf_match: false,
      bank_match: false,
      amount_match: false,
      date_valid: false,
      is_valid: false,
      confidence: 0,
      flags: [],
      analysis_text: ''
    };

    if (settings.ai_analysis_enabled) {
      const aiResult = await base44.integrations.Core.InvokeLLM({
        prompt: `Você é um especialista em verificação de comprovantes bancários. Analise este comprovante de pagamento com RIGOR MÁXIMO.

DADOS ESPERADOS (fornecidos pela empresa):
- Nome do recebedor: ${settings.bank_holder_name}
- CPF do recebedor: ${settings.bank_cpf}
- Banco: ${settings.bank_name}
- Valor esperado: R$ ${purchase.amount_paid}

Extraia do comprovante:
1. Nome do pagador (quem enviou)
2. Nome do recebedor (quem recebeu)
3. CPF encontrado (se houver)
4. Banco/instituição
5. Valor pago
6. Data e horário
7. Código/ID da transação

Avalie:
- O comprovante parece autêntico ou há sinais de edição/manipulação?
- O valor confere exatamente com R$ ${purchase.amount_paid}?
- O recebedor confere com "${settings.bank_holder_name}"?
- O documento está legível e completo?

Retorne JSON:
{
  "name_found": string ou null,
  "receiver_name_found": string ou null,
  "cpf_found": string ou null,
  "bank_found": string ou null,
  "amount_found": number ou null,
  "date_found": string ou null (formato ISO),
  "transaction_code_found": string ou null,
  "appears_authentic": boolean,
  "is_legible": boolean,
  "flags": [lista de alertas detectados, ex: "valor_divergente", "nome_incorreto", "possivel_editado"],
  "confidence": number (0-100),
  "observations": string (análise detalhada)
}

Seja rigoroso. Se algo não estiver claro, reporte como null ou false.`,
        file_urls: [purchase.receipt_image_url],
        response_json_schema: {
          type: "object",
          properties: {
            name_found: { type: ["string", "null"] },
            receiver_name_found: { type: ["string", "null"] },
            cpf_found: { type: ["string", "null"] },
            bank_found: { type: ["string", "null"] },
            amount_found: { type: ["number", "null"] },
            date_found: { type: ["string", "null"] },
            transaction_code_found: { type: ["string", "null"] },
            appears_authentic: { type: "boolean" },
            is_legible: { type: "boolean" },
            flags: { type: "array", items: { type: "string" } },
            confidence: { type: "number" },
            observations: { type: "string" }
          }
        }
      });

      const ai = aiResult.data;

      // Comparações
      const expectedName = settings.bank_holder_name?.toLowerCase() || '';
      const foundReceiver = (ai.receiver_name_found || ai.name_found || '')?.toLowerCase();
      const nameMatch = foundReceiver && (
        foundReceiver.includes(expectedName) ||
        expectedName.includes(foundReceiver) ||
        foundReceiver.split(' ').slice(0, 2).every(part => expectedName.includes(part))
      );

      const expectedCpf = (settings.bank_cpf || '').replace(/\D/g, '');
      const foundCpf = (ai.cpf_found || '').replace(/\D/g, '');
      const cpfMatch = foundCpf && foundCpf === expectedCpf;

      const expectedBank = (settings.bank_name || '').toLowerCase();
      const foundBank = (ai.bank_found || '').toLowerCase();
      const bankMatch = foundBank && (
        foundBank.includes(expectedBank) ||
        expectedBank.includes(foundBank)
      );

      const amountMatch = ai.amount_found !== null && Math.abs(ai.amount_found - purchase.amount_paid) < 0.01;

      const now = new Date();
      const depositDate = ai.date_found ? new Date(ai.date_found) : null;
      const hoursDiff = depositDate ? (now.getTime() - depositDate.getTime()) / (1000 * 60 * 60) : 999;
      const dateValid = depositDate && hoursDiff >= -1 && hoursDiff <= 48;

      const flags = ai.flags || [];
      if (duplicateSuspected) flags.push('comprovante_duplicado');

      analysis = {
        name_found: ai.receiver_name_found || ai.name_found,
        cpf_found: ai.cpf_found,
        bank_found: ai.bank_found,
        amount_found: ai.amount_found,
        date_found: ai.date_found,
        transaction_code_found: ai.transaction_code_found,
        name_match: !!nameMatch,
        cpf_match: !!cpfMatch,
        bank_match: !!bankMatch,
        amount_match: !!amountMatch,
        date_valid: !!dateValid,
        is_valid: false, // definido abaixo
        confidence: ai.confidence || 0,
        flags,
        analysis_text: ai.observations || ''
      };

      // ========================================================================
      // REGRA DE APROVAÇÃO AUTOMÁTICA
      // ========================================================================
      const allConditionsMet = nameMatch && amountMatch && dateValid && ai.appears_authentic && ai.is_legible;
      const noFlags = flags.length === 0;
      const highConfidence = (ai.confidence || 0) >= 80;

      analysis.is_valid = !!(allConditionsMet && noFlags && highConfidence && !duplicateSuspected);

      // ========================================================================
      // DECISÃO: APROVAR AUTOMATICAMENTE OU ENVIAR PARA ANÁLISE
      // ========================================================================
      let newStatus = 'under_review';
      let approvalType = 'none';
      let pointsCredited = false;

      if (analysis.is_valid && settings.auto_approve_enabled) {
        newStatus = 'approved';
        approvalType = 'auto';
      } else if (!analysis.is_valid) {
        // Se condições claramente falharam, pode rejeitar automaticamente OU mandar para revisão
        // Melhor mandar para revisão para o admin decidir
        newStatus = 'under_review';
      }

      // Atualiza a compra
      await base44.asServiceRole.entities.PointsPurchase.update(purchase_id, {
        status: newStatus,
        receipt_analysis: analysis,
        receipt_hash: receiptHash,
        duplicate_suspected: duplicateSuspected,
        approval_type: approvalType
      });

      // Se aprovado automaticamente, credita os pontos
      if (newStatus === 'approved' && !purchase.points_credited) {
        await creditPoints(base44, purchase, settings);
        pointsCredited = true;
        await base44.asServiceRole.entities.PointsPurchase.update(purchase_id, {
          points_credited: true
        });
      }

      return Response.json({
        purchase_id,
        status: newStatus,
        approval_type: approvalType,
        points_credited: pointsCredited,
        analysis,
        duplicate_suspected: duplicateSuspected
      });
    }

    // Se IA desativada, envia para revisão manual
    await base44.asServiceRole.entities.PointsPurchase.update(purchase_id, {
      status: 'under_review',
      receipt_hash: receiptHash,
      duplicate_suspected: duplicateSuspected
    });

    return Response.json({
      purchase_id,
      status: 'under_review',
      analysis,
      duplicate_suspected: duplicateSuspected
    });

  } catch (error) {
    // Em caso de erro, envia para revisão manual e retorna análise parcial
    try {
      const body = await req.json().catch(() => ({}));
      if (body?.purchase_id) {
        const b = createClientFromRequest(req);
        await b.asServiceRole.entities.PointsPurchase.update(body.purchase_id, {
          status: 'under_review'
        });
      }
    } catch (_) {}

    return Response.json({
      purchase_id: null,
      status: 'under_review',
      approval_type: 'none',
      points_credited: false,
      analysis: {
        name_found: null,
        cpf_found: null,
        bank_found: null,
        amount_found: null,
        date_found: null,
        transaction_code_found: null,
        name_match: false,
        cpf_match: false,
        bank_match: false,
        amount_match: false,
        date_valid: false,
        is_valid: false,
        confidence: 0,
        flags: ['erro_analise_automatica'],
        analysis_text: 'Não foi possível concluir a validação automática. O comprovante foi encaminhado para revisão manual.'
      },
      duplicate_suspected: false,
      error: error.message
    });
  }
});

// ========================================================================
// FUNÇÃO: CREDITAR PONTOS
// ========================================================================
async function creditPoints(base44: any, purchase: any, settings: any) {
  const totalPoints = (purchase.points_requested || 0) + (purchase.bonus_points || 0);

  // Atualiza saldo do usuário
  const userPoints = await base44.asServiceRole.entities.UserPoints.filter({ user_email: purchase.user_email });
  if (userPoints.length > 0) {
    await base44.asServiceRole.entities.UserPoints.update(userPoints[0].id, {
      balance: (userPoints[0].balance || 0) + totalPoints,
      total_earned: (userPoints[0].total_earned || 0) + totalPoints,
      last_activity: new Date().toISOString()
    });
  } else {
    await base44.asServiceRole.entities.UserPoints.create({
      user_email: purchase.user_email,
      user_name: purchase.user_name,
      total_earned: totalPoints,
      balance: totalPoints,
      last_activity: new Date().toISOString()
    });
  }

  // Registra transação
  await base44.asServiceRole.entities.PointsTransaction.create({
    user_email: purchase.user_email,
    user_name: purchase.user_name,
    type: 'earned_bonus',
    points: totalPoints,
    description: `Compra de ${purchase.points_requested} pontos (R$ ${purchase.amount_paid})${purchase.bonus_points ? ' + ' + purchase.bonus_points + ' bônus' : ''}`
  });
}