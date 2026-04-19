export interface Guest {
  readonly id: string;
  readonly tenantId: string;
  readonly name: string;
  readonly email: string | null;
  readonly phone: string | null;
  readonly notes: string | null;
  readonly tags: readonly string[];
  readonly visitCount: number;
  readonly lastVisitAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}
