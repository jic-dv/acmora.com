"use client";

import dynamic from "next/dynamic";
import { useSyncExternalStore } from "react";
import type { DevicesCopy } from "./HeroDevices";

const placeholder = <div aria-hidden="true" className="aspect-[760/432] w-full" />;

// La maqueta animada (motion) se descarga aparte y despues de pintar el hero: no retrasa el titular ni la carga inicial.
const HeroDevices = dynamic(() => import("./HeroDevices"), { ssr: false, loading: () => placeholder });

// Solo se muestra desde pantallas anchas (el contenedor es `hidden lg:block`): en celulares ni siquiera se descarga.
const WIDE = "(min-width: 1024px)";
const subscribe = (notify: () => void) => {
  const m = window.matchMedia(WIDE);
  m.addEventListener("change", notify);
  return () => m.removeEventListener("change", notify);
};
const isWide = () => window.matchMedia(WIDE).matches;

export default function HeroAside({ copy }: { copy: DevicesCopy }) {
  const wide = useSyncExternalStore(subscribe, isWide, () => false);
  return wide ? <HeroDevices copy={copy} /> : placeholder;
}
