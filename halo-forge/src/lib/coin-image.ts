import sharp from "sharp";
import { DomainError } from "./domain";

// Images travel with the existing agent record, so registration is atomic.
// Never store SVG, external URLs, metadata or the original uploaded file.
export async function normalizeCoinImage(
  value: unknown,
): Promise<string | null> {
  if (value === undefined || value === null) return null;
  if (
    typeof value !== "string" ||
    value.length > 90000 ||
    !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(value)
  ) {
    throw new DomainError("Choose a PNG, JPG or WebP coin image.");
  }
  try {
    const bytes = Buffer.from(value.slice(value.indexOf(",") + 1), "base64");
    const image = sharp(bytes, {
      limitInputPixels: 1048576,
      failOn: "warning",
    });
    const metadata = await image.metadata();
    if (
      !metadata.format ||
      !["png", "jpeg", "webp"].includes(metadata.format) ||
      (metadata.pages ?? 1) !== 1
    )
      throw new Error("Unsupported image");
    const output = await image
      .rotate()
      .resize(256, 256, { fit: "cover" })
      .webp({ quality: 80 })
      .toBuffer();
    if (output.length > 64000) throw new Error("Image too large");
    return `data:image/webp;base64,${output.toString("base64")}`;
  } catch {
    throw new DomainError(
      "This coin image could not be read. Choose another PNG, JPG or WebP.",
    );
  }
}
