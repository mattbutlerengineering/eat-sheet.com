import { describe, it, expect, vi, afterEach } from "vitest";
import { relativeTime } from "../time";

describe("relativeTime", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  function setNow(iso: string) {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(iso));
  }

  it("returns 'Just now' for recent timestamps", () => {
    setNow("2025-06-15T12:00:30Z");
    expect(relativeTime("2025-06-15T12:00:00Z")).toBe("Just now");
  });

  it("returns minutes ago", () => {
    setNow("2025-06-15T12:05:00Z");
    expect(relativeTime("2025-06-15T12:00:00Z")).toBe("5m ago");
  });

  it("returns hours ago", () => {
    setNow("2025-06-15T15:00:00Z");
    expect(relativeTime("2025-06-15T12:00:00Z")).toBe("3h ago");
  });

  it("returns 'Yesterday' for 1 day ago", () => {
    setNow("2025-06-16T12:00:00Z");
    expect(relativeTime("2025-06-15T12:00:00Z")).toBe("Yesterday");
  });

  it("returns days ago for 2-6 days", () => {
    setNow("2025-06-18T12:00:00Z");
    expect(relativeTime("2025-06-15T12:00:00Z")).toBe("3d ago");
  });

  it("returns weeks ago for 7-29 days", () => {
    setNow("2025-06-29T12:00:00Z");
    expect(relativeTime("2025-06-15T12:00:00Z")).toBe("2w ago");
  });

  it("returns formatted date for 30+ days", () => {
    setNow("2025-08-15T12:00:00Z");
    const result = relativeTime("2025-06-15T12:00:00Z");
    expect(result).toContain("Jun");
    expect(result).toContain("15");
  });
});
