import React from "react";

export const metadata = { title: "Privacy Policy", description: "How we collect, use, and protect your data." };

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16 prose prose-gray max-w-none">
      <p className="text-sm font-semibold uppercase tracking-widest text-blue-600 not-prose">Legal</p>
      <h1 className="mt-2 text-4xl font-extrabold text-gray-900 not-prose">Privacy Policy</h1>
      <p className="mt-2 text-xs text-gray-400 not-prose">Last updated: January 1, 2025</p>

      <div className="mt-8 space-y-8 text-sm text-gray-600 leading-relaxed">
        <section>
          <h2 className="text-base font-semibold text-gray-900">1. Information We Collect</h2>
          <p className="mt-2">We collect information you provide directly to us, such as when you create an account, place an order, or contact support. This includes name, email address, shipping address, and payment information (processed securely via our payment provider).</p>
        </section>
        <section>
          <h2 className="text-base font-semibold text-gray-900">2. How We Use Your Information</h2>
          <p className="mt-2">We use your information to process orders, communicate with you about your purchases, send marketing emails (with your consent), and improve our services. We never sell your personal data to third parties.</p>
        </section>
        <section>
          <h2 className="text-base font-semibold text-gray-900">3. Cookies</h2>
          <p className="mt-2">We use cookies to remember your cart, preferences, and to analyse site traffic. You can disable cookies in your browser settings, though some features may not work as expected.</p>
        </section>
        <section>
          <h2 className="text-base font-semibold text-gray-900">4. Data Retention</h2>
          <p className="mt-2">We retain your data for as long as your account is active or as needed to provide services. You may request deletion of your data at any time by contacting us.</p>
        </section>
        <section>
          <h2 className="text-base font-semibold text-gray-900">5. Your Rights</h2>
          <p className="mt-2">Depending on your location, you may have rights to access, correct, or delete your personal data, and to object to or restrict certain processing. Contact us at privacy@store.com to exercise these rights.</p>
        </section>
        <section>
          <h2 className="text-base font-semibold text-gray-900">6. Contact</h2>
          <p className="mt-2">Questions about this policy? Email us at privacy@store.com or write to Store, 123 Fashion Ave, New York, NY 10001.</p>
        </section>
      </div>
    </main>
  );
}
