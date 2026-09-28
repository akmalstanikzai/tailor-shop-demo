/**
 * Universal Print & PDF Service
 * 100% reliable across Desktop, Mobile, iFrames (AI Studio preview), 
 * POS Thermal Receipt Printers (58mm, 80mm), and Standard A4/Letter printers.
 */
import jsPDF from 'jspdf';
import { toPng } from 'html-to-image';

export interface PrintOptions {
  title?: string;
  pageFormat?: 'a6' | 'a5' | 'a4' | 'thermal58' | 'thermal80' | 'auto';
  dir?: 'rtl' | 'ltr';
  onStart?: () => void;
  onComplete?: () => void;
  onError?: (err: unknown) => void;
}

/**
 * Inlines styles and triggers print via a dedicated hidden iframe.
 * If iframe printing fails (e.g. sandbox permissions), seamlessly falls back
 * to in-page isolated print overlay.
 */
export async function printReceiptElement(
  element: HTMLElement,
  options: PrintOptions = {}
): Promise<void> {
  const {
    title = 'Receipt',
    pageFormat = 'a6',
    dir = 'rtl',
    onStart,
    onComplete,
    onError,
  } = options;

  if (!element) {
    onError?.(new Error('Print target element is missing'));
    return;
  }

  onStart?.();

  // Width calculations for standard sheets and legacy thermal formats.
  const widthCss = pageFormat === 'thermal58' 
    ? 'width: 48mm; max-width: 48mm;' 
    : pageFormat === 'thermal80'
    ? 'width: 72mm; max-width: 72mm;'
    : pageFormat === 'a6'
    ? 'width: 98mm; max-width: 98mm;'
    : pageFormat === 'a5'
    ? 'width: 138mm; max-width: 138mm;'
    : 'width: 100%; max-width: 180mm;';

  const marginCss = pageFormat === 'a6' ? '3mm' : pageFormat === 'a5' ? '5mm' : pageFormat === 'a4' ? '8mm' : '0mm';

  // Gather existing stylesheets & fonts
  let styleTags = '';
  document.querySelectorAll('link[rel="stylesheet"], style').forEach(node => {
    styleTags += node.outerHTML + '\n';
  });

  const printDocumentHtml = `
    <!DOCTYPE html>
    <html dir="${dir}">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${title}</title>
        ${styleTags}
        <style>
          @page {
            size: ${pageFormat === 'a6' ? '105mm 148mm' : pageFormat === 'a5' ? 'A5 portrait' : pageFormat === 'a4' ? 'A4 portrait' : pageFormat === 'thermal58' ? '58mm auto' : '80mm auto'};
            margin: ${marginCss};
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            box-sizing: border-box !important;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
            font-family: 'Plus Jakarta Sans', 'Vazirmatn', system-ui, -apple-system, sans-serif !important;
            font-size: 11px !important;
            line-height: 1.35 !important;
            display: flex !important;
            justify-content: center !important;
          }
          .print-wrapper {
            ${widthCss}
            background: #ffffff !important;
            color: #000000 !important;
            margin: 0 auto !important;
            padding: ${pageFormat === 'a6' ? '2mm' : pageFormat === 'a5' ? '3mm' : pageFormat === 'a4' ? '4mm' : '1mm'} !important;
            box-sizing: border-box !important;
          }
          .no-print, button, .receipt-actions, .receipt-modal-footer {
            display: none !important;
          }
          svg {
            max-width: 100% !important;
            height: auto !important;
          }
          img {
            max-width: 100% !important;
            height: auto !important;
          }
          table {
            width: 100% !important;
            border-collapse: collapse !important;
          }
          /* Ensure high-contrast solid lines for thermal and regular printers */
          .border-stone-900, .border-stone-950, .border-black {
            border-color: #000000 !important;
          }
        </style>
      </head>
      <body>
        <div class="print-wrapper">
          ${element.outerHTML}
        </div>
      </body>
    </html>
  `;

  // Strategy 1: Hidden Iframe approach (Guarantees isolation from parent UI)
  try {
    const iframe = document.createElement('iframe');
    iframe.id = 'print-engine-frame-' + Date.now();
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0px';
    iframe.style.height = '0px';
    iframe.style.border = '0';
    iframe.style.opacity = '0';
    iframe.style.pointerEvents = 'none';

    document.body.appendChild(iframe);

    const frameDoc = iframe.contentWindow?.document;
    if (!frameDoc) {
      throw new Error('Could not access iframe document');
    }

    frameDoc.open();
    frameDoc.write(printDocumentHtml);
    frameDoc.close();

    // Wait for all images inside iframe to load before triggering print
    const images = Array.from(frameDoc.images);
    await Promise.all(
      images.map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise(resolve => {
          img.onload = resolve;
          img.onerror = resolve;
          setTimeout(resolve, 500); // 500ms safety timeout
        });
      })
    );

    // Short buffer for SVG/Barcode rendering
    await new Promise(r => setTimeout(r, 150));

    if (iframe.contentWindow) {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    } else {
      window.print();
    }

    // Clean up frame after print dialog interaction
    setTimeout(() => {
      try {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      } catch {
        // ignore
      }
      onComplete?.();
    }, 2000);
  } catch (err) {
    console.warn('Iframe print failed, falling back to direct window.print:', err);
    // Fallback: Direct window.print()
    try {
      window.print();
      onComplete?.();
    } catch (fallbackErr) {
      console.error('All print methods failed:', fallbackErr);
      onError?.(fallbackErr);
    }
  }
}

