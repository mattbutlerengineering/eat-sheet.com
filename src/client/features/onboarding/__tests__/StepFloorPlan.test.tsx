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

  it("preserves user's size selection when table count changes afterward", () => {
    render(<StepFloorPlan data={null} onChange={onChange} />);
    fireEvent.click(screen.getByText("Fine Dining"));
    onChange.mockClear();
    // User explicitly picks Spacious
    fireEvent.click(screen.getByText("Spacious"));
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ size: "spacious" }),
    );
    // Then types a table count that would otherwise auto-pick "cozy"
    fireEvent.change(screen.getByPlaceholderText("e.g. 12"), {
      target: { value: "4" },
    });
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ size: "spacious", tableCount: 4 }),
    );
  });

  it("auto-suggests size from table count only before user picks one", () => {
    render(<StepFloorPlan data={null} onChange={onChange} />);
    fireEvent.click(screen.getByText("Fine Dining"));
    onChange.mockClear();
    fireEvent.change(screen.getByPlaceholderText("e.g. 12"), {
      target: { value: "20" },
    });
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ size: "spacious", tableCount: 20 }),
    );
  });

  it("clamps absurd table counts", () => {
    render(<StepFloorPlan data={null} onChange={onChange} />);
    fireEvent.click(screen.getByText("Fine Dining"));
    onChange.mockClear();
    fireEvent.change(screen.getByPlaceholderText("e.g. 12"), {
      target: { value: "999999" },
    });
    const last = onChange.mock.calls.at(-1)?.[0] as { tableCount: number };
    expect(last.tableCount).toBe(500);
  });

  it("treats preloaded size as a user choice (no auto-override on resume)", () => {
    const selection: FloorPlanSelection = {
      templateId: "fine-dining",
      size: "grand",
    };
    render(<StepFloorPlan data={selection} onChange={onChange} />);
    onChange.mockClear();
    fireEvent.change(screen.getByPlaceholderText("e.g. 12"), {
      target: { value: "4" },
    });
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ size: "grand", tableCount: 4 }),
    );
  });

  it("exposes labelled groups for template and size pickers", () => {
    render(<StepFloorPlan data={null} onChange={onChange} />);
    expect(
      screen.getByRole("group", { name: /choose a template/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("group", { name: /room size/i }),
    ).toBeInTheDocument();
  });
});
