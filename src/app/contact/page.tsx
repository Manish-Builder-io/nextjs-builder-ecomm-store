import React from "react";

export const metadata = { title: "Contact Us", description: "Get in touch with our team." };

export default function ContactPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-16">
      <p className="text-sm font-semibold uppercase tracking-widest text-blue-600">We&apos;re here to help</p>
      <h1 className="mt-2 text-4xl font-extrabold text-gray-900">Contact Us</h1>
      <p className="mt-4 text-gray-500">
        Have a question or need help with an order? Fill out the form below and we&apos;ll get back to you within 24 hours.
      </p>

      <form className="mt-10 space-y-6">
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label htmlFor="first" className="block text-sm font-medium text-gray-700 mb-1">First name</label>
            <input id="first" type="text" required className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
          <div>
            <label htmlFor="last" className="block text-sm font-medium text-gray-700 mb-1">Last name</label>
            <input id="last" type="text" required className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input id="email" type="email" required className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
        </div>
        <div>
          <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
          <select id="subject" className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
            <option>Order issue</option>
            <option>Returns &amp; refunds</option>
            <option>Product question</option>
            <option>Other</option>
          </select>
        </div>
        <div>
          <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">Message</label>
          <textarea id="message" rows={5} required className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none" />
        </div>
        <button type="submit" className="w-full rounded-full bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-colors">
          Send Message
        </button>
      </form>

      <div className="mt-12 grid gap-4 sm:grid-cols-2">
        {[
          { icon: "📧", label: "Email", value: "hello@store.com" },
          { icon: "💬", label: "Live Chat", value: "Available Mon–Fri, 9am–6pm" },
        ].map(({ icon, label, value }) => (
          <div key={label} className="rounded-2xl bg-gray-50 p-5">
            <span className="text-3xl">{icon}</span>
            <p className="mt-3 text-sm font-semibold text-gray-900">{label}</p>
            <p className="mt-1 text-sm text-gray-500">{value}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
