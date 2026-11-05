"use client";
import { Builder } from "@builder.io/react";
import { LOCALE_META, SUPPORTED_LOCALES } from "@/i18n/config";
import ProductDetail from "@/components/commerce/ProductDetail";
import ProductRail from "@/components/commerce/ProductRail";
import CartPage from "@/components/commerce/CartPage";
import CheckoutForm from "@/components/commerce/CheckoutForm";
import OrderConfirmation from "@/components/commerce/OrderConfirmation";
import SearchBox from "@/components/commerce/SearchBox";
import WishlistGrid from "@/components/commerce/WishlistGrid";
import LoginForm from "@/components/commerce/LoginForm";
import AccountDashboard from "@/components/commerce/AccountDashboard";
import LocaleSwitcher from "@/components/commerce/LocaleSwitcher";
import FAQAccordion from "@/components/commerce/FAQAccordion";
import Breadcrumbs from "@/components/commerce/Breadcrumbs";
import ShippingProgress from "@/components/commerce/ShippingProgress";

// ─── Targeting attributes ──────────────────────────────────────────────────
// These match the userAttributes the app sends (src/lib/targeting.ts + CustomerContext), so
// editors can target any entry or block on them in the Builder UI.
Builder.register("editor.settings", {
  customTargetingAttributes: {
    locale: { type: "string", enum: [...SUPPORTED_LOCALES] },
    country: { type: "string", enum: ["US", "CA", "GB", "FR", "ES", "IN", "DE", "AU"] },
    currency: { type: "string", enum: Array.from(new Set(Object.values(LOCALE_META).map((m) => m.currency))) },
    device: { type: "string", enum: ["mobile", "tablet", "desktop"] },
    loggedIn: { type: "boolean" },
    customerGroupids: { type: "string" },
  },
});

// ─── Product & catalog ─────────────────────────────────────────────────────
const productReference = (name: string, friendlyName?: string) => ({
  name,
  friendlyName,
  type: "reference" as const,
  model: "products",
  options: { enrich: true },
});

Builder.registerComponent(ProductDetail, {
  name: "ProductDetail",
  friendlyName: "Product Detail",
  description: "Full product page body: gallery, price, rating, quantity and add-to-cart.",
  inputs: [
    productReference("productRef", "Product"),
    { name: "addToCartLabel", type: "string", defaultValue: "Add to cart", localized: true },
    { name: "outOfStockLabel", type: "string", defaultValue: "Out of stock", localized: true },
    { name: "shippingNote", type: "string", defaultValue: "Free shipping on orders over $50 · Free 30-day returns", localized: true },
    { name: "showWishlist", type: "boolean", defaultValue: true },
  ],
});

Builder.registerComponent(ProductRail, {
  name: "ProductRail",
  friendlyName: "Product Rail",
  description: "A heading and a row of hand-picked product cards (recommendations, bestsellers, ...).",
  inputs: [
    { name: "heading", type: "string", defaultValue: "You may also like", localized: true },
    { name: "viewAllText", type: "string", localized: true },
    { name: "viewAllHref", type: "url", defaultValue: "/collections/all" },
    {
      name: "items",
      type: "list",
      subFields: [productReference("product", "Product")],
    },
  ],
});

Builder.registerComponent(Breadcrumbs, {
  name: "Breadcrumbs",
  friendlyName: "Breadcrumbs",
  inputs: [
    {
      name: "items",
      type: "list",
      defaultValue: [{ label: "Home", href: "/" }, { label: "Shop", href: "/collections/all" }, { label: "Current page" }],
      subFields: [
        { name: "label", type: "string", localized: true },
        { name: "href", type: "url" },
      ],
    },
  ],
});

// ─── Cart, checkout, orders ────────────────────────────────────────────────
Builder.registerComponent(CartPage, {
  name: "CartPage",
  friendlyName: "Cart Page",
  inputs: [
    { name: "heading", type: "string", defaultValue: "Your cart", localized: true },
    { name: "emptyMessage", type: "string", defaultValue: "Your cart is empty.", localized: true },
    { name: "continueHref", type: "url", defaultValue: "/collections/all" },
    { name: "checkoutHref", type: "url", defaultValue: "/checkout" },
    { name: "freeShippingThreshold", type: "number", defaultValue: 50 },
  ],
});

Builder.registerComponent(ShippingProgress, {
  name: "ShippingProgress",
  friendlyName: "Free Shipping Progress",
  inputs: [
    { name: "threshold", type: "number", defaultValue: 50 },
    { name: "currency", type: "string", defaultValue: "USD" },
  ],
});

Builder.registerComponent(CheckoutForm, {
  name: "CheckoutForm",
  friendlyName: "Checkout Form",
  inputs: [
    { name: "heading", type: "string", defaultValue: "Checkout", localized: true },
    { name: "flatShipping", type: "number", defaultValue: 5 },
    { name: "freeShippingThreshold", type: "number", defaultValue: 50 },
    { name: "taxRatePercent", type: "number", defaultValue: 0, helperText: "Percentage, e.g. 8.5" },
    { name: "confirmationHref", type: "url", defaultValue: "/checkout/confirmation" },
    { name: "placeOrderLabel", type: "string", defaultValue: "Place order", localized: true },
  ],
});

Builder.registerComponent(OrderConfirmation, {
  name: "OrderConfirmation",
  friendlyName: "Order Confirmation",
  inputs: [{ name: "heading", type: "string", defaultValue: "Thank you for your order!", localized: true }],
});

// ─── Customer ──────────────────────────────────────────────────────────────
Builder.registerComponent(LoginForm, {
  name: "LoginForm",
  friendlyName: "Customer Login",
  inputs: [
    { name: "heading", type: "string", defaultValue: "Sign in", localized: true },
    { name: "submitLabel", type: "string", defaultValue: "Sign in", localized: true },
    { name: "notice", type: "string", defaultValue: "Demo sign-in: details stay in this browser. Connect your identity provider before launch." },
  ],
});

Builder.registerComponent(AccountDashboard, {
  name: "AccountDashboard",
  friendlyName: "Customer Account",
  description: "Profile summary and order history. Shows the login form when signed out.",
  inputs: [{ name: "heading", type: "string", defaultValue: "My account", localized: true }],
});

Builder.registerComponent(WishlistGrid, {
  name: "WishlistGrid",
  friendlyName: "Wishlist",
  inputs: [
    { name: "heading", type: "string", defaultValue: "Your wishlist", localized: true },
    { name: "emptyMessage", type: "string", defaultValue: "Nothing saved yet. Tap the heart on any product to save it.", localized: true },
  ],
});

// ─── Navigation, search, content ───────────────────────────────────────────
Builder.registerComponent(SearchBox, {
  name: "SearchBox",
  friendlyName: "Search Box",
  inputs: [{ name: "placeholder", type: "string", defaultValue: "Search products…", localized: true }],
});

Builder.registerComponent(LocaleSwitcher, {
  name: "LocaleSwitcher",
  friendlyName: "Locale Switcher",
  inputs: [{ name: "label", type: "string", defaultValue: "Language", localized: true }],
});

Builder.registerComponent(FAQAccordion, {
  name: "FAQAccordion",
  friendlyName: "FAQ Accordion",
  inputs: [
    { name: "heading", type: "string", defaultValue: "Frequently asked questions", localized: true },
    {
      name: "items",
      type: "list",
      defaultValue: [{ question: "How long does shipping take?", answer: "Orders ship within 1–2 business days and arrive in 3–7 days." }],
      subFields: [
        { name: "question", type: "string", localized: true },
        { name: "answer", type: "longText", localized: true },
      ],
    },
  ],
});
