import React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { InfoIcon } from "lucide-react";
import styles from "./Tooltip.module.css";

interface TooltipProps {
    text: React.ReactNode;
}

export const Tooltip: React.FC<TooltipProps> = ({ text }) => {
    return (
        <TooltipPrimitive.Provider delayDuration={200}>
            <TooltipPrimitive.Root>
                <TooltipPrimitive.Trigger asChild>
                    <button className={styles.triggerButton} type="button">
                        <InfoIcon size={12} color="#AAADB5" className={styles.infoBtn} />
                    </button>
                </TooltipPrimitive.Trigger>
                <TooltipPrimitive.Portal>
                    <TooltipPrimitive.Content
                        className={styles.tooltipContent}
                        sideOffset={5}
                        side="top"
                        align="center"
                    >
                        {text}
                        <TooltipPrimitive.Arrow className={styles.tooltipArrow} />
                    </TooltipPrimitive.Content>
                </TooltipPrimitive.Portal>
            </TooltipPrimitive.Root>
        </TooltipPrimitive.Provider>
    );
};
