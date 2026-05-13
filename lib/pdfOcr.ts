const OCR_PAGE_LIMIT = 2;
const OCR_RENDER_SCALE = 2;

export type OcrResult = {
  text: string;
  confidence: number | null;
  pagesProcessed: number;
  warnings: string[];
};

export async function extractTextWithPdfOcr(bytes: Buffer): Promise<OcrResult> {
  const warnings: string[] = [];

  try {
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const { createCanvas } = await import("@napi-rs/canvas");
    const tesseract = await import("tesseract.js");
    const document = await pdfjs.getDocument({
      data: new Uint8Array(bytes),
      disableFontFace: true,
      isEvalSupported: false,
      useSystemFonts: true,
    } as never).promise;
    const pageCount = Math.min(document.numPages, OCR_PAGE_LIMIT);
    const textChunks: string[] = [];
    const confidences: number[] = [];

    for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const viewport = page.getViewport({ scale: OCR_RENDER_SCALE });
      const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
      const canvasContext = canvas.getContext("2d");

      await page.render({
        canvasContext,
        viewport,
      } as never).promise;

      const image = canvas.toBuffer("image/png");
      const result = await tesseract.recognize(image, "eng");
      const text = result.data.text.trim();
      if (text) textChunks.push(text);
      if (Number.isFinite(result.data.confidence)) confidences.push(result.data.confidence);
    }

    if (document.numPages > OCR_PAGE_LIMIT) {
      warnings.push(`OCR reviewed the first ${OCR_PAGE_LIMIT} pages for this prototype. Manual review remains required.`);
    }

    const text = textChunks.join("\n\n").trim();
    return {
      text,
      confidence: confidences.length
        ? Math.round((confidences.reduce((sum, value) => sum + value, 0) / confidences.length) * 100) / 100
        : null,
      pagesProcessed: pageCount,
      warnings,
    };
  } catch (error) {
    return {
      text: "",
      confidence: null,
      pagesProcessed: 0,
      warnings: [error instanceof Error ? error.message : "OCR could not read this PDF. Manual review required."],
    };
  }
}
