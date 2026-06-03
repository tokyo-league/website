import path from "node:path";

const allowedDownloadMimeTypes: Record<string, string[]> = {
  ".pdf": ["application/pdf"],
  ".xlsx": ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
  ".xls": ["application/vnd.ms-excel"],
  ".doc": ["application/msword"],
  ".docx": ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
};

export function assertDownloadFileAllowed({
  filename,
  mimeType,
  buffer,
}: {
  filename: string;
  mimeType: string;
  buffer: Buffer;
}) {
  const ext = path.extname(filename).toLowerCase();
  const allowedMimeTypes = allowedDownloadMimeTypes[ext];

  if (!allowedMimeTypes) {
    throw new Error("資料ファイルは PDF / Excel / Word のみアップロードできます。");
  }

  const normalizedMimeType = mimeType.toLowerCase();

  if (!normalizedMimeType || !allowedMimeTypes.includes(normalizedMimeType)) {
    throw new Error("資料ファイルの形式を確認してください。拡張子とMIME typeが一致している必要があります。");
  }

  if (ext === ".pdf" && !buffer.subarray(0, 5).equals(Buffer.from("%PDF-"))) {
    throw new Error("PDFファイルの内容を確認してください。");
  }

  if ((ext === ".doc" || ext === ".xls") && !hasOleCompoundSignature(buffer)) {
    throw new Error("Word / Excel ファイルの内容を確認してください。");
  }

  if ((ext === ".docx" || ext === ".xlsx") && !hasOfficeOpenXmlSignature(buffer, ext)) {
    throw new Error("Word / Excel ファイルの内容を確認してください。");
  }
}

function hasOleCompoundSignature(buffer: Buffer) {
  const oleSignature = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);

  return buffer.subarray(0, oleSignature.length).equals(oleSignature);
}

function hasOfficeOpenXmlSignature(buffer: Buffer, ext: string) {
  const zipSignature = Buffer.from([0x50, 0x4b, 0x03, 0x04]);

  if (!buffer.subarray(0, zipSignature.length).equals(zipSignature)) {
    return false;
  }

  const zipText = buffer.toString("latin1");
  const requiredEntry = ext === ".xlsx" ? "xl/" : "word/";

  return zipText.includes("[Content_Types].xml") && zipText.includes(requiredEntry);
}
