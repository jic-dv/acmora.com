import { describe, expect, it } from "vitest";
import { parseInline, resolveTarget } from "./inline";
import { inlineToMarkdown } from "./markdown";

describe("parseInline", () => {
  it("separa texto, negrita, codigo y enlaces con title", () => {
    expect(parseInline("a **b** `c` [d|e](page:/about)")).toEqual([
      { kind: "text", text: "a " },
      { kind: "strong", text: "b" },
      { kind: "text", text: " " },
      { kind: "code", text: "c" },
      { kind: "text", text: " " },
      { kind: "link", text: "d", title: "e", target: "page:/about" },
    ]);
  });
});

describe("resolveTarget", () => {
  it("localiza rutas internas por idioma", () => {
    expect(resolveTarget("page:/services", "es").href).toBe("/es/servicios");
    expect(resolveTarget("page:/services", "en").href).toBe("/en/services");
    expect(resolveTarget("service:mi-servicio", "es").href).toBe("/es/servicios/mi-servicio");
  });
  it("conserva el ancla", () => {
    expect(resolveTarget("page:/services#x", "en").href).toBe("/en/services#x");
  });
  it("rechaza protocolos no permitidos", () => {
    expect(() => resolveTarget("javascript:alert(1)", "es")).toThrow();
    expect(() => resolveTarget("http://inseguro.test", "es")).toThrow();
  });
});

describe("inlineToMarkdown", () => {
  it("genera enlaces absolutos", () => {
    expect(inlineToMarkdown("[x|t](page:/pricing)", "en", "https://a.test")).toBe("[x](https://a.test/en/pricing)");
  });
});
