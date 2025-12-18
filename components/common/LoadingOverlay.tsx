// src/components/common/LoadingOverlay.tsx
"use client";

import React from "react";

type LoadingOverlayProps = {
  show: boolean;
};

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ show }) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center">
      <div className="w-[1060px] max-w-[90vw] rounded-2xl overflow-hidden shadow-xl">
        <video
          src="/movies/loading.mp4"
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-auto block"
        />
      </div>
    </div>
  );
};
