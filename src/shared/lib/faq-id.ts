/** Identificador estable de una pregunta frecuente (para enlazar a ella desde el buscador): sin tildes, en minusculas y con guiones. */
export const faqId = (question: string) =>
  "faq-" +
  question
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+/, "")
    .slice(0, 64)
    .replace(/-+$/, "");
