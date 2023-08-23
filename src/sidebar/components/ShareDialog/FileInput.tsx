import {
  FileGenericIcon,
  IconButton,
  Input,
  InputGroup,
} from '@hypothesis/frontend-shared';
import { useId, useRef } from 'preact/hooks';

export type FileInputProps = {
  onFileSelected: (file: File) => void;
  disabled?: boolean;
};

export default function FileInput({
  onFileSelected,
  disabled,
}: FileInputProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();

  return (
    <>
      <input
        ref={fileInputRef}
        accept=".json"
        type="file"
        disabled={disabled}
        className="invisible absolute w-0 h-0"
        aria-hidden
        data-testid="file-input"
        onChange={e => {
          const files = (e.target as HTMLInputElement)!.files;
          if (files !== null && files.length > 0) {
            onFileSelected(files[0]);
          }
        }}
      />
      <label htmlFor={inputId}>Select Hypothesis export file:</label>
      <InputGroup>
        <Input
          id={inputId}
          onClick={() => fileInputRef.current?.click()}
          readonly
          disabled={disabled}
          value={fileInputRef.current?.files![0]?.name ?? 'Select a file'}
          data-testid="file-input-proxy-input"
          classes="cursor-pointer"
        />
        <IconButton
          title="Select a file"
          onClick={() => fileInputRef.current?.click()}
          icon={FileGenericIcon}
          variant="dark"
          disabled={disabled}
          data-testid="file-input-proxy-button"
        />
      </InputGroup>
    </>
  );
}
