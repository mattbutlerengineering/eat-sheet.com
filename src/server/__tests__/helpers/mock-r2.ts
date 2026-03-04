import { vi } from "vitest";

export function createMockR2() {
  const store = new Map<string, { body: ArrayBuffer; contentType: string }>();

  const bucket = {
    put: vi.fn(
      async (
        key: string,
        body: ReadableStream | ArrayBuffer | null,
        options?: { httpMetadata?: { contentType?: string } },
      ) => {
        const contentType =
          options?.httpMetadata?.contentType ?? "application/octet-stream";
        store.set(key, { body: new ArrayBuffer(0), contentType });
      },
    ),
    get: vi.fn(async (key: string) => {
      const item = store.get(key);
      if (!item) return null;
      return {
        body: new ReadableStream({
          start(controller) {
            controller.enqueue(new Uint8Array(item.body));
            controller.close();
          },
        }),
        httpMetadata: { contentType: item.contentType },
      };
    }),
  };

  return { bucket: bucket as unknown as R2Bucket, store };
}
