export const IMAGE_UPLOAD_MAX_BYTES = 10 * 1024 * 1024;
export const DOWNLOAD_UPLOAD_MAX_BYTES = 20 * 1024 * 1024;
export const NEWS_BODY_IMAGE_MAX_COUNT = 10;

export function formatUploadLimit(bytes: number) {
  return `${Math.floor(bytes / 1024 / 1024)}MB`;
}
