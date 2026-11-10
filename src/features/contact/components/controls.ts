/**
 * Clase compartida de los controles (input, select, textarea) del campo estilo Google. El control no dibuja borde ni
 * fondo: el contorno lo pinta el <fieldset> de `Field`, que sigue al control en el DOM y reacciona con `peer-*`.
 * Sin anillo de foco propio: el borde de 2 px azul del contorno es el indicador de foco (un solo borde).
 */
export const controlClass = "peer block min-h-12 w-full rounded-field border-0 bg-transparent px-4 py-3 text-[0.9375rem] text-ink outline-none placeholder:text-transparent focus-visible:outline-none aria-[invalid=true]:pr-12";
