import type { Quote } from "./types";

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

/**
 * Capture the quote sheet and download a PDF (no print dialog).
 * Element should get `data-exporting="true"` so print-only layout is visible.
 */
export async function downloadQuotePdf(
  element: HTMLElement,
  quote: Quote,
): Promise<void> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);

  // Let the browser apply exporting styles before capture
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: "#ffffff",
    logging: false,
    scrollX: 0,
    scrollY: 0,
  });

  const imgData = canvas.toDataURL("image/png");
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 8;
  const contentWidth = pageWidth - margin * 2;
  const imgHeight = (canvas.height * contentWidth) / canvas.width;

  let heightLeft = imgHeight;
  let position = margin;

  pdf.addImage(imgData, "PNG", margin, position, contentWidth, imgHeight);
  heightLeft -= pageHeight - margin * 2;

  while (heightLeft > 0) {
    position = margin - (imgHeight - heightLeft);
    pdf.addPage();
    pdf.addImage(imgData, "PNG", margin, position, contentWidth, imgHeight);
    heightLeft -= pageHeight - margin * 2;
  }

  pdf.save(quotePdfFilename(quote));
}
