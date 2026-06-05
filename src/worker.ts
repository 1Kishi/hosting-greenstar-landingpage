export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/contact" && request.method === "POST") {
      try {
        const formData = await request.formData();

        const name = String(formData.get("name") || "");
        const email = String(formData.get("email") || "");
        const phone = String(formData.get("phone") || "");
        const service = String(formData.get("service") || "");
        const message = String(formData.get("message") || "");

        await env.DB.prepare(
          `INSERT INTO leads (name, email, phone, service, message, created_at)
           VALUES (?, ?, ?, ?, ?, datetime('now'))`
        )
          .bind(name, email, phone, service, message)
          .run();

        return Response.json({
          ok: true,
          message: "Saved to D1.",
        });
      } catch (error) {
        console.error("Contact form error:", error);

        return Response.json(
          {
            ok: false,
            error: error instanceof Error ? error.message : "Unknown server error",
          },
          { status: 500 }
        );
      }
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
