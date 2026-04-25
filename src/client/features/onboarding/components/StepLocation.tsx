import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input, Select } from "@mattbutlerengineering/rialto";
import { venueLocationSchema } from "@shared/schemas";
import type { VenueLocationInput } from "@shared/schemas";

interface StepLocationProps {
  readonly data: VenueLocationInput | null;
  readonly onChange: (data: VenueLocationInput) => void;
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
  gap: "var(--rialto-space-2xl, 32px)",
  alignItems: "flex-start",
};

const formColumnStyle: React.CSSProperties = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  gap: "var(--rialto-space-xl, 16px)",
};

const previewColumnStyle: React.CSSProperties = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  gap: "var(--rialto-space-lg, 12px)",
};

const cityStateZipStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 80px 100px",
  gap: "var(--rialto-space-md, 10px)",
};

const previewCardStyle: React.CSSProperties = {
  background: "var(--rialto-surface-recessed, rgba(0,0,0,0.15))",
  borderRadius: "var(--rialto-radius-soft, 10px)",
  border: "1px solid var(--rialto-border, rgba(255,255,255,0.08))",
  padding: "var(--rialto-space-xl, 16px) var(--rialto-space-2xl, 20px)",
};

const previewLabelStyle: React.CSSProperties = {
  fontSize: "var(--rialto-text-xs, 11px)",
  textTransform: "uppercase",
  letterSpacing: "var(--rialto-tracking-wide, 0.12em)",
  color: "var(--rialto-text-tertiary, rgba(255,255,255,0.35))",
  marginBottom: "var(--rialto-space-md, 10px)",
};

const addressLineStyle: React.CSSProperties = {
  fontSize: "var(--rialto-text-sm, 14px)",
  color: "var(--rialto-text-primary, #e8e2d8)",
  lineHeight: "var(--rialto-leading-normal, 1.6)",
  fontFamily: "var(--rialto-font-sans, system-ui)",
};

const mutedStyle: React.CSSProperties = {
  fontSize: "var(--rialto-text-xs, 13px)",
  color: "var(--rialto-text-secondary, rgba(255,255,255,0.5))",
  marginTop: "var(--rialto-space-xs, 4px)",
  fontFamily: "var(--rialto-font-sans, system-ui)",
};

const accentStyle: React.CSSProperties = {
  fontSize: "var(--rialto-text-xs, 13px)",
  color: "var(--rialto-accent, #c49a2a)",
  marginTop: "var(--rialto-space-xs, 2px)",
  fontFamily: "var(--rialto-font-sans, system-ui)",
};

const emptyPreviewStyle: React.CSSProperties = {
  fontSize: "var(--rialto-text-xs, 13px)",
  color: "var(--rialto-text-tertiary, rgba(255,255,255,0.2))",
  fontStyle: "italic",
  fontFamily: "var(--rialto-font-sans, system-ui)",
};

const errorStyle: React.CSSProperties = {
  fontFamily: "var(--rialto-font-sans, system-ui)",
  fontSize: "var(--rialto-text-xs, 11px)",
  color: "var(--rialto-error, #e07070)",
  marginTop: "var(--rialto-space-xs, 4px)",
};

