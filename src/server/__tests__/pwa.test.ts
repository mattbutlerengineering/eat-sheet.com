import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

const ROOT = resolve(__dirname, "../../..");

describe("PWA manifest config", () => {
  it("vite.config.ts references correct icon sizes", async () => {
    const config = readFileSync(resolve(ROOT, "vite.config.ts"), "utf-8");
    expect(config).toContain('"192x192"');
    expect(config).toContain('"512x512"');
    expect(config).toContain('"image/png"');
    expect(config).toContain('"maskable"');
  });

  it("vite.config.ts has theme and background colors", async () => {
    const config = readFileSync(resolve(ROOT, "vite.config.ts"), "utf-8");
    expect(config).toContain('"#E8836E"');
    expect(config).toContain('"#0c0a09"');
    expect(config).toContain('"standalone"');
  });

  it("index.html has theme-color meta and apple-touch-icon", async () => {
    const html = readFileSync(resolve(ROOT, "index.html"), "utf-8");
    expect(html).toContain('name="theme-color"');
    expect(html).toContain('content="#E8836E"');
    expect(html).toContain('rel="apple-touch-icon"');
    expect(html).toContain("apple-touch-icon.png");
  });
});

describe("PWA icon files", () => {
  it("icon-192.png exists", () => {
    expect(existsSync(resolve(ROOT, "public/icons/icon-192.png"))).toBe(true);
  });

  it("icon-512.png exists", () => {
    expect(existsSync(resolve(ROOT, "public/icons/icon-512.png"))).toBe(true);
  });

  it("apple-touch-icon.png exists", () => {
    expect(existsSync(resolve(ROOT, "public/apple-touch-icon.png"))).toBe(true);
  });

  it("favicon.png exists", () => {
    expect(existsSync(resolve(ROOT, "public/favicon.png"))).toBe(true);
  });
});

describe("InstallPrompt component", () => {
  it("exports InstallPrompt from the component file", async () => {
    const src = readFileSync(
      resolve(ROOT, "src/client/components/InstallPrompt.tsx"),
      "utf-8"
    );
    expect(src).toContain("export function InstallPrompt");
  });

  it("listens for beforeinstallprompt event", () => {
    const src = readFileSync(
      resolve(ROOT, "src/client/components/InstallPrompt.tsx"),
      "utf-8"
    );
    expect(src).toContain("beforeinstallprompt");
  });

  it("persists dismissal in localStorage", () => {
    const src = readFileSync(
      resolve(ROOT, "src/client/components/InstallPrompt.tsx"),
      "utf-8"
    );
    expect(src).toContain("localStorage.setItem");
    expect(src).toContain("localStorage.getItem");
    expect(src).toContain("eat-sheet-install-dismissed");
  });

  it("is integrated into App.tsx", () => {
    const app = readFileSync(
      resolve(ROOT, "src/client/App.tsx"),
      "utf-8"
    );
    expect(app).toContain("InstallPrompt");
    expect(app).toContain('./components/InstallPrompt"');
  });

  it("has accessible dismiss button", () => {
    const src = readFileSync(
      resolve(ROOT, "src/client/components/InstallPrompt.tsx"),
      "utf-8"
    );
    expect(src).toContain('aria-label="Dismiss install prompt"');
  });
});
