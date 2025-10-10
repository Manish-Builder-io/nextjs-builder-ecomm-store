import React from "react";
import Link from "next/link";

export function Header() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-gray-200 bg-white text-black shadow-sm dark:bg-white dark:text-black supports-[backdrop-filter]:bg-white/95 dark:supports-[backdrop-filter]:bg-white/95">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="text-lg font-semibold tracking-tight text-black">
              Store
            </Link>
            <nav aria-label="Primary" className="hidden md:flex items-center gap-6 text-sm text-black">
              <Link href="/collections/all" className="hover:text-black">Shop</Link>
              <Link href="/collections/new" className="hover:text-black">New</Link>
              <Link href="/collections/sale" className="hover:text-black">Sale</Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="search"
              placeholder="Search products"
              className="hidden sm:block w-56 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm placeholder:text-gray-400 text-black focus:outline-none focus:ring-2 focus:ring-black"
              aria-label="Search products"
            />
            <button aria-label="Open cart" className="relative rounded-md p-2 hover:bg-gray-100 dark:hover:bg-white/10">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-current">
                <path d="M3 3h2l.4 2M7 13h9l3-8H6.4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="9" cy="21" r="1" fill="currentColor" />
                <circle cx="18" cy="21" r="1" fill="currentColor" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;



