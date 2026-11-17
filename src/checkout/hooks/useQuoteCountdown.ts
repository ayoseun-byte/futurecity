import { useEffect, useRef, useState, useCallback } from "react";

interface UseQuoteCountdownOptions {
    intervalMs?: number;
    onRefresh: () => void;
    enabled?: boolean;
}

export function useQuoteCountdown({
    intervalMs = 30000,
    onRefresh,
    enabled = true,
}: UseQuoteCountdownOptions) {
    const totalSeconds = Math.floor(intervalMs / 1000);
    const [secondsLeft, setSecondsLeft] = useState(totalSeconds);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const reset = useCallback(() => {
        setSecondsLeft(totalSeconds);
    }, [totalSeconds]);

    const refresh = useCallback(() => {
        onRefresh();
        reset();
    }, [onRefresh, reset]);

    useEffect(() => {
        if (!enabled) return;

        timerRef.current = setInterval(() => {
            setSecondsLeft((prev) => {
                if (prev <= 1) {
                    onRefresh();
                    return totalSeconds;
                }
                return prev - 1;
            });
        }, 1000);

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [enabled, onRefresh, totalSeconds]);

    const progress = secondsLeft / totalSeconds; // 1 → 0

    return { secondsLeft, progress, refresh };
}