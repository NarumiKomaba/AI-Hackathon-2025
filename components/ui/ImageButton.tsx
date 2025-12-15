import Image from "next/image";
import React from "react";

export function ImageButton({
  src,
  alt,
  className = "",
  onClick,
}: {
  src: string;
  alt: string;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <button onClick={onClick} className={`relative ${className}`}>
      <Image src={src} alt={alt} fill className="object-contain" />
    </button>
  );
}
