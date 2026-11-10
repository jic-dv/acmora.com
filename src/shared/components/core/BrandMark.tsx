import { cn } from "@/shared/lib/cn";

/** Trazo de la letra "A" del logotipo de Acmora (public/images/logo/acmora-logo.svg), en su propio sistema de 443 x 310. */
const A_PATH =
  "M 1.5,251 Q 0,257 0,262 Q 0,267 2,274.5 Q 4,282 6.5,286 Q 9,290 15.5,296 Q 22,302 26,304 Q 30,306 35.5,307.5 Q 41,309 47,309 Q 53,309 58,308 Q 63,307 85.5,297.5 Q 108,288 128,281 Q 148,274 165,270 Q 182,266 193.5,265 Q 205,264 205.5,263.5 Q 206,263 227.5,263 Q 249,263 249.5,263.5 Q 250,264 261.5,265 Q 273,266 291,270.5 Q 309,275 321,280 Q 333,285 323.5,270 Q 314,255 302.5,240 Q 291,225 282.5,216.5 Q 274,208 265.5,202 Q 257,196 247.5,192 Q 238,188 230.5,186.5 Q 223,185 211,185 Q 199,185 191,186.5 Q 183,188 174.5,191 Q 166,194 158,198 Q 150,202 141,208 Q 132,214 130,216 Q 128,218 127.5,217.5 Q 127,217 139,198.5 Q 151,180 168,156 Q 185,132 189.5,127.5 Q 194,123 198.5,120.5 Q 203,118 206,117 Q 209,116 215,116 Q 221,116 227,118.5 Q 233,121 237.5,125 Q 242,129 275,174.5 Q 308,220 330.5,254 Q 353,288 358,293 Q 363,298 370,302 Q 377,306 383,307.5 Q 389,309 395,309 Q 401,309 405.5,308 Q 410,307 416,304 Q 422,301 427.5,296 Q 433,291 435.5,287 Q 438,283 440.5,274.5 Q 443,266 442.5,259 Q 442,252 440.5,247.5 Q 439,243 436,238 Q 433,233 358,131 Q 283,29 278,24 Q 273,19 265.5,14 Q 258,9 248.5,5.5 Q 239,2 231,1.5 Q 223,1 222.5,0.5 Q 222,0 213.5,1 Q 205,2 197.5,4.5 Q 190,7 181.5,12 Q 173,17 166.5,23 Q 160,29 84.5,131.5 Q 9,234 6,239.5 Q 3,245 1.5,251 Z";

/**
 * La "A" de la marca como forma decorativa de fondo: llena (marca de agua) o solo contorno. Hereda el color de `currentColor`,
 * asi cada seccion la tine con una clase de texto y una opacidad. Es solo ornamento: no se anuncia ni recibe foco.
 */
export default function BrandMark({
  outline = false,
  className,
}: {
  outline?: boolean;
  className?: string;
}) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 443 310"
      className={cn("pointer-events-none absolute -z-10", className)}
      fill={outline ? "none" : "currentColor"}
      stroke={outline ? "currentColor" : "none"}
      strokeWidth={outline ? 1.5 : undefined}
    >
      <path
        d={A_PATH}
        vectorEffect={outline ? "non-scaling-stroke" : undefined}
      />
    </svg>
  );
}
