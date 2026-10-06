import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Intake } from "./intake";
import type { Overview, SummaryResult } from "./summarise";

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const nl2br = (s: string) => esc(s).replace(/\n/g, "<br>");

const SEVERITY_COLOUR = { low: "#4b7a52", medium: "#b07a12", high: "#b3261e" } as const;

function section(title: string, body: string): string {
  if (!body) return "";
  return `<h2 style="font-size:15px;margin:24px 0 8px;color:#1b2a3a;border-bottom:1px solid #e3e6ea;padding-bottom:4px">${esc(title)}</h2>${body}`;
}

function bullets(items: string[]): string {
  const clean = items.filter((i) => typeof i === "string" && i.trim());
  if (!clean.length) return "";
  return `<ul style="margin:0;padding-left:20px">${clean.map((i) => `<li style="margin:3px 0">${esc(i)}</li>`).join("")}</ul>`;
}

function overviewHtml(o: Overview): string {
  const badge = (level: keyof typeof SEVERITY_COLOUR, label = level) =>
    `<span style="display:inline-block;padding:1px 8px;border-radius:10px;font-size:12px;font-weight:600;color:#fff;background:${SEVERITY_COLOUR[level] ?? "#666"}">${esc(label)}</span>`;

  const table = (head: string[], rows: string[][]) =>
    rows.length
      ? `<table style="border-collapse:collapse;width:100%;font-size:14px"><tr>${head
          .map((h) => `<th style="text-align:left;padding:6px 8px;background:#f3f5f7;border:1px solid #e3e6ea">${esc(h)}</th>`)
          .join("")}</tr>${rows
          .map((r) => `<tr>${r.map((c) => `<td style="padding:6px 8px;border:1px solid #e3e6ea;vertical-align:top">${c}</td>`).join("")}</tr>`)
          .join("")}</table>`
      : "";

  return [
    `<p style="margin:0 0 4px;font-size:13px;color:#5b6775">${esc(o.practice_area)}</p>`,
    `<h1 style="font-size:20px;margin:0 0 10px;color:#1b2a3a">${esc(o.matter_title)}</h1>`,
    `<p style="margin:0 0 12px">Urgency: ${badge(o.urgency)} ${esc(o.urgency_reason)}</p>`,
    `<p style="margin:0">${esc(o.summary)}</p>`,
    section(
      "Risks and flags",
      table(
        ["Severity", "Issue", "Why it matters"],
        o.risks.map((r) => [badge(SEVERITY_COLOUR[r.severity] ? r.severity : "medium"), esc(r.issue), esc(r.why)]),
      ),
    ),
    section("Time-sensitive – check dates", bullets(o.time_sensitive)),
    section("Missing information", bullets(o.missing_info)),
    section("Suggested questions for the client", bullets(o.questions_for_client)),
    section("Timeline (as stated by client)", table(["Date", "Event"], o.timeline.map((t) => [esc(t.date), esc(t.event)]))),
    section("Parties", table(["Name", "Role"], o.parties.map((p) => [esc(p.name), esc(p.role)]))),
    section("Key facts", bullets(o.key_facts)),
    section("Documents", table(["Document", "Notes"], o.documents.map((d) => [esc(d.description), esc(d.notes)]))),
    section("Names for conflict check", bullets(o.conflict_check_names)),
  ].join("");
}

function originalHtml(intake: Intake): string {
  const rows: [string, string][] = [
    ["Name", intake.name],
    ["Email", intake.email],
    ["Phone", intake.phone || "—"],
    ["Matter type", intake.matterType],
    ["Jurisdiction", intake.jurisdiction || "—"],
    ["What happened", intake.facts],
    ["Key dates", intake.dates || "—"],
    ["Other parties", intake.parties || "—"],
    ["Documents", intake.documents || "—"],
    ["Desired outcome", intake.outcome || "—"],
  ];
  return rows
    .map(([k, v]) => `<p style="margin:0 0 10px"><strong>${esc(k)}</strong><br>${nl2br(v)}</p>`)
    .join("");
}

