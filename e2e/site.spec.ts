import AxeBuilder from "@axe-core/playwright";
import { COUNTRIES } from "../src/features/contact/state";
import { expect, test, type Page } from "@playwright/test";

const SLUGS = ["landing-page", "pagina-web-multipagina", "crm-personalizado", "mantencion-web"];
const ROUTES = {
  es: ["/es", "/es/servicios", ...SLUGS.map((s) => `/es/servicios/${s}`), "/es/proyectos", "/es/precios", "/es/preguntas-frecuentes", "/es/nosotros", "/es/contacto", "/es/privacidad", "/es/terminos", "/es/cookies"],
  en: ["/en", "/en/services", ...SLUGS.map((s) => `/en/services/${s}`), "/en/projects", "/en/pricing", "/en/faq", "/en/about", "/en/contact", "/en/privacy", "/en/terms", "/en/cookies"],
};
const ALL = [...ROUTES.es, ...ROUTES.en];

/**
 * El tema por defecto es claro en todos los dispositivos: el sistema oscuro ya no lo cambia. Para abrir una pagina en
 * oscuro se guarda la preferencia que escribe el boton de tema (clave "theme"). Se registra antes de cada carga.
 */
async function setScheme(page: Page, scheme: "light" | "dark") {
  await page.emulateMedia({ colorScheme: scheme });
  await page.addInitScript((s) => {
    try {
      localStorage.setItem("theme", s);
    } catch {
      // almacenamiento bloqueado
    }
  }, scheme);
}

async function jsonLd(page: Page) {
  const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
  return blocks.map((b) => JSON.parse(b) as { "@graph": { "@type": string }[] });
}

test.describe("SEO tecnico", () => {
  for (const path of ALL) {
    test(`${path}: un h1, title y description en rango, canonical, hreflang y JSON-LD valido`, async ({ page }) => {
      await page.goto(path);
      await expect(page.locator("h1")).toHaveCount(1);

      const title = await page.title();
      expect(title.length).toBeGreaterThanOrEqual(50);
      expect(title.length).toBeLessThanOrEqual(60);

      const description = await page.locator('meta[name="description"]').getAttribute("content");
      expect(description?.length).toBeGreaterThanOrEqual(140);
      expect(description?.length).toBeLessThanOrEqual(160);

      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", new RegExp(`${path === "/es" || path === "/en" ? path : path}$`));
      const hreflangs = await page.locator('link[rel="alternate"][hreflang]').evaluateAll((els) => els.map((e) => e.getAttribute("hreflang")));
      expect(hreflangs.sort()).toEqual(["en", "es-CL", "x-default"]);

      const graphs = await jsonLd(page);
      expect(graphs.length).toBeGreaterThan(0);
      const types = graphs.flatMap((g) => g["@graph"].map((n) => n["@type"]));
      expect(types).toContain("BreadcrumbList");

      await expect(page.locator("html")).toHaveAttribute("lang", path.startsWith("/es") ? "es-CL" : "en");
    });
  }

  test("todo enlace y boton declara title, y las imagenes tienen alt", async ({ page }) => {
    for (const path of ["/es", "/en", "/en/services/landing-page", "/es/proyectos"]) {
      await page.goto(path);
      const missing = await page.evaluate(() =>
        [...document.querySelectorAll("a[href], button")]
          .filter((el) => !(el as HTMLElement).title && !el.closest("[aria-hidden='true']") && !el.matches("a[href^='#h-']"))
          .map((el) => (el.textContent ?? "").trim().slice(0, 40)),
      );
      expect(missing, `elementos sin title en ${path}`).toEqual([]);
      const noAlt = await page.locator("img:not([alt])").count();
      expect(noAlt).toBe(0);
      // Toda imagen lleva tambien un title descriptivo, distinto de su alt.
      const imgs = await page.locator("img").evaluateAll((els) => els.map((el) => ({ alt: el.getAttribute("alt") ?? "", title: el.getAttribute("title") ?? "" })));
      for (const i of imgs) {
        expect(i.title.length, "img sin title en " + path).toBeGreaterThan(10);
        expect(i.title, "title igual al alt").not.toBe(i.alt);
      }
    }
  });

  test("cabeceras de seguridad y CSP con nonce", async ({ request }) => {
    const res = await request.get("/es");
    const h = res.headers();
    expect(h["content-security-policy"]).toMatch(/script-src 'self' 'nonce-[^']+' 'strict-dynamic'/);
    expect(h["content-security-policy"]).not.toContain("unsafe-inline");
    expect(h["content-security-policy"]).not.toContain("unsafe-eval");
    expect(h["strict-transport-security"]).toContain("preload");
    expect(h["x-content-type-options"]).toBe("nosniff");
    expect(h["x-frame-options"]).toBe("DENY");
    expect(h["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(h["x-powered-by"]).toBeUndefined();
  });

  test("sitemap con alternates, robots y version en texto plano", async ({ request }) => {
    const sitemap = await (await request.get("/sitemap.xml")).text();
    expect(sitemap).toContain("/en/services/crm-personalizado");
    expect(sitemap).toContain('hreflang="es-CL"');
    const robots = await (await request.get("/robots.txt")).text();
    expect(robots).toContain("Sitemap:");
    const raw = await request.get("/raw/en/pricing.md");
    expect(raw.headers()["content-type"]).toContain("text/markdown");
    expect(await raw.text()).toContain("# Clear pricing, no fine print");
    expect((await request.get("/raw/es/services/landing-page.md")).status()).toBe(200);
    expect((await request.get("/raw/en/nope.md")).status()).toBe(404);
  });
});

test.describe("accesibilidad (axe, WCAG 2.2 AA)", () => {
  for (const path of ALL) {
    test(`${path}: sin violaciones`, async ({ page }) => {
      await page.goto(path);
      const results = await new AxeBuilder({ page }).exclude("[data-decorative]").withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
      expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
    });
  }
});

test.describe("navegacion e idiomas", () => {
  test("el selector de idioma lleva a la ruta equivalente, incluida la dinamica", async ({ page, isMobile }) => {
    test.skip(isMobile, "el selector es el mismo; se verifica en desktop");
    await page.goto("/es/servicios", { waitUntil: "networkidle" });
    await page.getByRole("link", { name: "EN", exact: true }).click();
    await expect(page).toHaveURL(/\/en\/services$/, { timeout: 30_000 });
    await page.goto("/en/services/landing-page");
    await page.getByRole("link", { name: "ES", exact: true }).click();
    await expect(page).toHaveURL(/\/es\/servicios\/landing-page$/, { timeout: 30_000 });
  });

  test("al cambiar de idioma el spinner va dentro del propio boton (sin pantalla de carga) y luego desaparece", async ({ page, isMobile }) => {
    test.skip(isMobile, "el selector visible en cabecera se verifica en escritorio");
    await page.route(/\/en\/services/, async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await route.continue();
    });
    await page.goto("/es/servicios", { waitUntil: "networkidle" }); // hidratada antes de pulsar: evita clics en una pagina aun inerte bajo carga
    const toEn = page.locator("header nav a[hreflang=\"en\"]");
    const before = await toEn.boundingBox();
    await toEn.click();
    await expect(toEn.locator("[data-spinner]")).toHaveCount(1);
    await expect(page.getByRole("status").filter({ hasText: "Switching to English" })).toHaveCount(1);
    await expect(page.locator("nav[aria-busy='true']")).toHaveCount(1);
    // Sin pantalla de carga encima de la pagina, y el boton no cambia de tamano.
    expect(await page.evaluate(() => [...document.querySelectorAll("body *")].some((el) => getComputedStyle(el).position === "fixed" && el.getBoundingClientRect().width >= innerWidth - 2 && el.getBoundingClientRect().height >= innerHeight - 2 && !(el instanceof HTMLDialogElement)))).toBe(false);
    const during = await toEn.boundingBox();
    expect(Math.round(during?.width ?? 0)).toBe(Math.round(before?.width ?? -1));
    // La navegacion pasa por varias peticiones demoradas: margen amplio para que no dependa de la carga de la maquina.
    await expect(page).toHaveURL(/\/en\/services$/, { timeout: 30_000 });
    await expect(page.getByRole("status").filter({ hasText: "Switching to English" })).toHaveCount(0);
  });

  test("la raiz redirige a un idioma y una ruta inexistente muestra el 404 localizado", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/(es|en)$/);
    const res = await page.goto("/en/no-existe");
    expect(res?.status()).toBe(404);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("This page does not exist");
  });

  test("teclado: el primer foco es el enlace para saltar al contenido", async ({ page, isMobile }) => {
    test.skip(isMobile, "no aplica a tactil");
    await page.goto("/es");
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Saltar al contenido principal" })).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator("#main")).toBeFocused();
  });

  test("movil: el menu abre el explorador, navega y se cierra", async ({ page, isMobile }) => {
    test.skip(!isMobile, "solo movil");
    await page.goto("/es");
    await page.getByRole("button", { name: "Menú" }).click();
    await page.locator("#mobile-nav").getByRole("link", { name: "Precios" }).click();
    await expect(page).toHaveURL(/\/es\/precios$/);
    await expect(page.locator("#mobile-nav")).toHaveCount(0);
  });

  test("sin desbordamiento horizontal desde 360 px", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    for (const path of ["/es", "/es/precios", "/es/contacto", "/es/servicios/crm-personalizado"]) {
      await page.goto(path);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, path).toBeLessThanOrEqual(0);
    }
  });
});

test.describe("desplegable de servicios y efecto de clic", () => {
  test("todo elemento interactivo muestra cursor de mano y el texto normal no", async ({ page }) => {
    await page.goto("/es/contacto");
    const cursors = await page.evaluate(() => {
      const c = (sel: string) => {
        const el = document.querySelector(sel);
        return el ? getComputedStyle(el).cursor : "sin-elemento";
      };
      return [c("header a[href]"), c("main form button"), c("button[role=combobox]"), c("main form input[name=consent]"), c("main form label:has(input[name=consent])")];
    });
    expect(cursors).toEqual(Array(5).fill("pointer"));
    expect(await page.evaluate(() => getComputedStyle(document.querySelector("main p") as Element).cursor)).not.toBe("pointer");
  });

  test("axe sin violaciones con el desplegable abierto (escritorio) y con el menu movil abierto", async ({ page, isMobile }) => {
    await page.goto("/es");
    if (isMobile) {
      await page.getByRole("button", { name: "Menú" }).click();
      await page.locator("#mobile-nav").getByRole("button", { name: "Servicios" }).click();
    } else {
      await page.locator("header nav").getByRole("button", { name: "Servicios" }).click();
    }
    await page.waitForTimeout(400);
    const results = await new AxeBuilder({ page }).exclude("[data-decorative]").withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
  });

  test("abre con tres lineas, cierra con Escape devolviendo el foco y navega a la seccion", async ({ page, isMobile }) => {
    test.skip(isMobile, "el desplegable de escritorio no se muestra en movil");
    await page.goto("/es");
    const trigger = page.locator("header nav").getByRole("button", { name: "Servicios" });
    const panel = page.locator("#services-panel-bar");
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await expect(panel).toBeHidden();

    await trigger.click();
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    await expect(panel).toBeVisible();
    // Solo se listan los servicios: sin titulos de grupo.
    for (const group of ["Páginas web", "Aplicaciones web", "Mantención y soporte"]) {
      await expect(panel.getByText(group, { exact: true })).toHaveCount(0);
    }
    await expect(panel.locator("section")).toHaveCount(0);
    await expect(panel.getByRole("link", { name: /Landing Page|Página Web Multipágina|CRM Personalizado|Mantención web/ })).toHaveCount(4);
    await expect(panel.getByRole("link", { name: /Landing Page/ })).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await expect(trigger).toBeFocused();

    await trigger.click();
    await panel.getByRole("link", { name: /CRM Personalizado/ }).click();
    await expect(page).toHaveURL(/\/es\/servicios\/crm-personalizado$/, { timeout: 20_000 });
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("el desplegable tambien se abre al pasar el cursor, se cierra al salir y un clic lo deja fijo", async ({ page, isMobile }) => {
    test.skip(isMobile, "el hover con mouse se verifica en escritorio");
    await page.goto("/es");
    const trigger = page.locator("header nav").getByRole("button", { name: "Servicios" });
    const panel = page.locator("#services-panel-bar");

    await trigger.hover();
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    await expect(panel).toBeVisible();

    // Pasar del boton al panel no lo cierra.
    await panel.getByRole("link", { name: /Landing Page/ }).hover();
    await page.waitForTimeout(400);
    await expect(panel).toBeVisible();

    // Salir de ambos lo cierra.
    await page.mouse.move(700, 705);
    await expect(trigger).toHaveAttribute("aria-expanded", "false");

    // Un clic estando abierto por hover lo fija: sigue abierto al salir; otro clic lo cierra.
    await trigger.hover();
    await expect(panel).toBeVisible();
    await trigger.click();
    await page.mouse.move(700, 705);
    await page.waitForTimeout(400);
    await expect(panel).toBeVisible();
    await trigger.click();
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  test("al pasar el cursor, los enlaces de la navegacion toman el color primario", async ({ page, isMobile }) => {
    test.skip(isMobile, "el hover con mouse se verifica en escritorio");
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/es");
    const color = (loc: ReturnType<Page["locator"]>) => loc.evaluate((el) => getComputedStyle(el).color);
    const link = page.locator("header nav").getByRole("link", { name: "Precios" });
    expect(await color(link)).toBe("rgb(32, 33, 36)");
    await link.hover();
    await expect.poll(() => color(link)).toBe("rgb(6, 69, 232)");

    const trigger = page.locator("header nav").getByRole("button", { name: "Servicios" });
    await page.mouse.move(700, 705);
    await trigger.hover();
    await expect.poll(() => color(trigger)).toBe("rgb(6, 69, 232)");
    const service = page.locator("#services-panel-bar").getByRole("link", { name: /Landing Page/ });
    await service.hover();
    await expect.poll(() => color(service.getByText("Landing Page", { exact: true }))).toBe("rgb(6, 69, 232)");
  });

  test("en la pagina de un servicio, Servicios queda activo con subrayado azul y texto normal, tambien en oscuro", async ({ page, isMobile }) => {
    test.skip(isMobile, "la barra de escritorio se verifica en escritorio");
    const underline = (loc: ReturnType<Page["locator"]>) => loc.evaluate((el) => ({ text: getComputedStyle(el).color, line: getComputedStyle(el, "::after").backgroundColor, bg: getComputedStyle(el).backgroundColor }));
    for (const [scheme, text, line] of [["light", "rgb(32, 33, 36)", "rgb(6, 69, 232)"], ["dark", "rgb(232, 234, 237)", "rgb(138, 180, 248)"]] as const) {
      await setScheme(page, scheme);
      await page.goto("/es/servicios/landing-page");
      const trigger = page.locator("header nav").getByRole("button", { name: "Servicios" });
      await expect(trigger).toHaveAttribute("aria-current", "page");
      expect(await underline(trigger)).toEqual({ text, line, bg: "rgba(0, 0, 0, 0)" });
      await trigger.hover();
      await expect.poll(async () => (await underline(trigger)).text).toBe(text);
      await page.mouse.move(700, 705);
    }
    await setScheme(page, "light");
    await page.goto("/es/precios");
    await expect(page.locator("header nav").getByRole("button", { name: "Servicios" })).not.toHaveAttribute("aria-current", "page");
    expect((await underline(page.locator("header nav").getByRole("link", { name: "Precios" }))).line).toBe("rgb(6, 69, 232)");
  });

  test("tooltip estilo Google en tema e idioma: aparece al pasar el cursor o con el teclado y Escape lo cierra", async ({ page, isMobile }) => {
    test.skip(isMobile, "el hover y el teclado se verifican en escritorio");
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/es", { waitUntil: "networkidle" });
    const themeBtn = page.locator("header button[data-theme-toggle]");
    const tip = (text: string) => page.getByRole("tooltip").filter({ hasText: text });

    await themeBtn.hover();
    await expect(tip("Activar el tema oscuro del sitio")).toBeVisible();
    expect(await tip("Activar el tema oscuro del sitio").locator("span").evaluate((el) => getComputedStyle(el).backgroundColor)).toBe("rgb(60, 64, 67)");
    await page.keyboard.press("Escape");
    await expect(tip("Activar el tema oscuro del sitio")).toBeHidden();
    await page.mouse.move(700, 705);

    await page.getByRole("link", { name: "EN", exact: true }).hover();
    await expect(tip("View this page in English")).toBeVisible();
    await page.mouse.move(700, 705);
    await expect(tip("View this page in English")).toBeHidden();

    await page.keyboard.press("Tab");
    await themeBtn.focus();
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Tab");
    await expect(tip("Activar el tema oscuro del sitio")).toBeVisible();
  });

  test("el icono del tema es solido: relleno con el color del texto", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/es");
    const icon = page.locator("header button[data-theme-toggle] svg");
    expect(await icon.evaluate((el) => [getComputedStyle(el).fill, getComputedStyle(el).color])).toEqual(["rgb(32, 33, 36)", "rgb(32, 33, 36)"]);
  });

  test("al pulsar un boton aparece la onda y luego se elimina", async ({ page, isMobile }) => {
    test.skip(isMobile, "se verifica con puntero en escritorio");
    await page.goto("/es");
    const trigger = page.locator("header nav").getByRole("button", { name: "Servicios" });
    const box = await trigger.boundingBox();
    if (!box) throw new Error("sin caja del boton");
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await expect(trigger.locator(".ripple-host")).toHaveCount(1);
    await page.mouse.up();
    await expect(page.locator(".ripple-host")).toHaveCount(0);
  });
});

test.describe("modo oscuro", () => {
  for (const path of ALL) {
    test(`${path}: axe sin violaciones en modo oscuro`, async ({ page }) => {
      await setScheme(page, "dark");
      await page.goto(path);
      await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
      const results = await new AxeBuilder({ page }).exclude("[data-decorative]").withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
      expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
    });
  }

  test("en modo oscuro ninguna tarjeta ni panel lleva sombra difusa: solo borde", async ({ page }) => {
    await setScheme(page, "dark");
    for (const path of ["/es", "/es/precios", "/es/servicios/landing-page", "/es/contacto"]) {
      await page.goto(path);
      const blurred = await page.evaluate(() => {
        // Sombra con desenfoque: el tercer valor numerico (blur) es mayor que cero.
        const blur = /\s(-?[\d.]+)px\s(-?[\d.]+)px\s([\d.]+)px/;
        return [...document.querySelectorAll("body *")]
          .filter((el) => {
            const m = getComputedStyle(el).boxShadow.split(/\),\s*/).some((part) => Number(part.match(blur)?.[3] ?? 0) > 0);
            return m;
          })
          .map((el) => `${el.tagName.toLowerCase()}.${String(el.className).split(" ").slice(0, 3).join(".")}`);
      });
      expect(blurred, `sombras difusas en ${path}`).toEqual([]);
    }
  });

  const THEME_BUTTON = 'header button[aria-label*="theme" i], header button[aria-label*="tema" i]';
  const bodyBg = (page: Page) => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  const DARK_BG = "rgb(32, 33, 36)";
  const LIGHT_BG = "rgb(248, 249, 250)";

  test("el tema elegido sobrevive al cambio de idioma y a la navegacion, y el boton sigue cambiando el color", async ({ page, isMobile }) => {
    test.skip(isMobile, "el selector de idioma y el boton de tema se verifican en escritorio");
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/es", { waitUntil: "networkidle" });
    await page.locator(THEME_BUTTON).click();
    await expect.poll(() => bodyBg(page)).toBe(DARK_BG);

    // Cambiar de idioma recrea <html>: el tema oscuro debe mantenerse y el siguiente clic debe volver a claro.
    await page.getByRole("link", { name: "EN", exact: true }).click();
    await expect(page).toHaveURL(/\/en$/);
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect.poll(() => bodyBg(page)).toBe(DARK_BG);
    await page.locator(THEME_BUTTON).click();
    await expect.poll(() => bodyBg(page)).toBe(LIGHT_BG);

    // Navegar entre paginas conserva el claro; otro clic vuelve a oscuro.
    await page.locator("header nav").getByRole("link", { name: "Pricing" }).click();
    await expect(page).toHaveURL(/\/en\/pricing$/);
    await expect.poll(() => bodyBg(page)).toBe(LIGHT_BG);
    await page.locator(THEME_BUTTON).click();
    await expect.poll(() => bodyBg(page)).toBe(DARK_BG);
  });

  test("el tema por defecto es claro aunque el sistema sea oscuro; el boton lo pasa a oscuro y se recuerda al cambiar de idioma", async ({ page, isMobile }) => {
    test.skip(isMobile, "se verifica en escritorio");
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/es", { waitUntil: "networkidle" });
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await expect.poll(() => bodyBg(page)).toBe(LIGHT_BG);
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme)).toBe("light");
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#ffffff");
    await page.locator(THEME_BUTTON).click();
    await expect.poll(() => bodyBg(page)).toBe(DARK_BG);
    await page.getByRole("link", { name: "EN", exact: true }).click();
    await expect(page).toHaveURL(/\/en$/);
    await expect.poll(() => bodyBg(page)).toBe(DARK_BG);
    await page.locator(THEME_BUTTON).click();
    await expect.poll(() => bodyBg(page)).toBe(LIGHT_BG);
  });

  test("sin preferencia guardada, un movil con el sistema en oscuro tambien abre en claro", async ({ browser }) => {
    const ctx = await browser.newContext({ colorScheme: "dark", viewport: { width: 390, height: 800 }, isMobile: true, hasTouch: true });
    const page = await ctx.newPage();
    await page.goto("/es");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await expect.poll(() => bodyBg(page)).toBe(LIGHT_BG);
    await ctx.close();
  });

  test("dos clics rapidos dejan el tema como estaba y un tercero lo cambia", async ({ page, isMobile }) => {
    test.skip(isMobile, "se verifica en escritorio");
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/es");
    await page.locator(THEME_BUTTON).dblclick();
    await expect.poll(() => bodyBg(page)).toBe(LIGHT_BG);
    await page.locator(THEME_BUTTON).click();
    await expect.poll(() => bodyBg(page)).toBe(DARK_BG);
  });

  test("el boton cambia el color aunque se pulse antes de que cargue React", async ({ page, isMobile }) => {
    test.skip(isMobile, "se verifica en escritorio");
    // Sin los JS del framework la pagina no hidrata: solo corre el script de tema de <head>.
    await page.route(/\/_next\/static\/.*\.js/, (route) => route.abort());
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/es");
    await page.locator(THEME_BUTTON).click();
    await expect.poll(() => bodyBg(page)).toBe(DARK_BG);
    await page.locator(THEME_BUTTON).click();
    await expect.poll(() => bodyBg(page)).toBe(LIGHT_BG);
  });

  test("si el almacenamiento esta bloqueado el boton igual cambia el color", async ({ page, isMobile }) => {
    test.skip(isMobile, "se verifica en escritorio");
    await page.addInitScript(() => {
      Object.defineProperty(window, "localStorage", { get() { throw new DOMException("bloqueado", "SecurityError"); } });
    });
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/es");
    await page.locator(THEME_BUTTON).click();
    await expect.poll(() => bodyBg(page)).toBe(DARK_BG);
    await page.locator(THEME_BUTTON).click();
    await expect.poll(() => bodyBg(page)).toBe(LIGHT_BG);
  });

  test("el boton alterna el tema, lo recuerda al recargar y no crea cookies", async ({ page, context }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/es");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await page.getByRole("button", { name: "Cambiar a tema oscuro" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe("rgb(32, 33, 36)");

    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    expect(await context.cookies()).toEqual([]);

    await page.getByRole("button", { name: "Cambiar a tema claro" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe("rgb(248, 249, 250)");
  });
});

test.describe("precios por idioma", () => {
  test("espanol en pesos; ingles en dolares con la nota de conversion", async ({ page }) => {
    await page.goto("/es/precios", { waitUntil: "networkidle" });
    await expect(page.getByRole("tabpanel").getByText("$261.800", { exact: true })).toBeVisible();
    await page.getByRole("tab", { name: "CRM Personalizado" }).click();
    await expect(page.getByRole("tabpanel").getByText("$1.428.000", { exact: true })).toBeVisible();

    await page.goto("/en/pricing", { waitUntil: "networkidle" });
    const prices = await page.getByRole("tabpanel").locator("h3 + p").allTextContents();
    expect(prices.some((t) => /^\$[\d,]+$/.test(t.trim()))).toBe(true);
    await expect(page.getByText(/Prices in US dollars, no fine print/).first()).toBeVisible();
    // Los textos informativos no hablan de IVA: eso queda para el cotizador y los terminos.
    await expect(page.locator("main")).not.toContainText(/VAT/);
    await expect(page.getByText("$261.800", { exact: true })).toHaveCount(0);
  });

  test("la pagina de precios usa la misma distribucion de pestanas que servicios: un servicio por pestana, con sus tres planes", async ({ page }) => {
    await page.goto("/es/precios", { waitUntil: "networkidle" });
    const tabs = page.getByRole("tablist", { name: "Servicios con precios" }).getByRole("tab");
    await expect(tabs).toHaveText(["Landing Page", "Página Web Multipágina", "CRM Personalizado", "Mantención mensual"]);
    await expect(tabs.first()).toHaveAttribute("aria-selected", "true");

    for (const name of ["Landing Page", "Página Web Multipágina", "CRM Personalizado"]) {
      await page.getByRole("tab", { name }).click();
      const panel = page.getByRole("tabpanel");
      await expect(panel).toHaveCount(1);
      await expect(panel.getByRole("heading", { level: 3 })).toHaveCount(3);
      await expect(panel.getByRole("button", { name: /Cotizar plan/ })).toHaveCount(3);
    }

    await page.getByRole("tab", { name: "Mantención mensual" }).click();
    await expect(page.getByRole("tabpanel").getByRole("table")).toBeVisible();
    await expect(page).toHaveURL(/\/es\/precios#mantencion-web$/);

    // Teclado y hash, igual que en servicios.
    await page.getByRole("tab", { name: "Mantención mensual" }).focus();
    await page.keyboard.press("Home");
    await expect(page.getByRole("tab", { name: "Landing Page" })).toHaveAttribute("aria-selected", "true");
    await page.goto("/es/precios#crm-personalizado", { waitUntil: "networkidle" });
    await expect(page.getByRole("tab", { name: "CRM Personalizado" })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("link", { name: "Ver detalle y planes" })).toHaveCount(0);
  });

  test("las pestanas de precios son accesibles en claro y oscuro", async ({ page }) => {
    for (const scheme of ["light", "dark"] as const) {
      await setScheme(page, scheme);
      await page.goto("/en/pricing#pagina-web-multipagina", { waitUntil: "networkidle" });
      await expect(page.getByRole("tab", { name: "Multi-page Website" })).toHaveAttribute("aria-selected", "true");
      const results = await new AxeBuilder({ page }).exclude("[data-decorative]").withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
      expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
    }
  });
});

test.describe("pagina FAQ", () => {
  test("se llega desde el pie (ya no esta en el menu superior) y muestra las nueve preguntas agrupadas", async ({ page }) => {
    await page.goto("/es");
    await expect(page.locator("header nav").getByRole("link", { name: "FAQ" })).toHaveCount(0);
    await expect(page.locator("header nav").getByRole("link", { name: "Nosotros" })).toHaveCount(0);
    await page.locator("footer").getByRole("link", { name: "FAQ" }).click();
    await expect(page).toHaveURL(/\/es\/preguntas-frecuentes$/);
    await expect(page.locator("main details")).toHaveCount(9);
    await expect(page.getByRole("heading", { level: 2 })).toHaveCount(4);
    await page.locator("main details summary").first().click();
    await expect(page.locator("main details").first()).toHaveAttribute("open", "");
    await page.goto("/en/faq");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Frequently asked questions");
  });
});

test.describe("navegacion entre paginas", () => {
  test("cada pagina nueva abre desde el tope y sin desplazamiento animado", async ({ page, isMobile }) => {
    test.skip(isMobile, "el enlace de la cabecera solo esta visible en escritorio");
    await page.goto("/es");
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior)).toBe("auto");

    // Desde el fondo de la portada, ir a Precios por la cabecera.
    await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" }));
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(1000);
    await page.locator("header nav").getByRole("link", { name: "Precios" }).click();
    await expect(page).toHaveURL(/\/es\/precios$/);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);

    // Desde el fondo de Precios, ir a Nosotros por el pie.
    await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" }));
    await page.locator("footer").getByRole("link", { name: "Nosotros" }).click();
    await expect(page).toHaveURL(/\/es\/nosotros$/);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  });

  test("un enlace con ancla sigue yendo a su seccion, tambien sin animacion", async ({ page, isMobile }) => {
    test.skip(isMobile, "el desplegable de escritorio no se muestra en movil");
    await page.goto("/es/precios");
    await page.goto("/es/precios#h-preguntas");
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(300);
  });
});