export function StepLocation({ data, onChange }: StepLocationProps) {
  const { control, watch, formState: { errors } } = useForm<VenueLocationInput>({
    resolver: zodResolver(venueLocationSchema) as any,
    defaultValues: {
      addressLine1: data?.addressLine1 ?? "",
      addressLine2: data?.addressLine2 ?? "",
      city: data?.city ?? "",
      state: data?.state ?? "",
      zip: data?.zip ?? "",
      country: data?.country ?? "US",
      timezone: data?.timezone ?? resolveDefaultTimezone(),
      phone: data?.phone ?? "",
      website: data?.website ?? "",
    },
    mode: "onTouched",
  });

  useEffect(() => {
    const subscription = watch((values) => {
      onChange(values as VenueLocationInput);
    });
    return () => subscription.unsubscribe();
  }, [watch, onChange]);

  const watched = watch();
  const hasAddress =
    watched.addressLine1 || watched.city || watched.state || watched.zip;

  return (
    <div style={columnStyle} className="step-location">
      <style>{`
        @media (max-width: 640px) {
          .step-location { flex-direction: column; }
          .step-location .location-preview { display: none; }
          .step-location .city-state-zip { grid-template-columns: 1fr; }
        }
      `}</style>
      {/* Left: Form */}
      <div style={formColumnStyle}>
        <Controller
          name="addressLine1"
          control={control}
          render={({ field }) => (
            <Input
              label="Street address"
              placeholder="123 Main St"
              value={field.value}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => field.onChange(e.target.value)}
              onBlur={field.onBlur}
            />
          )}
        />

        <Controller
          name="addressLine2"
          control={control}
          render={({ field }) => (
            <Input
              label="Suite / Unit"
              placeholder="Suite 200"
              showOptional
              value={field.value}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => field.onChange(e.target.value)}
              onBlur={field.onBlur}
            />
          )}
        />

        <fieldset style={{ border: "none", margin: 0, padding: 0 }}>
          <legend
            style={{
              fontSize: "var(--rialto-text-xs, 11px)",
              fontFamily: "var(--rialto-font-sans, system-ui)",
              color: "var(--rialto-text-tertiary, rgba(255,255,255,0.35))",
              textTransform: "uppercase" as const,
              letterSpacing: "var(--rialto-tracking-wide, 0.12em)",
              marginBottom: "var(--rialto-space-sm, 8px)",
              padding: 0,
            }}
          >
            Address details
          </legend>
          <div style={cityStateZipStyle} className="city-state-zip">
            <Controller
              name="city"
              control={control}
              render={({ field }) => (
                <Input
                  label="City"
                  placeholder="San Francisco"
                  value={field.value}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => field.onChange(e.target.value)}
                  onBlur={field.onBlur}
                />
              )}
            />
            <Controller
              name="state"
              control={control}
              render={({ field }) => (
                <Input
                  label="State"
                  placeholder="CA"
                  value={field.value}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => field.onChange(e.target.value)}
                  onBlur={field.onBlur}
                />
              )}
            />
            <Controller
              name="zip"
              control={control}
              render={({ field }) => (
                <Input
                  label="ZIP"
                  placeholder="94102"
                  value={field.value}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => field.onChange(e.target.value)}
                  onBlur={field.onBlur}
                />
              )}
            />
          </div>
        </fieldset>

        <div>
          <Controller
            name="timezone"
            control={control}
            render={({ field }) => (
              <Select
                label="Timezone"
                options={TIMEZONE_OPTIONS}
                value={field.value}
                onChange={(val) => field.onChange(val)}
              />
            )}
          />
          {errors.timezone?.message && (
            <div style={errorStyle}>{errors.timezone.message}</div>
          )}
        </div>

        <Controller
          name="phone"
          control={control}
          render={({ field }) => (
            <Input
              label="Phone"
              placeholder="+1 (555) 000-0000"
              showOptional
              value={field.value}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => field.onChange(e.target.value)}
              onBlur={field.onBlur}
              type="tel"
            />
          )}
        />

        <Controller
          name="website"
          control={control}
          render={({ field }) => (
            <Input
              label="Website"
              placeholder="https://yourvenue.com"
              showOptional
              value={field.value}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => field.onChange(e.target.value)}
              onBlur={field.onBlur}
              type="url"
            />
          )}
        />
      </div>

      {/* Right: Preview */}
      <div style={previewColumnStyle} className="location-preview">
        <div style={previewCardStyle}>
          <div style={previewLabelStyle}>Address preview</div>

          {hasAddress ? (
            <div>
              {watched.addressLine1 && (
                <div style={addressLineStyle}>{watched.addressLine1}</div>
              )}
              {watched.addressLine2 && (
                <div style={addressLineStyle}>{watched.addressLine2}</div>
              )}
              {(watched.city || watched.state || watched.zip) && (
                <div style={addressLineStyle}>
                  {[watched.city, watched.state].filter(Boolean).join(", ")}
                  {watched.zip ? ` ${watched.zip}` : ""}
                </div>
              )}
              {watched.phone && (
                <div style={mutedStyle}>{watched.phone}</div>
              )}
              {watched.website && (
                <div style={accentStyle}>{watched.website}</div>
              )}
            </div>
          ) : (
            <div style={emptyPreviewStyle}>
              Fill in your address to see a preview
            </div>
          )}
        </div>

        {watched.timezone && (
          <div style={previewCardStyle}>
            <div style={previewLabelStyle}>Timezone</div>
            <div style={{ fontSize: "var(--rialto-text-xs, 13px)", color: "var(--rialto-text-secondary, rgba(255,255,255,0.7))", fontFamily: "var(--rialto-font-sans, system-ui)" }}>
              {TIMEZONE_OPTIONS.find((t) => t.value === watched.timezone)?.label ??
                watched.timezone}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
