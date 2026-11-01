export default async function globalTeardown() {
  if (globalThis.__WB_MONGO__) await globalThis.__WB_MONGO__.stop();
}
