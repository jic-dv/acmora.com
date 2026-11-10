import { z } from "zod";

// La CSP del sitio no permite eval. Sin esto, Zod prueba `new Function` al validar y el navegador registra una violacion de CSP
// (Lighthouse la reporta como error en consola). Todo el proyecto importa `z` desde aqui.
z.config({ jitless: true });

export { z };
