export type Theme = "light" | "dark";

export const THEME_KEY = "theme";

const isTheme = (v: unknown): v is Theme => v === "light" || v === "dark";

/** Preferencia guardada y, si no hay, claro: el tema por defecto es claro en todos los dispositivos (no se sigue al sistema). */
export function resolveTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    if (isTheme(stored)) return stored;
  } catch {
    // almacenamiento bloqueado: claro
  }
  return "light";
}

/** Tema que se esta mostrando ahora: el atributo si es valido; si falta (por ejemplo tras recrearse <html>), el resuelto. */
export function currentTheme(): Theme {
  const attr = document.documentElement.dataset.theme;
  return isTheme(attr) ? attr : resolveTheme();
}

function storedTheme(): Theme | null {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    return isTheme(stored) ? stored : null;
  } catch {
    return null;
  }
}

/** Restituye el tema en <html>: manda lo guardado; sin eso se conserva el atributo vigente; sin atributo, claro. */
export function syncTheme() {
  const attr = document.documentElement.dataset.theme;
  applyTheme(storedTheme() ?? (isTheme(attr) ? attr : resolveTheme()));
}

export function applyTheme(theme: Theme) {
  if (document.documentElement.dataset.theme !== theme) document.documentElement.dataset.theme = theme;
}
