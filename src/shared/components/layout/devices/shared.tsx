"use client";

import { animate, m, useMotionValue, useTransform } from "motion/react";
import { useEffect, useState } from "react";

/** Textos de la maqueta (decorativa: ningun dato es real). Cada dispositivo cuenta una historia distinta. */
export type DevicesCopy = {
  store: {
    name: string;
    search: string;
    products: { name: string; price: string }[];
    add: string;
    added: string;
    cartTitle: string;
    total: string;
    totalValue: string;
    checkout: string;
    payTitle: string;
    steps: string[];
    fields: { label: string; value: string }[];
    pay: string;
    success: string;
    successText: string;
    order: string;
  };
  report: {
    title: string;
    url: string;
    placeholder: string;
    analyze: string;
    analyzing: string;
    main: string;
    others: string[];
    metrics: { label: string; value: string; pct: number }[];
  };
  phone: {
    name: string;
    heroTitle: string;
    heroText: string;
    plansTitle: string;
    plans: { name: string; tag: string }[];
    choose: string;
    chosen: string;
    chat: { name: string; status: string; message: string; reply: string; placeholder: string };
  };
};

/**
 * Guion comun (ms por escena). Los tres dispositivos leen la misma escena y cuentan su historia a la vez:
 *  0 inicio | 1 notebook agrega el 1.o, tablet pega el dominio, celular baja a los planes | 2 agrega el 2.o, analiza, planes a la vista |
 *  3 abre el carrito, carga el analisis, toca "Estandar" | 4 va al pago, resultados, abre WhatsApp y escribe | 5 llena el pago,
 *  metricas, envia | 6 procesa el pago, "escribiendo" | 7 pago exitoso, todo en verde, respuesta | 8 se funde y empieza de nuevo.
 */
export const STEPS = [1500, 1800, 1800, 2200, 1800, 2600, 1500, 3200, 900] as const;
/** Escena de reposo con movimiento reducido: la mas completa de las tres historias. */
export const REST = 7;

export const EASE = [0.45, 0, 0.2, 1] as const;
export const BLUE = "#0645e8";
export const INK = "#1f2430";

/** Reloj maestro: avanza la escena mientras la maqueta esta a la vista. Con movimiento reducido queda en la escena de reposo. */
export function useScene(active: boolean, still: boolean) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (!active || still) return;
    let s = 0;
    let t: ReturnType<typeof setTimeout>;
    const tick = () => {
      t = setTimeout(() => {
        s = (s + 1) % STEPS.length;
        setStep(s);
        tick();
      }, STEPS[s]);
    };
    tick();
    return () => clearTimeout(t);
  }, [active, still]);
  return still ? REST : step;
}

/** La escena, pero `ms` despues de empezar: sirve para que algo ocurra cuando el cursor ya llego. Si la escena retrocede, vuelve al instante. */
export function useLate(value: number, ms: number) {
  const [late, setLate] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setLate(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return value < late ? value : late;
}

/** Texto que se escribe solo (a velocidad constante) desde que aparece en pantalla. */
export function Typed({ text, delay = 0, duration = 1 }: { text: string; delay?: number; duration?: number }) {
  const n = useMotionValue(0);
  const shown = useTransform(n, (v) => text.slice(0, Math.round(v)));
  useEffect(() => {
    const c = animate(n, text.length, { duration, delay, ease: "linear" });
    return () => c.stop();
  }, [n, text, duration, delay]);
  return <m.span>{shown}</m.span>;
}

/** Cursor con onda de clic: se mueve a (x, y) dentro de la pantalla y pulsa `clickDelay` segundos despues de llegar. */
export function Cursor({ x, y, click, clickDelay, stepKey }: { x: number; y: number; click: boolean; clickDelay: number; stepKey: number }) {
  return (
    <m.div
      className="pointer-events-none absolute left-0 top-0 z-30"
      initial={false}
      animate={{ x, y, scale: click ? [1, 1, 0.8, 1] : 1 }}
      transition={{ x: { duration: 0.9, ease: EASE }, y: { duration: 0.9, ease: EASE }, scale: { duration: 0.4, delay: click ? clickDelay : 0, times: [0, 0.3, 0.6, 1] } }}
    >
      {click ? (
        <m.span
          key={stepKey}
          className="absolute -left-3 -top-3 size-6 rounded-full bg-[#4285f4]/50"
          initial={{ scale: 0, opacity: 0.9 }}
          animate={{ scale: 1.9, opacity: 0 }}
          transition={{ duration: 0.6, delay: clickDelay }}
        />
      ) : null}
      <svg width="16" height="20" viewBox="0 0 16 20" className="relative drop-shadow-[0_2px_3px_rgba(0,0,0,.35)]">
        <path d="M1.5 1.5v14.2l3.8-3.5 2.6 5.6 2.4-1.1-2.6-5.5h5.2z" fill="#202124" stroke="#fff" strokeWidth="1.4" strokeLinejoin="round" />
      </svg>
    </m.div>
  );
}

/** Medidor circular estilo Lighthouse: cuenta de 0 a 100 al aparecer y cambia de rojo a naranja y verde. */
export function Gauge100({ label, r, stroke, delay, big }: { label: string; r: number; stroke: number; delay: number; big?: boolean }) {
  const v = useMotionValue(0);
  const C = 2 * Math.PI * r;
  const offset = useTransform(v, (x) => C * (1 - x / 100));
  const color = useTransform(v, [0, 49, 50, 89, 90, 100], ["#ff4e42", "#ff4e42", "#ffa400", "#ffa400", "#0cce6b", "#0cce6b"]);
  const ink = useTransform(v, [0, 49, 50, 89, 90, 100], ["#c5221f", "#c5221f", "#a04a00", "#a04a00", "#0b7a3b", "#0b7a3b"]);
  const bg = useTransform(v, [0, 49, 50, 89, 90, 100], ["#fff0ee", "#fff0ee", "#fff6e0", "#fff6e0", "#e6faf0", "#e6faf0"]);
  const text = useTransform(v, (x) => String(Math.round(x)));

  useEffect(() => {
    const c = animate(v, 100, { duration: 1.6, delay, ease: [0.22, 1, 0.36, 1] });
    return () => c.stop();
  }, [v, delay]);

  const box = (r + stroke) * 2;
  return (
    <div className="grid justify-items-center gap-0.5">
      <div className="relative" style={{ width: box, height: box }}>
        <m.svg viewBox={`0 0 ${box} ${box}`} width={box} height={box} className="absolute inset-0 -rotate-90">
          <m.circle cx={box / 2} cy={box / 2} r={r} fill="none" stroke="#e8eaed" strokeWidth={stroke} />
          <m.circle cx={box / 2} cy={box / 2} r={r} fill="none" strokeWidth={stroke} strokeLinecap="round" strokeDasharray={C} style={{ strokeDashoffset: offset, stroke: color }} />
        </m.svg>
        <m.div className="absolute inset-[3px] grid place-items-center rounded-full" style={{ backgroundColor: bg }}>
          <m.span className={big ? "text-[22px] font-medium leading-none" : "text-[10px] font-medium leading-none"} style={{ color: ink }}>
            {text}
          </m.span>
        </m.div>
      </div>
      <span className={big ? "text-[9px] font-medium text-[#3c4043]" : "max-w-[46px] text-center text-[6px] leading-tight text-[#5f6368]"}>{label}</span>
    </div>
  );
}

/** Barra gris de relleno que imita una linea de texto. */
export const Bar = ({ w, c = "#e3e7ef", h = 4 }: { w: number | string; c?: string; h?: number }) => <span className="block rounded-full" style={{ width: w, height: h, background: c }} />;
