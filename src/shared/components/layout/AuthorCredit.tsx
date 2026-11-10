import { COMPANY } from "@/shared/constants/site";

type Copy = {
  label: string;
  role: string;
  photo: { alt: string; title: string };
  linkedin: { label: string; title: string };
  github: { label: string; title: string };
};

// Marcas de LinkedIn y GitHub (los iconos de marca ya no vienen en lucide-react), dibujadas en una cuadricula de 24 px.
const LINKEDIN = "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 1 1 0-4.125 2.062 2.062 0 0 1 0 4.125zm1.782 13.019H3.555V9h3.564v11.452z";
const GITHUB =
  "M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 6.844c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222 0 1.606-.015 2.896-.015 3.286 0 .321.216.694.825.576C20.565 21.795 24 17.298 24 12.297c0-6.627-5.373-12-12-12";

/**
 * Firma del pie de pagina, estilo tarjeta de Google: sobretitulo "Sitio creado por", foto de perfil, nombre,
 * cargo y los enlaces a LinkedIn y GitHub (pestana nueva). Es un componente de servidor sin estado.
 */
export default function AuthorCredit({ copy }: { copy: Copy }) {
  const social = "inline-grid size-10 place-items-center rounded-full text-night-soft no-underline transition-colors duration-(--duration-enter) hover:bg-white/10 hover:text-white";
  return (
    <div className="grid gap-2">
      <p className="m-0 text-xs font-medium uppercase tracking-widest text-night-soft">{copy.label}</p>
      <div className="flex items-center gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element -- next/image escribe un atributo style en el HTML, que la CSP (sin unsafe-inline) bloquea; la imagen ya viene optimizada en WebP (64 px). */}
        <img
          src="/images/author/author.webp"
          alt={copy.photo.alt}
          title={copy.photo.title}
          width={64}
          height={64}
          loading="lazy"
          decoding="async"
          className="size-11 shrink-0 rounded-full object-cover ring-1 ring-white/15"
        />
        <div className="grid">
          <p className="m-0 font-medium leading-snug text-white">{COMPANY.author.name}</p>
          <p className="m-0 text-sm leading-snug text-night-soft">{copy.role}</p>
        </div>
        <ul className="m-0 ml-2 flex list-none items-center gap-1 p-0">
          <li className="m-0">
            <a href={COMPANY.author.linkedin} target="_blank" rel="noopener noreferrer" title={copy.linkedin.title} className={social}>
              <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" className="size-[18px] fill-current">
                <path d={LINKEDIN} />
              </svg>
              <span className="sr-only">{copy.linkedin.label}</span>
            </a>
          </li>
          <li className="m-0">
            <a href={COMPANY.author.github} target="_blank" rel="noopener noreferrer" title={copy.github.title} className={social}>
              <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" className="size-[18px] fill-current">
                <path d={GITHUB} />
              </svg>
              <span className="sr-only">{copy.github.label}</span>
            </a>
          </li>
        </ul>
      </div>
    </div>
  );
}
