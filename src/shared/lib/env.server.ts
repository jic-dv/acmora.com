import "server-only";
import { z } from "@/shared/lib/z";

const schema = z.object({
  CONTACT_WEBHOOK_URL: z.url().startsWith("https://").optional(),
});

const parsed = schema.safeParse({
  CONTACT_WEBHOOK_URL: process.env.CONTACT_WEBHOOK_URL || undefined,
});
if (!parsed.success) {
  throw new Error(`Variables de entorno de servidor invalidas: ${z.prettifyError(parsed.error)}`);
}

export const serverEnv = parsed.data;
