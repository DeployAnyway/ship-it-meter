/** Read bounded UTF-8 stdin without swallowing upstream failures. */
export async function readStdin(stream = process.stdin) {
  if (stream.isTTY) throw new TypeError("Pipe or redirect input.");
  let size = 0;
  const chunks = [];
  for await (const chunk of stream) {
    const buffer = typeof chunk === "string" ? Buffer.from(chunk) : chunk;
    size += buffer.length;
    if (size > 262144) throw new RangeError("stdin exceeds 256 KiB.");
    chunks.push(buffer);
  }
  const text = Buffer.concat(chunks).toString("utf8").trim();
  if (!text) throw new TypeError("Provide nonempty input.");
  return text;
}
