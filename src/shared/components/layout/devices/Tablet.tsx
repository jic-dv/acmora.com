"use client";

import { Check, Search } from "lucide-react";
import { m } from "motion/react";
import { Bar, BLUE, Gauge100, INK, useLate, type DevicesCopy } from "./shared";

/** Pantalla de la tablet (vertical, proporcion de iPad): 192 x 286 px de diseno. */
export const TABLET_W = 192;
export const TABLET_H = 286;

/**
 * Analizador de sitios web (al estilo de Lighthouse o PageSpeed): se pega el dominio en el buscador, se pulsa "Analizar", una barra
 * de progreso avanza y aparecen los medidores que cuentan hasta 100 junto con las metricas principales.
 */
export default function Tablet({ d, step }: { d: DevicesCopy["report"]; step: number }) {
  const late = useLate(step, 600);
  const pasted = step >= 1;
  const analyzing = late >= 2 && step < 4;
  const results = step >= 4;
  const metrics = step >= 5;

  return (
    <div className="relative overflow-hidden bg-[#f4f6fb] text-[#1f2430]" style={{ width: TABLET_W, height: TABLET_H }}>
      {/* Cabecera con degradado */}
      <div className="absolute inset-x-0 top-0 h-[64px] px-3.5 pt-3.5" style={{ background: "linear-gradient(135deg,#0645e8 0%,#4f46e5 60%,#7c3aed 100%)" }}>
        <p className="text-[11px] font-bold text-white">{d.title}</p>
        <span className="mt-1.5 block">
          <Bar w={70} c="rgba(255,255,255,.35)" h={3} />
        </span>
      </div>

      {/* Buscador: aqui se "pega" el dominio */}
      <div className="absolute inset-x-2.5 top-[46px] z-10 flex h-[34px] items-center gap-1.5 rounded-full bg-white pl-2.5 pr-1.5 shadow-[0_6px_18px_rgba(6,69,232,.22)]">
        <Search size={11} className="shrink-0 text-[#5a6072]" />
        <span className="min-w-0 flex-1 truncate text-[8.5px]">
          {pasted ? (
            <m.span key="pasted" className="rounded-[3px] px-0.5 font-medium" initial={{ backgroundColor: "#cfe0ff", opacity: 0 }} animate={{ backgroundColor: "rgba(207,224,255,0)", opacity: 1 }} transition={{ opacity: { duration: 0.15 }, backgroundColor: { duration: 0.5, delay: 0.9 } }}>
              {d.url}
            </m.span>
          ) : (
            <span className="text-[#5a6072]">{d.placeholder}</span>
          )}
        </span>
        {step === 1 ? (
          <m.span className="absolute -top-4 right-3 rounded-[5px] bg-[#1f2430] px-1.5 py-0.5 text-[7px] font-semibold text-white" initial={{ opacity: 0, y: 4 }} animate={{ opacity: [0, 1, 1, 0], y: 0 }} transition={{ duration: 1.2, times: [0, 0.15, 0.7, 1] }}>
            Ctrl V
          </m.span>
        ) : null}
        <m.span
          className="relative grid h-[24px] shrink-0 place-items-center overflow-hidden rounded-full px-2.5 text-[8px] font-semibold text-white"
          style={{ background: "linear-gradient(90deg,#0645e8,#4f46e5)" }}
          animate={{ scale: step === 2 ? [1, 1, 0.9, 1] : 1 }}
          transition={{ duration: 0.5, delay: 0.5, times: [0, 0.4, 0.6, 1] }}
        >
          {step === 2 ? <m.span key="tap" className="absolute inset-0 rounded-full bg-white/60" initial={{ scale: 0.3, opacity: 0 }} animate={{ scale: 1.8, opacity: [0, 0.8, 0] }} transition={{ duration: 0.6, delay: 0.6 }} /> : null}
          <span className="relative">{d.analyze}</span>
        </m.span>
      </div>

      {/* Contenido */}
      <div className="absolute inset-x-0 bottom-0 top-[88px] px-3.5">
        {!analyzing && !results ? (
          <div className="grid justify-items-center gap-2 pt-6">
            <span className="grid size-[62px] place-items-center rounded-full border-[5px] border-dashed border-[#d5dbea]" />
            <Bar w={86} />
            <Bar w={58} />
          </div>
        ) : null}

        {analyzing ? (
          <m.div className="grid gap-2.5 pt-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <p className="flex items-center justify-center gap-1.5 text-[9px] font-semibold" style={{ color: BLUE }}>
              <span className="size-3 animate-spin rounded-full border-2 border-[#cfd9f5] border-t-[#0645e8]" />
              {d.analyzing}
            </p>
            <span className="block h-1.5 overflow-hidden rounded-full bg-[#dfe5f4]">
              <m.span className="block h-full origin-left rounded-full" style={{ background: "linear-gradient(90deg,#0645e8,#7c3aed)" }} initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 3.4, ease: "easeInOut" }} />
            </span>
            {[0, 1, 2].map((i) => (
              <m.span key={i} className="flex items-center gap-2" animate={{ opacity: [0.45, 1, 0.45] }} transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}>
                <span className="size-6 rounded-full bg-[#e3e8f5]" />
                <span className="grid flex-1 gap-1">
                  <Bar w="80%" h={4} />
                  <Bar w="50%" h={3} />
                </span>
              </m.span>
            ))}
          </m.div>
        ) : null}

        {results ? (
          <m.div className="grid justify-items-center pt-0.5" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <Gauge100 label={d.main} r={24} stroke={5} delay={0} big />
            <div className="mt-2 grid w-full grid-cols-3 justify-items-center">
              {d.others.map((label, i) => (
                <Gauge100 key={label} label={label} r={12} stroke={3} delay={0.2 * (i + 1)} />
              ))}
            </div>
            {metrics ? (
              <m.div className="mt-2 grid w-full gap-1" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                {d.metrics.map((mt, i) => (
                  <div key={mt.label}>
                    <p className="flex items-center justify-between text-[7px]" style={{ color: INK }}>
                      <span className="flex items-center gap-1 text-[#5f6368]">
                        <Check size={7} strokeWidth={3} className="text-[#0cce6b]" />
                        {mt.label}
                      </span>
                      <span className="font-semibold text-[#0b7a3b]">{mt.value}</span>
                    </p>
                    <span className="mt-0.5 block h-[3px] overflow-hidden rounded-full bg-[#dfe5f4]">
                      <m.span className="block h-full origin-left rounded-full bg-[#0cce6b]" initial={{ scaleX: 0 }} animate={{ scaleX: mt.pct / 100 }} transition={{ duration: 0.7, delay: 0.15 * i, ease: "easeOut" }} />
                    </span>
                  </div>
                ))}
              </m.div>
            ) : null}
          </m.div>
        ) : null}
      </div>
    </div>
  );
}
