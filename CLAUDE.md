# Acmora web - instrucciones para el agente

Plantilla maestra aplicada: "Prompt Maestro - Ingeniería Frontend Web" v1.0 (Next.js + React + TypeScript).
Este archivo contiene el Bloque 0 completo y las reglas que más se violan. En caso de conflicto: código real del repo > este archivo > plantilla > conocimiento previo.

## Bloque 0 - Configuración del proyecto

```
PROYECTO:              Acmora (marca confirmada por el usuario; contenido tomado de podiochile.com el 2026-11-04)
DOMINIO:               por definir (variable NEXT_PUBLIC_SITE_URL)
TIPO:                  estudio de desarrollo web y software (landing page, sitio multipágina, CRM personalizado, mantención web); multipágina y multi-idioma
PROBLEMA DE NEGOCIO:   mostrar servicios con planes (Básico/Estándar/Premium), precios, mantención y contacto, y generar consultas calificadas
AUDIENCIA:             profesionales, emprendedores y empresas chilenas que necesitan sitio, landing, CRM o mantención
ESTADO:                greenfield

SEO crítico:           sí  (RSC/SSR, metadata por ruta, JSON-LD, hreflang)
Interactividad alta:   no (navegación, menú móvil, selector de idioma y formulario son los únicos Client Components)
Volumen de datos:      bajo (mocks en src/mocks, acceso solo vía features/*/services)
Tiempo real:           no
Autenticación:         no
Multi-idioma:          sí: es (es-CL, por defecto) y en; prefijo siempre, rutas localizadas
Equipo:                por definir
Deadline duro:         no

Locale principal:      es-CL
Moneda y formato:      CLP sin decimales + UF con 2 decimales (Intl, src/shared/lib/format.ts)
Taxonomía territorial: región > comuna (no se usa aún)
Identificadores:       RUT (solo en datos de la empresa)
Marco legal de datos:  Ley 21.719 (CL), plena vigencia 01-12-2026

Atributos de marca:    serio, confiable, técnico, claro, directo
Referencias visuales:  firebase.google.com/solutions (cabecera blanca, hero oscuro, paneles blancos redondeados, botones en pastilla, sombras Material), en versión más limpia
Restricciones de marca: libertad total; naranja sobre oscuro y azul sobre claro, Google Sans

JS cliente por ruta:   landing < 120 KB, listado < 160 KB, detalle < 150 KB
LCP / INP / CLS:       2.5 s / 200 ms / 0.1

dev:        npm run dev
build:      npm run build
test:       npm test
lint:       npm run lint
typecheck:  npm run typecheck
e2e:        npm run build && npm run e2e   (usa el Chrome del sistema; requiere build previo)
```

Si un parámetro depende de un dato que no está aquí, se pregunta antes de decidir.

## Concepto de interfaz

