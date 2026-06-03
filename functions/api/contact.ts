interface Env {
  DB: D1Database;
  TURNSTILE_SECRET_KEY?: string;
  // Resend e-mail notifications (optional — when unset, leads are only stored in D1)
  RESEND_API_KEY?: string;
  MAIL_FROM?: string; // e.g. "GreenStar <poptavka@vasedomena.cz>" (must be a Resend-verified domain)
  MAIL_TO?: string; // defaults to jacobworkgreen@gmail.com
}

interface Lead {
  name: string;
  email: string;
  phone: string;
  interest: string;
  contactMethod: string;
  message: string;
  hasWebsite: number;
  hasDomain: number;
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
    },
  });
}

function clean(value: FormDataEntryValue | null, max = 500) {
  return String(value ?? "").trim().slice(0, max);
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Sends a notification e-mail via Resend. Never throws — a failed e-mail
// must not lose a lead that is already saved in D1.
async function notifyByEmail(env: Env, lead: Lead): Promise<void> {
  if (!env.RESEND_API_KEY || !env.MAIL_FROM) return;

  const to = env.MAIL_TO || "jacobworkgreen@gmail.com";
  const yesNo = (n: number) => (n ? "ano" : "ne");

  const rows: [string, string][] = [
    ["Jméno", lead.name],
    ["E-mail", lead.email],
    ["Telefon", lead.phone || "—"],
    ["Zájem o", lead.interest || "—"],
    ["Už má web", yesNo(lead.hasWebsite)],
    ["Už má doménu", yesNo(lead.hasDomain)],
    ["Preferovaný kontakt", lead.contactMethod || "—"],
  ];

  const textBody =
    rows.map(([k, v]) => `${k}: ${v}`).join("\n") +
    `\n\nZpráva:\n${lead.message || "(bez zprávy)"}`;

  const htmlRows = rows
    .map(
      ([k, v]) =>
        `<tr><td style="padding:4px 12px 4px 0;color:#666">${escapeHtml(k)}</td>` +
        `<td style="padding:4px 0"><strong>${escapeHtml(v)}</strong></td></tr>`
    )
    .join("");

  const htmlBody =
    `<h2 style="font-family:sans-serif">Nová poptávka z webu</h2>` +
    `<table style="font-family:sans-serif;font-size:14px;border-collapse:collapse">${htmlRows}</table>` +
    `<p style="font-family:sans-serif;font-size:14px;white-space:pre-wrap;margin-top:16px">` +
    `<strong>Zpráva:</strong><br>${escapeHtml(lead.message || "(bez zprávy)")}</p>`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from: env.MAIL_FROM,
        to: [to],
        // Reply straight to the visitor when you hit "Reply" in Gmail.
        reply_to: lead.email || undefined,
        subject: `Nová poptávka z webu — ${lead.name}`,
        text: textBody,
        html: htmlBody,
      }),
    });
    if (!res.ok) {
      console.error("Resend error", res.status, await res.text());
    }
  } catch (e) {
    console.error("Resend request failed", e);
  }
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const form = await request.formData();

    const name = clean(form.get("name"), 120);
    const email = clean(form.get("email"), 180);
    const phone = clean(form.get("phone"), 80);
    const interest = clean(form.get("interest"), 160);
    const contactMethod = clean(form.get("contact_method"), 40);
    const message = clean(form.get("message"), 2000);

    const hasWebsite = form.get("has_website") ? 1 : 0;
    const hasDomain = form.get("has_domain") ? 1 : 0;
    const gdpr = form.get("gdpr") ? 1 : 0;

    // Honeypot field. Add this as hidden input in the form.
    const companyWebsite = clean(form.get("company_website"), 200);
    if (companyWebsite) {
      return json({ ok: true });
    }

    if (!name || !email || !gdpr) {
      return json(
        { ok: false, message: "Vyplňte prosím jméno, e-mail a souhlas." },
        400
      );
    }

    if (!email.includes("@") || email.length < 5) {
      return json({ ok: false, message: "Zadejte prosím platný e-mail." }, 400);
    }

    // Optional Turnstile validation.
    // Recommended before production.
    if (env.TURNSTILE_SECRET_KEY) {
      const token = clean(form.get("cf-turnstile-response"), 2048);

      if (!token) {
        return json({ ok: false, message: "Ověření proti spamu chybí." }, 400);
      }

      const verify = await fetch(
        "https://challenges.cloudflare.com/turnstile/v0/siteverify",
        {
          method: "POST",
          body: new URLSearchParams({
            secret: env.TURNSTILE_SECRET_KEY,
            response: token,
          }),
        }
      );

      const result = (await verify.json()) as { success?: boolean };

      if (!result.success) {
        return json({ ok: false, message: "Ověření proti spamu selhalo." }, 400);
      }
    }

    const userAgent = request.headers.get("user-agent") ?? "";
    const ip =
      request.headers.get("cf-connecting-ip") ??
      request.headers.get("x-forwarded-for") ??
      "";

    const ipHash = ip ? await sha256(ip) : "";

    await env.DB.prepare(`
      INSERT INTO leads (
        name,
        email,
        phone,
        interest,
        has_website,
        has_domain,
        contact_method,
        message,
        gdpr_consent,
        status,
        source,
        ip_hash,
        user_agent
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', 'website', ?, ?)
    `)
      .bind(
        name,
        email,
        phone,
        interest,
        hasWebsite,
        hasDomain,
        contactMethod,
        message,
        gdpr,
        ipHash,
        userAgent.slice(0, 500)
      )
      .run();

    // Fire the notification e-mail. Awaited so logs are captured, but it never
    // throws — the lead is already safely stored in D1.
    await notifyByEmail(env, {
      name,
      email,
      phone,
      interest,
      contactMethod,
      message,
      hasWebsite,
      hasDomain,
    });

    return json({
      ok: true,
      message: "Děkuji, poptávka byla odeslána. Ozvu se do 1 pracovního dne.",
    });
  } catch (error) {
    console.error(error);
    return json(
      { ok: false, message: "Něco se pokazilo. Zkuste to prosím znovu." },
      500
    );
  }
};

async function sha256(input: string) {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(hash)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
