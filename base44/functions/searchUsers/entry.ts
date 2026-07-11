import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { query } = await req.json();
    if (!query || query.length < 3) return Response.json({ users: [] });

    const q = query.toLowerCase();

    // Busca usuários via service role (apenas admins listam usuários normalmente)
    const allUsers = await base44.asServiceRole.entities.User.list('-created_date', 200);
    const filtered = allUsers
      .filter(u => u.email !== user.email)
      .filter(u =>
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.full_name && u.full_name.toLowerCase().includes(q))
      )
      .slice(0, 8);

    // Busca saldos de todos para montar mapa
    const allPoints = await base44.asServiceRole.entities.UserPoints.list('-created_date', 500);
    const pointsMap = {};
    allPoints.forEach(p => { pointsMap[p.user_email] = p.balance || 0; });

    const result = filtered.map(u => ({
      id: u.id,
      email: u.email,
      full_name: u.full_name,
      balance: pointsMap[u.email] || 0
    }));

    return Response.json({ users: result });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});