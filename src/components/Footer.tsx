import React from "react";
import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-black/10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 text-sm">
          <div>
            <h3 className="font-medium mb-3">Shop</h3>
            <ul className="space-y-2 text-gray-600 dark:text-gray-300">
              <li><Link href="/collections/all" className="hover:text-black dark:hover:text-white">All Products</Link></li>
              <li><Link href="/collections/new" className="hover:text-black dark:hover:text-white">New Arrivals</Link></li>
              <li><Link href="/collections/sale" className="hover:text-black dark:hover:text-white">Sale</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-medium mb-3">Company</h3>
            <ul className="space-y-2 text-gray-600 dark:text-gray-300">
              <li><Link href="/about" className="hover:text-black dark:hover:text-white">About</Link></li>
              <li><Link href="/contact" className="hover:text-black dark:hover:text-white">Contact</Link></li>
              <li><Link href="/careers" className="hover:text-black dark:hover:text-white">Careers</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-medium mb-3">Support</h3>
            <ul className="space-y-2 text-gray-600 dark:text-gray-300">
              <li><Link href="/shipping" className="hover:text-black dark:hover:text-white">Shipping</Link></li>
              <li><Link href="/returns" className="hover:text-black dark:hover:text-white">Returns</Link></li>
              <li><Link href="/faq" className="hover:text-black dark:hover:text-white">FAQ</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-medium mb-3">Newsletter</h3>
            <form className="flex gap-2">
              <label htmlFor="email" className="sr-only">Email</label>
              <input id="email" type="email" placeholder="Your email" className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-black dark:border-gray-800 dark:bg-black dark:focus:ring-white" />
              <button className="rounded-md border border-transparent bg-black text-white px-3 py-2 text-sm font-medium hover:bg-black/85 dark:bg-white dark:text-black">
                Subscribe
              </button>
            </form>
          </div>
        </div>

        <div className="mt-10 flex items-center justify-between text-xs text-gray-500">
          <p>© {new Date().getFullYear()} Store. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="hover:text-black dark:hover:text-white">Privacy</Link>
            <Link href="/terms" className="hover:text-black dark:hover:text-white">Terms</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;



