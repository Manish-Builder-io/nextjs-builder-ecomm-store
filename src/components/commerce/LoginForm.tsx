"use client";
import React, { useState } from "react";
import { useCustomer } from "@/context/CustomerContext";

const field = "w-full rounded-control border border-line bg-surface px-3 py-2.5 text-sm text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20";

export default function LoginForm({
  heading = "Sign in",
  submitLabel = "Sign in",
  notice = "Demo sign-in: details stay in this browser. Connect your identity provider before launch.",
}: { heading?: string; submitLabel?: string; notice?: string }) {
  const { signIn } = useCustomer();
  const [error, setError] = useState("");
  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const email = String(f.get("email") ?? "").trim();
        if (!/^\S+@\S+\.\S+$/.test(email)) return setError("Enter a valid email address.");
        setError("");
        signIn(email, String(f.get("name") ?? ""));
      }}
      className="mx-auto w-full max-w-sm space-y-4 px-4 py-16"
    >
      <h1 className="text-3xl font-bold tracking-tight text-ink">{heading}</h1>
      <input name="name" aria-label="Name" autoComplete="name" placeholder="Name (optional)" className={field} />
      <div>
        <input name="email" type="email" aria-label="Email" autoComplete="email" placeholder="Email" className={field} aria-invalid={!!error} />
        {error && <p role="alert" className="mt-1 text-xs text-danger">{error}</p>}
      </div>
      <button type="submit" className="w-full rounded-full bg-brand py-3 text-sm font-semibold text-brand-contrast hover:bg-brand-hover">{submitLabel}</button>
      {notice && <p className="text-xs text-muted">{notice}</p>}
    </form>
  );
}
