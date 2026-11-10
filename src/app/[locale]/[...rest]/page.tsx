import { notFound } from "next/navigation";

// Cualquier ruta no declarada dentro de /es o /en cae aqui para renderizar el 404 localizado.
export default function CatchAll() {
  notFound();
}
