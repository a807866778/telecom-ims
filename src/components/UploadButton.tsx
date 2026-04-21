"use client";

import { useState, useRef } from "react";

interface UploadedFile {
  id: string;
  url: string;
  fileName: string;
}

interface UseUploadOptions {
  onSuccess?: (file: UploadedFile) => void;
  onError?: (error: string) => void;
}

export function useUpload(options?: UseUploadOptions) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function uploadFile(file: File): Promise<UploadedFile | null> {
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        const uploadedFile: UploadedFile = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 6),
          url: data.url,
          fileName: data.fileName,
        };
        options?.onSuccess?.(uploadedFile);
        return uploadedFile;
      } else {
        options?.onError?.(data.error || "上传失败");
        return null;
      }
    } catch {
      options?.onError?.("上传失败");
      return null;
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>, existingFiles: UploadedFile[] = []): Promise<UploadedFile[]> {
    const files = e.target.files;
    if (!files || files.length === 0) return existingFiles;

    setUploading(true);
    const newFiles = [...existingFiles];

    try {
      for (const file of Array.from(files)) {
        const uploaded = await uploadFile(file);
        if (uploaded) {
          newFiles.push(uploaded);
        }
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }

    return newFiles;
  }

  function removeFile(files: UploadedFile[], fileId: string): UploadedFile[] {
    return files.filter((f) => f.id !== fileId);
  }

  return {
    uploading,
    fileInputRef,
    handleFileChange,
    removeFile,
    uploadFile,
  };
}

// 简单的单文件上传按钮组件
interface SingleUploadButtonProps {
  value: string;
  onChange: (url: string, fileName: string) => void;
  accept?: string;
  label?: string;
}

export function SingleUploadButton({ value, onChange, accept = "image/*", label = "上传文件" }: SingleUploadButtonProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        onChange(data.url, data.fileName);
      } else {
        alert(data.error || "上传失败");
      }
    } catch {
      alert("上传失败");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="flex items-center gap-3">
      <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
        {uploading ? (
          <span className="text-sm">上传中...</span>
        ) : (
          <>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>{label}</span>
          </>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleFileChange}
          className="hidden"
          disabled={uploading}
        />
      </label>
      {value && (
        <a href={value} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 text-sm">
          查看已上传文件
        </a>
      )}
    </div>
  );
}

// 多文件上传展示组件
interface MultiUploadProps {
  files: UploadedFile[];
  onChange: (files: UploadedFile[]) => void;
  accept?: string;
  multiple?: boolean;
}

export function MultiUpload({ files, onChange, accept = "image/*", multiple = true }: MultiUploadProps) {
  const { uploading, fileInputRef, handleFileChange, removeFile } = useUpload({
    onSuccess: (file) => {
      onChange([...files, file]);
    },
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    handleFileChange(e, files).then(onChange);
  }

  return (
    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
      <div className="flex flex-wrap gap-3">
        {files.map((file) => (
          <div key={file.id} className="relative group">
            <img src={file.url} alt={file.fileName} className="w-24 h-24 object-cover rounded-lg border" />
            <button
              type="button"
              onClick={() => onChange(removeFile(files, file.id))}
              className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity"
            >
              x
            </button>
          </div>
        ))}
        <label className="w-24 h-24 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-gray-50 transition-colors">
          {uploading ? (
            <span className="text-sm text-gray-400">上传中...</span>
          ) : (
            <>
              <span className="text-2xl text-gray-400">+</span>
              <span className="text-xs text-gray-400 mt-1">添加</span>
            </>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            multiple={multiple}
            onChange={handleChange}
            className="hidden"
            disabled={uploading}
          />
        </label>
      </div>
    </div>
  );
}
