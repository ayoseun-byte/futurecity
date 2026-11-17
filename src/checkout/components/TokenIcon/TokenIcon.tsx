"use client";

import React, { useState } from "react";
/* eslint-disable @next/next/no-img-element */
import styles from "./TokenIcon.module.css";

interface TokenIconProps {
  src?: string;
  alt: string;
  size?: number;
  className?: string;
}

export const TokenIcon: React.FC<TokenIconProps> = ({
  src,
  alt,
  size = 20,
  className,
}) => {
  const [isBroken, setIsBroken] = useState(false);

  const showFallback = !src || isBroken;

  if (showFallback) {
    return (
      <span
        className={`${styles.fallback} ${className ?? ""}`}
        style={{ width: size, height: size, fontSize: Math.max(size * 0.5, 8) }}
        aria-label={alt}
      >
        {alt.charAt(0).toUpperCase()}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={className}
      onError={() => setIsBroken(true)}
      style={{ width: size, height: size, objectFit: 'contain' }}
    />
  );
};
