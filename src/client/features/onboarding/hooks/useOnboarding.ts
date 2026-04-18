import { useReducer } from "react";
import type {
  VenueInfoInput,
  VenueLocationInput,
  VenueBrandInput,
} from "@shared/schemas";

export interface FloorPlanSelection {
  readonly templateId: string;
  readonly size: string;
  readonly tableCount?: number | undefined;
  readonly seatCount?: number | undefined;
}

export interface OnboardingState {
  readonly currentStep: number;
  readonly direction: 1 | -1;
  readonly venueInfo: VenueInfoInput | null;
  readonly location: VenueLocationInput | null;
  readonly logoResult: {
    logoUrl: string;
    extractedColors: readonly string[];
  } | null;
  readonly brand: VenueBrandInput | null;
  readonly floorPlan: FloorPlanSelection | null;
  readonly isSubmitting: boolean;
  readonly error: string | null;
}

type OnboardingAction =
  | { type: "NEXT" }
  | { type: "BACK" }
  | { type: "SET_VENUE_INFO"; payload: VenueInfoInput }
  | { type: "SET_LOCATION"; payload: VenueLocationInput }
  | {
      type: "SET_LOGO_RESULT";
      payload: { logoUrl: string; extractedColors: readonly string[] };
    }
  | { type: "SET_BRAND"; payload: VenueBrandInput }
  | { type: "SET_FLOOR_PLAN"; payload: FloorPlanSelection | null }
  | { type: "SUBMIT_START" }
  | { type: "SUBMIT_SUCCESS" }
  | { type: "SUBMIT_ERROR"; payload: string };

export const initialState: OnboardingState = {
  currentStep: 1,
  direction: 1,
  venueInfo: null,
  location: null,
  logoResult: null,
  brand: null,
  floorPlan: null,
  isSubmitting: false,
  error: null,
};

const MAX_STEP = 6;
const MIN_STEP = 1;

export function onboardingReducer(
  state: OnboardingState,
  action: OnboardingAction,
): OnboardingState {
  switch (action.type) {
    case "NEXT":
      return {
        ...state,
        currentStep: Math.min(state.currentStep + 1, MAX_STEP),
        direction: 1,
      };
    case "BACK":
      return {
        ...state,
        currentStep: Math.max(state.currentStep - 1, MIN_STEP),
        direction: -1,
      };
    case "SET_VENUE_INFO":
      return { ...state, venueInfo: action.payload };
    case "SET_LOCATION":
      return { ...state, location: action.payload };
    case "SET_LOGO_RESULT":
      return { ...state, logoResult: action.payload };
    case "SET_BRAND":
      return { ...state, brand: action.payload };
    case "SET_FLOOR_PLAN":
      return { ...state, floorPlan: action.payload };
    case "SUBMIT_START":
      return { ...state, isSubmitting: true, error: null };
    case "SUBMIT_SUCCESS":
      return { ...state, isSubmitting: false };
    case "SUBMIT_ERROR":
      return { ...state, isSubmitting: false, error: action.payload };
    default:
      return state;
  }
}

export function useOnboarding() {
  const [state, dispatch] = useReducer(onboardingReducer, initialState);

  return {
    state,
    next: () => dispatch({ type: "NEXT" }),
    back: () => dispatch({ type: "BACK" }),
    setVenueInfo: (payload: VenueInfoInput) =>
      dispatch({ type: "SET_VENUE_INFO", payload }),
    setLocation: (payload: VenueLocationInput) =>
      dispatch({ type: "SET_LOCATION", payload }),
    setLogoResult: (payload: {
      logoUrl: string;
      extractedColors: readonly string[];
    }) => dispatch({ type: "SET_LOGO_RESULT", payload }),
    setBrand: (payload: VenueBrandInput) =>
      dispatch({ type: "SET_BRAND", payload }),
    setFloorPlan: (payload: FloorPlanSelection | null) =>
      dispatch({ type: "SET_FLOOR_PLAN", payload }),
    submitStart: () => dispatch({ type: "SUBMIT_START" }),
    submitSuccess: () => dispatch({ type: "SUBMIT_SUCCESS" }),
    submitError: (message: string) =>
      dispatch({ type: "SUBMIT_ERROR", payload: message }),
  };
}
