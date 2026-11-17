import CopyIcon from "@/assets/CopyIcon";
import React, { useState } from "react";

interface CopyProps {
  text: string;
  color?: string;
  successColor?: string;
  className?: string;
}

const CheckIcon: React.FC<{ color: string }> = ({ color }) => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M13.3333 4L6 11.3333L2.66667 8"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const Copy: React.FC<CopyProps> = ({
  text,
  color = "#6148C2",
  successColor = "#10B981",
  className = "",
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <span
      onClick={handleCopy}
      className={className}
      style={{
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "opacity 0.2s",
        width: "16px",
        height: "16px",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.opacity = "0.7";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.opacity = "1";
      }}
      title={copied ? "Copied!" : "Copy to clipboard"}
    >
      {copied ? <CheckIcon color={successColor} /> : <CopyIcon color={color} />}
    </span>
  );
};
