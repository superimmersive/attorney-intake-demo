export const MATTER_TYPES = [
  "Contract / commercial dispute",
  "Employment",
  "Personal injury",
  "Property / lease",
  "Family",
  "Debt collection",
  "Criminal",
  "Other / not sure",
] as const;

export type Intake = {
  name: string;
  email: string;
  phone: string;
  matterType: string;
  jurisdiction: string;
  facts: string;
  dates: string;
  parties: string;
  documents: string;
  outcome: string;
};

const LIMITS: Record<keyof Intake, number> = {
  name: 120,
  email: 200,
  phone: 40,
  matterType: 60,
  jurisdiction: 120,
  facts: 6000,
  dates: 2000,
  parties: 2000,
  documents: 3000,
  outcome: 1500,
};

export type ValidationResult = { ok: true; intake: Intake } | { ok: false; errors: Partial<Record<keyof Intake | "consent", string>> };

export function validateIntake(body: unknown): ValidationResult {
  const input = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const errors: Partial<Record<keyof Intake | "consent", string>> = {};
  const intake = {} as Intake;

  for (const key of Object.keys(LIMITS) as (keyof Intake)[]) {
    const raw = typeof input[key] === "string" ? (input[key] as string) : "";
    const value = raw.replace(/\r\n/g, "\n").trim();
    if (value.length > LIMITS[key]) errors[key] = `Keep this under ${LIMITS[key]} characters.`;
    intake[key] = value;
  }

  if (!intake.name) errors.name = "Please enter your name.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(intake.email)) errors.email = "Please enter a valid email address.";
  if (!MATTER_TYPES.includes(intake.matterType as (typeof MATTER_TYPES)[number])) errors.matterType = "Please choose a matter type.";
  if (intake.facts.length < 40) errors.facts = "Please describe what happened in a few sentences.";
  if (input.consent !== true) errors.consent = "Please confirm you have read the notice.";

  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, intake };
}

export function makeReference(): string {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `INT-${ymd}-${rand}`;
}
