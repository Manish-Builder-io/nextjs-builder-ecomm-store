 "use client";
import { builder, Builder } from "@builder.io/react";
import PromoBar from "@/components/homepage/PromoBar";
import HomeHero from "@/components/homepage/HomeHero";
import CategorySection from "@/components/homepage/CategorySection";
import FeaturedProductsSection from "@/components/homepage/FeaturedProductsSection";
import PromoBanner from "@/components/homepage/PromoBanner";
import TestimonialsSection from "@/components/homepage/TestimonialsSection";
import NewsletterSection from "@/components/homepage/NewsletterSection";
import Hero from "@/components/Hero";
import ProductGrid from "@/components/ProductGrid";
import ProductCard from "@/components/ProductCard";
import ConversionButton from "@/components/ui/ConversionButton";
import CoreButton from "@/components/ui/CoreButton";
import AlternatingBlock from "@/components/AlternatingBlock/AlternatingBlock";
import Heading from "@/components/Heading";
import HeaderV1 from "@/components/Header-V1";
import ExploreColleges from "@/components/ExploreColleges";
import ValidationTestComponent from "@/components/ValidationTestComponent";
import VideoPlayer from "@/components/VideoPlayer";
import RelatedArticles from "@/components/RelatedArticles";
import BlogCard from "@/components/BlogCard";
import SizeChartTabs from "@/components/SizeChartTabs";

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
      copyOnAdd: true,
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
      type: "richText",
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

        // Inject CSS for error styling if not already injected
        if (typeof document !== "undefined") {
          const styleId = "builder-heading-validation-styles";
          if (!document.getElementById(styleId)) {
            const style = document.createElement("style");
            style.id = styleId;
            style.textContent = `
              .builder-heading-text-error {
                border: 2px solid red !important;
                border-radius: 4px !important;
                outline: none !important;
              }
              .builder-heading-text-error:focus {
                border-color: red !important;
                box-shadow: 0 0 0 3px rgba(255, 0, 0, 0.1) !important;
              }
              .builder-heading-helper-error {
                color: red !important;
                font-weight: 500 !important;
              }
            `;
            document.head.appendChild(style);
          }
        }

        // Helper function to extract text length from richText content
        const getTextLength = (richTextValue: unknown): number => {
          if (typeof richTextValue === "string") {
            // If it's HTML, strip tags to get plain text length
            if (typeof document !== "undefined") {
              const tempDiv = document.createElement("div");
              if (richTextValue.includes("<")) {
                tempDiv.innerHTML = richTextValue;
                return tempDiv.textContent?.length || 0;
              }
            }
            return richTextValue.length;
          }
          return 0;
        };

        // Helper function to truncate richText content
        const truncateRichText = (richTextValue: string, maxLen: number): string => {
          if (typeof document !== "undefined") {
            const tempDiv = document.createElement("div");
            if (richTextValue.includes("<")) {
              tempDiv.innerHTML = richTextValue;
              const textContent = tempDiv.textContent || "";
              if (textContent.length > maxLen) {
                // Simple truncation - in production, you might want more sophisticated HTML truncation
                return textContent.slice(0, maxLen);
              }
              return richTextValue;
            }
          }
          return richTextValue.length > maxLen ? richTextValue.slice(0, maxLen) : richTextValue;
        };

        // Helper function to apply error styles via DOM manipulation
        const applyErrorStyles = (hasError: boolean, message: string) => {
          if (typeof document === "undefined" || !options.builder) {
            return;
          }

          // Use setTimeout to ensure DOM is ready
          setTimeout(() => {
            const helpText = hasError 
              ? message 
              : "Supports per-locale copy with a 10-120 character range.";

            // Try multiple selectors to find the input field
            const possibleSelectors = [
              '[name="text"]',
              '[data-field-name="text"]',
              'input[type="text"]',
              '.builder-input',
              'textarea',
              '.ProseMirror', // Rich text editor
              '[contenteditable="true"]',
            ];

            let inputFound = false;
            for (const selector of possibleSelectors) {
              const inputs = document.querySelectorAll(selector);
              if (inputs.length > 0) {
                inputs.forEach((input: Element) => {
                  // Check if this input is related to our field by looking at parent context
                  const fieldLabel = input.closest('[data-field-name="text"]') || 
                                    input.closest('.builder-field') ||
                                    input.parentElement?.querySelector('label');
                  
                  if (fieldLabel || inputs.length === 1) {
                    inputFound = true;
                    if (hasError) {
                      (input as HTMLElement).style.border = "2px solid red";
                      (input as HTMLElement).style.borderRadius = "4px";
                    } else {
                      (input as HTMLElement).style.border = "";
                      (input as HTMLElement).style.borderRadius = "";
                    }
                  }
                });
                if (inputFound) break;
              }
            }

            // Find and update helper text
            const helperTextSelectors = [
              '.builder-helper-text',
              '.helper-text',
              '[data-helper-text]',
              '.MuiFormHelperText-root',
            ];

            for (const selector of helperTextSelectors) {
              const helpers = document.querySelectorAll(selector);
              if (helpers.length > 0) {
                helpers.forEach((helper: Element) => {
                  // Check if this helper is near our input field
                  const input = helper.closest('.builder-field')?.querySelector('input, textarea, [contenteditable]');
                  if (input) {
                    (helper as HTMLElement).textContent = helpText;
                    if (hasError) {
                      (helper as HTMLElement).style.color = "red";
                      (helper as HTMLElement).style.fontWeight = "500";
                    } else {
                      (helper as HTMLElement).style.color = "";
                      (helper as HTMLElement).style.fontWeight = "";
                    }
                  }
                });
                break;
              }
            }
          }, 100);
        };

        if (typeof value === "string") {
          const textLength = getTextLength(value);
          if (textLength > maxLength) {
            const truncated = truncateRichText(value, maxLength);
            options.set("text", truncated);
            applyErrorStyles(
              true,
              `Maximum length of ${maxLength} reached${currentLocale ? ` for locale ${currentLocale}` : ""}.`
            );
          } else if (textLength !== 0 && textLength < minLength) {
            applyErrorStyles(
              true,
              `${currentLocale ? `Locale ${currentLocale}` : "Heading text"} must have at least ${minLength} characters.`
            );
          } else {
            applyErrorStyles(false, "");
          }
          return;
        }

        if (!value || typeof value !== "object") {
          return;
        }

        const entries = Object.entries(value as Record<string, unknown>);
        let hasError = false;
        let errorMessage = "";

        entries.forEach(([locale, localeValue]) => {
          if (locale.startsWith("@") || typeof localeValue !== "string") {
            return;
          }

          const textLength = getTextLength(localeValue);
          if (textLength > maxLength) {
            const truncated = truncateRichText(localeValue, maxLength);
            options.set("text", { ...(value as Record<string, unknown>), [locale]: truncated });
            hasError = true;
            errorMessage = `Maximum length of ${maxLength} reached for locale ${locale}.`;
          } else if (textLength !== 0 && textLength < minLength) {
            hasError = true;
            errorMessage = `Locale ${locale} must have at least ${minLength} characters.`;
          }
        });

        applyErrorStyles(hasError, errorMessage);
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



