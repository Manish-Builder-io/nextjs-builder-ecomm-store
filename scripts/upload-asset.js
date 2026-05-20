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
      case "--folder":      opts.folder     = args[++i]; break;
      case "--fetch-first": opts.fetchFirst  = true;      break;
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
  // Build non-URL params with URLSearchParams (safe encoding)
  const params = new URLSearchParams();
  if (opts.name)   params.set("name",    opts.name);
  if (opts.alt)    params.set("altText", opts.alt);
  if (opts.title)  params.set("title",   opts.title);
  if (opts.folder) params.set("folder",  opts.folder);

  let base = UPLOAD_ENDPOINT;
  const qs = params.toString();
  if (qs) base += `?${qs}`;

  // Append &url= raw (not double-encoded) — Builder's server may expect a
  // plain URL string rather than a percent-encoded value inside the query string.
  if (opts.url) {
    const sep = qs ? "&" : "?";
    base += `${sep}url=${opts.url}`;
  }

  return base;
}

async function uploadFromUrl(opts) {
  const assetName = opts.name || opts.url.split("/").pop().split("?")[0] || "asset";

  console.info(`Uploading from remote URL: ${opts.url}`);
  console.info(`  name: ${assetName}`);

  // Probe the remote URL first
  console.info("\n[debug] Checking remote URL reachability...");
  let contentType = "application/octet-stream";
  try {
    const probe = await fetch(opts.url, { method: "HEAD" });
    contentType = probe.headers.get("content-type") || contentType;
    console.info(`  remote HEAD:  ${probe.status} ${probe.statusText}`);
    console.info(`  content-type: ${contentType}`);
    if (!probe.ok) {
      console.warn("  ⚠️  Remote URL returned non-2xx — Builder may fail to fetch it.");
    }
  } catch (e) {
    console.warn(`  ⚠️  Could not probe remote URL: ${e.message}`);
  }

  // --fetch-first: download the bytes locally, then upload as binary.
  // Avoids Builder's server-side URL fetcher which can fail on certain CDNs.
  if (opts.fetchFirst) {
    console.info("\n[fetch-first] Downloading image locally...");
    const dl = await fetch(opts.url);
    if (!dl.ok) {
      console.error(`❌  Failed to download remote URL (HTTP ${dl.status})`);
      process.exit(1);
    }
    const buffer = Buffer.from(await dl.arrayBuffer());
    const mime = dl.headers.get("content-type") || contentType;
    console.info(`  downloaded: ${(buffer.length / 1024).toFixed(1)} KB  (${mime})`);

    const uploadUrl = buildUploadUrl({ ...opts, name: assetName, url: undefined });
    console.info(`  request URL: ${uploadUrl}`);
    console.info("\n[debug] Sending POST to Builder Upload API...");
    const response = await fetch(uploadUrl, {
      method: "POST",
      body: buffer,
      headers: {
        Authorization: `Bearer ${PRIVATE_KEY}`,
        "Content-Type": mime.split(";")[0].trim(),
      },
    });
    return { response, assetName };
  }

  // Default: pass URL to Builder's server-side fetcher
  const uploadUrl = buildUploadUrl({ ...opts, name: assetName });
  console.info(`  request URL: ${uploadUrl}`);
  console.info("\n[debug] Sending POST to Builder Upload API...");
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

  // Always log response metadata for debugging
  console.info(`\n[debug] Response: HTTP ${response.status} ${response.statusText}`);
  const relevantHeaders = ["content-type", "x-request-id", "cf-ray", "x-error", "x-builder-error"];
  for (const h of relevantHeaders) {
    const v = response.headers.get(h);
    if (v) console.info(`  ${h}: ${v}`);
  }

  const rawBody = await response.text();
  let parsedBody;
  try { parsedBody = JSON.parse(rawBody); } catch { parsedBody = null; }

  if (!response.ok) {
    console.error(`\n❌  Upload failed (HTTP ${response.status})`);
    if (parsedBody) {
      console.error("  response JSON:", JSON.stringify(parsedBody, null, 2));
    } else {
      console.error("  response body:", rawBody || "(empty)");
    }
    process.exit(1);
  }

  const data = parsedBody ?? JSON.parse(rawBody);

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
