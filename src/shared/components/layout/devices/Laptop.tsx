"use client";

import { Backpack, Check, CreditCard, Headphones, Lock, Search, ShoppingCart, Watch } from "lucide-react";
import { m } from "motion/react";
import type { ReactNode } from "react";
import { Bar, BLUE, Cursor, INK, Typed, useLate, type DevicesCopy } from "./shared";

/** Pantalla del notebook: 390 x 244 px de diseno. */
export const LAPTOP_W = 390;
export const LAPTOP_H = 244;
const NAV = 30;

// Cursor por escena: reposo, "Agregar" 1.o, "Agregar" 2.o, carrito, "Ir al pago", "Pagar", y se retira.
const CURSOR: readonly (readonly [number, number])[] = [
  [330, 205],
  [75, 189],
  [201, 189],
  [362, 15],
  [302, 190],
  [127, 203],
  [127, 203],
  [250, 215],
  [250, 215],
];
const THUMBS = ["linear-gradient(135deg,#6366f1,#a78bfa)", "linear-gradient(135deg,#f97316,#fbbf24)", "linear-gradient(135deg,#0ea5e9,#2dd4bf)"] as const;
const ICONS = [Headphones, Watch, Backpack] as const;

function Thumb({ i, size }: { i: number; size: number }) {
  const Icon = ICONS[i] ?? Headphones;
  return (
    <span className="relative grid shrink-0 place-items-center overflow-hidden rounded-[8px] text-white" style={{ width: size, height: size, background: THUMBS[i] }}>
      <span className="absolute -right-2 -top-2 size-1/2 rounded-full bg-white/25" />
      <Icon size={size * 0.45} strokeWidth={1.8} />
    </span>
  );
}

