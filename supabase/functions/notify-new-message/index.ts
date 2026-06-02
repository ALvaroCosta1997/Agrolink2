import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
// No fallback: if this env var is missing the function must fail loudly, not silently accept a public string.
const INTERNAL_SECRET = Deno.env.get('INTERNAL_SECRET')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Throttle: at most one notification email per receiver per THROTTLE_MINUTES.
const THROTTLE_MINUTES = 30;

const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

Deno.serve(async (req) => {
  // Verify the request comes from our own database trigger
  const internalSecret = req.headers.get('x-internal-secret');
  if (!internalSecret || internalSecret !== INTERNAL_SECRET) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const {
      receiver_id,
      receiver_email,
      receiver_name,
      sender_name,
      listing_species,
      message_preview,
    } = await req.json();

    if (!receiver_email) {
      return new Response('Missing receiver_email', { status: 400 });
    }

    // P2.8 throttle: if we have a receiver_id, check whether we've emailed them recently.
    // (receiver_id is optional for backward compatibility with any pending payloads from the
    // old trigger version; once the trigger is updated, it will always be present.)
    if (receiver_id) {
      const since = new Date(Date.now() - THROTTLE_MINUTES * 60 * 1000).toISOString();
      const { data: recent, error: lookupError } = await adminClient
        .from('email_sends')
        .select('id')
        .eq('user_id', receiver_id)
        .gte('sent_at', since)
        .limit(1);

      if (lookupError) {
        console.error('Throttle lookup failed (sending anyway):', lookupError);
      } else if (recent && recent.length > 0) {
        console.log(`Throttled: user ${receiver_id} received an email within last ${THROTTLE_MINUTES}min`);
        return new Response(JSON.stringify({ throttled: true }), {
          headers: { 'Content-Type': 'application/json' },
        });
      }
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
        from: 'AgrowLink <notifications@agrowlink.app>',
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

    // P2.8: record successful send so we can throttle subsequent ones.
    // Only record if we have a receiver_id (otherwise throttling can't apply anyway).
    if (receiver_id) {
      const { error: insertError } = await adminClient
        .from('email_sends')
        .insert({ user_id: receiver_id });
      if (insertError) {
        // Don't fail the whole request — the email already sent. Just log.
        console.error('Failed to record email_sends row:', insertError);
      }
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
