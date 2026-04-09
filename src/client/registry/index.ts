import { PageHeader } from './components/PageHeader';
import { StatCard } from './components/StatCard';
import { CardGrid } from './components/CardGrid';
import { TableCard } from './components/TableCard';
import { FloorPlanGrid } from './components/FloorPlanGrid';
import { ReservationRow } from './components/ReservationRow';
import { WaitlistEntry } from './components/WaitlistEntry';
import { GuestCard } from './components/GuestCard';
import { StatusIndicator } from './components/StatusIndicator';
import { DataTable } from './components/DataTable';
import { EmptyState } from './components/EmptyState';
import { ActionButton } from './components/ActionButton';
import { Badge } from './components/Badge';
import { Page } from './components/Page';

export {
  PageHeader,
  StatCard,
  CardGrid,
  TableCard,
  FloorPlanGrid,
  ReservationRow,
  WaitlistEntry,
  GuestCard,
  StatusIndicator,
  DataTable,
  EmptyState,
  ActionButton,
  Badge,
  Page,
};

export const fohRegistry = {
  PageHeader,
  StatCard,
  CardGrid,
  TableCard,
  FloorPlanGrid,
  ReservationRow,
  WaitlistEntry,
  GuestCard,
  StatusIndicator,
  DataTable,
  EmptyState,
  ActionButton,
  Badge,
  Page,
} as const;

export { Renderer } from './renderer';