function Pay({ children, busy, done }: { children: ReactNode; busy: boolean; done?: boolean }) {
  return (
    <m.span
      className="relative flex h-[22px] w-full items-center justify-center gap-1.5 overflow-hidden rounded-full text-[9px] font-semibold text-white"
      animate={{ backgroundColor: done ? "#0f7d3f" : BLUE }}
      transition={{ duration: 0.3 }}
    >
      {busy ? <span className="size-3 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : <Lock size={9} />}
      {children}
    </m.span>
  );
}

/**
 * Tienda en linea de ejemplo en el notebook: se agregan dos productos (vuelan al carrito), se abre el carrito, se va al pago,
 * se llenan los datos, se paga y aparece la confirmacion. Todo guiado por la escena maestra y un cursor.
 */
export default function Laptop({ d, step, still }: { d: DevicesCopy["store"]; step: number; still: boolean }) {
  const late = useLate(step, 1000);
  const landed = useLate(step, 1600);
  const count = landed >= 2 ? 2 : landed >= 1 ? 1 : 0;
  const view = step >= 7 ? "success" : late >= 4 ? "checkout" : "store";
  const drawer = view === "store" && late === 3;
  const [cx, cy] = CURSOR[step] ?? [0, 0];
  const click = step >= 1 && step <= 5;
  const priced = d.products.slice(0, 2);

  return (
    <div className="relative bg-[#f4f6fb] text-[#1f2430]" style={{ width: LAPTOP_W, height: LAPTOP_H }}>
      {/* Barra superior */}
      <div className="absolute inset-x-0 top-0 z-20 flex items-center gap-3 border-b border-[#e6e9f2] bg-white px-4" style={{ height: NAV }}>
        <span className="flex items-center gap-1.5 text-[10px] font-bold" style={{ color: INK }}>
          <span className="size-3.5 rounded-[5px]" style={{ background: "linear-gradient(135deg,#0645e8,#7c3aed)" }} />
          {d.name}
        </span>
        <span className="mx-auto flex h-5 w-[150px] items-center gap-1.5 rounded-full bg-[#eef1f8] px-2 text-[7.5px] text-[#5a6072]">
          <Search size={9} />
          {d.search}
        </span>
        <m.span key={landed} className="relative grid size-6 place-items-center rounded-full text-[#3c4256]" animate={{ scale: landed > 0 ? [1, 1.3, 1] : 1 }} transition={{ duration: 0.4 }}>
          <ShoppingCart size={13} />
          {count > 0 ? <span className="absolute -right-0.5 -top-0.5 grid size-3.5 place-items-center rounded-full bg-[#d93036] text-[7px] font-bold text-white">{count}</span> : null}
        </m.span>
      </div>

      <div className="absolute inset-x-0 bottom-0 overflow-hidden" style={{ top: NAV }}>
        {view === "store" ? (
          <div className="px-[18px] pt-2.5">
            <div className="grid grid-cols-3 gap-3">
              {d.products.map((p, i) => {
                const added = late >= i + 1 && i < 2;
                return (
                  <m.div key={p.name} className="rounded-[10px] bg-white p-2 shadow-[0_1px_3px_rgba(31,36,48,.08)]" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.1, duration: 0.45 }}>
                    <span className="block">
                      <Thumb i={i} size={98} />
                    </span>
                    <p className="mt-1.5 truncate text-[8.5px] font-semibold">{p.name}</p>
                    <p className="text-[8.5px] font-bold" style={{ color: BLUE }}>
                      {p.price}
                    </p>
                    <m.span
                      className="mt-1 flex h-[18px] items-center justify-center gap-1 rounded-full text-[7.5px] font-semibold"
                      animate={{ backgroundColor: added ? "#e6f7ee" : "#eaf0ff", color: added ? "#0b7a3b" : BLUE }}
                      transition={{ duration: 0.25 }}
                    >
                      {added ? <Check size={9} strokeWidth={3} /> : null}
                      {added ? d.added : d.add}
                    </m.span>
                  </m.div>
                );
              })}
            </div>
            {/* Producto que vuela al carrito */}
            {late === 1 || late === 2 ? (
              <m.span
                key={`fly-${late}`}
                className="absolute z-10 grid size-5 place-items-center rounded-full text-white"
                style={{ background: THUMBS[late - 1] }}
                initial={{ left: late === 1 ? 65 : 191, top: 150, scale: 1, opacity: 1 }}
                animate={{ left: 356, top: -22, scale: 0.4, opacity: 0.2 }}
                transition={{ duration: 0.6, ease: [0.5, 0, 0.7, 0.4] }}
              />
            ) : null}
          </div>
        ) : null}

        {/* Carrito lateral */}
        {drawer ? (
          <>
            <m.div className="absolute inset-0 bg-[#1f2430]/35" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} />
            <m.div
              className="absolute bottom-0 right-0 top-0 w-[176px] bg-white p-3 shadow-[-8px_0_24px_rgba(31,36,48,.18)]"
              initial={{ x: 180 }}
              animate={{ x: 0 }}
              transition={{ duration: 0.45, ease: [0.2, 0, 0, 1] }}
            >
              <p className="flex items-center gap-1.5 text-[10px] font-bold">
                <ShoppingCart size={11} style={{ color: BLUE }} />
                {d.cartTitle}
              </p>
              <div className="mt-2.5 grid gap-2">
                {priced.map((p, i) => (
                  <m.div key={p.name} className="flex items-center gap-2" initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + i * 0.12 }}>
                    <Thumb i={i} size={28} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[8px] font-semibold">{p.name}</span>
                      <span className="block text-[8px] font-bold" style={{ color: BLUE }}>
                        {p.price}
                      </span>
                    </span>
                  </m.div>
                ))}
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-[#e6e9f2] pt-2 text-[9px] font-semibold">
                <span>{d.total}</span>
                <span style={{ color: BLUE }}>{d.totalValue}</span>
              </div>
              <m.span className="mt-3 grid h-[22px] place-items-center rounded-full text-[9px] font-semibold text-white" style={{ background: "linear-gradient(90deg,#0645e8,#4f46e5)" }} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
                {d.checkout}
              </m.span>
            </m.div>
          </>
        ) : null}

        {/* Pago */}
        {view === "checkout" ? (
          <m.div className="absolute inset-0 px-[18px] pt-3" initial={{ opacity: 0, x: 22 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4 }}>
            <div className="flex items-center gap-2 text-[8px] font-semibold">
              {d.steps.map((s, i) => (
                <span key={s} className="flex items-center gap-1" style={{ color: i === 2 ? BLUE : "#5a6072" }}>
                  <span className="grid size-3.5 place-items-center rounded-full text-[7px] text-white" style={{ background: i === 2 ? BLUE : "#6b7388" }}>
                    {i + 1}
                  </span>
                  {s}
                  {i < 2 ? <span className="ml-1 h-px w-5 bg-[#cfd5e3]" /> : null}
                </span>
              ))}
            </div>
            <div className="mt-2.5 grid grid-cols-[218px_minmax(0,1fr)] gap-4">
              <div className="grid gap-2">
                {d.fields.map((f, i) => (
                  <div key={f.label}>
                    <p className="text-[7px] font-medium text-[#5a6072]">{f.label}</p>
                    <span className="mt-0.5 flex h-[22px] items-center gap-1.5 rounded-[6px] border border-[#d9deec] bg-white px-2 text-[8px]">
                      {i === 2 ? <CreditCard size={9} className="text-[#5a6072]" /> : null}
                      <Typed text={f.value} delay={0.2 + i * 0.5} duration={0.45} />
                    </span>
                  </div>
                ))}
                <Pay busy={step === 6}>{d.pay}</Pay>
              </div>
              <div className="rounded-[10px] bg-white p-2.5 shadow-[0_1px_3px_rgba(31,36,48,.08)]">
                <p className="text-[8px] font-bold">{d.payTitle}</p>
                <div className="mt-2 grid gap-1.5">
                  {priced.map((p, i) => (
                    <span key={p.name} className="flex items-center gap-1.5">
                      <Thumb i={i} size={18} />
                      <span className="min-w-0 flex-1">
                        <Bar w="90%" h={3} c="#c9d0e0" />
                        <span className="mt-1 block">
                          <Bar w="55%" h={3} />
                        </span>
                      </span>
                    </span>
                  ))}
                </div>
                <p className="mt-2 flex items-center justify-between border-t border-[#e6e9f2] pt-1.5 text-[8px] font-bold">
                  {d.total}
                  <span style={{ color: BLUE }}>{d.totalValue}</span>
                </p>
              </div>
            </div>
          </m.div>
        ) : null}

        {/* Confirmacion */}
        {view === "success" ? (
          <div className="absolute inset-0 grid place-items-center bg-gradient-to-b from-[#effaf3] to-white text-center">
            <div className="grid justify-items-center">
              <m.span className="grid size-14 place-items-center rounded-full bg-[#12a150] text-white shadow-[0_8px_20px_rgba(18,161,80,.4)]" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 280, damping: 16 }}>
                <svg viewBox="0 0 24 24" className="size-8" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <m.path d="M5 12.5l4.5 4.5L19 7.5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.5, delay: 0.25 }} />
                </svg>
              </m.span>
              <m.p className="mt-3 text-[13px] font-bold" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                {d.success}
              </m.p>
              <m.p className="mt-1 text-[8px] text-[#5f6368]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }}>
                {d.successText}
              </m.p>
              <m.span className="mt-2 rounded-full bg-white px-3 py-1 text-[8px] font-semibold shadow-[0_1px_3px_rgba(31,36,48,.12)]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
                {d.order}
              </m.span>
              {/* Confeti */}
              {still
                ? null
                : ["#6366f1", "#f97316", "#0ea5e9", "#12a150", "#f43f5e", "#fbbf24"].map((c, i) => (
                    <m.span
                      key={c}
                      className="absolute left-1/2 top-[44%] size-1.5 rounded-full"
                      style={{ background: c }}
                      initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                      animate={{ x: Math.cos((i / 6) * Math.PI * 2) * 70, y: Math.sin((i / 6) * Math.PI * 2) * 50, opacity: 0, scale: 0.4 }}
                      transition={{ duration: 0.9, delay: 0.25, ease: "easeOut" }}
                    />
                  ))}
            </div>
          </div>
        ) : null}
      </div>

      {still ? null : <Cursor x={cx} y={cy} click={click} clickDelay={step === 5 ? 1.5 : 0.9} stepKey={step} />}
    </div>
  );
}
