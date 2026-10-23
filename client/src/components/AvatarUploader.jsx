import { useEffect, useRef, useState } from "react";
import apiClient from "../services/apiClient.js";

const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"];

function validateFile(candidate) {
  if (!ALLOWED.includes(candidate.type)) {
    return "Only image files are allowed (JPEG, PNG, WebP, GIF)";
  }

  if (candidate.size > MAX_SIZE) {
    return "File is too large (max 5MB)";
  }

  return null;
}

export default function AvatarUploader() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return undefined;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  function selectFile(candidate) {
    if (!candidate) return;

    const validationError = validateFile(candidate);
    setError(validationError || "");
    setUploadedUrl("");
    setProgress(0);

    if (validationError) {
      setFile(null);
      return;
    }

    setFile(candidate);
  }

  function handleDragOver(event) {
    event.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(event) {
    event.preventDefault();
    setIsDragging(false);
  }

  function handleDrop(event) {
    event.preventDefault();
    setIsDragging(false);
    selectFile(event.dataTransfer.files[0]);
  }

  function handleInputChange(event) {
    selectFile(event.target.files[0]);
    event.target.value = "";
  }

  async function upload() {
    if (!file || isUploading) return;

    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError("");
    setUploadedUrl("");
    setProgress(0);
    setIsUploading(true);

    const formData = new FormData();
    formData.append("avatar", file);

    try {
      const response = await apiClient.post("/api/upload", formData, {
        onUploadProgress: (event) => {
          if (!event.total) return;
          setProgress(Math.round((event.loaded * 100) / event.total));
        },
      });
      setProgress(100);
      setUploadedUrl(response.data.url || "");
    } catch (uploadError) {
      setError(
        uploadError.response?.data?.error ||
          "Upload failed. Please try again."
      );
      setProgress(0);
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div>
      <div
        className={isDragging ? "drop-zone dragging" : "drop-zone"}
        onClick={() => inputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            inputRef.current?.click();
          }
        }}
      >
        {preview ? (
          <img src={preview} alt="Selected avatar preview" className="preview" />
        ) : (
          <p>Drag an image here, or click to choose</p>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          hidden
          onChange={handleInputChange}
        />
      </div>

      {file && <p>{file.name}</p>}
      {error && <p className="error">{error}</p>}

      {progress > 0 && (
        <>
          <div
            className="bar"
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin="0"
            aria-valuemax="100"
            aria-label="Upload progress"
          >
            <div className="fill" style={{ width: `${progress}%` }} />
          </div>
          <p>{progress}%</p>
        </>
      )}

      {uploadedUrl && (
        <p>
          Upload complete: <a href={uploadedUrl}>{uploadedUrl}</a>
        </p>
      )}

      <button onClick={upload} disabled={!file || isUploading}>
        {isUploading ? "Uploading..." : "Upload"}
      </button>
    </div>
  );
}
