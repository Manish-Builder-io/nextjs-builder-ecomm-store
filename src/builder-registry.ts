"use client";
import { builder, Builder } from "@builder.io/react";
import Hero from "@/components/Hero";
import ProductGrid from "@/components/ProductGrid";
import ProductCard from "@/components/ProductCard";
import ConversionButton from "@/components/ui/ConversionButton";
import AlternatingBlock from "@/components/AlternatingBlock/AlternatingBlock";
import Heading from "@/components/Heading";

builder.init(process.env.NEXT_PUBLIC_BUILDER_API_KEY!);


Builder.registerComponent(Hero, {
  name: "Hero",
  inputs: [
    {
      name: "title",
      type: "string",
      defaultValue: "Discover your next favorite",
    },
    {
      name: "subtitle",
      type: "string",
      defaultValue: "Premium products curated for everyday life.",
    },
    {
      name: "image",
      type: "file",
    },
    {
      name: "ctaPrimary",
      type: "object",
      defaultValue: { label: "Shop now", href: "/collections/all" },
      subFields: [
        {
          name: "label",
          type: "string",
        },
        {
          name: "href",
          type: "string",
        },
      ],
    },
    {
      name: "ctaSecondary",
      type: "object",
      defaultValue: { label: "Explore", href: "/collections/new" },
      subFields: [
        {
          name: "label",
          type: "string",
        },
        {
          name: "href",
          type: "string",
        },
      ],
    },
  ],
});

Builder.registerComponent(ProductGrid, {
  name: "ProductGrid",
  inputs: [
    {
      name: "products",
      type: "list",
      defaultValue: [],
      subFields: [
        {
          name: "id",
          type: "string",
        },
        {
          name: "title",
          type: "string",
        },
        {
          name: "description",
          type: "string",
        },
        {
          name: "price",
          type: "number",
        },
        {
          name: "compareAtPrice",
          type: "number",
        },
        {
          name: "currency",
          type: "string",
          defaultValue: "USD",
        },
        {
          name: "imageSrc",
          type: "file",
        },
        {
          name: "badge",
          type: "string",
          enum: ["new", "sale", "featured"],
        },
        {
          name: "rating",
          type: "number",
          defaultValue: 0,
        },
        {
          name: "ratingCount",
          type: "number",
          defaultValue: 0,
        },
      ],
    },
  ],
});

Builder.registerComponent(ProductCard, {
  name: "ProductCard",
  inputs: [
    {
      name: "product",
      type: "object",
      subFields: [
        {
          name: "id",
          type: "string",
        },
        {
          name: "title",
          type: "string",
        },
        {
          name: "description",
          type: "string",
        },
        {
          name: "price",
          type: "number",
        },
        {
          name: "compareAtPrice",
          type: "number",
        },
        {
          name: "currency",
          type: "string",
          defaultValue: "USD",
        },
        {
          name: "imageSrc",
          type: "file",
        },
        {
          name: "badge",
          type: "string",
          enum: ["new", "sale", "featured"],
        },
        {
          name: "rating",
          type: "number",
          defaultValue: 0,
        },
        {
          name: "ratingCount",
          type: "number",
          defaultValue: 0,
        },
      ],
    },
  ],
});

Builder.registerComponent(Heading, {
  name: "Heading",
  inputs: [
    {
      name: "text",
      type: "string",
      defaultValue: "Add a headline",
      localized: true,
      helperText: "Supports per-locale copy with a 10-120 character range.",
      onChange: (options) => {
        const currentLocale =
          (options.builder &&
            options.builder.state &&
            options.builder.state.context &&
            options.builder.state.context.locale) ||
          options.locale;
        const value = options.get("text") as
          | string
          | Record<string, unknown>
          | undefined
          | null;
        const minLength = 4;
        const maxLength = 12;
        const globalScope =
          typeof globalThis === "object" && globalThis !== null
            ? (globalThis as typeof globalThis & {
                alert?: (value: string) => void;
              })
            : undefined;
        const showAlert = (message: string) => {
          if (typeof globalScope?.alert === "function") {
            globalScope.alert(message);
            return;
          }

          if (typeof alert === "function") {
            alert(message);
          }
        };

        if (typeof value === "string") {
          if (value.length > maxLength) {
            options.set("text", value.slice(0, maxLength));
            showAlert(`Maximum length of ${maxLength} reached${currentLocale ? ` for locale ${currentLocale}` : ""}.`);
          }

          if (value.length !== 0 && value.length < minLength) {
            showAlert(
              `${currentLocale ? `Locale ${currentLocale}` : "Heading text"} must have at least ${minLength} characters.`,
            );
          }
          return;
        }

        if (!value || typeof value !== "object") {
          return;
        }

        const mapCandidate = value as unknown as Map<string, unknown>;
        const isMapLike =
          typeof mapCandidate?.forEach === "function" &&
          typeof mapCandidate?.entries === "function";

        const entries = isMapLike
          ? Array.from(mapCandidate.entries())
          : Object.entries(value as Record<string, unknown>);

        let didModify = false;

        entries.forEach(([locale, localeValue]) => {
          if (locale.startsWith("@") || typeof localeValue !== "string") {
            return;
          }

          if (localeValue.length > maxLength) {
            const truncated = localeValue.slice(0, maxLength);
            if (isMapLike) {
              mapCandidate.set(locale, truncated);
            } else {
              (value as Record<string, unknown>)[locale] = truncated;
            }
            didModify = true;
            showAlert(`Maximum length of ${maxLength} reached for locale ${locale}.`);
          }

          if (localeValue.length !== 0 && localeValue.length < minLength) {
            showAlert(`Locale ${locale} must have at least ${minLength} characters.`);
          }
        });

        if (!isMapLike && didModify) {
          options.set("text", { ...(value as Record<string, unknown>) });
        }
      },
    },
    {
      name: "level",
      type: "string",
      enum: ["h1", "h2", "h3", "h4", "h5", "h6"],
      defaultValue: "h2",
    },
    {
      name: "align",
      type: "string",
      enum: ["left", "center", "right"],
      defaultValue: "left",
    },
  ],
});

