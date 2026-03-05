import { useState } from "react";
import { Lightbox } from "./Lightbox";
import { OptimizedImage } from "./OptimizedImage";

interface PhotoGalleryProps {
  readonly photoUrls: readonly string[];
  readonly alt?: string;
}

export function PhotoGallery({ photoUrls, alt = "Review photo" }: PhotoGalleryProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (photoUrls.length === 0) return null;

  // Single photo — simple display
  if (photoUrls.length === 1) {
    return (
      <>
        <OptimizedImage
          src={photoUrls[0]!}
          alt={alt}
          className="mt-3 w-full h-40 rounded-lg border border-stone-800/50"
          onClick={() => setLightboxIndex(0)}
        />
        {lightboxIndex !== null && (
          <Lightbox
            photoUrls={photoUrls}
            initialIndex={lightboxIndex}
            onClose={() => setLightboxIndex(null)}
          />
        )}
      </>
    );
  }

  // Multiple photos — scrollable strip
  return (
    <>
      <div className="mt-3">
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 snap-x snap-mandatory">
          {photoUrls.map((url, i) => (
            <OptimizedImage
              key={url}
              src={url}
              alt={`${alt} ${i + 1}`}
              className="flex-shrink-0 snap-start w-28 h-28 rounded-lg border border-stone-800/50"
              onClick={() => setLightboxIndex(i)}
            />
          ))}
        </div>
        <p className="text-stone-500 text-xs mt-1">{photoUrls.length} photos</p>
      </div>
      {lightboxIndex !== null && (
        <Lightbox
          photoUrls={photoUrls}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </>
  );
}
