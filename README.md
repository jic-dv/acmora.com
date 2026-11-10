# Acmora web

Sitio corporativo multipágina y multi-idioma (es-CL y en). Next.js 16, React 19, TypeScript estricto, Tailwind 4, next-intl 4, Zod 4.
Servicios, planes, precios, FAQ y textos legales vienen de podiochile.com (revisado el 2026-11-04). Quedan datos por confirmar (ver "Qué reemplazar").

## Comandos

```bash
npm install
npm run dev
npm run typecheck && npm run lint && npm test
npm run build && npm run e2e
```

`npm run e2e` usa el Chrome instalado en el sistema y levanta `next start` en el puerto 3200. Para auditar SEO con indexación activa: `NEXT_PUBLIC_INDEXING_ENABLED=true npm run build`.

## Concepto

Estudio de desarrollo web y software: landing page, sitio multipágina, CRM personalizado y mantención. Rutas: `/servicios`, `/servicios/{slug}`, `/precios`, `/preguntas-frecuentes` (FAQ), `/nosotros`, `/contacto` y las tres legales. Interfaz inspirada en firebase.google.com/solutions, más limpia: cabecera blanca, hero oscuro, paneles blancos redondeados, tarjetas con sombra, botones en pastilla y Google Sans. Cada página tiene además su versión en texto plano (`/raw/{idioma}/{ruta}.md`).

## Qué reemplazar antes de publicar

| Dónde | Qué |
| --- | --- |
| `src/shared/constants/site.ts` | RUT, dirección y año de fundación (no figuran en podiochile.com y se omitieron). Marca visible: Acmora |
| `src/mocks/projects.ts` | Proyectos del portafolio (`/proyectos`): titulo, descripcion, URL, estado (produccion o demo), fecha y portada en `public/images/projects`. Las fechas son provisionales y el proyecto demo apunta a un despliegue de Vercel con login, por eso su portada es una ilustracion |
| `src/mocks/services.ts` | Servicios, planes, precios y soporte reales de podiochile.com; actualizar aquí si cambian (`mocks.test.ts` fija los precios publicados) |
| `src/content/es.ts`, `src/content/en.ts` | Textos y documentos legales adaptados (revisar con abogado) |
| `.env` | `NEXT_PUBLIC_SITE_URL`, `CONTACT_WEBHOOK_URL`, y `NEXT_PUBLIC_INDEXING_ENABLED=true` al publicar |

Mientras `NEXT_PUBLIC_INDEXING_ENABLED` no sea `true`, el sitio envía `noindex`, `robots.txt` bloquea todo y el sitemap queda vacío.

## Decisiones que conviene conocer

