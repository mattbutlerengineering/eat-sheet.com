import { onCLS, onFCP, onINP, onLCP, onTTFB } from "web-vitals";
import posthog from "posthog-js";

export function reportWebVitals(): void {
  const report = ({ name, value, rating }: { name: string; value: number; rating: string }) => {
    posthog.capture("web_vital", { metric: name, value: Math.round(value), rating });
  };

  onCLS(report);
  onFCP(report);
  onINP(report);
  onLCP(report);
  onTTFB(report);
}
