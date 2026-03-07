interface OverlayCloseButtonProps {
  readonly onClick: () => void;
}

export function OverlayCloseButton({ onClick }: OverlayCloseButtonProps) {
  return (
    <button
      onClick={onClick}
      className="absolute top-5 right-5 w-10 h-10 flex items-center justify-center rounded-full bg-stone-800/80 text-stone-400 hover:text-stone-200 transition-colors"
      aria-label="Close"
    >
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M4 4l10 10M14 4L4 14" />
      </svg>
    </button>
  );
}

export function BounceDots() {
  return (
    <div className="flex gap-1.5">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="w-2 h-2 rounded-full bg-coral-500 animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  );
}
