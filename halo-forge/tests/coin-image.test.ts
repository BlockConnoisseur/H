import test from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { normalizeCoinImage } from "../src/lib/coin-image";

test("coin images become bounded square WebP images with metadata removed", async () => {
  const input = await sharp({
    create: { width: 600, height: 300, channels: 3, background: "gold" },
  })
    .jpeg()
    .withMetadata()
    .toBuffer();
  const result = await normalizeCoinImage(
    `data:image/jpeg;base64,${input.toString("base64")}`,
  );
  const metadata = await sharp(
    Buffer.from(result!.split(",")[1], "base64"),
  ).metadata();
  assert.equal(metadata.format, "webp");
  assert.equal(metadata.width, 256);
  assert.equal(metadata.height, 256);
  assert.equal(metadata.exif, undefined);
  assert.ok(result!.length < 90000);
  assert.equal(await normalizeCoinImage(null), null);
  assert.equal(await normalizeCoinImage(undefined), null);
});

test("reject external URLs, SVG disguised as PNG, corrupted and oversized images", async () => {
  for (const input of [
    "https://example.com/image.png",
    "data:image/svg+xml;base64,PHN2Zz4=",
    `data:image/png;base64,${Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>').toString("base64")}`,
    "data:image/png;base64,YmFk",
    `data:image/webp;base64,${"A".repeat(90000)}`,
  ]) {
    await assert.rejects(normalizeCoinImage(input));
  }
  const wide = await sharp({
    create: { width: 1100, height: 1100, channels: 3, background: "black" },
  })
    .png()
    .toBuffer();
  await assert.rejects(
    normalizeCoinImage(`data:image/png;base64,${wide.toString("base64")}`),
  );
});
