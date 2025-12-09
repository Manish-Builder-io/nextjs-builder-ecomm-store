"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";

interface CloudinaryImage {
  secure_url?: string;
  url?: string;
  public_id?: string;
  width?: number;
  height?: number;
  context?: {
    custom?: {
      alt?: string;
      caption?: string;
    };
  };
}

interface NavigationItem {
  label?: string;
  href?: string;
  children?: NavigationItem[];
  [key: string]: any;
}

interface NavigationData {
  items?: NavigationItem[];
  [key: string]: any;
}

interface HeaderV1Props {
  logo?: CloudinaryImage | string;
  theme?: "light" | "dark";
  showSearch?: boolean;
  searchResultPath?: string;
  locales?: string[];
  localeCustomClasses?: string;
  localeAriaLabel?: string;
  backgroundImage?: CloudinaryImage | string;
  navigation?: NavigationData | { "@type": "@builder.io/core:Reference"; value?: NavigationData };
}

const HeaderV1: React.FC<HeaderV1Props> = ({
  logo,
  theme = "light",
  showSearch = true,
  searchResultPath = "/searchResult",
  locales = [],
  localeCustomClasses = "m-2 px-4 py-2 text-sm font-medium text-primary-light bg-transparent rounded-md hover:text-color-secondary cursor-pointer",
  localeAriaLabel = "Switch language",
  backgroundImage,
  navigation,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Handle navigation reference
  const getNavigationData = (): NavigationData | null => {
    if (!navigation) return null;

    // Handle Builder.io reference object
    if (
      navigation &&
      typeof navigation === "object" &&
      "@type" in navigation &&
      navigation["@type"] === "@builder.io/core:Reference"
    ) {
      return navigation.value || null;
    }

    // Handle direct navigation object
    return navigation;
  };

  const navigationData = getNavigationData();

  // Get logo URL
  const getLogoUrl = (): string | null => {
    if (!logo) return null;
    if (typeof logo === "string") return logo;
    return logo.secure_url || logo.url || null;
  };

  const logoUrl = getLogoUrl();
  const logoAlt = typeof logo === "object" && logo.context?.custom?.alt ? logo.context.custom.alt : "Logo";

  // Get background image URL
  const getBackgroundImageUrl = (): string | null => {
    if (!backgroundImage) return null;
    if (typeof backgroundImage === "string") return backgroundImage;
    return backgroundImage.secure_url || backgroundImage.url || null;
  };

  const backgroundImageUrl = getBackgroundImageUrl();

  // Handle search submission
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `${searchResultPath}?q=${encodeURIComponent(searchQuery)}`;
    }
  };

  const themeClasses =
    theme === "dark"
      ? "bg-gray-900 text-white"
      : "bg-white text-gray-900 border-b border-gray-200";

  return (
    <header
      className={`sticky top-0 z-50 w-full ${themeClasses} shadow-sm`}
      style={
        backgroundImageUrl
          ? {
              backgroundImage: `url(${backgroundImageUrl})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
            }
          : undefined
      }
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center">
              {logoUrl ? (
                <Image
                  src={logoUrl}
                  alt={logoAlt}
                  width={typeof logo === "object" && logo.width ? logo.width : 272}
                  height={typeof logo === "object" && logo.height ? logo.height : 53}
                  className="h-auto max-h-12 w-auto"
                  priority
                />
              ) : (
                <span className="text-lg font-semibold">Logo</span>
              )}
            </Link>
          </div>

          {/* Navigation */}
          {navigationData?.items && navigationData.items.length > 0 && (
            <nav aria-label="Primary" className="hidden md:flex items-center gap-6">
              {navigationData.items.map((item, index) => (
                <Link
                  key={index}
                  href={item.href || "#"}
                  className={`text-sm font-medium hover:opacity-80 transition-opacity ${
                    theme === "dark" ? "text-white" : "text-gray-900"
                  }`}
                >
                  {item.label || "Link"}
                </Link>
              ))}
            </nav>
          )}

          {/* Right side: Search and Locales */}
          <div className="flex items-center gap-4">
            {/* Search */}
            {showSearch && (
              <form onSubmit={handleSearch} className="hidden sm:block">
                <input
                  type="search"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-56 rounded-md border px-3 py-2 text-sm placeholder:opacity-60 focus:outline-none focus:ring-2 ${
                    theme === "dark"
                      ? "border-gray-700 bg-gray-800 text-white placeholder:text-gray-400 focus:ring-gray-600"
                      : "border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus:ring-gray-500"
                  }`}
                  aria-label="Search"
                />
              </form>
            )}

            {/* Locales */}
            {locales && locales.length > 0 && (
              <div className="hidden md:flex items-center gap-2">
                {locales.map((locale, index) => (
                  <button
                    key={index}
                    className={localeCustomClasses}
                    aria-label={`${localeAriaLabel} ${locale}`}
                  >
                    {locale}
                  </button>
                ))}
              </div>
            )}

            {/* Mobile menu button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className={`md:hidden p-2 rounded-md ${
                theme === "dark" ? "text-white hover:bg-gray-800" : "text-gray-900 hover:bg-gray-100"
              }`}
              aria-label="Toggle menu"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {isMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {isMenuOpen && (
          <div
            className={`md:hidden border-t py-4 ${
              theme === "dark" ? "border-gray-700" : "border-gray-200"
            }`}
          >
            {showSearch && (
              <form onSubmit={handleSearch} className="mb-4 px-2">
                <input
                  type="search"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full rounded-md border px-3 py-2 text-sm placeholder:opacity-60 focus:outline-none focus:ring-2 ${
                    theme === "dark"
                      ? "border-gray-700 bg-gray-800 text-white placeholder:text-gray-400 focus:ring-gray-600"
                      : "border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus:ring-gray-500"
                  }`}
                  aria-label="Search"
                />
              </form>
            )}
            {navigationData?.items && navigationData.items.length > 0 && (
              <nav className="flex flex-col gap-2 px-2">
                {navigationData.items.map((item, index) => (
                  <Link
                    key={index}
                    href={item.href || "#"}
                    onClick={() => setIsMenuOpen(false)}
                    className={`py-2 text-sm font-medium ${
                      theme === "dark" ? "text-white" : "text-gray-900"
                    }`}
                  >
                    {item.label || "Link"}
                  </Link>
                ))}
              </nav>
            )}
            {locales && locales.length > 0 && (
              <div className="flex flex-wrap gap-2 px-2 mt-4">
                {locales.map((locale, index) => (
                  <button
                    key={index}
                    className={localeCustomClasses}
                    aria-label={`${localeAriaLabel} ${locale}`}
                  >
                    {locale}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};

export default HeaderV1;

