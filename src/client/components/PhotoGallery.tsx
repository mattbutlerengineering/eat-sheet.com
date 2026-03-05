import { useState } from "react";
import { Lightbox } from "./Lightbox";

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
        <button
          type="button"
          onClick={() => setLightboxIndex(0)}
          className="mt-3 w-full block"
        >
          <img
            src={photoUrls[0]}
            alt={alt}
            className="w-full h-40 object-cover rounded-lg border border-stone-800/50 hover:opacity-90 transition-opacity"
          />
        </button>
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
            <button
              key={url}
              type="button"
              onClick={() => setLightboxIndex(i)}
              className="flex-shrink-0 snap-start"
            >
              <img
                src={url}
                alt={`${alt} ${i + 1}`}
                className="w-28 h-28 object-cover rounded-lg border border-stone-800/50 hover:opacity-90 transition-opacity"
              />
            </button>
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
