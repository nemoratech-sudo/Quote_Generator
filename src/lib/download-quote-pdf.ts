import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { platformLabel } from "./outcomes";
import { DEFAULT_TERMS, formatQuoteDate, paymentSplit } from "./quote";
import { tagsLabelList } from "./requirements";
import type { Quote } from "./types";

/** Helvetica (WinAnsi) has no ₹ — use ASCII-safe money for PDF text. */
function pdfMoney(amount: number): string {
  const safe = Number.isFinite(amount) ? Math.max(0, Math.round(amount)) : 0;
  return `Rs. ${safe.toLocaleString("en-IN")}`;
}

/** Strip characters pdf-lib WinAnsi fonts cannot encode. */
function pdfSafe(text: string): string {
  return text
    .replace(/₹/g, "Rs. ")
    .replace(/[^\x20-\x7E\n\r\t]/g, "?");
}

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 48;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

const FOREST = rgb(0.106, 0.263, 0.196);
const CHARCOAL = rgb(0.122, 0.161, 0.2);
const MUTED = rgb(0.4, 0.45, 0.5);
const LINE = rgb(0.85, 0.88, 0.9);
const WHITE = rgb(1, 1, 1);

/** Safe download name: ClientName_QuoteId.pdf */
export function quotePdfFilename(quote: Quote): string {
  const client =
    quote.clientName
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "") || "Client";
  const id = quote.id.replace(/[^\w.-]/g, "_");
  return `${client}_${id}.pdf`;
}

