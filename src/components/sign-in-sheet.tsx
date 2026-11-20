"use client";

import { useEffect, useRef, useState } from "react";
import { X, Check } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Step = "email" | "code" | "done";

// Must match the project's "Email OTP length" in Supabase (8 is its default).
const CODE_LENGTH = 8;
// Supabase allows one code per email per 60s.
const RESEND_AFTER = 60;

/**
 * Passwordless sign-in: email → one-time code → in. The same flow creates the
 * account the first time, so there's no separate "sign up". Mounted only while
 * open, so every opening starts fresh.
 */
export function SignInSheet({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const codeRef = useRef<HTMLInputElement>(null);

  // Tick the resend cooldown down once a second.
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  useEffect(() => {
    if (step === "code") codeRef.current?.focus();
    if (step !== "done") return;
    const t = setTimeout(onClose, 1100);
    return () => clearTimeout(t);
  }, [step, onClose]);

  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  async function sendCode() {
    if (!validEmail || busy) return;
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: true },
    });
    setBusy(false);
    if (error) return setError(friendly(error));
    setCode("");
    setCooldown(RESEND_AFTER);
    setStep("code");
  }

  async function verify(token: string) {
    if (token.length !== CODE_LENGTH || busy) return;
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token,
      type: "email",
    });
    setBusy(false);
    if (error) {
      setCode("");
      return setError(friendly(error));
    }
    // The store hears SIGNED_IN and brings this device's spends along.
    setStep("done");
  }

  function onCode(v: string) {
    const digits = v.replace(/\D/g, "").slice(0, CODE_LENGTH);
    setCode(digits);
    if (digits.length === CODE_LENGTH) void verify(digits);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/25 backdrop-blur-[2px]"
      />

      <div className="rise relative flex max-h-[92%] w-full max-w-[390px] flex-col rounded-t-[28px] bg-background px-5 pb-8 pt-4">
        <div className="mb-2 flex items-center justify-between">
          <div className="mx-auto h-1.5 w-10 rounded-full bg-border" />
          <button
            onClick={onClose}
            className="absolute right-4 top-4 rounded-full p-1.5 text-muted hover:bg-card"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {step === "email" && (
          <form
            className="flex flex-col"
            onSubmit={(e) => {
              e.preventDefault();
              void sendCode();
            }}
          >
            <h2 className="text-2xl font-medium">Save your progress</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted">
              We&rsquo;ll email you a {CODE_LENGTH}-digit code. No password to remember.
            </p>

            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="mt-6 h-14 w-full rounded-2xl bg-card px-4 text-[17px] font-normal placeholder:text-muted-2 focus:outline-none focus:ring-2 focus:ring-accent-soft"
            />

            {error && <p className="mt-3 text-sm text-muted">{error}</p>}

            <button
              type="submit"
              disabled={!validEmail || busy}
              className="mt-5 h-14 rounded-2xl bg-accent text-lg font-medium text-white transition active:scale-[0.98] disabled:opacity-30"
            >
              {busy ? "Sending…" : "Send code"}
            </button>

            <p className="mt-4 text-center text-xs leading-relaxed text-muted">
              Everything you&rsquo;ve logged on this phone comes with you.
            </p>
          </form>
        )}

        {step === "code" && (
          <div className="flex flex-col">
            <h2 className="text-2xl font-medium">Check your email</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted">
              Enter the code we sent to <span className="text-foreground">{email.trim()}</span>
            </p>

            <input
              ref={codeRef}
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]*"
              value={code}
              onChange={(e) => onCode(e.target.value)}
              disabled={busy}
              aria-label={`${CODE_LENGTH}-digit code`}
              placeholder={"·".repeat(CODE_LENGTH)}
              className="tnum mt-6 h-16 w-full rounded-2xl bg-card text-center text-3xl font-medium tracking-[0.3em] placeholder:text-muted-2 focus:outline-none focus:ring-2 focus:ring-accent-soft disabled:opacity-60"
            />

            <p className="mt-3 min-h-5 text-sm text-muted">
              {busy ? "Checking…" : error}
            </p>

            <div className="mt-4 flex items-center justify-between text-sm">
              <button
                onClick={() => {
                  setError(null);
                  setStep("email");
                }}
                className="text-muted underline-offset-4 hover:underline"
              >
                Use a different email
              </button>
              <button
                onClick={() => void sendCode()}
                disabled={cooldown > 0 || busy}
                className="tnum underline-offset-4 hover:underline disabled:text-muted-2 disabled:no-underline"
              >
                {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
              </button>
            </div>
          </div>
        )}

        {step === "done" && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-success-soft">
              <Check size={40} className="text-success" strokeWidth={3} />
            </div>
            <p className="mt-5 text-xl font-medium">You&rsquo;re in 🌱</p>
            <p className="mt-1 text-sm text-muted">Your progress is saved to your account.</p>
          </div>
        )}
      </div>
    </div>
  );
}

/** Calm, plain-language versions of Supabase's auth errors. */
function friendly(error: { status?: number; code?: string; message: string }): string {
  if (error.status === 429 || error.code === "over_email_send_rate_limit")
    return "Too many codes requested. Please wait a minute and try again.";
  if (error.code === "otp_expired" || /expired|invalid/i.test(error.message))
    return "That code didn’t work. Check it, or send a new one.";
  if (error.status === 0 || /fetch|network/i.test(error.message))
    return "Couldn’t connect. Check your internet and try again.";
  return "Something went wrong. Please try again.";
}
