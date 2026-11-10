import { describe, expect, it } from "vitest";
import { onlyDigits } from "./digits";

describe("onlyDigits", () => {
  it("conserva solo digitos", () => {
    expect(onlyDigits("9 5173-0743")).toBe("951730743");
    expect(onlyDigits("+56 (9) 5173 0743")).toBe("56951730743");
    expect(onlyDigits("abc")).toBe("");
    expect(onlyDigits("12e3.4")).toBe("1234");
  });
});
