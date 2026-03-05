import { useState, useEffect, useRef, useCallback } from "react";

interface LightboxProps {
  readonly photoUrls: readonly string[];
  readonly initialIndex: number;
  readonly onClose: () => void;
}

export function Lightbox({ photoUrls, initialIndex, onClose }: LightboxProps) {
  const [current, setCurrent] = useState(initialIndex);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startRef = useRef({ x: 0, y: 0, time: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const hasPrev = current > 0;
  const hasNext = current < photoUrls.length - 1;

  const goNext = useCallback(() => {
    if (hasNext) setCurrent((c) => c + 1);
  }, [hasNext]);

  const goPrev = useCallback(() => {
    if (hasPrev) setCurrent((c) => c - 1);
  }, [hasPrev]);

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose, goNext, goPrev]);

  // Lock body scroll
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0]!;
    startRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const touch = e.touches[0]!;
    const dx = touch.clientX - startRef.current.x;
    const dy = touch.clientY - startRef.current.y;
    setOffsetX(dx);
    setOffsetY(dy);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    const elapsed = Date.now() - startRef.current.time;
    const velocityThreshold = 0.3;

    // Swipe down to dismiss
    if (offsetY > 100 || (offsetY > 50 && elapsed < 300)) {
      onClose();
      return;
    }

    // Swipe left/right for navigation
    const velocity = Math.abs(offsetX) / Math.max(elapsed, 1);
    if (offsetX < -50 && (offsetX < -100 || velocity > velocityThreshold)) {
      goNext();
    } else if (offsetX > 50 && (offsetX > 100 || velocity > velocityThreshold)) {
      goPrev();
    }

    setOffsetX(0);
    setOffsetY(0);
  };

  const opacity = isDragging ? Math.max(0.3, 1 - Math.abs(offsetY) / 300) : 1;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: `rgba(0,0,0,${opacity * 0.95})` }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 w-10 h-10 bg-stone-900/80 hover:bg-stone-800 text-white rounded-full flex items-center justify-center transition-colors"
        aria-label="Close lightbox"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>

      {/* Counter */}
      {photoUrls.length > 1 && (
        <div className="absolute top-4 left-4 z-10 bg-stone-900/80 text-stone-300 text-sm px-3 py-1 rounded-full">
          {current + 1} / {photoUrls.length}
        </div>
      )}

      {/* Previous button */}
      {hasPrev && (
        <button
          onClick={goPrev}
          className="absolute left-2 z-10 w-10 h-10 bg-stone-900/60 hover:bg-stone-800 text-white rounded-full flex items-center justify-center transition-colors"
          aria-label="Previous photo"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
      )}

      {/* Next button */}
      {hasNext && (
        <button
          onClick={goNext}
          className="absolute right-2 z-10 w-10 h-10 bg-stone-900/60 hover:bg-stone-800 text-white rounded-full flex items-center justify-center transition-colors"
          aria-label="Next photo"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      )}

      {/* Image */}
      <img
        src={photoUrls[current]}
        alt={`Photo ${current + 1} of ${photoUrls.length}`}
        className="max-w-[90vw] max-h-[85vh] object-contain select-none"
        style={{
          transform: isDragging ? `translate(${offsetX}px, ${offsetY}px)` : "none",
          transition: isDragging ? "none" : "transform 0.2s ease-out",
        }}
        draggable={false}
      />
    </div>
  );
}
