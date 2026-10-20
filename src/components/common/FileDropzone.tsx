import { useCallback, useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { validateFile } from '@/services/materialService';

const MAX_PREVIEW_SIZE = 5 * 1024 * 1024;

interface FileDropzoneProps {
  onFiles: (files: File[]) => void;
  accept?: string;
  maxSizeBytes?: number;
  disabled?: boolean;
}

const ACCEPT_MAP: Record<string, string> = {
  'application/pdf': '.pdf',
  'image/png': '.png',
  'image/jpeg': '.jpg,.jpeg',
  'image/jpg': '.jpg,.jpeg',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'text/plain': '.txt',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
};

export function FileDropzone({
  onFiles, accept = Object.keys(ACCEPT_MAP).join(','),
  maxSizeBytes = MAX_PREVIEW_SIZE, disabled = false,
}: FileDropzoneProps) {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setDragActive(false);
      setError(null);
      const files = Array.from(event.dataTransfer.files);
      handleFiles(files);
    },
    [],
  );

  const handleDragOver = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setDragActive(true);
    },
    [],
  );

  const handleDragLeave = useCallback(() => {
    setDragActive(false);
  }, []);

  const handleClick = () => {
    if (disabled || !fileInput.current) return;
    fileInput.current.click();
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const files = Array.from(event.target.files ?? []);
    handleFiles(files);
  };

  const handleFiles = (files: File[]) => {
    setError(null);
    const invalid = files.filter((f) => {
      const vErr = validateFile(f);
      const sizeErr = maxSizeBytes && f.size > maxSizeBytes;
      return Boolean(vErr || sizeErr);
    });
    if (invalid.length > 0) {
      const msgs = invalid.map((f) => {
        const vErr = validateFile(f);
        const sizeErr = maxSizeBytes && f.size > maxSizeBytes;
        if (sizeErr) return `${f.name}: too large (max ${Math.round(maxSizeBytes! / 1024 / 1024)} MB).`;
        return `${f.name}: ${vErr}`;
      });
      setError(msgs.join(' '));
      return;
    }
    const valid = files.filter((f) => {
      const vErr = validateFile(f);
      const sizeErr = maxSizeBytes && f.size > maxSizeBytes;
      return !vErr && !sizeErr;
    });
    if (valid.length > 0) onFiles(valid);
  };

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') handleClick(); }}
      className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer ${disabled
        ? 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed'
        : dragActive
          ? 'border-orange-500 bg-orange-50 text-orange-700'
          : 'border-slate-300 bg-white text-slate-600 hover:border-orange-400 hover:bg-orange-50'}`}>
      <input
        ref={fileInput}
        type="file"
        multiple
        accept={accept}
        disabled={disabled}
        className="sr-only"
        onChange={handleInputChange}
      />
      <div className="flex items-center justify-center gap-3 mb-2">
        <Upload className="h-6 w-6" aria-hidden="true" />
        <span className="text-sm font-medium">Click to upload or drag files here</span>
      </div>
      <p className="text-xs text-slate-500 mb-1">
        PDF, images (PNG/JPG/GIF/WebP), TXT, DOC/DOCX — up to 10 MB each
      </p>
      {error && (
        <p role="alert" className="mt-2 text-xs text-red-600">{error}</p>
      )}
    </div>
  );
}