"use client";

import { useState } from "react";

type Errors = Record<string, string>;
type Status = { kind: "idle" } | { kind: "sending" } | { kind: "done"; reference: string } | { kind: "error"; message: string };

const EMPTY = {
  name: "",
  email: "",
  phone: "",
  matterType: "",
  jurisdiction: "",
  facts: "",
  dates: "",
  parties: "",
  documents: "",
  outcome: "",
  website: "",
};

const FACTS_MAX = 6000;

export default function IntakeForm({ matterTypes, needsPasscode }: { matterTypes: string[]; needsPasscode: boolean }) {
  const [values, setValues] = useState(EMPTY);
  const [passcode, setPasscode] = useState("");
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const set = (key: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setValues((v) => ({ ...v, [key]: e.target.value }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus({ kind: "sending" });
    setErrors({});
    try {
      const res = await fetch("/api/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, consent, passcode }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        setStatus({ kind: "done", reference: data.reference });
        setValues(EMPTY);
        setConsent(false);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      if (data.errors) setErrors(data.errors);
      setStatus({ kind: "error", message: data.message || "Something went wrong. Please try again." });
    } catch {
      setStatus({ kind: "error", message: "Network error. Please check your connection and try again." });
    }
  }

  if (status.kind === "done") {
    return (
      <section className="card done" aria-live="polite">
        <span className="done__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path d="m5 12.5 4.5 4.5L19 7.5" />
          </svg>
        </span>
        <h2>Your enquiry has been sent</h2>
        <p>An attorney will review what you wrote and contact you, usually within two working days.</p>
        <div className="done__ref">
          <span>Your reference</span>
          <strong>{status.reference}</strong>
        </div>
        <p className="done__note">We won&apos;t send you an automated assessment of your matter.</p>
        <button type="button" className="button button--ghost" onClick={() => setStatus({ kind: "idle" })}>
          Submit another enquiry
        </button>
      </section>
    );
  }

  const field = (key: string) => ({
    name: key,
    "aria-invalid": errors[key] ? true : undefined,
    "aria-describedby": errors[key] ? `${key}-error` : undefined,
  });
  const err = (key: string) =>
    errors[key] ? (
      <span className="field__error" id={`${key}-error`}>
        {errors[key]}
      </span>
    ) : null;

  const sending = status.kind === "sending";

  return (
    <form className="card form" onSubmit={onSubmit} noValidate>
      <fieldset disabled={sending}>
        <div className="step">
          <div className="step__head">
            <span className="step__num">1</span>
            <div>
              <h2>About you</h2>
              <p>So the attorney can get back to you.</p>
            </div>
          </div>
          <div className="grid">
            <label className="field">
              <span className="field__label">Full name <em>*</em></span>
              <input value={values.name} onChange={set("name")} autoComplete="name" required {...field("name")} />
              {err("name")}
            </label>
            <label className="field">
              <span className="field__label">Email <em>*</em></span>
              <input type="email" value={values.email} onChange={set("email")} autoComplete="email" required {...field("email")} />
              {err("email")}
            </label>
            <label className="field">
              <span className="field__label">Phone</span>
              <input type="tel" value={values.phone} onChange={set("phone")} autoComplete="tel" {...field("phone")} />
              {err("phone")}
            </label>
            <label className="field">
              <span className="field__label">Where did this happen?</span>
              <input value={values.jurisdiction} onChange={set("jurisdiction")} placeholder="City, province / country" {...field("jurisdiction")} />
              {err("jurisdiction")}
            </label>
          </div>
        </div>

        <div className="step">
          <div className="step__head">
            <span className="step__num">2</span>
            <div>
              <h2>Your matter</h2>
              <p>Plain language is perfect. Don&apos;t worry about legal terms.</p>
            </div>
          </div>

          <div className="field" role="radiogroup" aria-labelledby="matterType-label" aria-describedby={errors.matterType ? "matterType-error" : undefined}>
            <span className="field__label" id="matterType-label">Type of matter <em>*</em></span>
            <div className="chips">
              {matterTypes.map((t) => (
                <label key={t} className="chip">
                  <input
                    type="radio"
                    name="matterType"
                    value={t}
                    checked={values.matterType === t}
                    onChange={set("matterType")}
                  />
                  <span>{t}</span>
                </label>
              ))}
            </div>
            {err("matterType")}
          </div>

          <label className="field">
            <span className="field__label">What happened? <em>*</em></span>
            <span className="field__hint">In your own words, in the order things happened.</span>
            <textarea rows={7} maxLength={FACTS_MAX} value={values.facts} onChange={set("facts")} required {...field("facts")} />
            <span className="field__count">{values.facts.length.toLocaleString("en-ZA")} / {FACTS_MAX.toLocaleString("en-ZA")}</span>
            {err("facts")}
          </label>
          <label className="field">
            <span className="field__label">Key dates</span>
            <span className="field__hint">When things happened, letters you received, any court or response deadlines.</span>
            <textarea rows={3} value={values.dates} onChange={set("dates")} {...field("dates")} />
            {err("dates")}
          </label>
          <label className="field">
            <span className="field__label">Other people or organisations involved</span>
            <span className="field__hint">Names and how they are involved: employer, landlord, insurer, witness…</span>
            <textarea rows={3} value={values.parties} onChange={set("parties")} {...field("parties")} />
            {err("parties")}
          </label>
        </div>

        <div className="step">
          <div className="step__head">
            <span className="step__num">3</span>
            <div>
              <h2>Documents and outcome</h2>
              <p>Just list documents for now. The attorney will ask for copies if needed.</p>
            </div>
          </div>
          <label className="field">
            <span className="field__label">Documents you have</span>
            <span className="field__hint">e.g. &ldquo;signed lease, 2 emails from the landlord, photos&rdquo;</span>
            <textarea rows={3} value={values.documents} onChange={set("documents")} {...field("documents")} />
            {err("documents")}
          </label>
          <label className="field">
            <span className="field__label">What outcome are you hoping for?</span>
            <textarea rows={2} value={values.outcome} onChange={set("outcome")} {...field("outcome")} />
            {err("outcome")}
          </label>
        </div>

        <label className="field field--hp" aria-hidden="true">
          <span>Website</span>
          <input tabIndex={-1} autoComplete="off" value={values.website} onChange={set("website")} name="website" />
        </label>

        <div className="submit">
          <label className="check">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} {...field("consent")} />
            <span>
              I understand this is not legal advice, that an attorney will review my enquiry, and how my information is
              handled.
            </span>
          </label>
          {err("consent")}

          {needsPasscode && (
            <label className="field passcode">
              <span className="field__label">Demo passcode <em>*</em></span>
              <span className="field__hint">This is a test site. Use the passcode you were given.</span>
              <input
                type="password"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                autoComplete="off"
                required
                {...field("passcode")}
              />
              {err("passcode")}
            </label>
          )}

          {status.kind === "error" && (
            <p className="form__alert" role="alert">
              {status.message}
            </p>
          )}

          <button type="submit" className="button">
            {sending ? (
              <>
                <span className="spinner" aria-hidden="true" /> Sending securely…
              </>
            ) : (
              <>
                Send to the firm
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M5 12h14m-6-6 6 6-6 6" />
                </svg>
              </>
            )}
          </button>
        </div>
      </fieldset>
    </form>
  );
}
