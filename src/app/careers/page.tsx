import React from "react";
import Link from "next/link";

export const metadata = { title: "Careers", description: "Join our team at Store." };

const ROLES = [
  { title: "Senior Frontend Engineer", dept: "Engineering", location: "Remote (US)", type: "Full-time" },
  { title: "Brand Designer", dept: "Design", location: "New York, NY", type: "Full-time" },
  { title: "Buyer — Women's Fashion", dept: "Merchandising", location: "New York, NY", type: "Full-time" },
  { title: "Customer Experience Specialist", dept: "Support", location: "Remote", type: "Full-time" },
];

export default function CareersPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16">
      <p className="text-sm font-semibold uppercase tracking-widest text-blue-600">We&apos;re hiring</p>
      <h1 className="mt-2 text-4xl font-extrabold text-gray-900">Join Our Team</h1>
      <p className="mt-4 text-gray-500 leading-relaxed max-w-xl">
        We&apos;re building the future of fashion retail. If you&apos;re passionate about style, technology,
        and great customer experiences — we&apos;d love to hear from you.
      </p>

      <div className="mt-12 space-y-4">
        {ROLES.map(({ title, dept, location, type }) => (
          <div
            key={title}
            className="flex flex-col justify-between gap-4 rounded-2xl border border-gray-100 bg-white p-6 hover:border-blue-200 hover:shadow-sm transition-all sm:flex-row sm:items-center"
          >
            <div>
              <p className="font-semibold text-gray-900">{title}</p>
              <div className="mt-1.5 flex flex-wrap gap-2">
                <span className="rounded-full bg-blue-50 px-3 py-0.5 text-xs font-medium text-blue-700">{dept}</span>
                <span className="rounded-full bg-gray-100 px-3 py-0.5 text-xs font-medium text-gray-600">{location}</span>
                <span className="rounded-full bg-gray-100 px-3 py-0.5 text-xs font-medium text-gray-600">{type}</span>
              </div>
            </div>
            <Link
              href="/contact"
              className="flex-shrink-0 rounded-full border border-blue-600 px-5 py-2 text-sm font-semibold text-blue-600 hover:bg-blue-600 hover:text-white transition-colors"
            >
              Apply →
            </Link>
          </div>
        ))}
      </div>

      <p className="mt-10 text-sm text-gray-500">
        Don&apos;t see your role? <Link href="/contact" className="font-semibold text-blue-600 hover:underline">Send us a speculative application</Link> — we&apos;re always open to talented people.
      </p>
    </main>
  );
}
