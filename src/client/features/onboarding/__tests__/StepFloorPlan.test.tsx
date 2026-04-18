import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { StepFloorPlan } from "../components/StepFloorPlan";
import type { FloorPlanSelection } from "../hooks/useOnboarding";

describe("StepFloorPlan", () => {
  const onChange = vi.fn();
  beforeEach(() => { onChange.mockClear(); });

  it("renders 6 non-blank templates", () => {
    render(<StepFloorPlan data={null} onChange={onChange} />);
    expect(screen.getByText("Fine Dining")).toBeInTheDocument();
    expect(screen.getByText("Casual Bistro")).toBeInTheDocument();
    expect(screen.getByText("Bar & Lounge")).toBeInTheDocument();
    expect(screen.getByText("Café")).toBeInTheDocument();
    expect(screen.getByText("Banquet Hall")).toBeInTheDocument();
    expect(screen.getByText("Open Kitchen")).toBeInTheDocument();
    expect(screen.queryByText("Blank")).not.toBeInTheDocument();
  });

  it("renders 4 sizes", () => {
    render(<StepFloorPlan data={null} onChange={onChange} />);
    expect(screen.getByText("Cozy")).toBeInTheDocument();
    expect(screen.getByText("Standard")).toBeInTheDocument();
    expect(screen.getByText("Spacious")).toBeInTheDocument();
    expect(screen.getByText("Grand")).toBeInTheDocument();
  });

  it("calls onChange when template selected", () => {
    render(<StepFloorPlan data={null} onChange={onChange} />);
    fireEvent.click(screen.getByText("Fine Dining"));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ templateId: "fine-dining" }),
    );
  });

  it("shows Recommended badge with matching table count", () => {
    render(<StepFloorPlan data={null} onChange={onChange} />);
    fireEvent.change(screen.getByPlaceholderText("e.g. 12"), { target: { value: "8" } });
    expect(screen.getByText("Recommended")).toBeInTheDocument();
  });

  it("renders preview when template selected", () => {
    const selection: FloorPlanSelection = { templateId: "fine-dining", size: "standard" };
    render(<StepFloorPlan data={selection} onChange={onChange} />);
    expect(screen.getByRole("img", { name: /floor plan preview/i })).toBeInTheDocument();
  });

  it("renders table and seat inputs", () => {
    render(<StepFloorPlan data={null} onChange={onChange} />);
    expect(screen.getByPlaceholderText("e.g. 12")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("e.g. 48")).toBeInTheDocument();
  });
});
