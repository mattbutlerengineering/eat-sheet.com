export interface TenantRow {
  id: string;
  name: string;
  slug: string;
  type: string;
  cuisines: string;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  country: string;
  timezone: string;
  phone: string | null;
  website: string | null;
  logo_url: string | null;
  onboarding_completed: number;
  created_at: string;
  updated_at: string;
}

export interface VenueThemeRow {
  id: string;
  tenant_id: string;
  accent: string;
  accent_hover: string;
  surface: string | null;
  surface_elevated: string | null;
  text_primary: string | null;
  source: string;
  created_at: string;
  updated_at: string;
}
