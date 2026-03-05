import { useState, useRef, type ChangeEvent } from "react";
import { compressImage, ImageTooLargeError } from "../utils/image";

interface PhotoUploadProps {
  readonly token: string;
  readonly onUploaded: (url: string | null) => void;
  readonly existingUrl?: string | null;
}

export function PhotoUpload({ token, onUploaded, existingUrl }: PhotoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(existingUrl ?? null);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError("");
    setUploading(true);

    try {
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

      setPreview(json.data!.photoUrl);
      onUploaded(json.data!.photoUrl);
    } catch (err) {
      if (err instanceof ImageTooLargeError) {
        setError(err.message);
      } else {
        setError(err instanceof Error ? err.message : "Upload failed");
      }
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    setPreview(null);
    onUploaded(null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic"
        onChange={handleFile}
        className="hidden"
      />

      {preview ? (
        <div className="relative">
          <img
            src={preview}
            alt="Upload preview"
            className="w-full h-48 object-cover rounded-xl border border-stone-700"
          />
          <button
            type="button"
            onClick={handleRemove}
            className="absolute top-2 right-2 w-8 h-8 bg-stone-900/80 hover:bg-red-600 text-stone-300 hover:text-white rounded-full flex items-center justify-center transition-colors text-sm"
          >
            X
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="w-full py-3 border-2 border-dashed border-stone-700 hover:border-orange-500/50 rounded-xl text-stone-400 hover:text-stone-300 transition-colors disabled:opacity-40"
        >
          {uploading ? "Uploading..." : "Add Photo"}
        </button>
      )}

      {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
    </div>
  );
}
