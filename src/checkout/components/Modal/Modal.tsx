import React from "react";
import * as Dialog from "@radix-ui/react-dialog";

interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  showCloseButton?: boolean;
  className?: string;
}

export const Modal: React.FC<ModalProps> = ({
  children,
  open,
  onOpenChange,
}) => {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        {children}
        {/* <Dialog.Overlay className={styles.overlay} /> */}
        {/* <Dialog.Content className={`${styles.content} ${className}`}>
          {showCloseButton && (
            <Dialog.Close className={styles.closeButton}>
              <CloseIcon />
            </Dialog.Close>
          )}
          {children}
        </Dialog.Content> */}
      </Dialog.Portal>
    </Dialog.Root>
  );
};
