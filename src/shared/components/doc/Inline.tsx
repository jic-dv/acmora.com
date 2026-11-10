import type { Locale } from "@/i18n/routing";
import { parseInline, resolveTarget } from "@/shared/lib/inline";
import AppLink from "@/shared/components/core/AppLink";

export default function Inline({ text, locale }: { text: string; locale: Locale }) {
  return (
    <>
      {parseInline(text).map((t, i) => {
        switch (t.kind) {
          case "text":
            return t.text;
          case "strong":
            return <strong key={i}>{t.text}</strong>;
          case "code":
            return <code key={i}>{t.text}</code>;
          case "link":
            return (
              <AppLink key={i} href={resolveTarget(t.target, locale).href} title={t.title ?? t.text}>
                {t.text}
              </AppLink>
            );
        }
      })}
    </>
  );
}
