import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Target gateway for the api-facade proxy (override with WRAPPED_API_TARGET).
const API_TARGET =
  process.env.WRAPPED_API_TARGET || "https://api-gateway-dev.phorest.com";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    // Proxy GraphQL calls to the dev gateway so the browser stays same-origin
    // (no CORS). The frontend calls the relative "/api-facade/graphql".
    proxy: {
      "/api-facade": {
        target: API_TARGET,
        changeOrigin: true,
        secure: true,
        configure: (proxy) => {
          // Mirror the working curl: the gateway is happiest without a
          // browser Origin/Referer on the forwarded request.
          proxy.on("proxyReq", (proxyReq) => {
            proxyReq.removeHeader("origin");
            proxyReq.removeHeader("referer");
          });
        },
      },
    },
  },
});
