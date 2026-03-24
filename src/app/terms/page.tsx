import React from "react";

export const metadata = { title: "Terms of Service", description: "Terms and conditions for using Store." };

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16">
      <p className="text-sm font-semibold uppercase tracking-widest text-blue-600">Legal</p>
      <h1 className="mt-2 text-4xl font-extrabold text-gray-900">Terms of Service</h1>
      <p className="mt-2 text-xs text-gray-400">Last updated: January 1, 2025</p>

      <div className="mt-8 space-y-8 text-sm text-gray-600 leading-relaxed">
        {[
          { title: "1. Acceptance of Terms", body: "By accessing or using Store's website and services, you agree to be bound by these Terms of Service. If you do not agree, please do not use our services." },
          { title: "2. Use of the Service", body: "You may use our service only for lawful purposes and in accordance with these Terms. You agree not to use the service in any way that could damage, disable, or impair the site." },
          { title: "3. Orders & Payments", body: "By placing an order, you represent that you are authorised to use the payment method provided. We reserve the right to refuse or cancel orders at our discretion." },
          { title: "4. Pricing", body: "All prices are in USD unless stated otherwise. We reserve the right to change prices at any time. Any promotions or discounts are subject to availability and may be withdrawn without notice." },
          { title: "5. Intellectual Property", body: "All content on this site — including text, images, logos, and graphics — is the property of Store and protected by copyright law. You may not reproduce or distribute any content without written permission." },
          { title: "6. Limitation of Liability", body: "Store shall not be liable for any indirect, incidental, or consequential damages arising from your use of our services. Our maximum liability is limited to the amount you paid for the relevant order." },
          { title: "7. Changes to Terms", body: "We may update these terms from time to time. We'll notify you of significant changes by email or by posting a notice on our website. Continued use constitutes acceptance of the updated terms." },
          { title: "8. Contact", body: "Questions about these terms? Email us at legal@store.com." },
        ].map(({ title, body }) => (
          <section key={title}>
            <h2 className="text-base font-semibold text-gray-900">{title}</h2>
            <p className="mt-2">{body}</p>
          </section>
        ))}
      </div>
    </main>
  );
}