// Builder.register("editor.settings", {
//   designTokens: {
//     colors: [
//       { name: "Black", value: "#000000" },
//       { name: "White", value: "#FFFFFF" },
//       { name: "Primary", value: "var(--color-primary)" },
//       { name: "Primary Light", value: "var(--color-primary-light)" },
//       { name: "Primary Dark", value: "var(--color-primary-dark)" },
//       { name: "Secondary", value: "var(--color-secondary)" },
//       { name: "Secondary Light", value: "var(--color-secondary-light)" },
//       { name: "Secondary Dark", value: "var(--color-secondary-dark-mode-version-of-primary)" },
//     ],
//     fontFamily: [
//       { name: "Primary Font", value: "var(--font-family-base)" },
//       { name: "Callout Font", value: "var(--font-family-callout)" },
//     ],
//     fontSize: [
//       { name: "Base Font Size", value: "var(--font-size-base)" },
//       { name: "Large Font Size", value: "var(--font-size-large)" },
//       { name: "Small Font Size", value: "var(--font-size-small)" },
//       { name: "Callout Font Size", value: "var(--font-size-callout)" },
//     ],
//   },
// });

// Register ConversionButton component
Builder.registerComponent(ConversionButton, {
  name: "ConversionButton",
  inputs: [
    {
      name: "text",
      type: "string",
      defaultValue: "Track Conversion",
      description: "Button text to display"
    },
    {
      name: "amount",
      type: "number",
      description: "Optional conversion amount (e.g., 99.99 for $99.99 conversion)"
    },
    {
      name: "variant",
      type: "string",
      enum: ["primary", "secondary", "outline"],
      defaultValue: "primary",
      description: "Button style variant"
    },
    {
      name: "size",
      type: "string",
      enum: ["sm", "md", "lg"],
      defaultValue: "md",
      description: "Button size"
    },
    {
      name: "disabled",
      type: "boolean",
      defaultValue: false,
      description: "Whether the button is disabled"
    },
    {
      name: "className",
      type: "string",
      description: "Additional CSS classes"
    }
  ],
  description: "A button component that tracks Builder.io conversions when clicked. Can track conversions with or without a specified amount."
});

