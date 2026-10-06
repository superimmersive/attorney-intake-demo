// Renders a sample intake PDF without sending email:
//   node --env-file=.env --experimental-strip-types scripts/render-pdf.ts out.pdf
import { writeFile } from "node:fs/promises";
import { summariseIntake } from "../lib/summarise.ts";
import { buildIntakePdf } from "../lib/pdf.ts";
import type { Intake } from "../lib/intake.ts";

const intake: Intake = {
  name: "Johan van der Merwe",
  email: "johan.vdm@example.com",
  phone: "071 555 0199",
  matterType: "Property / lease",
  jurisdiction: "Mossel Bay, Western Cape",
  facts:
    "I rented a two-bedroom flat at 14 Bayview Court from Seaview Rentals for two years. I moved out on 30 June 2026 and handed the keys to the agent, Mrs Annelie Fourie. We did a walk-through together and she said everything looked fine, but there was no written inspection report. My R18,500 deposit has still not been paid back. When I phoned in August, the agency said the owner wants to deduct for repainting the whole flat and a new carpet. They have not sent me any invoices or quotes. There was a leak from the geyser in 2025 that damaged the carpet, which I reported by WhatsApp at the time.",
  dates:
    "Lease signed 1 July 2024. Geyser leak reported about March 2025. Moved out 30 June 2026. Phoned agency about deposit 12 August 2026. Received an email on 25 September saying deductions will be 'about R15,000'.",
  parties: "Seaview Rentals (letting agency). Annelie Fourie (agent who did the walk-through). The owner, I only know his name as Mr Pillay.",
  documents: "Signed lease, proof of deposit payment, WhatsApp messages about the geyser leak, photos I took on move-out day, the 25 September email.",
  outcome: "I want my full deposit back with interest.",
};

const out = process.argv[2] || "sample-intake.pdf";
const summary = await summariseIntake(intake);
const pdf = await buildIntakePdf("INT-SAMPLE-0001", intake, summary);
await writeFile(out, pdf);
console.log(`wrote ${out} (${pdf.length} bytes, structured=${!!summary.overview})`);
