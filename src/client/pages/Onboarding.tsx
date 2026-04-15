import { Navigate, useNavigate } from "react-router";
import { AnimatePresence, motion } from "framer-motion";
import { spring } from "@mattbutlerengineering/rialto/motion";
import { useAuth } from "../hooks/useAuth";
import { useOnboarding } from "../features/onboarding/hooks/useOnboarding";
import { ProgressBar } from "../features/onboarding/components/ProgressBar";
import { StepVenueInfo } from "../features/onboarding/components/StepVenueInfo";
import { StepLocation } from "../features/onboarding/components/StepLocation";
import { StepLogo } from "../features/onboarding/components/StepLogo";
import { StepBrand } from "../features/onboarding/components/StepBrand";
import { StepWelcome } from "../features/onboarding/components/StepWelcome";

const STEP_TITLES = [
  "What's your venue called?",
  "Where are you located?",
  "Add your logo",
  "Your brand",
  "Welcome",
];

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "linear-gradient(135deg, #1a1714 0%, #2a2520 100%)",
  position: "relative",
  overflow: "hidden",
};

const contentStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: 800,
  padding: "0 24px",
  display: "flex",
  flexDirection: "column",
  gap: 24,
  position: "relative",
  zIndex: 1,
};

const stepLabelStyle: React.CSSProperties = {
  fontSize: 13,
  textTransform: "uppercase",
  letterSpacing: "0.1em",
  color: "rgba(232,226,216,0.4)",
  marginTop: 12,
};

const stepTitleStyle: React.CSSProperties = {
  fontFamily: "var(--rialto-font-display, system-ui)",
  fontSize: 28,
  fontWeight: 300,
  color: "#e8e2d8",
  letterSpacing: "-0.01em",
  margin: 0,
};

const placeholderCardStyle: React.CSSProperties = {
  padding: 32,
  borderRadius: 12,
  background: "rgba(232,226,216,0.05)",
  border: "1px solid rgba(232,226,216,0.1)",
  color: "rgba(232,226,216,0.4)",
  fontSize: 14,
  minHeight: 160,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const navStyle: React.CSSProperties = {
  display: "flex",
  gap: 12,
  alignItems: "center",
  justifyContent: "flex-end",
  paddingTop: 8,
};

const ghostButtonStyle: React.CSSProperties = {
  padding: "10px 20px",
  borderRadius: 8,
  border: "1px solid rgba(232,226,216,0.2)",
  background: "transparent",
  color: "rgba(232,226,216,0.7)",
  fontSize: 14,
  fontWeight: 500,
  letterSpacing: "0.01em",
  cursor: "pointer",
};

const primaryButtonStyle: React.CSSProperties = {
  padding: "10px 24px",
  borderRadius: 8,
  border: "none",
  background: "linear-gradient(135deg, #c49a2a 0%, #a07d1f 100%)",
  color: "#1a1714",
  fontSize: 14,
  fontWeight: 600,
  letterSpacing: "0.01em",
  cursor: "pointer",
  boxShadow: "0 2px 12px rgba(196,154,42,0.25)",
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
  const { state, next, back, setVenueInfo, setLocation, setLogoResult, setBrand, submitStart, submitSuccess, submitError } = useOnboarding();
  const navigate = useNavigate();

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
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/onboarding/logo", {
      method: "POST",
      body: formData,
      credentials: "include",
    });
    const body = await res.json() as { ok: boolean; data?: { logoUrl: string; extractedColors: readonly string[] } };
    if (body.ok && body.data) {
      setLogoResult(body.data);
    }
  }

  if (loading) return null;
  if (!user) return <Navigate to="/login" />;

  const { currentStep } = state;
  const title = STEP_TITLES[currentStep - 1] ?? "";
  const isLastStep = currentStep === 5;

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
      default:
        return true;
    }
  })();

  // Ambient glow color shifts as user progresses
  const glowColor = state.brand?.accent ?? "#c49a2a";
  const glowOpacity = currentStep >= 4 ? 0.1 : 0.06;

  return (
    <div style={pageStyle}>
      {/* Ambient glow that shifts with accent color */}
      <div
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

      <div style={contentStyle}>
        <ProgressBar currentStep={currentStep} />

        <div>
          <div style={stepLabelStyle}>Step {currentStep} of 5</div>
          <h1 style={stepTitleStyle}>{title}</h1>
        </div>

        <AnimatePresence mode="wait" custom={1}>
          <motion.div
            key={currentStep}
            custom={1}
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
            style={{
              padding: "10px 16px",
              borderRadius: 8,
              background: "rgba(224,112,112,0.08)",
              border: "1px solid rgba(224,112,112,0.2)",
              color: "#e07070",
              fontSize: 13,
            }}
          >
            {state.error}
          </div>
        )}

        <div style={navStyle}>
          {currentStep > 1 && (
            <button style={ghostButtonStyle} onClick={back} type="button">
              Back
            </button>
          )}
          {!isLastStep && (
            <button
              style={{
                ...primaryButtonStyle,
                opacity: canAdvance ? 1 : 0.4,
                cursor: canAdvance ? "pointer" : "not-allowed",
              }}
              onClick={canAdvance ? next : undefined}
              disabled={!canAdvance}
              type="button"
            >
              Continue
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
