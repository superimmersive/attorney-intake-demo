import IntakeForm from "./IntakeForm";
import { MATTER_TYPES } from "@/lib/intake";

const Icon = {
  scale: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3v18M7 21h10M5 7h14M5 7l-3 7a3 3 0 0 0 6 0L5 7Zm14 0-3 7a3 3 0 0 0 6 0l-3-7Z" />
    </svg>
  ),
  person: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </svg>
  ),
  lock: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="4" y="10" width="16" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  ),
  clock: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  ),
};

export default function Home() {
  const firm = process.env.FIRM_NAME || "Demo Law Firm";

  return (
    <>
      <header className="topbar">
        <div className="wrap topbar__inner">
          <span className="brand">
            <span className="brand__mark" aria-hidden="true">
              {Icon.scale}
            </span>
            {firm}
          </span>
          <span className="pill">Concept demo</span>
        </div>
      </header>

      <main className="wrap layout">
        <section className="intro">
          <span className="eyebrow">New matter enquiry</span>
          <h1>
            Tell us what happened.
            <span>We&apos;ll take it from there.</span>
          </h1>
          <p className="lead">
            Answer a few questions in your own words. An attorney reads every enquiry and will contact you to discuss
            next steps.
          </p>

          <ul className="assurances">
            <li>
              <span className="assurances__icon">{Icon.scale}</span>
              <div>
                <strong>Not legal advice</strong>
                <p>Submitting this form doesn&apos;t create an attorney–client relationship.</p>
              </div>
            </li>
            <li>
              <span className="assurances__icon">{Icon.person}</span>
              <div>
                <strong>Reviewed by a person</strong>
                <p>Software prepares a summary; an attorney checks it against what you wrote. You won&apos;t get an automated opinion.</p>
              </div>
            </li>
            <li>
              <span className="assurances__icon">{Icon.clock}</span>
              <div>
                <strong>Urgent deadline?</strong>
                <p>If you have a court date or deadline in the next few days, phone the firm as well.</p>
              </div>
            </li>
          </ul>

          <details className="privacy">
            <summary>
              <span className="assurances__icon">{Icon.lock}</span>
              How your information is handled
            </summary>
            <ul>
              <li>Only the firm&apos;s intake attorney receives your answers and the summary.</li>
              <li>
                To prepare the summary, your answers are processed by an AI model through OpenRouter, restricted to
                providers that do not use submitted data for training.
              </li>
              <li>
                This site does not store your submission. The firm keeps the intake email under its normal client
                records policy, and deletes it on request if no matter is opened.
              </li>
              <li>Please don&apos;t include ID numbers, bank details or passwords.</li>
            </ul>
          </details>
        </section>

        <IntakeForm matterTypes={[...MATTER_TYPES]} />
      </main>

      <footer className="wrap footer">
        <p>
          {firm} · Demo intake form built by{" "}
          <a href="https://superimmersive.io" target="_blank" rel="noreferrer">
            Superimmersive
          </a>
          . Not a real law firm.
        </p>
      </footer>
    </>
  );
}
