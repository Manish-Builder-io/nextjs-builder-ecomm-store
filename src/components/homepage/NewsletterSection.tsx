"use client";

import { useState } from "react";

export interface NewsletterSectionProps {
  title?: string;
  description?: string;
  buttonText?: string;
  successMessage?: string;
}

export default function NewsletterSection({
  title = "Get 10% Off Your First Order",
  description = "Subscribe for exclusive deals, new arrivals, and style inspiration delivered straight to your inbox.",
  buttonText = "Get 10% Off",
  successMessage = "🎉 You're in! Check your inbox for your 10% off code.",
}: NewsletterSectionProps) {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) setSubmitted(true);
  };

  return (
    <section className="bg-gray-900 py-20">
      <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 text-center">
        <span className="mb-6 block text-4xl">✉️</span>

        <h2 className="mb-4 text-4xl font-extrabold text-white">
          {title}
        </h2>
        <p className="mb-10 text-lg text-gray-400">
          {description}
        </p>

        {submitted ? (
          <div className="rounded-2xl border border-green-500/30 bg-green-500/20 px-8 py-6">
            <p className="text-lg font-semibold text-green-400">
              {successMessage}
            </p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="mx-auto flex max-w-md flex-col gap-3 sm:flex-row"
          >
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address"
              required
              className="flex-1 rounded-full border border-white/20 bg-white/10 px-6 py-4 text-sm text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              className="whitespace-nowrap rounded-full bg-blue-600 px-8 py-4 text-sm font-semibold text-white hover:bg-blue-500 transition-colors"
            >
              {buttonText}
            </button>
          </form>
        )}

        <p className="mt-5 text-xs text-gray-500">
          No spam, ever. Unsubscribe at any time.
        </p>
      </div>
    </section>
  );
}
