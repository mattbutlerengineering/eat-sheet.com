import { useState, useEffect, useCallback } from "react";
import { Navigate, useNavigate } from "react-router";
import { AnimatePresence, motion, type MotionStyle } from "framer-motion";
import { spring } from "@mattbutlerengineering/rialto/motion";
import { useAuth } from "../hooks/useAuth";
import { useOnboarding } from "../features/onboarding/hooks/useOnboarding";
import { ProgressBar } from "../features/onboarding/components/ProgressBar";
import { StepVenueInfo } from "../features/onboarding/components/StepVenueInfo";
import { StepLocation } from "../features/onboarding/components/StepLocation";
import { StepLogo } from "../features/onboarding/components/StepLogo";
import { StepBrand } from "../features/onboarding/components/StepBrand";
import { StepFloorPlan } from "../features/onboarding/components/StepFloorPlan";
import { StepWelcome } from "../features/onboarding/components/StepWelcome";
import { noiseOverlayStyle } from "../styles/noise";

const STEP_TITLES = [
  "What's your venue called?",
  "Where are you located?",
  "Add your logo",
  "Your brand",
  "Design your floor plan",
  "Welcome",
];

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: `linear-gradient(135deg, var(--rialto-surface-recessed, #141312) 0%, var(--rialto-surface, #1e1c1a) 100%)`,
  position: "relative",
  overflow: "hidden",
};

const contentStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: 800,
  padding: "0 var(--rialto-space-lg, 24px)",
  display: "flex",
  flexDirection: "column",
  gap: "var(--rialto-space-lg, 24px)",
  position: "relative",
  zIndex: 1,
};

const stepLabelStyle: React.CSSProperties = {
  fontFamily: "var(--rialto-font-sans, system-ui)",
  fontSize: "var(--rialto-text-xs, 11px)",
  textTransform: "uppercase",
  letterSpacing: "var(--rialto-tracking-wide, 0.12em)",
  color: "var(--rialto-text-tertiary, rgba(232,226,216,0.4))",
  marginTop: "var(--rialto-space-sm, 12px)",
};

const stepTitleStyle: React.CSSProperties = {
  fontFamily: "var(--rialto-font-display, system-ui)",
  fontSize: "var(--rialto-text-2xl, 28px)",
  fontWeight: "var(--rialto-weight-light, 300)" as React.CSSProperties["fontWeight"],
  color: "var(--rialto-text-primary, #e8e2d8)",
  letterSpacing: "var(--rialto-tracking-tight, -0.01em)",
  lineHeight: "var(--rialto-leading-tight, 1.2)",
  margin: 0,
};

const navStyle: React.CSSProperties = {
  display: "flex",
  gap: "var(--rialto-space-md, 12px)",
  alignItems: "center",
  justifyContent: "flex-end",
  paddingTop: "var(--rialto-space-xs, 8px)",
};

const ghostButtonStyle: React.CSSProperties = {
  padding: "10px 20px",
  borderRadius: "var(--rialto-radius-default, 8px)",
  border: "1px solid var(--rialto-border, rgba(255,255,255,0.1))",
  background: "transparent",
  color: "var(--rialto-text-secondary, rgba(232,226,216,0.7))",
  fontFamily: "var(--rialto-font-sans, system-ui)",
  fontSize: "var(--rialto-text-sm, 14px)",
  fontWeight: "var(--rialto-weight-medium, 500)" as React.CSSProperties["fontWeight"],
  letterSpacing: "var(--rialto-tracking-tight, 0.01em)",
  cursor: "pointer",
};

const primaryButtonBase: React.CSSProperties = {
  padding: "10px 24px",
  borderRadius: "var(--rialto-radius-default, 8px)",
  border: "none",
  color: "var(--rialto-text-on-accent, #1a1918)",
  fontFamily: "var(--rialto-font-sans, system-ui)",
  fontSize: "var(--rialto-text-sm, 14px)",
  fontWeight: "var(--rialto-weight-demi, 600)" as React.CSSProperties["fontWeight"],
  letterSpacing: "var(--rialto-tracking-tight, 0.01em)",
  cursor: "pointer",
  transition: "background 0.4s ease, box-shadow 0.4s ease",
};

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 40 : -40,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -40 : 40,
    opacity: 0,
  }),
};