Referencia: firebase.google.com/solutions, más limpio. Cabecera blanca con pestañas y subrayado naranja, hero oscuro (`#1e1e1e`) con resplandores suaves en el azul de marca (sin submenú de anclas), paneles blancos de esquinas amplias (28 px) sobre gris `#f8f9fa`, tarjetas de 16 px con sombra Material, botones en pastilla (azul de marca `#0645E8` también sobre oscuro: tokens fijos `brand`, `brand-dark`, `brand-light`, `sky`), iconos en círculo azul claro, banda final oscura con la llamada a la acción, pie oscuro. Tipografía Google Sans. Personalidad: meridianos de la marca y trama de puntos en el hero, color por línea de servicio (azul páginas web, naranja aplicaciones, verde IA), maqueta ilustrativa en la portada. Desplegable de servicios estilo Google (`ServicesPanel` en servidor, estado en `MainNav`), efecto de onda en clics (`shared/components/Ripple.tsx`) y cursor de mano global en `globals.css`. Cada página mantiene la versión en texto plano en `/raw/{locale}/{ruta}.md`. El home usa fondos por sección con la "A" del logo como forma decorativa (`shared/components/core/BrandMark.tsx`; variantes `dark`, `brand`, `soft`, `mist` en `DocSection.variant`, ver `Backdrop` en `DocView.tsx`). Los documentos legales (privacidad, términos, cookies) llevan barra lateral de secciones estilo Google (`shared/components/doc/DocToc.tsx`). El cotizador exige una casilla de consentimiento (Términos y Condiciones y Política de Privacidad, enlaces en pestaña nueva) antes de pasar al paso 2; si cambia el tratamiento de datos, actualizar también la política de privacidad y los términos. Buscador global (`shared/components/layout/SiteSearch.tsx`): icono o pastilla en la cabecera, diálogo con resultados estilo Google, atajos `/` y Ctrl/Cmd+K; el índice sale de `/api/search/{locale}` (`shared/lib/search-index.ts`, construido desde los mismos `Doc`) y la lógica de ranking, extracto y "quizás quisiste decir" está en `shared/lib/search.ts`. La página de preguntas frecuentes tiene además su propio buscador fijo (`doc/FaqSearch.tsx`) que abre y baja suavemente hasta la mejor respuesta; cada pregunta lleva un id `faq-...` (`faqId`). El menú superior ya no incluye FAQ ni Nosotros (siguen en el pie y como atajos del buscador). Botón flotante de contacto con la foto de `public/images/author/author.webp` en la esquina inferior izquierda (`ContactFab.tsx`, punto verde animado, onda y globo de invitación) y "volver arriba" en la inferior derecha, a la misma altura. El selector de idioma muestra un spinner circular dentro del propio botón mientras carga (sin pantalla de carga).

Tokens en `src/styles/globals.css` (`@theme`), cada uno como `light-dark(claro, oscuro)`: el modo oscuro (estilo Google: página `#202124`, paneles `#303134`) sigue al sistema y el botón de tema lo fija con `data-theme` en `<html>`. El cambio de tema lo hace un script constante en `<head>` por delegación de eventos sobre `[data-theme-toggle]` (funciona antes de hidratar); `ThemeToggle` solo refleja el estado y re-aplica el tema guardado en cada navegación, porque al cambiar de idioma Next recrea `<html>` y pierde el atributo. Azul de marca `#0645E8` (hover `#0537C2`, foco `#1D58F0`); en oscuro usa `#8AB4F8` por contraste. Botones con texto sobre azul usan `text-on-blue`. Bloques de contenido en `src/shared/lib/doc.ts`: `cards`, `steps`, `plans`, `table`, `dl`, `ul/ol`, `p`; secciones con `icon`, `intro`, `action` y `chip`; `cta` por documento. Los botones se construyen con `buttonStyles` y no se mezcla `leading-*` antes de `text-[size]` dentro de `cn()` (tailwind-merge lo descarta).

## Arquitectura

