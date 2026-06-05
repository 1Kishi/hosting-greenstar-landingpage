export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

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
      
          return env.ASSETS.fetch(request);
        },
      };

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  RESEND_API_KEY: string;
  TURNSTILE_SECRET_KEY: string;
}
