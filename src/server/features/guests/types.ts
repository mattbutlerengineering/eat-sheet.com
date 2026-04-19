export interface GuestRow {
  readonly id: string;
  readonly tenant_id: string;
  readonly name: string;
  readonly email: string | null;
  readonly phone: string | null;
  readonly notes: string | null;
  readonly tags: string;
  readonly visit_count: number;
  readonly last_visit_at: string | null;
  readonly created_at: string;
  readonly updated_at: string;
}