// Register AlternatingBlock component
Builder.registerComponent(AlternatingBlock, {
  name: "AlternatingBlock",
  friendlyName: "Alternating Block",
  image: "https://cdn.builder.io/api/v1/image/assets/your-space-id/icon-alternating-block",
  inputs: [
    {
      name: "author",
      friendlyName: "Author",
      type: "reference",
      model: "author",
      helperText: "Select an author (can be single author or multiple authors)",
    },
    {
      name: "title",
      friendlyName: "Title",
      type: "string",
      defaultValue: "Default Title",
      helperText: "Main heading for the alternating block",
    },
    {
      name: "subtitle",
      friendlyName: "Subtitle",
      type: "string",
      helperText: "Optional subtitle or category text",
    },
    {
      name: "description",
      friendlyName: "Description",
      type: "longText",
      defaultValue: "Default description text",
      helperText: "Main description text for the block",
    },
    {
      name: "image",
      friendlyName: "Image",
      type: "file",
      helperText: "Image to display in the alternating block",
    },
    {
      name: "imageAlt",
      friendlyName: "Image Alt Text",
      type: "string",
      defaultValue: "Alternating block image",
      helperText: "Alt text for accessibility",
    },
    {
      name: "ctaText",
      friendlyName: "Call to Action Text",
      type: "string",
      defaultValue: "Learn More",
      helperText: "Text for the call-to-action button",
    },
    {
      name: "ctaLink",
      friendlyName: "Call to Action Link",
      type: "string",
      defaultValue: "#",
      helperText: "URL for the call-to-action button",
    },
    {
      name: "reverseLayout",
      friendlyName: "Reverse Layout",
      type: "boolean",
      defaultValue: false,
      helperText: "Reverse the order of content and image",
    },
    {
      name: "backgroundColor",
      friendlyName: "Background Color",
      type: "string",
      defaultValue: "bg-white",
      helperText: "Background color class (e.g., bg-white, bg-gray-50)",
    },
    {
      name: "textColor",
      friendlyName: "Text Color",
      type: "string",
      defaultValue: "text-gray-900",
      helperText: "Text color class (e.g., text-gray-900, text-white)",
    },
    {
      name: "paddingTop",
      friendlyName: "Top Padding",
      type: "string",
      enum: ["sm", "md", "lg", "xl", "2xl"],
      defaultValue: "lg",
      helperText: "Top padding size",
    },
    {
      name: "paddingBottom",
      friendlyName: "Bottom Padding",
      type: "string",
      enum: ["sm", "md", "lg", "xl", "2xl"],
      defaultValue: "lg",
      helperText: "Bottom padding size",
    },
  ],
  description: "A responsive alternating block component with customizable layout, colors, and content."
});

