export declare function createIceProvider(
  env?: Record<string, string | undefined>,
  fetchImpl?: typeof fetch,
): { mode: "cloudflare" | "static" | "off"; get(): Promise<RTCIceServer[]> };
