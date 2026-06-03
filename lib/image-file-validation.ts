import path from "node:path";
import { imageSize } from "image-size";

const allowedImageMimeTypes: Record<string, string[]> = {
  ".jpg": ["image/jpeg"],
  ".jpeg": ["image/jpeg"],
  ".png": ["image/png"],
  ".webp": ["image/webp"],
};

export type ImageValidationRules = {
  label: string;
  maxSizeBytes: number;
  minWidth?: number;
  minHeight?: number;
  minAspectRatio?: number;
};

export function assertImageFileAllowed({
  filename,
  mimeType,
  size,
  buffer,
  rules,
}: {
  filename: string;
  mimeType: string;
  size: number;
  buffer: Buffer;
  rules: ImageValidationRules;
}) {
  if (size > rules.maxSizeBytes) {
    throw new Error(`${rules.label}は ${formatMegabytes(rules.maxSizeBytes)}MB 以下にしてください。`);
  }

  const ext = path.extname(filename).toLowerCase();
  const allowedMimeTypes = allowedImageMimeTypes[ext];

  if (!allowedMimeTypes) {
    throw new Error(`${rules.label}は JPG / PNG / WebP のみアップロードできます。`);
  }

  const normalizedMimeType = mimeType.toLowerCase();

  if (!normalizedMimeType || !allowedMimeTypes.includes(normalizedMimeType)) {
    throw new Error(`${rules.label}の形式を確認してください。拡張子とMIME typeが一致している必要があります。`);
  }

  let dimensions: ReturnType<typeof imageSize>;

  try {
    dimensions = imageSize(buffer);
  } catch {
    throw new Error(`${rules.label}の内容を確認してください。`);
  }
  const width = dimensions.width ?? 0;
  const height = dimensions.height ?? 0;

  if (!isExpectedImageType(dimensions.type, ext)) {
    throw new Error(`${rules.label}の内容を確認してください。`);
  }

  if (rules.minWidth && width < rules.minWidth) {
    throw new Error(`${rules.label}は ${rules.minWidth}x${rules.minHeight ?? 0}px 以上にしてください。`);
  }

  if (rules.minHeight && height < rules.minHeight) {
    throw new Error(`${rules.label}は ${rules.minWidth ?? 0}x${rules.minHeight}px 以上にしてください。`);
  }

  if (rules.minAspectRatio && height > 0 && width / height < rules.minAspectRatio) {
    throw new Error(`${rules.label}は横長画像を指定してください。`);
  }
}

function isExpectedImageType(type: string | undefined, ext: string) {
  if (!type) {
    return false;
  }

  if (ext === ".jpg" || ext === ".jpeg") {
    return type === "jpg" || type === "jpeg";
  }

  return type === ext.slice(1);
}

function formatMegabytes(bytes: number) {
  return Math.floor(bytes / 1024 / 1024);
}