- `src/content/{es,en}.ts`: textos estáticos tipados. `en` se tipa contra `es`: falta de paridad = error de compilación.
- `src/content/docs.ts`: arma el `Doc` de cada página desde copy + mocks. Un `Doc` alimenta HTML, índice lateral y Markdown.
- Sintaxis inline en strings: `[texto|title](page:/ruta | project:slug | https://... | mailto:)`, `**negrita**`, `` `código` ``. Todo enlace lleva title descriptivo distinto del texto (lo verifica `content.test.ts`).
- `src/features/*`: schemas Zod (fuente de verdad), services (único punto de acceso a datos), componentes de dominio.
- `src/mocks`: datos de ejemplo validados con los mismos schemas. Reemplazar antes de publicar.
- `src/proxy.ts`: locale (next-intl) y CSP con nonce por request. Por eso las páginas son dinámicas (`connection()` en el layout).
- `next.config.ts`: alias de `next-intl/config` declarado a mano. No volver a `createNextIntlPlugin`: carga `@swc/core`, que falla en esta máquina Windows por el DACL de `C:\`.

## Reglas duras

1. Verificar antes de afirmar. No inventar props, rutas, APIs ni versiones. Si falta contexto, pedir el archivo mínimo.
2. Menor código posible que resuelva el problema completo. Reutilizar antes de crear. Sin dependencias que la plataforma ya cubre.
3. Server Component por defecto. `"use client"` en la hoja más profunda.
4. Zod en todo borde: formularios, searchParams, env, webhooks. Server Actions son endpoints públicos: validar, limitar y autorizar dentro.
5. Sin `any`, sin supresiones sin motivo, sin `console.log`, sin código comentado.
6. Un cambio conceptual por commit. Sin refactors no pedidos.
7. Sin guion largo ni guion medio en ningún texto. Solo guion corto (-). Sin emojis.
8. Prohibido `dangerouslySetInnerHTML` salvo `JsonLd` (escapa `<`) y el script constante de tema en `app/[locale]/layout.tsx` (lleva el nonce de la CSP).
9. Todo `title`, `alt` y `aria-label` es descriptivo y nunca repite el texto visible.
10. Cero cookies. El único almacenamiento local es la clave `theme` (claro/oscuro) del botón de tema, declarada en la política de cookies. Si se agrega analítica u otra cosa, primero el gestor de consentimiento (§14 de la plantilla).
11. Precios con IVA (19%) incluido: el catálogo guarda precios NETOS (CLP sin IVA, lo que Acmora conserva) y toda pantalla, JSON-LD y Markdown muestran `withIva(neto)` de `shared/lib/money.ts`: neto + IVA exacto, sin redondeos agregados (los netos van en centenas, así el IVA sale entero). Los desgloses (`breakdown`, `quoteSummary`) suman netos del catálogo y el IVA es la diferencia: nunca se calcula el neto hacia atrás desde un total. Ningún monto se escribe a mano en los textos: los legales usan marcas como `{crmUpfront}` que `docs.ts` reemplaza desde el catálogo. Los textos informativos (portada, servicios, precios, detalle de planes, FAQ, metadatos) no mencionan el IVA: los precios se muestran ya con IVA y punto. El IVA y su desglose solo aparecen en el cotizador (paso 2 y mensaje) y en los términos; lo verifica `src/content/prices.test.ts`. El código fuente no se entrega con los planes: se vende aparte (`sourceCodeClp`), y el soporte adicional es opcional (3/6/12 meses o mes a mes). Precios en `/en` salen en USD: `shared/lib/fx.ts` consulta tipo de cambio (open.er-api.com y api.boostr.cl, respaldo api.gael.cloud), cacheado 1 hora y validado con Zod; sin red usa valores aproximados y lo declara. La lógica de conversión y redondeo está en `shared/lib/money.ts`.

## Verificación (en orden)

`npm run typecheck` -> `npm run lint` -> `npm test` -> `npm run build` -> `npm run e2e`

Capturas para revisión visual: `node e2e/shots.mjs http://localhost:3100 <carpeta> /es /es/precios` (usa el Chrome del sistema; en Git Bash exportar `MSYS_NO_PATHCONV=1`).

El e2e cubre SEO técnico (h1, title 50-60, description 140-160, canonical, hreflang, JSON-LD), cabeceras de seguridad, axe WCAG 2.2 AA en 26 rutas, idioma, teclado, menú móvil y formulario.

## Contenido

Servicios, planes, precios (`src/mocks/services.ts`), FAQ y textos legales provienen de podiochile.com (2026-11-04). Faltan RUT, dirección y año de fundación. Los textos legales son una adaptación y deben ser revisados por un abogado antes de publicar. Indexación: `NEXT_PUBLIC_INDEXING_ENABLED` ("true" o "false") manda; sin la variable, en Vercel se indexa solo producción (`VERCEL_ENV=production`) y las vistas previas, local y pruebas salen con `noindex`. Sin `NEXT_PUBLIC_SITE_URL`, en Vercel el canonical usa `VERCEL_PROJECT_PRODUCTION_URL`. Las rutas son `/services` (`/servicios`), `/services/[slug]`, `/projects` (`/proyectos`, datos en `src/mocks/projects.ts`), `/pricing`, `/faq`, `/about`, `/contact` y legales; el Markdown raw usa la ruta canónica (`/raw/es/services/landing-page.md`).
