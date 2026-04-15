import { useState } from "react";
import { Input, Select } from "@mattbutlerengineering/rialto";
import type { VenueLocationInput } from "@shared/schemas";

interface StepLocationProps {
  data: VenueLocationInput | null;
  onChange: (data: VenueLocationInput) => void;
}

const DEFAULT_TIMEZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;

const TIMEZONE_OPTIONS = [
  { value: "America/New_York", label: "Eastern Time (New York)" },
  { value: "America/Chicago", label: "Central Time (Chicago)" },
  { value: "America/Denver", label: "Mountain Time (Denver)" },
  { value: "America/Los_Angeles", label: "Pacific Time (Los Angeles)" },
  { value: "America/Phoenix", label: "Mountain Time – No DST (Phoenix)" },
  { value: "America/Anchorage", label: "Alaska Time (Anchorage)" },
  { value: "Pacific/Honolulu", label: "Hawaii Time (Honolulu)" },
  { value: "Europe/London", label: "GMT / British Time (London)" },
  { value: "Europe/Paris", label: "Central European Time (Paris)" },
  { value: "Asia/Tokyo", label: "Japan Standard Time (Tokyo)" },
];

function resolveDefaultTimezone(): string {
  const found = TIMEZONE_OPTIONS.find((opt) => opt.value === DEFAULT_TIMEZONE);
  return found ? DEFAULT_TIMEZONE : "America/New_York";
}

const columnStyle: React.CSSProperties = {
  display: "flex",
  gap: 32,
  alignItems: "flex-start",
};

const formColumnStyle: React.CSSProperties = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  gap: 16,
};

const previewColumnStyle: React.CSSProperties = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  gap: 12,
};

const cityStateZipStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 80px 100px",
  gap: 10,
};

const previewCardStyle: React.CSSProperties = {
  background: "rgba(232,226,216,0.04)",
  borderRadius: 10,
  border: "1px solid rgba(232,226,216,0.08)",
  padding: "16px 20px",
};

const previewLabelStyle: React.CSSProperties = {
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: "0.12em",
  color: "rgba(232,226,216,0.35)",
  marginBottom: 10,
};

const addressLineStyle: React.CSSProperties = {
  fontSize: 14,
  color: "#e8e2d8",
  lineHeight: 1.6,
};

const mutedStyle: React.CSSProperties = {
  fontSize: 13,
  color: "rgba(232,226,216,0.5)",
  marginTop: 4,
};

const accentStyle: React.CSSProperties = {
  fontSize: 13,
  color: "var(--rialto-accent, #c49a2a)",
  marginTop: 2,
};

const emptyPreviewStyle: React.CSSProperties = {
  fontSize: 13,
  color: "rgba(232,226,216,0.2)",
  fontStyle: "italic",
};

interface LocationState {
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  timezone: string;
  phone: string;
  website: string;
}

function stateToInput(s: LocationState): VenueLocationInput {
  return {
    addressLine1: s.addressLine1,
    addressLine2: s.addressLine2,
    city: s.city,
    state: s.state,
    zip: s.zip,
    country: s.country,
    timezone: s.timezone,
    phone: s.phone,
    website: s.website,
  };
}

export function StepLocation({ data, onChange }: StepLocationProps) {
  const [loc, setLoc] = useState<LocationState>({
    addressLine1: data?.addressLine1 ?? "",
    addressLine2: data?.addressLine2 ?? "",
    city: data?.city ?? "",
    state: data?.state ?? "",
    zip: data?.zip ?? "",
    country: data?.country ?? "US",
    timezone: data?.timezone ?? resolveDefaultTimezone(),
    phone: data?.phone ?? "",
    website: data?.website ?? "",
  });

  function update(patch: Partial<LocationState>) {
    const next = { ...loc, ...patch };
    setLoc(next);
    onChange(stateToInput(next));
  }

  const hasAddress =
    loc.addressLine1 || loc.city || loc.state || loc.zip;

  return (
    <div style={columnStyle}>
      {/* Left: Form */}
      <div style={formColumnStyle}>
        <Input
          label="Street address"
          placeholder="123 Main St"
          value={loc.addressLine1}
          onChange={(e) => update({ addressLine1: e.target.value })}
        />

        <Input
          label="Suite / Unit"
          placeholder="Suite 200"
          showOptional
          value={loc.addressLine2}
          onChange={(e) => update({ addressLine2: e.target.value })}
        />

        <div style={cityStateZipStyle}>
          <Input
            label="City"
            placeholder="San Francisco"
            value={loc.city}
            onChange={(e) => update({ city: e.target.value })}
          />
          <Input
            label="State"
            placeholder="CA"
            value={loc.state}
            onChange={(e) => update({ state: e.target.value })}
          />
          <Input
            label="ZIP"
            placeholder="94102"
            value={loc.zip}
            onChange={(e) => update({ zip: e.target.value })}
          />
        </div>

        <Select
          label="Timezone"
          options={TIMEZONE_OPTIONS}
          value={loc.timezone}
          onChange={(val) => update({ timezone: val })}
        />

        <Input
          label="Phone"
          placeholder="+1 (555) 000-0000"
          showOptional
          value={loc.phone}
          onChange={(e) => update({ phone: e.target.value })}
          type="tel"
        />

        <Input
          label="Website"
          placeholder="https://yourvenue.com"
          showOptional
          value={loc.website}
          onChange={(e) => update({ website: e.target.value })}
          type="url"
        />
      </div>

      {/* Right: Preview */}
      <div style={previewColumnStyle}>
        <div style={previewCardStyle}>
          <div style={previewLabelStyle}>Address preview</div>

          {hasAddress ? (
            <div>
              {loc.addressLine1 && (
                <div style={addressLineStyle}>{loc.addressLine1}</div>
              )}
              {loc.addressLine2 && (
                <div style={addressLineStyle}>{loc.addressLine2}</div>
              )}
              {(loc.city || loc.state || loc.zip) && (
                <div style={addressLineStyle}>
                  {[loc.city, loc.state, loc.zip].filter(Boolean).join(", ")}
                </div>
              )}
              {loc.phone && (
                <div style={mutedStyle}>{loc.phone}</div>
              )}
              {loc.website && (
                <div style={accentStyle}>{loc.website}</div>
              )}
            </div>
          ) : (
            <div style={emptyPreviewStyle}>
              Fill in your address to see a preview
            </div>
          )}
        </div>

        {loc.timezone && (
          <div style={previewCardStyle}>
            <div style={previewLabelStyle}>Timezone</div>
            <div style={{ fontSize: 13, color: "rgba(232,226,216,0.7)" }}>
              {TIMEZONE_OPTIONS.find((t) => t.value === loc.timezone)?.label ??
                loc.timezone}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
