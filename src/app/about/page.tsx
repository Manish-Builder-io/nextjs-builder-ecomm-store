import React from "react";
import Link from "next/link";

export const metadata = { title: "About Us", description: "Our story, mission, and values." };

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-16">
      <p className="text-sm font-semibold uppercase tracking-widest text-blue-600">Our story</p>
      <h1 className="mt-2 text-4xl font-extrabold text-gray-900">About Store</h1>
      <p className="mt-6 text-lg text-gray-500 leading-relaxed max-w-2xl">
        We believe great style shouldn&apos;t come at the cost of comfort or conscience. Founded in 2020,
        Store curates the finest fashion from around the world — bringing you everyday essentials
        and statement pieces that feel as good as they look.
      </p>

      <div className="mt-14 grid gap-8 sm:grid-cols-3">
        {[
          { icon: "🌍", title: "Ethically Sourced", body: "Every partner we work with meets our strict standards for fair labour and sustainable production." },
          { icon: "♻️", title: "Sustainable Packaging", body: "All orders ship in 100% recycled, plastic-free packaging. Because the planet matters." },
          { icon: "❤️", title: "Customer First", body: "Free returns, 24/7 support, and a genuine desire to make every experience great." },
        ].map(({ icon, title, body }) => (
          <div key={title} className="rounded-2xl bg-gray-50 p-6">
            <span className="text-4xl">{icon}</span>
            <h3 className="mt-4 text-base font-semibold text-gray-900">{title}</h3>
            <p className="mt-2 text-sm text-gray-500 leading-relaxed">{body}</p>
          </div>
        ))}
      </div>

      <div className="mt-14 flex gap-4">
        <Link href="/collections/all" className="rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-colors">
          Shop Now
        </Link>
        <Link href="/contact" className="rounded-full border border-gray-200 px-6 py-3 text-sm font-semibold text-gray-700 hover:border-gray-400 transition-colors">
          Get in Touch
        </Link>
      </div>
    </main>
  );
}
