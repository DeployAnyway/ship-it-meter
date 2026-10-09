/** Read bounded UTF-8 stdin without swallowing upstream failures. */
export async function readStdin(stream = process.stdin, maxBytes = 262144) {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1)
    throw new RangeError("Input limit must be a positive safe integer.");
  if (stream.isTTY) throw new TypeError("Pipe or redirect input.");
  let size = 0;
  const chunks = [];
  for await (const chunk of stream) {
    const buffer = typeof chunk === "string" ? Buffer.from(chunk) : chunk;
    size += buffer.length;
    if (size > maxBytes)
      throw new RangeError(
        maxBytes === 262144
          ? "stdin exceeds 256 KiB."
          : `stdin exceeds ${maxBytes} bytes.`,
      );
    chunks.push(buffer);
  }
  const text = Buffer.concat(chunks).toString("utf8").trim();
  if (!text) throw new TypeError("Provide nonempty input.");
  return text;
}
