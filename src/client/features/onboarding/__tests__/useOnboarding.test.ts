import { describe, it, expect } from "vitest";
import {
  onboardingReducer,
  initialState,
} from "../hooks/useOnboarding";
import type { FloorPlanSelection } from "../hooks/useOnboarding";
import type { VenueInfoInput, VenueLocationInput } from "@shared/schemas";

describe("onboardingReducer", () => {
  it("starts at step 1", () => {
    expect(initialState.currentStep).toBe(1);
  });

  it("NEXT advances to step 2 with direction 1", () => {
    const next = onboardingReducer(initialState, { type: "NEXT" });
    expect(next.currentStep).toBe(2);
    expect(next.direction).toBe(1);
  });

  it("does not advance past step 6", () => {
    const atStep6 = { ...initialState, currentStep: 6 };
    const result = onboardingReducer(atStep6, { type: "NEXT" });
    expect(result.currentStep).toBe(6);
  });

  it("BACK goes to previous step with direction -1", () => {
    const atStep3 = { ...initialState, currentStep: 3 };
    const result = onboardingReducer(atStep3, { type: "BACK" });
    expect(result.currentStep).toBe(2);
    expect(result.direction).toBe(-1);
  });

  it("does not go before step 1", () => {
    const result = onboardingReducer(initialState, { type: "BACK" });
    expect(result.currentStep).toBe(1);
  });

  it("SET_VENUE_INFO sets data", () => {
    const venueInfo: VenueInfoInput = {
      name: "The Golden Fork",
      type: "restaurant",
      cuisines: ["Italian"],
    };
    const result = onboardingReducer(initialState, {
      type: "SET_VENUE_INFO",
      payload: venueInfo,
    });
    expect(result.venueInfo).toEqual(venueInfo);
  });

  it("SET_LOGO_RESULT sets logo data", () => {
    const logoResult = {
      logoUrl: "https://example.com/logo.png",
      extractedColors: ["#c49a2a", "#1a1714"] as const,
    };
    const result = onboardingReducer(initialState, {
      type: "SET_LOGO_RESULT",
      payload: logoResult,
    });
    expect(result.logoResult).toEqual(logoResult);
  });

  it("SET_LOCATION sets location data", () => {
    const location: VenueLocationInput = {
      addressLine1: "123 Main St",
      addressLine2: "",
      city: "New York",
      state: "NY",
      zip: "10001",
      country: "US",
      timezone: "America/New_York",
      phone: "",
      website: "",
    };
    const result = onboardingReducer(initialState, {
      type: "SET_LOCATION",
      payload: location,
    });
    expect(result.location).toEqual(location);
  });

  it("SUBMIT_START sets isSubmitting and clears error", () => {
    const stateWithError = { ...initialState, error: "some error" };
    const result = onboardingReducer(stateWithError, { type: "SUBMIT_START" });
    expect(result.isSubmitting).toBe(true);
    expect(result.error).toBeNull();
  });

  it("SUBMIT_SUCCESS clears isSubmitting", () => {
    const submitting = { ...initialState, isSubmitting: true };
    const result = onboardingReducer(submitting, { type: "SUBMIT_SUCCESS" });
    expect(result.isSubmitting).toBe(false);
  });

  it("SUBMIT_ERROR sets error and clears isSubmitting", () => {
    const submitting = { ...initialState, isSubmitting: true };
    const result = onboardingReducer(submitting, {
      type: "SUBMIT_ERROR",
      payload: "Something went wrong",
    });
    expect(result.isSubmitting).toBe(false);
    expect(result.error).toBe("Something went wrong");
  });

  it("does not mutate state", () => {
    const frozen = Object.freeze({ ...initialState });
    const result = onboardingReducer(frozen, { type: "NEXT" });
    expect(result).not.toBe(frozen);
    expect(result.currentStep).toBe(2);
  });

  it("SET_FLOOR_PLAN sets floor plan selection", () => {
    const selection: FloorPlanSelection = {
      templateId: "fine-dining",
      size: "standard",
      tableCount: 16,
      seatCount: 64,
    };
    const result = onboardingReducer(initialState, {
      type: "SET_FLOOR_PLAN",
      payload: selection,
    });
    expect(result.floorPlan).toEqual(selection);
  });

  it("SET_FLOOR_PLAN with null clears selection", () => {
    const withPlan = {
      ...initialState,
      floorPlan: { templateId: "fine-dining", size: "standard" } as FloorPlanSelection,
    };
    const result = onboardingReducer(withPlan, {
      type: "SET_FLOOR_PLAN",
      payload: null,
    });
    expect(result.floorPlan).toBeNull();
  });

  it("initial state has floorPlan as null", () => {
    expect(initialState.floorPlan).toBeNull();
  });
});
