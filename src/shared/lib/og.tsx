import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { COMPANY } from "@/shared/constants/site";

export const OG_SIZE = { width: 1200, height: 630 } as const;

type Props = { path: string; title: string; footer: string };

// Colores equivalentes a los tokens de marca (ImageResponse no lee CSS variables).
const PAPER = "#f7f9fc";
const INK = "#1b2233";
const SOFT = "#4b5468";
const BRAND = "#0645e8";
const LINE = "#d7dce6";

// Isotipo oficial (public/), leido una sola vez y embebido como data URL: ImageResponse no puede pedir archivos al propio sitio.
let isotype: Promise<string> | undefined;
const logo = () =>
  (isotype ??= readFile(path.join(process.cwd(), "public", COMPANY.logo.isotype)).then((b) => `data:image/png;base64,${b.toString("base64")}`));

/** Imagen para compartir enlaces (Open Graph, y X/WhatsApp/LinkedIn la toman de ahi): isotipo, ruta, titulo y bajada. */
export async function ogImage({ path: trail, title, footer }: Props) {
  const src = await logo();
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: PAPER, padding: 72, borderLeft: `18px solid ${BRAND}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse (Satori) solo acepta <img>. */}
          <img src={src} width={72} height={72} alt="" />
          <span style={{ fontSize: 30, color: SOFT, fontFamily: "monospace" }}>{trail}</span>
        </div>
        <div style={{ display: "flex", fontSize: title.length > 60 ? 62 : 74, lineHeight: 1.08, fontWeight: 700, color: INK, letterSpacing: -2 }}>{title}</div>
        <div style={{ display: "flex", justifyContent: "space-between", borderTop: `2px solid ${LINE}`, paddingTop: 28, fontSize: 28, color: SOFT }}>
          <span style={{ color: BRAND, fontWeight: 700 }}>{COMPANY.name}</span>
          <span>{footer}</span>
        </div>
      </div>
    ),
    OG_SIZE,
  );
}
