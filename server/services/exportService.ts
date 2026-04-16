import * as XLSX from 'xlsx';
import PDFDocument from 'pdfkit';

export interface TrackerRow {
  reference: string;
  type: string;
  vendor: string;
  description: string;
  quantity: number;
  endUser: string;
  department?: string;
  plannedDelivery?: string | null;
  actualDelivery?: string | null;
  currentStatus: string;
  daysDelayed?: number;
}

const COLUMNS = [
  { header: 'PO/DP Ref', key: 'reference' },
  { header: 'Type', key: 'type' },
  { header: 'Vendor', key: 'vendor' },
  { header: 'Item Description', key: 'description' },
  { header: 'Qty', key: 'quantity' },
  { header: 'End User', key: 'endUser' },
  { header: 'Department', key: 'department' },
  { header: 'Planned Delivery', key: 'plannedDelivery' },
  { header: 'Actual Delivery', key: 'actualDelivery' },
  { header: 'Current Status', key: 'currentStatus' },
  { header: 'Days Delayed', key: 'daysDelayed' },
] as const;

/**
 * Exports tracker data to an Excel (.xlsx) buffer.
 */
export function exportToExcel(data: TrackerRow[]): Buffer {
  const worksheetData = [
    COLUMNS.map((c) => c.header),
    ...data.map((row) =>
      COLUMNS.map((c) => {
        const val = row[c.key as keyof TrackerRow];
        return val == null ? '' : val;
      }),
    ),
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(worksheetData);

  // Column widths
  ws['!cols'] = [
    { wch: 14 }, // PO/DP Ref
    { wch: 6 },  // Type
    { wch: 20 }, // Vendor
    { wch: 35 }, // Item Description
    { wch: 6 },  // Qty
    { wch: 22 }, // End User
    { wch: 18 }, // Department
    { wch: 16 }, // Planned Delivery
    { wch: 16 }, // Actual Delivery
    { wch: 22 }, // Current Status
    { wch: 12 }, // Days Delayed
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Tracker Report');

  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  return buffer;
}

/**
 * Exports tracker data to a PDF buffer using pdfkit.
 */
export async function exportToPDF(data: TrackerRow[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'landscape' });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Header
    doc
      .fontSize(16)
      .fillColor('#1a3a5c')
      .text('MBZUAI Delivery Tracker — Report', { align: 'center' });

    doc
      .fontSize(9)
      .fillColor('#666')
      .text(`Generated: ${new Date().toLocaleString('en-AE', { timeZone: 'Asia/Dubai' })}`, {
        align: 'center',
      });

    doc.moveDown(1);

    // Table setup
    const pageWidth = doc.page.width - 60; // account for margins
    const colWidths = [70, 30, 80, 130, 25, 80, 70, 65, 65, 90, 50];
    const headers = COLUMNS.map((c) => c.header);

    const drawRow = (
      cells: string[],
      y: number,
      isHeader = false,
      rowFill?: string,
    ) => {
      let x = 30;
      if (rowFill) {
        doc.rect(30, y - 2, pageWidth, 14).fill(rowFill).fillColor('#000');
      }
      cells.forEach((cell, i) => {
        doc
          .fontSize(isHeader ? 7 : 6.5)
          .fillColor(isHeader ? '#fff' : '#333')
          .font(isHeader ? 'Helvetica-Bold' : 'Helvetica')
          .text(String(cell ?? ''), x + 2, y, {
            width: colWidths[i] - 4,
            height: 12,
            ellipsis: true,
            lineBreak: false,
          });
        x += colWidths[i];
      });
    };

    // Header row
    let currentY = doc.y;
    doc.rect(30, currentY - 2, pageWidth, 14).fill('#1a3a5c');
    drawRow(headers, currentY, true);
    currentY += 14;

    // Data rows
    data.forEach((row, idx) => {
      if (currentY > doc.page.height - 60) {
        doc.addPage({ layout: 'landscape', size: 'A4', margin: 30 });
        currentY = 30;
        // Re-draw header on new page
        doc.rect(30, currentY - 2, pageWidth, 14).fill('#1a3a5c');
        drawRow(headers, currentY, true);
        currentY += 14;
      }

      const fill = idx % 2 === 0 ? '#f8fafc' : '#fff';
      const cells = COLUMNS.map((c) => {
        const val = row[c.key as keyof TrackerRow];
        return val == null ? '' : String(val);
      });
      drawRow(cells, currentY, false, fill);
      currentY += 13;
    });

    doc.end();
  });
}
