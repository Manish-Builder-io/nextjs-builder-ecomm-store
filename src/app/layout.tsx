import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/context/CartContext";
import { CustomerProvider } from "@/context/CustomerContext";
import { getRequestLocale } from "@/lib/targeting";
import { LOCALE_META } from "@/i18n/config";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import TokensStyle from "@/components/TokensStyle";
import BuilderSection from "@/components/BuilderSection";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Store — Modern Fashion",
  description: "Discover curated collections that define modern fashion.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getRequestLocale();
  return (
    <html lang={LOCALE_META[locale].tag} suppressHydrationWarning>
      <head>
        <TokensStyle />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <CartProvider>
          <CustomerProvider>
            <BuilderSection model="promobar" />
            <BuilderSection model="header" fallback={<Header />} />
            {children}
            <BuilderSection model="footer" fallback={<Footer />} />
            <CartDrawer />
          </CustomerProvider>
        </CartProvider>
      </body>
    </html>
  );
}
