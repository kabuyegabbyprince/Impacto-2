import React, { useEffect, useState } from "react";
import { resolveFileUrl } from "../lib/storageService";

export const ResolvedImage: React.FC<{
  src?: string;
  alt?: string;
  className?: string;
  referrerPolicy?: "no-referrer" | "origin" | "unsafe-url" | undefined;
  bucketName?: string;
}> = ({ src, alt, className, referrerPolicy, bucketName = "chat-attachments" }) => {
  const [resolvedSrc, setResolvedSrc] = useState<string>("");

  useEffect(() => {
    if (!src) return;
    let active = true;
    resolveFileUrl(src, bucketName).then((url) => {
      if (active) setResolvedSrc(url);
    });
    return () => {
      active = false;
    };
  }, [src, bucketName]);

  return resolvedSrc ? (
    <img src={resolvedSrc} alt={alt} className={className} referrerPolicy={referrerPolicy} />
  ) : (
    <div className={`${className} bg-gray-150 dark:bg-slate-800 animate-pulse`} />
  );
};

export const ResolvedAudio: React.FC<{
  src?: string;
  className?: string;
}> = ({ src, className }) => {
  const [resolvedSrc, setResolvedSrc] = useState<string>("");

  useEffect(() => {
    if (!src) return;
    let active = true;
    resolveFileUrl(src).then((url) => {
      if (active) setResolvedSrc(url);
    });
    return () => {
      active = false;
    };
  }, [src]);

  return resolvedSrc ? (
    <audio src={resolvedSrc} controls className={className} />
  ) : (
    <div className="h-10 w-48 bg-gray-150 dark:bg-slate-800 animate-pulse rounded-full" />
  );
};

export const ResolvedDownloadLink: React.FC<{
  fileUrl?: string;
  fileName?: string;
  children: React.ReactNode;
  className?: string;
  bucketName?: string;
}> = ({ fileUrl, fileName, children, className = "", bucketName = "chat-attachments" }) => {
  const [resolvedUrl, setResolvedUrl] = useState<string>("");

  useEffect(() => {
    if (!fileUrl) return;
    let active = true;
    resolveFileUrl(fileUrl, bucketName).then((url) => {
      if (active) setResolvedUrl(url);
    });
    return () => {
      active = false;
    };
  }, [fileUrl, bucketName]);

  const handleDownload = (e: React.MouseEvent) => {
    if (!resolvedUrl) {
      e.preventDefault();
      return;
    }
  };

  return (
    <a 
      href={resolvedUrl || "#"} 
      target="_blank" 
      rel="noopener noreferrer" 
      download={fileName || true}
      onClick={handleDownload}
      className={`${className} cursor-pointer inline-block`}
    >
      {children}
    </a>
  );
};
