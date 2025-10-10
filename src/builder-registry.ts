"use client";
import { builder, Builder } from "@builder.io/react";
import Hero from "@/components/Hero";
import ProductGrid from "@/components/ProductGrid";
import ProductCard from "@/components/ProductCard";

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