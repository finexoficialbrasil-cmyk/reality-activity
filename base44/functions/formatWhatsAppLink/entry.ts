import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const { phone } = await req.json();
    
    if (!phone) {
      return Response.json({ error: 'Telefone não fornecido' }, { status: 400 });
    }

    // Remove tudo que não é número
    let phoneClean = phone.replace(/\D/g, '');
    
    // Se tem menos de 10 dígitos, inválido
    if (phoneClean.length < 10) {
      return Response.json({ error: 'Telefone inválido' }, { status: 400 });
    }

    // Se não começa com 55, adiciona (código Brasil)
    if (!phoneClean.startsWith('55')) {
      phoneClean = '55' + phoneClean;
    }

    const message = `Olá! Conheci seu trabalho pelo grupo Reality Activity e tenho interesse nos seus produtos e sistemas. Pode me enviar mais detalhes?`;
    const encodedMsg = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${phoneClean}?text=${encodedMsg}`;

    return Response.json({ 
      success: true, 
      url: whatsappUrl,
      phone: phoneClean 
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});