const MAX_DIMENSION = 800;
const JPEG_QUALITY = 0.8;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export class ImageTooLargeError extends Error {
  constructor() {
    super("Image must be under 5MB");
    this.name = "ImageTooLargeError";
  }
}

export function compressImage(file: File): Promise<Blob> {
  if (file.size > MAX_FILE_SIZE) {
    return Promise.reject(new ImageTooLargeError());
  }

  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(img.src);

      let { width, height } = img;
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        if (width > height) {
          height = Math.round((height * MAX_DIMENSION) / width);
          width = MAX_DIMENSION;
        } else {
          width = Math.round((width * MAX_DIMENSION) / height);
          height = MAX_DIMENSION;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas context not available"));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("Compression failed"))),
        "image/jpeg",
        JPEG_QUALITY
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error("Failed to load image"));
    };

    img.src = URL.createObjectURL(file);
  });
}
