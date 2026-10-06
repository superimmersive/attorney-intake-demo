import PDFDocument from "pdfkit";
import type { Intake } from "./intake";
import type { SummaryResult } from "./summarise";

const INK = "#1b2a3a";
const TEXT = "#26313d";
const MUTED = "#5b6775";
const LINE = "#d9dee3";
const HEAD_BG = "#f3f5f7";
const SEVERITY = { low: "#4b7a52", medium: "#b07a12", high: "#b3261e" } as const;

const MARGIN = 50;

// The built-in PDF fonts only cover WinAnsi; anything else would print as garbage.
function safe(value: unknown): string {
  return String(value ?? "")
    .replace(/[\u2018\u2019\u201B]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[^\n\x20-\x7E\xA0-\xFF\u2013\u2014\u2022\u2026\u20AC]/g, "?");
}

type Doc = PDFKit.PDFDocument;

function contentWidth(doc: Doc) {
  return doc.page.width - MARGIN * 2;
}

function ensureSpace(doc: Doc, height: number) {
  if (doc.y + height > doc.page.height - MARGIN - 20) doc.addPage();
}

function heading(doc: Doc, title: string) {
  ensureSpace(doc, 60);
  doc.moveDown(0.9);
  doc.font("Helvetica-Bold").fontSize(12).fillColor(INK).text(safe(title), MARGIN, doc.y);
  const y = doc.y + 3;
  doc.moveTo(MARGIN, y).lineTo(MARGIN + contentWidth(doc), y).lineWidth(0.7).strokeColor(LINE).stroke();
  doc.y = y + 8;
}

function paragraph(doc: Doc, text: string, opts: { size?: number; color?: string; bold?: boolean } = {}) {
  doc
    .font(opts.bold ? "Helvetica-Bold" : "Helvetica")
    .fontSize(opts.size ?? 10)
    .fillColor(opts.color ?? TEXT)
    .text(safe(text), MARGIN, doc.y, { width: contentWidth(doc), lineGap: 2 });
}

function bullets(doc: Doc, items: unknown[]) {
  const clean = items.filter((i): i is string => typeof i === "string" && !!i.trim());
  if (!clean.length) return false;
  const indent = 14;
  doc.font("Helvetica").fontSize(10).fillColor(TEXT);
  for (const item of clean) {
    const text = safe(item);
    const h = doc.heightOfString(text, { width: contentWidth(doc) - indent, lineGap: 2 });
    ensureSpace(doc, h + 4);
    const y = doc.y;
    doc.text("\u2022", MARGIN + 2, y);
    doc.text(text, MARGIN + indent, y, { width: contentWidth(doc) - indent, lineGap: 2 });
    doc.y += 3;
  }
  return true;
}

type Cell = string | { badge: keyof typeof SEVERITY };

function table(doc: Doc, head: string[], widths: number[], rows: Cell[][]) {
  if (!rows.length) return false;
  const total = contentWidth(doc);
  const cols = widths.map((w) => w * total);
  const pad = 6;

  const drawRow = (cells: Cell[], isHead: boolean) => {
    doc.font(isHead ? "Helvetica-Bold" : "Helvetica").fontSize(isHead ? 9 : 9.5);
    const heights = cells.map((c, i) =>
      typeof c === "string" ? doc.heightOfString(safe(c), { width: cols[i] - pad * 2, lineGap: 1.5 }) : 12,
    );
    const rowH = Math.max(...heights) + pad * 2;
    ensureSpace(doc, rowH);
    const y = doc.y;
    let x = MARGIN;
    if (isHead) doc.rect(MARGIN, y, total, rowH).fill(HEAD_BG);
    cells.forEach((c, i) => {
      if (typeof c === "string") {
        doc
          .font(isHead ? "Helvetica-Bold" : "Helvetica")
          .fillColor(isHead ? INK : TEXT)
          .text(safe(c), x + pad, y + pad, { width: cols[i] - pad * 2, lineGap: 1.5 });
      } else {
        const label = c.badge;
        doc.font("Helvetica-Bold").fontSize(8);
        const bw = doc.widthOfString(label) + 12;
        doc.roundedRect(x + pad, y + pad, bw, 12, 6).fill(SEVERITY[c.badge] ?? MUTED);
        doc.fillColor("#ffffff").text(label, x + pad, y + pad + 2.5, { width: bw, align: "center" });
        doc.fontSize(9.5);
      }
      x += cols[i];
    });
    doc.rect(MARGIN, y, total, rowH).lineWidth(0.5).strokeColor(LINE).stroke();
    let lx = MARGIN;
    for (const w of cols.slice(0, -1)) {
      lx += w;
      doc.moveTo(lx, y).lineTo(lx, y + rowH).stroke();
    }
    doc.y = y + rowH;
  };

  drawRow(head, true);
  for (const r of rows) drawRow(r, false);
  return true;
}

function level(v: unknown): keyof typeof SEVERITY {
  return v === "low" || v === "medium" || v === "high" ? v : "medium";
}

