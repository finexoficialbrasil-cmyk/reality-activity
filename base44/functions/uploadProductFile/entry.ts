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

    // Converte o arquivo para base64
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);
    
    // Faz upload do arquivo
    const res = await base44.integrations.Core.UploadFile({
      file: base64
    });

    return Response.json({
      success: true,
      file_url: res.file_url
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});