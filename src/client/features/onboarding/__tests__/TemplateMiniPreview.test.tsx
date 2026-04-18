import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TemplateMiniPreview } from "../components/TemplateMiniPreview";
import type { SaveFloorPlanPayload } from "@shared/types/floor-plan";
import { nanoid } from "nanoid";

const mockPayload: SaveFloorPlanPayload = {
  canvasWidth: 1200,
  canvasHeight: 800,
  tables: [
    { id: nanoid(), label: "T1", shape: "circle", minCapacity: 3, maxCapacity: 4, sectionId: null, x: 100, y: 100, width: 52, height: 52, rotation: 0 },
    { id: nanoid(), label: "T2", shape: "square", minCapacity: 3, maxCapacity: 4, sectionId: null, x: 200, y: 200, width: 56, height: 56, rotation: 0 },
  ],
  sections: [
    { id: nanoid(), name: "Main Dining", color: "#8B7355", x: 10, y: 10, width: 500, height: 700 },
  ],
  walls: [
    { id: nanoid(), x1: 0, y1: 0, x2: 1200, y2: 0, thickness: 6 },
  ],
};

describe("TemplateMiniPreview", () => {
  it("renders tables as positioned divs", () => {
    render(<TemplateMiniPreview payload={mockPayload} />);
    expect(screen.getByText("T1")).toBeInTheDocument();
    expect(screen.getByText("T2")).toBeInTheDocument();
  });

  it("renders section labels", () => {
    render(<TemplateMiniPreview payload={mockPayload} />);
    expect(screen.getByText("Main Dining")).toBeInTheDocument();
  });

  it("renders with custom height", () => {
    const { container } = render(<TemplateMiniPreview payload={mockPayload} height={200} />);
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.style.height).toBe("200px");
  });

  it("handles empty payload gracefully", () => {
    const empty: SaveFloorPlanPayload = {
      canvasWidth: 800, canvasHeight: 600,
      tables: [], sections: [], walls: [],
    };
    const { container } = render(<TemplateMiniPreview payload={empty} />);
    expect(container.firstElementChild).toBeInTheDocument();
  });
});
