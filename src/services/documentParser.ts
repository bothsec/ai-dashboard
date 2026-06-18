/**
 * Document parsing service — extracts plain text from PDF and DOCX files.
 * Used by the In-Chat PDF & Document Q&A feature.
 * @ts-nocheck - Node.js runtime APIs (Buffer) not in browser tsconfig
 */
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import mammoth from 'mammoth';

/** Max file size: 5MB */
const MAX_DOCUMENT_SIZE = 5 * 1024 * 1024;

/** Allowed MIME types */
const ALLOWED_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
]);

/** Extract text from a PDF using pdfjs-dist */
async function extractFromPdf(data: Buffer | Uint8Array): Promise<string> {
  const loadingTask = getDocument({ data: new Uint8Array(data) });
  const pdf = await loadingTask.promise;
  const parts: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((item: any) => item.str ?? '')
      .join(' ');
    if (pageText.trim()) parts.push(pageText);
  }
  return parts.join('\n\n');
}

/** Extract text from a DOCX Buffer via mammoth */
async function extractFromDocx(data: Buffer | Uint8Array): Promise<string> {
  const result = await mammoth.extractRawText({ buffer: Buffer.from(data) });
  return result.value.trim();
}

/**
 * Parse a document file and return plain text.
 * @param data Raw file buffer
 * @param mimeType MIME type string from the upload
 * @returns Extracted plain text, or throws on failure
 */
export async function parseDocument(
  data: Buffer | Uint8Array,
  mimeType: string,
): Promise<string> {
  if (data.byteLength > MAX_DOCUMENT_SIZE) {
    throw new Error(`File too large (max ${MAX_DOCUMENT_SIZE / 1024 / 1024}MB)`);
  }

  if (!ALLOWED_TYPES.has(mimeType)) {
    throw new Error(
      `Unsupported file type: ${mimeType}. Only PDF and DOCX are supported.`,
    );
  }

  let text: string;

  if (mimeType === 'application/pdf') {
    text = await extractFromPdf(data);
  } else {
    text = await extractFromDocx(data);
  }

  if (!text || text.trim().length === 0) {
    throw new Error(
      'Could not extract any text from this document. It may be image-based or empty.',
    );
  }

  // Truncate to 50,000 chars to prevent token overflow
  const MAX_CHARS = 50_000;
  if (text.length > MAX_CHARS) {
    text = text.slice(0, MAX_CHARS) + '\n\n[... document truncated due to length ...]';
  }

  return text;
}