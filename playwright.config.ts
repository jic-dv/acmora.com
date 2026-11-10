import { defineConfig, devices } from "@playwright/test";

const PORT = 3200;

// Requiere un build previo: npm run build (con NEXT_PUBLIC_INDEXING_ENABLED=true para auditar SEO).
// Usa el Chrome instalado en el sistema (channel "chrome") para no descargar navegadores.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  retries: 0,
  // El servidor dinamico (CSP con nonce) y la navegacion entre idiomas son sensibles a la carga: 4 trabajadores evitan falsos negativos.
  workers: 4,
  // Con 8 trabajadores en paralelo el primer renderizado dinamico puede tardar; 20 s evita falsos negativos.
  expect: { timeout: 20_000 },
  timeout: 60_000,
  reporter: [["list"]],
  use: { baseURL: `http://localhost:${PORT}`, channel: "chrome", trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], channel: "chrome" } },
    { name: "mobile", use: { ...devices["Pixel 7"], channel: "chrome" } },
  ],
  webServer: {
    command: `npx next start -p ${PORT}`,
    port: PORT,
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
