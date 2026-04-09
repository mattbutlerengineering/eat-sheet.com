export {
  PageHeaderSchema,
  StatCardSchema,
  CardGridSchema,
  EmptyStateSchema,
  ActionButtonSchema,
  BadgeSchema,
  StatusIndicatorSchema,
  DataTableSchema,
} from './schemas/common';

export { TableCardSchema, FloorPlanGridSchema } from './schemas/tables';
export { ReservationRowSchema } from './schemas/reservations';
export { WaitlistEntrySchema } from './schemas/waitlist';
export { GuestCardSchema } from './schemas/guests';

import { PageHeaderSchema } from './schemas/common';
import { StatCardSchema } from './schemas/common';
import { CardGridSchema } from './schemas/common';
import { EmptyStateSchema } from './schemas/common';
import { ActionButtonSchema } from './schemas/common';
import { BadgeSchema } from './schemas/common';
import { StatusIndicatorSchema } from './schemas/common';
import { DataTableSchema } from './schemas/common';
import { TableCardSchema, FloorPlanGridSchema } from './schemas/tables';
import { ReservationRowSchema } from './schemas/reservations';
import { WaitlistEntrySchema } from './schemas/waitlist';
import { GuestCardSchema } from './schemas/guests';

export const catalogSchemas = {
  PageHeader: PageHeaderSchema,
  StatCard: StatCardSchema,
  CardGrid: CardGridSchema,
  EmptyState: EmptyStateSchema,
  ActionButton: ActionButtonSchema,
  Badge: BadgeSchema,
  StatusIndicator: StatusIndicatorSchema,
  DataTable: DataTableSchema,
  TableCard: TableCardSchema,
  FloorPlanGrid: FloorPlanGridSchema,
  ReservationRow: ReservationRowSchema,
  WaitlistEntry: WaitlistEntrySchema,
  GuestCard: GuestCardSchema,
} as const;
