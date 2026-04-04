"use client";

import { useRef, useState } from "react";

import { Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";

import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

interface ImageUploadProps {
  onUpload: (urls: string[]) => void;
  onRemove: (url: string) => void;
  value: string[];
  maxImages?: number;
  className?: string;
}

interface UploadingFile {
  id: string;
  preview: string;
  status: "uploading" | "error";
}

export function ImageUpload({ onUpload, onRemove, value, maxImages = 5, className }: ImageUploadProps) {
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const isSingleImageMode = maxImages === 1;
    const currentTotal = value.length + uploadingFiles.length;
    if (!isSingleImageMode && currentTotal + files.length > maxImages) {
      toast.error(`You can only upload up to ${maxImages} images in total.`);
      return;
    }

    const newFiles = isSingleImageMode ? Array.from(files).slice(0, 1) : Array.from(files);
    const uploadPromises = newFiles.map(async (file) => {
      if (file.size > 2 * 1024 * 1024) {
        toast.error(`${file.name} exceeds 2MB limit.`);
        return null;
      }

      const id = Math.random().toString(36).substring(7);
      const preview = URL.createObjectURL(file);

      setUploadingFiles((prev) => [...prev, { id, preview, status: "uploading" }]);

      try {
        const formData = new FormData();
        formData.append("file", file);

        const response = await api.post("/api/upload/image", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        if (response.data?.data?.url) {
          URL.revokeObjectURL(preview);
          setUploadingFiles((prev) => prev.filter((f) => f.id !== id));
          return response.data.data.url;
        }
        throw new Error("Upload failed");
      } catch (error) {
        console.error("Upload error:", error);
        setUploadingFiles((prev) => prev.map((f) => (f.id === id ? { ...f, status: "error" } : f)));
        toast.error(`Failed to upload ${file.name}`);
        return null;
      }
    });

    const results = await Promise.all(uploadPromises);
    const successfulUrls = results.filter((url): url is string => url !== null);

    if (successfulUrls.length > 0) {
      onUpload(isSingleImageMode ? [successfulUrls[successfulUrls.length - 1]] : successfulUrls);
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeUploading = (id: string, preview: string) => {
    URL.revokeObjectURL(preview);
    setUploadingFiles((prev) => prev.filter((f) => f.id !== id));
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {/* Final Uploaded Images */}
        {value.map((url, index) => (
          <div
            key={url}
            className="group relative aspect-video overflow-hidden rounded-xl border-2 border-primary/10 bg-muted shadow-sm transition-all hover:shadow-md"
          >
            <img
              src={url}
              alt={`Property ${index + 1}`}
              className="h-full w-full object-cover transition-transform group-hover:scale-110"
            />
            <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-black/60 to-transparent p-2">
              <span className="font-medium text-[10px] text-white">Image {index + 1}</span>
            </div>
            <button
              type="button"
              onClick={() => onRemove(url)}
              className="absolute top-2 right-2 rounded-lg bg-white/90 p-1.5 text-destructive shadow-sm transition-colors hover:bg-destructive hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}

        {/* Processing Images */}
        {uploadingFiles.map((file) => (
          <div
            key={file.id}
            className="relative aspect-video overflow-hidden rounded-xl border-2 border-primary/20 border-dashed bg-muted/30"
          >
            <img src={file.preview} className="h-full w-full object-cover opacity-40 grayscale" alt="Preview" />
            <div className="absolute inset-0 flex flex-col items-center justify-center p-2 text-center">
              {file.status === "uploading" ? (
                <>
                  <Loader2 className="mb-2 h-8 w-8 animate-spin text-primary" />
                  <span className="font-bold text-[10px] text-primary uppercase tracking-wider">Uploading</span>
                </>
              ) : (
                <>
                  <div className="mb-2 rounded-full bg-destructive/10 p-2">
                    <X className="h-6 w-6 text-destructive" />
                  </div>
                  <span className="font-bold text-[10px] text-destructive uppercase">Error</span>
                  <button
                    type="button"
                    onClick={() => removeUploading(file.id, file.preview)}
                    className="mt-2 text-[10px] text-muted-foreground underline hover:text-foreground"
                  >
                    Remove
                  </button>
                </>
              )}
            </div>
          </div>
        ))}

        {/* Upload Trigger */}
        {(maxImages === 1 || value.length + uploadingFiles.length < maxImages) && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="group flex aspect-video cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-primary/20 border-dashed bg-primary/[0.02] transition-all hover:border-primary/40 hover:bg-primary/[0.05]"
          >
            <div className="rounded-full bg-primary/10 p-3 transition-transform group-hover:scale-110">
              <Upload className="h-6 w-6 text-primary" />
            </div>
            <span className="mt-3 font-semibold text-primary text-xs">
              {maxImages === 1 && value.length > 0 ? "Ganti Gambar" : "Add More"}
            </span>
            <span className="mt-1 text-[10px] text-muted-foreground">
              {maxImages === 1
                ? value.length > 0
                  ? "Upload baru akan mengganti gambar lama"
                  : "1 gambar"
                : `${value.length + uploadingFiles.length}/${maxImages} Images`}
            </span>
          </button>
        )}
      </div>

      <input
        type="file"
        multiple={maxImages !== 1}
        accept="image/jpeg, image/png, image/gif, image/webp"
        className="hidden"
        ref={fileInputRef}
        onChange={handleFileChange}
      />
    </div>
  );
}
