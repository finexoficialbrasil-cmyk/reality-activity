import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get('file');

    if (!file) {
      return Response.json({ error: 'Arquivo não fornecido' }, { status: 400 });
    }

    // Converte arquivo para base64
    const buffer = await file.arrayBuffer();
    const base64Str = btoa(String.fromCharCode(...new Uint8Array(buffer)));
    
    // Faz upload do arquivo
    const res = await base44.integrations.Core.UploadFile({
      file: base64Str
    });

    return Response.json({
      success: true,
      file_url: res.file_url
    });
  } catch (error) {
    console.error('Erro no upload:', error);
    return Response.json({ error: `Erro ao fazer upload: ${error.message}` }, { status: 500 });
  }
});