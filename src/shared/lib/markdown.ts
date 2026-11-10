import type { Locale } from "@/i18n/routing";
import type { Block, Doc } from "./doc";
import { parseInline, resolveTarget } from "./inline";

export function inlineToMarkdown(input: string, locale: Locale, siteUrl: string): string {
  return parseInline(input)
    .map((t) => {
      if (t.kind === "text") return t.text;
      if (t.kind === "strong") return `**${t.text}**`;
      if (t.kind === "code") return `\`${t.text}\``;
      const r = resolveTarget(t.target, locale);
      const href = r.kind === "internal" ? siteUrl + r.href : r.href;
      return `[${t.text}](${href})`;
    })
    .join("");
}

function blockToMarkdown(b: Block, md: (s: string) => string, link: (label: string, target: string) => string): string {
  switch (b.type) {
    case "p":
      return md(b.text);
    case "note":
      return `> ${md(b.text)}`;
    case "ul":
      return b.items.map((i) => `- ${md(i)}`).join("\n");
    case "ol":
      return b.items.map((i, n) => `${n + 1}. ${md(i)}`).join("\n");
    case "dl":
      return b.items.map((i) => `- **${i.term}**: ${md(i.desc)}`).join("\n");
    case "steps":
      return b.items.map((i, n) => `${n + 1}. **${i.title}**: ${md(i.text)}`).join("\n");
    case "cards":
      return b.items
        .map((i) => `- ${i.text ? `**${i.title}**: ${md(i.text)}` : i.title}${i.href && i.linkLabel ? ` ${link(i.linkLabel, i.href)}` : ""}`)
        .join("\n");
    case "capacity":
      return [`**${b.heading}**: ${b.status}`, md(b.text), ...(b.bonus ? [b.bonus] : []), link(b.action.label, b.action.href)].join("\n\n");
    case "overview":
      return [md(b.text), `**${b.heading}**`, b.items.map((i) => `- ${md(i)}`).join("\n")].join("\n\n");
    case "plans":
      return b.items
        .map((p) =>
          [
            `### ${p.name}`,
            `${p.price} (${p.priceNote}). ${md(p.audience).replace(/\.$/, "")}. ${p.timeframe}.`,
            ...p.includes.map((i) => `- ${md(i)}`),
            ...(p.detail
              ? [
                  "",
                  `#### ${p.detail.heading}`,
                  ...p.detail.sections.flatMap((sec) => [
                    "",
                    `**${sec.heading}**`,
                    ...(sec.text ? ["", md(sec.text)] : []),
                    ...(sec.rows ? ["", ...sec.rows.map(([k, v]) => `- ${k}: ${md(v)}`)] : []),
                    ...(sec.items ? ["", ...sec.items.map((i) => `- ${md(i)}`)] : []),
                  ]),
                  "",
                ]
              : []),
            link(p.ctaLabel, p.href),
          ].join("\n"),
        )
        .join("\n\n");
    case "columns":
      return b.items.map((c) => [`### ${c.heading}`, md(c.text), ...c.links.map((l) => `- ${link(l.label, l.href)}${l.meta ? ` (${l.meta})` : ""}`), link(c.action.label, c.action.href)].join("\n\n")).join("\n\n");
    case "feature":
      return [`### ${b.heading}`, ...b.highlights.map((h) => `- ${h.label}`), link(b.action.label, b.action.href)].join("\n\n");
    case "iconrow":
      return [`### ${b.heading}`, ...b.items.map((i) => `- **${i.label}**: ${md(i.text)}`)].join("\n\n");
    case "timeline":
      return b.items.map((i, n) => `${n + 1}. **${i.title}**: ${md(i.text)}`).join("\n");
    case "projects":
      return b.items.map((p) => `- **[${p.title}](${p.url})** (${p.statusLabel}, ${p.date}): ${p.description}`).join("\n");
    case "tabs":
      return b.items.map((t) => [`### ${t.label}`, ...t.blocks.map((x) => blockToMarkdown(x, md, link))].join("\n\n")).join("\n\n");
    case "faq":
      return b.items.map((i) => ["### " + i.q, md(i.a)].join(String.fromCharCode(10))).join(String.fromCharCode(10, 10));
    case "table": {
      const esc = (s: string) => md(s).replaceAll("|", "\\|");
      return [
        `**${b.caption}**`,
        "",
        `| ${b.head.map(esc).join(" | ")} |`,
        `| ${b.head.map(() => "---").join(" | ")} |`,
        ...b.rows.map((r) => `| ${r.map(esc).join(" | ")} |`),
      ].join("\n");
    }
  }
}

export function docToMarkdown(doc: Doc, locale: Locale, siteUrl: string, canonical: string): string {
  const md = (s: string) => inlineToMarkdown(s, locale, siteUrl);
  const link = (label: string, target: string) => md(`[${label}](${target})`);
  const parts = [`# ${doc.title}`, md(doc.lead)];
  for (const s of doc.sections) {
    parts.push(`## ${s.heading}`);
    if (s.intro) parts.push(md(s.intro));
    parts.push(...s.blocks.map((b) => blockToMarkdown(b, md, link)));
    if (s.action) parts.push(link(s.action.label, s.action.href));
  }
  if (doc.cta) parts.push(`## ${doc.cta.title}`, md(doc.cta.text), link(doc.cta.primary.label, doc.cta.primary.href));
  parts.push(`---\nFuente: ${canonical}`);
  return parts.join("\n\n") + "\n";
}
