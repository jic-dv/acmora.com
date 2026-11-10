import { describe, expect, it } from "vitest";
import { formatClp, formatDate, formatUf } from "./format";

const plain = (s: string) => s.replace(/ /g, " ");

describe("format", () => {
  it("CLP sin decimales con separador de miles chileno", () => {
    expect(plain(formatClp(1490000, "es"))).toBe("$1.490.000");
  });
  it("UF con dos decimales", () => {
    expect(formatUf(2.5, "es")).toBe("2,50 UF");
    expect(formatUf(2.5, "en")).toBe("2.50 UF");
  });
  it("fecha ISO en UTC sin corrimiento de dia", () => {
    expect(formatDate("2026-11-04", "es")).toBe("4 de noviembre de 2026");
    expect(formatDate("2026-11-04", "en")).toBe("November 4, 2026");
  });
});
