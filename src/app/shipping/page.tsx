import React from "react";

export const metadata = { title: "Shipping Info", description: "Shipping rates, timelines, and policies." };

const RATES = [
  { method: "Standard Shipping", time: "5–7 business days", cost: "$5.99 (free over $50)" },
  { method: "Express Shipping", time: "2–3 business days", cost: "$12.99" },
  { method: "Overnight Shipping", time: "Next business day", cost: "$24.99" },
  { method: "International", time: "10–20 business days", cost: "From $14.99" },
];

export default function ShippingPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16">
      <p className="text-sm font-semibold uppercase tracking-widest text-blue-600">Delivery</p>
      <h1 className="mt-2 text-4xl font-extrabold text-gray-900">Shipping Info</h1>
      <p className="mt-4 text-gray-500 leading-relaxed">
        We ship to over 50 countries worldwide. Orders placed before 2pm EST on business days are
        processed the same day.
      </p>

      <div className="mt-10 overflow-hidden rounded-2xl border border-gray-100">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              {["Method", "Estimated delivery", "Cost"].map((h) => (
                <th key={h} className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {RATES.map(({ method, time, cost }) => (
              <tr key={method}>
                <td className="px-6 py-4 font-medium text-gray-900">{method}</td>
                <td className="px-6 py-4 text-gray-600">{time}</td>
                <td className="px-6 py-4 text-gray-600">{cost}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-10 space-y-6 text-sm text-gray-600 leading-relaxed">
        <p><strong className="text-gray-900">Tracking:</strong> Once your order ships you&apos;ll receive an email with a tracking number. Allow 24 hours for the carrier to update tracking info.</p>
        <p><strong className="text-gray-900">Address changes:</strong> Contact us within 1 hour of placing your order if you need to update your shipping address.</p>
        <p><strong className="text-gray-900">Delays:</strong> Carrier delays due to weather or peak seasons are outside our control. We&apos;ll always keep you informed.</p>
      </div>
    </main>
  );
}
