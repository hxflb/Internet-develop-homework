import { DragEvent, useRef, useState } from "react";

type Props = {
  name?: string;
  accept?: string;
  required?: boolean;
};

function allowed(name: string) {
  const ext = name.slice(name.lastIndexOf(".")).toLowerCase();
  return ext === ".txt" || ext === ".md";
}

export default function FileDrop({ name = "file", accept = ".txt,.md", required = false }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [over, setOver] = useState(false);

  function apply(files: FileList | null) {
    const f = files?.[0];
    if (!f || !allowed(f.name)) return;
    const dt = new DataTransfer();
    dt.items.add(f);
    if (inputRef.current) inputRef.current.files = dt.files;
    setFileName(f.name);
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setOver(false);
    apply(e.dataTransfer.files);
  }

  return (
    <label
      className={`dropzone${over ? " is-over" : ""}${fileName ? " has-file" : ""}`}
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={onDrop}
    >
      <input
        ref={inputRef}
        className="dropzone-input"
        name={name}
        type="file"
        accept={accept}
        required={required}
        onChange={(e) => apply(e.target.files)}
      />
      <i className={`fa-solid ${fileName ? "fa-file-lines" : "fa-cloud-arrow-up"}`} />
      {fileName ? (
        <>
          <strong>{fileName}</strong>
          <span>点击更换，或把新文件拖到此处</span>
        </>
      ) : (
        <>
          <strong>点击选择文件</strong>
          <span>或把 .txt / .md 拖到框内</span>
        </>
      )}
    </label>
  );
}
