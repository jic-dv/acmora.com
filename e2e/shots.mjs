// Capturas de revision visual: node e2e/shots.mjs <base> <outDir> [ruta...]
// SHOT_SCHEME=dark captura en modo oscuro. Una ruta "menu:/es" abre el desplegable de servicios antes de capturar el viewport (solo escritorio).
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

const [base = "http://localhost:3100", out = "shots", ...routes] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const list = routes.length ? routes : ["/es"];

const browser = await chromium.launch({ channel: "chrome" });
for (const [name, viewport] of [["desktop", { width: 1440, height: 900 }], ["mobile", { width: 390, height: 844 }]]) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1, colorScheme: process.env.SHOT_SCHEME === "dark" ? "dark" : "light" });
  // El tema por defecto es claro: el oscuro se pide con la preferencia que guarda el boton de tema.
  if (process.env.SHOT_SCHEME === "dark") await ctx.addInitScript(() => localStorage.setItem("theme", "dark"));
  const page = await ctx.newPage();
  for (const r of list) {
    const menu = r.startsWith("menu:");
    const path = menu ? r.slice(5) : r;
    if (menu && name === "mobile") continue;
    await page.goto(base + path, { waitUntil: "networkidle" });
    if (menu) {
      await page.locator("header nav button[aria-expanded]").first().click();
      await page.waitForTimeout(400);
    }
    await page.screenshot({ path: `${out}/${name}${(menu ? "_menu" : "") + path.replaceAll("/", "_") || "_root"}.png`, fullPage: !menu });
  }
  await ctx.close();
}
await browser.close();
