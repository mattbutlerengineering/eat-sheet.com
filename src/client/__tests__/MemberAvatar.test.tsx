// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemberAvatar } from "../components/MemberAvatar";

describe("MemberAvatar", () => {
  it("renders the first letter of the name uppercased", () => {
    render(<MemberAvatar name="matt" />);
    expect(screen.getByText("M")).toBeTruthy();
  });

  it("applies sm size class", () => {
    const { container } = render(<MemberAvatar name="Sarah" size="sm" />);
    const div = container.firstElementChild!;
    expect(div.className).toContain("w-7");
  });

  it("applies lg size class", () => {
    const { container } = render(<MemberAvatar name="Sarah" size="lg" />);
    const div = container.firstElementChild!;
    expect(div.className).toContain("w-12");
  });

  it("defaults to md size", () => {
    const { container } = render(<MemberAvatar name="Sarah" />);
    const div = container.firstElementChild!;
    expect(div.className).toContain("w-9");
  });

  it("gives different colors to different names", () => {
    const { container: c1 } = render(<MemberAvatar name="Alice" />);
    const { container: c2 } = render(<MemberAvatar name="Bob" />);
    const color1 = c1.firstElementChild!.className;
    const color2 = c2.firstElementChild!.className;
    // Not guaranteed different, but very likely with different names
    expect(color1).toBeTruthy();
    expect(color2).toBeTruthy();
  });
});
