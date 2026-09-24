import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { CommercialQuote3D, CompanyQuoteSettings } from "../types";

export const DEFAULT_COMPANY_SETTINGS: CompanyQuoteSettings = {
  companyName: "JUEM",
  tradeName: "JUEM 3D Studio & Fabricación Digital",
  phone: "+598 99 234 567",
  whatsapp: "+598 99 234 567",
  email: "contacto@juem.com.uy",
  website: "juem.com.uy",
  address: "Montevideo / Canelones, Uruguay",
  logoUrl: "",
  defaultValidityDays: 15,
  defaultConditions: `• La cotización tiene una validez de 15 días a partir de su emisión.
• El plazo de fabricación se confirmará al aprobar el pedido y verificar disponibilidad de máquinas.
• Los tiempos pueden variar según la cantidad de piezas y demanda del taller.
• El precio final corresponde estrictamente a las especificaciones y materiales indicados.
• Seña habitual del 50% al confirmar el trabajo y saldo contra entrega.`
};

/**
 * Builds the jsPDF document instance with JUEM's professional identity
 */
export function buildQuotePdfDoc(
  quote: CommercialQuote3D,
  settings: Partial<CompanyQuoteSettings> = {}
): jsPDF {
  const mergedSettings: CompanyQuoteSettings = {
    ...DEFAULT_COMPANY_SETTINGS,
    ...(quote.companySnapshot || {}),
    ...settings
  };

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4" // 210 x 297 mm
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210
  const pageHeight = doc.internal.pageSize.getHeight(); // 297
  const marginX = 14;
  const contentWidth = pageWidth - marginX * 2; // 182mm

  // Colors
  const darkNavy: [number, number, number] = [5, 11, 26]; // #050B1A
  const slateCard: [number, number, number] = [11, 23, 48]; // #0B1730
  const goldAccent: [number, number, number] = [212, 165, 90]; // #D4A55A
  const goldLight: [number, number, number] = [230, 191, 118]; // #E6BF76
  const textDark: [number, number, number] = [26, 32, 44];
  const textMuted: [number, number, number] = [100, 116, 139];
  const bgLightCard: [number, number, number] = [248, 249, 252];

  // -------------------------------------------------------------
  // 1. TOP HEADER DECORATION & BRANDING
  // -------------------------------------------------------------
  // Header background bar (top 32mm)
  doc.setFillColor(...slateCard);
  doc.rect(0, 0, pageWidth, 30, "F");

  // Gold accent strip below header
  doc.setFillColor(...goldAccent);
  doc.rect(0, 30, pageWidth, 1.8, "F");

  // Brand Name
  doc.setTextColor(...goldLight);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text(mergedSettings.companyName || "JUEM", marginX, 14);

  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(244, 234, 215); // soft cream
  doc.text(mergedSettings.tradeName || "Estudio de Impresión 3D & Fabricación Digital", marginX, 20);

  // Brand Contact Details (top right)
  const contactLines = [
    mergedSettings.website ? `Web: ${mergedSettings.website}` : "juem.com.uy",
    mergedSettings.whatsapp ? `WhatsApp: ${mergedSettings.whatsapp}` : "",
    mergedSettings.email ? `Email: ${mergedSettings.email}` : ""
  ].filter(Boolean);

  doc.setFontSize(7.5);
  doc.setTextColor(212, 165, 90);
  let contactY = 11;
  contactLines.forEach((line) => {
    doc.text(line, pageWidth - marginX, contactY, { align: "right" });
    contactY += 4.5;
  });

  // -------------------------------------------------------------
  // 2. QUOTATION TITLE & METADATA BAR
  // -------------------------------------------------------------
  let currentY = 38;

  // Title on Left
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...darkNavy);
  doc.text("COTIZACIÓN DE IMPRESIÓN 3D", marginX, currentY);

  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...textMuted);
  doc.text("Presupuesto comercial con especificaciones de producción", marginX, currentY + 4.5);

  // Quote Number & Dates Box on Right
  const metaBoxX = pageWidth - marginX - 70;
  const metaBoxY = currentY - 5;
  const metaBoxW = 70;
  const metaBoxH = 17;

  doc.setFillColor(...bgLightCard);
  doc.setDrawColor(...goldAccent);
  doc.setLineWidth(0.3);
  doc.roundedRect(metaBoxX, metaBoxY, metaBoxW, metaBoxH, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(...slateCard);
  doc.text(quote.quoteNumber || "COT-2026-0001", metaBoxX + metaBoxW / 2, metaBoxY + 5.5, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...textDark);
  const dateFormatted = quote.createdAt
    ? new Date(quote.createdAt).toLocaleDateString("es-UY", { day: "2-digit", month: "2-digit", year: "numeric" })
    : new Date().toLocaleDateString("es-UY");

  const validUntilDate = quote.validUntil
    ? new Date(quote.validUntil).toLocaleDateString("es-UY", { day: "2-digit", month: "2-digit", year: "numeric" })
    : (() => {
        const d = new Date(quote.createdAt || Date.now());
        d.setDate(d.getDate() + (quote.validityDays || 15));
        return d.toLocaleDateString("es-UY", { day: "2-digit", month: "2-digit", year: "numeric" });
      })();

  doc.text(`Fecha: ${dateFormatted}  •  Vence: ${validUntilDate}`, metaBoxX + metaBoxW / 2, metaBoxY + 10.5, { align: "center" });

  // Status badge inside meta
  const statusLabels: Record<string, string> = {
    borrador: "Borrador",
    enviada: "Enviada",
    aprobada: "Aprobada",
    rechazada: "Rechazada",
    vencida: "Vencida",
    convertida: "Convertida en Pedido"
  };
  const statusStr = statusLabels[quote.status] || "Presupuesto";
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(...goldAccent);
  doc.text(`ESTADO: ${statusStr.toUpperCase()}`, metaBoxX + metaBoxW / 2, metaBoxY + 14.5, { align: "center" });

  currentY += 16;

  // -------------------------------------------------------------
  // 3. CLIENT INFORMATION CARD
  // -------------------------------------------------------------
  const clientCardH = 18;
  doc.setFillColor(...bgLightCard);
  doc.setDrawColor(220, 225, 235);
  doc.setLineWidth(0.3);
  doc.roundedRect(marginX, currentY, contentWidth, clientCardH, 2, 2, "FD");

  // Left decorative gold accent tag
  doc.setFillColor(...goldAccent);
  doc.rect(marginX, currentY, 2.5, clientCardH, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...goldAccent);
  doc.text("DATOS DEL CLIENTE", marginX + 6, currentY + 5);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(...textDark);
  doc.text(quote.customerName || "Cliente Particular", marginX + 6, currentY + 10);

  // Phone and email
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...textMuted);
  const clientInfoParts = [
    quote.customerPhone ? `Tel/WhatsApp: ${quote.customerPhone}` : null,
    quote.customerEmail ? `Email: ${quote.customerEmail}` : null
  ].filter(Boolean);

  doc.text(
    clientInfoParts.length > 0 ? clientInfoParts.join("   •   ") : "Sin datos de contacto especificados",
    marginX + 6,
    currentY + 14.5
  );

  currentY += clientCardH + 5;

  // -------------------------------------------------------------
  // 4. ITEMS TABLE (jspdf-autotable with multi-page handling)
  // -------------------------------------------------------------
  const techOpts = quote.showTechnicalDetails || {
    showMaterial: false,
    showColor: false,
    showWeight: false,
    showPrintTime: false
  };

  // Build table headers and body dynamically
  const tableHeaders: string[] = ["#", "Pieza / Descripción"];
  if (techOpts.showMaterial) tableHeaders.push("Material");
  if (techOpts.showColor) tableHeaders.push("Color");
  if (techOpts.showWeight) tableHeaders.push("Peso");
  if (techOpts.showPrintTime) tableHeaders.push("Tiempo");
  tableHeaders.push("Cant.", "Precio Unit.", "Subtotal");

  const tableRows = (quote.items || []).map((item, idx) => {
    const row: any[] = [
      String(idx + 1),
      item.internalCode ? `${item.pieceName} [${item.internalCode}]` : item.pieceName
    ];

    if (techOpts.showMaterial) row.push(item.material || "PLA+");
    if (techOpts.showColor) row.push(item.color || "Estándar");
    if (techOpts.showWeight) {
      const g = item.weightPerUnitGrams || 0;
      row.push(g > 0 ? `${g}g` : "-");
    }
    if (techOpts.showPrintTime) {
      row.push(item.printTimeFormatted || (item.printTimeHours ? `${item.printTimeHours.toFixed(1)}h` : "-"));
    }

    row.push(
      String(item.quantity || 1),
      `$${Number(item.unitPrice || 0).toLocaleString("es-UY", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`,
      `$${Number(item.subtotalPrice || 0).toLocaleString("es-UY", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
    );

    return row;
  });

  // Calculate dynamic column alignments & styles
  const colStyles: Record<number, any> = {
    0: { cellWidth: 8, halign: "center" },
    1: { halign: "left" }
  };

  // The last 3 columns are Cant., Precio Unit., Subtotal
  const totalCols = tableHeaders.length;
  colStyles[totalCols - 3] = { cellWidth: 15, halign: "center" };
  colStyles[totalCols - 2] = { cellWidth: 26, halign: "right" };
  colStyles[totalCols - 1] = { cellWidth: 28, halign: "right", fontStyle: "bold" };

  autoTable(doc, {
    startY: currentY,
    head: [tableHeaders],
    body: tableRows,
    theme: "grid",
    showHead: "everyPage", // repeats table header when paginating
    pageBreak: "auto", // prevents rows from splitting awkwardly across pages
    margin: { left: marginX, right: marginX, bottom: 25 },
    headStyles: {
      fillColor: slateCard,
      textColor: goldLight,
      fontStyle: "bold",
      fontSize: 8,
      cellPadding: 2.8,
      halign: "left"
    },
    bodyStyles: {
      textColor: textDark,
      fontSize: 8,
      cellPadding: 2.8,
      valign: "middle"
    },
    alternateRowStyles: {
      fillColor: [250, 251, 254]
    },
    tableLineColor: [225, 230, 240],
    tableLineWidth: 0.2,
    columnStyles: colStyles
  });

  // Position after table
  const finalTableY = (doc as any).lastAutoTable?.finalY || currentY + 40;
  let summaryY = finalTableY + 6;

  // If there's not enough room on this page for conditions + totals (approx 55mm), add a page
  if (summaryY + 50 > pageHeight - 20) {
    doc.addPage();
    summaryY = 20;
  }

  // -------------------------------------------------------------
  // 5. COMMERCIAL CONDITIONS & TOTALS BREAKDOWN
  // -------------------------------------------------------------
  const summaryBoxWidth = 72;
  const summaryBoxX = pageWidth - marginX - summaryBoxWidth;
  const conditionsWidth = contentWidth - summaryBoxWidth - 6;

  // Left side: Conditions and Notes
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...goldAccent);
  doc.text("CONDICIONES COMERCIALES Y PLAZOS", marginX, summaryY + 2);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...textDark);

  const defaultCondText =
    quote.conditions ||
    mergedSettings.defaultConditions ||
    DEFAULT_COMPANY_SETTINGS.defaultConditions;

  const splitConditions = doc.splitTextToSize(defaultCondText, conditionsWidth);
  doc.text(splitConditions, marginX, summaryY + 7);

  let notesBottomY = summaryY + 7 + splitConditions.length * 3.4;

  if (quote.notes && quote.notes.trim()) {
    notesBottomY += 3;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...goldAccent);
    doc.text("OBSERVACIONES / DETALLES:", marginX, notesBottomY);

    doc.setFont("helvetica", "italic");
    doc.setFontSize(7.5);
    doc.setTextColor(...textDark);
    const splitNotes = doc.splitTextToSize(quote.notes, conditionsWidth);
    doc.text(splitNotes, marginX, notesBottomY + 4);
    notesBottomY += 4 + splitNotes.length * 3.4;
  }

  // Right side: Totals Card
  const totalsCardH = 34;
  doc.setFillColor(...bgLightCard);
  doc.setDrawColor(...goldAccent);
  doc.setLineWidth(0.3);
  doc.roundedRect(summaryBoxX, summaryY, summaryBoxWidth, totalsCardH, 2, 2, "FD");

  let tLineY = summaryY + 6;
  const tLabelX = summaryBoxX + 5;
  const tValX = summaryBoxX + summaryBoxWidth - 5;

  // Subtotal
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...textMuted);
  doc.text("Subtotal:", tLabelX, tLineY);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...textDark);
  doc.text(
    `$${Number(quote.subtotal || 0).toLocaleString("es-UY", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`,
    tValX,
    tLineY,
    { align: "right" }
  );

  // Descuento (if any)
  if (Number(quote.discountAmount || 0) > 0) {
    tLineY += 5;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(220, 38, 38); // red
    doc.text("Descuento:", tLabelX, tLineY);
    doc.setFont("helvetica", "bold");
    doc.text(
      `-$${Number(quote.discountAmount || 0).toLocaleString("es-UY", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`,
      tValX,
      tLineY,
      { align: "right" }
    );
  }

  // Envío (if any)
  if (Number(quote.shippingCost || 0) > 0) {
    tLineY += 5;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...textMuted);
    doc.text("Costo de Envío:", tLabelX, tLineY);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...textDark);
    doc.text(
      `+$${Number(quote.shippingCost || 0).toLocaleString("es-UY", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`,
      tValX,
      tLineY,
      { align: "right" }
    );
  }

  // Total Final Banner
  const totalBoxY = summaryY + totalsCardH - 12;
  doc.setFillColor(...slateCard);
  doc.roundedRect(summaryBoxX + 1, totalBoxY, summaryBoxWidth - 2, 11, 1.5, 1.5, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...goldLight);
  doc.text("TOTAL FINAL (UYU):", summaryBoxX + 4, totalBoxY + 7);

  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text(
    `$${Number(quote.totalAmount || 0).toLocaleString("es-UY", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`,
    tValX - 1,
    totalBoxY + 7.5,
    { align: "right" }
  );

  // -------------------------------------------------------------
  // 6. MULTI-PAGE NUMBERING & FOOTER (Executed on all pages)
  // -------------------------------------------------------------
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    // Bottom gold separator line
    doc.setDrawColor(...goldAccent);
    doc.setLineWidth(0.4);
    doc.line(marginX, pageHeight - 12, pageWidth - marginX, pageHeight - 12);

    // Footer text
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...textMuted);
    doc.text(
      `${mergedSettings.companyName || "JUEM"} • Fabricación Digital & Modelado 3D • ${mergedSettings.website || "juem.com.uy"}`,
      marginX,
      pageHeight - 7
    );

    doc.text(`Página ${i} de ${totalPages}`, pageWidth - marginX, pageHeight - 7, { align: "right" });
  }

  return doc;
}

/**
 * Returns clean sanitized filename: COT-2026-0001-NombreCliente.pdf
 */
export function getQuotePdfFilename(quote: CommercialQuote3D): string {
  const quoteNum = (quote.quoteNumber || "COT-2026-0001").replace(/[^a-zA-Z0-9_-]/g, "");
  const customerName = (quote.customerName || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "");

  if (customerName.trim()) {
    return `${quoteNum}-${customerName}.pdf`;
  }
  return `${quoteNum}.pdf`;
}

/**
 * Generates and triggers browser download of the PDF file
 */
export function downloadQuotePdf(
  quote: CommercialQuote3D,
  settings: Partial<CompanyQuoteSettings> = {}
): void {
  const doc = buildQuotePdfDoc(quote, settings);
  const filename = getQuotePdfFilename(quote);
  doc.save(filename);
}

/**
 * Generates Blob URL for real-time live preview modal
 */
export function generateQuotePdfBlobUrl(
  quote: CommercialQuote3D,
  settings: Partial<CompanyQuoteSettings> = {}
): string {
  const doc = buildQuotePdfDoc(quote, settings);
  const blob = doc.output("blob");
  return URL.createObjectURL(blob);
}
