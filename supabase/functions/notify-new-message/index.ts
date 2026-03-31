const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const INTERNAL_SECRET = Deno.env.get('INTERNAL_SECRET') ?? 'agrowlink-internal-2026';

Deno.serve(async (req) => {
  // Verify the request comes from our own database trigger
  const internalSecret = req.headers.get('x-internal-secret');
  if (!internalSecret || internalSecret !== INTERNAL_SECRET) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const {
      receiver_email,
      receiver_name,
      sender_name,
      listing_species,
      message_preview,
    } = await req.json();

    if (!receiver_email) {
      return new Response('Missing receiver_email', { status: 400 });
    }

    const firstName = receiver_name?.split(' ')[0] || 'Agricultor';
    const species = listing_species || 'animais';

    const html = `
<div style="max-width:480px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <div style="background:#fdfcf5;border-radius:24px;overflow:hidden;border:1px solid #e2e8d0;">
    <div style="background:#2d5a27;padding:36px 28px 32px;text-align:center;">
      <p style="color:rgba(255,255,255,0.6);font-size:10px;letter-spacing:0.25em;text-transform:uppercase;font-weight:700;margin:0 0 10px 0;">Marketplace Agrícola de Portugal</p>
      <span style="color:#ffffff;font-size:26px;font-weight:900;letter-spacing:0.12em;text-transform:uppercase;">AgrowLink</span>
    </div>
    <div style="height:4px;background:#5d4037;"></div>
    <div style="padding:40px 32px 32px;background:#fdfcf5;">
      <h1 style="color:#2d5a27;font-size:22px;font-weight:900;text-align:center;text-transform:uppercase;letter-spacing:0.12em;margin:0 0 12px 0;line-height:1.2;">Nova Mensagem</h1>
      <p style="color:#5d4037;font-size:13px;font-weight:700;text-align:center;text-transform:uppercase;letter-spacing:0.15em;margin:0 0 20px 0;">Tem uma resposta pendente</p>
      <div style="border-top:2px solid #e4e9d5;margin:0 0 24px 0;"></div>
      <p style="color:#4a5568;font-size:15px;line-height:1.7;text-align:center;margin:0 0 20px 0;">
        Olá ${firstName}, <strong>${sender_name}</strong> enviou-lhe uma mensagem sobre o seu anúncio de <strong>${species}</strong> no AgrowLink.
      </p>
      ${message_preview ? `
      <div style="background:#f1f3ec;border-radius:16px;padding:16px 20px;margin:0 0 28px 0;border-left:4px solid #2d5a27;">
        <p style="color:#4a5568;font-size:14px;line-height:1.6;margin:0;font-style:italic;">"${message_preview}${message_preview.length >= 100 ? '...' : ''}"</p>
      </div>
      ` : ''}
      <div style="text-align:center;margin:0 0 32px 0;">
        <a href="https://agrowlink.app" style="display:inline-block;background:#2d5a27;color:#ffffff;font-size:13px;font-weight:900;text-decoration:none;padding:18px 44px;border-radius:40px;letter-spacing:0.2em;text-transform:uppercase;">VER MENSAGEM</a>
      </div>
      <div style="background:#f1f3ec;border-radius:16px;padding:16px 20px;text-align:center;">
        <p style="color:#6b7280;font-size:12px;line-height:1.6;margin:0;">
          Responda diretamente através da plataforma AgrowLink. Não responda a este email.
        </p>
      </div>
    </div>
    <div style="background:#2d5a27;padding:20px 28px;text-align:center;">
      <p style="color:rgba(255,255,255,0.9);font-size:11px;font-weight:900;letter-spacing:0.2em;text-transform:uppercase;margin:0 0 6px 0;">© 2026 AgrowLink</p>
      <p style="color:rgba(255,255,255,0.5);font-size:11px;margin:0;">agrowlink.app · av.pereiradacosta@gmail.com</p>
    </div>
  </div>
</div>`;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'AgrowLink <onboarding@resend.dev>',
        to: [receiver_email],
        subject: `Nova mensagem de ${sender_name} — AgrowLink`,
        html,
      }),
    });

    if (!res.ok) {
      const error = await res.text();
      console.error('Resend error:', error);
      return new Response(JSON.stringify({ error }), { status: 500 });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('Edge function error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
    });
  }
});
