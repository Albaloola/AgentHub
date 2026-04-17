"use client";

import { X, FileText, Image, FileCode, File } from "lucide-react";

export interface UploadedFile {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number;
}

interface FileChipsProps {
  files: UploadedFile[];
  onRemove: (id: string) => void;
}

function getFileIcon(type: string) {
  // eslint-disable-next-line jsx-a11y/alt-text
  if (type.startsWith("image/")) return <Image className="h-3 w-3" />;
  if (type.startsWith("text/") || type.includes("code")) return <FileCode className="h-3 w-3" />;
  if (type.includes("pdf") || type.includes("document")) return <FileText className="h-3 w-3" />;
  return <File className="h-3 w-3" />;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export function FileChips({ files, onRemove }: FileChipsProps) {
  if (files.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 px-4 pt-2">
      {files.map((file) => (
        <div
          key={file.id}
          className="flex items-center gap-1.5 rounded-md border border-border bg-muted/50 px-2 py-1 text-xs"
        >
          {getFileIcon(file.file_type)}
          <span className="max-w-[7.5rem] truncate">{file.file_name}</span>
          <span className="text-[var(--text-label)] text-muted-foreground">{formatFileSize(file.file_size)}</span>
          <button
            className="ml-1 rounded-sm p-0.5 hover:bg-accent"
            onClick={() => onRemove(file.id)}
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}
    </div>
  );
}
