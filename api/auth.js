export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  const { email, password } = await req.json();

  const allowed = (process.env.ALLOWED_EMAILS || '').split(',').map(e => e.trim().toLowerCase());
  const appPassword = process.env.APP_PASSWORD || '';

  if (!email || !password) {
    return new Response(JSON.stringify({ error: 'Email e senha obrigatórios' }), { status: 400 });
  }

  if (password !== appPassword) {
    return new Response(JSON.stringify({ error: 'Senha incorreta' }), { status: 401 });
  }

  if (!email.toLowerCase().endsWith('@crmbonus.com')) {
    return new Response(JSON.stringify({ error: 'Use seu e-mail @crmbonus.com' }), { status: 401 });
  }

  if (!allowed.includes(email.toLowerCase())) {
    return new Response(JSON.stringify({ error: 'E-mail não autorizado' }), { status: 403 });
  }

  return new Response(JSON.stringify({ ok: true, email: email.toLowerCase() }), { status: 200 });
}
