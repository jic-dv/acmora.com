// El JSON-LD es un bloque de datos (type application/ld+json): no ejecuta JS y CSP no lo restringe.
// Se escapa "<" para que ningun valor pueda cerrar la etiqueta script.
export default function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