Builder.register("editor.settings", {
  styleStrictMode: false, // optional
  allowOverridingTokens: true, 
  designTokens: {
    colors: [
      {
        name: "Transparent",
        value: "var(--color-transparent, rgb(0 0 0 / 0%))",
      },
      { name: "White", value: "var(--color-white, rgb(255 255 255))" },
      { name: "Black", value: "var(--color-black, rgb(0 0 0))" },

      {
        name: "Primary 800",
        value: "var(--color-primary-800, rgb(227 128 13))",
      },

      {
        name: "Secondary 500",
        value: "var(--color-secondary-500, rgb(2 75 109))",
      },
      {
        name: "Secondary 600",
        value: "var(--color-secondary-600, rgb(0 53 68))",
      },
      {
        name: "Secondary 700",
        value: "var(--color-secondary-700, rgb(10 42 58))",
      },

      { name: "Accent 500", value: "var(--color-accent-500, rgb(0 206 166))" },

      {
        name: "Neutral 50",
        value: "var(--color-neutral-50, rgb(245 246 248))",
      },
      {
        name: "Neutral 200",
        value: "var(--color-neutral-200, rgb(190 190 190))",
      },
      {
        name: "Neutral 500",
        value: "var(--color-neutral-500, rgb(116 124 128))",
      },
      { name: "Neutral 800", value: "var(--color-neutral-800, rgb(56 60 67))" },
      { name: "Neutral 900", value: "var(--color-neutral-900, rgb(0 0 0))" },

      {
        name: "Feedback Danger",
        value: "var(--color-feedback-danger, rgb(235 64 21))",
      },
      {
        name: "Feedback Warning",
        value: "var(--color-feedback-warning, rgb(255 177 54))",
      },
      {
        name: "Feedback Success",
        value: "var(--color-feedback-success, rgb(12 118 99))",
      },

      {
        name: "Background Body",
        value: "var(--color-bg-body, rgb(255 255 255))",
      },
      {
        name: "Background Neutral Subtle",
        value: "var(--color-bg-neutral-subtle, rgb(245 246 248))",
      },

      { name: "Foreground Body", value: "var(--color-fg-body, rgb(56 60 67))" },
      {
        name: "Foreground Heading",
        value: "var(--color-fg-heading, rgb(0 0 0))",
      },
      {
        name: "Foreground Caption",
        value: "var(--color-fg-caption, rgb(116 124 128))",
      },
      
      // Unicode Testing Colors
      { name: "Test Success", value: "var(--color-test-success, rgb(34 197 94))" },
      { name: "Test Warning", value: "var(--color-test-warning, rgb(245 158 11))" },
      { name: "Test Error", value: "var(--color-test-error, rgb(239 68 68))" },
      { name: "Test Info", value: "var(--color-test-info, rgb(59 130 246))" },
      
      // Language-specific colors for unicode testing
      { name: "Latin Text", value: "var(--color-latin-text, rgb(0 0 0))" },
      { name: "Vietnamese Text", value: "var(--color-vietnamese-text, rgb(2 75 109))" },
      { name: "Cyrillic Text", value: "var(--color-cyrillic-text, rgb(227 128 13))" },
      { name: "Greek Text", value: "var(--color-greek-text, rgb(0 206 166))" },
      { name: "Devanagari Text", value: "var(--color-devanagari-text, rgb(12 118 99))" },
    ],
    spacing: [
      { name: "None", value: "var(--spacing-none, 0)" },
      { name: "2XS", value: "var(--spacing-2xs, 4px)" },
      { name: "XS", value: "var(--spacing-xs, 8px)" },
      { name: "SM", value: "var(--spacing-sm, 12px)" },
      { name: "MD", value: "var(--spacing-md, 16px)" },
      { name: "LG", value: "var(--spacing-lg, 20px)" },
      { name: "XL", value: "var(--spacing-xl, 24px)" },
      { name: "2XL", value: "var(--spacing-2xl, 32px)" },
      { name: "3XL", value: "var(--spacing-3xl, 40px)" },
      { name: "4XL", value: "var(--spacing-4xl, 48px)" },
      { name: "5XL", value: "var(--spacing-5xl, 64px)" },
      { name: "6XL", value: "var(--spacing-6xl, 80px)" },
      { name: "7XL", value: "var(--spacing-7xl, 96px)" },
      { name: "8XL", value: "var(--spacing-8xl, 128px)" },
    ],
    lineHeight: [
      { name: "XS", value: "var(--line-height-xs, 18px)" },
      { name: "SM", value: "var(--line-height-sm, 20px)" },
      { name: "MD", value: "var(--line-height-md, 22px)" },
      { name: "LG", value: "var(--line-height-lg, 24px)" },
      { name: "XL", value: "var(--line-height-xl, 26px)" },
      { name: "2XL", value: "var(--line-height-2xl, 28px)" },
      { name: "3XL", value: "var(--line-height-3xl, 32px)" },
      { name: "4XL", value: "var(--line-height-4xl, 36px)" },
      { name: "5XL", value: "var(--line-height-5xl, 40px)" },
      { name: "6XL", value: "var(--line-height-6xl, 46px)" },
      { name: "7XL", value: "var(--line-height-7xl, 52px)" },
      { name: "8XL", value: "var(--line-height-8xl, 60px)" },
    ],
    fontFamily: [
      { name: "Work Sans", value: "var(--font-family-work-sans)" },
      { name: "Roboto", value: "var(--font-roboto)" },
      {
        name: "Roboto Slab",
        value: "var(--font-roboto-slab)",
      },
      {
        name: "Helvetica Neue",
        value: "var(--font-family-base)",
      },
    ],
    fontSize: [
      { name: "Heading XS", value: "var(--font-size-heading-xs, 24px)" },
      { name: "Heading SM", value: "var(--font-size-heading-sm, 24px)" },
      { name: "Heading MD", value: "var(--font-size-heading-md, 36px)" },
      { name: "Heading LG", value: "var(--font-size-heading-lg, 40px)" },
      { name: "Heading XL", value: "var(--font-size-heading-xl, 48px)" },
      { name: "Heading 2XL", value: "var(--font-size-heading-2xl, 56px)" },

      { name: "Title XS", value: "var(--font-size-title-xs, 14px)" },
      { name: "Title SM", value: "var(--font-size-title-sm, 16px)" },
      { name: "Title MD", value: "var(--font-size-title-md, 20px)" },
      { name: "Title LG", value: "var(--font-size-title-lg, 24px)" },

      { name: "Body XS", value: "var(--font-size-body-xs, 10px)" },
      { name: "Body SM", value: "var(--font-size-body-sm, 12px)" },
      { name: "Body MD", value: "var(--font-size-body-md, 14px)" },
      { name: "Body LG", value: "var(--font-size-body-lg, 16px)" },
      { name: "Body XL", value: "var(--font-size-body-xl, 18px)" },

      { name: "Caption XS", value: "var(--font-size-caption-xs, 8px)" },
      { name: "Caption SM", value: "var(--font-size-caption-sm, 10px)" },
      { name: "Caption MD", value: "var(--font-size-caption-md, 12px)" },
    ],
    fontWeight: [
      { name: "Thin", value: "var(--font-weight-thin, 100)" },
      { name: "Extra Light", value: "var(--font-weight-extralight, 200)" },
      { name: "Light", value: "var(--font-weight-light, 300)" },
      { name: "Normal", value: "var(--font-weight-normal, 400)" },
      { name: "Medium", value: "var(--font-weight-medium, 500)" },
      { name: "Semibold", value: "var(--font-weight-semibold, 600)" },
      { name: "Bold", value: "var(--font-weight-bold, 700)" },
      { name: "Extra Bold", value: "var(--font-weight-extrabold, 800)" },
      { name: "Black", value: "var(--font-weight-black, 900)" },
    ],
  },
});
