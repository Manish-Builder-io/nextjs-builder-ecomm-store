#!/usr/bin/env node

/**
 * Upload an asset to Builder's Asset Library using the Upload API.
 * Supports uploading from a remote URL (CDN path) or a local file.
 *
 * Usage:
 *   node scripts/upload-asset.js --url <REMOTE_URL>          # upload from remote URL
 *   node scripts/upload-asset.js --file <LOCAL_PATH>         # upload from local file
 *
 * Options:
 *   --url      Remote URL of the image/asset to upload
 *   --file     Local file path to upload
 *   --name     Asset name (default: derived from URL/filename)
 *   --alt      Alt text for the asset
 *   --title    Title for the asset
 *   --folder   Asset Library folder ID to upload into
 *
 * Env:
 *   BUILDER_PRIVATE_KEY (optional)  Overrides the hard-coded key below.
 *
 * Docs: https://www.builder.io/c/docs/upload-api
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const UPLOAD_ENDPOINT = "https://builder.io/api/v1/upload";
const PRIVATE_KEY =
  process.env.BUILDER_PRIVATE_KEY || "YOUR_PRIVATE_KEY_HERE";

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {};
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--url":    opts.url    = args[++i]; break;
      case "--file":   opts.file   = args[++i]; break;
      case "--name":   opts.name   = args[++i]; break;
      case "--alt":    opts.alt    = args[++i]; break;
      case "--title":  opts.title  = args[++i]; break;
      case "--folder": opts.folder = args[++i]; break;
      default:
        console.error(`Unknown argument: ${args[i]}`);
        process.exit(1);
    }
  }
  return opts;
}

function guessMimeType(nameOrPath) {
  const ext = nameOrPath.split(".").pop()?.toLowerCase();
  const map = {
    jpg: "image/jpeg", jpeg: "image/jpeg",
    png: "image/png", gif: "image/gif",
    webp: "image/webp", svg: "image/svg+xml",
    pdf: "application/pdf",
    mp4: "video/mp4", mov: "video/quicktime",
  };
  return map[ext] || "application/octet-stream";
}

function buildUploadUrl(opts) {
  const params = new URLSearchParams();
  if (opts.name)   params.set("name",    opts.name);
  if (opts.alt)    params.set("altText", opts.alt);
  if (opts.title)  params.set("title",   opts.title);
  if (opts.folder) params.set("folder",  opts.folder);
  if (opts.url)    params.set("url",     opts.url);
  const qs = params.toString();
  return qs ? `${UPLOAD_ENDPOINT}?${qs}` : UPLOAD_ENDPOINT;
}

async function uploadFromUrl(opts) {
  const assetName = opts.name || opts.url.split("/").pop().split("?")[0] || "asset";
  const uploadUrl = buildUploadUrl({ ...opts, name: opts.name || assetName });

  console.info(`Uploading from remote URL: ${opts.url}`);
  console.info(`  name: ${assetName}`);

  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PRIVATE_KEY}`,
    },
  });

  return { response, assetName };
}

async function uploadFromFile(opts) {
  const filePath = opts.file;
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  const assetName = opts.name || path.basename(filePath);
  const mimeType = guessMimeType(filePath);
  const fileData = fs.readFileSync(filePath);
  const uploadUrl = buildUploadUrl({ ...opts, name: assetName });

  console.info(`Uploading local file: ${filePath}`);
  console.info(`  name: ${assetName}`);
  console.info(`  mime: ${mimeType}`);
  console.info(`  size: ${(fileData.length / 1024).toFixed(1)} KB`);

  const response = await fetch(uploadUrl, {
    method: "POST",
    body: fileData,
    headers: {
      Authorization: `Bearer ${PRIVATE_KEY}`,
      "Content-Type": mimeType,
    },
  });

  return { response, assetName };
}

async function main() {
  if (!PRIVATE_KEY || PRIVATE_KEY === "YOUR_PRIVATE_KEY_HERE") {
    console.error("❌  Missing BUILDER_PRIVATE_KEY. Set it via env or edit the script.");
    process.exit(1);
  }

  const opts = parseArgs();

  if (!opts.url && !opts.file) {
    console.error("Usage:");
    console.error("  node scripts/upload-asset.js --url <REMOTE_URL>");
    console.error("  node scripts/upload-asset.js --file <LOCAL_PATH>");
    console.error("\nOptions: --name --alt --title --folder");
    process.exit(1);
  }

  const { response, assetName } =
    opts.url ? await uploadFromUrl(opts) : await uploadFromFile(opts);

  if (!response.ok) {
    const body = await response.text();
    console.error(`❌  Upload failed (HTTP ${response.status}): ${body}`);
    process.exit(1);
  }

  const data = await response.json();
  console.info("\n✅  Upload successful!");
  console.info(`  asset:  ${assetName}`);
  console.info(`  url:    ${data.url}`);
  if (data.message && data.message !== "Success") {
    console.info(`  msg:    ${data.message}`);
  }

  return data;
}

main().catch((err) => {
  console.error("❌  Unexpected error.");
  console.error(err);
  process.exit(1);
});
