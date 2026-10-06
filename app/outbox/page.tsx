import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { notFound } from "next/navigation";
import { OUTBOX_DIR } from "@/lib/email";

export const dynamic = "force-dynamic";

export default async function Outbox({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const { id } = await searchParams;

  const files = await readdir(OUTBOX_DIR).catch(() => [] as string[]);
  const mails = (
    await Promise.all(
      files
        .filter((f) => f.endsWith(".html"))
        .map(async (f) => {
          const full = path.join(OUTBOX_DIR, f);
          const head = (await readFile(full, "utf8")).split("\n", 1)[0];
          return { file: f, time: (await stat(full)).mtimeMs, subject: head.match(/subject: (.*) -->/)?.[1] ?? f };
        }),
    )
  ).sort((a, b) => b.time - a.time);

  const selected = mails.find((m) => m.file === id) ?? mails[0];
  const html = selected ? await readFile(path.join(OUTBOX_DIR, selected.file), "utf8") : "";
  const pdfId = selected?.file.replace(/\.html$/, "");
  const hasPdf = pdfId ? files.includes(`${pdfId}.pdf`) : false;

  return (
    <main className="outbox">
      <aside>
        <h1>Local outbox</h1>
        <p>Emails the lawyer would receive. Shown here because RESEND_API_KEY is blank. Development only.</p>
        {mails.length === 0 && <p>No emails yet. Submit the form first.</p>}
        <ul>
          {mails.map((m) => (
            <li key={m.file} className={m.file === selected?.file ? "is-active" : undefined}>
              <a href={`/outbox?id=${encodeURIComponent(m.file)}`}>
                <span dangerouslySetInnerHTML={{ __html: m.subject }} />
                <small>{new Date(m.time).toLocaleString("en-ZA")}</small>
              </a>
            </li>
          ))}
        </ul>
        {hasPdf && (
          <p>
            <a href={`/outbox/pdf?id=${encodeURIComponent(pdfId!)}`} target="_blank" rel="noreferrer">
              View PDF attachment ↗
            </a>
          </p>
        )}
        <a href="/">← Back to form</a>
      </aside>
      {selected && <iframe title="Email preview" srcDoc={html} sandbox="" />}
    </main>
  );
}
