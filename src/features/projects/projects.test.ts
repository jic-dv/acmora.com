import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { projectsMock } from "@/mocks/projects";
import { projectSchema } from "./schemas/project";
import { getProjects } from "./services/projects";

describe("proyectos del portafolio", () => {
  it("cada proyecto del mock valida con el schema real", () => {
    for (const p of projectsMock) expect(projectSchema.safeParse(p).success, p.slug).toBe(true);
  });
  it("los slugs y las direcciones son unicos y https", () => {
    const slugs = projectsMock.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    const urls = projectsMock.map((p) => p.url);
    expect(new Set(urls).size).toBe(urls.length);
    for (const u of urls) expect(u.startsWith("https://")).toBe(true);
  });
  it("incluye proyectos en produccion y en demostracion", () => {
    const statuses = new Set(projectsMock.map((p) => p.status));
    expect(statuses.has("production")).toBe(true);
    expect(statuses.has("demo")).toBe(true);
  });
  it("cada portada existe en /public", () => {
    for (const p of projectsMock) expect(existsSync(path.join(process.cwd(), "public", p.cover)), p.cover).toBe(true);
  });
  it("el servicio los entrega del mas reciente al mas antiguo", () => {
    const dates = getProjects().map((p) => p.publishedAt);
    expect(dates).toEqual([...dates].sort((a, b) => b.localeCompare(a)));
  });
  it("rechaza datos invalidos", () => {
    const base = projectsMock[0];
    expect(projectSchema.safeParse({ ...base, url: "http://inseguro.test" }).success).toBe(false);
    expect(projectSchema.safeParse({ ...base, publishedAt: "05/11/2026" }).success).toBe(false);
    expect(projectSchema.safeParse({ ...base, status: "archivado" }).success).toBe(false);
    expect(projectSchema.safeParse({ ...base, tags: [] }).success).toBe(false);
  });
});
