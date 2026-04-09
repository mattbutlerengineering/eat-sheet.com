import { z } from 'zod';

export const PageHeaderSchema = z.object({
  title: z.string(),
  subtitle: z.string().optional(),
});

export const StatCardSchema = z.object({
  label: z.string(),
  value: z.number(),
  total: z.number().optional(),
  icon: z.string().optional(),
});

export const CardGridSchema = z.object({
  columns: z.number().default(3),
});

export const EmptyStateSchema = z.object({
  message: z.string(),
  icon: z.string().optional(),
});

export const ActionButtonSchema = z.object({
  label: z.string(),
  action: z.string(),
  variant: z.enum(['primary', 'secondary', 'danger']).default('primary'),
});

export const BadgeSchema = z.object({
  text: z.string(),
  color: z.enum(['green', 'yellow', 'red', 'blue', 'gray']).default('gray'),
});

export const StatusIndicatorSchema = z.object({
  status: z.string(),
  size: z.enum(['sm', 'md', 'lg']).default('md'),
});

export const DataTableSchema = z.object({
  columns: z.array(z.object({ key: z.string(), label: z.string() })),
  rows: z.array(z.record(z.string(), z.unknown())),
});
