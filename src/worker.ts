export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (
      (url.pathname === "/api/contact" || url.pathname === "/api/contact/") &&
      request.method === "POST"
    ) {
      try {
        const formData = await request.formData();

        const checkboxIsChecked = (value: FormDataEntryValue | null) =>
          value === "on" || value === "true" || value === "ano" || value === "1";

        const name = String(formData.get("name") || "").trim();
        const email = String(formData.get("email") || "").trim();
        const phone = String(formData.get("phone") || "").trim();
        const interest = String(
          formData.get("interest") || formData.get("service") || ""
        ).trim();

        const contactMethod = String(
          formData.get("contact_method") || formData.get("contactMethod") || ""
        ).trim();

        const message = String(formData.get("message") || "").trim();

        const hasWebsite = checkboxIsChecked(formData.get("has_website"));
        const hasDomain = checkboxIsChecked(formData.get("has_domain"));
        const gdprConsent = checkboxIsChecked(
          formData.get("gdpr_consent") || formData.get("gdpr")
        );

        // Basic validation
        if (!name || !email || !gdprConsent) {
          return Response.json(
            {
              ok: false,
              message: "Vyplňte prosím jméno, e-mail a souhlas se zpracováním údajů.",
            },
            { status: 400 }
          );
        }

        // Honeypot anti-spam field
        const honeypot = String(formData.get("company_website") || "");
        if (honeypot) {
          return Response.json({
            ok: true,
            message: "Děkuji, poptávka byla odeslána.",
          });
        }

        const userAgent = request.headers.get("user-agent") || "";
        const ipHash = null;

        // Save to D1
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
            user_agent,
            created_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `)
          .bind(
            name,
            email,
            phone,
            interest,
            hasWebsite ? 1 : 0,
            hasDomain ? 1 : 0,
            contactMethod,
            message,
            gdprConsent ? 1 : 0,
            "new",
            "website",
            ipHash,
            userAgent
          )
          .run();

        // Send email through Resend
        if (env.RESEND_API_KEY) {
          const emailText = `
Nová poptávka z webu GreenStar

Jméno: ${name}
E-mail: ${email}
Telefon: ${phone || "neuvedeno"}

Co potřebuje:
${interest || "neuvedeno"}

Má webové stránky: ${hasWebsite ? "Ano" : "Ne"}
Má vlastní doménu: ${hasDomain ? "Ano" : "Ne"}
Preferovaný kontakt: ${contactMethod || "neuvedeno"}

Zpráva:
${message || "bez zprávy"}

GDPR souhlas: ${gdprConsent ? "Ano" : "Ne"}
Zdroj: website
          `.trim();

          const resendResponse = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${env.RESEND_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: env.MAIL_FROM || "GreenStar <onboarding@resend.dev>",
              to: [env.MAIL_TO || "jacobworkgreen@gmail.com"],
              reply_to: email,
              subject: `Nová poptávka z webu: ${name}`,
              text: emailText,
            }),
          });

          if (!resendResponse.ok) {
            const resendError = await resendResponse.text();

            console.error("Resend failed:", resendError);

            return Response.json(
              {
                ok: true,
                message:
                  "Poptávka byla uložená, ale e-mailové upozornění se nepodařilo odeslat.",
                emailError: resendError,
              },
              { status: 200 }
            );
          }
        }

        return Response.json({
          ok: true,
          message: "Děkuji, poptávka byla odeslána. Ozvu se do jednoho pracovního dne.",
        });
      } catch (error) {
        console.error("Contact form error:", error);

        return Response.json(
          {
            ok: false,
            message:
              error instanceof Error
                ? error.message
                : "Něco se pokazilo při odesílání formuláře.",
          },
          { status: 500 }
        );
      }
    }

    if (url.pathname.startsWith("/api/")) {
      return Response.json(
        {
          ok: false,
          message: "API route not found.",
          path: url.pathname,
          method: request.method,
        },
        { status: 404 }
      );
    }

    return env.ASSETS.fetch(request);
  },
};

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  RESEND_API_KEY: string;
  TURNSTILE_SECRET_KEY: string;
  MAIL_FROM?: string;
  MAIL_TO?: string;
}
