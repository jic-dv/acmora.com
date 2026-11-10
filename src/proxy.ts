import createMiddleware from "next-intl/middleware";
import type { NextRequest } from "next/server";
import { routing } from "./i18n/routing";

const intl = createMiddleware(routing);

// CSP estricta con nonce por request: sin unsafe-inline ni unsafe-eval en produccion.
// Next aplica el nonce a sus propios scripts y estilos al leer esta cabecera durante el render dinamico.
function contentSecurityPolicy(nonce: string) {
  const dev = process.env.NODE_ENV !== "production";
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""}`,
    `style-src 'self' 'nonce-${nonce}'${dev ? " 'unsafe-inline'" : ""}`,
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "connect-src 'self'" + (dev ? " ws: wss:" : ""),
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(dev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}

export default function proxy(request: NextRequest) {
  const nonce = btoa(crypto.randomUUID());
  const csp = contentSecurityPolicy(nonce);

  // Next lee el nonce de la cabecera de la request; next-intl copia request.headers al reenviarla.
  request.headers.set("x-nonce", nonce);
  request.headers.set("Content-Security-Policy", csp);

  const response = intl(request);
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  // Excluye API, internos de Next, archivos con extension y la version en texto plano (/raw).
  matcher: ["/((?!api|raw|_next|_vercel|.*\\..*).*)"],
};
