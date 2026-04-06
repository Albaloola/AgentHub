"use client";

import { useState, useCallback, useRef } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export interface UploadedFile {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number;
}

interface FileAttachmentProps {
  onFilesUploaded: (files: UploadedFile[]) => void;
  disabled?: boolean;
  acceptedTypes?: string[];
  maxSizeMB?: number;
}

export function FileAttachment({ onFilesUploaded, disabled, acceptedTypes, maxSizeMB }: FileAttachmentProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const maxBytes = (maxSizeMB ?? 10) * 1024 * 1024;

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled || uploading) return;
    await handleFiles(Array.from(e.dataTransfer.files));
  }, [disabled, uploading]);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    await handleFiles(Array.from(e.target.files));
    e.target.value = "";
  }, []);

  async function handleFiles(files: File[]) {
    setUploading(true);
    const uploaded: UploadedFile[] = [];

    for (const file of files) {
      if (file.size > maxBytes) {
        toast.error(`${file.name} is too large (max ${maxBytes / 1024 / 1024}MB)`);
        continue;
      }

      try {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/upload", { method: "POST", body: formData });
        if (!res.ok) {
          const err = await res.json();
          toast.error(err.error || "Upload failed");
          continue;
        }

        const data = await res.json();
        uploaded.push(data);
      } catch {
        toast.error(`Failed to upload ${file.name}`);
      }
    }

    if (uploaded.length > 0) {
      onFilesUploaded(uploaded);
    }
    setUploading(false);
  }

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-lg border-2 border-dashed p-4 transition-colors",
        isDragging ? "border-primary bg-primary/5" : "border-border",
        disabled && "pointer-events-none opacity-50",
      )}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileSelect}
        accept={acceptedTypes?.join(",")}
        disabled={disabled}
      />
      <Button
        variant="ghost"
        size="sm"
        className="gap-2"
        onClick={() => inputRef.current?.click()}
        disabled={disabled || uploading}
      >
        {uploading ? (
          <>
            <Upload className="h-4 w-4 animate-spin" />
            <span className="text-xs">Uploading...</span>
          </>
        ) : (
          <>
            <Upload className="h-4 w-4" />
            <span className="text-xs">Attach files</span>
          </>
        )}
      </Button>
    </div>
  );
}
