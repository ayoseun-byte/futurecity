import { useEffect } from "react";

interface UseConnectionWatcherProps {
  isAwaitingConnection: boolean;
  setIsAwaitingConnection: (val: boolean) => void;
  isSolanaReady: boolean;
  isEvmReady: boolean;
  onReady: () => void;
}

export const useConnectionWatcher = ({
  isAwaitingConnection,
  setIsAwaitingConnection,
  isSolanaReady,
  isEvmReady,
  onReady,
}: UseConnectionWatcherProps) => {
  useEffect(() => {
    if (isAwaitingConnection) {
      if (isSolanaReady || isEvmReady) {
        setIsAwaitingConnection(false);

        // Optional: Add a tiny delay so the UI catches up
        setTimeout(() => {
          onReady();
        }, 500);
      }
    }
  }, [
    isSolanaReady,
    isEvmReady,
    isAwaitingConnection,
    setIsAwaitingConnection,
    onReady,
  ]);
};
