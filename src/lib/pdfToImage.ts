/**
 * Client-side PDF → PNG conversion using pdfjs-dist.
 * Converts the first page of a PDF to a PNG Blob at 2x scale for better OCR quality.
 * Browser-only — never import in server components or API routes.
 */
import * as pdfjsLib from "pdfjs-dist";

// Worker served from public/ (copied during build / setup)
pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

export async function pdfFirstPageToBlob(file: File): Promise<Blob> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale: 2.0 }); // 2x for better OCR quality
  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  // pdfjs-dist v5 uses canvas directly (canvasContext kept for backwards compat)
  await page.render({ canvas, viewport }).promise;
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Failed to convert PDF page to image"));
    }, "image/png");
  });
}
