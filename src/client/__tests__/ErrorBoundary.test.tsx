// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ErrorBoundary } from "../components/ErrorBoundary";

const originalError = console.error;
beforeEach(() => {
  console.error = vi.fn();
});
afterAll(() => {
  console.error = originalError;
});

function ThrowOnce() {
  throw new Error("Test error");
}

describe("ErrorBoundary", () => {
  it("renders children when no error occurs", () => {
    render(
      <ErrorBoundary>
        <div>Hello world</div>
      </ErrorBoundary>
    );
    expect(screen.getByText("Hello world")).toBeTruthy();
  });

  it("renders error UI when child throws", () => {
    render(
      <ErrorBoundary>
        <ThrowOnce />
      </ErrorBoundary>
    );
    expect(screen.getByText("Well, that's not great...")).toBeTruthy();
    expect(screen.getByText(/Something went wrong/)).toBeTruthy();
    expect(screen.getByText("Try Again")).toBeTruthy();
  });

  it("resets error state when Try Again is clicked", () => {
    let shouldThrow = true;
    function MaybeThrow() {
      if (shouldThrow) throw new Error("boom");
      return <div>Recovered</div>;
    }

    render(
      <ErrorBoundary>
        <MaybeThrow />
      </ErrorBoundary>
    );

    expect(screen.getByText("Well, that's not great...")).toBeTruthy();

    shouldThrow = false;
    fireEvent.click(screen.getByText("Try Again"));

    expect(screen.getByText("Recovered")).toBeTruthy();
  });
});
