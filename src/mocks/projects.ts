import type { Project } from "@/features/projects/schemas/project";

// DATOS DE EJEMPLO. Titulos y descripciones se resumen de lo que cada sitio publica en su portada (revisado el 2026-11-05).
// Las FECHAS DE PUBLICACION son provisionales: reemplazarlas por las reales antes de publicar. El proyecto en
// demostracion apunta a un despliegue de Vercel que exige iniciar sesion, por eso su portada es una ilustracion.
const l = (es: string, en: string) => ({ es, en });

export const projectsMock = [
  {
    slug: "sitio-demo",
    status: "demo",
    title: l("Sitio de presentación personal (demo)", "Personal presentation site (demo)"),
    description: l(
      "Versión de demostración desplegada en Vercel para que el cliente revise el diseño, los textos y la navegación antes de pasar a producción.",
      "Demo version deployed on Vercel so the client can review the design, copy and navigation before going to production.",
    ),
    url: "https://igonzalez-nvs8nnwfv-jic-devs-projects.vercel.app/",
    publishedAt: "2026-11-02",
    cover: "/images/projects/sitio-demo.webp",
    coverAlt: l("Ilustración de un sitio web en un navegador con portada, tarjetas y botón de contacto", "Illustration of a website in a browser with a hero, cards and a contact button"),
    tags: [l("Demo", "Demo"), l("Next.js", "Next.js"), l("Vercel", "Vercel")],
  },
  {
    slug: "procanje",
    status: "production",
    title: l("Procanje: portal de propiedades", "Procanje: property portal"),
    description: l(
      "Portal de casas, departamentos, parcelas y terrenos en venta y arriendo publicados por corredores de todo Chile, con filtros por región, comuna, tipo y precio, y oportunidades creadas con IA.",
      "Portal of houses, apartments, plots and land for sale and rent listed by brokers across Chile, with filters by region, district, type and price, and AI-generated opportunities.",
    ),
    url: "https://procanje.com/portal-de-propiedades",
    publishedAt: "2026-10-14",
    cover: "/images/projects/procanje.webp",
    coverAlt: l("Portada del portal Procanje con el titular Propiedades en venta y arriendo en todo Chile", "Procanje portal home page with the headline Properties for sale and rent across Chile"),
    tags: [l("Portal", "Portal"), l("Búsqueda y filtros", "Search and filters"), l("IA", "AI")],
  },
  {
    slug: "demane",
    status: "production",
    title: l("De la mano de Mane Fernández: corretaje de propiedades", "De la mano de Mane Fernández: property brokerage"),
    description: l(
      "Sitio de una corredora de propiedades de Santiago con buscador por tipo, región y comuna, y agenda de visitas para acompañar la venta y el arriendo de principio a fin.",
      "Website of a Santiago property broker with search by type, region and district, and visit booking to support sales and rentals from start to finish.",
    ),
    url: "https://demane.cl/",
    publishedAt: "2026-09-22",
    cover: "/images/projects/demane.webp",
    coverAlt: l("Portada del sitio de Mane Fernández con el titular Encuentra el lugar donde quieres quedarte", "Mane Fernández website home page with the headline Find the place where you want to stay"),
    tags: [l("Sitio comercial", "Business site"), l("Buscador", "Search"), l("Agenda de visitas", "Visit booking")],
  },
  {
    slug: "acteccu",
    status: "production",
    title: l("ACTECCU: enfermedad inflamatoria intestinal en Chile", "ACTECCU: inflammatory bowel disease in Chile"),
    description: l(
      "Sitio de la agrupación chilena dedicada a la investigación, educación y difusión sobre la enfermedad de Crohn y la colitis ulcerosa, con información para pacientes, novedades y el simposio internacional.",
      "Website of the Chilean association dedicated to research, education and outreach on Crohn's disease and ulcerative colitis, with patient information, news and the international symposium.",
    ),
    url: "https://www.acteccu.com/",
    publishedAt: "2026-07-30",
    cover: "/images/projects/acteccu.webp",
    coverAlt: l("Portada del sitio de ACTECCU con el anuncio del VII Simposio Internacional de Enfermedad Inflamatoria Intestinal", "ACTECCU website home page announcing the VII International Symposium on Inflammatory Bowel Disease"),
    tags: [l("Sitio institucional", "Institutional site"), l("Contenido para pacientes", "Patient content"), l("Eventos", "Events")],
  },
] satisfies Project[];
