const PROVIDER_CONFIG: Record<string, { label: string; icon: string; bg: string; hover: string }> = {
  google: {
    label: "Sign in with Google",
    icon: "G",
    bg: "bg-white",
    hover: "hover:bg-stone-100",
  },
};

interface OAuthButtonProps {
  readonly provider: string;
}

export function OAuthButton({ provider }: OAuthButtonProps) {
  const config = PROVIDER_CONFIG[provider];
  if (!config) return null;

  return (
    <a
      href={`/api/auth/${provider}`}
      className={`flex items-center justify-center gap-3 w-full py-3.5 ${config.bg} ${config.hover} text-stone-800 font-medium rounded-xl transition-all active:scale-[0.98]`}
    >
      <span className="text-lg font-bold">{config.icon}</span>
      <span>{config.label}</span>
    </a>
  );
}
