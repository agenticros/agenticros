/**
 * Some CompressedImage decoders leave trailing bytes after the JPEG EOI (FFD9).
 * OpenClaw's image sanitizer uses getImageMetadata(); extra bytes can make metadata fail
 * and drop the tool image block. Trim to the last EOI marker when the buffer looks like JPEG.
 */
export function trimJpegToLastEoi(buf: Buffer): Buffer {
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) {
    return buf;
  }
  for (let i = buf.length - 2; i >= 0; i--) {
    if (buf[i] === 0xff && buf[i + 1] === 0xd9) {
      return buf.subarray(0, i + 2);
    }
  }
  return buf;
}
