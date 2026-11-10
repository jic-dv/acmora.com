import { projectsMock } from "@/mocks/projects";
import { projectSchema, type Project } from "../schemas/project";

// Punto unico de acceso. Pasar de mock a API real es cambiar esta funcion. Mas recientes primero.
const projects: Project[] = projectsMock.map((p) => projectSchema.parse(p)).sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));

export const getProjects = (): Project[] => projects;
