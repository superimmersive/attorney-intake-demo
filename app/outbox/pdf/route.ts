import { readFile } from "node:fs/promises";
import path from "node:path";
import { OUTBOX_DIR } from "@/lib/email";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (process.env.NODE_ENV === "production") return new Response("Not found", { status: 404 });
  const id = new URL(req.url).searchParams.get("id") ?? "";
  if (!/^INT-\d{8}-[A-Z0-9]{4}$/.test(id)) return new Response("Not found", { status: 404 });
  try {
    const pdf = await readFile(path.join(OUTBOX_DIR, `${id}.pdf`));
    return new Response(new Uint8Array(pdf), {
      headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${id}.pdf"` },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