test.describe("formulario de contacto", () => {
  const captureLinks = (page: Page) =>
    page.addInitScript(() => {
      (window as unknown as { __opened: string[] }).__opened = [];
      document.addEventListener(
        "click",
        (e) => {
          const a = (e.target as Element | null)?.closest("a[href]") as HTMLAnchorElement | null;
          if (a && /^(mailto:|https:\/\/wa\.me\/)/.test(a.href)) {
            (window as unknown as { __opened: string[] }).__opened.push(a.href);
            e.preventDefault();
          }
        },
        true,
      );
    });
  const opened = (page: Page) => page.evaluate(() => (window as unknown as { __opened: string[] }).__opened);

  test("tiene el mismo formato que la cotizacion: campos, consentimiento y solo los botones de correo y WhatsApp", async ({ page }) => {
    await page.goto("/es/contacto", { waitUntil: "networkidle" });
    const form = page.locator("main form");
    for (const label of [/Nombre completo o empresa/, /Teléfono/, /Cuéntanos sobre el proyecto/]) await expect(form.getByLabel(label)).toHaveAttribute("required", "");
    await expect(form.getByRole("combobox", { name: /Servicio/ })).toBeVisible();
    await expect(form.getByRole("checkbox", { name: /He leído y acepto los Términos y Condiciones/ })).toBeVisible();
    await expect(form.getByRole("button", { name: "Enviar por correo" })).toBeVisible();
    await expect(form.getByRole("button", { name: "Enviar por WhatsApp" })).toBeVisible();
    await expect(form.getByRole("button", { name: /Contactar|Enviando/ })).toHaveCount(0);
    await expect(form.getByLabel("Correo electrónico")).toHaveCount(0);
  });

  test("valida antes de enviar: con errores no se abre nada, marca cada campo, enfoca el primero y conserva lo escrito", async ({ page }) => {
    await captureLinks(page);
    await page.goto("/es/contacto", { waitUntil: "networkidle" });
    const form = page.locator("main form");
    await form.getByLabel(/Nombre completo o empresa/).fill("Ana Pérez");
    for (const name of ["Enviar por correo", "Enviar por WhatsApp"]) {
      await form.getByRole("button", { name }).click();
      await expect(form.getByLabel(/Teléfono/)).toBeFocused();
      await expect(form.getByLabel(/Teléfono/)).toHaveAttribute("aria-invalid", "true");
      await expect(form.getByLabel(/Cuéntanos sobre el proyecto/)).toHaveAttribute("aria-invalid", "true");
      await expect(form.getByRole("checkbox", { name: /He leído y acepto/ })).toHaveAttribute("aria-invalid", "true");
      await expect(form.getByLabel(/Nombre completo o empresa/)).toHaveValue("Ana Pérez");
      await expect(form.getByText("Enviando")).toHaveCount(0);
      await expect(form.getByRole("status")).toHaveCount(0);
    }
    expect(await opened(page)).toEqual([]);
  });

  test("con todo correcto, el correo y WhatsApp se abren con el mensaje de consulta ya escrito", async ({ page }) => {
    await captureLinks(page);
    await page.goto("/es/contacto", { waitUntil: "networkidle" });
    const form = page.locator("main form");
    await form.getByLabel(/Nombre completo o empresa/).fill("Ana Pérez");
    await form.getByLabel(/Teléfono/).fill("951730743");
    await form.getByLabel(/Cuéntanos sobre el proyecto/).fill("Necesito una landing para mi tienda.");
    await form.getByRole("combobox", { name: /Servicio/ }).click();
    await page.getByRole("listbox", { name: /Servicio/ }).getByRole("option", { name: "Landing Page" }).click();
    await form.getByRole("checkbox", { name: /He leído y acepto/ }).check();

    await form.getByRole("button", { name: "Enviar por correo" }).click();
    await expect(form.getByRole("status")).toContainText("Abrimos tu aplicación de correo");
    await form.getByRole("button", { name: "Enviar por WhatsApp" }).click();
    await expect(form.getByRole("status")).toContainText("Abrimos WhatsApp");
    const [mail, wa] = await opened(page);
    const url = new URL(mail ?? "");
    expect(url.protocol).toBe("mailto:");
    expect(decodeURIComponent(url.pathname)).toBe("contact@acmora.com");
    expect(url.searchParams.get("subject")).toBe("Consulta desde el sitio web: Landing Page - Ana Pérez");
    const body = url.searchParams.get("body") ?? "";
    for (const line of ["Hola, les escribo desde el sitio de Acmora para hacer una consulta:", "Servicio de interés: Landing Page", "Nombre o empresa: Ana Pérez", "Teléfono: +56 951730743", "Necesito una landing para mi tienda.", "Enviado desde el formulario de contacto de Acmora."]) expect(body).toContain(line);
    expect(wa?.startsWith("https://wa.me/56951730743?text=")).toBe(true);
    expect(new URL(wa ?? "").searchParams.get("text")).toBe(body);
  });
});

