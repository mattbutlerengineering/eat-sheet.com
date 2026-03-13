// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { Monster } from "../components/Monster";

const ALL_VARIANTS = ["welcome", "celebrate", "bored", "party", "sleeping", "snarky"] as const;

describe("Monster", () => {
  for (const variant of ALL_VARIANTS) {
    it(`renders SVG for variant "${variant}"`, () => {
      const { container } = render(
        <Monster variant={variant} size={48} />
      );
      const svg = container.querySelector("svg");
      expect(svg).toBeTruthy();
      expect(svg!.getAttribute("aria-hidden")).toBe("true");
    });
  }

  it("applies size as width and height", () => {
    const { container } = render(<Monster variant="party" size={64} />);
    const svg = container.querySelector("svg");
    expect(svg!.getAttribute("width")).toBe("64");
    expect(svg!.getAttribute("height")).toBe("64");
  });

  it("applies className", () => {
    const { container } = render(
      <Monster variant="party" size={48} className="mx-auto" />
    );
    const svg = container.querySelector("svg");
    expect(svg!.className.baseVal).toContain("mx-auto");
  });

  it("defaults size to 48", () => {
    const { container } = render(<Monster variant="party" />);
    const svg = container.querySelector("svg");
    expect(svg!.getAttribute("width")).toBe("48");
  });
});
