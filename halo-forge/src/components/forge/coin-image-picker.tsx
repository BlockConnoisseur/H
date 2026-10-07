"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ImagePlus, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function CoinImagePicker({
  value,
  onChange,
  onBusyChange,
}: {
  value: string | null;
  onChange: (image: string | null) => void;
  onBusyChange: (busy: boolean) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");

  async function select(file?: File) {
    if (!file) return;
    setError("");
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setError("Choose a PNG, JPG or WebP image.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Choose an image smaller than 5 MB.");
      return;
    }
    setProcessing(true);
    onBusyChange(true);
    let bitmap: ImageBitmap | undefined;
    try {
      bitmap = await createImageBitmap(file);
      if (
        !bitmap.width ||
        !bitmap.height ||
        bitmap.width * bitmap.height > 40000000
      )
        throw new Error("Image dimensions are too large.");
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 256;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Image preview is unavailable.");
      const side = Math.min(bitmap.width, bitmap.height);
      context.drawImage(
        bitmap,
        (bitmap.width - side) / 2,
        (bitmap.height - side) / 2,
        side,
        side,
        0,
        0,
        256,
        256,
      );
      const result = canvas.toDataURL("image/webp", 0.8);
      if (result.length > 90000)
        throw new Error("Image is too detailed. Try a simpler image.");
      onChange(result);
    } catch {
      setError(
        "This image could not be prepared. Try a smaller PNG, JPG or WebP.",
      );
    } finally {
      bitmap?.close();
      setProcessing(false);
      onBusyChange(false);
    }
  }

  return (
    <div className="coin-image-field">
      <div className="coin-image-preview">
        {value ? (
          <Image
            src={value}
            alt="Coin image preview"
            width={96}
            height={96}
            unoptimized
          />
        ) : (
          <ImagePlus size={28} aria-hidden="true" />
        )}
      </div>
      <div className="coin-image-controls">
        <strong>
          Coin image <span className="field-hint">(optional)</span>
        </strong>
        <p id="coin-image-hint" className="field-hint">
          PNG, JPG or WebP · up to 5 MB. Centered to a square.
        </p>
        <Input
          ref={input}
          id="coin-image"
          type="file"
          className="sr-only"
          aria-label="Upload coin image"
          aria-describedby="coin-image-hint"
          accept="image/png,image/jpeg,image/webp"
          disabled={processing}
          onChange={(event) => {
            void select(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
        <div className="coin-image-buttons">
          <Button
            type="button"
            variant="outline"
            disabled={processing}
            onClick={() => input.current?.click()}
          >
            {processing ? (
              <>
                <LoaderCircle size={15} className="animate-spin" /> Preparing…
              </>
            ) : value ? (
              "Change image"
            ) : (
              "Upload image"
            )}
          </Button>
          {value && (
            <Button
              type="button"
              variant="ghost"
              disabled={processing}
              onClick={() => {
                onChange(null);
                setError("");
              }}
            >
              Remove
            </Button>
          )}
        </div>
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        <span className="sr-only" role="status">
          {processing
            ? "Preparing coin image"
            : value
              ? "Coin image ready"
              : "No coin image selected"}
        </span>
      </div>
    </div>
  );
}
