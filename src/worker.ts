export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/contact" && request.method === "POST") {
      return Response.json({
        ok: true,
        message: "API route works.",
      });
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