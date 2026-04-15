import {
  createContext,
  useContext,
  useEffect,
  type ReactNode,
} from "react";
import type { VenueTheme } from "@shared/types";

interface VenueThemeContextValue {
  theme: VenueTheme | null;
}

const VenueThemeContext = createContext<VenueThemeContextValue>({ theme: null });

const TOKEN_MAP: Record<string, string> = {
  accent: "--rialto-accent",
  accentHover: "--rialto-accent-hover",
  surface: "--rialto-surface",
  surfaceElevated: "--rialto-surface-elevated",
  textPrimary: "--rialto-text-primary",
} as const;

const HEX_PATTERN = /^#[0-9a-fA-F]{3,8}$/;

function isHexColor(value: unknown): value is string {
  return typeof value === "string" && HEX_PATTERN.test(value);
}

interface VenueThemeProviderProps {
  theme: VenueTheme | null;
  children: ReactNode;
}

export function VenueThemeProvider({
  theme,
  children,
}: VenueThemeProviderProps) {
  useEffect(() => {
    if (theme === null) return;

    const root = document.documentElement;
    const appliedTokens: string[] = [];

    for (const [key, cssVar] of Object.entries(TOKEN_MAP)) {
      const value = theme[key as keyof VenueTheme];
      if (isHexColor(value)) {
        root.style.setProperty(cssVar, value);
        appliedTokens.push(cssVar);
      }
    }

    return () => {
      for (const cssVar of appliedTokens) {
        root.style.removeProperty(cssVar);
      }
    };
  }, [theme]);

  return (
    <VenueThemeContext.Provider value={{ theme }}>
      {children}
    </VenueThemeContext.Provider>
  );
}

export function useVenueTheme(): VenueThemeContextValue {
  return useContext(VenueThemeContext);
}