test.describe("dialogo de cotizacion", () => {
  // Registra los enlaces que el dialogo abre (mailto: y WhatsApp) sin salir de la pagina.
  const captureLinks = (page: Page) =>
    page.addInitScript(() => {
      (window as unknown as { __opened: string[] }).__opened = [];
      document.addEventListener(
        "click",
        (e) => {
          const a = (e.target as Element | null)?.closest("a[href]") as HTMLAnchorElement | null;
          if (a && /^(mailto:|https:\/\/wa\.me\/)/.test(a.href)) {
            (window as unknown as { __opened: string[] }).__opened.push(a.href);
            e.preventDefault();
          }
        },
        true,
      );
    });
  const opened = (page: Page) => page.evaluate(() => (window as unknown as { __opened: string[] }).__opened);

  test("Cotizar plan abre un dialogo con todos los campos obligatorios, aviso de privacidad y cierre con Escape o Cancelar", async ({ page }) => {
    await page.goto("/es/servicios/landing-page", { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Cotizar plan Básico" }).click();
    const dialog = page.getByRole("dialog", { name: "Solicita tu cotización" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("Landing Page · Plan Básico")).toBeVisible();
    await expect(dialog.getByLabel(/Nombre completo o empresa/)).toBeFocused();
    await expect(dialog.locator("input[name='service']")).toHaveValue("landing");
    for (const label of [/Nombre completo o empresa/, /Teléfono/, /Cuéntanos sobre el proyecto/]) {
      await expect(dialog.getByLabel(label)).toHaveAttribute("required", "");
    }
    await expect(dialog.getByRole("combobox", { name: /Servicio/ })).toHaveAttribute("aria-required", "true");
    const consent = dialog.getByRole("checkbox", { name: /He leído y acepto los Términos y Condiciones.*Política de Privacidad.*de Acmora, y autorizo el tratamiento de mis datos personales/ });
    await expect(consent).toBeVisible();
    await expect(consent).not.toBeChecked();
    await expect(consent).toHaveAttribute("required", "");
    const terms = dialog.getByRole("link", { name: /Términos y Condiciones/ });
    const privacy = dialog.getByRole("link", { name: /Política de Privacidad/ });
    await expect(terms).toHaveAttribute("href", "/es/terminos");
    await expect(privacy).toHaveAttribute("href", "/es/privacidad");
    for (const l of [terms, privacy]) {
      await expect(l).toHaveAttribute("target", "_blank");
      await expect(l).toHaveAttribute("rel", /noopener/);
      await expect(l).toContainText("(se abre en una pestaña nueva)");
    }
    await expect(dialog.getByText(/Usamos tus datos solo para responderte esta consulta/)).toBeVisible();
    await expect(dialog.getByText("Paso 1 de 2 · Tus datos")).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Siguiente" })).toBeVisible();
    await expect(dialog.getByRole("button", { name: /Enviar por/ })).toHaveCount(0);

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await page.getByRole("button", { name: "Cotizar plan Básico" }).click();
    await dialog.getByRole("button", { name: "Cancelar" }).click();
    await expect(dialog).toBeHidden();
  });

  test("con campos vacios no se pasa al paso 2: marca cada campo como obligatorio y conserva lo escrito", async ({ page }) => {
    await captureLinks(page);
    await page.goto("/es/servicios/crm-personalizado", { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Cotizar plan Premium" }).click();
    const dialog = page.getByRole("dialog", { name: "Solicita tu cotización" });
    await expect(dialog.locator("input[name='service']")).toHaveValue("crm");
    await dialog.getByLabel(/Nombre completo o empresa/).fill("Ana Pérez");
    for (const name of ["Siguiente", "Siguiente"]) {
      await dialog.getByRole("button", { name }).click();
      await expect(dialog.getByRole("alert")).toHaveCount(0);
      await expect(dialog.getByText("todos son obligatorios")).toHaveCount(0);
      await expect(dialog.getByLabel(/Teléfono/)).toBeFocused();
      await expect(dialog.getByLabel(/Teléfono/)).toHaveAttribute("aria-invalid", "true");
      await expect(dialog.getByLabel(/Cuéntanos sobre el proyecto/)).toHaveAttribute("aria-invalid", "true");
      await expect(dialog.getByLabel(/Nombre completo o empresa/)).toHaveValue("Ana Pérez");
      await expect(dialog.getByTestId("quote-step-2")).toHaveCount(0);
    }
    expect(await opened(page)).toEqual([]);
  });

  test("el correo y WhatsApp se abren con todo el detalle y los datos de contacto ya escritos", async ({ page }) => {
    await captureLinks(page);
    await page.goto("/es/servicios/crm-personalizado", { waitUntil: "networkidle" });
    const fill = async () => {
      await page.getByRole("button", { name: "Cotizar plan Premium" }).click();
      const dialog = page.getByRole("dialog", { name: "Solicita tu cotización" });
      await dialog.getByLabel(/Nombre completo o empresa/).fill("Ana Pérez");
      await dialog.getByLabel(/Teléfono/).fill("951730743");
      await dialog.getByLabel(/Cuéntanos sobre el proyecto/).fill("Necesito un CRM para mi equipo de ventas.");
      await dialog.getByRole("checkbox", { name: /He leído y acepto/ }).check();
      await dialog.getByRole("button", { name: "Siguiente" }).click();
      await expect(dialog.getByTestId("quote-step-2")).toBeVisible();
      return dialog;
    };
    // El bono del mes (si quedan cupos) va en el detalle: se toma de la pantalla porque depende del mes en curso.
    const expectedFor = (bonus: string) => [
      "Hola, quiero cotizar el siguiente servicio:",
      "",
      "Servicio: CRM Personalizado",
      "Plan: Premium",
      "Nombre o empresa: Ana Pérez",
      "Teléfono: +56 951730743",
      "",
      "Detalle de la cotización (precios con IVA incluido):",
      "- Plan: Premium ($4.046.000)",
      ...(bonus ? [`- ${bonus}`] : []),
      "- Valor neto: $3.400.000",
      "- IVA (19%): $646.000",
      "- Total con IVA incluido: $4.046.000",
      "",
      "Sobre el proyecto:",
      "Necesito un CRM para mi equipo de ventas.",
      "",
      "Acepté los Términos y Condiciones y la Política de Privacidad de Acmora, y autorizo el tratamiento de mis datos personales para responder esta solicitud.",
      "Enviado desde el sitio de Acmora.",
    ].join("\n");

    let dialog = await fill();
    const bonusBox = dialog.getByTestId("quote-bonus");
    const expected = expectedFor((await bonusBox.count()) > 0 ? (await bonusBox.innerText()).trim() : "");
    await dialog.getByRole("button", { name: "Enviar por correo" }).click();
    // Tras enviar cambia el titulo (y con el su nombre accesible): se busca por rol.
    const done = page.getByRole("dialog");
    await expect(done.getByRole("status")).toContainText("Abrimos tu aplicación de correo");
    await expect(done.getByRole("link", { name: "contact@acmora.com" })).toBeVisible();
    await done.getByRole("button", { name: "Cerrar", exact: true }).click();

    dialog = await fill();
    await dialog.getByRole("button", { name: "Enviar por WhatsApp" }).click();
    await expect(done.getByRole("status")).toContainText("Abrimos WhatsApp");

    const [mail, wa] = await opened(page);
    const url = new URL(mail ?? "");
    expect(url.protocol).toBe("mailto:");
    expect(decodeURIComponent(url.pathname)).toBe("contact@acmora.com");
    expect(url.searchParams.get("subject")).toBe("Solicitud de cotización: CRM Personalizado - Premium - Ana Pérez");
    expect(url.searchParams.get("body")).toBe(expected);
    expect(wa?.startsWith("https://wa.me/56951730743?text=")).toBe(true);
    expect(new URL(wa ?? "").searchParams.get("text")).toBe(expected);
  });

  test("el dialogo es de estilo Google: esquinas amplias y accesible (axe) en claro y oscuro", async ({ page }) => {
    for (const scheme of ["light", "dark"] as const) {
      await setScheme(page, scheme);
      await page.goto("/en/services/landing-page", { waitUntil: "networkidle" });
      await page.getByRole("button", { name: "Quote Basic plan" }).click();
      const dialog = page.getByRole("dialog", { name: "Request your quote" });
      await expect(dialog).toBeVisible();
      await page.waitForTimeout(400);
      expect(await dialog.evaluate((el) => getComputedStyle(el).borderTopLeftRadius)).toBe("28px");
      const results = await new AxeBuilder({ page }).exclude("[data-decorative]").withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
      expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
      await dialog.getByLabel(/Full name or company/).fill("Ana Perez");
      await dialog.getByLabel(/^Phone/).fill("912345678");
      await dialog.getByLabel(/Tell us about the project/).fill("I need a landing page for my store.");
      await dialog.getByRole("checkbox", { name: /I have read and accept/ }).check();
      await dialog.getByRole("button", { name: "Next" }).click();
      await expect(dialog.getByTestId("quote-step-2")).toBeVisible();
      await dialog.getByRole("checkbox", { name: "Add support" }).check();
      await dialog.getByRole("button", { name: /benefits and conditions/ }).click();
      const step2 = await new AxeBuilder({ page }).exclude("[data-decorative]").withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
      expect(step2.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
    }
  });
});

test.describe("pestanas de servicios", () => {
  test("la pagina de servicios muestra un servicio por pestana y se navega entre ellas con mouse, teclado y hash", async ({ page }) => {
    await page.goto("/es/servicios", { waitUntil: "networkidle" });
    const tablist = page.getByRole("tablist", { name: "Servicios disponibles" });
    const tabs = tablist.getByRole("tab");
    await expect(tabs).toHaveText(["Landing Page", "Página Web Multipágina", "CRM Personalizado", "Mantención web"]);
    await expect(tabs.first()).toHaveAttribute("aria-selected", "true");
    const panel = page.getByRole("tabpanel");
    await expect(panel).toHaveCount(1);
    await expect(panel).toContainText("$261.800");

    await tablist.getByRole("tab", { name: "CRM Personalizado" }).click();
    await expect(page).toHaveURL(/\/es\/servicios#crm-personalizado$/);
    await expect(page.getByRole("tab", { name: "CRM Personalizado" })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("tabpanel")).toContainText("$1.428.000");
    await expect(page.getByRole("tabpanel")).not.toContainText("$261.800");

    // Teclado: flechas, Inicio y Fin; solo la pestana activa entra en el orden de tabulacion.
    await page.getByRole("tab", { name: "CRM Personalizado" }).focus();
    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("tab", { name: "Mantención web" })).toBeFocused();
    await expect(page.getByRole("tab", { name: "Mantención web" })).toHaveAttribute("aria-selected", "true");
    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("tab", { name: "Landing Page" })).toHaveAttribute("aria-selected", "true");
    await page.keyboard.press("End");
    await expect(page.getByRole("tab", { name: "Mantención web" })).toHaveAttribute("aria-selected", "true");
    await page.keyboard.press("Home");
    await expect(page.getByRole("tab", { name: "Landing Page" })).toHaveAttribute("tabindex", "0");
    await expect(page.getByRole("tab", { name: "CRM Personalizado" })).toHaveAttribute("tabindex", "-1");

    // Un enlace con hash abre directo esa pestana, y cada panel enlaza al detalle completo del servicio.
    await page.goto("/es/servicios#pagina-web-multipagina", { waitUntil: "networkidle" });
    await expect(page.getByRole("tab", { name: "Página Web Multipágina" })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("link", { name: "Ver detalle y planes" })).toHaveCount(0);
  });

  test("las pestanas son estilo Google: texto azul con barra inferior en la activa, y los botones de plan siguen abriendo el dialogo", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/es/servicios", { waitUntil: "networkidle" });
    const active = page.getByRole("tab", { name: "Landing Page" });
    const inactive = page.getByRole("tab", { name: "CRM Personalizado" });
    const look = (loc: ReturnType<Page["locator"]>) => loc.evaluate((el) => ({ color: getComputedStyle(el).color, bar: getComputedStyle(el, "::after").backgroundColor, scale: getComputedStyle(el, "::after").scale }));
    expect(await look(active)).toMatchObject({ color: "rgb(6, 69, 232)", bar: "rgb(6, 69, 232)" });
    expect((await look(inactive)).color).toBe("rgb(95, 99, 104)");
    expect((await look(inactive)).scale).toBe("0 1");

    await page.getByRole("button", { name: "Cotizar plan Básico" }).click();
    await expect(page.getByRole("dialog", { name: "Solicita tu cotización" })).toBeVisible();
    await expect(page.getByRole("dialog").locator("input[name='service']")).toHaveValue("landing");
  });

  test("la pagina de servicios con una pestana abierta no tiene violaciones de accesibilidad, en claro y oscuro", async ({ page }) => {
    for (const scheme of ["light", "dark"] as const) {
      await setScheme(page, scheme);
      await page.goto("/es/servicios#crm-personalizado", { waitUntil: "networkidle" });
      await expect(page.getByRole("tab", { name: "CRM Personalizado" })).toHaveAttribute("aria-selected", "true");
      const results = await new AxeBuilder({ page }).exclude("[data-decorative]").withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
      expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
    }
  });
});

test.describe("enlaces activos del desplegable de servicios", () => {
  const CASES = [
    ["/es/servicios/landing-page", "Landing Page"],
    ["/es/servicios/pagina-web-multipagina", "Página Web Multipágina"],
    ["/es/servicios/crm-personalizado", "CRM Personalizado"],
    ["/es/servicios/mantencion-web", "Mantención web"],
    ["/en/services/landing-page", "Landing Page"],
    ["/en/services/pagina-web-multipagina", "Multi-page Website"],
    ["/en/services/crm-personalizado", "Custom CRM"],
    ["/en/services/mantencion-web", "Website maintenance"],
  ] as const;

  for (const [path, name] of CASES) {
    test(`${path}: el servicio y el item Servicios aparecen activos`, async ({ page, isMobile }) => {
      test.skip(isMobile, "el desplegable de escritorio no se muestra en movil");
      await page.emulateMedia({ colorScheme: "light" });
      await page.goto(path);
      const es = path.startsWith("/es");
      const trigger = page.locator("header nav").getByRole("button", { name: es ? "Servicios" : "Services" });
      await expect(trigger).toHaveAttribute("aria-current", "page");
      await trigger.click();
      const panel = page.locator("#services-panel-bar");
      const current = panel.locator("a[aria-current='page']");
      await expect(current).toHaveCount(1);
      await expect(current).toHaveAttribute("href", path);
      await expect(current).toContainText(name);
      expect(await current.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe("rgb(232, 240, 254)");
      expect(await current.locator("span.font-medium").first().evaluate((el) => getComputedStyle(el).color)).toBe("rgb(6, 69, 232)");
      // Los demas servicios no se marcan.
      expect(await panel.locator("a[href*='/serv']").count()).toBeGreaterThan(1);
    });
  }
});

test.describe("boton de subir y barra final", () => {
  test("no hay boton flotante de WhatsApp: los enlaces a WhatsApp van dentro del contenido", async ({ page }) => {
    await page.goto("/es", { waitUntil: "networkidle" });
    const fixed = await page.evaluate(() => [...document.querySelectorAll("a[href*='wa.me']")].filter((a) => getComputedStyle(a).position === "fixed" || a.closest("[class*='fixed']")).length);
    expect(fixed).toBe(0);
    await expect(page.getByRole("link", { name: "Escribir por WhatsApp", exact: true }).first()).toBeVisible();
  });

  test("el boton de subir aparece al bajar y sube al inicio", async ({ page }) => {
    await page.goto("/es/precios", { waitUntil: "networkidle" });
    const up = page.getByRole("button", { name: "Volver arriba" });
    await expect(up).toBeHidden();
    await page.evaluate(() => window.scrollTo({ top: 1500, behavior: "instant" }));
    await expect(up).toBeVisible();
    await up.click();
    await expect.poll(() => page.evaluate(() => window.scrollY), { timeout: 10_000 }).toBe(0);
    await expect(up).toBeHidden();
  });

  test("el boton de subir tiene globo de ayuda y queda dentro de la pantalla, sin desbordar a 360 px", async ({ page, isMobile }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto("/es/precios", { waitUntil: "networkidle" });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    await page.evaluate(() => window.scrollTo({ top: 1500, behavior: "instant" }));
    const up = page.getByRole("button", { name: "Volver arriba" });
    await expect(up).toBeVisible();
    const box = await up.boundingBox();
    expect(box && box.x + box.width <= 360 && box.y + box.height <= 800).toBe(true);
    if (!isMobile) {
      await page.setViewportSize({ width: 1280, height: 800 });
      await up.hover();
      await expect(page.getByRole("tooltip").filter({ hasText: "Subir al inicio de la página" })).toBeVisible();
    }
  });

  test("la barra bajo el pie muestra derechos y la firma de quien creo el sitio, sin version interna", async ({ page }) => {
    await page.goto("/es");
    const bar = page.locator("footer > div").last();
    await expect(bar).toContainText("© 2026 Acmora. Todos los derechos reservados.");
    await expect(bar).not.toContainText("Hecho en Chile");
    await expect(bar).toContainText("Sitio creado por");
    await expect(bar).toContainText("José Ignacio Contreras Castro");
    await expect(bar).toContainText("Desarrollador web");
    for (const [name, href] of [["LinkedIn", "https://www.linkedin.com/in/jic-dv/"], ["GitHub", "https://github.com/jic-dv"]] as const) {
      const link = bar.getByRole("link", { name });
      await expect(link).toHaveAttribute("href", href);
      await expect(link).toHaveAttribute("target", "_blank");
      await expect(link).toHaveAttribute("rel", /noopener/);
    }
    await expect(bar).not.toContainText("Versión");
  });
});

test.describe("secciones del inicio estilo Firebase", () => {
  test("los servicios van en dos columnas oscuras con enlaces a cada servicio y su precio", async ({ page }) => {
    await page.goto("/es");
    const web = page.getByRole("region", { name: "Elige el servicio que tu negocio necesita" });
    await expect(web.getByRole("heading", { level: 2 })).toHaveCount(2);
    await expect(web.getByText("PÁGINAS WEB", { exact: true })).toBeVisible();
    await expect(web.getByText("APLICACIONES Y SOPORTE", { exact: true })).toBeVisible();
    for (const [name, price, href] of [
      ["Landing Page", "Desde $261.800", "/es/servicios/landing-page"],
      ["Página Web Multipágina", "Desde $499.800", "/es/servicios/pagina-web-multipagina"],
      ["CRM Personalizado", "Desde $1.428.000", "/es/servicios/crm-personalizado"],
      ["Mantención web", "", "/es/servicios/mantencion-web"],
    ] as const) {
      const link = web.getByRole("link", { name: new RegExp(name) });
      await expect(link).toHaveAttribute("href", href);
      if (price) await expect(link).toContainText(price);
    }
    await expect(web.getByRole("link", { name: "Ver páginas web" })).toHaveAttribute("href", "/es/servicios#landing-page");
    await expect(web.getByRole("link", { name: "Ver CRM y mantención" })).toHaveAttribute("href", "/es/servicios#crm-personalizado");
    expect(await web.evaluate((el) => getComputedStyle(el).backgroundImage)).not.toBe("none");
  });

  test("la seccion de tecnologia muestra dos tarjetas sobre un panel degradado y una fila con las demas ventajas", async ({ page }) => {
    await page.goto("/es");
    const section = page.getByRole("region", { name: "Lo que gana tu negocio" });
    await expect(section.getByText("No pierdes visitas por lentitud", { exact: true })).toBeVisible();
    await expect(section.getByText("Te encuentran en Google", { exact: true })).toBeVisible();
    await expect(section.getByRole("heading", { name: "Lo que incluye cada proyecto" })).toBeVisible();
    for (const t of ["Te ves serio en cualquier pantalla", "Sin sustos de seguridad", "Pensado para que te escriban", "Hablas con quien lo hizo"]) await expect(section.getByText(t, { exact: true })).toBeVisible();
    await expect(section.getByRole("link", { name: "Ver servicios" })).toHaveAttribute("href", "/es/servicios");
  });

  test("el proceso muestra los 3 pasos numerados a la vista, con descripcion y viñetas, sin romper la accesibilidad", async ({ page }) => {
    test.setTimeout(90_000); // recorre dos temas con axe: bajo carga paralela supera los 30 s por defecto
    for (const scheme of ["light", "dark"] as const) {
      await setScheme(page, scheme);
      await page.goto("/es", { waitUntil: "networkidle" });
      const steps = page.getByRole("list", { name: "Tu proyecto en 3 pasos" }).getByRole("listitem").filter({ has: page.getByRole("heading", { level: 3 }) });
      await expect(steps).toHaveCount(3);
      await expect(steps.nth(0)).toContainText("1");
      await expect(steps.nth(0).getByRole("heading", { level: 3 })).toHaveText("Conversamos");
      await expect(steps.nth(1).getByRole("heading", { level: 3 })).toHaveText("Diseñamos y desarrollamos");
      await expect(steps.nth(2).getByRole("heading", { level: 3 })).toHaveText("Lanzamos");
      // Todos los pasos visibles a la vez (sin pestañas), cada uno con su descripcion y lo que incluye.
      for (let i = 0; i < 3; i++) {
        await expect(steps.nth(i)).toBeVisible();
        expect(await steps.nth(i).locator("ul li").count(), "viñetas del paso " + (i + 1)).toBeGreaterThanOrEqual(2);
      }
      await expect(page.getByRole("tablist", { name: "Tu proyecto en 3 pasos" })).toHaveCount(0);
      const results = await new AxeBuilder({ page }).exclude("[data-decorative]").withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
      expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
    }
  });

  test("el texto plano del inicio conserva los servicios, las ventajas y los pasos", async ({ request }) => {
    const md = await (await request.get("/raw/es/index.md")).text();
    for (const t of ["Landing Page", "CRM Personalizado", "No pierdes visitas por lentitud", "Hablas con quien lo hizo", "Conversamos", "Lanzamos"]) expect(md).toContain(t);
  });
});

test.describe("efecto de clic", () => {
  test("el logotipo no genera la onda al pulsarlo, pero el resto de enlaces y botones si", async ({ page, isMobile }) => {
    test.skip(isMobile, "se verifica con puntero en escritorio");
    await page.goto("/es/precios", { waitUntil: "networkidle" });
    const logo = page.locator("header a[href='/es']");
    const box = await logo.boundingBox();
    if (!box) throw new Error("sin caja del logotipo");
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(150);
    await expect(page.locator(".ripple-host")).toHaveCount(0);
    await page.mouse.up();

    // Control: un enlace de la navegacion si genera la onda.
    await page.goto("/es/precios", { waitUntil: "networkidle" });
    const nav = page.locator("header nav").getByRole("link", { name: "Proyectos" });
    const nb = await nav.boundingBox();
    if (!nb) throw new Error("sin caja del enlace");
    await page.mouse.move(nb.x + nb.width / 2, nb.y + nb.height / 2);
    await page.mouse.down();
    await expect(nav.locator(".ripple-host")).toHaveCount(1);
    await page.mouse.up();
  });
});

test.describe("pestanas con desplazamiento y secciones planas", () => {
  test("en pantallas angostas la fila de pestanas se desplaza con flechas y degradados, y siempre se llega a la ultima", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto("/es/servicios", { waitUntil: "networkidle" });
    const list = page.getByRole("tablist", { name: "Servicios disponibles" });
    const scrollLeft = () => list.evaluate((el) => el.scrollLeft);
    const fits = await list.evaluate((el) => el.scrollWidth <= el.clientWidth);
    expect(fits).toBe(false);

    const next = page.locator("button[aria-label='Pestañas siguientes']");
    const prev = page.locator("button[aria-label='Pestañas anteriores']");
    await expect(next).toBeVisible();
    await expect(prev).toBeHidden();
    await next.click();
    await expect.poll(scrollLeft).toBeGreaterThan(100);
    await expect(prev).toBeVisible();

    // Llegar al final: la flecha siguiente desaparece y la ultima pestana queda a la vista.
    for (let i = 0; i < 4; i++) if (await next.isVisible()) await next.click({ force: true });
    await expect(next).toBeHidden();
    const lastTab = page.getByRole("tab", { name: "Mantención web" });
    await lastTab.click();
    await expect(lastTab).toHaveAttribute("aria-selected", "true");
    const [lb, wb] = await Promise.all([lastTab.boundingBox(), list.boundingBox()]);
    expect(lb && wb && lb.x >= wb.x - 1 && lb.x + lb.width <= wb.x + wb.width + 1).toBe(true);

    await prev.click();
    await expect.poll(scrollLeft).toBeLessThan(await scrollLeft().then((v) => v + 1));
  });

  test("en pantallas anchas, donde caben todas, no aparecen las flechas", async ({ page, isMobile }) => {
    test.skip(isMobile, "se verifica en escritorio");
    await page.goto("/es/servicios", { waitUntil: "networkidle" });
    await expect(page.locator("button[aria-label='Pestañas siguientes']")).toBeHidden();
    await expect(page.locator("button[aria-label='Pestañas anteriores']")).toBeHidden();
  });

  test("las secciones de contenido no van en contenedores con borde ni sombra", async ({ page }) => {
    for (const path of ["/es", "/es/precios", "/es/servicios", "/es/preguntas-frecuentes"]) {
      await page.goto(path);
      const styles = await page.evaluate(() =>
        [...document.querySelectorAll("main section.doc")].map((el) => {
          const cs = getComputedStyle(el);
          return { shadow: cs.boxShadow, border: cs.borderTopWidth, bg: cs.backgroundColor, radius: cs.borderTopLeftRadius };
        }),
      );
      expect(styles.length, path).toBeGreaterThan(0);
      for (const s of styles) expect(s, path).toEqual({ shadow: "none", border: "0px", bg: "rgba(0, 0, 0, 0)", radius: "0px" });
    }
  });
});

test.describe("hero principal", () => {
  for (const [path, texts] of [
    ["/es", ["Sin contratos largos", "Entrega garantizada", "Soporte en español", "Proyectos entregados", "Clientes satisfechos", "Entrega más rápida"]],
    ["/en", ["No long contracts", "Guaranteed delivery", "Spanish-language support", "Projects delivered", "Satisfied clients", "Fastest delivery"]],
  ] as const) {
    test(`${path}: el hero no muestra insignias ni cifras de la portada`, async ({ page }) => {
      await page.goto(path);
      const hero = page.locator("section[aria-labelledby='page-title']");
      const heroText = await hero.innerText();
      for (const t of texts) expect(heroText).not.toContain(t);
      await expect(hero.locator("dl")).toHaveCount(0);
      expect(heroText).not.toMatch(/\+10|100%/);
    });
  }
});

test.describe("menu movil como cajon", () => {
  test("la cabecera muestra idioma y tema juntos, tambien en movil, y el cajon solo lleva la navegacion", async ({ page, isMobile }) => {
    test.skip(!isMobile, "solo movil");
    await page.goto("/es", { waitUntil: "networkidle" });
    const header = page.locator("header");
    await expect(header.locator("button[data-theme-toggle]")).toBeVisible();
    await expect(header.getByRole("link", { name: "EN", exact: true })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);

    await page.getByRole("button", { name: "Menú" }).click();
    const drawer = page.locator("#mobile-nav");
    await expect(drawer).toBeVisible();
    await expect(drawer.getByRole("link", { name: "Precios" })).toBeVisible();
    await expect(drawer.getByRole("link", { name: "EN", exact: true })).toHaveCount(0);
    await expect(drawer.locator("button[data-theme-toggle]")).toHaveCount(0);
    await expect(drawer.getByRole("link", { name: "Cotizar gratis" })).toBeVisible();
  });

  test("el cajon ocupa el 80% derecho de la pantalla, con esquinas rectas, logotipo arriba y separadores, entra y sale con animacion y se cierra con X, Escape o el velo", async ({ page, isMobile }) => {
    test.skip(!isMobile, "solo movil");
    await page.goto("/es", { waitUntil: "networkidle" });
    const vw = page.viewportSize()?.width ?? 0;
    const drawer = page.locator("#mobile-nav");

    await page.getByRole("button", { name: "Menú" }).click();
    expect(await drawer.evaluate((el) => getComputedStyle(el).animationName)).toBe("drawer-in");
    await page.waitForTimeout(450);
    const box = await drawer.boundingBox();
    if (!box) throw new Error("sin caja del cajon");
    expect(box.width).toBeGreaterThanOrEqual(255);
    expect(box.width).toBeGreaterThanOrEqual(Math.min(vw * 0.8, 448) - 2);
    expect(box.width).toBeLessThanOrEqual(vw * 0.82);
    expect(await drawer.evaluate((el) => getComputedStyle(el).borderTopLeftRadius)).toBe("0px");
    await expect(drawer.getByRole("link", { name: "Acmora" }).first()).toBeVisible();
    const lis = await drawer.locator("nav > ul > li").evaluateAll((els) => els.map((el) => getComputedStyle(el).borderBottomWidth));
    expect(lis.length).toBeGreaterThanOrEqual(3);
    for (const w of lis) expect(w).toBe("1px");
    expect(await drawer.locator("nav > ul > li > a").first().evaluate((el) => parseFloat(getComputedStyle(el).fontSize))).toBeLessThanOrEqual(16);
    expect(Math.round(box.x + box.width)).toBe(vw);

    // Salida animada: primero se marca el cierre, luego se retira.
    await drawer.getByRole("button", { name: "Cerrar" }).click();
    await expect(drawer).toHaveAttribute("data-closing", "");
    await expect(drawer).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Menú" })).toBeFocused();

    await page.getByRole("button", { name: "Menú" }).click();
    await page.waitForTimeout(450);
    await page.keyboard.press("Escape");
    await expect(drawer).toHaveCount(0);

    await page.getByRole("button", { name: "Menú" }).click();
    await page.waitForTimeout(450);
    await page.mouse.click(10, 300);
    await expect(drawer).toHaveCount(0);
  });
});

test.describe("hero de la portada: azul primario, patron de software e IA y llamadas a la accion", () => {
  test("el hero usa el azul primario con un patron propio, sin la pastilla de respuesta ni el subtitulo de marca", async ({ page }) => {
    for (const [path, absent] of [
      ["/es", ["Respuesta rápida", "Respondemos en menos de 24 horas hábiles"]],
      ["/en", ["Fast reply", "We reply within 24 business hours"]],
    ] as const) {
      await page.goto(path);
      const hero = page.locator("section[aria-labelledby='page-title']");
      expect(await hero.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe("rgb(6, 69, 232)");
      await expect(hero.locator("svg.hero-pattern")).toHaveCount(1);
      await expect(hero.locator("nav")).toHaveCount(0);
      const text = await hero.innerText();
      for (const t of absent) expect(text).not.toContain(t);
      expect(text.toLowerCase()).not.toContain("acmora");
    }
  });

  test("las llamadas a la accion del hero son solicitar un servicio en un paso y hablar por WhatsApp", async ({ page }) => {
    await page.goto("/es", { waitUntil: "networkidle" });
    const hero = page.locator("section[aria-labelledby='page-title']");
    const wa = hero.getByRole("link", { name: "Hablar por WhatsApp" });
    const url = new URL((await wa.getAttribute("href")) ?? "");
    expect(url.origin + url.pathname).toBe("https://wa.me/56951730743");
    expect(url.searchParams.get("text")).toContain("Hola, vi el sitio de Acmora");

    // "Solicitar servicio" deriva a la pagina de servicios.
    const request = hero.getByRole("link", { name: "Solicitar servicio" });
    await expect(request).toHaveAttribute("href", "/es/servicios");
    await request.click();
    await expect(page).toHaveURL(/\/es\/servicios$/, { timeout: 20_000 });
    await expect(page.getByRole("tablist", { name: "Servicios disponibles" })).toBeVisible();
    await page.goBack();
    await page.goto("/en", { waitUntil: "networkidle" });
    await expect(page.locator("section[aria-labelledby='page-title']").getByRole("link", { name: "Request a service" })).toHaveAttribute("href", "/en/services");
  });

  test("el boton Cotizar gratis de la cabecera tambien abre el dialogo rapido", async ({ page, isMobile }) => {
    test.skip(isMobile, "el boton de la cabecera solo esta visible desde tablet");
    await page.goto("/es/precios", { waitUntil: "networkidle" });
    await page.locator("header").getByRole("button", { name: "Cotizar gratis" }).click();
    await expect(page.getByRole("dialog", { name: "Solicita tu cotización" })).toBeVisible();
  });

  test("el hero es accesible con la maqueta nueva en claro y oscuro", async ({ page }) => {
    test.setTimeout(60_000); // dos temas con axe bajo carga paralela
    for (const scheme of ["light", "dark"] as const) {
      await setScheme(page, scheme);
      await page.goto("/es", { waitUntil: "networkidle" });
      const results = await new AxeBuilder({ page }).exclude("[data-decorative]").include("section[aria-labelledby='page-title']").withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
      expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
    }
  });
});

test.describe("dialogo de cotizacion: pantallas pequenas, cierre superior y codigo de pais", () => {
  test("en 360 px el cuadro cabe en pantalla, el cuerpo hace scroll entre cabecera y pie fijos, y las tres acciones van en una fila", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 520 });
    await page.goto("/es/servicios/landing-page", { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Cotizar plan Básico" }).click();
    const dialog = page.getByRole("dialog", { name: "Solicita tu cotización" });
    await expect(dialog).toBeVisible();
    await page.waitForTimeout(400);
    const box = await dialog.boundingBox();
    expect(box && box.height <= 520 && box.width <= 360 && box.x >= 0).toBe(true);

    const body = dialog.locator(".quote-scroll");
    expect(await body.evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true);
    const cancel = await dialog.getByRole("button", { name: "Cancelar" }).boundingBox();
    const nextBox = await dialog.getByRole("button", { name: "Siguiente" }).boundingBox();
    if (!cancel || !nextBox) throw new Error("sin cajas de botones");
    expect(Math.abs(cancel.y - nextBox.y)).toBeLessThan(2);
    expect(nextBox.x + nextBox.width).toBeLessThanOrEqual(360);
    // Cabecera y pie siguen a la vista aunque el cuerpo se desplace.
    await body.evaluate((el) => el.scrollTo({ top: el.scrollHeight }));
    await expect(dialog.getByRole("heading", { name: "Solicita tu cotización" })).toBeInViewport();
    await expect(dialog.getByRole("button", { name: "Siguiente" })).toBeInViewport();

    // Paso 2: Atras, correo y WhatsApp tambien en una sola fila, con el cuerpo desplazable.
    await dialog.getByLabel(/Nombre completo o empresa/).fill("Ana Pérez");
    await dialog.getByLabel(/Teléfono/).fill("951730743");
    await dialog.getByLabel(/Cuéntanos sobre el proyecto/).fill("Necesito una landing para mi tienda.");
    await dialog.getByRole("checkbox", { name: /He leído y acepto/ }).check();
    await dialog.getByRole("button", { name: "Siguiente" }).click();
    await expect(dialog.getByTestId("quote-step-2")).toBeVisible();
    const back = await dialog.getByRole("button", { name: "Atrás" }).boundingBox();
    const mail = await dialog.getByRole("button", { name: "Enviar por correo" }).boundingBox();
    const wa = await dialog.getByRole("button", { name: "Enviar por WhatsApp" }).boundingBox();
    if (!back || !mail || !wa) throw new Error("sin cajas de botones del paso 2");
    expect(Math.abs(back.y - mail.y)).toBeLessThan(2);
    expect(Math.abs(mail.y - wa.y)).toBeLessThan(2);
    expect(wa.x + wa.width).toBeLessThanOrEqual(360);
    expect(back.x).toBeGreaterThanOrEqual(0);
    await body.evaluate((el) => el.scrollTo({ top: el.scrollHeight }));
    await expect(dialog.getByRole("button", { name: "Enviar por WhatsApp" })).toBeInViewport();
    await expect(dialog.getByText("Tus datos", { exact: true })).toBeInViewport();
  });

  test("la X de arriba cierra el cuadro, tambien al estilo Google", async ({ page }) => {
    await page.goto("/es/servicios/landing-page", { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Cotizar plan Básico" }).click();
    const dialog = page.getByRole("dialog", { name: "Solicita tu cotización" });
    const x = dialog.locator("header").getByRole("button");
    await expect(x).toHaveAttribute("title", "Cerrar el cuadro de cotización");
    const hb = await dialog.locator("header").boundingBox();
    const xb = await x.boundingBox();
    expect(hb && xb && xb.x + xb.width > hb.x + hb.width - 40).toBe(true);
    await x.click();
    await expect(dialog).toBeHidden();
  });

  test("el codigo de pais muestra banderas y se busca por numero, codigo ISO o nombre", async ({ page }) => {
    await page.goto("/es/servicios/landing-page", { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Cotizar plan Básico" }).click();
    const dialog = page.getByRole("dialog", { name: "Solicita tu cotización" });
    const country = dialog.getByRole("combobox", { name: "Código de país" });
    await expect(country).toHaveValue("+56");
    await expect(dialog.locator("input[name='phoneCountry']")).toHaveValue("+56");
    await expect(dialog.locator("svg.h-4.w-6").first()).toBeVisible();

    await country.click();
    const list = dialog.getByRole("listbox");
    await expect(list.getByRole("option")).toHaveCount(COUNTRIES.length);
    expect(await list.locator("svg").count()).toBe(COUNTRIES.length);

    // Por numero.
    await country.fill("54");
    await expect(list.getByRole("option")).toHaveText([/Argentina\s*\+54/]);
    // Por codigo ISO.
    await country.fill("pe");
    await expect(list.getByRole("option").first()).toContainText("Perú");
    // Por nombre sin tildes.
    await country.fill("mexi");
    await expect(list.getByRole("option")).toHaveText([/México\s*\+52/]);
    // Sin resultados.
    await country.fill("zzz");
    await expect(list.getByText("Sin resultados")).toBeVisible();

    // Escape cierra solo la lista, no el dialogo.
    await page.keyboard.press("Escape");
    await expect(list).toBeHidden();
    await expect(dialog).toBeVisible();
    await expect(country).toHaveValue("+56");

    // Elegir con teclado y con clic.
    await country.click();
    await country.fill("per");
    await page.keyboard.press("Enter");
    await expect(country).toHaveValue("+51");
    await expect(dialog.locator("input[name='phoneCountry']")).toHaveValue("+51");
    await country.click();
    await dialog.getByRole("listbox").getByRole("option", { name: /Colombia/ }).click();
    await expect(dialog.locator("input[name='phoneCountry']")).toHaveValue("+57");
  });

  test("el prefijo elegido viaja en el mensaje de correo y se muestran los nombres en ingles en /en", async ({ page }) => {
    await page.addInitScript(() => {
      (window as unknown as { __opened: string[] }).__opened = [];
      document.addEventListener(
        "click",
        (e) => {
          const a = (e.target as Element | null)?.closest("a[href]") as HTMLAnchorElement | null;
          if (a && a.href.startsWith("mailto:")) {
            (window as unknown as { __opened: string[] }).__opened.push(a.href);
            e.preventDefault();
          }
        },
        true,
      );
    });
    await page.goto("/en/services/landing-page", { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Quote Basic plan" }).click();
    const dialog = page.getByRole("dialog", { name: "Request your quote" });
    const country = dialog.getByRole("combobox", { name: "Country code" });
    await country.click();
    await country.fill("peru");
    await expect(dialog.getByRole("listbox").getByRole("option")).toHaveText([/Peru\s*\+51/]);
    await page.keyboard.press("Enter");
    await dialog.getByLabel(/Full name or company/).fill("Ana Perez");
    await dialog.getByLabel(/^Phone/).fill("912345678");
    await dialog.getByLabel(/Tell us about the project/).fill("I need a landing page for my store.");
    await dialog.getByRole("checkbox", { name: /I have read and accept/ }).check();
    await dialog.getByRole("button", { name: "Next" }).click();
    await dialog.getByRole("button", { name: "Send by email" }).click();
    const opened = await page.evaluate(() => (window as unknown as { __opened: string[] }).__opened);
    const body = new URL(opened[0] ?? "").searchParams.get("body") ?? "";
    expect(body).toContain("Phone: +51 912345678");
  });
});

test.describe("hero animado con motion", () => {
  test("las tres maquetas cuentan su historia: tienda con pago, reporte que llega a 100 y planes que abren WhatsApp", async ({ page, isMobile }) => {
    test.skip(isMobile, "la maqueta se muestra desde pantallas anchas");
    test.setTimeout(90_000);
    await page.goto("/es", { waitUntil: "networkidle" });
    const hero = page.locator("section[aria-labelledby='page-title']");
    const stage = hero.locator("[aria-hidden='true']").filter({ has: page.locator("text=tutienda") }).first();
    await expect(stage).toBeVisible();
    // Notebook: tienda en linea.
    await expect(stage.getByText("Audífonos Pro")).toBeVisible();
    // Tablet: se pega el dominio, se analiza y los cuatro medidores terminan en 100.
    await expect(stage.getByText("Analiza tu sitio")).toBeVisible();
    await expect(stage.getByText("Accesibilidad")).toBeVisible({ timeout: 20_000 });
    await expect.poll(async () => await stage.getByText("100", { exact: true }).count(), { timeout: 12_000 }).toBe(4);
    // Celular: baja a los planes, elige uno y abre WhatsApp con el mensaje.
    await expect(stage.getByText("Plan elegido")).toBeVisible({ timeout: 20_000 });
    await expect(stage.getByText("Hola, quiero el plan Estándar").first()).toBeVisible({ timeout: 20_000 });
    // Notebook: el pago termina con la confirmacion, y la historia vuelve a empezar.
    await expect(stage.getByText("¡Pago exitoso!")).toBeVisible({ timeout: 25_000 });
    await expect(stage.getByText("Pedido #2481")).toBeVisible();
    await expect(stage.getByText("Audífonos Pro")).toBeVisible({ timeout: 25_000 });
  });

  test("con movimiento reducido la maqueta queda quieta: sin cursor, medidores en 100 y la historia ya completa", async ({ page, isMobile }) => {
    test.skip(isMobile, "la maqueta se muestra desde pantallas anchas");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/es", { waitUntil: "networkidle" });
    const stage = page.locator("section[aria-labelledby='page-title'] [aria-hidden='true']").filter({ has: page.locator("text=tutienda") }).first();
    await expect(stage.getByText("100", { exact: true })).toHaveCount(4);
    await expect(stage.getByText("¡Pago exitoso!")).toBeVisible();
    await expect(stage.getByText("Hola, quiero el plan Estándar").first()).toBeVisible();
    await expect(stage.locator("path[fill='#202124']")).toHaveCount(0);
  });

  test("en ingles la maqueta usa los textos en ingles", async ({ page, isMobile }) => {
    test.skip(isMobile, "la maqueta se muestra desde pantallas anchas");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/en", { waitUntil: "networkidle" });
    const stage = page.locator("section[aria-labelledby='page-title'] [aria-hidden='true']").filter({ has: page.locator("text=yourstore") }).first();
    await expect(stage.getByText("Payment successful!")).toBeVisible();
    await expect(stage.getByText("Analyze your site")).toBeVisible();
    await expect(stage.getByText("Hi, I want the Standard plan").first()).toBeVisible();
  });
});

test.describe("selector de servicio con flecha animada", () => {
  test("la flecha esta centrada, gira 180 grados al abrir y cerrar, y la lista elige con mouse y teclado", async ({ page }) => {
    await page.goto("/es/servicios/landing-page", { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Cotizar plan Básico" }).click();
    const dialog = page.getByRole("dialog", { name: "Solicita tu cotización" });
    const select = dialog.getByRole("combobox", { name: /Servicio/ });
    const arrow = select.locator("svg");
    const rot = () => arrow.evaluate((el) => getComputedStyle(el).rotate);
    await expect(select).toContainText("Landing Page");
    expect(await rot()).toBe("none");

    // Alineada: el centro de la flecha coincide con el centro del campo.
    const [sb, ab] = await Promise.all([select.boundingBox(), arrow.boundingBox()]);
    expect(sb && ab && Math.abs(sb.y + sb.height / 2 - (ab.y + ab.height / 2)) <= 1.5).toBe(true);
    expect(sb && ab && sb.x + sb.width - (ab.x + ab.width) <= 16).toBe(true);

    await select.click();
    await expect(select).toHaveAttribute("aria-expanded", "true");
    await expect.poll(rot).toBe("180deg");
    const list = dialog.getByRole("listbox", { name: /Servicio/ });
    await expect(list.getByRole("option")).toHaveCount(6);

    // Cerrar con Escape: gira de vuelta y el dialogo sigue abierto.
    await page.keyboard.press("Escape");
    await expect(list).toBeHidden();
    await expect.poll(rot).toBe("none");
    await expect(dialog).toBeVisible();

    // Elegir con teclado y con clic.
    await select.focus();
    await page.keyboard.press("ArrowDown");
    await expect(select).toHaveAttribute("aria-expanded", "true");
    await page.keyboard.press("ArrowDown");
    await expect(select).toHaveAttribute("aria-activedescendant", /-2$/);
    await page.keyboard.press("Enter");
    await expect(select).toContainText("Página Web Multipágina");
    await expect(dialog.locator("input[name='service']")).toHaveValue("multipagina");
    await select.click();
    await list.getByRole("option", { name: "CRM Personalizado" }).click();
    await expect(dialog.locator("input[name='service']")).toHaveValue("crm");
    await expect(select).toHaveAttribute("aria-expanded", "false");
    await expect.poll(rot).toBe("none");
  });

  test("tambien en el formulario de contacto y con la flecha del codigo de pais animada", async ({ page }) => {
    await page.goto("/es/contacto", { waitUntil: "networkidle" });
    const select = page.getByRole("combobox", { name: /Servicio/ });
    await select.click();
    await page.getByRole("listbox", { name: /servicio/i }).getByRole("option", { name: "CRM Personalizado" }).click();
    await expect(page.locator("input[name='service']")).toHaveValue("crm");

    const country = page.getByRole("combobox", { name: "Código de país" });
    const arrow = page.locator("main form [role='combobox'][aria-controls] ~ svg").first();
    await country.click();
    await expect(arrow).toBeVisible();
    await expect.poll(() => arrow.evaluate((el) => getComputedStyle(el).rotate)).toBe("180deg");
    await page.keyboard.press("Escape");
    await expect.poll(() => arrow.evaluate((el) => getComputedStyle(el).rotate)).toBe("none");
  });
});

test.describe("etiqueta arriba cuando el campo tiene error", () => {
  test("en el dialogo, los campos con error suben la etiqueta con la misma animacion que al enfocar y la bajan al corregirse", async ({ page }) => {
    await page.goto("/es/servicios/landing-page", { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Cotizar plan Básico" }).click();
    const dialog = page.getByRole("dialog", { name: "Solicita tu cotización" });
    const phoneLabel = dialog.locator("label", { hasText: "Teléfono" });
    const messageLabel = dialog.locator("label", { hasText: "Cuéntanos sobre el proyecto" });
    const look = (loc: ReturnType<typeof dialog.locator>) => loc.evaluate((el) => ({ scale: getComputedStyle(el).scale, top: getComputedStyle(el).top, color: getComputedStyle(el).color, tr: getComputedStyle(el).transitionProperty }));

    // En reposo y vacios: la etiqueta descansa dentro del campo.
    expect((await look(phoneLabel)).scale).toBe("none");
    await dialog.getByLabel(/Nombre completo o empresa/).fill("Ana");
    await dialog.getByRole("button", { name: "Siguiente" }).click();
    await expect(dialog.getByLabel(/Teléfono/)).toBeFocused();

    for (const label of [phoneLabel, messageLabel]) {
      await expect.poll(async () => (await look(label)).scale).toBe("0.75");
      const l = await look(label);
      expect(l.top).toBe("0px");
      expect(l.color).toBe("rgb(197, 34, 31)");
      expect(l.tr).toContain("transform");
    }
    // El campo correcto (nombre, con texto) sigue arriba y el vacio sin error no se mueve: el prefijo siempre esta arriba.
    await dialog.getByLabel(/Teléfono/).fill("951730743");
    await dialog.getByLabel(/Cuéntanos sobre el proyecto/).fill("Necesito una landing para mi tienda.");
    await dialog.getByRole("checkbox", { name: /He leído y acepto/ }).check();
    await dialog.getByRole("button", { name: "Siguiente" }).click();
    await dialog.getByRole("button", { name: "Enviar por correo" }).click();
    await expect(dialog.getByRole("alert")).toHaveCount(0);
    // Tras enviar cambia el titulo (y con el su nombre accesible): se busca por rol.
    await expect(page.getByRole("dialog").getByRole("status")).toContainText("Abrimos tu aplicación de correo");
  });

  test("en el formulario de contacto el campo vacio con error tambien sube la etiqueta", async ({ page }) => {
    await page.goto("/es/contacto", { waitUntil: "networkidle" });
    const form = page.locator("main form");
    const phoneLabel = form.locator("label", { hasText: "Teléfono" });
    expect(await phoneLabel.evaluate((el) => getComputedStyle(el).scale)).toBe("none");
    await form.getByLabel(/Nombre completo o empresa/).fill("Ana");
    await form.getByRole("button", { name: "Enviar por correo" }).click();
    await expect(form.getByLabel(/Teléfono/)).toBeFocused();
    await expect.poll(() => phoneLabel.evaluate((el) => getComputedStyle(el).scale)).toBe("0.75");
    // El hueco del borde se abre para la etiqueta elevada (leyenda con ancho completo).
    const legendWidth = await form.getByLabel(/Teléfono/).locator("xpath=following-sibling::fieldset/legend").evaluate((el) => el.getBoundingClientRect().width);
    expect(legendWidth).toBeGreaterThan(40);
  });
});

test.describe("codigos de pais", () => {
  test("la lista incluye los paises mas populares con bandera, codigos unicos, y se busca por numero o nombre en ambos idiomas", async ({ page }) => {
    expect(new Set(COUNTRIES.map((c) => c.code)).size).toBe(COUNTRIES.length);
    expect(COUNTRIES.length).toBeGreaterThanOrEqual(35);
    await page.goto("/en/contact", { waitUntil: "networkidle" });
    const country = page.getByRole("combobox", { name: "Country code" });
    await country.click();
    const list = page.getByRole("listbox", { name: "Country code" });
    for (const name of ["Chile", "Argentina", "Brazil", "United States and Canada", "Spain", "United Kingdom", "Germany", "China", "India", "Australia", "Costa Rica", "Panama"]) {
      await expect(list.getByRole("option", { name: new RegExp(name) })).toHaveCount(1);
    }
    await country.fill("44");
    await expect(list.getByRole("option")).toHaveText([/United Kingdom\s*\+44/]);
    await country.fill("united");
    await expect(list.getByRole("option")).toHaveCount(3);
    await country.fill("+49");
    await expect(list.getByRole("option")).toHaveText([/Germany\s*\+49/]);
    await page.keyboard.press("Enter");
    await expect(page.locator("input[name='phoneCountry']")).toHaveValue("+49");
    await expect(country).toHaveValue("+49");
  });
});

test.describe("pagina de proyectos", () => {
  test("el menu lleva a Proyectos, que lista los proyectos del mas reciente al mas antiguo con su portada, fecha, descripcion y enlace", async ({ page, isMobile }) => {
    test.skip(isMobile, "el enlace de la cabecera solo esta visible en escritorio");
    await page.goto("/es", { waitUntil: "networkidle" });
    await page.locator("header nav").getByRole("link", { name: "Proyectos" }).click();
    await expect(page).toHaveURL(/\/es\/proyectos$/);
    await expect(page.locator("header nav").getByRole("link", { name: "Proyectos" })).toHaveAttribute("aria-current", "page");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Proyectos recientes");

    const cards = page.locator("main ul > li", { has: page.locator("img") });
    await expect(cards).toHaveCount(4);
    const titles = await cards.getByRole("heading", { level: 3 }).allTextContents();
    expect(titles[0]).toContain("Sitio de presentación personal");
    expect(titles.at(-1)).toContain("ACTECCU");
    const dates = await cards.locator("time").evaluateAll((els) => els.map((e) => e.getAttribute("datetime") ?? ""));
    expect(dates).toEqual([...dates].sort((a, b) => b.localeCompare(a)));

    const demane = cards.filter({ hasText: "Mane Fernández" });
    await expect(demane.locator("img")).toBeVisible();
    await expect(demane.locator("time")).toHaveText(/2026/);
    await expect(demane.getByText("En producción")).toBeVisible();
    const link = demane.getByRole("link", { name: "Ver proyecto" });
    await expect(link).toHaveAttribute("href", "https://demane.cl/");
    await expect(link).toHaveAttribute("target", "_blank");
    await expect(link).toHaveAttribute("rel", /noopener/);
    await expect(link).toHaveAttribute("title", /Abrir el proyecto .* en una pestaña nueva/);
    // Las imagenes cargaron de verdad.
    await page.locator("main img").last().scrollIntoViewIfNeeded();
    await expect
      .poll(() => page.locator("main img").evaluateAll((els) => els.every((e) => (e as HTMLImageElement).complete && (e as HTMLImageElement).naturalWidth > 0)))
      .toBe(true);
  });

  test("los filtros por estado muestran solo produccion o demo y avisan cuantos hay", async ({ page }) => {
    await page.goto("/es/proyectos", { waitUntil: "networkidle" });
    const cards = page.locator("main ul > li", { has: page.locator("img") });
    await expect(page.getByText("Mostrando 4 proyectos")).toBeVisible();
    await page.getByRole("button", { name: /^En producción/ }).click();
    await expect(cards).toHaveCount(3);
    await expect(page.getByText("Mostrando 3 proyectos")).toBeVisible();
    await expect(page.getByRole("button", { name: /^En producción/ })).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: /^Demo/ }).click();
    await expect(cards).toHaveCount(1);
    await expect(cards.first()).toContainText("(demo)");
    await page.getByRole("button", { name: /^Todos/ }).click();
    await expect(cards).toHaveCount(4);
  });

  test("la tarjeta es de estilo Google: portada 16:9, esquinas de 16 px, sube la elevacion al pasar el cursor y es accesible en claro y oscuro", async ({ page, isMobile }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/en/projects", { waitUntil: "networkidle" });
    const card = page.locator("main ul > li", { has: page.locator("img") }).first();
    expect(await card.evaluate((el) => getComputedStyle(el).borderTopLeftRadius)).toBe("16px");
    const ib = await card.locator("img").boundingBox();
    expect(ib && Math.abs(ib.width / ib.height - 16 / 9) < 0.05).toBe(true);
    await expect(page.getByText("Showing 4 projects")).toBeVisible();
    if (!isMobile) {
      const before = await card.evaluate((el) => getComputedStyle(el).boxShadow);
      await card.hover();
      await expect.poll(() => card.evaluate((el) => getComputedStyle(el).boxShadow)).not.toBe(before);
    }
    for (const scheme of ["light", "dark"] as const) {
      await setScheme(page, scheme);
      await page.goto("/en/projects", { waitUntil: "networkidle" });
      const results = await new AxeBuilder({ page }).exclude("[data-decorative]").withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
      expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
    }
  });

  test("el sitemap, el texto plano y los datos estructurados incluyen los proyectos", async ({ page, request }) => {
    expect(await (await request.get("/sitemap.xml")).text()).toContain("/es/proyectos");
    const md = await (await request.get("/raw/es/projects.md")).text();
    for (const t of ["Procanje", "https://demane.cl/", "ACTECCU", "Sitio de presentación personal"]) expect(md).toContain(t);
    await page.goto("/es/proyectos");
    const ld = JSON.stringify(await page.locator('script[type="application/ld+json"]').allTextContents());
    expect(ld).toContain("CreativeWork");
    expect(ld).toContain("datePublished");
  });
});

test.describe("lista de paises: scroll sin cerrar", () => {
  test("pulsar el borde o la barra de la lista, o desplazarla, no la cierra y se puede seguir buscando", async ({ page, isMobile }) => {
    test.skip(isMobile, "se verifica con puntero en escritorio");
    await page.goto("/es/contacto", { waitUntil: "networkidle" });
    const country = page.getByRole("combobox", { name: "Código de país" });
    await country.click();
    const list = page.getByRole("listbox", { name: "Código de país" });
    await expect(list).toBeVisible();
    expect(await list.evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true);

    // Un mousedown sobre la propia lista (no sobre una opcion), como el que genera la barra de desplazamiento, no cancela el foco.
    const prevented = await list.evaluate((el) => {
      const e = new MouseEvent("mousedown", { bubbles: true, cancelable: true });
      el.dispatchEvent(e);
      return e.defaultPrevented;
    });
    expect(prevented).toBe(true);
    // Clic real en el relleno superior de la lista (fuera de las opciones).
    const box = await list.boundingBox();
    if (!box) throw new Error("sin caja de la lista");
    await page.mouse.click(box.x + box.width / 2, box.y + 1);
    await expect(list).toBeVisible();
    await expect(country).toBeFocused();

    // Desplazar con la rueda tampoco la cierra.
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.wheel(0, 400);
    await expect.poll(() => list.evaluate((el) => el.scrollTop)).toBeGreaterThan(100);
    await expect(list).toBeVisible();

    // Sigue funcionando: buscar y elegir.
    await country.fill("arg");
    await page.keyboard.press("Enter");
    await expect(page.locator("input[name='phoneCountry']")).toHaveValue("+54");
  });
});

test.describe("barra de progreso superior de navegacion", () => {
  const scaleOf = (loc: ReturnType<Page["locator"]>) => loc.evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).a);

  test("al navegar aparece pegada al borde superior, avanza mientras carga y se completa y desaparece al llegar", async ({ page }) => {
    await page.goto("/es", { waitUntil: "networkidle" });
    const bar = page.locator("[data-nav-progress]");
    await expect(bar).toHaveAttribute("data-state", "idle");
    expect(await bar.evaluate((el) => getComputedStyle(el).opacity)).toBe("0");

    // Se demora la pagina siguiente para poder observar la barra en curso.
    await page.route(/\/es\/precios/, async (route) => {
      await new Promise((r) => setTimeout(r, 1800));
      await route.continue();
    });
    await page.locator("footer").getByRole("link", { name: "Precios" }).click();
    await expect(bar).toHaveAttribute("data-state", "loading");
    // Geometria de diseno (la escala la anima): fija en el borde superior, de ancho completo y 3 px de alto.
    const geo = await bar.evaluate((el) => ({ pos: getComputedStyle(el).position, top: getComputedStyle(el).top, h: (el as HTMLElement).offsetHeight, w: (el as HTMLElement).offsetWidth }));
    expect(geo).toEqual({ pos: "fixed", top: "0px", h: 3, w: page.viewportSize()?.width ?? 0 });
    expect(await bar.evaluate((el) => getComputedStyle(el).opacity)).toBe("1");

    // Lo que se ve: ancho real en pantalla mayor que cero y sin otra escala (la propiedad `scale`) que lo anule.
    expect(await bar.evaluate((el) => ({ scale: getComputedStyle(el).scale, shown: el.getBoundingClientRect().width }))).toMatchObject({ scale: "none" });
    expect(await bar.evaluate((el) => el.getBoundingClientRect().width)).toBeGreaterThan(20);
    const first = await scaleOf(bar);
    await page.waitForTimeout(900);
    const second = await scaleOf(bar);
    expect(second).toBeGreaterThan(first);
    expect(second).toBeLessThan(0.95);

    await expect(page).toHaveURL(/\/es\/precios$/, { timeout: 20_000 });
    await expect(bar).toHaveAttribute("data-state", "idle", { timeout: 5000 });
    expect(await bar.evaluate((el) => getComputedStyle(el).opacity)).toBe("0");
  });

  test("tambien se muestra al cambiar de idioma y al volver con el boton atras", async ({ page }) => {
    await page.goto("/es/precios", { waitUntil: "networkidle" });
    const bar = page.locator("[data-nav-progress]");
    await page.route(/\/en\/pricing/, async (route) => {
      await new Promise((r) => setTimeout(r, 1500));
      await route.continue();
    });
    await page.locator("header").getByRole("link", { name: "EN", exact: true }).click();
    await expect(bar).toHaveAttribute("data-state", "loading");
    await expect(page).toHaveURL(/\/en\/pricing$/, { timeout: 20_000 });
    await expect(bar).toHaveAttribute("data-state", "idle", { timeout: 5000 });
    await page.unroute(/\/en\/pricing/);

    await page.goBack();
    await expect(page).toHaveURL(/\/es\/precios$/, { timeout: 20_000 });
    await expect(bar).toHaveAttribute("data-state", "idle", { timeout: 5000 });
  });

  test("no aparece cuando no hay carga: mismo destino, ancla o enlace externo", async ({ page }) => {
    await page.goto("/es/precios", { waitUntil: "networkidle" });
    const bar = page.locator("[data-nav-progress]");
    await page.locator("footer").getByRole("link", { name: "Precios" }).click();
    await page.waitForTimeout(400);
    await expect(bar).toHaveAttribute("data-state", "idle");
    // Cambiar de pestana de precios solo cambia el hash.
    await page.getByRole("tab", { name: "CRM Personalizado" }).click();
    await page.waitForTimeout(300);
    await expect(bar).toHaveAttribute("data-state", "idle");
    // El enlace de WhatsApp abre otra pestana: la barra no se activa.
    await page.goto("/es", { waitUntil: "networkidle" });
    const wa = page.locator("section[aria-labelledby='page-title']").getByRole("link", { name: "Hablar por WhatsApp" });
    await wa.evaluate((el) => el.addEventListener("click", (e) => e.preventDefault(), { once: true }));
    await wa.click();
    await expect(bar).toHaveAttribute("data-state", "idle");
  });
});

test.describe("validacion en vivo y lista del selector", () => {
  test("en el formulario de contacto los errores aparecen mientras se escribe y se quitan al cumplirse, sin esperar a los botones", async ({ page }) => {
    await page.goto("/es/contacto", { waitUntil: "networkidle" });
    const form = page.locator("main form");
    const err = (id: string) => form.locator("[id$='-" + id + "-error']");
    const phone = form.getByLabel(/Teléfono/);
    await phone.pressSequentially("123");
    await expect(err("phone")).toBeVisible();
    await phone.pressSequentially("456789");
    await expect(err("phone")).toHaveCount(0);
    await phone.fill("12");
    await expect(err("phone")).toBeVisible();

    const name = form.getByLabel(/Nombre completo o empresa/);
    await name.pressSequentially("A");
    await expect(err("name")).toBeVisible();
    await name.pressSequentially("na");
    await expect(err("name")).toHaveCount(0);

    // La casilla obligatoria avisa al marcarla y desmarcarla; al marcarla, el aviso desaparece.
    const consent = form.getByRole("checkbox", { name: /He leído y acepto/ });
    await consent.check();
    await consent.uncheck();
    await expect(form.locator("[id$='-consent-error']")).toBeVisible();
    await consent.check();
    await expect(form.locator("[id$='-consent-error']")).toHaveCount(0);
  });

  test("en el dialogo, el error de cada campo se quita al cumplirse, incluido el telefono y el servicio", async ({ page }) => {
    await page.goto("/es/servicios/landing-page", { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Cotizar plan Básico" }).click();
    const dialog = page.getByRole("dialog", { name: "Solicita tu cotización" });
    await dialog.getByRole("button", { name: "Siguiente" }).click();
    const err = (id: string) => dialog.locator("[id$='-" + id + "-error']");
    await expect(err("name")).toBeVisible();
    await expect(err("phone")).toBeVisible();
    await expect(err("message")).toBeVisible();

    await dialog.getByLabel(/Nombre completo o empresa/).fill("Ana Pérez");
    await expect(err("name")).toHaveCount(0);
    await dialog.getByLabel(/Teléfono/).fill("12345");
    await expect(err("phone")).toBeVisible();
    await dialog.getByLabel(/Teléfono/).fill("951730743");
    await expect(err("phone")).toHaveCount(0);
    await dialog.getByLabel(/Cuéntanos sobre el proyecto/).fill("Corto");
    await expect(err("message")).toBeVisible();
    await dialog.getByLabel(/Cuéntanos sobre el proyecto/).fill("Necesito una landing para mi tienda.");
    await expect(err("message")).toHaveCount(0);
    await expect(dialog.getByRole("alert")).toHaveCount(0);
  });

  test("la lista del selector de servicio queda por encima del formulario y muestra todas las opciones, tambien con poco alto", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 520 });
    await page.goto("/es/servicios/landing-page", { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Cotizar plan Básico" }).click();
    const dialog = page.getByRole("dialog", { name: "Solicita tu cotización" });
    await dialog.getByRole("combobox", { name: /Servicio/ }).click();
    const list = dialog.getByRole("listbox", { name: /Servicio/ });
    await expect(list).toBeVisible();
    expect(await list.evaluate((el) => getComputedStyle(el).position)).toBe("fixed");
    // Todas las opciones se pueden alcanzar y la ultima no queda tapada por el contenedor del formulario.
    const last = list.getByRole("option").last();
    await last.scrollIntoViewIfNeeded();
    const top = await page.evaluate(([l, b]) => {
      const el = document.elementFromPoint(l, b);
      return el?.closest("[role='option']")?.textContent ?? "";
    }, await last.boundingBox().then((b) => [(b?.x ?? 0) + (b?.width ?? 0) / 2, (b?.y ?? 0) + (b?.height ?? 0) / 2] as [number, number]));
    expect(top).toContain("Otro");
    const [lb, vb] = [await list.boundingBox(), page.viewportSize()];
    expect(lb && vb && lb.y >= 0 && lb.y + lb.height <= vb.height).toBe(true);
    await last.click();
    await expect(dialog.locator("input[name='service']")).toHaveValue("otro");
  });
});

test.describe("lista de servicios del desplegable y del cajon movil", () => {
  test("en el desplegable de escritorio los servicios se listan sin titulos de grupo, en dos columnas", async ({ page, isMobile }) => {
    test.skip(isMobile, "el desplegable de escritorio no se muestra en movil");
    await page.goto("/es");
    await page.locator("header nav").getByRole("button", { name: "Servicios" }).click();
    const panel = page.locator("#services-panel-bar");
    await expect(panel).toBeVisible();
    const links = panel.locator("ul > li > a");
    await expect(links).toHaveCount(4);
    const xs = await links.evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().x)));
    expect(new Set(xs).size).toBe(2);
    await expect(panel.locator("p.text-lg")).toHaveCount(0);
  });

  test("en el cajon movil los servicios van en una sola columna, hacia abajo, y el cajon mide como maximo el 40% desde tablet", async ({ page }) => {
    for (const [w, h] of [[390, 800], [820, 1000]] as const) {
      await page.setViewportSize({ width: w, height: h });
      await page.goto("/es", { waitUntil: "networkidle" });
      await page.getByRole("button", { name: "Menú" }).click();
      const drawer = page.locator("#mobile-nav");
      await expect(drawer).toBeVisible();
      await drawer.getByRole("button", { name: "Servicios" }).click();
      const links = drawer.locator("#services-panel-stack ul > li > a");
      await expect(links).toHaveCount(4);
      const boxes = await links.evaluateAll((els) => els.map((e) => ({ x: Math.round(e.getBoundingClientRect().x), y: Math.round(e.getBoundingClientRect().y) })));
      expect(new Set(boxes.map((b) => b.x)).size).toBe(1);
      expect(boxes.every((b, i) => i === 0 || b.y > (boxes[i - 1]?.y ?? 0))).toBe(true);
      await page.waitForTimeout(400);
      const box = await drawer.boundingBox();
      if (!box) throw new Error("sin caja del cajon");
      if (w >= 768) expect(box.width).toBeLessThanOrEqual(w * 0.4 + 2);
      else expect(box.width).toBeGreaterThanOrEqual(w * 0.8 - 2);
      await drawer.getByRole("button", { name: "Cerrar" }).click();
      await expect(drawer).toHaveCount(0);
    }
  });
});

test.describe("boton Solicitar servicio del hero: hover", () => {
  for (const scheme of ["light", "dark"] as const) {
    test(`en tema ${scheme} el hover es un blanco apenas mas opaco, no el azul oscuro del tema`, async ({ page, isMobile }) => {
      test.skip(isMobile, "el hover con mouse se verifica en escritorio");
      await setScheme(page, scheme);
      await page.goto("/es", { waitUntil: "networkidle" });
      const btn = page.locator("section[aria-labelledby='page-title']").getByRole("link", { name: "Solicitar servicio" });
      expect(await btn.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe("rgb(255, 255, 255)");
      await btn.hover();
      await expect.poll(() => btn.evaluate((el) => getComputedStyle(el).backgroundColor)).toMatch(/^(rgba\(255, 255, 255, 0\.9\)|color\(srgb 1 1 1 \/ 0\.9\)|oklab\(0\.99\d* [-\d.e]+ [-\d.e]+ \/ 0\.9\))$/);
      // El texto sigue siendo el azul de marca, legible sobre el blanco.
      expect(await btn.evaluate((el) => getComputedStyle(el).color)).toBe("rgb(6, 69, 232)");
    });
  }
});

test.describe("bordes en modo oscuro", () => {
  test("las tarjetas y divisores usan un borde apenas mas claro que antes (#484b50 y #6a6e73)", async ({ page }) => {
    await setScheme(page, "dark");
    await page.goto("/es/servicios/landing-page", { waitUntil: "networkidle" });
    const card = page.locator("main ul > li", { has: page.getByRole("heading", { level: 3 }) }).first();
    // En oscuro la tarjeta se delimita con un anillo de 1 px del color de borde.
    expect(await card.evaluate((el) => getComputedStyle(el).boxShadow)).toContain("rgb(72, 75, 80)");
    const tokens = await page.evaluate(() => {
      const probe = document.createElement("div");
      document.body.append(probe);
      const read = (v: string) => {
        probe.style.color = `var(${v})`;
        return getComputedStyle(probe).color;
      };
      const out = { line: read("--color-line"), strong: read("--color-line-strong") };
      probe.remove();
      return out;
    });
    expect(tokens).toEqual({ line: "rgb(72, 75, 80)", strong: "rgb(106, 110, 115)" });
    // Y en claro no cambia.
    await setScheme(page, "light");
    await page.goto("/es/servicios/landing-page", { waitUntil: "networkidle" });
    expect(await page.evaluate(() => {
      const p = document.createElement("div");
      document.body.append(p);
      p.style.color = "var(--color-line)";
      const c = getComputedStyle(p).color;
      p.remove();
      return c;
    })).toBe("rgb(218, 220, 224)");
  });
});

test.describe("cotizacion en dos pasos: IVA incluido, soporte opcional y codigo fuente aparte", () => {
  const captureLinks = (page: Page) =>
    page.addInitScript(() => {
      (window as unknown as { __opened: string[] }).__opened = [];
      document.addEventListener(
        "click",
        (e) => {
          const a = (e.target as Element | null)?.closest("a[href]") as HTMLAnchorElement | null;
          if (a && /^(mailto:|https:\/\/wa\.me\/)/.test(a.href)) {
            (window as unknown as { __opened: string[] }).__opened.push(a.href);
            e.preventDefault();
          }
        },
        true,
      );
    });

  test("el paso 2 muestra el detalle con IVA, el soporte es opcional (con ayuda y periodos) y el total se desglosa en neto e IVA", async ({ page }) => {
    await captureLinks(page);
    await page.goto("/es/servicios/landing-page", { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Cotizar plan Básico" }).click();
    const dialog = page.getByRole("dialog", { name: "Solicita tu cotización" });
    await dialog.getByLabel(/Nombre completo o empresa/).fill("Ana Pérez");
    await dialog.getByLabel(/Teléfono/).fill("951730743");
    await dialog.getByLabel(/Cuéntanos sobre el proyecto/).fill("Necesito una landing para mi tienda.");
    await dialog.getByRole("checkbox", { name: /He leído y acepto/ }).check();
    await dialog.getByRole("button", { name: "Siguiente" }).click();

    const step = dialog.getByTestId("quote-step-2");
    await expect(step).toBeVisible();
    await expect(dialog.getByText("Paso 2 de 2 · Cotización")).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Siguiente" })).toHaveCount(0);
    await expect(dialog.getByRole("button", { name: "Enviar por correo" })).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Enviar por WhatsApp" })).toBeVisible();
    await expect(step).toContainText("Ana Pérez");
    await expect(step).toContainText("+56 951730743");
    await expect(step).not.toContainText("Entrega en 5 días");

    // Sin opcionales: el total es el plan y el neto es el precio del catalogo; se informa el valor mensual sin contrato.
    const total = dialog.getByTestId("quote-total");
    await expect(total).toHaveText("$261.800");
    await expect(step).toContainText("$220.000");
    await expect(step).toContainText("$41.800");
    await expect(step).toContainText("$23.681 al mes (IVA incluido)");

    // Soporte: casilla opcional, ayuda con todos los beneficios y periodos de 3, 6 y 12 meses con IVA incluido.
    const support = dialog.getByRole("checkbox", { name: "Agregar soporte" });
    await expect(support).not.toBeChecked();
    await support.check();
    await expect(step.getByRole("radio")).toHaveCount(3);
    await expect(step.getByRole("radio", { name: /3 meses/ })).toBeChecked();
    await expect(step).toContainText("$65.331");
    await expect(step).toContainText("$118.881");
    await expect(step).toContainText("$224.910");
    await expect(total).toHaveText("$327.131");
    await expect(step).not.toContainText("al mes (IVA incluido)");
    await step.getByRole("radio", { name: /1 año/ }).check();
    await expect(total).toHaveText("$486.710");

    const help = dialog.getByRole("button", { name: "Ver todos los beneficios y las condiciones del soporte adicional" });
    await expect(help).toHaveAttribute("aria-expanded", "false");
    await help.click();
    await expect(help).toHaveAttribute("aria-expanded", "true");
    await expect(step.getByText("Copias de seguridad y parches de seguridad")).toBeVisible();
    await expect(step.getByText("Un período ya iniciado no se reembolsa")).toBeVisible();
    await help.click();
    await expect(step.getByText("Un período ya iniciado no se reembolsa")).toBeHidden();
    await help.click();

    // Codigo fuente: aparte y opcional; el desglose cuadra (neto + IVA = total).
    await dialog.getByRole("checkbox", { name: "Agregar código fuente" }).check();
    await expect(total).toHaveText("$581.910");
    await expect(step).toContainText("$489.000");
    await expect(step).toContainText("$92.910");

    // Atras conserva todo lo escrito y lo elegido.
    await dialog.getByRole("button", { name: "Atrás" }).click();
    await expect(dialog.getByLabel(/Nombre completo o empresa/)).toHaveValue("Ana Pérez");
    await expect(dialog.getByText("Paso 1 de 2 · Tus datos")).toBeVisible();
    await dialog.getByRole("button", { name: "Siguiente" }).click();
    await expect(dialog.getByRole("checkbox", { name: "Agregar soporte" })).toBeChecked();
    await expect(dialog.getByTestId("quote-total")).toHaveText("$581.910");

    await dialog.getByRole("button", { name: "Enviar por WhatsApp" }).click();
    const [wa] = await page.evaluate(() => (window as unknown as { __opened: string[] }).__opened);
    const text = new URL(wa ?? "").searchParams.get("text") ?? "";
    for (const line of ["- Plan: Básico ($261.800)", "- Soporte adicional: 1 año ($224.910)", "- Código fuente ($95.200)", "- Valor neto: $489.000", "- IVA (19%): $92.910", "- Total con IVA incluido: $581.910"]) {
      expect(text).toContain(line);
    }
  });

  test("si el servicio elegido ya no es el del plan, el paso 2 explica que se cotiza por escrito", async ({ page }) => {
    await page.goto("/es/servicios/landing-page", { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Cotizar plan Básico" }).click();
    const dialog = page.getByRole("dialog", { name: "Solicita tu cotización" });
    await dialog.getByRole("combobox", { name: /Servicio/ }).click();
    await dialog.getByRole("listbox").getByRole("option", { name: /Otro/ }).click();
    await dialog.getByLabel(/Nombre completo o empresa/).fill("Ana Pérez");
    await dialog.getByLabel(/Teléfono/).fill("951730743");
    await dialog.getByLabel(/Cuéntanos sobre el proyecto/).fill("Necesito algo distinto a una landing.");
    await dialog.getByRole("checkbox", { name: /He leído y acepto/ }).check();
    await dialog.getByRole("button", { name: "Siguiente" }).click();
    const step = dialog.getByTestId("quote-step-2");
    await expect(step).toContainText("te enviaremos una cotización por escrito");
    await expect(dialog.getByTestId("quote-total")).toHaveCount(0);
    await expect(dialog.getByRole("button", { name: "Enviar por correo" })).toBeVisible();
  });

  test("cada plan tiene un enlace centrado Ver más que abre el detalle completo: precio, soporte, condiciones y codigo fuente, sin hablar de IVA", async ({ page }) => {
    await page.goto("/es/servicios/landing-page", { waitUntil: "networkidle" });
    const more = page.getByRole("button", { name: "Ver más" });
    await expect(more).toHaveCount(3);
    const card = page.locator("li").filter({ has: page.getByRole("button", { name: "Cotizar plan Básico" }) }).first();
    const cb = await card.boundingBox();
    const mb = await more.first().boundingBox();
    expect(cb && mb && Math.abs(cb.x + cb.width / 2 - (mb.x + mb.width / 2)) < 3).toBe(true);
    await expect(more.first()).toHaveAttribute("title", "Ver todos los detalles del plan Básico del servicio Landing Page");

    await more.first().click();
    const dialog = page.getByRole("dialog", { name: "Landing Page · Plan Básico" });
    await expect(dialog).toBeVisible();
    for (const t of [
      "Precio del plan",
      "$261.800",
      "2 rondas",
      "1 mes de soporte gratis",
      "Formulario de contacto y botón de WhatsApp",
      "Condiciones del soporte",
      "$23.681 por mes",
      "Precio del código fuente",
      "$95.200",
      "Proceso de trabajo",
    ]) {
      await expect(dialog).toContainText(t);
    }
    await expect(dialog).not.toContainText(/IVA/);
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });

  test("la tabla comparativa muestra el codigo fuente aparte, y ni la pagina ni el Markdown hablan de IVA fuera del cotizador", async ({ page, request }) => {
    await page.goto("/es/servicios/landing-page", { waitUntil: "networkidle" });
    const table = page.getByRole("table", { name: /Comparar paquetes: Landing Page/ });
    await expect(table).not.toContainText(/IVA/);
    await expect(table).toContainText("Código fuente (se compra aparte)");
    await expect(table).toContainText("$95.200");
    await expect(table).toContainText("$142.800");
    await expect(table).toContainText("$226.100");
    await expect(page.getByText("Entrega del código fuente")).toHaveCount(0);

    const md = await (await request.get("/raw/es/services/landing-page.md")).text();
    expect(md).not.toMatch(/IVA/);
    expect(md).toContain("Precio del plan");
    expect(md).toContain("Condiciones del soporte");
    expect(md).not.toMatch(/sin IVA|no incluyen IVA/);
  });

  test("en ingles el cotizador y el detalle hablan de VAT incluido y muestran dolares", async ({ page }) => {
    await page.goto("/en/services/landing-page", { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "See more" }).first().click();
    const detail = page.getByRole("dialog", { name: "Landing Page · Basic plan" });
    await expect(detail).toContainText("Plan price");
    await expect(detail).toContainText("Source code price");
    await expect(detail).not.toContainText(/VAT/);
    await page.keyboard.press("Escape");

    await page.getByRole("button", { name: "Quote Basic plan" }).click();
    const dialog = page.getByRole("dialog", { name: "Request your quote" });
    await dialog.getByLabel(/Full name or company/).fill("Ana Perez");
    await dialog.getByLabel(/^Phone/).fill("912345678");
    await dialog.getByLabel(/Tell us about the project/).fill("I need a landing page for my store.");
    await dialog.getByRole("checkbox", { name: /I have read and accept/ }).check();
    await dialog.getByRole("button", { name: "Next" }).click();
    await expect(dialog.getByText("Step 2 of 2 · Quote")).toBeVisible();
    await expect(dialog.getByTestId("quote-total")).toHaveText(/^\$[\d,]+$/);
    await expect(dialog.getByRole("checkbox", { name: "Add support" })).toBeVisible();
    await expect(dialog.getByRole("checkbox", { name: "Add source code" })).toBeVisible();
  });
});

test.describe("telefono: solo digitos", () => {
  const dirty = "ab 9-5173.0743+x#";
  test("en el dialogo de cotizacion el telefono descarta letras, espacios y signos al escribir o pegar", async ({ page }) => {
    await page.goto("/es/servicios/landing-page", { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Cotizar plan Básico" }).click();
    const dialog = page.getByRole("dialog", { name: "Solicita tu cotización" });
    const phone = dialog.getByLabel(/Teléfono/);
    await phone.fill(dirty);
    await expect(phone).toHaveValue("951730743");
    await phone.fill("");
    await phone.pressSequentially("9a5b1-7 3+0e7.4,3");
    await expect(phone).toHaveValue("951730743");
  });

  test("en el formulario de contacto el telefono tambien solo admite digitos", async ({ page }) => {
    await page.goto("/es/contacto", { waitUntil: "networkidle" });
    const phone = page.locator("main form").getByLabel(/Teléfono/);
    await phone.fill(dirty);
    await expect(phone).toHaveValue("951730743");
  });
});

test.describe("pie de pagina y condiciones", () => {
  test("las paginas ya no muestran fecha de revision, tiempo de lectura ni enlace a texto plano", async ({ page }) => {
    for (const path of ["/es/servicios", "/es/precios", "/es/preguntas-frecuentes", "/en/pricing"]) {
      await page.goto(path, { waitUntil: "networkidle" });
      const main = page.locator("main");
      await expect(main).not.toContainText(/Revisado el|Reviewed on|min de lectura|min read/);
      await expect(page.getByRole("link", { name: /texto plano|plain text/i })).toHaveCount(0);
    }
  });

  test("las condiciones de precios viven en los terminos y condiciones, no bajo los precios", async ({ page }) => {
    await page.goto("/es/precios", { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { name: "Condiciones", exact: true })).toHaveCount(0);
    await page.goto("/es/terminos", { waitUntil: "networkidle" });
    const precios = page.locator("section", { has: page.getByRole("heading", { name: /Precios y moneda/ }) });
    for (const t of ["Dominio y hosting", "Código fuente", "Soporte adicional", "CRM", "$297.500"]) await expect(precios).toContainText(t);
  });
});

test.describe("cotizador: validacion en tiempo real y transicion entre pasos", () => {
  const open = async (page: Page) => {
    await page.goto("/es/servicios/landing-page", { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Cotizar plan Básico" }).click();
    return page.getByRole("dialog", { name: "Solicita tu cotización" });
  };

  test("cada campo muestra su error mientras se escribe, sin esperar al boton Siguiente, y lo quita al cumplirse", async ({ page }) => {
    const dialog = await open(page);
    const err = (id: string) => dialog.locator("[id$='-" + id + "-error']");
    const phone = dialog.getByLabel(/Teléfono/);
    await phone.pressSequentially("1234");
    await expect(err("phone")).toBeVisible();
    await phone.pressSequentially("56789");
    await expect(err("phone")).toHaveCount(0);
    // Borrar digitos de un telefono ya valido vuelve a mostrar el error al instante.
    await phone.fill("12345");
    await expect(err("phone")).toBeVisible();

    const name = dialog.getByLabel(/Nombre completo o empresa/);
    await name.pressSequentially("A");
    await expect(err("name")).toBeVisible();
    await name.pressSequentially("na");
    await expect(err("name")).toHaveCount(0);

    const message = dialog.getByLabel(/Cuéntanos sobre el proyecto/);
    await message.pressSequentially("corto");
    await expect(err("message")).toBeVisible();
    await message.pressSequentially(" ya no es tan corto");
    await expect(err("message")).toHaveCount(0);

    // Un campo obligatorio vacio que se deja tambien avisa al salir de el.
    await message.fill("");
    await page.keyboard.press("Tab");
    await expect(err("message")).toBeVisible();
    await expect(dialog.getByTestId("quote-step-2")).toHaveCount(0);
  });

  test("al pasar al paso 2 el contenido entra deslizando y la barra de progreso se llena; Atras lo hace al reves", async ({ page }) => {
    const dialog = await open(page);
    await dialog.getByLabel(/Nombre completo o empresa/).fill("Ana Pérez");
    await dialog.getByLabel(/Teléfono/).fill("951730743");
    await dialog.getByLabel(/Cuéntanos sobre el proyecto/).fill("Necesito una landing para mi tienda.");
    await dialog.getByRole("checkbox", { name: /He leído y acepto/ }).check();
    const fill = dialog.locator("[aria-label='Pasos de la solicitud'] span.origin-left");
    const track = fill.locator("xpath=..");
    const width = async (loc: typeof fill) => (await loc.boundingBox())?.width ?? -1;
    expect(await width(fill)).toBeLessThan(2);

    await dialog.getByRole("button", { name: "Siguiente" }).click();
    const step = dialog.getByTestId("quote-step-2");
    await expect(step).toBeVisible();
    expect(await step.evaluate((el) => getComputedStyle(el).animationName)).toBe("step-in-next");
    await expect.poll(async () => Math.abs((await width(fill)) - (await width(track)))).toBeLessThan(2);

    await dialog.getByRole("button", { name: "Atrás" }).click();
    const first = dialog.getByLabel(/Nombre completo o empresa/);
    await expect(first).toBeVisible();
    expect(await first.locator("xpath=ancestor::div[contains(@class,'content-start gap-4')][1]").evaluate((el) => getComputedStyle(el).animationName)).toBe("step-in-prev");
    await expect.poll(async () => width(fill)).toBeLessThan(2);
  });
});

test.describe("subrayado del enlace activo", () => {
  test("ocupa el 50% del ancho del enlace y queda centrado, no el 100%", async ({ page, isMobile }) => {
    test.skip(isMobile, "la barra de pestanas se muestra desde pantallas anchas");
    await page.goto("/es/precios", { waitUntil: "networkidle" });
    const link = page.locator("header nav").getByRole("link", { name: "Precios" });
    const m = await link.evaluate((el) => {
      const a = getComputedStyle(el, "::after");
      const r = el.getBoundingClientRect();
      return { link: r.width, line: parseFloat(a.width), left: parseFloat(a.marginLeft) };
    });
    expect(m.line / m.link).toBeGreaterThan(0.49);
    expect(m.line / m.link).toBeLessThan(0.51);
    expect(Math.abs(m.left - (m.link - m.line) / 2)).toBeLessThan(1);
  });
});

test.describe("home con la A de la marca y encabezado de precios amigable", () => {
  test("cada panel del home tiene su propio fondo con formas decorativas y la A de la marca aparece una sola vez, solo ornamental", async ({ page }) => {
    await page.goto("/es", { waitUntil: "networkidle" });
    const panels = await page.evaluate(() =>
      [...document.querySelectorAll("main section.panel-night, main section.panel-brand, main div.bg-blue-soft, main div.bg-surface-strong")].map((el) => ({
        cls: el.className.split(" ").find((c) => /panel-|bg-/.test(c)) ?? "",
        marks: el.querySelectorAll(":scope > [aria-hidden='true']").length,
        bg: getComputedStyle(el).backgroundColor + getComputedStyle(el).backgroundImage.slice(0, 20),
      })),
    );
    expect(panels.map((p) => p.cls)).toEqual(["panel-night", "bg-surface-strong", "panel-brand", "bg-blue-soft", "panel-night"]);
    for (const p of panels) expect(p.marks, p.cls).toBeGreaterThanOrEqual(1);
    // Menos es mas: una sola A en todo el home.
    await expect(page.locator("main svg[aria-hidden='true'][viewBox='0 0 443 310']")).toHaveCount(1);
    expect(new Set(panels.map((p) => p.bg)).size).toBeGreaterThanOrEqual(4);
    // Las formas decoradoras no reciben clics ni foco.
    expect(await page.locator("main svg[aria-hidden='true'][viewBox='0 0 443 310']").first().evaluate((el) => getComputedStyle(el).pointerEvents)).toBe("none");
  });

  test("las migas de pan usan texto legible (Inicio / Precios) y el encabezado de precios es corto y con acciones", async ({ page }) => {
    await page.goto("/es/precios", { waitUntil: "networkidle" });
    const crumbs = page.getByRole("navigation", { name: /Ruta|Breadcrumb|Miga/i });
    await expect(crumbs).toContainText("Inicio");
    await expect(crumbs).toContainText("Precios");
    await expect(crumbs).not.toContainText("acmora");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Precios claros, sin letra chica");
    await expect(page.getByRole("link", { name: "Ver planes y precios" })).toHaveAttribute("href", "#h-precios-por-servicio");
    await expect(page.getByRole("link", { name: "Cotizar gratis" }).first()).toBeVisible();
    await page.getByRole("link", { name: "Ver planes y precios" }).click();
    await expect(page.getByRole("heading", { name: "Precios por servicio" })).toBeInViewport();
  });
});

test.describe("cotizador: consentimiento de terminos y privacidad", () => {
  test("sin marcar la casilla no se pasa al paso 2: avisa en el acto y al marcarla continua", async ({ page }) => {
    await page.goto("/es/servicios/landing-page", { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Cotizar plan Básico" }).click();
    const dialog = page.getByRole("dialog", { name: "Solicita tu cotización" });
    await dialog.getByLabel(/Nombre completo o empresa/).fill("Ana Pérez");
    await dialog.getByLabel(/Teléfono/).fill("951730743");
    await dialog.getByLabel(/Cuéntanos sobre el proyecto/).fill("Necesito una landing para mi tienda.");
    await dialog.getByRole("button", { name: "Siguiente" }).click();
    const error = dialog.locator("[id$='-consent-error']");
    await expect(error).toContainText("acepta los Términos y Condiciones y la Política de Privacidad");
    await expect(dialog.getByTestId("quote-step-2")).toHaveCount(0);
    const box = dialog.getByRole("checkbox", { name: /He leído y acepto/ });
    await expect(box).toHaveAttribute("aria-invalid", "true");
    await box.check();
    await expect(error).toHaveCount(0);
    await dialog.getByRole("button", { name: "Siguiente" }).click();
    await expect(dialog.getByTestId("quote-step-2")).toBeVisible();
  });

  test("el consentimiento marcado se refleja con el contorno azul y los enlaces abren en pestaña nueva", async ({ page, context }) => {
    await page.goto("/es/servicios/landing-page", { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Cotizar plan Básico" }).click();
    const dialog = page.getByRole("dialog", { name: "Solicita tu cotización" });
    const box = dialog.getByRole("checkbox", { name: /He leído y acepto/ });
    await box.check();
    await expect.poll(() => box.locator("xpath=ancestor::label").evaluate((el) => getComputedStyle(el).borderTopColor)).toBe("rgb(6, 69, 232)");
    const popup = context.waitForEvent("page");
    await dialog.getByRole("link", { name: /Términos y Condiciones/ }).click();
    const tab = await popup;
    await expect(tab).toHaveURL(/\/es\/terminos$/);
    await expect(dialog).toBeVisible();
  });
});

test.describe("navegacion lateral de los documentos legales", () => {
  for (const [path, current] of [
    ["/es/privacidad", "/es/privacidad"],
    ["/es/terminos", "/es/terminos"],
    ["/es/cookies", "/es/cookies"],
  ] as const) {
    test(`${path}: lista todas las secciones, resalta la actual al navegar y enlaza a los otros documentos`, async ({ page, isMobile }) => {
      await page.goto(path, { waitUntil: "networkidle" });
      const sections = await page.locator("main h2[id^='h-']").count();
      expect(sections).toBeGreaterThan(4);

      if (isMobile) {
        const details = page.locator("details", { hasText: "En esta página" }).first();
        await expect(details).toBeVisible();
        await details.locator("summary").click();
        await expect(details.locator("a[href^='#h-']")).toHaveCount(sections);
        return;
      }

      const nav = page.getByRole("navigation", { name: "En esta página" });
      await expect(nav).toBeVisible();
      await expect(nav.locator("a[href^='#h-']")).toHaveCount(sections);
      for (const href of ["/es/privacidad", "/es/terminos", "/es/cookies"]) await expect(nav.locator(`a[href='${href}']`)).toHaveCount(1);
      await expect(nav.locator(`a[href='${current}']`)).toHaveAttribute("aria-current", "page");

      // Ir a una seccion: el titular queda a la vista (bajo la cabecera) y su enlace pasa a ser el actual.
      const target = nav.locator("a[href^='#h-']").nth(4);
      const hash = (await target.getAttribute("href")) ?? "";
      await target.click();
      await expect(page).toHaveURL(new RegExp(`${hash}$`));
      await expect(page.locator(hash)).toBeInViewport();
      await expect(target).toHaveAttribute("aria-current", "location");
      expect(await page.locator(hash).evaluate((el) => el.getBoundingClientRect().top)).toBeGreaterThan(64);

      // La barra lateral acompana la lectura (queda fija bajo la cabecera).
      const box = await nav.boundingBox();
      expect(box && box.y >= 0 && box.y < 200).toBe(true);
    });
  }
});

test.describe("contacto: casilla de aceptacion estilo Google", () => {
  test("la casilla es Material y, al marcarla, todo su contorno se sombrea en azul como en el cotizador", async ({ page }) => {
    await page.goto("/es/contacto", { waitUntil: "networkidle" });
    const box = page.getByRole("checkbox", { name: /He leído y acepto/ });
    expect(await box.evaluate((el) => getComputedStyle(el).appearance)).toBe("none");
    const label = box.locator("xpath=ancestor::label");
    const look = () => label.evaluate((el) => ({ border: getComputedStyle(el).borderTopColor, shadow: getComputedStyle(el).boxShadow }));
    const before = await look();
    expect(before.border).not.toBe("rgb(6, 69, 232)");
    await box.check();
    await expect.poll(async () => (await look()).border).toBe("rgb(6, 69, 232)");
    expect((await look()).shadow).not.toBe("none");
  });
});

test.describe("casillas y radios: halo radial", () => {
  const halo = (loc: ReturnType<Page["locator"]>) => loc.evaluate((el) => parseFloat(getComputedStyle(el, "::before").opacity));

  test("las casillas muestran el halo radial al pasar el cursor por ellas o por su fila, en ambos formularios", async ({ page, isMobile }) => {
    test.skip(isMobile, "el cursor no existe en tactil");
    await page.goto("/es/contacto", { waitUntil: "networkidle" });
    const contact = page.getByRole("checkbox", { name: /He leído y acepto/ });
    expect(await halo(contact)).toBe(0);
    await contact.locator("xpath=ancestor::label").hover({ position: { x: 200, y: 10 } });
    await expect.poll(() => halo(contact)).toBeGreaterThan(0.1);

    await page.goto("/es/servicios/landing-page", { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Cotizar plan Básico" }).click();
    const dialog = page.getByRole("dialog", { name: "Solicita tu cotización" });
    const consent = dialog.getByRole("checkbox", { name: /He leído y acepto/ });
    expect(await halo(consent)).toBe(0);
    await consent.locator("xpath=ancestor::label").hover({ position: { x: 250, y: 10 } });
    await expect.poll(() => halo(consent)).toBeGreaterThan(0.1);
  });

  test("el halo de los radios y las casillas aparece solo al pasar el cursor: marcados, en reposo, no lo muestran", async ({ page, isMobile }) => {
    test.skip(isMobile, "el cursor no existe en tactil");
    await page.goto("/es/servicios/landing-page", { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Cotizar plan Básico" }).click();
    const dialog = page.getByRole("dialog", { name: "Solicita tu cotización" });
    await dialog.getByLabel(/Nombre completo o empresa/).fill("Ana Pérez");
    await dialog.getByLabel(/Teléfono/).fill("951730743");
    await dialog.getByLabel(/Cuéntanos sobre el proyecto/).fill("Necesito una landing para mi tienda.");
    await dialog.getByRole("checkbox", { name: /He leído y acepto/ }).check();
    await dialog.getByRole("button", { name: "Siguiente" }).click();
    const support = dialog.getByRole("checkbox", { name: "Agregar soporte" });
    await support.check();
    const radios = dialog.getByRole("radio");
    await expect(radios).toHaveCount(3);
    await page.mouse.move(5, 5);
    // Marcados y sin cursor encima: sin halo.
    await expect.poll(() => halo(radios.nth(0))).toBe(0);
    await expect.poll(() => halo(support)).toBe(0);
    // Con el cursor sobre la fila: halo.
    await radios.nth(1).locator("xpath=ancestor::label").hover();
    await expect.poll(() => halo(radios.nth(1))).toBeGreaterThan(0.1);
    expect(await halo(radios.nth(2))).toBe(0);
    await radios.nth(1).check({ force: true });
    await page.mouse.move(5, 5);
    await expect.poll(() => halo(radios.nth(1))).toBe(0);
  });
});

test.describe("hash inexistente lleva al 404", () => {
  test("/es/servicios#crm-dsferer termina en el 404 localizado, con estado 404 y sin conservar el hash", async ({ page, request }) => {
    await page.goto("/es/servicios#crm-dsferer");
    await expect(page).toHaveURL((u) => u.pathname === "/es/servicios/crm-dsferer" && u.hash === "");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Esta página no existe");
    expect((await request.get("/es/servicios/crm-dsferer")).status()).toBe(404);
  });

  test("tambien en otras paginas e idiomas, y al cambiar el hash con la pagina abierta", async ({ page }) => {
    await page.goto("/en/pricing#nope");
    await expect(page).toHaveURL((u) => u.pathname === "/en/pricing/nope");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("This page does not exist");

    await page.goto("/es/precios", { waitUntil: "networkidle" });
    await page.evaluate(() => {
      window.location.hash = "no-existe-esta-seccion";
    });
    await expect(page).toHaveURL((u) => u.pathname === "/es/precios/no-existe-esta-seccion");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Esta página no existe");
  });

  test("los hash validos (pestanas y secciones) no redirigen", async ({ page }) => {
    for (const path of ["/es/servicios#crm-personalizado", "/es/precios#mantencion-web", "/es/precios#h-preguntas", "/es/privacidad#h-datos", "/es/servicios/landing-page#h-planes"]) {
      await page.goto(path, { waitUntil: "networkidle" });
      await page.waitForTimeout(400);
      expect(new URL(page.url()).pathname + new URL(page.url()).hash, path).toBe(path);
      await expect(page.getByRole("heading", { level: 1 })).not.toHaveText(/no existe/);
    }
  });
});

test.describe("botones de WhatsApp con mensaje directo", () => {
  test("todo enlace que abre WhatsApp lleva un mensaje ya escrito, claro y propio de la pagina", async ({ page }) => {
    for (const path of ["/es", "/es/precios", "/es/servicios", "/es/servicios/landing-page", "/es/servicios/mantencion-web", "/es/preguntas-frecuentes", "/es/nosotros", "/es/contacto", "/es/privacidad", "/es/terminos", "/en", "/en/services/crm-personalizado"]) {
      await page.goto(path, { waitUntil: "domcontentloaded" });
      const hrefs = await page.locator("a[href*='wa.me']").evaluateAll((els) => els.map((el) => (el as HTMLAnchorElement).href));
      expect(hrefs.length, path).toBeGreaterThan(0);
      for (const h of hrefs) {
        const text = new URL(h).searchParams.get("text") ?? "";
        expect(text.length, path + " " + h).toBeGreaterThan(30);
        expect(text, path).toMatch(/^(Hola|Hello)/);
      }
    }
  });

  test("el boton del hero, el del pie y el de cada servicio abren WhatsApp con su propio mensaje", async ({ page }) => {
    const textOf = async (loc: ReturnType<Page["locator"]>) => new URL((await loc.getAttribute("href")) ?? "").searchParams.get("text");
    await page.goto("/es", { waitUntil: "domcontentloaded" });
    expect(await textOf(page.locator("section[aria-labelledby='page-title']").getByRole("link", { name: "Hablar por WhatsApp" }))).toBe("Hola, vi el sitio de Acmora y quiero más información sobre sus servicios.");
    expect(await textOf(page.locator("footer").getByRole("link", { name: /WhatsApp/ }))).toBe("Hola, les escribo desde el sitio de Acmora. Quisiera hacerles una consulta sobre mi proyecto web.");
    await page.goto("/es/servicios/landing-page", { waitUntil: "domcontentloaded" });
    expect(await textOf(page.locator("main").getByRole("link", { name: "Escribir por WhatsApp" }))).toBe("Hola, me interesa el servicio Landing Page de Acmora. ¿Podemos conversar sobre mi proyecto?");
  });
});

test.describe("accesos, codigo fuente y mantencion sin cautividad", () => {
  test("cada plan explica en su detalle que recibes tus accesos y credenciales, que la mantencion es opcional y como comprar el codigo", async ({ page }) => {
    await page.goto("/es/servicios/landing-page", { waitUntil: "networkidle" });
    const planes = ["Básico", "Estándar", "Premium"];
    for (const [i, plan] of planes.entries()) {
      await page.getByRole("button", { name: "Ver más" }).nth(i).click();
      const dialog = page.getByRole("dialog", { name: `Landing Page · Plan ${plan}` });
      await expect(dialog.getByRole("heading", { name: "Tus accesos y tu independencia" })).toBeVisible();
      for (const t of ["Dominio registrado a tu nombre", "acceso de propietario", "Un documento con todas las credenciales", "sin permanencia", "Nada se apaga, se bloquea ni se retiene", "también después de la entrega", "dentro de 5 días hábiles desde el pago", "con o sin el código"]) await expect(dialog).toContainText(t);
      // Correo: una cuenta en el Básico, varias en los demas; el panel con base de datos solo en el Premium.
      await expect(dialog).toContainText(i === 0 ? "Tu cuenta de correo profesional" : "Tus cuentas de correo profesionales");
      if (i === 2) await expect(dialog).toContainText("Panel de administración, base de datos y servidor");
      else await expect(dialog).not.toContainText("Panel de administración, base de datos y servidor");
      await page.keyboard.press("Escape");
    }
  });

  test("la tabla comparativa, los terminos y la FAQ lo declaran: accesos entregados, sin permanencia y codigo comprable en cualquier momento", async ({ page }) => {
    await page.goto("/es/servicios/landing-page", { waitUntil: "networkidle" });
    const table = page.getByRole("table", { name: /Comparar paquetes: Landing Page/ });
    await expect(table).toContainText("Accesos y credenciales a tu nombre");
    await expect(table).toContainText("Permanencia con la mantención");

    await page.goto("/es/terminos", { waitUntil: "networkidle" });
    const main = page.locator("main");
    await expect(main).toContainText("Accesos y credenciales:");
    await expect(main).toContainText("No retenemos tus accesos por no contratar la mantención");
    await expect(main).toContainText("en cualquier momento (también después de la entrega)");
    await expect(main).toContainText("Dejar de contratarla no apaga ni bloquea tu sitio");

    await page.goto("/es/preguntas-frecuentes", { waitUntil: "networkidle" });
    await expect(page.locator("main")).toContainText("si la dejas, tu sitio sigue en línea y tus accesos siguen siendo tuyos");

    await page.goto("/es/servicios/mantencion-web", { waitUntil: "networkidle" });
    await expect(page.locator("main")).toContainText("La mantención nunca es una condición para tener tus accesos ni tu sitio");
  });

  test("el cotizador lo recuerda junto a la opcion de codigo fuente, en español e ingles", async ({ page }) => {
    for (const [path, plan, dialogName, next, consent, fill] of [
      ["/es/servicios/landing-page", "Cotizar plan Básico", "Solicita tu cotización", "Siguiente", /He leído y acepto/, ["Nombre completo o empresa", "Teléfono", "Cuéntanos sobre el proyecto"]],
      ["/en/services/landing-page", "Quote Basic plan", "Request your quote", "Next", /I have read and accept/, ["Full name or company", "Phone", "Tell us about the project"]],
    ] as const) {
      await page.goto(path, { waitUntil: "networkidle" });
      await page.getByRole("button", { name: plan }).click();
      const dialog = page.getByRole("dialog", { name: dialogName });
      await dialog.getByLabel(new RegExp(fill[0])).fill("Ana Perez");
      await dialog.getByLabel(new RegExp("^" + fill[1])).fill("951730743");
      await dialog.getByLabel(new RegExp(fill[2])).fill("Necesito una landing para mi tienda.");
      await dialog.getByRole("checkbox", { name: consent }).check();
      await dialog.getByRole("button", { name: next }).click();
      await expect(dialog.getByTestId("quote-step-2")).toContainText(path.startsWith("/es") ? "mantención nunca es obligatoria" : "maintenance is never mandatory");
    }
  });
});

test.describe("acordeones suaves", () => {
  test("los acordeones se abren y se cierran con una animacion suave de altura, no de golpe", async ({ page, browserName }) => {
    test.skip(browserName !== "chromium", "::details-content con interpolate-size es de Chromium");
    await page.goto("/es/preguntas-frecuentes", { waitUntil: "networkidle" });
    const item = page.locator("main details").first();
    const sample = (ms: number) =>
      item.evaluate(
        (el, ms) =>
          new Promise<number[]>((resolve) => {
            const out: number[] = [];
            const t0 = performance.now();
            const tick = () => {
              out.push(Math.round(el.getBoundingClientRect().height));
              if (performance.now() - t0 < ms) requestAnimationFrame(tick);
              else resolve(out);
            };
            tick();
          }),
        ms,
      );
    const closed = Math.round((await item.boundingBox())?.height ?? 0);
    // Ventana amplia: bajo carga, el clic de Playwright (con sus comprobaciones) puede tardar varios cientos de ms en llegar.
    const opening = sample(1500);
    await item.locator("summary").click();
    const openHeights = await opening;
    const open = openHeights[openHeights.length - 1] ?? 0;
    expect(open).toBeGreaterThan(closed + 20);
    const inBetween = openHeights.filter((h) => h > closed + 2 && h < open - 2);
    expect(inBetween.length, "alturas intermedias al abrir: " + openHeights.join(",")).toBeGreaterThanOrEqual(2);

    const closing = sample(1500);
    await item.locator("summary").click();
    const closeHeights = await closing;
    expect(closeHeights.filter((h) => h > closed + 2 && h < open - 2).length, "alturas intermedias al cerrar: " + closeHeights.join(",")).toBeGreaterThanOrEqual(2);
    expect(closeHeights[closeHeights.length - 1]).toBe(closed);
  });
});

test.describe("nosotros: vista mejorada", () => {
  test("el proceso va centrado en un panel azul con los 3 pasos, igual que en el inicio; compromisos en tarjetas, sin secciones de tecnologias ni de datos del responsable", async ({ page }) => {
    await page.goto("/es/nosotros", { waitUntil: "networkidle" });
    const panel = page.locator("section.panel-brand");
    await expect(panel).toHaveCount(1);
    const title = panel.getByRole("heading", { level: 2, name: "Tu proyecto en 3 pasos" });
    expect(await title.evaluate((el) => getComputedStyle(el).textAlign)).toBe("center");
    const [pb, tb] = [await panel.boundingBox(), await title.boundingBox()];
    expect(pb && tb && Math.abs(pb.x + pb.width / 2 - (tb.x + tb.width / 2)) < 4).toBe(true);
    const steps = panel.getByRole("list", { name: "Tu proyecto en 3 pasos" }).getByRole("listitem").filter({ has: page.getByRole("heading", { level: 3 }) });
    await expect(steps).toHaveCount(3);

    // Compromisos: cinco tarjetas con icono (no una lista de definiciones).
    const commitments = page.locator("section", { has: page.getByRole("heading", { name: "Cómo trabajamos" }) });
    await expect(commitments.locator("ul > li")).toHaveCount(5);
    await expect(commitments.locator("ul > li svg").first()).toBeVisible();
    await expect(commitments).toContainText("Dominio y accesos a tu nombre");
    // Ya no hay secciones de tecnologias ni de datos del responsable.
    await expect(page.getByRole("heading", { name: "Tecnologías" })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Datos del responsable" })).toHaveCount(0);
    // El Markdown conserva todo el contenido.
    const md = await (await page.request.get("/raw/es/about.md")).text();
    expect(md).toContain("Tu proyecto en 3 pasos");
    expect(md).not.toContain("Datos del responsable");
  });
});

test.describe("titulo en los enlaces de idioma y en el boton de tema", () => {
  test("el enlace al otro idioma y el boton de tema llevan title, y al pasar el cursor solo se ve el globo propio", async ({ page, isMobile }) => {
    await page.goto("/es", { waitUntil: "networkidle" });
    const toEn = page.locator("header nav").getByRole("link", { name: "EN" });
    await expect(toEn).toHaveAttribute("href", "/en");
    await expect(toEn).toHaveAttribute("title", "View this page in English");
    await expect(page.getByRole("button", { name: "Cambiar a tema oscuro" })).toHaveAttribute("title", "Activar el tema oscuro del sitio");
    await page.goto("/en", { waitUntil: "networkidle" });
    const toEs = page.locator("header nav").getByRole("link", { name: "ES" });
    await expect(toEs).toHaveAttribute("href", "/es");
    await expect(toEs).toHaveAttribute("title", "Ver esta página en español");
    if (isMobile) return;
    // Con el cursor encima, el title nativo se retira (queda el globo de Google) y vuelve al salir.
    await toEs.hover();
    await expect(toEs).not.toHaveAttribute("title", /.+/);
    await expect(page.getByRole("tooltip").filter({ hasText: "Ver esta página en español" })).toBeVisible();
    await page.mouse.move(5, 300);
    await expect(toEs).toHaveAttribute("title", "Ver esta página en español");
  });
});

test.describe("buscador de preguntas frecuentes", () => {
  const CASES = [
    { path: "/es/preguntas-frecuentes", word: "dominio", fold: "DOMINIO", none: "xqzvw", noneText: /No encontramos resultados para "xqzvw"/, count: /Resultado 1 de \d+/, accent: "mantencion" },
    { path: "/en/faq", word: "domain", fold: "DOMAIN", none: "xqzvw", noneText: /We found no results for "xqzvw"/, count: /Result 1 of \d+/, accent: "installments" },
  ];

  for (const c of CASES) {
    test(`${c.path}: al escribir abre la mejor respuesta y baja suavemente hasta ella`, async ({ page }) => {
      await page.goto(c.path, { waitUntil: "networkidle" });
      const box = page.getByRole("searchbox");
      await expect(box).toHaveAttribute("title", /.{20,}/);
      await box.fill(c.fold);
      const current = page.locator("details[data-faq][data-faq-state='current']");
      await expect(current).toHaveCount(1);
      await expect(current).toHaveJSProperty("open", true);
      await expect(page.locator("p[role='status']:not(.sr-only)")).toHaveText(c.count);
      // La pagina se desplaza hasta dejar la respuesta a la vista, bajo la cabecera y el buscador fijos.
      await expect
        .poll(async () => {
          const y = (await current.boundingBox())?.y ?? -1;
          return y > 100 && y < 400;
        })
        .toBe(true);
      expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
      await expect(page.locator("details[data-faq][data-faq-state='match']").first()).toBeAttached();
    });

    test(`${c.path}: Enter pasa al siguiente resultado, Escape borra y no hay resultados con una palabra ajena`, async ({ page }) => {
      await page.goto(c.path, { waitUntil: "networkidle" });
      const box = page.getByRole("searchbox");
      await box.fill(c.word);
      const current = page.locator("details[data-faq][data-faq-state='current']");
      await expect(current).toHaveCount(1);
      const first = await current.locator("summary").innerText();
      await box.press("Enter");
      await expect(page.locator("p[role='status']:not(.sr-only)")).toHaveText(/(Resultado|Result) 2 (de|of)/);
      await expect(current.locator("summary")).not.toHaveText(first);
      await page.getByRole("button", { name: /Resultado anterior|Previous result/ }).click();
      await expect(current.locator("summary")).toHaveText(first);

      await box.press("Escape");
      await expect(box).toHaveValue("");
      await expect(page.locator("details[data-faq][data-faq-state]")).toHaveCount(0);
      await expect(page.locator("details[data-faq][open]")).toHaveCount(0);

      await box.fill(c.none);
      await expect(page.locator("p[role='status']:not(.sr-only)")).toHaveText(c.noneText);
      await expect(page.locator("details[data-faq][data-faq-state]")).toHaveCount(0);
      await page.getByRole("button", { name: /Borrar búsqueda|Clear search/ }).click();
      await expect(page.locator("p[role='status']:not(.sr-only)")).toHaveText("");
    });

    test(`${c.path}: ignora tildes y mayusculas`, async ({ page }) => {
      await page.goto(c.path, { waitUntil: "networkidle" });
      await page.getByRole("searchbox").fill(c.accent);
      await expect(page.locator("details[data-faq][data-faq-state='current']")).toHaveCount(1);
    });
  }

  test("los controles del buscador llevan title y no hay errores de accesibilidad", async ({ page }) => {
    await page.goto("/es/preguntas-frecuentes", { waitUntil: "networkidle" });
    await page.getByRole("searchbox").fill("dominio");
    await expect(page.getByRole("button", { name: "Resultado siguiente" })).toHaveAttribute("title", /.{20,}/);
    await expect(page.getByRole("button", { name: "Borrar búsqueda" })).toHaveAttribute("title", /.{20,}/);
    const r = await new AxeBuilder({ page }).exclude("[data-decorative]").withTags(["wcag2a", "wcag2aa", "wcag22aa"]).analyze();
    expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`)).toEqual([]);
  });
});

test.describe("buscador global", () => {
  const open = async (page: Page, path: string) => {
    await page.goto(path, { waitUntil: "networkidle" });
    await page.keyboard.press("/");
    const dialog = page.getByRole("dialog", { name: /Buscador del sitio|Site search/ });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("searchbox")).toBeFocused();
    return dialog;
  };

  test("se abre con /, sugiere una correccion y muestra resultados con extracto y titulo en cada enlace", async ({ page }) => {
    const dialog = await open(page, "/es");
    await expect(dialog.getByText("Búsquedas populares")).toBeVisible();
    await dialog.getByRole("searchbox").fill("mantencon");
    await expect(dialog.getByText("No encontramos resultados para “mantencon”").last()).toBeVisible();
    await dialog.getByRole("button", { name: "mantención" }).click();
    const links = dialog.locator("a[data-result]");
    await expect(links.first()).toBeVisible();
    expect(await links.count()).toBeGreaterThan(2);
    await expect(links.first()).toHaveAttribute("title", /^Abrir .+\(.+\)$/);
    await expect(dialog.locator("mark").first()).toBeVisible();
  });

  test("las flechas recorren los resultados, Enter abre el primero y la pagina navega y cierra el buscador", async ({ page }) => {
    const dialog = await open(page, "/es");
    const box = dialog.getByRole("searchbox");
    await box.fill("plazo de entrega");
    const links = dialog.locator("a[data-result]");
    await expect(links.first()).toBeVisible();
    await box.press("ArrowDown");
    await expect(links.first()).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await expect(links.nth(1)).toBeFocused();
    await page.keyboard.press("ArrowUp");
    await page.keyboard.press("ArrowUp");
    await expect(box).toBeFocused();
    const href = (await links.first().getAttribute("href")) ?? "";
    await box.press("Enter");
    await expect(dialog).toBeHidden();
    await expect(page).toHaveURL(new RegExp(href.split("#")[0] ?? ""));
  });

  test("sin resultados no queda mudo: consejos, atajos y WhatsApp con la busqueda escrita; Esc cierra", async ({ page }) => {
    const dialog = await open(page, "/es");
    await dialog.getByRole("searchbox").fill("xqzvw");
    await expect(dialog.getByText("No encontramos resultados para “xqzvw”").last()).toBeVisible();
    await expect(dialog.getByText("Sugerencias:")).toBeVisible();
    await expect(dialog.getByRole("link", { name: "Precios" })).toBeVisible();
    const wa = dialog.getByRole("link", { name: "Escribir por WhatsApp" });
    const href = (await wa.getAttribute("href")) ?? "";
    expect(href).toContain("https://wa.me/56951730743?text=");
    expect(decodeURIComponent(href)).toContain("busqué “xqzvw”");
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });

  test("si el indice no carga muestra el error estilo Google y reintentar lo recupera", async ({ page }) => {
    await page.route("**/api/search/es", (r) => r.abort());
    const dialog = await open(page, "/es");
    await expect(dialog.getByText("No pudimos cargar el buscador").last()).toBeVisible();
    await page.unroute("**/api/search/es");
    await dialog.getByRole("button", { name: "Reintentar" }).click();
    await expect(dialog.getByText("Búsquedas populares")).toBeVisible();
  });

  test("en ingles busca y muestra los mensajes en ingles", async ({ page }) => {
    const dialog = await open(page, "/en");
    await dialog.getByRole("searchbox").fill("delivery time");
    await expect(dialog.locator("a[data-result]").first()).toBeVisible();
    await dialog.getByRole("searchbox").fill("xqzvw");
    await expect(dialog.getByText("We found no results for “xqzvw”").last()).toBeVisible();
    await expect(dialog.getByRole("link", { name: "Write on WhatsApp" })).toBeVisible();
  });

  test("tambien se abre con el boton de la cabecera, con title, y sin errores de accesibilidad", async ({ page }) => {
    await page.goto("/es", { waitUntil: "networkidle" });
    const trigger = page.locator("header").getByRole("button", { name: /Buscar/ }).filter({ visible: true }).first();
    await expect(trigger).toHaveAttribute("title", /.{20,}/);
    await trigger.click();
    const dialog = page.getByRole("dialog", { name: "Buscador del sitio" });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("searchbox").fill("precio");
    await expect(dialog.locator("a[data-result]").first()).toBeVisible();
    const r = await new AxeBuilder({ page }).exclude("[data-decorative]").withTags(["wcag2a", "wcag2aa", "wcag22aa"]).analyze();
    expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`)).toEqual([]);
  });

  test("la cabecera ya no trae FAQ ni Nosotros, pero el buscador los ofrece como atajos", async ({ page }) => {
    const dialog = await open(page, "/es");
    await expect(dialog.getByRole("link", { name: "FAQ" })).toBeVisible();
    await expect(dialog.getByRole("link", { name: "Nosotros" })).toBeVisible();
  });
});

test.describe("boton flotante de contacto", () => {
  test("va a la izquierda con la foto y el punto activo, a la misma altura que volver arriba (a la derecha), mas chicos en pantallas pequenas", async ({ page, isMobile }) => {
    await page.goto("/es", { waitUntil: "networkidle" });
    const contact = page.getByRole("button", { name: "Contactar a José Ignacio" });
    await expect(contact).toBeVisible();
    await expect(contact).toHaveAttribute("title", /.{20,}/);
    const img = contact.locator("img");
    await expect(img).toHaveAttribute("src", /author\.webp/);
    await expect(img).toHaveAttribute("alt", /José Ignacio/);
    await expect(img).toHaveAttribute("title", /.{20,}/);
    await expect(contact.locator("span.animate-ping")).toHaveCount(1);
    await expect(contact.locator(".fab-ring")).toHaveCount(1);

    await page.evaluate(() => window.scrollTo(0, 900));
    const top = page.getByRole("button", { name: "Volver arriba" });
    await expect(top).toBeVisible();
    await expect.poll(async () => Math.round((await top.boundingBox())?.width ?? 0)).toBe(isMobile ? 40 : 48);
    const c = await contact.boundingBox();
    const t = await top.boundingBox();
    if (!c || !t) throw new Error("sin cajas");
    expect(Math.round(c.width)).toBe(isMobile ? 48 : 56);
    // Sincronizados: mismo margen a su borde (contacto a la izquierda, volver arriba a la derecha) y centros a la misma altura.
    const vw = page.viewportSize()?.width ?? 0;
    const edge = isMobile ? 16 : 24;
    expect(Math.round(c.x)).toBe(edge);
    expect(Math.round(vw - (t.x + t.width))).toBe(edge);
    expect(Math.abs(c.y + c.height / 2 - (t.y + t.height / 2))).toBeLessThan(1.5);
  });

  test("abre una tarjeta con estado, WhatsApp con mensaje, formulario y correo; Esc la cierra y devuelve el foco", async ({ page }) => {
    await page.goto("/es", { waitUntil: "networkidle" });
    await page.evaluate(() => window.scrollTo(0, 900));
    const contact = page.getByRole("button", { name: "Contactar a José Ignacio" });
    await contact.click();
    await expect(contact).toHaveAttribute("aria-expanded", "true");
    const card = page.getByRole("dialog", { name: "Contacto directo" });
    await expect(card).toBeVisible();
    await expect(card.getByText("Activo ahora")).toBeVisible();
    const wa = card.getByRole("link", { name: "Escribir por WhatsApp" });
    expect(decodeURIComponent((await wa.getAttribute("href")) ?? "")).toContain("https://wa.me/56951730743?text=Hola José Ignacio");
    await expect(wa).toHaveAttribute("target", "_blank");
    await expect(card.getByRole("link", { name: "Ir al formulario" })).toHaveAttribute("href", "/es/contacto");
    await expect(card.getByRole("link", { name: "Enviar un correo" })).toHaveAttribute("href", /^mailto:contact@acmora\.com\?subject=/);
    await expect(card.locator("img")).toHaveAttribute("title", /.{10,}/);
    // La tarjeta se abre hacia la derecha del boton (esquina izquierda) y no tapa a volver arriba.
    const cardBox = await card.boundingBox();
    const btnBox = await contact.boundingBox();
    if (!cardBox || !btnBox) throw new Error("sin cajas");
    expect(Math.round(cardBox.x)).toBe(Math.round(btnBox.x));
    expect(cardBox.y + cardBox.height).toBeLessThan(btnBox.y);
    const r = await new AxeBuilder({ page }).exclude("[data-decorative]").withTags(["wcag2a", "wcag2aa", "wcag22aa"]).analyze();
    expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`)).toEqual([]);
    await page.keyboard.press("Escape");
    await expect(card).toBeHidden();
    await expect(contact).toBeFocused();
  });

  test("un clic fuera cierra la tarjeta y en ingles todo esta en ingles", async ({ page }) => {
    await page.goto("/en", { waitUntil: "networkidle" });
    const contact = page.getByRole("button", { name: "Contact José Ignacio" });
    await contact.click();
    const card = page.getByRole("dialog", { name: "Direct contact" });
    await expect(card).toBeVisible();
    await expect(card.getByText("Active now")).toBeVisible();
    await expect(card.getByRole("link", { name: "Write on WhatsApp" })).toBeVisible();
    await expect(card.getByRole("link", { name: "Go to the form" })).toHaveAttribute("href", "/en/contact");
    await page.mouse.click(5, 300);
    await expect(card).toBeHidden();
  });
});

test.describe("pagina FAQ: enlace profundo desde el buscador", () => {
  test("un hash de pregunta abre esa respuesta", async ({ page }) => {
    await page.goto("/es/preguntas-frecuentes", { waitUntil: "networkidle" });
    const id = await page.locator("details[data-faq]").nth(1).getAttribute("id");
    expect(id).toMatch(/^faq-/);
    await page.goto(`/es/preguntas-frecuentes#${id}`, { waitUntil: "networkidle" });
    await expect(page.locator(`details#${id}`)).toHaveJSProperty("open", true);
    await expect(page).toHaveURL(/#faq-/);
  });
});

test.describe("servicios: resumen directo con descripcion, lo que se recibe y los planes a la vista", () => {
  for (const [path, receive, more, less, plan] of [
    ["/es/servicios", "Lo que vas a recibir", /Ver \d+ más/, "Ver menos", "Básico"],
    ["/en/services", "What you will receive", /Show \d+ more/, "Show less", "Basic"],
  ] as const) {
    test(`${path}: al elegir Landing Page se ve la descripcion, lo que recibe en una tarjeta y los precios, sin la linea de Desde y Entrega desde`, async ({ page }) => {
      await page.goto(path, { waitUntil: "networkidle" });
      const panel = page.getByRole("tabpanel").first();
      await expect(panel.getByText(receive)).toBeVisible();
      await expect(panel.getByText(/^(Desde|From) \$/)).toHaveCount(0);
      await expect(panel.getByText(/(Entrega desde|Delivery from)/)).toHaveCount(0);
      // La tarjeta muestra los primeros y el resto se despliega.
      const rows = panel.locator("ul li:visible").filter({ has: page.locator("svg") });
      const shown = await rows.count();
      expect(shown).toBeGreaterThanOrEqual(4);
      await panel.getByText(more).click();
      await expect(panel.getByText(less)).toBeVisible();
      await expect.poll(() => rows.count()).toBeGreaterThan(shown);
      // Los planes (con precio) quedan justo debajo del resumen, a la vista sin bajar mucho.
      const price = panel.getByRole("heading", { name: plan }).first();
      await price.scrollIntoViewIfNeeded();
      await expect(price).toBeVisible();
      await expect(panel.getByText(/\$\s?\d/).first()).toBeVisible();
    });
  }
});

test.describe("cotizador: listas desplegables en su lugar tras volver del paso 2", () => {
  test("al volver al paso 1, la lista del pais y la del servicio se abren justo bajo su campo", async ({ page }) => {
    await page.goto("/es/servicios/landing-page", { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Cotizar plan Básico" }).click();
    const dialog = page.getByRole("dialog", { name: "Solicita tu cotización" });
    await dialog.getByLabel(/Nombre completo o empresa/).fill("Ana Pérez");
    await dialog.getByLabel(/^Teléfono/).fill("951730743");
    await dialog.getByLabel(/Cuéntanos sobre el proyecto/).fill("Necesito una landing para mi negocio.");
    await dialog.getByRole("checkbox", { name: /He leído y acepto/ }).check();
    await dialog.getByRole("button", { name: "Siguiente" }).click();
    await expect(dialog.getByTestId("quote-step-2")).toBeVisible();
    await dialog.getByRole("button", { name: "Atrás" }).click();
    await expect(dialog.getByLabel(/Nombre completo o empresa/)).toBeVisible();
    // Espera a que termine la transicion de entrada del paso 1.
    await page.waitForTimeout(500);

    const under = async (field: ReturnType<typeof dialog.getByRole>) => {
      await field.click();
      const list = dialog.getByRole("listbox");
      await expect(list).toBeVisible();
      const f = await field.boundingBox();
      const l = await list.boundingBox();
      if (!f || !l) throw new Error("sin cajas");
      // Pegada al campo (debajo o, si no cabe, encima) y alineada a su borde izquierdo.
      const gap = Math.min(Math.abs(l.y - (f.y + f.height)), Math.abs(f.y - (l.y + l.height)));
      expect(gap).toBeLessThan(16);
      expect(Math.abs(l.x - f.x)).toBeLessThan(24);
      await page.keyboard.press("Escape");
      await expect(list).toBeHidden();
    };
    await under(dialog.getByRole("combobox", { name: /código del país|Código de país|Country/i }));
    await under(dialog.getByRole("combobox", { name: /Servicio/ }));
  });
});

test.describe("oferta irresistible: promesa, resultado medible, precio, garantias y cupos", () => {
  test("la pagina de un servicio sigue el orden de venta y los cupos son accesibles", async ({ page }) => {
    await page.goto("/es/servicios/landing-page", { waitUntil: "networkidle" });
    const h2 = await page.locator("main h2").allTextContents();
    const at = (t: string) => h2.findIndex((x) => x.trim() === t);
    expect(at("Cómo sabrás que funcionó")).toBeGreaterThan(-1);
    expect(at("Cómo sabrás que funcionó")).toBeLessThan(at("Planes"));
    expect(at("Planes")).toBeLessThan(at("Nuestras garantías"));
    const cupos = page.getByRole("region", { name: /^Cupos de / });
    await expect(cupos).toContainText(/Quedan? \d de \d cupos|completos/);
    await expect(cupos.getByRole("img", { name: /tomados y \d+ libres/ })).toBeVisible();
    await expect(cupos.getByRole("link", { name: "Reservar mi cupo" })).toHaveAttribute("href", "/es/contacto");
    for (const t of ["Diseño aprobado o te devolvemos el anticipo", "Entrega a tiempo o descuento", "Velocidad garantizada", "Fallas corregidas sin costo"]) {
      await expect(page.getByRole("heading", { name: t })).toBeVisible();
    }
  });

  test("el cotizador muestra el bono del mes y lo incluye en el mensaje", async ({ page }) => {
    await page.addInitScript(() => {
      (window as unknown as { __opened: string[] }).__opened = [];
      document.addEventListener(
        "click",
        (e) => {
          const a = (e.target as Element | null)?.closest("a[href]") as HTMLAnchorElement | null;
          if (a && a.href.startsWith("https://wa.me/")) {
            (window as unknown as { __opened: string[] }).__opened.push(a.href);
            e.preventDefault();
          }
        },
        true,
      );
    });
    await page.goto("/es/servicios/landing-page", { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Cotizar plan Básico" }).click();
    const dialog = page.getByRole("dialog", { name: "Solicita tu cotización" });
    await dialog.getByLabel(/Nombre completo o empresa/).fill("Ana Pérez");
    await dialog.getByLabel(/^Teléfono/).fill("951730743");
    await dialog.getByLabel(/Cuéntanos sobre el proyecto/).fill("Necesito una landing para mi negocio.");
    await dialog.getByRole("checkbox", { name: /He leído y acepto/ }).check();
    await dialog.getByRole("button", { name: "Siguiente" }).click();
    const bonus = dialog.getByTestId("quote-bonus");
    await expect(bonus).toContainText("1 mes extra de soporte sin costo");
    await dialog.getByRole("button", { name: "Enviar por WhatsApp" }).click();
    const [wa] = await page.evaluate(() => (window as unknown as { __opened: string[] }).__opened);
    expect(new URL(wa ?? "").searchParams.get("text") ?? "").toContain("1 mes extra de soporte sin costo");
  });

  test("los terminos recogen las garantias y el bono, y el inicio cierra con garantias y cupos", async ({ page }) => {
    await page.goto("/es/terminos", { waitUntil: "networkidle" });
    for (const t of ["Diseño aprobado o devolución del anticipo", "Entrega a tiempo", "Google PageSpeed Insights", "Cupos y bono del mes"]) await expect(page.locator("main")).toContainText(t);
    await page.goto("/es", { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { name: "Nuestras garantías" })).toBeVisible();
    await expect(page.getByRole("region", { name: /^Cupos de / })).toBeVisible();
    await page.goto("/en/services/landing-page", { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { name: "How you will know it worked" })).toBeVisible();
    await expect(page.getByRole("region", { name: / slots$/ })).toContainText(/left|full/);
  });
});

test.describe("buenas practicas de Lighthouse: sin errores en consola ni violaciones de CSP", () => {
  for (const path of ["/es", "/es/servicios/landing-page", "/es/proyectos", "/en/contact"]) {
    test(`${path}: ni errores en consola ni recursos 404 ni violaciones de CSP`, async ({ page }) => {
      const errors: string[] = [];
      page.on("console", (m) => {
        if (m.type() === "error") errors.push(m.text());
      });
      page.on("response", (r) => {
        if (r.status() >= 400 && new URL(r.url()).origin === new URL(page.url() || r.url()).origin) errors.push(`${r.status()} ${r.url()}`);
      });
      await page.addInitScript(() => {
        document.addEventListener("securitypolicyviolation", (e) => console.error(`CSP ${e.violatedDirective} ${e.sourceFile}:${e.lineNumber}`));
      });
      await page.goto(path, { waitUntil: "networkidle" });
      await page.waitForTimeout(800);
      expect(errors).toEqual([]);
    });
  }

  test("llms.txt lista cada pagina con su version en texto plano", async ({ request }) => {
    const res = await request.get("/llms.txt");
    expect(res.status()).toBe(200);
    const txt = await res.text();
    expect(txt).toMatch(/^# Acmora/);
    expect(txt).toContain("/raw/es/services/landing-page.md");
    expect(txt).toContain("/raw/en/index.md");
  });
});

test.describe("head: iconos, manifest, logo e imagen para enlaces", () => {
  test("el head declara favicons, icono de Apple, manifest e imagen Open Graph, y todos responden", async ({ page, request }) => {
    await page.goto("/es", { waitUntil: "domcontentloaded" });
    const hrefs = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLLinkElement>('link[rel="icon"], link[rel="apple-touch-icon"], link[rel="manifest"]')].map((l) => `${l.rel} ${l.getAttribute("sizes") ?? ""} ${new URL(l.href).pathname}`),
    );
    for (const h of ["icon any /favicon.ico", "icon 32x32 /favicon-32x32.png", "icon 16x16 /favicon-16x16.png", "apple-touch-icon 180x180 /apple-touch-icon.png"]) expect(hrefs).toContain(h);
    expect(hrefs.some((h) => h.startsWith("manifest") && h.endsWith("/site.webmanifest"))).toBe(true);
    const og = await page.locator('meta[property="og:image"]').first().getAttribute("content");
    expect(og).toMatch(/opengraph-image/);
    for (const url of ["/favicon.ico", "/favicon-32x32.png", "/favicon-16x16.png", "/apple-touch-icon.png", "/android-chrome-192x192.png", "/android-chrome-512x512.png", "/images/logo/acmora-logo.svg", "/images/logo/acmora-logo-dark.svg", "/images/logo/acmora-logo-isotypebg.png", new URL(og ?? "").pathname]) {
      expect((await request.get(url)).status(), url).toBe(200);
    }
    const manifest = await (await request.get("/site.webmanifest")).json();
    expect(manifest).toMatchObject({ name: "Acmora", short_name: "Acmora", start_url: "/" });
    expect(manifest.icons.map((i: { sizes: string }) => i.sizes)).toEqual(["192x192", "512x512"]);
  });

  test("la organizacion declara su logo en los datos estructurados y la marca es Acmora en todo el sitio", async ({ page }) => {
    await page.goto("/es", { waitUntil: "domcontentloaded" });
    const ld = await page.locator('script[type="application/ld+json"]').first().textContent();
    expect(ld).toContain("acmora-logo-isotypebg.png");
    expect(ld).toContain("contact@acmora.com");
    expect(await page.content()).not.toMatch(/acmera/i);
    await expect(page.locator("header img").first()).toHaveAttribute("alt", "Acmora");
  });
});
