import { Button, FileGenericIcon } from '@hypothesis/frontend-shared';
import classnames from 'classnames';
import { useRef, useState } from 'preact/hooks';

export type FileInputProps = {
  onFileSelected: (file: File) => void;
  disabled?: boolean;

  /** ID for the `<input type="file">` element. */
  id?: string;
};

export default function FileInput({
  onFileSelected,
  disabled,
  id,
}: FileInputProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [filename, setFilename] = useState<string | null>(null);

  return (
    <Button
      variant="custom"
      classes={classnames(
        'w-full relative overflow-hidden border rounded',
        'bg-grey-0 hover:bg-grey-0',
      )}
      title={filename ? `${filename}, Select a file` : 'Select a file'}
      onClick={() => fileInputRef.current?.click()}
      disabled={disabled}
      data-testid="file-input-proxy-button"
    >
      <input
        ref={fileInputRef}
        accept=".json"
        id={id}
        type="file"
        disabled={disabled}
        className="invisible absolute w-0 h-0"
        aria-hidden
        data-testid="file-input"
        onChange={e => {
          const files = (e.target as HTMLInputElement)!.files;
          setFilename(files?.[0]?.name ?? null);

          if (files !== null && files.length > 0) {
            onFileSelected(files[0]);
          }
        }}
      />
      <div
        className="max-w-full pr-10 truncate"
        data-testid="filename-container"
      >
        {filename ?? 'Select a file'}
      </div>
      <div className="absolute right-0 h-full p-2 border-l bg-grey-2">
        <FileGenericIcon />
      </div>
    </Button>
  );
}
