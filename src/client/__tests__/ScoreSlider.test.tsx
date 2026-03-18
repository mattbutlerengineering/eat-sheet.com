// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ScoreSlider } from "../components/ScoreSlider";

describe("ScoreSlider", () => {
  it("renders in collapsed state when value is null and not required", () => {
    const onChange = vi.fn();
    render(<ScoreSlider label="Food" value={null} onChange={onChange} />);

    const button = screen.getByText("Food");
    expect(button).toBeTruthy();
    // Should show the + toggle button
    expect(button.closest("button")).toBeTruthy();
  });

  it("expands when clicked and sets default value to 5", () => {
    const onChange = vi.fn();
    render(<ScoreSlider label="Food" value={null} onChange={onChange} />);

    fireEvent.click(screen.getByText("Food"));
    expect(onChange).toHaveBeenCalledWith(5);
  });

  it("renders expanded with slider when value is set", () => {
    const onChange = vi.fn();
    render(<ScoreSlider label="Food" value={7} onChange={onChange} />);

    const slider = screen.getByRole("slider");
    expect(slider).toBeTruthy();
    expect(slider.getAttribute("aria-valuenow")).toBe("7");
    expect(slider.getAttribute("aria-label")).toBe("Food score");
  });

  it("renders expanded when required even with null value", () => {
    const onChange = vi.fn();
    render(<ScoreSlider label="Overall" value={null} onChange={onChange} required />);

    // Required slider should show the slider, not the collapsed state
    const slider = screen.getByRole("slider");
    expect(slider).toBeTruthy();
  });

  it("calls onChange when slider is moved", () => {
    const onChange = vi.fn();
    render(<ScoreSlider label="Food" value={5} onChange={onChange} />);

    const slider = screen.getByRole("slider");
    fireEvent.change(slider, { target: { value: "8" } });
    expect(onChange).toHaveBeenCalledWith(8);
  });

  it("shows score display text", () => {
    const onChange = vi.fn();
    render(<ScoreSlider label="Food" value={7} onChange={onChange} />);

    // Should display the number and /10
    expect(screen.getByText("7")).toBeTruthy();
    expect(screen.getByText("/10")).toBeTruthy();
  });

  it("collapses when remove button is clicked for non-required", () => {
    const onChange = vi.fn();
    render(<ScoreSlider label="Food" value={7} onChange={onChange} />);

    const removeButton = screen.getByText("×");
    fireEvent.click(removeButton);
    expect(onChange).toHaveBeenCalledWith(null);
  });
});