export function buildIntakePdf(reference: string, intake: Intake, result: SummaryResult): Promise<Buffer> {
  const firm = process.env.FIRM_NAME || "Your firm";
  const o = result.overview;

  const doc = new PDFDocument({
    size: "A4",
    margin: MARGIN,
    bufferPages: true,
    info: { Title: `Intake ${reference}${o ? ` – ${safe(o.matter_title)}` : ""}`, Author: firm, Subject: "Attorney intake overview" },
  });
  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  const width = contentWidth(doc);

  // Disclaimer banner
  const banner =
    "AI-generated draft for internal review. Not legal advice and not verified. Check every point against the client's original submission before relying on it. The client has not been sent this overview.";
  doc.font("Helvetica").fontSize(9);
  const bh = doc.heightOfString(banner, { width: width - 20, lineGap: 1.5 }) + 16;
  doc.roundedRect(MARGIN, MARGIN, width, bh, 4).fillAndStroke("#fff4e0", "#f0c674");
  doc.fillColor("#5a4510").text(banner, MARGIN + 10, MARGIN + 8, { width: width - 20, lineGap: 1.5 });
  doc.y = MARGIN + bh + 14;

  paragraph(doc, `${firm}  ·  Intake ${reference}  ·  ${new Date().toLocaleString("en-ZA")}  ·  Model ${result.model}`, {
    size: 8.5,
    color: MUTED,
  });
  doc.moveDown(0.8);

  if (o) {
    if (o.practice_area) paragraph(doc, o.practice_area, { size: 9.5, color: MUTED });
    doc.moveDown(0.2);
    paragraph(doc, o.matter_title, { size: 17, color: INK, bold: true });
    doc.moveDown(0.5);

    const y = doc.y;
    doc.font("Helvetica-Bold").fontSize(10).fillColor(INK).text("Urgency:", MARGIN, y);
    doc.font("Helvetica-Bold").fontSize(8);
    const u = level(o.urgency);
    const bw = doc.widthOfString(u) + 12;
    doc.roundedRect(MARGIN + 52, y - 1, bw, 13, 6.5).fill(SEVERITY[u]);
    doc.fillColor("#ffffff").text(u, MARGIN + 52, y + 2, { width: bw, align: "center" });
    doc
      .font("Helvetica")
      .fontSize(10)
      .fillColor(TEXT)
      .text(safe(o.urgency_reason), MARGIN + 60 + bw, y, { width: width - 60 - bw, lineGap: 2 });
    doc.moveDown(0.6);
    paragraph(doc, o.summary);

    heading(doc, "Risks and flags");
    if (!table(doc, ["Severity", "Issue", "Why it matters"], [0.14, 0.33, 0.53], o.risks.map((r) => [{ badge: level(r.severity) }, r.issue, r.why])))
      paragraph(doc, "None flagged.", { color: MUTED });

    const listSections: [string, unknown[]][] = [
      ["Time-sensitive – check dates", o.time_sensitive],
      ["Missing information", o.missing_info],
      ["Suggested questions for the client", o.questions_for_client],
    ];
    for (const [title, items] of listSections) {
      if (!items.length) continue;
      heading(doc, title);
      bullets(doc, items);
    }

    if (o.timeline.length) {
      heading(doc, "Timeline (as stated by client)");
      table(doc, ["Date", "Event"], [0.25, 0.75], o.timeline.map((t) => [t.date, t.event]));
    }
    if (o.parties.length) {
      heading(doc, "Parties");
      table(doc, ["Name", "Role"], [0.4, 0.6], o.parties.map((p) => [p.name, p.role]));
    }
    if (o.key_facts.length) {
      heading(doc, "Key facts");
      bullets(doc, o.key_facts);
    }
    if (o.documents.length) {
      heading(doc, "Documents");
      table(doc, ["Document", "Notes"], [0.4, 0.6], o.documents.map((d) => [d.description, d.notes]));
    }
    if (o.conflict_check_names.length) {
      heading(doc, "Names for conflict check");
      bullets(doc, o.conflict_check_names);
    }
  } else {
    heading(doc, "Model output (unstructured)");
    paragraph(doc, result.raw);
  }

  doc.addPage();
  paragraph(doc, "Client's original submission", { size: 14, color: INK, bold: true });
  doc.moveDown(0.6);
  const original: [string, string][] = [
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
  for (const [label, value] of original) {
    ensureSpace(doc, 40);
    paragraph(doc, label, { size: 9.5, color: INK, bold: true });
    paragraph(doc, value);
    doc.moveDown(0.6);
  }

  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    const bottom = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor(MUTED)
      .text(`Intake ${reference}  ·  Confidential – AI draft for attorney review  ·  Page ${i + 1} of ${range.count}`, MARGIN, doc.page.height - 32, {
        width,
        align: "center",
        lineBreak: false,
      });
    doc.page.margins.bottom = bottom;
  }

  doc.end();
  return done;
}
