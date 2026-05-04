// Truncate oversize tool results: keep head + tail, replace middle with marker.

export function truncateOversize(text, config) {
  if (typeof text !== "string") return { text, applied: false };
  const bytes = Buffer.byteLength(text, "utf8");
  if (bytes <= config.maxBytesPerResult) return { text, applied: false };

  const head = sliceBytes(text, 0, config.keepHeadBytes);
  const tail = sliceBytes(text, text.length - config.keepTailBytes, text.length);
  const removed = bytes - Buffer.byteLength(head, "utf8") - Buffer.byteLength(tail, "utf8");
  const marker = `\n\n[context-diet] truncated ${formatBytes(removed)} from middle of ${formatBytes(bytes)} result. Original size: ${bytes} bytes.\n\n`;
  return { text: `${head}${marker}${tail}`, applied: true };
}

function sliceBytes(text, startBytes, endBytes) {
  const buf = Buffer.from(text, "utf8");
  if (startBytes < 0) startBytes = 0;
  if (endBytes > buf.length) endBytes = buf.length;
  return buf.subarray(startBytes, endBytes).toString("utf8");
}

function formatBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
