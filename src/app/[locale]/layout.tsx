import type { Metadata, Viewport } from "next";
import { Google_Sans } from "next/font/google";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { hasLocale } from "next-intl";
import { Suspense, type ReactNode } from "react";
import { routing } from "@/i18n/routing";
import { getCopy } from "@/content/docs";
import { COMPANY, HTML_LANG } from "@/shared/constants/site";
import { env } from "@/shared/lib/env";
import { pathFor } from "@/shared/lib/seo";
import Ripple from "@/shared/components/Ripple";
import HashGuard from "@/shared/components/HashGuard";
import NavigationProgress from "@/shared/components/NavigationProgress";
import ScrollReset from "@/shared/components/ScrollReset";
import ContactFab from "@/shared/components/layout/ContactFab";
import ScrollToTop from "@/shared/components/layout/ScrollToTop";
import SiteFooter from "@/shared/components/layout/SiteFooter";
import SiteHeader from "@/shared/components/layout/SiteHeader";
import "@/styles/globals.css";

const sans = Google_Sans({ subsets: ["latin", "latin-ext"], variable: "--font-google-sans", display: "swap", fallback: ["Arial", "Helvetica", "sans-serif"] });

export const viewport: Viewport = {
  // El tema por defecto es claro en todos los dispositivos; el oscuro solo si la persona lo elige con el boton.
  themeColor: "#ffffff",
};

// Script del tema, constante y sin datos del usuario. Hace dos cosas antes de que cargue React:
//  1) resuelve el tema (preferencia guardada o, por defecto, claro) antes de pintar, para evitar el destello;
//  2) atiende el boton de tema por delegacion de eventos en document, asi funciona aunque se pulse antes de hidratar y
//     sobrevive a que Next recree <html> (por ejemplo al cambiar de idioma). La guarda __themeInit evita doble registro.
const THEME_SCRIPT = `(function(){
var d=document.documentElement,K='theme';
function ok(v){return v==='light'||v==='dark'}
function stored(){try{var s=localStorage.getItem(K);return ok(s)?s:null}catch(e){return null}}
try{d.dataset.theme=stored()||'light'}catch(e){}
if(window.__themeInit)return;window.__themeInit=1;
document.addEventListener('click',function(e){
var b=e.target&&e.target.closest&&e.target.closest('[data-theme-toggle]');if(!b)return;
var cur=document.documentElement.dataset.theme;if(!ok(cur))cur=stored()||'light';
var next=cur==='dark'?'light':'dark';document.documentElement.dataset.theme=next;
try{localStorage.setItem(K,next)}catch(x){}
});
})();`;

// Iconos del sitio (public/): favicon.ico para todos los navegadores, PNG de 16 y 32 px para pestanas, 180 px para la pantalla
// de inicio de iOS y el manifest con los de 192 y 512 px para Android. Las imagenes para enlaces salen de opengraph-image.
export const metadata: Metadata = {
  metadataBase: new URL(env.NEXT_PUBLIC_SITE_URL),
  applicationName: COMPANY.name,
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-32x32.png", type: "image/png", sizes: "32x32" },
      { url: "/favicon-16x16.png", type: "image/png", sizes: "16x16" },
    ],
    apple: [{ url: "/apple-touch-icon.png", type: "image/png", sizes: "180x180" }],
  },
  manifest: "/site.webmanifest",
  appleWebApp: { title: COMPANY.name, statusBarStyle: "default" },
};

export default async function LocaleLayout({ children, params }: { children: ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  // El CSP con nonce solo se aplica en renderizado dinamico (src/proxy.ts).
  await connection();

  const c = getCopy(locale);
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <html lang={HTML_LANG[locale]} className={sans.variable} suppressHydrationWarning>
      <head>
        {/* Script propio y constante (sin datos del usuario); lleva el nonce de la CSP. */}
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        <a
          href="#main"
          title={c.ui.skip}
          className="absolute left-4 top-2 z-[60] -translate-y-20 rounded-pill bg-blue px-5 py-2.5 font-medium text-on-blue focus:translate-y-0"
        >
          {c.ui.skip}
        </a>
        {/* Cada bloque va en su propio limite de Suspense: React hidrata por partes y cede el hilo principal entre ellas
            (menos tareas largas y mejor Total Blocking Time). El contenido de la pagina queda fuera: dentro de un limite, notFound() responderia 200 en vez de 404. */}
        <Suspense fallback={null}>
          <SiteHeader locale={locale} />
        </Suspense>
        <main id="main" tabIndex={-1} className="min-w-0 outline-none">
          {children}
        </main>
        <Suspense fallback={null}>
          <SiteFooter locale={locale} />
        </Suspense>
        <Suspense fallback={null}>
          <ScrollToTop label={c.ui.scrollTop.label} title={c.ui.scrollTop.title} />
          <ContactFab copy={{ ...c.ui.contactFab, photo: c.ui.credits.photo, role: c.ui.credits.role }} contactHref={pathFor(locale, { pathname: "/contact" })} />
        </Suspense>
        {/* Escuchas globales livianas (onda, scroll, barra de carga y guardia del hash): se hidratan con la raiz, sin esperar. */}
        <Ripple />
        <ScrollReset />
        <NavigationProgress />
        <HashGuard />
      </body>
    </html>
  );
}
