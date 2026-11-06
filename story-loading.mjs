export async function loadCompressed(url, bytes, progress = () => {}) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Audience request returned ${response.status}`);
  let received = 0;
  const total = Number(response.headers.get('content-length')) || bytes;
  progress(0, total);
  const meter = new TransformStream({ transform(chunk, controller) {
    received += chunk.byteLength;
    progress(received, total);
    controller.enqueue(chunk);
  } });
  return new Response(response.body.pipeThrough(meter).pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
}