export function Onboarding() {
  const { user, loading } = useAuth();
  const { state, next, back, setVenueInfo, setLocation, setLogoResult, setBrand, setFloorPlan, submitStart, submitSuccess, submitError } = useOnboarding();
  const navigate = useNavigate();
  const [logoUploadError, setLogoUploadError] = useState<string | null>(null);

  async function handleSubmit() {
    const { venueInfo, location, brand, logoResult } = state;
    if (!venueInfo || !location || !brand) return;
    submitStart();
    try {
      const res = await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          venueInfo,
          location,
          brand,
          logoUrl: logoResult?.logoUrl ?? null,
          floorPlan: state.floorPlan ?? undefined,
        }),
      });
      const body = await res.json() as { ok: boolean; error?: string };
      if (body.ok) {
        submitSuccess();
        navigate("/");
      } else {
        submitError(body.error ?? "Something went wrong");
      }
    } catch {
      submitError("Something went wrong");
    }
  }

  async function handleLogoUpload(file: File) {
    setLogoUploadError(null);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/onboarding/logo", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      const body = await res.json() as { ok: boolean; data?: { logoUrl: string; extractedColors: readonly string[] }; error?: string };
      if (body.ok && body.data) {
        setLogoResult(body.data);
      } else {
        setLogoUploadError(body.error ?? "Failed to upload logo");
      }
    } catch {
      setLogoUploadError("Failed to upload logo. Please try again.");
    }
  }

  const { currentStep } = state;
  const isLastStep = currentStep === 6;

  // Determine if Continue should be enabled
  const canAdvance = (() => {
    switch (currentStep) {
      case 1:
        return Boolean(state.venueInfo?.name && state.venueInfo?.type && state.venueInfo?.cuisines?.length);
      case 2:
        return Boolean(state.location?.timezone);
      case 3:
        return true; // Logo is optional
      case 4:
        return Boolean(state.brand?.accent);
      case 5:
        return true; // Floor plan is optional
      default:
        return true;
    }
  })();

  // Keyboard navigation: Enter to advance, Escape to go back
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;

      if (e.key === "Enter" && canAdvance && !isLastStep) {
        e.preventDefault();
        next();
      } else if (e.key === "Escape" && currentStep > 1) {
        e.preventDefault();
        back();
      }
    },
    [canAdvance, isLastStep, currentStep, next, back],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  if (loading) return null;
  if (!user) return <Navigate to="/login" />;

  const title = STEP_TITLES[currentStep - 1] ?? "";

  // Ambient glow color shifts as user progresses
  const glowColor = state.brand?.accent ?? "#c49a2a";
  const glowOpacity = currentStep >= 4 ? 0.1 : 0.06;

  return (
    <main id="main-content" style={pageStyle} data-theme="dark" aria-label={`Onboarding step ${currentStep} of 6: ${title}`}>
      {/* Ambient glow that shifts with accent color */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          width: 500,
          height: 500,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${glowColor}${Math.round(glowOpacity * 255).toString(16).padStart(2, "0")} 0%, transparent 70%)`,
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          pointerEvents: "none",
          transition: "background 0.8s ease",
        }}
      />

      <div style={noiseOverlayStyle} aria-hidden="true" />

      <div style={contentStyle}>
        <ProgressBar currentStep={currentStep} accent={state.brand?.accent} />

        <AnimatePresence mode="wait" custom={state.direction}>
          <motion.div
            key={`header-${currentStep}`}
            custom={state.direction}
            initial={{ opacity: 0, y: state.direction > 0 ? 8 : -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: state.direction > 0 ? -8 : 8 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <div style={stepLabelStyle}>Step {currentStep} of 6</div>
            <h1 style={stepTitleStyle}>{title}</h1>
          </motion.div>
        </AnimatePresence>

        <AnimatePresence mode="wait" custom={state.direction}>
          <motion.div
            key={currentStep}
            custom={state.direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={spring}
          >
            {currentStep === 1 && (
              <StepVenueInfo
                data={state.venueInfo}
                onChange={setVenueInfo}
              />
            )}
            {currentStep === 2 && (
              <StepLocation
                data={state.location}
                onChange={setLocation}
              />
            )}
            {currentStep === 3 && (
              <StepLogo
                logoResult={state.logoResult}
                uploadError={logoUploadError}
                onUpload={handleLogoUpload}
              />
            )}
            {currentStep === 4 && (
              <StepBrand
                extractedColors={state.logoResult?.extractedColors ?? []}
                venueName={state.venueInfo?.name ?? ""}
                data={state.brand}
                onChange={setBrand}
              />
            )}
            {currentStep === 5 && (
              <StepFloorPlan
                data={state.floorPlan}
                onChange={setFloorPlan}
              />
            )}
            {currentStep === 6 && (
              <StepWelcome
                venueName={state.venueInfo?.name ?? "Your Venue"}
                accent={state.brand?.accent ?? "#c49a2a"}
                logoUrl={state.logoResult?.logoUrl ?? null}
                cuisines={state.venueInfo?.cuisines ?? []}
                isSubmitting={state.isSubmitting}
                onEnter={handleSubmit}
              />
            )}
          </motion.div>
        </AnimatePresence>

        {state.error && (
          <div
            role="alert"
            style={{
              padding: "var(--rialto-space-sm, 10px) var(--rialto-space-md, 16px)",
              borderRadius: "var(--rialto-radius-default, 8px)",
              background: "var(--rialto-error-muted, rgba(224,112,112,0.08))",
              border: "1px solid var(--rialto-error, rgba(224,112,112,0.2))",
              color: "var(--rialto-error, #e07070)",
              fontSize: "var(--rialto-text-sm, 13px)",
              fontFamily: "var(--rialto-font-sans, system-ui)",
            }}
          >
            {state.error}
          </div>
        )}

        <div style={navStyle}>
          {currentStep > 1 && (
            <motion.button
              style={ghostButtonStyle as MotionStyle}
              onClick={back}
              type="button"
              whileHover={{ borderColor: "var(--rialto-border-strong, rgba(255,255,255,0.2))" }}
              whileTap={{ scale: 0.97 }}
            >
              Back
            </motion.button>
          )}
          {!isLastStep && (
            <motion.button
              style={{
                ...primaryButtonBase,
                background: glowColor,
                boxShadow: `0 2px 12px ${glowColor}40`,
                opacity: canAdvance ? 1 : 0.4,
                cursor: canAdvance ? "pointer" : "not-allowed",
              } as MotionStyle}
              onClick={canAdvance ? next : undefined}
              disabled={!canAdvance}
              type="button"
              {...(canAdvance ? { whileHover: { boxShadow: `0 4px 24px ${glowColor}60` }, whileTap: { scale: 0.97 } } : {})}
            >
              {(currentStep === 3 && !state.logoResult) || (currentStep === 5 && !state.floorPlan) ? "Skip" : "Continue"}
            </motion.button>
          )}
        </div>
      </div>
    </main>
  );
}
