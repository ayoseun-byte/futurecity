import { jsPDF } from "jspdf";
import { clipAmount } from "@/utils";

export interface ReceiptData {
    amount: string;
    network: string;
    tokenSymbol?: string;
    txHash?: string;
    fromAddress?: string;
    toAddress?: string;
    explorerUrl?: string;
}

// ── Colors ───────────────────────────────────────────────────────────────────

const COLORS = {
    primary: "#0F172A",     // Slate 900
    secondary: "#64748B",   // Slate 500
    border: "#E2E8F0",      // Slate 200
    rowBg: "#F8FAFC",       // Slate 50
    white: "#FFFFFF",
    green: "#10B981",       // Emerald 500
    greenBg: "#D1FAE5",     // Emerald 100
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function toRgb(hex: string): [number, number, number] {
    return [
        parseInt(hex.slice(1, 3), 16),
        parseInt(hex.slice(3, 5), 16),
        parseInt(hex.slice(5, 7), 16),
    ];
}

function fill(doc: jsPDF, color: string) { doc.setFillColor(...toRgb(color)); }
function draw(doc: jsPDF, color: string) { doc.setDrawColor(...toRgb(color)); }
function text(doc: jsPDF, color: string) { doc.setTextColor(...toRgb(color)); }

function rrect(
    doc: jsPDF,
    x: number, y: number, w: number, h: number,
    r = 8,
    style: "F" | "S" | "FD" = "FD",
) {
    doc.roundedRect(x, y, w, h, r, r, style);
}

// ── Main export ───────────────────────────────────────────────────────────────

export function generateReceiptPdf(data: ReceiptData): void {
    const {
        amount,
        network,
        tokenSymbol = "USDC",
        txHash,
        fromAddress,
        toAddress,
    } = data;

    const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });

    const PAGE_W = 595.28;   // A4 pt
    const CARD_W = 410;
    const CARD_X = (PAGE_W - CARD_W) / 2;
    const CARD_PAD = 32;
    const COL_L = CARD_X + CARD_PAD;
    const boxW = CARD_W - CARD_PAD * 2;
    const COL_R = COL_L + boxW;

    const now = new Date();
    const formattedDate = `${now.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    })} ${now.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
    })}`;

    const rows = [
        { label: "Amount Paid", value: `${clipAmount(amount)} ${tokenSymbol}`, isAddress: false },
        { label: "Network", value: network, isAddress: false },
        { label: "Date & Time", value: formattedDate, isAddress: false },
        ...(fromAddress ? [{ label: "From", value: fromAddress, isAddress: true }] : []),
        ...(toAddress ? [{ label: "To", value: toAddress, isAddress: true }] : []),
    ];

    // ── Pre-calculate heights & spacing ────────────────────────────────────────

    // Header dimensions
    const CIRCLE_R = 26;
    const GAP_CIRCLE_TITLE = 24;
    const GAP_TITLE_SUBTITLE = 20;
    const GAP_SUBTITLE_AMOUNT = 30;
    const GAP_AMOUNT_TABLE = 32;

    const HEADER_SPAN =
        CIRCLE_R * 2 +
        GAP_CIRCLE_TITLE +
        GAP_TITLE_SUBTITLE +
        GAP_SUBTITLE_AMOUNT +
        GAP_AMOUNT_TABLE;

    // Details table row heights
    const maxValW = boxW - 90;
    const measuredRows = rows.map((r) => {
        doc.setFontSize(r.isAddress ? 8.5 : 9.5);
        doc.setFont("helvetica", "bold");
        const lines = doc.splitTextToSize(r.value, maxValW) as string[];
        const rowH = lines.length > 1 ? 38 : 32;
        return { ...r, lines, rowH };
    });
    const DETAILS_H = measuredRows.reduce((sum, r) => sum + r.rowH, 0);

    // Transaction hash box height
    let TXHASH_H = 0;
    let hashLines: string[] = [];
    if (txHash) {
        doc.setFontSize(8.5);
        doc.setFont("helvetica", "bold");
        hashLines = doc.splitTextToSize(txHash, boxW - 24) as string[];
        TXHASH_H = hashLines.length > 1 ? 52 : 46;
    }

    const GAP_DETAILS_HASH = 14;

    // Exact card height with balanced padding
    const CARD_H =
        CARD_PAD +
        HEADER_SPAN +
        DETAILS_H +
        (txHash ? GAP_DETAILS_HASH + TXHASH_H : 0) +
        CARD_PAD;

    const CARD_TOP_MARGIN = 48;
    const cardY = CARD_TOP_MARGIN;

    // ── 1. Card Shell ──────────────────────────────────────────────────────────

    fill(doc, COLORS.white);
    draw(doc, COLORS.border);
    doc.setLineWidth(1);
    rrect(doc, CARD_X, cardY, CARD_W, CARD_H, 16, "FD");

    // ── 2. Checkmark Circle ───────────────────────────────────────────────────

    const cx = PAGE_W / 2;
    const cy = cardY + CARD_PAD + CIRCLE_R;

    // Outer soft halo
    fill(doc, COLORS.greenBg);
    draw(doc, COLORS.greenBg);
    doc.circle(cx, cy, CIRCLE_R, "FD");

    // Inner vibrant circle
    fill(doc, COLORS.green);
    draw(doc, COLORS.green);
    doc.circle(cx, cy, CIRCLE_R * 0.68, "FD");

    // Checkmark icon with rounded caps
    draw(doc, COLORS.white);
    doc.setLineWidth(2.4);
    doc.setLineCap("round");
    doc.setLineJoin("round");
    doc.line(cx - 7, cy, cx - 2, cy + 5);
    doc.line(cx - 2, cy + 5, cx + 8, cy - 5.5);

    // ── 3. Header Texts ───────────────────────────────────────────────────────

    let y = cy + CIRCLE_R + GAP_CIRCLE_TITLE;
    text(doc, COLORS.primary);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("Payment Successful", cx, y, { align: "center" });

    y += GAP_TITLE_SUBTITLE;
    text(doc, COLORS.secondary);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Thank you for your purchase!", cx, y, { align: "center" });

    y += GAP_SUBTITLE_AMOUNT;
    text(doc, COLORS.primary);
    doc.setFontSize(26);
    doc.setFont("helvetica", "bold");
    doc.text(`${clipAmount(amount)} ${tokenSymbol}`, cx, y, { align: "center" });

    // ── 4. Details Table ──────────────────────────────────────────────────────

    y += GAP_AMOUNT_TABLE;
    const tableStartY = y;

    // Table container
    fill(doc, COLORS.white);
    draw(doc, COLORS.border);
    doc.setLineWidth(0.8);
    rrect(doc, COL_L, tableStartY, boxW, DETAILS_H, 8, "FD");

    let rowY = tableStartY;
    measuredRows.forEach((row, i) => {
        // Alternating fill for middle rows
        if (i % 2 === 1) {
            fill(doc, COLORS.rowBg);
            doc.rect(COL_L + 0.5, rowY, boxW - 1, row.rowH, "F");
        }

        const midY = rowY + row.rowH / 2;

        // Label
        text(doc, COLORS.secondary);
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.text(row.label, COL_L + 12, midY + 3);

        // Value
        text(doc, COLORS.primary);
        doc.setFontSize(row.isAddress ? 8.5 : 9.5);
        doc.setFont("helvetica", "bold");

        if (row.lines.length === 1) {
            doc.text(row.lines[0], COL_R - 12, midY + 3, { align: "right" });
        } else {
            const lineH = 11;
            const blockH = row.lines.length * lineH;
            const startY = midY - blockH / 2 + lineH - 1;
            doc.text(row.lines, COL_R - 12, startY, { align: "right" });
        }

        // Inner row dividers (avoiding outer border overlap)
        if (i < measuredRows.length - 1) {
            draw(doc, COLORS.border);
            doc.setLineWidth(0.5);
            doc.line(COL_L, rowY + row.rowH, COL_R, rowY + row.rowH);
        }

        rowY += row.rowH;
    });

    // ── 5. Transaction Hash Box ───────────────────────────────────────────────

    if (txHash) {
        y = tableStartY + DETAILS_H + GAP_DETAILS_HASH;

        fill(doc, COLORS.rowBg);
        draw(doc, COLORS.border);
        doc.setLineWidth(0.8);
        rrect(doc, COL_L, y, boxW, TXHASH_H, 8, "FD");

        text(doc, COLORS.secondary);
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.text("TRANSACTION HASH", COL_L + 12, y + 15);

        text(doc, COLORS.primary);
        doc.setFontSize(8.5);
        doc.setFont("helvetica", "bold");
        doc.text(hashLines, COL_L + 12, y + 29);
    }

    doc.save(`receipt-${Date.now()}.pdf`);
}