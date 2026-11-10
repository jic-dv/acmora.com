import { servicesMock } from "@/mocks/services";
import { serviceSchema, type PlanService, type Service } from "../schemas/service";

// Punto unico de acceso. Pasar de mock a API real es cambiar esta funcion.
const services: Service[] = servicesMock.map((s) => serviceSchema.parse(s));

export const getServices = (): Service[] => services;

export const getService = (slug: string): Service | undefined => services.find((s) => s.slug === slug);

export const getPlanServices = (): PlanService[] => services.filter((s): s is PlanService => s.kind === "plans");
