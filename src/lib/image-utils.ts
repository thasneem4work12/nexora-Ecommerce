/**
 * Magic byte signature verification for image uploads.
 * Protects against MIME spoofing and disguised malicious scripts (polyglots).
 */
export function isValidImageSignature(buffer: Buffer, mimeType: string): boolean {
  if (buffer.length < 12) return false;

  if (mimeType === "image/jpeg") {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  if (mimeType === "image/png") {
    return (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47
    );
  }
  if (mimeType === "image/webp") {
    const isRiff = buffer.subarray(0, 4).toString("ascii") === "RIFF";
    const isWebp = buffer.subarray(8, 12).toString("ascii") === "WEBP";
    return isRiff && isWebp;
  }
  if (mimeType === "image/avif") {
    const isFtyp = buffer.subarray(4, 8).toString("ascii") === "ftyp";
    const brand = buffer.subarray(8, 12).toString("ascii");
    return isFtyp && (brand === "avif" || brand === "avis" || brand === "mif1");
  }
  return false;
}