- **Páginas dinámicas por la CSP.** El CSP estricto usa nonce por request (`src/proxy.ts`), y Next solo lo aplica en renderizado dinámico. Costo: no hay HTML estático en CDN. Alternativa: HTML estático con `'unsafe-inline'` en `script-src`, que debilita la política. Se eligió la política estricta.
- **Sin cookies.** El idioma va en la URL y no hay analítica, por eso no existe banner de consentimiento. Lo único que se guarda es la preferencia de tema (clave `theme` en localStorage), declarada en la política de cookies.
- **IVA incluido, ganancia intacta.** Los precios del catálogo (`src/mocks/services.ts`, `priceClp`, soporte y código fuente) son NETOS: lo que Acmora conserva. Al público se muestran con el IVA de 19% incluido (`withIva` en `src/shared/lib/money.ts`: neto + IVA exacto, sin redondeos agregados) y los desgloses (`breakdown`, `quoteSummary`) suman los netos del catálogo, con el IVA como diferencia: neto + IVA = total, siempre. En `/en` cada parte se convierte a dólares al dólar entero. JSON-LD declara `valueAddedTaxIncluded: true`.
- **Precios en dólares en /en.** Se convierten desde CLP y UF con el tipo de cambio del día (`src/shared/lib/fx.ts`, APIs gratuitas sin clave, cacheo de 1 hora). Sin red se usan valores aproximados y la página lo declara. Si se agrega analítica, primero el gestor de consentimiento (ver `CLAUDE.md`).
- **Dialogo "Cotizar plan" en dos pasos.** Los botones de plan abren un dialogo modal estilo Google (`<dialog>` nativo, `features/contact/components/QuoteDialog.tsx`). Paso 1: campos de contorno y etiqueta flotante (nombre o empresa, telefono, servicio y proyecto, todos obligatorios, aviso de privacidad) y boton Siguiente. Paso 2: detalle de la cotizacion con el plan, soporte adicional opcional (casilla "Agregar soporte" con ayuda de beneficios y condiciones; 3, 6 o 12 meses, o mes a mes), codigo fuente aparte (opcional) y el total con neto, IVA y total (`quote-offer.ts`); los botones de correo y WhatsApp solo existen en el paso 2. Los datos del paso 2 salen de `quoteOffer` en `src/content/docs.ts` (`QuoteOffer` en `shared/lib/doc.ts`). Mientras no hay servicio de envio, ofrece dos alternativas con todo el detalle ya escrito (`quote-message.ts`): abrir la app de correo (`mailto:` a `COMPANY.email`, contact@acmora.com) o abrir WhatsApp. La Server Action `submitQuote` (Zod, honeypot, limite por IP y telefono) y su envio al webhook (`CONTACT_WEBHOOK_URL`, con `to` y `subject`) quedaron listos pero sin conectar al dialogo: conectarlos cuando se elija un servicio de correo.
- **"Ver más" en cada plan.** Enlace centrado al pie de la tarjeta que abre un dialogo (`shared/components/doc/PlanDetails.tsx`) con precio y desglose de IVA, lo incluido, plazos y rondas de revision, soporte (periodos, mensual, beneficios y condiciones), codigo fuente y datos del servicio. El contenido (`planDetail` en `docs.ts`) tambien se publica en el Markdown de `/raw`. El codigo fuente NO se entrega con el plan: se compra aparte (`sourceCodeClp` por plan, a cotizar si falta).
- **Formulario de contacto.** Server Action con Zod, honeypot, tiempo mínimo de llenado, límite por IP y por correo, y registro de consentimiento (fecha, versión de la política, idioma). Sin `CONTACT_WEBHOOK_URL` solo acepta envíos en desarrollo; en producción responde "no disponible". El limitador es en memoria: en serverless reemplazar por Upstash o Vercel KV.
- **FAQ y llms.txt.** Las preguntas frecuentes se muestran como acordeón, sin JSON-LD FAQPage (Google descontinuó los rich results). No hay `llms.txt`: Google lo ignora.
- **Hero animado con `motion`.** La maqueta de la portada (notebook, tablet y celular con un cursor que navega, scroll y un reporte tipo Lighthouse que cuenta hasta 100) usa la libreria `motion` (`motion/react`, solo `LazyMotion` + `m`) y se descarga aparte con `next/dynamic` para no retrasar el titular. Se pausa fuera de pantalla y queda quieta con "reducir movimiento". El reporte es ilustrativo, no una medicion.
- **Selectores propios.** Servicio y codigo de pais son combobox accesibles (`SelectField`, `CountryField`) con flechas animadas, banderas (`country-flag-icons`) y busqueda por numero, codigo ISO o nombre.
- **Diferencias frente a podiochile.com.** Se omitió la línea de integración con IA y los casos de ejemplo. El teléfono del formulario es opcional. La política de cookies es propia: este sitio solo guarda la clave `theme`, no usa banner. Plazos: la web original mezcla días de calendario y hábiles; aquí se declara calendario.
- **Plugin de next-intl.** No se usa `createNextIntlPlugin`; el alias se declara en `next.config.ts` porque el plugin carga `@swc/core`, que falla en esta máquina Windows.

## Skills de agente instaladas (por proyecto, en `.claude/skills`)

web-design-guidelines, frontend-design, ponytail, security-best-practices, VibeSec-Skill, playwright, code-review, feature-dev, ui-ux-pro-max, napkin, impeccable, parallel-feature-development, shadcn.

No instaladas: supermemory, claude-mem (envían contexto a servicios externos), caveman (choca con frontend-design), rtk y codegraph (herramientas globales), humanizer-zh (chino), gsd, context-mode y council (solapan con las anteriores). La skill de CodeRabbit requiere su CLI externo, que no se instaló.
