export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (
      (url.pathname === "/api/contact" || url.pathname === "/api/contact/") &&
      request.method === "POST"
    ) {
      try {
        const formData = await request.formData();

        const name = String(formData.get("name") || "");
        const email = String(formData.get("email") || "");
        const phone = String(formData.get("phone") || "");
        const interest = String(formData.get("service") || formData.get("interest") || "");
        const contactMethod = String(
          formData.get("contact_method") || formData.get("contactMethod") || ""
        );
        const message = String(formData.get("message") || "");
        const hasWebsite =
          formData.get("has_website") === "on" ||
          formData.get("hasWebsite") === "true";
        const hasDomain =
          const checkboxIsChecked = (value: FormDataEntryValue | null) =>
            value === "on" || value === "true" || value === "ano" || value === "1";
          
          const hasWebsite = checkboxIsChecked(formData.get("has_website"));
          const hasDomain = checkboxIsChecked(formData.get("has_domain"));
          const gdprConsent = checkboxIsChecked(
            formData.get("gdpr_consent") || formData.get("gdpr")
          );
        
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
            user_agent,
            created_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
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
            request.headers.get("user-agent") || ""
          )
          .run();

        return Response.json({
          ok: true,
          message: "Poptávka byla uložená.",
        });
      } catch (error) {
        return Response.json(
          {
            ok: false,
            error: error instanceof Error ? error.message : "Unknown server error",
          },
          { status: 500 }
        );
      }
    }

    if (url.pathname.startsWith("/api/")) {
      return Response.json(
        {
          ok: false,
          error: "API route not found",
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
}