Builder.register("editor.settings", {
  styleStrictMode: false, // optional
  designTokensOptional: true,
  allowOverridingTokens: true,
  designTokens: {
    colors: [
      { name: "Brand Red", value: "var(--red, #ff0000)" },
      { name: "Brand Blue", value: "rgba(93, 150, 255, 1)" },
    ],
    spacing: [
      { name: "Large", value: "var(--space-large, 20px)" },
      { name: "Small", value: "var(--space-small, 10px)" },
      { name: "Tiny", value: "5px" },
    ],
    fontFamily: [
      { name: 'Serif Font', value: 'var(--serif-font, Times, serif)' },
      { name: 'Primary Font', value: 'Roboto, sans-serif' },
    ]
  },
});

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

const shopifyHelperText = "This Shopify store \n has a Builder.io account but you are not logged in as a user with access.";



// Register CoreButton component - overrides the existing Core:Button component
Builder.registerComponent(CoreButton, {
  name: "Core:Button",
  override: true,
  inputs: [
    {
      name: "variant",
      type: "string",
      enum: ["primary", "secondary", "outline", "ghost"],
      defaultValue: "primary",
      description: "Button style variant",
      helperText: shopifyHelperText,
    },
    {
      name: "fontSize",
      type: "string",
      defaultValue: "16",
      description: "Font size in pixels"
    },
    {
      name: "text",
      type: "string",
      defaultValue: "Find a Clinic",
      description: "Button text to display"
    },
    {
      name: "link",
      type: "url",
      defaultValue: "https://skinlaundry.com/treatments/skintox/#skintox-locations",
      description: "URL to navigate to when button is clicked"
    },
    {
      name: "target",
      type: "string",
      enum: ["_self", "_blank", "_parent", "_top"],
      defaultValue: "_self",
      description: "Link target attribute"
    },
    {
      name: "className",
      type: "string",
      description: "Additional CSS classes"
    }
  ],
  description: "Core button component with customizable variant, font size, text, and link."
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

// Register Header-V1 component
Builder.registerComponent(HeaderV1, {
  name: "Header-V1",
  friendlyName: "Header V1",
  inputs: [
    {
      name: "logo",
      type: "file",
      friendlyName: "Logo",
      helperText: "Upload the logo image (Cloudinary image)",
    },
    {
      name: "theme",
      type: "string",
      enum: ["light", "dark"],
      defaultValue: "light",
      friendlyName: "Theme",
      helperText: "Select the header theme",
    },
    {
      name: "showSearch",
      type: "boolean",
      defaultValue: true,
      friendlyName: "Show Search",
      helperText: "Display search functionality in the header",
    },
    {
      name: "searchResultPath",
      type: "string",
      defaultValue: "/searchResult",
      friendlyName: "Search Result Path",
      helperText: "Path to redirect to when search is submitted",
    },
    {
      name: "locales",
      type: "list",
      defaultValue: [],
      friendlyName: "Locales",
      helperText: "List of available locales/languages",
      subFields: [
        {
          name: "locale",
          type: "string",
        },
      ],
    },
    {
      name: "localeCustomClasses",
      type: "string",
      defaultValue: "m-2 px-4 py-2 text-sm font-medium text-primary-light bg-transparent rounded-md hover:text-color-secondary cursor-pointer",
      friendlyName: "Locale Custom Classes",
      helperText: "CSS classes for locale switcher buttons",
    },
    {
      name: "localeAriaLabel",
      type: "string",
      defaultValue: "Switch language",
      friendlyName: "Locale Aria Label",
      helperText: "Accessibility label for locale switcher",
    },
    {
      name: "backgroundImage",
      type: "file",
      friendlyName: "Background Image",
      helperText: "Optional background image for the header (Cloudinary image)",
    },
    {
      name: "navigation",
      type: "reference",
      model: "navigation",
      friendlyName: "Navigation",
      helperText: "Select a navigation model to display menu items",
    },
  ],
  description: "A comprehensive header component with logo, navigation, search, and locale switching capabilities.",
});

// Register ExploreColleges component
Builder.registerComponent(ExploreColleges, {
  name: "ExploreColleges",
  friendlyName: "Explore Colleges",
  inputs: [
    {
      name: "heading",
      type: "string",
      defaultValue: "Explore more than 1,000 colleges on Common App",
      friendlyName: "Heading",
      helperText: "Main heading text",
    },
    {
      name: "searchPlaceholder",
      type: "string",
      defaultValue: "Enter college name",
      friendlyName: "Search Placeholder",
      helperText: "Placeholder text for the search input",
    },
    {
      name: "searchAction",
      type: "string",
      defaultValue: "/explore-college",
      friendlyName: "Search Action URL",
      helperText: "URL where the search form will submit",
    },
    {
      name: "filterLabel",
      type: "string",
      defaultValue: "Accepts first year application",
      friendlyName: "Filter Label",
      helperText: "Label text for the filter checkbox",
    },
    {
      name: "submitButtonText",
      type: "string",
      defaultValue: "Start",
      friendlyName: "Submit Button Text",
      helperText: "Text for the submit button",
    },
    {
      name: "viewAllLinkText",
      type: "string",
      defaultValue: "Or view all colleges",
      friendlyName: "View All Link Text",
      helperText: "Text for the 'view all' link",
    },
    {
      name: "viewAllLinkHref",
      type: "string",
      defaultValue: "/explore-college",
      friendlyName: "View All Link URL",
      helperText: "URL for the 'view all' link",
    },
    {
      name: "backgroundColor",
      type: "string",
      defaultValue: "#5ACCCB",
      friendlyName: "Background Color",
      helperText: "Background color (hex code or Tailwind class)",
    },
  ],
  description: "A college search component with search input and filter options.",
});

// Register VideoPlayer component
Builder.registerComponent(VideoPlayer, {
  name: "VideoPlayer",
  inputs: [
    {
      name: "videoType",
      type: "string",
      enum: ["hosted internally"],
      defaultValue: "hosted internally",
      helperText: "Currently only 'hosted internally' is supported.",
    },
    {
      name: "hostedVideoConfiguration",
      type: "object",
      required: true,
      subFields: [
        {
          name: "desktopSrc",
          type: "file",
          required: true,
          helperText: "Desktop video source URL",
        },
        {
          name: "tabletSrc",
          type: "file",
          helperText: "Tablet video source URL (optional)",
        },
        {
          name: "mobileSrc",
          type: "file",
          helperText: "Mobile video source URL (optional)",
        },
        {
          name: "autoPlay",
          type: "boolean",
          defaultValue: true,
          helperText: "Autoplay video (will be muted when autoplaying).",
        },
      ],
    },
    {
      name: "controlColor",
      type: "string",
      enum: ["light", "dark"],
      defaultValue: "light",
      helperText: "Theme for surrounding text/UI.",
    },
    {
      name: "posterImage",
      type: "file",
      helperText: "Poster image displayed before playback.",
      defaultValue:
        "https://cdn.builder.io/api/v1/image/assets%2Fd1a786c1a5b54cfc9d2a9230b6012b69%2F614c89300db0430da5cd3f04731cd834",
    },
    {
      name: "posterAlt",
      type: "string",
      helperText: "Alt text for the poster image.",
    },
    {
      name: "description",
      type: "string",
      helperText: "Optional description shown above the video.",
    },
    {
      name: "showControls",
      type: "boolean",
      defaultValue: true,
      helperText: "Show native video controls.",
    },
    {
      name: "preventMainPlayButtonClick",
      type: "boolean",
      defaultValue: false,
      helperText:
        "If true, clicking the main video area will not toggle play/pause.",
    },
    {
      name: "showFullscreen",
      type: "boolean",
      defaultValue: true,
      helperText: "If false, hide the fullscreen button where possible.",
    },
    {
      name: "duration",
      type: "string",
      helperText:
        "Optional duration label (e.g. '0:30'); leave empty to hide.",
    },
  ],
  description:
    "Responsive video player component for internally hosted videos with desktop/tablet/mobile sources.",
});

Builder.registerComponent(RelatedArticles, {
  name: "RelatedArticles",
  friendlyName: "Related Articles",
  inputs: [
    {
      name: "title",
      friendlyName: "Section Title",
      type: "string",
      defaultValue: "Related articles",
      helperText: "Heading shown above the related articles list.",
    },
    {
      name: "articles",
      friendlyName: "Related Article List",
      type: "list",
      helperText:
        "Add one or more list items; each item can reference one or more blog articles.",
      subFields: [
        {
          name: "articles",
          friendlyName: "Articles",
          type: "reference",
          model: "blog-articles",
          helperText:
            "Select one or more articles from the blog-articles model to feature as related.",
          options: {
            allowMultiple: true,
            enrich: true,
            enrichOptions: {
              enrichLevel: 2,
            },
          },
        },
      ],
    },
  ],
  description:
    "Displays a list of related blog articles with image, title, blurb, author, and date.",
});

// Builder.register("editor.settings", {
//   styleStrictMode: false, // optional
//   allowOverridingTokens: false, 
//   designTokens: {
//     colors: [
//       {
//         name: "Transparent",
//         value: "var(--color-transparent, rgb(0 0 0 / 0%))",
//       },
//       { name: "White", value: "var(--color-white, rgb(255 255 255))" },
//       { name: "Black", value: "var(--color-black, rgb(0 0 0))" },

//       {
//         name: "Primary 800",
//         value: "var(--color-primary-800, rgb(227 128 13))",
//       },

//       {
//         name: "Secondary 500",
//         value: "var(--color-secondary-500, rgb(2 75 109))",
//       },
//       {
//         name: "Secondary 600",
//         value: "var(--color-secondary-600, rgb(0 53 68))",
//       },
//       {
//         name: "Secondary 700",
//         value: "var(--color-secondary-700, rgb(10 42 58))",
//       },

//       { name: "Accent 500", value: "var(--color-accent-500, rgb(0 206 166))" },

//       {
//         name: "Neutral 50",
//         value: "var(--color-neutral-50, rgb(245 246 248))",
//       },
//       {
//         name: "Neutral 200",
//         value: "var(--color-neutral-200, rgb(190 190 190))",
//       },
//       {
//         name: "Neutral 500",
//         value: "var(--color-neutral-500, rgb(116 124 128))",
//       },
//       { name: "Neutral 800", value: "var(--color-neutral-800, rgb(56 60 67))" },
//       { name: "Neutral 900", value: "var(--color-neutral-900, rgb(0 0 0))" },

//       {
//         name: "Feedback Danger",
//         value: "var(--color-feedback-danger, rgb(235 64 21))",
//       },
//       {
//         name: "Feedback Warning",
//         value: "var(--color-feedback-warning, rgb(255 177 54))",
//       },
//       {
//         name: "Feedback Success",
//         value: "var(--color-feedback-success, rgb(12 118 99))",
//       },

//       {
//         name: "Background Body",
//         value: "var(--color-bg-body, rgb(255 255 255))",
//       },
//       {
//         name: "Background Neutral Subtle",
//         value: "var(--color-bg-neutral-subtle, rgb(245 246 248))",
//       },

//       { name: "Foreground Body", value: "var(--color-fg-body, rgb(56 60 67))" },
//       {
//         name: "Foreground Heading",
//         value: "var(--color-fg-heading, rgb(0 0 0))",
//       },
//       {
//         name: "Foreground Caption",
//         value: "var(--color-fg-caption, rgb(116 124 128))",
//       },
      
//       // Unicode Testing Colors
//       { name: "Test Success", value: "var(--color-test-success, rgb(34 197 94))" },
//       { name: "Test Warning", value: "var(--color-test-warning, rgb(245 158 11))" },
//       { name: "Test Error", value: "var(--color-test-error, rgb(239 68 68))" },
//       { name: "Test Info", value: "var(--color-test-info, rgb(59 130 246))" },
      
//       // Language-specific colors for unicode testing
//       { name: "Latin Text", value: "var(--color-latin-text, rgb(0 0 0))" },
//       { name: "Vietnamese Text", value: "var(--color-vietnamese-text, rgb(2 75 109))" },
//       { name: "Cyrillic Text", value: "var(--color-cyrillic-text, rgb(227 128 13))" },
//       { name: "Greek Text", value: "var(--color-greek-text, rgb(0 206 166))" },
//       { name: "Devanagari Text", value: "var(--color-devanagari-text, rgb(12 118 99))" },
//     ],

//     lineHeight: [
//       { name: "XS", value: "var(--line-height-xs, 18px)" },
//       { name: "SM", value: "var(--line-height-sm, 20px)" },
//       { name: "MD", value: "var(--line-height-md, 22px)" },
//       { name: "LG", value: "var(--line-height-lg, 24px)" },
//       { name: "XL", value: "var(--line-height-xl, 26px)" },
//       { name: "2XL", value: "var(--line-height-2xl, 28px)" },
//       { name: "3XL", value: "var(--line-height-3xl, 32px)" },
//       { name: "4XL", value: "var(--line-height-4xl, 36px)" },
//       { name: "5XL", value: "var(--line-height-5xl, 40px)" },
//       { name: "6XL", value: "var(--line-height-6xl, 46px)" },
//       { name: "7XL", value: "var(--line-height-7xl, 52px)" },
//       { name: "8XL", value: "var(--line-height-8xl, 60px)" },
//     ],
//     fontFamily: [
//       { name: "Work Sans", value: "var(--font-family-work-sans)" },
//       { name: "Roboto", value: "var(--font-roboto)" },
//       {
//         name: "Roboto Slab",
//         value: "var(--font-roboto-slab)",
//       },
//       {
//         name: "Helvetica Neue",
//         value: "var(--font-family-base)",
//       },
//     ],
//     fontSize: [
//       { name: "Heading XS", value: "var(--font-size-heading-xs, 24px)" },
//       { name: "Heading SM", value: "var(--font-size-heading-sm, 24px)" },
//       { name: "Heading MD", value: "var(--font-size-heading-md, 36px)" },
//       { name: "Heading LG", value: "var(--font-size-heading-lg, 40px)" },
//       { name: "Heading XL", value: "var(--font-size-heading-xl, 48px)" },
//       { name: "Heading 2XL", value: "var(--font-size-heading-2xl, 56px)" },

//       { name: "Title XS", value: "var(--font-size-title-xs, 14px)" },
//       { name: "Title SM", value: "var(--font-size-title-sm, 16px)" },
//       { name: "Title MD", value: "var(--font-size-title-md, 20px)" },
//       { name: "Title LG", value: "var(--font-size-title-lg, 24px)" },

//       { name: "Body XS", value: "var(--font-size-body-xs, 10px)" },
//       { name: "Body SM", value: "var(--font-size-body-sm, 12px)" },
//       { name: "Body MD", value: "var(--font-size-body-md, 14px)" },
//       { name: "Body LG", value: "var(--font-size-body-lg, 16px)" },
//       { name: "Body XL", value: "var(--font-size-body-xl, 18px)" },

//       { name: "Caption XS", value: "var(--font-size-caption-xs, 8px)" },
//       { name: "Caption SM", value: "var(--font-size-caption-sm, 10px)" },
//       { name: "Caption MD", value: "var(--font-size-caption-md, 12px)" },
//     ],
//     fontWeight: [
//       { name: "Thin", value: "var(--font-weight-thin, 100)" },
//       { name: "Extra Light", value: "var(--font-weight-extralight, 200)" },
//       { name: "Light", value: "var(--font-weight-light, 300)" },
//       { name: "Normal", value: "var(--font-weight-normal, 400)" },
//       { name: "Medium", value: "var(--font-weight-medium, 500)" },
//       { name: "Semibold", value: "var(--font-weight-semibold, 600)" },
//       { name: "Bold", value: "var(--font-weight-bold, 700)" },
//       { name: "Extra Bold", value: "var(--font-weight-extrabold, 800)" },
//       { name: "Black", value: "var(--font-weight-black, 900)" },
//     ],
//   },
// });

Builder.registerAction({
  name: "Fetch Dummy Data",
  kind: "function",
  id: "fetch-dummy-data",
  inputs: [
    {
      name: "url",
      type: "string",
      defaultValue: "https://microsoftedge.github.io/Demos/json-dummy-data/64KB.json",
      helperText: "URL to fetch JSON data from"
    }
  ],
  // Custom actions can return JS code as a string, 
  // so we generate async fetch logic in the returned string.
  action: (options) => `
    (async () => {
      try {
        const response = await fetch("${options.url}");
        const data = await response.json();
        return data; // Returned value can be used in Builder
      } catch (error) {
        console.error("Fetch failed:", error);
        return null;
      }
    })();
  `,
});


Builder.registerComponent("DigitalEntitlement", {
  name: "DigitalEntitlement",
  tag: "DigitalEntitlement",
  inputs: [
    {
      name: 'componentVersion',
      type: "string",
      hideFromUI: true,

    },
    {
      name: 'digitalEntitlement',
      type: "reference",
      model: 'digital-entitlement',
      options: {
        includeRefs: true,
      },
    },
  ],
});

Builder.registerComponent("stringInputToBeValidated", { 
    name: "stringInputToBeValidated",
    inputs: [
      {
        name: 'stringInputToBeValidated',
        type: 'text',
        regex: {
          pattern: "^[1-9][0-9]?$|^100$",
          options: "g",
          message: "You must use number between 1-100",
        },
      },
    ],
});

// Register ValidationTestComponent - Tests scenarios 1, 2, 3, and 4
Builder.registerComponent(ValidationTestComponent, {
  name: "ValidationTestComponent",
  friendlyName: "Validation Test Component",
  description: "Component to test Builder.io validation issues: hidden required fields, nested objects/arrays validation, client-side validation bypass, and URL validation",
  inputs: [
    // Scenario 1: Hidden required field - should NOT be treated as mandatory when hidden
    {
      name: "hiddenRequiredField",
      type: "string",
      required: true,
      hideFromUI: true,
      defaultValue: "",
      helperText: "⚠️ TEST SCENARIO 1: This field is required but hidden. It should NOT be treated as mandatory when hidden.",
    },
    // Scenario 2: Nested object with required fields - should validate when "Enforce custom component validation" is enabled
    {
      name: "nestedObject",
      type: "object",
      required: false,
      helperText: "⚠️ TEST SCENARIO 2: Nested object with required sub-fields. Should validate when feature flag is enabled.",
      subFields: [
        {
          name: "name",
          type: "string",
          required: true,
          helperText: "Required field in nested object",
        },
        {
          name: "email",
          type: "string",
          required: true,
          helperText: "Required email field in nested object",
        },
        {
          name: "url",
          type: "url",
          required: false,
          helperText: "Optional URL field in nested object",
        },
      ],
    },
    // Scenario 2: Array with required fields - should validate when "Enforce custom component validation" is enabled
    {
      name: "items",
      type: "list",
      defaultValue: [],
      helperText: "⚠️ TEST SCENARIO 2: Array with required sub-fields. Should validate when feature flag is enabled.",
      subFields: [
        {
          name: "title",
          type: "string",
          required: true,
          helperText: "Required title field in array item",
        },
        {
          name: "description",
          type: "string",
          required: true,
          helperText: "Required description field in array item",
        },
        {
          name: "link",
          type: "url",
          required: false,
          helperText: "Optional URL field in array item",
        },
      ],
    },
    // Scenario 3: Required field - should prevent publishing from content list if empty
    {
      name: "requiredTitle",
      type: "string",
      required: true,
      helperText: "⚠️ TEST SCENARIO 3: This required field should prevent publishing from content list if empty. Currently validation is client-side only.",
    },
    // Scenario 4: URL field - testing "#" validation issue
    {
      name: "testUrl",
      type: "url",
      required: false,
      defaultValue: "#",
      helperText: "⚠️ TEST SCENARIO 4: URL field. Previously '#' was valid, now it seems invalid. Try entering '#' to test.",
    },
    // Conditional visibility control
    {
      name: "showAdvancedFields",
      type: "boolean",
      defaultValue: false,
      helperText: "Toggle to show/hide advanced fields",
    },
    // Advanced nested field - conditionally visible
    {
      name: "advancedNestedField",
      type: "string",
      required: true,
      showIf: (options) => options.get("showAdvancedFields") === true,
      helperText: "⚠️ TEST SCENARIO 1: This field is required but only visible when 'Show Advanced Fields' is true. Should NOT be treated as mandatory when hidden.",
    },
  ],
});

Builder.register('editor.settings', {
  disableOverflowButtons: ['delete'], // Disables buttons in the overflow menu next to Publish
  // disableOverflowButtons can be one of 
  // ['archive', 'duplicate', 'move', 'copy', 'globalSymbol', 'share', 'exportToPdf', 'getCode', 'fiddle', 'delete']
})


Builder.register('insertMenu', {
  name: 'Our components',
  items: [
    { name: 'Core:Canvas', item: '' },
  ],
})

// Register SizeChartTabs component
Builder.registerComponent(SizeChartTabs, {
  name: "SizeChartTabs",
  friendlyName: "Size Chart Tabs",
  description: "Tabbed interface for displaying size chart content. Each tab supports nested Builder blocks.",
  canHaveChildren: true,
  inputs: [
    {
      name: "tabs",
      type: "list",
      defaultValue: [{ label: "Tab 1", tabContent: [] }],
      copyOnAdd: true,
      subFields: [
        {
          name: "label",
          type: "string",
          defaultValue: "Tab",
          helperText: "Label shown on the tab button",
        },
        {
          name: "tabContent",
          type: "uiBlocks",
          defaultValue: {
            blocks: [],
          },
          helperText: "Builder blocks rendered when this tab is active",
        },
      ],
    },
  ],
});

// Register BlogCard component — usable inside blog-post page model layouts
Builder.registerComponent(BlogCard, {
  name: "BlogCard",
  friendlyName: "Blog Card",
  description: "Displays a single blog post preview card with image, title, blurb, author, and date.",
  inputs: [
    {
      name: "title",
      type: "string",
      defaultValue: "Blog Post Title",
      friendlyName: "Title",
    },
    {
      name: "slug",
      type: "string",
      friendlyName: "Slug",
      helperText: "URL slug for the post (e.g. my-post-title). Used to build the /blog/:slug link.",
    },
    {
      name: "blurb",
      type: "longText",
      friendlyName: "Blurb",
      helperText: "Short summary shown below the title.",
    },
    {
      name: "image",
      type: "file",
      friendlyName: "Cover Image",
    },
    {
      name: "imageAlt",
      type: "string",
      friendlyName: "Image Alt Text",
    },
    {
      name: "date",
      type: "date",
      friendlyName: "Publish Date",
    },
    {
      name: "authorName",
      type: "string",
      friendlyName: "Author Name",
    },
    {
      name: "authorAvatar",
      type: "file",
      friendlyName: "Author Avatar",
    },
  ],
});

// ─── Homepage Section Components ───────────────────────────────────────────

Builder.registerComponent(PromoBar, {
  name: "PromoBar",
  friendlyName: "Promo Bar",
  inputs: [
    {
      name: "message",
      type: "string",
      defaultValue: "✨ Free shipping on orders over $50 · New Arrivals Just Dropped",
    },
    {
      name: "linkText",
      type: "string",
      defaultValue: "Shop Now →",
    },
    {
      name: "linkHref",
      type: "url",
      defaultValue: "/collections/all",
    },
  ],
});

Builder.registerComponent(HomeHero, {
  name: "HomeHero",
  friendlyName: "Home Hero",
  inputs: [
    { name: "badge",              type: "string",  defaultValue: "New Season Collection" },
    { name: "title",              type: "string",  defaultValue: "Style That" },
    { name: "titleHighlight",     type: "string",  defaultValue: "Speaks For You." },
    { name: "subtitle",           type: "longText", defaultValue: "Discover curated collections that define modern fashion. From everyday essentials to statement pieces — all in one place." },
    { name: "primaryCtaText",     type: "string",  defaultValue: "Shop Now" },
    { name: "primaryCtaHref",     type: "url",     defaultValue: "/collections/all" },
    { name: "secondaryCtaText",   type: "string",  defaultValue: "View Collections" },
    { name: "secondaryCtaHref",   type: "url",     defaultValue: "/collections/all" },
    {
      name: "stats",
      type: "list",
      defaultValue: [
        { value: "10K+", label: "Products" },
        { value: "50K+", label: "Happy Customers" },
        { value: "4.9★", label: "Average Rating" },
      ],
      subFields: [
        { name: "value", type: "string" },
        { name: "label", type: "string" },
      ],
    },
    {
      name: "previewCards",
      type: "list",
      defaultValue: [
        { bg: "from-pink-200 via-rose-200 to-fuchsia-300",   icon: "👗", label: "Women",       sub: "2,400+ items",  tag: "New"      },
        { bg: "from-slate-200 via-gray-300 to-zinc-400",     icon: "👔", label: "Men",         sub: "1,800+ items",  tag: "Popular"  },
        { bg: "from-amber-200 via-orange-200 to-yellow-300", icon: "👜", label: "Accessories", sub: "900+ items",    tag: "Trending" },
        { bg: "from-red-200 via-rose-200 to-pink-300",       icon: "🏷️", label: "Sale",        sub: "Up to 50% off", tag: "Hot"      },
      ],
      subFields: [
        { name: "bg",    type: "string" },
        { name: "icon",  type: "string" },
        { name: "label", type: "string" },
        { name: "sub",   type: "string" },
        { name: "tag",   type: "string" },
      ],
    },
  ],
});

Builder.registerComponent(CategorySection, {
  name: "CategorySection",
  friendlyName: "Category Section",
  inputs: [
    { name: "heading",    type: "string", defaultValue: "Shop by Category" },
    { name: "subheading", type: "string", defaultValue: "Explore" },
    {
      name: "categories",
      type: "list",
      defaultValue: [
        { name: "Women",       description: "New season styles",  href: "/collections/all", gradient: "from-pink-400 via-rose-400 to-fuchsia-500",  icon: "👗", count: "2,400+ items"  },
        { name: "Men",         description: "Modern essentials",  href: "/collections/all", gradient: "from-slate-600 via-gray-700 to-zinc-800",     icon: "👔", count: "1,800+ items"  },
        { name: "Accessories", description: "Complete the look",  href: "/collections/all", gradient: "from-amber-400 via-orange-400 to-yellow-500", icon: "👜", count: "900+ items"    },
        { name: "Sale",        description: "Up to 50% off",      href: "/collections/all", gradient: "from-red-500 via-rose-500 to-pink-600",        icon: "🏷️", count: "Limited time" },
      ],
      subFields: [
        { name: "name",        type: "string" },
        { name: "description", type: "string" },
        { name: "href",        type: "url" },
        { name: "gradient",    type: "string" },
        { name: "icon",        type: "string" },
        { name: "count",       type: "string" },
      ],
    },
  ],
});

Builder.registerComponent(FeaturedProductsSection, {
  name: "FeaturedProductsSection",
  friendlyName: "Featured Products Section",
  inputs: [
    { name: "heading",     type: "string", defaultValue: "Trending Now" },
    { name: "subheading",  type: "string", defaultValue: "Curated for you" },
    { name: "viewAllText", type: "string", defaultValue: "View all products" },
    { name: "viewAllHref", type: "url",    defaultValue: "/collections/all" },
  ],
});

Builder.registerComponent(PromoBanner, {
  name: "PromoBanner",
  friendlyName: "Promo Banner",
  inputs: [
    { name: "badgeEmoji",      type: "string",   defaultValue: "🔥" },
    { name: "badgeText",       type: "string",   defaultValue: "Limited Time Offer — Ends Sunday" },
    { name: "title",           type: "string",   defaultValue: "Summer Sale" },
    { name: "titleHighlight",  type: "string",   defaultValue: "Up to 50% Off" },
    { name: "description",     type: "longText", defaultValue: "Massive savings across our entire summer collection. Hundreds of styles added — grab yours before they're gone." },
    { name: "ctaText",         type: "string",   defaultValue: "Shop the Sale" },
    { name: "ctaHref",         type: "url",      defaultValue: "/collections/all" },
  ],
});

Builder.registerComponent(TestimonialsSection, {
  name: "TestimonialsSection",
  friendlyName: "Testimonials Section",
  inputs: [
    { name: "heading",    type: "string", defaultValue: "Loved by 50,000+ Customers" },
    { name: "subheading", type: "string", defaultValue: "What our customers say" },
    {
      name: "testimonials",
      type: "list",
      defaultValue: [
        { id: 1, quote: "Amazing quality and lightning-fast delivery.", name: "Sarah M.", location: "New York, USA", initials: "SM", color: "bg-pink-500",   rating: 5, product: "Classic Oxford Shirt" },
        { id: 2, quote: "I've been shopping here for two years and the quality never disappoints.", name: "James R.", location: "London, UK",     initials: "JR", color: "bg-blue-600",  rating: 5, product: "Slim Fit Denim"     },
        { id: 3, quote: "The floral wrap dress is absolutely stunning.", name: "Priya K.", location: "Mumbai, India", initials: "PK", color: "bg-violet-500", rating: 5, product: "Floral Wrap Dress"  },
      ],
      subFields: [
        { name: "id",       type: "number" },
        { name: "quote",    type: "longText" },
        { name: "name",     type: "string" },
        { name: "location", type: "string" },
        { name: "initials", type: "string" },
        { name: "color",    type: "string" },
        { name: "rating",   type: "number" },
        { name: "product",  type: "string" },
      ],
    },
    {
      name: "trustBadges",
      type: "list",
      defaultValue: [
        { icon: "🚚", title: "Free Shipping", desc: "On orders over $50" },
        { icon: "🔄", title: "Free Returns",  desc: "30-day return policy" },
        { icon: "🔒", title: "Secure Payment", desc: "100% secure checkout" },
        { icon: "💬", title: "24/7 Support",  desc: "Dedicated customer care" },
      ],
      subFields: [
        { name: "icon",  type: "string" },
        { name: "title", type: "string" },
        { name: "desc",  type: "string" },
      ],
    },
  ],
});

Builder.registerComponent(NewsletterSection, {
  name: "NewsletterSection",
  friendlyName: "Newsletter Section",
  inputs: [
    { name: "title",          type: "string",   defaultValue: "Get 10% Off Your First Order" },
    { name: "description",    type: "longText", defaultValue: "Subscribe for exclusive deals, new arrivals, and style inspiration delivered straight to your inbox." },
    { name: "buttonText",     type: "string",   defaultValue: "Get 10% Off" },
    { name: "successMessage", type: "string",   defaultValue: "🎉 You're in! Check your inbox for your 10% off code." },
  ],
});
