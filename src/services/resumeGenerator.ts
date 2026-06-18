import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

const FONT_SIZES = {
  name: 24,
  section: 13,
  subsection: 11,
  body: 10,
  small: 9,
};

const COLORS = {
  dark: rgb(0.13, 0.16, 0.22),
  medium: rgb(0.4, 0.45, 0.52),
  light: rgb(0.75, 0.78, 0.85),
  accent: rgb(0.35, 0.47, 0.85),
  white: rgb(1, 1, 1),
};

export interface Experience {
  company: string;
  role: string;
  startYear: string;
  endYear: string;
  description: string;
}

export interface Education {
  school: string;
  degree: string;
  year: string;
}

export interface ResumeData {
  name: string;
  email: string;
  phone: string;
  linkedin?: string;
  summary: string;
  experience: Experience[];
  skills: string[];
  education: Education[];
  template: 'modern' | 'classic';
}

async function addModernHeader(doc: PDFDocument, page: any, name: string, email: string, phone: string, linkedin?: string) {
  const font = await doc.embedFont(StandardFonts.HelveticaBold);
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const { width } = page.getSize();

  // Top accent bar
  page.drawRectangle({ x: 0, y: page.getHeight() - 8, width, height: 8, color: COLORS.accent });

  // Name
  page.drawText(name, {
    x: 50, y: page.getHeight() - 50,
    size: FONT_SIZES.name, font, color: COLORS.dark,
  });

  // Contact info
  const contactLine = [email, phone, linkedin].filter(Boolean).join('   •   ');
  page.drawText(contactLine, {
    x: 50, y: page.getHeight() - 68,
    size: FONT_SIZES.small, font: regular, color: COLORS.medium,
  });

  return page.getHeight() - 90;
}

async function addClassicHeader(doc: PDFDocument, page: any, name: string, email: string, phone: string, linkedin?: string) {
  const font = await doc.embedFont(StandardFonts.TimesRomanBold);
  const italic = await doc.embedFont(StandardFonts.TimesRomanItalic);
  const { width } = page.getSize();

  // Centered name
  page.drawText(name, {
    x: 50, y: page.getHeight() - 50,
    size: FONT_SIZES.name + 2, font, color: COLORS.dark,
  });

  // Centered contact
  const contactLine = [email, phone, linkedin].filter(Boolean).join('  |  ');
  page.drawText(contactLine, {
    x: 50, y: page.getHeight() - 67,
    size: FONT_SIZES.small, font: italic, color: COLORS.medium,
  });

  // Underline
  page.drawLine({ start: { x: 50, y: page.getHeight() - 76 }, end: { x: width - 50, y: page.getHeight() - 76 }, thickness: 1, color: COLORS.dark });

  return page.getHeight() - 96;
}

function wrapText(text: string, maxChars: number): string[] {
  const lines: string[] = [];
  for (const para of text.split('\n')) {
    if (!para.trim()) { lines.push(''); continue; }
    const words = para.split(' ');
    let line = '';
    for (const word of words) {
      if ((line + word).length <= maxChars) {
        line += (line ? ' ' : '') + word;
      } else {
        if (line) lines.push(line);
        line = word;
      }
    }
    if (line) lines.push(line);
  }
  return lines;
}

async function addSection(page: { drawText: (text: string, opts: any) => void; drawLine: (opts: any) => void; drawRectangle: (opts: any) => void }, y: number, title: string, isModern: boolean, font: any, width: number): Promise<number> {
  const startY = y - 14;

  if (isModern) {
    page.drawRectangle({ x: 50, y: startY - 2, width: 120, height: 14, color: COLORS.accent });
    page.drawText(title.toUpperCase(), {
      x: 54, y: startY + 2, size: FONT_SIZES.small, font, color: COLORS.white,
    });
  } else {
    page.drawText(title.toUpperCase(), {
      x: 50, y: startY + 3, size: FONT_SIZES.section, font, color: COLORS.dark,
    });
    page.drawLine({ start: { x: 50, y: startY - 2 }, end: { x: width - 50, y: startY - 2 }, thickness: 0.5, color: COLORS.dark });
  }

  return startY - 10;
}

export async function generateResumePDF(data: ResumeData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`${data.name} — Resume`);
  doc.setAuthor(data.name);

  // Add page
  let page = doc.addPage([595.28, 841.89]); // A4
  const { width } = page.getSize();

  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const isModern = data.template === 'modern';

  // Header
  let y = isModern
    ? await addModernHeader(doc, page, data.name, data.email, data.phone, data.linkedin)
    : await addClassicHeader(doc, page, data.name, data.email, data.phone, data.linkedin);

  y -= 8;

  // Summary
  if (data.summary.trim()) {
    const wrapped = wrapText(data.summary, 85);
    for (const line of wrapped) {
      page.drawText(line, { x: 50, y, size: FONT_SIZES.body, font, color: COLORS.dark });
      y -= 13;
    }
    y -= 6;
  }

  // Experience section
  y = await addSection(page, y, 'Experience', isModern, bold, width);
  for (const exp of data.experience) {
    if (y < 120) { page = doc.addPage([595.28, 841.89]); y = page.getHeight() - 60; }
    // Company + Role + Period
    const period = `${exp.startYear} – ${exp.endYear}`;
    page.drawText(exp.company, { x: 50, y, size: FONT_SIZES.subsection, font: bold, color: COLORS.dark });
    page.drawText(period, { x: width - 50 - (font.widthOfTextAtSize(period, FONT_SIZES.small)), y, size: FONT_SIZES.small, font, color: COLORS.medium });
    y -= 13;
    page.drawText(exp.role, { x: 50, y, size: FONT_SIZES.body, font, color: COLORS.accent });
    y -= 13;
    const descLines = wrapText(exp.description || '', 90);
    for (const line of descLines) {
      if (y < 80) { page = doc.addPage([595.28, 841.89]); y = page.getHeight() - 60; }
      page.drawText(line, { x: 50, y, size: FONT_SIZES.body, font, color: COLORS.dark });
      y -= 12;
    }
    y -= 6;
  }

  // Skills section
  y -= 4;
  if (y < 120 || data.skills.length > 0) {
    if (y < 120) { page = doc.addPage([595.28, 841.89]); y = page.getHeight() - 60; }
    y = await addSection(page, y, 'Skills', isModern, bold, width);
    const skillText = data.skills.join('  •  ');
    const skillLines = wrapText(skillText, 95);
    for (const line of skillLines) {
      page.drawText(line, { x: 50, y, size: FONT_SIZES.body, font, color: COLORS.dark });
      y -= 13;
    }
    y -= 6;
  }

  // Education section
  if (data.education.length > 0) {
    if (y < 120) { page = doc.addPage([595.28, 841.89]); y = page.getHeight() - 60; }
    y = await addSection(page, y, 'Education', isModern, bold, width);
    for (const edu of data.education) {
      if (y < 100) { page = doc.addPage([595.28, 841.89]); y = page.getHeight() - 60; }
      page.drawText(`${edu.degree}  |  ${edu.year}`, { x: 50, y, size: FONT_SIZES.subsection, font: bold, color: COLORS.dark });
      y -= 13;
      page.drawText(edu.school, { x: 50, y, size: FONT_SIZES.body, font, color: COLORS.medium });
      y -= 18;
    }
  }

  return doc.save();
}