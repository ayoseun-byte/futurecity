"use client";

import React, { useState, useCallback } from "react";
import styles from "./Copiable.module.css";
import CheckIcon from "@/assets/CheckIcon";
import CopyIcon from "@/assets/CopyIcon";

interface CopiableProps {
    text: string;
    children: React.ReactNode;
    showIcon?: boolean;
    resetMs?: number;
}

export const Copiable: React.FC<CopiableProps> = ({
    text,
    children,
    showIcon = true,
    resetMs = 2000,
}) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = useCallback(async (e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), resetMs);
        } catch {
            // Fallback for older browsers
            const el = document.createElement("textarea");
            el.value = text;
            el.style.position = "fixed";
            el.style.opacity = "0";
            document.body.appendChild(el);
            el.select();
            document.execCommand("copy");
            document.body.removeChild(el);
            setCopied(true);
            setTimeout(() => setCopied(false), resetMs);
        }
    }, [text, resetMs]);

    return (
        <span
            className={`${styles.copiable} ${copied ? styles.copied : ""}`}
            onClick={handleCopy}
            title={copied ? "Copied!" : `Click to copy: ${text}`}
            role="button"
            aria-label={copied ? "Copied!" : `Copy ${text}`}
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && handleCopy(e as any)}
        >
            {children}
            {showIcon && (
                <span className={styles.icon}>
                    {copied ? <CheckIcon /> : <CopyIcon />}
                </span>
            )}
        </span>
    );
};