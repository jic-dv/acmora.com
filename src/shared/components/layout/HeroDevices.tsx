"use client";

import { LazyMotion, domAnimation, m, useInView, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import Laptop, { LAPTOP_H, LAPTOP_W } from "./devices/Laptop";
import Phone, { PHONE_H, PHONE_W } from "./devices/Phone";
import { useScene, type DevicesCopy } from "./devices/shared";
import Tablet, { TABLET_H, TABLET_W } from "./devices/Tablet";

export type { DevicesCopy } from "./devices/shared";

// Tamano de diseno de la composicion; se escala al ancho disponible.
const W = 760;
const H = 432;

/** El notebook se dibuja a 390 x 244 y se amplia: asi el contenido conserva sus medidas y el equipo se ve mas grande. */
const LAPTOP_SCALE = 1.12;
const SCREEN_W = Math.round(LAPTOP_W * LAPTOP_SCALE);
const SCREEN_H = Math.round(LAPTOP_H * LAPTOP_SCALE);

// Lenguaje comun de los tres equipos: marco negro con filo metalico fino, bordes delgados y parejos y sombra larga.
const FRAME = "bg-[#101216] ring-1 ring-[#9aa1b3]/45 shadow-[0_30px_50px_-16px_rgba(0,12,60,.7),inset_0_0_0_1px_rgba(255,255,255,.07)]";

/** Pantalla que se funde a transparente en la ultima escena, para reiniciar la historia sin saltos. */
function Fade({ step, children }: { step: number; children: ReactNode }) {
  return (
    <m.div initial={false} animate={{ opacity: step === 8 ? 0 : 1 }} transition={{ duration: 0.4 }}>
      {children}
    </m.div>
  );
}

/** Dispositivo que flota apenas (sube y baja unos pixeles, cada uno a su ritmo) para que la composicion no se vea rigida. */
function Float({ left, top, seconds, delay, still, children }: { left: number; top: number; seconds: number; delay: number; still: boolean; children: ReactNode }) {
  return (
    <m.div className="absolute" style={{ left, top }} animate={still ? undefined : { y: [0, -7, 0] }} transition={{ duration: seconds, delay, repeat: Infinity, ease: "easeInOut" }}>
      {children}
    </m.div>
  );
}

/**
 * Maqueta animada: tres equipos estilo Apple (MacBook, iPad e iPhone: mismo marco delgado, camara y filo metalico, cada uno con su
 * proporcion y detalle) escalonados a distinta altura, que cuentan una historia a la vez guiados por un mismo reloj. Notebook: una
 * tienda en linea (agrega al carrito, paga y recibe la confirmacion). Tablet: se pega un dominio, se analiza y aparecen los
 * medidores de rendimiento. Celular: el sitio, sus planes, y al elegir uno se abre WhatsApp con el mensaje. Decorativa (aria-hidden e inert: fuera del foco, de los lectores y de las auditorias de contraste): se oculta
 * a lectores de pantalla y no usa datos reales. Se pausa fuera de pantalla y, con "reducir movimiento", queda quieta en la escena
 * mas completa.
 */
export default function HeroDevices({ copy }: { copy: DevicesCopy }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref);
  const reduce = useReducedMotion() ?? false;
  const step = useScene(inView, reduce);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setScale(Math.min(1.15, el.clientWidth / W)));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const stage: CSSProperties = { width: W, height: H, transform: `scale(${scale})`, transformOrigin: "top left" };
  const bodyW = SCREEN_W + 14;

  return (
    <LazyMotion features={domAnimation} strict>
      <div ref={ref} aria-hidden="true" inert data-decorative="" className="relative w-full" style={{ height: H * scale }}>
        <div className="absolute left-0 top-0" style={stage}>
          {/* Notebook (MacBook): arriba al centro */}
          <Float left={192} top={10} seconds={6} delay={0} still={reduce}>
            <div className="relative" style={{ width: bodyW }}>
              <div className={`relative rounded-[14px] p-[7px] ${FRAME}`}>
                <span className="absolute left-1/2 top-[2px] size-[3px] -translate-x-1/2 rounded-full bg-[#2a2e38]" />
                <div className="overflow-hidden rounded-[5px] bg-white" style={{ width: SCREEN_W, height: SCREEN_H }}>
                  <Fade step={step}>
                    <div style={{ width: SCREEN_W, height: SCREEN_H }}>
                      <div style={{ width: LAPTOP_W, height: LAPTOP_H, transform: `scale(${LAPTOP_SCALE})`, transformOrigin: "top left" }}>
                        <Laptop d={copy.store} step={step} still={reduce} />
                      </div>
                    </div>
                  </Fade>
                </div>
              </div>
              {/* Base con la muesca para levantar la tapa */}
              <div className="relative h-[11px] rounded-b-[16px] ring-1 ring-[#8a90a0]/40" style={{ width: bodyW + 52, marginLeft: -26, background: "linear-gradient(180deg,#eceff4 0%,#c3c8d2 70%,#a9afbb 100%)" }}>
                <span className="absolute left-1/2 top-0 h-[4px] w-[72px] -translate-x-1/2 rounded-b-[6px] bg-[#9aa1b0]/80" />
              </div>
            </div>
          </Float>

          {/* Tablet (iPad): abajo a la izquierda */}
          <Float left={0} top={126} seconds={7} delay={1.2} still={reduce}>
            <div className={`relative rounded-[26px] p-[9px] ${FRAME}`}>
              <span className="absolute left-1/2 top-[3px] size-[3px] -translate-x-1/2 rounded-full bg-[#2a2e38]" />
              {/* Boton superior */}
              <span className="absolute -top-[2px] right-10 h-[2px] w-8 rounded-t-sm bg-[#9aa1b3]/70" />
              <div className="overflow-hidden rounded-[17px] bg-white" style={{ width: TABLET_W, height: TABLET_H }}>
                <Fade step={step}>
                  <Tablet d={copy.report} step={step} />
                </Fade>
              </div>
            </div>
          </Float>

          {/* Celular (iPhone): a la derecha y mas abajo */}
          <Float left={646} top={170} seconds={5.5} delay={0.6} still={reduce}>
            <div className={`relative rounded-[30px] p-[6px] ${FRAME}`}>
              {/* Botones laterales */}
              <span className="absolute -left-[2px] top-12 h-5 w-[2px] rounded-l-sm bg-[#9aa1b3]/70" />
              <span className="absolute -left-[2px] top-[76px] h-5 w-[2px] rounded-l-sm bg-[#9aa1b3]/70" />
              <span className="absolute -right-[2px] top-[62px] h-8 w-[2px] rounded-r-sm bg-[#9aa1b3]/70" />
              <div className="relative overflow-hidden rounded-[24px] bg-white" style={{ width: PHONE_W, height: PHONE_H }}>
                <span className="absolute left-1/2 top-[5px] z-40 h-[7px] w-7 -translate-x-1/2 rounded-full bg-[#101216]" />
                <Fade step={step}>
                  <Phone d={copy.phone} step={step} />
                </Fade>
              </div>
            </div>
          </Float>
        </div>
      </div>
    </LazyMotion>
  );
}
