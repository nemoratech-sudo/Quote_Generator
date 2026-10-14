import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFPage,
  type RGB,
} from "pdf-lib";
import { platformLabel } from "./outcomes";
import { formatQuoteDate, paymentSplit, resolveQuoteTerms } from "./quote";
import { tagsLabelList } from "./requirements";
import type { Quote } from "./types";

/** Helvetica/Times WinAnsi has no ₹ — use ASCII-safe money for PDF text. */
function pdfMoney(amount: number): string {
  const safe = Number.isFinite(amount) ? Math.max(0, Math.round(amount)) : 0;
  return `Rs. ${safe.toLocaleString("en-IN")}`;
}

/** Strip characters pdf-lib WinAnsi fonts cannot encode. */
function pdfSafe(text: string): string {
  return text
    .replace(/₹/g, "Rs. ")
    .replace(/[—–]/g, "-")
    .replace(/[•]/g, "-")
    .replace(/[^\x20-\x7E\n\r\t]/g, "?");
}

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 44;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const HEADER_HEIGHT = 92;

const FOREST = rgb(0.106, 0.263, 0.196);
const FOREST_SOFT = rgb(0.45, 0.54, 0.44);
const SAGE_BAND = rgb(0.882, 0.91, 0.863);
const CREAM = rgb(0.976, 0.973, 0.953);
const CHARCOAL = rgb(0.122, 0.161, 0.2);
const MUTED = rgb(0.42, 0.46, 0.5);
const LINE = rgb(0.86, 0.88, 0.9);
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
  const words = pdfSafe(text).split(/\s+/).filter(Boolean);
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
  sans: PDFFont;
  sansBold: PDFFont;
  serif: PDFFont;
  serifBold: PDFFont;
  y: number;
  isFirstPage: boolean;
};

function newPage(ctx: DrawCtx) {
  ctx.page = ctx.pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  ctx.y = PAGE_HEIGHT - MARGIN;
  ctx.isFirstPage = false;
}

function ensureSpace(ctx: DrawCtx, needed: number) {
  if (ctx.y - needed >= MARGIN + 28) return;
  newPage(ctx);
}

function drawLabelRule(
  ctx: DrawCtx,
  label: string,
  opts?: { color?: RGB },
) {
  const color = opts?.color ?? MUTED;
  ensureSpace(ctx, 22);
  const size = 8;
  const text = pdfSafe(label.toUpperCase());
  ctx.page.drawText(text, {
    x: MARGIN,
    y: ctx.y - size,
    size,
    font: ctx.sansBold,
    color,
  });
  const textW = ctx.sansBold.widthOfTextAtSize(text, size);
  const ruleY = ctx.y - size / 2 - 1;
  ctx.page.drawLine({
    start: { x: MARGIN + textW + 10, y: ruleY },
    end: { x: PAGE_WIDTH - MARGIN, y: ruleY },
    thickness: 0.7,
    color: LINE,
  });
  ctx.y -= 18;
}

function drawHeaderBand(page: PDFPage, quote: Quote, fonts: DrawCtx) {
  // Sage -> cream approximation: two overlapping rects
  page.drawRectangle({
    x: 0,
    y: PAGE_HEIGHT - HEADER_HEIGHT,
    width: PAGE_WIDTH,
    height: HEADER_HEIGHT,
    color: CREAM,
  });
  page.drawRectangle({
    x: 0,
    y: PAGE_HEIGHT - HEADER_HEIGHT,
    width: PAGE_WIDTH * 0.55,
    height: HEADER_HEIGHT,
    color: SAGE_BAND,
  });
  // Soft blend strip
  page.drawRectangle({
    x: PAGE_WIDTH * 0.45,
    y: PAGE_HEIGHT - HEADER_HEIGHT,
    width: PAGE_WIDTH * 0.2,
    height: HEADER_HEIGHT,
    color: rgb(0.93, 0.94, 0.91),
  });
  page.drawLine({
    start: { x: 0, y: PAGE_HEIGHT - HEADER_HEIGHT },
    end: { x: PAGE_WIDTH, y: PAGE_HEIGHT - HEADER_HEIGHT },
    thickness: 1,
    color: rgb(0.78, 0.84, 0.78),
  });

  const top = PAGE_HEIGHT - 28;
  page.drawText("COMPANY", {
    x: MARGIN,
    y: top,
    size: 8,
    font: fonts.sansBold,
    color: FOREST,
  });
  page.drawLine({
    start: { x: MARGIN, y: top - 6 },
    end: { x: MARGIN + 52, y: top - 6 },
    thickness: 1.2,
    color: FOREST,
  });
  page.drawText(pdfSafe(quote.companyName), {
    x: MARGIN,
    y: top - 36,
    size: 28,
    font: fonts.serifBold,
    color: FOREST,
  });

  const right = PAGE_WIDTH - MARGIN;
  const qLabel = "QUOTATION";
  page.drawText(qLabel, {
    x: right - fonts.sansBold.widthOfTextAtSize(qLabel, 8),
    y: top,
    size: 8,
    font: fonts.sansBold,
    color: MUTED,
  });
  const id = pdfSafe(quote.id);
  page.drawText(id, {
    x: right - fonts.sans.widthOfTextAtSize(id, 11),
    y: top - 18,
    size: 11,
    font: fonts.sans,
    color: CHARCOAL,
  });
  const dateLabel = pdfSafe(formatQuoteDate(quote.createdAt));
  page.drawText(dateLabel, {
    x: right - fonts.sans.widthOfTextAtSize(dateLabel, 9),
    y: top - 34,
    size: 9,
    font: fonts.sans,
    color: MUTED,
  });
}