export function buildLawyerEmail(reference: string, intake: Intake, result: SummaryResult) {
  const firm = process.env.FIRM_NAME || "Your firm";
  const subjectTitle = result.overview?.matter_title || intake.matterType;
  const urgency = result.overview?.urgency === "high" ? "[URGENT] " : "";
  const subject = `${urgency}New intake ${reference}: ${subjectTitle}`;

  const body = result.overview
    ? overviewHtml(result.overview)
    : `<p><em>The model did not return structured output. Raw response:</em></p><pre style="white-space:pre-wrap;font-family:inherit">${esc(result.raw)}</pre>`;

  const html = `<!doctype html><html><body style="margin:0;background:#f3f5f7;font-family:Segoe UI,Arial,sans-serif;color:#26313d;line-height:1.5">
<div style="max-width:720px;margin:0 auto;padding:24px">
<div style="background:#fff4e0;border:1px solid #f0c674;border-radius:6px;padding:10px 14px;font-size:13px;margin-bottom:16px">
<strong>AI-generated draft for internal review.</strong> Not legal advice and not verified. Check every point against the client's original submission below before relying on it. The client has not been sent this overview.
</div>
<div style="background:#fff;border:1px solid #e3e6ea;border-radius:6px;padding:24px">
<p style="margin:0 0 16px;font-size:12px;color:#5b6775">${esc(firm)} · Intake ${esc(reference)} · ${esc(new Date().toLocaleString("en-ZA"))} · Model ${esc(result.model)}</p>
${body}
${section("Client's original submission", originalHtml(intake))}
</div>
<p style="font-size:12px;color:#5b6775;margin-top:12px">A PDF copy of this overview is attached for the matter file. Reply-to is set to the client's address. Any reply is your own correspondence; do not forward this AI overview to the client.</p>
</div></body></html>`;

  const text = `AI-GENERATED DRAFT FOR INTERNAL REVIEW. Not legal advice. Verify against the original submission.

Intake ${reference}
${result.overview ? `${result.overview.matter_title}\nUrgency: ${result.overview.urgency} – ${result.overview.urgency_reason}\n\n${result.overview.summary}` : result.raw}

--- Original submission ---
Name: ${intake.name}
Email: ${intake.email}
Phone: ${intake.phone || "-"}
Matter type: ${intake.matterType}
Jurisdiction: ${intake.jurisdiction || "-"}

What happened:
${intake.facts}

Key dates:
${intake.dates || "-"}

Other parties:
${intake.parties || "-"}

Documents:
${intake.documents || "-"}

Desired outcome:
${intake.outcome || "-"}
`;

  return { subject, html, text };
}

export const OUTBOX_DIR = path.join(process.cwd(), ".outbox");

export async function sendToLawyer(
  reference: string,
  replyTo: string,
  mail: { subject: string; html: string; text: string },
  pdf: Buffer | null,
): Promise<{ delivered: "resend" | "outbox"; id: string }> {
  const to = (process.env.LAWYER_EMAIL ?? "")
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean);
  const resendKey = process.env.RESEND_API_KEY?.trim();

  if (!resendKey) {
    if (process.env.NODE_ENV === "production") throw new Error("RESEND_API_KEY is not set");
    await mkdir(OUTBOX_DIR, { recursive: true });
    const file = `${reference}.html`;
    const meta = `<!-- to: ${esc(to.join(", ") || "(LAWYER_EMAIL not set)")} | subject: ${esc(mail.subject)} -->\n`;
    await writeFile(path.join(OUTBOX_DIR, file), meta + mail.html, "utf8");
    if (pdf) await writeFile(path.join(OUTBOX_DIR, `${reference}.pdf`), pdf);
    return { delivered: "outbox", id: file };
  }

  if (!to.length) throw new Error("LAWYER_EMAIL is not set in .env");

  // One email per receiver, so a rejected address doesn't block delivery to the others
  // and receivers don't see each other's addresses.
  const attachments = pdf ? [{ filename: `${reference}.pdf`, content: pdf.toString("base64") }] : undefined;
  const results = await Promise.all(
    to.map(async (address) => {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM || "Intake Demo <onboarding@resend.dev>",
          to: [address],
          reply_to: replyTo,
          subject: mail.subject,
          html: mail.html,
          text: mail.text,
          attachments,
        }),
        signal: AbortSignal.timeout(20_000),
      }).catch((err: Error) => err);
      if (res instanceof Error) return { address, error: res.message };
      if (!res.ok) return { address, error: `Resend ${res.status}: ${(await res.text().catch(() => "")).slice(0, 300)}` };
      const data = await res.json().catch(() => ({}));
      return { address, id: String(data?.id ?? "") };
    }),
  );

  const sent = results.filter((r) => "id" in r);
  for (const r of results) if ("error" in r) console.error(`[intake] ${reference} not delivered to ${r.address}: ${r.error}`);
  if (!sent.length) throw new Error("No receiver accepted the email");
  return { delivered: "resend", id: sent.map((r) => r.id).join(", ") };
}
