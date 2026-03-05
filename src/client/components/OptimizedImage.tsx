import { useState, useRef, useEffect } from "react";

interface OptimizedImageProps {
  readonly src: string;
  readonly alt: string;
  readonly className?: string;
  readonly eager?: boolean;
  readonly onClick?: () => void;
}

export function OptimizedImage({ src, alt, className = "", eager = false, onClick }: OptimizedImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [inView, setInView] = useState(eager);
  const imgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (eager || !imgRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(imgRef.current);
    return () => observer.disconnect();
  }, [eager]);

  const Wrapper = onClick ? "button" : "div";

  return (
    <Wrapper
      ref={imgRef as any}
      className={`relative overflow-hidden ${className}`}
      onClick={onClick}
      type={onClick ? "button" : undefined}
    >
      {/* Shimmer placeholder */}
      {!loaded && (
        <div className="absolute inset-0 shimmer" />
      )}

      {inView && (
        <img
          src={src}
          alt={alt}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          onLoad={() => setLoaded(true)}
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            loaded ? "opacity-100" : "opacity-0"
          }`}
        />
      )}
    </Wrapper>
  );
}