function drawPackageBadge(ctx: DrawCtx, label: string, x: number, baselineY: number) {
  const text = pdfSafe(label);
  const size = 8;
  const padX = 8;
  const padY = 4;
  const tw = ctx.sansBold.widthOfTextAtSize(text, size);
  const boxW = tw + padX * 2;
  const boxH = size + padY * 2;
  ctx.page.drawRectangle({
    x,
    y: baselineY - padY,
    width: boxW,
    height: boxH,
    color: FOREST_SOFT,
    borderColor: FOREST_SOFT,
    borderWidth: 0,
  });
  // rounded look approximation via slight inset not available — solid pill via rect is fine
  ctx.page.drawText(text, {
    x: x + padX,
    y: baselineY,
    size,
    font: ctx.sansBold,
    color: WHITE,
  });
  return boxW;
}

/**
 * Option A Pro layout — sage header, serif brand, itemized rates, green TOTAL card.
 */
export async function downloadQuotePdf(
  _element: HTMLElement | null,
  quote: Quote,
): Promise<void> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`${quote.companyName} ${quote.id}`);
  pdf.setAuthor(quote.companyName);

  const sans = await pdf.embedFont(StandardFonts.Helvetica);
  const sansBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const serif = await pdf.embedFont(StandardFonts.TimesRoman);
  const serifBold = await pdf.embedFont(StandardFonts.TimesRomanBold);

  const firstPage = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const ctx: DrawCtx = {
    pdf,
    page: firstPage,
    sans,
    sansBold,
    serif,
    serifBold,
    y: PAGE_HEIGHT - HEADER_HEIGHT - 28,
    isFirstPage: true,
  };

  drawHeaderBand(firstPage, quote, ctx);

  const split = paymentSplit(quote.totalAmount, quote.advancePercent);

  // Title + badge
  const title = pdfSafe(quote.title);
  const titleSize = 16;
  const titleLines = wrapText(title, serifBold, titleSize, CONTENT_WIDTH - 100);
  const titleBlockH = titleLines.length * 22;
  ensureSpace(ctx, titleBlockH + 28);
  titleLines.forEach((line, i) => {
    ctx.page.drawText(line, {
      x: MARGIN,
      y: ctx.y - titleSize - i * 20,
      size: titleSize,
      font: serifBold,
      color: CHARCOAL,
    });
  });
  const badgeX =
    MARGIN +
    serifBold.widthOfTextAtSize(titleLines[0] ?? "", titleSize) +
    12;
  if (titleLines.length === 1 && badgeX + 80 < PAGE_WIDTH - MARGIN) {
    drawPackageBadge(ctx, quote.packageName, badgeX, ctx.y - titleSize);
  } else {
    drawPackageBadge(
      ctx,
      quote.packageName,
      MARGIN,
      ctx.y - titleSize - titleLines.length * 20 - 4,
    );
    ctx.y -= 18;
  }
  ctx.y -= titleBlockH + 8;

  if (quote.productType) {
    ctx.page.drawText(pdfSafe(platformLabel(quote.productType)), {
      x: MARGIN,
      y: ctx.y - 9,
      size: 9,
      font: sans,
      color: MUTED,
    });
    ctx.y -= 16;
  }
  if (quote.revision > 1) {
    ctx.page.drawText(`Revision ${quote.revision}`, {
      x: MARGIN,
      y: ctx.y - 9,
      size: 9,
      font: sansBold,
      color: MUTED,
    });
    ctx.y -= 16;
  }

  // Prepared for
  drawSpacer(ctx, 6);
  drawLabelRule(ctx, "Prepared for");
  ctx.page.drawText(pdfSafe(quote.clientName || "Valued client"), {
    x: MARGIN,
    y: ctx.y - 13,
    size: 13,
    font: serifBold,
    color: CHARCOAL,
  });
  ctx.y -= 20;
  const detailLines = [
    quote.mobile ? `Mobile: ${quote.mobile}` : null,
    quote.city ? `City: ${quote.city}` : null,
    quote.service ? `Service: ${quote.service}` : null,
  ].filter(Boolean) as string[];
  for (const line of detailLines) {
    ctx.page.drawText(pdfSafe(line), {
      x: MARGIN,
      y: ctx.y - 10,
      size: 10,
      font: sans,
      color: MUTED,
    });
    ctx.y -= 14;
  }

  if (quote.briefNotes || quote.requirementTags.length > 0) {
    drawSpacer(ctx, 8);
    drawLabelRule(ctx, "Client brief");
    if (quote.briefNotes) {
      const lines = wrapText(quote.briefNotes, sans, 10, CONTENT_WIDTH);
      for (const line of lines) {
        ensureSpace(ctx, 14);
        ctx.page.drawText(line, {
          x: MARGIN,
          y: ctx.y - 10,
          size: 10,
          font: sans,
          color: CHARCOAL,
        });
        ctx.y -= 13;
      }
    }
    if (quote.requirementTags.length > 0) {
      const tags = wrapText(tagsLabelList(quote.requirementTags), sans, 9, CONTENT_WIDTH);
      for (const line of tags) {
        ensureSpace(ctx, 12);
        ctx.page.drawText(line, {
          x: MARGIN,
          y: ctx.y - 9,
          size: 9,
          font: sans,
          color: FOREST,
        });
        ctx.y -= 12;
      }
    }
  }

  // Scope & rates
  drawSpacer(ctx, 14);
  ensureSpace(ctx, 24);
  ctx.page.drawText("SCOPE", {
    x: MARGIN,
    y: ctx.y - 8,
    size: 8,
    font: sansBold,
    color: MUTED,
  });
  const rateHeader = "RATE (Rs.)";
  ctx.page.drawText(rateHeader, {
    x: PAGE_WIDTH - MARGIN - sansBold.widthOfTextAtSize(rateHeader, 8),
    y: ctx.y - 8,
    size: 8,
    font: sansBold,
    color: MUTED,
  });
  ctx.y -= 14;
  ctx.page.drawLine({
    start: { x: MARGIN, y: ctx.y },
    end: { x: PAGE_WIDTH - MARGIN, y: ctx.y },
    thickness: 0.8,
    color: LINE,
  });
  ctx.y -= 10;

  for (const item of quote.lineItems) {
    const amount = pdfMoney(item.amount);
    const amountWidth = serif.widthOfTextAtSize(amount, 11);
    const descMax = CONTENT_WIDTH - amountWidth - 20;
    const descLines = wrapText(item.description || "-", sans, 10, descMax);
    const rowH = Math.max(18, descLines.length * 13 + 6);
    ensureSpace(ctx, rowH + 6);

    descLines.forEach((line, index) => {
      ctx.page.drawText(line, {
        x: MARGIN,
        y: ctx.y - 10 - index * 13,
        size: 10,
        font: sans,
        color: CHARCOAL,
      });
    });
    ctx.page.drawText(amount, {
      x: PAGE_WIDTH - MARGIN - amountWidth,
      y: ctx.y - 11,
      size: 11,
      font: serif,
      color: CHARCOAL,
    });
    ctx.y -= rowH;
    ctx.page.drawLine({
      start: { x: MARGIN, y: ctx.y + 2 },
      end: { x: PAGE_WIDTH - MARGIN, y: ctx.y + 2 },
      thickness: 0.5,
      color: LINE,
    });
    ctx.y -= 4;
  }

  // Bottom: payment terms (left) + total card (right)
  drawSpacer(ctx, 18);
  const cardW = 200;
  const showGst = quote.gstEnabled || quote.gstAmount > 0;
  const cardH = showGst ? 92 : 78;
  ensureSpace(ctx, Math.max(cardH, 110) + 20);

  const sectionTop = ctx.y;
  const leftW = CONTENT_WIDTH - cardW - 24;

  // Payment terms column
  ctx.page.drawText("PAYMENT TERMS", {
    x: MARGIN,
    y: sectionTop - 8,
    size: 8,
    font: sansBold,
    color: MUTED,
  });
  let termsY = sectionTop - 24;
  const payLines = [
    quote.paymentTerms || "40% advance / 60% on delivery",
    `Advance (${quote.advancePercent}%): ${pdfMoney(split.advance)}`,
    `On delivery (${quote.deliveryPercent}%): ${pdfMoney(split.onDelivery)}`,
    `Valid until ${formatQuoteDate(quote.validityEndsAt)}`,
  ];
  for (const line of payLines) {
    const wrapped = wrapText(line, sans, 9, leftW);
    for (const w of wrapped) {
      ctx.page.drawText(w, {
        x: MARGIN,
        y: termsY,
        size: 9,
        font: sans,
        color: CHARCOAL,
      });
      termsY -= 12;
    }
    termsY -= 4;
  }

  // TOTAL card — bottom right of this section
  const cardX = PAGE_WIDTH - MARGIN - cardW;
  const cardBottom = sectionTop - cardH;
  ctx.page.drawRectangle({
    x: cardX,
    y: cardBottom,
    width: cardW,
    height: cardH,
    color: FOREST,
  });
  ctx.page.drawText("TOTAL", {
    x: cardX + 16,
    y: sectionTop - 20,
    size: 8,
    font: sansBold,
    color: WHITE,
  });
  const totalText = pdfMoney(quote.totalAmount);
  ctx.page.drawText(totalText, {
    x: cardX + 16,
    y: sectionTop - 46,
    size: 22,
    font: serifBold,
    color: WHITE,
  });
  ctx.page.drawLine({
    start: { x: cardX + 16, y: sectionTop - 54 },
    end: { x: cardX + cardW - 16, y: sectionTop - 54 },
    thickness: 0.6,
    color: rgb(0.75, 0.85, 0.78),
  });
  ctx.page.drawText(pdfSafe(`${quote.packageName} package`), {
    x: cardX + 16,
    y: sectionTop - 68,
    size: 9,
    font: sans,
    color: WHITE,
  });
  if (showGst) {
    ctx.page.drawText(
      pdfSafe(
        `Subtotal ${pdfMoney(quote.subtotalAmount)} | GST ${pdfMoney(quote.gstAmount)}`,
      ),
      {
        x: cardX + 16,
        y: sectionTop - 82,
        size: 7,
        font: sans,
        color: WHITE,
      },
    );
  }

  ctx.y = Math.min(termsY, cardBottom) - 16;

  // Terms — common + niche + package
  const terms = resolveQuoteTerms({
    nicheId: quote.nicheId,
    packageId: quote.packageId,
    service: quote.service,
  });
  drawLabelRule(ctx, "Terms");
  terms.forEach((term, index) => {
    const lines = wrapText(`${index + 1}. ${term}`, sans, 8, CONTENT_WIDTH);
    for (const line of lines) {
      ensureSpace(ctx, 12);
      ctx.page.drawText(line, {
        x: MARGIN,
        y: ctx.y - 8,
        size: 8,
        font: sans,
        color: MUTED,
      });
      ctx.y -= 11;
    }
    ctx.y -= 3;
  });

  // Footer on all pages
  const pageCount = pdf.getPageCount();
  for (let i = 0; i < pageCount; i++) {
    const page = pdf.getPage(i);
    const footer = pdfSafe(`Nemora  |  ${quote.id}`);
    page.drawLine({
      start: { x: MARGIN, y: 28 },
      end: { x: PAGE_WIDTH - MARGIN, y: 28 },
      thickness: 0.5,
      color: LINE,
    });
    page.drawText(footer, {
      x: MARGIN,
      y: 16,
      size: 8,
      font: sans,
      color: MUTED,
    });
    const pageLabel = `${i + 1} / ${pageCount}`;
    page.drawText(pageLabel, {
      x: PAGE_WIDTH - MARGIN - sans.widthOfTextAtSize(pageLabel, 8),
      y: 16,
      size: 8,
      font: sans,
      color: MUTED,
    });
  }

  const pdfBytes = await pdf.save();
  triggerBlobDownload(pdfBytes, quotePdfFilename(quote));
}

function drawSpacer(ctx: DrawCtx, amount: number) {
  ensureSpace(ctx, amount);
  ctx.y -= amount;
}
