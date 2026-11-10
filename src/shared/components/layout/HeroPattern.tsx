// Red neuronal minimalista: pocas capas y nodos, cada uno unido solo a sus dos vecinos mas cercanos de la capa siguiente.
const LAYERS: { x: number; ys: number[] }[] = [
  { x: 110, ys: [170, 330, 490] },
  { x: 300, ys: [100, 250, 400, 550] },
  { x: 500, ys: [160, 330, 500] },
  { x: 680, ys: [260, 420] },
];

// Camino resaltado (capa, nodo) con un pulso animado: la "senal" que atraviesa la red.
const PATH: [number, number][] = [
  [0, 1],
  [1, 1],
  [2, 1],
  [3, 0],
];

/**
 * Patron del hero: una red neuronal esquematica en trazo fino y baja opacidad sobre el azul de marca. Evoca software e
 * inteligencia artificial sin competir con el texto. Decorativo: oculto a lectores de pantalla.
 */
export default function HeroPattern() {
  const edges = LAYERS.slice(0, -1).flatMap((layer, li) => {
    const next = LAYERS[li + 1];
    if (!next) return [];
    return layer.ys.flatMap((y1) =>
      [...next.ys]
        .sort((a, b) => Math.abs(a - y1) - Math.abs(b - y1))
        .slice(0, 2)
        .map((y2) => ({ x1: layer.x, y1, x2: next.x, y2, key: `${li}-${y1}-${y2}` })),
    );
  });
  const route = PATH.map(([l, n]) => ({ x: LAYERS[l]?.x ?? 0, y: LAYERS[l]?.ys[n] ?? 0 }));

  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 800 680"
      preserveAspectRatio="xMaxYMid slice"
      className="hero-pattern pointer-events-none absolute inset-y-0 right-0 -z-10 h-full w-full text-white opacity-60 [mask-image:linear-gradient(to_right,transparent,#000_38%)] md:w-[62%] md:opacity-100"
    >
      <g stroke="currentColor" strokeOpacity="0.1" strokeWidth="1">
        {edges.map((e) => (
          <line key={e.key} x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2} />
        ))}
      </g>
      <polyline points={route.map((p) => `${p.x},${p.y}`).join(" ")} fill="none" stroke="currentColor" strokeOpacity="0.4" strokeWidth="1.5" strokeLinejoin="round" className="hero-pulse" />
      <g>
        {LAYERS.flatMap((layer, li) =>
          layer.ys.map((y, ni) => {
            const onRoute = PATH.some(([l, n]) => l === li && n === ni);
            return onRoute ? (
              <g key={`${li}-${ni}`}>
                <circle cx={layer.x} cy={y} r="13" fill="currentColor" fillOpacity="0.08" />
                <circle cx={layer.x} cy={y} r="5.5" fill="currentColor" fillOpacity="0.85" />
              </g>
            ) : (
              <circle key={`${li}-${ni}`} cx={layer.x} cy={y} r="3.5" fill="currentColor" fillOpacity="0.28" />
            );
          }),
        )}
      </g>
    </svg>
  );
}
