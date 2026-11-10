import type { NextConfig } from "next";
import path from "node:path";

// El CSP con nonce se genera por request en src/proxy.ts. Aqui van las cabeceras estaticas.
const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

// Equivale a createNextIntlPlugin("./src/i18n/request.ts") sin cargar el plugin: este importa @swc/core,
// cuyo binario nativo falla en Windows cuando la raiz del disco concede derechos de reemplazo a "Usuarios autenticados".
// El plugin solo registra el alias next-intl/config; se declara aqui de forma explicita.
const requestConfig = "./src/i18n/request.ts";

const nextConfig: NextConfig = {
  turbopack: { resolveAlias: { "next-intl/config": requestConfig } },
  webpack(config) {
    config.resolve.alias["next-intl/config"] = path.resolve(config.context, requestConfig);
    return config;
  },
  poweredByHeader: false,
  // Oculta la insignia flotante de Next ("Compiling...") que solo existe con `npm run dev`; en produccion nunca se incluye.
  devIndicators: false,
  // Solo WebP: las portadas ya vienen en WebP y codificar AVIF bajo demanda satura la CPU (y retrasa las demas peticiones) por una ganancia minima.
  images: { formats: ["image/webp"] },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
