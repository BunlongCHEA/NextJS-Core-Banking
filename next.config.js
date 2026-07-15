/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  /**
   * API proxy — rewrites browser requests for /api/v1/* to the Spring Boot
   * backend on CBS_API_URL (server-only env var, never exposed to the browser).
   *
   * WHY THIS IS BETTER THAN CORS HEADERS:
   *   The browser only ever talks to its own origin (localhost:3000).
   *   Next.js makes the actual HTTP call to Spring Boot from the server,
   *   so the browser never sends a cross-origin request → no CORS preflight.
   *
   * HOW TO CONFIGURE:
   *   .env.local → CBS_API_URL=http://localhost:8080   (or wherever Spring runs)
   *   .env.local → NEXT_PUBLIC_API_BASE_URL=/api/v1    (relative — keeps browser same-origin)
   *
   * The Spring Boot server still has CORS headers configured as a fallback
   * (e.g. for Swagger UI, Postman, or mobile clients hitting the API directly).
   */
  async rewrites() {
    const backendUrl = process.env.CBS_API_URL ?? "http://127.0.0.1:80";
    return [
      {
        source: "/api/v1/:path*",
        destination: `${backendUrl}/api/v1/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
