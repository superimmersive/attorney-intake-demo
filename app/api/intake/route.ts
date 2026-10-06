import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { makeReference, validateIntake } from "@/lib/intake";
import { summariseIntake } from "@/lib/summarise";
import { buildLawyerEmail, sendToLawyer } from "@/lib/email";
import { buildIntakePdf } from "@/lib/pdf";

export const runtime = "nodejs";

const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;
const hits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > MAX_PER_WINDOW;
}

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
  if (rateLimited(ip)) {
    return NextResponse.json({ ok: false, message: "Too many submissions. Please try again in a few minutes." }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid request." }, { status: 400 });
  }

  // Honeypot: real visitors never see or fill this field.
  if (typeof body.website === "string" && body.website) {
    return NextResponse.json({ ok: true, reference: makeReference() });
  }

  const passcode = process.env.DEMO_PASSCODE?.trim();
  if (passcode) {
    const given = Buffer.from(typeof body.passcode === "string" ? body.passcode.trim() : "");
    const expected = Buffer.from(passcode);
    if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
      return NextResponse.json(
        { ok: false, message: "That demo passcode isn't right.", errors: { passcode: "Check the passcode you were given." } },
        { status: 401 },
      );
    }
  }

  const result = validateIntake(body);
  if (!result.ok) {
    return NextResponse.json({ ok: false, message: "Please check the highlighted fields.", errors: result.errors }, { status: 422 });
  }

  const reference = makeReference();
  try {
    const summary = await summariseIntake(result.intake);
    const mail = buildLawyerEmail(reference, result.intake, summary);
    const pdf = await buildIntakePdf(reference, result.intake, summary).catch((err) => {
      console.error(`[intake] ${reference} PDF failed, sending without attachment:`, err instanceof Error ? err.message : err);
      return null;
    });
    const sent = await sendToLawyer(reference, result.intake.email, mail, pdf);
    console.log(`[intake] ${reference} summarised by ${summary.model}, delivered via ${sent.delivered} (${sent.id})`);
  } catch (err) {
    console.error(`[intake] ${reference} failed:`, err instanceof Error ? err.message : err);
    return NextResponse.json(
      { ok: false, message: "We couldn't submit your enquiry just now. Please try again, or contact the firm directly." },
      { status: 502 },
    );
  }

  // The client only gets a receipt; the AI overview goes to the lawyer alone.
  return NextResponse.json({ ok: true, reference });
}
