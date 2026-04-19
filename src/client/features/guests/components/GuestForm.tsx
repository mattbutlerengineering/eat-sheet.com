import { useForm, Controller, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@mattbutlerengineering/rialto";
import { createGuestSchema } from "@shared/schemas/guest";
import type { CreateGuestInput } from "@shared/schemas/guest";
import type { Guest } from "@shared/types/guest";

interface GuestFormProps {
  readonly guest?: Guest | undefined;
  readonly onSubmit: (data: CreateGuestInput) => void;
  readonly onCancel: () => void;
  readonly submitting?: boolean;
}

const errorStyle: React.CSSProperties = {
  fontFamily: "var(--rialto-font-sans, system-ui)",
  fontSize: "var(--rialto-text-xs, 11px)",
  color: "var(--rialto-error, #e07070)",
  marginTop: "var(--rialto-space-xs, 4px)",
};

const formStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--rialto-space-md, 16px)",
};

const rowStyle: React.CSSProperties = {
  display: "flex",
  gap: "var(--rialto-space-md, 16px)",
};

const buttonRowStyle: React.CSSProperties = {
  display: "flex",
  gap: "var(--rialto-space-sm, 10px)",
  justifyContent: "flex-end",
  marginTop: "var(--rialto-space-md, 16px)",
};

const buttonBase: React.CSSProperties = {
  padding: "var(--rialto-space-sm, 10px) var(--rialto-space-lg, 16px)",
  borderRadius: "var(--rialto-radius-default, 8px)",
  fontFamily: "var(--rialto-font-sans, system-ui)",
  fontSize: "var(--rialto-text-sm, 14px)",
  fontWeight: "var(--rialto-weight-demi, 600)" as React.CSSProperties["fontWeight"],
  cursor: "pointer",
  border: "none",
};

const cancelStyle: React.CSSProperties = {
  ...buttonBase,
  background: "transparent",
  color: "var(--rialto-text-secondary, #a09a92)",
};

const submitStyle: React.CSSProperties = {
  ...buttonBase,
  background: "var(--rialto-accent, #c49a2a)",
  color: "var(--rialto-text-on-accent, #1a1918)",
};

export function GuestForm({ guest, onSubmit, onCancel, submitting }: GuestFormProps) {
  const { control, handleSubmit, formState: { errors } } = useForm<CreateGuestInput>({
    resolver: zodResolver(createGuestSchema) as Resolver<CreateGuestInput>,
    defaultValues: {
      name: guest?.name ?? "",
      email: guest?.email ?? "",
      phone: guest?.phone ?? "",
      notes: guest?.notes ?? "",
      tags: guest?.tags ? [...guest.tags] : [],
    },
    mode: "onTouched",
  });

  return (
    <form style={formStyle} onSubmit={handleSubmit(onSubmit)}>
      <Controller
        name="name"
        control={control}
        render={({ field }) => (
          <div>
            <Input
              label="Name"
              value={field.value}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => field.onChange(e.target.value)}
              onBlur={field.onBlur}
              error={!!errors.name?.message}
            />
            {errors.name && (
              <div role="alert" style={errorStyle}>{errors.name.message}</div>
            )}
          </div>
        )}
      />
      <div style={rowStyle}>
        <div style={{ flex: 1 }}>
          <Controller
            name="email"
            control={control}
            render={({ field }) => (
              <div>
                <Input
                  label="Email"
                  type="email"
                  value={field.value}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => field.onChange(e.target.value)}
                  onBlur={field.onBlur}
                  error={!!errors.email?.message}
                />
                {errors.email && (
                  <div role="alert" style={errorStyle}>{errors.email.message}</div>
                )}
              </div>
            )}
          />
        </div>
        <div style={{ flex: 1 }}>
          <Controller
            name="phone"
            control={control}
            render={({ field }) => (
              <div>
                <Input
                  label="Phone"
                  value={field.value}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => field.onChange(e.target.value)}
                  onBlur={field.onBlur}
                  error={!!errors.phone?.message}
                />
                {errors.phone && (
                  <div role="alert" style={errorStyle}>{errors.phone.message}</div>
                )}
              </div>
            )}
          />
        </div>
      </div>
      <Controller
        name="notes"
        control={control}
        render={({ field }) => (
          <div>
            <Input
              label="Notes"
              value={field.value}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => field.onChange(e.target.value)}
              onBlur={field.onBlur}
              error={!!errors.notes?.message}
            />
            {errors.notes && (
              <div role="alert" style={errorStyle}>{errors.notes.message}</div>
            )}
          </div>
        )}
      />
      <div style={buttonRowStyle}>
        <button type="button" style={cancelStyle} onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" style={submitStyle} disabled={submitting}>
          {guest ? "Update" : "Add Guest"}
        </button>
      </div>
    </form>
  );
}
