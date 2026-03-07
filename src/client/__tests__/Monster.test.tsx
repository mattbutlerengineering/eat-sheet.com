// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { Monster } from "../components/Monster";

describe("Monster", () => {
  const VARIANT_MONSTER_MAP: Record<string, string> = {
    party: "teal-big",
    celebrate: "teal-big",
    welcome: "blue-bottom-right",
    bored: "coral-left",
    sleeping: "coral-left",
    snarky: "tiny-red-top-left",
  };

  for (const [variant, monster] of Object.entries(VARIANT_MONSTER_MAP)) {
    it(`renders ${monster} for variant "${variant}"`, () => {
      const { container } = render(
        <Monster variant={variant as any} size={48} />
      );
      const img = container.querySelector("img");
      expect(img).toBeTruthy();
      expect(img!.getAttribute("src")).toBe(`/monsters/${monster}-256.png`);
    });
  }

  it("applies size as width and height", () => {
    const { container } = render(<Monster variant="party" size={64} />);
    const img = container.querySelector("img");
    expect(img!.getAttribute("width")).toBe("64");
    expect(img!.getAttribute("height")).toBe("64");
  });

  it("applies className", () => {
    const { container } = render(
      <Monster variant="party" size={48} className="mx-auto" />
    );
    const img = container.querySelector("img");
    expect(img!.className).toContain("mx-auto");
  });

  it("defaults size to 48", () => {
    const { container } = render(<Monster variant="party" />);
    const img = container.querySelector("img");
    expect(img!.getAttribute("width")).toBe("48");
  });
});
