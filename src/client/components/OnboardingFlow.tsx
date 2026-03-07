import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Monster } from "./Monster";

const ONBOARDING_KEY = "eat-sheet-onboarded";

const steps = [
  {
    variant: "welcome" as const,
    title: "Welcome to Eat Sheet!",
    description: "Your family's private restaurant rating app. Add restaurants, leave honest reviews, and discover your next favorite spot together.",
    cta: "Tell me more",
  },
  {
    variant: "party" as const,
    title: "Rate honestly",
    description: "Score restaurants 1–10 across four categories: Food, Service, Ambiance, and Value. Your family's average scores help everyone decide where to eat next.",
    cta: "Got it",
  },
  {
    variant: "celebrate" as const,
    title: "Let's get started!",
    description: "Add your first restaurant and leave a review. The more your family rates, the better the recommendations get.",
    cta: "Add a restaurant",
  },
] as const;

export function isOnboarded(): boolean {
  return localStorage.getItem(ONBOARDING_KEY) === "true";
}

export function OnboardingFlow() {
  const [step, setStep] = useState(0);
  const navigate = useNavigate();

  const complete = useCallback(() => {
    localStorage.setItem(ONBOARDING_KEY, "true");
    navigate("/add");
  }, [navigate]);

  const skip = useCallback(() => {
    localStorage.setItem(ONBOARDING_KEY, "true");
    navigate("/");
  }, [navigate]);

  const current = steps[step]!;
  const isLast = step === steps.length - 1;

  return (
    <div className="min-h-dvh bg-stone-950 flex flex-col items-center justify-center px-6">
      <div className="max-w-sm w-full text-center animate-fade-up" key={step}>
        <Monster variant={current.variant} size={80} className="mx-auto" />
        <h2 className="font-display text-2xl font-black text-coral-500 mt-6">
          {current.title}
        </h2>
        <p className="text-stone-400 text-sm mt-3 leading-relaxed">
          {current.description}
        </p>

        <button
          onClick={isLast ? complete : () => setStep(step + 1)}
          className="mt-8 w-full bg-coral-500 hover:bg-coral-600 text-white font-bold py-3 rounded-xl active:scale-95 transition-all"
        >
          {current.cta}
        </button>

        <button
          onClick={skip}
          className="mt-3 text-stone-500 hover:text-stone-300 text-sm transition-colors"
        >
          Skip
        </button>

        {/* Step indicators */}
        <div className="flex justify-center gap-2 mt-6">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-colors ${
                i === step ? "bg-coral-500" : "bg-stone-700"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
