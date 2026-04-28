export interface MetricsResponse {
  readonly version: string;
  readonly commit: string;
  readonly acmm_level: number;
  readonly acmm_role: string;
  readonly db_schema_version: number;
  readonly uptime_seconds: number | "edge";
  readonly healthcheck: "ok";
}