function triggerBlobDownload(bytes: Uint8Array, filename: string) {
  const blob = new Blob([bytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [""];
  const lines: string[] = [];
  let current = words[0];
  for (let i = 1; i < words.length; i++) {
    const next = `${current} ${words[i]}`;
    if (font.widthOfTextAtSize(next, size) <= maxWidth) {
      current = next;
    } else {
      lines.push(current);
      current = words[i];
    }
  }
  lines.push(current);
  return lines;
}

type DrawCtx = {
  pdf: PDFDocument;
  page: PDFPage;
  font: PDFFont;
  fontBold: PDFFont;
  y: number;
};

function ensureSpace(ctx: DrawCtx, needed: number) {
  if (ctx.y - needed >= MARGIN) return;
  ctx.page = ctx.pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  ctx.y = PAGE_HEIGHT - MARGIN;
}

function drawText(
  ctx: DrawCtx,
  text: string,
  opts: {
    size?: number;
    bold?: boolean;
    color?: ReturnType<typeof rgb>;
    x?: number;
    maxWidth?: number;
    lineHeight?: number;
  } = {},
) {
  const size = opts.size ?? 11;
  const font = opts.bold ? ctx.fontBold : ctx.font;
  const color = opts.color ?? CHARCOAL;
  const x = opts.x ?? MARGIN;
  const maxWidth = opts.maxWidth ?? CONTENT_WIDTH;
  const lineHeight = opts.lineHeight ?? size * 1.35;
  const lines = wrapText(text, font, size, maxWidth);

  for (const line of lines) {
    ensureSpace(ctx, lineHeight);
    ctx.page.drawText(pdfSafe(line), { x, y: ctx.y - size, size, font, color });
    ctx.y -= lineHeight;
  }
}

function drawSpacer(ctx: DrawCtx, amount = 10) {
  ensureSpace(ctx, amount);
  ctx.y -= amount;
}

function drawRule(ctx: DrawCtx) {
  ensureSpace(ctx, 12);
  ctx.page.drawLine({
    start: { x: MARGIN, y: ctx.y },
    end: { x: PAGE_WIDTH - MARGIN, y: ctx.y },
    thickness: 1,
    color: LINE,
  });
  ctx.y -= 14;
}

/**
 * Build PDF from quote data only — no DOM screenshot.
 * This avoids html2canvas crashing on Tailwind v4 `oklab()` colors.
 */
export async function downloadQuotePdf(
  _element: HTMLElement | null,
  quote: Quote,
): Promise<void> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const firstPage = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);

  const ctx: DrawCtx = {
    pdf,
    page: firstPage,
    font,
    fontBold,
    y: PAGE_HEIGHT - MARGIN,
  };

  const split = paymentSplit(quote.totalAmount, quote.advancePercent);

  // Header meta (top-right on first page)
  const metaRight = PAGE_WIDTH - MARGIN;
  const metaYStart = PAGE_HEIGHT - MARGIN - 4;
  firstPage.drawText("QUOTATION", {
    x: metaRight - fontBold.widthOfTextAtSize("QUOTATION", 9),
    y: metaYStart,
    size: 9,
    font: fontBold,
    color: MUTED,
  });
  firstPage.drawText(quote.id, {
    x: metaRight - font.widthOfTextAtSize(quote.id, 10),
    y: metaYStart - 16,
    size: 10,
    font,
    color: MUTED,
  });
  const dateLabel = formatQuoteDate(quote.createdAt);
  firstPage.drawText(dateLabel, {
    x: metaRight - font.widthOfTextAtSize(dateLabel, 10),
    y: metaYStart - 30,
    size: 10,
    font,
    color: MUTED,
  });

  drawText(ctx, "COMPANY", { size: 9, color: MUTED, bold: true });
  drawText(ctx, quote.companyName, {
    size: 26,
    bold: true,
    color: FOREST,
    lineHeight: 32,
    maxWidth: CONTENT_WIDTH - 140,
  });
  drawSpacer(ctx, 4);
  drawRule(ctx);

  drawText(ctx, quote.title, { size: 15, bold: true, lineHeight: 20 });
  drawText(ctx, `${quote.packageName} package`, {
    size: 11,
    color: FOREST,
    bold: true,
  });
  if (quote.productType) {
    drawText(ctx, platformLabel(quote.productType), { size: 10, color: MUTED });
  }
  if (quote.revision > 1) {
    drawText(ctx, `Revision ${quote.revision}`, { size: 10, color: MUTED });
  }

  if (quote.briefNotes || quote.requirementTags.length > 0) {
    drawSpacer(ctx, 8);
    drawText(ctx, "CLIENT BRIEF", { size: 9, bold: true, color: MUTED });
    if (quote.briefNotes) {
      drawText(ctx, quote.briefNotes, { size: 10, lineHeight: 14 });
    }
    if (quote.requirementTags.length > 0) {
      drawText(ctx, tagsLabelList(quote.requirementTags), {
        size: 9,
        color: FOREST,
      });
    }
  }

  drawSpacer(ctx, 12);
  drawText(ctx, "PREPARED FOR", { size: 9, bold: true, color: MUTED });
  drawText(ctx, quote.clientName || "Valued client", { size: 13, bold: true });
  if (quote.mobile) {
    drawText(ctx, `Mobile: ${quote.mobile}`, { size: 10, color: MUTED });
  }
  if (quote.city) {
    drawText(ctx, `City: ${quote.city}`, { size: 10, color: MUTED });
  }
  if (quote.service) {
    drawText(ctx, `Service: ${quote.service}`, { size: 10, color: MUTED });
  }

  drawSpacer(ctx, 14);
  drawText(ctx, "SCOPE & RATES", { size: 9, bold: true, color: MUTED });
  drawSpacer(ctx, 4);

  for (const item of quote.lineItems) {
    const amount = pdfMoney(item.amount);
    const amountWidth = fontBold.widthOfTextAtSize(amount, 10);
    const descMax = CONTENT_WIDTH - amountWidth - 16;
    const descLines = wrapText(pdfSafe(item.description || "-"), font, 10, descMax);
    const rowHeight = Math.max(16, descLines.length * 13);

    ensureSpace(ctx, rowHeight + 8);
    descLines.forEach((line, index) => {
      ctx.page.drawText(line, {
        x: MARGIN,
        y: ctx.y - 11 - index * 13,
        size: 10,
        font,
        color: CHARCOAL,
      });
    });
    ctx.page.drawText(amount, {
      x: PAGE_WIDTH - MARGIN - amountWidth,
      y: ctx.y - 11,
      size: 10,
      font: fontBold,
      color: CHARCOAL,
    });
    ctx.y -= rowHeight;
    ctx.page.drawLine({
      start: { x: MARGIN, y: ctx.y + 2 },
      end: { x: PAGE_WIDTH - MARGIN, y: ctx.y + 2 },
      thickness: 0.5,
      color: LINE,
    });
    ctx.y -= 6;
  }

  drawSpacer(ctx, 10);
  const boxH = quote.gstEnabled || quote.gstAmount > 0 ? 88 : 64;
  ensureSpace(ctx, boxH + 16);
  ctx.page.drawRectangle({
    x: MARGIN,
    y: ctx.y - boxH,
    width: CONTENT_WIDTH,
    height: boxH,
    color: FOREST,
  });
  ctx.page.drawText("TOTAL", {
    x: MARGIN + 16,
    y: ctx.y - 22,
    size: 9,
    font: fontBold,
    color: WHITE,
  });
  ctx.page.drawText(pdfMoney(quote.totalAmount), {
    x: MARGIN + 16,
    y: ctx.y - 46,
    size: 22,
    font: fontBold,
    color: WHITE,
  });
  ctx.page.drawText(pdfSafe(`${quote.packageName} package`), {
    x: MARGIN + 16,
    y: ctx.y - 64,
    size: 10,
    font,
    color: WHITE,
  });
  if (quote.gstEnabled || quote.gstAmount > 0) {
    ctx.page.drawText(
      pdfSafe(
        `Subtotal ${pdfMoney(quote.subtotalAmount)}  |  GST (${quote.gstPercent}%) ${pdfMoney(quote.gstAmount)}`,
      ),
      {
        x: MARGIN + 16,
        y: ctx.y - 80,
        size: 8,
        font,
        color: WHITE,
      },
    );
  }
  ctx.y -= boxH + 16;

  drawText(ctx, "PAYMENT TERMS", { size: 9, bold: true, color: MUTED });
  drawText(ctx, quote.paymentTerms || "40% advance / 60% on delivery", { size: 10 });
  drawText(
    ctx,
    `Advance (${quote.advancePercent}%): ${pdfMoney(split.advance)}  |  On delivery: ${pdfMoney(split.onDelivery)}`,
    { size: 10, color: MUTED },
  );
  drawText(ctx, `Valid until ${formatQuoteDate(quote.validityEndsAt)}`, {
    size: 10,
    color: MUTED,
  });

  drawSpacer(ctx, 12);
  drawText(ctx, "TERMS", { size: 9, bold: true, color: MUTED });
  DEFAULT_TERMS.forEach((term, index) => {
    drawText(ctx, `${index + 1}. ${term}`, {
      size: 9,
      lineHeight: 12,
      color: MUTED,
    });
    drawSpacer(ctx, 4);
  });

  const pdfBytes = await pdf.save();
  triggerBlobDownload(pdfBytes, quotePdfFilename(quote));
}