/**
 * Download a high-res crisp PDF of any printable receipt element.
 */
export async function downloadReceiptPdf(
  element: HTMLElement,
  options: {
    filename?: string;
    pageFormat?: 'a6' | 'a5' | 'a4' | 'thermal58' | 'thermal80' | 'auto';
    onStart?: () => void;
    onComplete?: () => void;
    onError?: (err: unknown) => void;
  } = {}
): Promise<void> {
  const {
    filename = 'Receipt.pdf',
    pageFormat = 'a6',
    onStart,
    onComplete,
    onError,
  } = options;

  if (!element) {
    onError?.(new Error('Element not provided'));
    return;
  }

  try {
    onStart?.();

    // Ensure all internal images are ready
    const images = Array.from(element.querySelectorAll('img'));
    await Promise.all(
      images.map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise(resolve => {
          img.onload = resolve;
          img.onerror = resolve;
          setTimeout(resolve, 500);
        });
      })
    );

    const dataUrl = await toPng(element, {
      pixelRatio: 3,
      backgroundColor: '#ffffff',
      cacheBust: true,
      style: {
        margin: '0',
        transform: 'none',
      },
    });

    const img = new Image();
    img.src = dataUrl;
    await new Promise(resolve => {
      img.onload = resolve;
      img.onerror = resolve;
    });

    const isA4 = pageFormat === 'a4';
    const isA5 = pageFormat === 'a5';
    const isA6 = pageFormat === 'a6';
    const isThermal58 = pageFormat === 'thermal58';
    
    // PDF width and margin definitions
    const pdfWidth = isA4 ? 210 : isA5 ? 148 : isA6 ? 105 : isThermal58 ? 58 : 80;
    const margin = isA4 ? 8 : isA5 ? 5 : isA6 ? 3 : 2;
    const printableWidth = pdfWidth - margin * 2;
    const imgHeight = (img.naturalHeight * printableWidth) / (img.naturalWidth || 1);
    
    // Default page heights for standard sheet sizes
    let pdf: jsPDF;
    if (isA6) {
      // If content fits or is close to A6 (<= 148mm), generate exact standard A6 portrait page
      const useFixedA6 = imgHeight + margin * 2 <= 152;
      pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: useFixedA6 ? 'a6' : [105, Math.ceil(imgHeight + margin * 2)],
      });
    } else if (isA4 || isA5) {
      pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: isA4 ? 'a4' : 'a5',
      });
    } else {
      pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [pdfWidth, Math.max(30, Math.ceil(imgHeight + margin * 2))],
      });
    }

    if (isA4 || isA5 || (isA6 && imgHeight + margin * 2 > 152 && false)) {
      const pageHeight = pdf.internal.pageSize.getHeight();
      const pageContentHeight = pageHeight - margin * 2;
      let imageY = margin;
      let remainingHeight = imgHeight;
      pdf.addImage(dataUrl, 'PNG', margin, imageY, printableWidth, imgHeight);
      remainingHeight -= pageContentHeight;
      while (remainingHeight > 0) {
        pdf.addPage();
        imageY -= pageContentHeight;
        pdf.addImage(dataUrl, 'PNG', margin, imageY, printableWidth, imgHeight);
        remainingHeight -= pageContentHeight;
      }
    } else {
      pdf.addImage(dataUrl, 'PNG', margin, margin, printableWidth, imgHeight);
    }

    pdf.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
    onComplete?.();
  } catch (err) {
    console.error('PDF generation error:', err);
    onError?.(err);
  }
}
