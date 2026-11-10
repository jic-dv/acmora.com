"use client";

import { ArrowLeft, Check, CheckCheck, Send } from "lucide-react";
import { m } from "motion/react";
import { BLUE, EASE, INK, Typed, useLate, type DevicesCopy } from "./shared";

/** Pantalla del celular: 98 x 216 px de diseno. */
export const PHONE_W = 98;
export const PHONE_H = 216;
const HEAD = 28;

const PLAN_TONE = [
  { bar: "#38bdf8", soft: "#e0f4ff" },
  { bar: "#0645e8", soft: "#e4ecff" },
  { bar: "#7c3aed", soft: "#efe6ff" },
] as const;

/**
 * Sitio de la empresa en el celular: baja hasta los planes, toca "Estandar" (se marca) y abre WhatsApp, donde el mensaje se escribe,
 * se envia y llega la respuesta. Los colores de WhatsApp son solo ambientacion; no usa su marca.
 */
export default function Phone({ d, step }: { d: DevicesCopy["phone"]; step: number }) {
  const late = useLate(step, 1200);
  const sent = useLate(step, 500) >= 5;
  const chosen = late >= 3;
  const chatOpen = step >= 4;
  const scroll = step >= 1 ? -92 : 0;

  return (
    <div className="relative overflow-hidden bg-white text-[#1f2430]" style={{ width: PHONE_W, height: PHONE_H }}>
      {/* Cabecera */}
      <div className="absolute inset-x-0 top-0 z-10 flex items-end justify-between border-b border-[#e6e9f2] bg-white px-2.5 pb-1.5" style={{ height: HEAD }}>
        <span className="flex items-center gap-1 text-[7px] font-bold" style={{ color: INK }}>
          <span className="size-2.5 rounded-[3px]" style={{ background: "linear-gradient(135deg,#0645e8,#7c3aed)" }} />
          {d.name}
        </span>
        <span className="grid gap-[2px]">
          <span className="h-[1.5px] w-3 bg-[#5f6368]" />
          <span className="h-[1.5px] w-3 bg-[#5f6368]" />
        </span>
      </div>

      {/* Pagina */}
      <div className="absolute inset-x-0 bottom-0 overflow-hidden" style={{ top: HEAD }}>
        <m.div animate={{ y: scroll }} transition={{ duration: 1.1, ease: EASE }} className="px-2 pt-2">
          <div className="relative h-[78px] overflow-hidden rounded-[10px] p-2.5" style={{ background: "linear-gradient(135deg,#0645e8,#5b5bf0 60%,#a78bfa)" }}>
            <span className="absolute -right-3 -top-3 size-14 rounded-full bg-white/15" />
            <span className="absolute -bottom-4 right-3 size-10 rounded-full bg-white/10" />
            <p className="relative w-[70px] text-[8.5px] font-bold leading-[1.15] text-white">{d.heroTitle}</p>
            <p className="relative mt-1 w-[70px] text-[5.5px] leading-snug text-white/95">{d.heroText}</p>
          </div>
          <p className="mt-3 text-[8px] font-bold">{d.plansTitle}</p>
          <div className="mt-1.5 grid gap-1.5">
            {d.plans.map((p, i) => {
              const tone = PLAN_TONE[i] ?? PLAN_TONE[0];
              const pick = i === 1;
              const on = pick && chosen;
              return (
                <m.div
                  key={p.name}
                  className="relative overflow-hidden rounded-[8px] border bg-white p-1.5 pl-2.5"
                  animate={{ borderColor: on ? BLUE : "#e6e9f2", boxShadow: on ? "0 4px 12px rgba(6,69,232,.25)" : "0 0 0 rgba(0,0,0,0)" }}
                  transition={{ duration: 0.3 }}
                >
                  <span className="absolute inset-y-0 left-0 w-1" style={{ background: tone.bar }} />
                  <p className="text-[7px] font-bold">{p.name}</p>
                  <p className="text-[5.5px] text-[#5f6368]">{p.tag}</p>
                  <m.span
                    className="relative mt-1.5 grid h-[14px] place-items-center overflow-hidden rounded-full text-[6px] font-semibold"
                    animate={{ backgroundColor: on ? "#0f7d3f" : tone.soft, color: on ? "#ffffff" : tone.bar === "#38bdf8" ? "#0b6fa0" : tone.bar }}
                    transition={{ duration: 0.25 }}
                  >
                    {pick && step === 3 ? <m.span key="tap" className="absolute inset-0 rounded-full bg-[#0645e8]/40" initial={{ scale: 0.2, opacity: 0 }} animate={{ scale: 2, opacity: [0, 0.8, 0] }} transition={{ duration: 0.6, delay: 1.1 }} /> : null}
                    <span className="relative flex items-center gap-0.5">
                      {on ? <Check size={6} strokeWidth={3} /> : null}
                      {on ? d.chosen : d.choose}
                    </span>
                  </m.span>
                </m.div>
              );
            })}
          </div>
        </m.div>
      </div>

      {/* Dedo que toca el plan */}
      {step === 3 ? (
        <m.span
          key="finger"
          className="pointer-events-none absolute z-20 size-4 rounded-full border border-white bg-[#1f2430]/35"
          style={{ left: 41, top: 146 }}
          initial={{ opacity: 0, y: 18, scale: 1 }}
          animate={{ opacity: [0, 1, 1, 0], y: [18, 0, 0, 0], scale: [1, 1, 0.8, 1] }}
          transition={{ duration: 1.5, times: [0, 0.35, 0.8, 1], ease: "easeOut" }}
        />
      ) : null}

      {/* WhatsApp */}
      <m.div className="absolute inset-0 z-30 bg-[#ece5dd]" initial={false} animate={{ x: chatOpen ? 0 : PHONE_W + 4 }} transition={{ duration: 0.5, ease: [0.2, 0, 0, 1] }}>
        <div className="flex h-[30px] items-end gap-1 bg-[#075e54] px-1.5 pb-1 text-white">
          <ArrowLeft size={8} />
          <span className="grid size-[14px] place-items-center rounded-full bg-gradient-to-br from-[#0645e8] to-[#7c3aed] text-[7px] font-bold">A</span>
          <span className="leading-none">
            <span className="block text-[7px] font-semibold">{d.chat.name}</span>
            <span className="block text-[5px] text-white/95">{d.chat.status}</span>
          </span>
        </div>
        <div className="absolute inset-x-0 bottom-[26px] top-[30px] overflow-hidden px-1.5 py-2">
          {sent ? (
            <m.div className="ml-auto w-fit max-w-[72px] rounded-[6px] rounded-tr-none bg-[#dcf8c6] px-1.5 py-1 shadow-sm" initial={{ opacity: 0, y: 8, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.3 }}>
              <p className="text-[6.5px] leading-snug">{d.chat.message}</p>
              <p className="mt-0.5 flex justify-end">
                <CheckCheck size={7} className={step >= 6 ? "text-[#34b7f1]" : "text-[#5a6072]"} />
              </p>
            </m.div>
          ) : null}
          {step === 6 ? (
            <div className="mt-1.5 flex w-fit gap-0.5 rounded-[6px] rounded-tl-none bg-white px-1.5 py-1.5 shadow-sm">
              {[0, 1, 2].map((i) => (
                <m.span key={i} className="size-[3px] rounded-full bg-[#5a6072]" animate={{ y: [0, -2, 0] }} transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.15 }} />
              ))}
            </div>
          ) : null}
          {step >= 7 ? (
            <m.div className="mt-1.5 w-fit max-w-[66px] rounded-[6px] rounded-tl-none bg-white px-1.5 py-1 shadow-sm" initial={{ opacity: 0, y: 8, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.3 }}>
              <p className="text-[6.5px] leading-snug">{d.chat.reply}</p>
            </m.div>
          ) : null}
        </div>
        <div className="absolute inset-x-0 bottom-0 flex h-[26px] items-center gap-1 px-1.5">
          <span className="flex h-[16px] min-w-0 flex-1 items-center overflow-hidden rounded-full bg-white px-1.5 text-[6px]">
            {step === 4 ? <Typed text={d.chat.message} delay={0.5} duration={1.2} /> : <span className="text-[#5a6072]">{d.chat.placeholder}</span>}
          </span>
          <m.span className="grid size-[16px] shrink-0 place-items-center rounded-full bg-[#25d366] text-white" animate={{ scale: step === 5 ? [1, 0.8, 1] : 1 }} transition={{ duration: 0.3, delay: 0.1 }}>
            <Send size={7} />
          </m.span>
        </div>
      </m.div>

    </div>
  );
}
