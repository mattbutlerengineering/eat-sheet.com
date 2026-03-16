import { useState, useRef, type ChangeEvent } from "react";
import { compressImage, ImageTooLargeError } from "../utils/image";

interface MultiPhotoUploadProps {
  readonly token: string;
  readonly photoUrls: readonly string[];
  readonly onPhotosChanged: (urls: readonly string[]) => void;
  readonly maxPhotos: number;
}

export function MultiPhotoUpload({ token, photoUrls, onPhotosChanged, maxPhotos }: MultiPhotoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const canAddMore = photoUrls.length < maxPhotos;

  const handleFiles = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setError("");
    setUploading(true);

    const remaining = maxPhotos - photoUrls.length;
    const filesToUpload = Array.from(files).slice(0, remaining);
    const newUrls: string[] = [];

    try {
      for (const file of filesToUpload) {
        const compressed = await compressImage(file);
        const formData = new FormData();
        formData.append("file", compressed, "photo.jpg");

        const res = await fetch("/api/photos/upload", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });

        const json = (await res.json()) as { data?: { photoUrl: string }; error?: string };
        if (!res.ok || json.error) {
          throw new Error(json.error || "Upload failed");
        }

        newUrls.push(json.data!.photoUrl);
      }

      onPhotosChanged([...photoUrls, ...newUrls]);
    } catch (err) {
      if (err instanceof ImageTooLargeError) {
        setError(err.message);
      } else {
        setError(err instanceof Error ? err.message : "Upload failed");
      }
    } finally {
      setUploading(false);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  };

  const handleRemove = (index: number) => {
    onPhotosChanged(photoUrls.filter((_, i) => i !== index));
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic"
        multiple
        onChange={handleFiles}
        aria-label="Upload photos"
        className="hidden"
      />

      {photoUrls.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2 mb-2">
          {photoUrls.map((url, i) => (
            <div key={url} className="relative flex-shrink-0">
              <img
                src={url}
                alt={`Photo ${i + 1}`}
                className="w-20 h-20 object-cover rounded-lg border border-stone-700"
              />
              <button
                type="button"
                onClick={() => handleRemove(i)}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-stone-900/90 hover:bg-red-600 text-stone-300 hover:text-white rounded-full flex items-center justify-center transition-colors text-[10px] font-bold border border-stone-700"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {canAddMore && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="w-full py-3 border-2 border-dashed border-stone-700 hover:border-coral-500/50 rounded-xl text-stone-400 hover:text-stone-300 transition-colors disabled:opacity-40"
        >
          {uploading
            ? "Uploading..."
            : photoUrls.length > 0
              ? `Add More Photos (${photoUrls.length}/${maxPhotos})`
              : "Add Photos"}
        </button>
      )}

      {!canAddMore && (
        <p className="text-stone-500 text-xs text-center mt-1">
          Maximum {maxPhotos} photos reached
        </p>
      )}

      {error && <p role="alert" className="text-red-500 text-sm mt-2">{error}</p>}
    </div>
  );
}
