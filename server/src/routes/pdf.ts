import { Router, Response } from 'express';
import PDFDocument from 'pdfkit';
import db from '../database.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken);

interface QuoteData {
  id: string;
  quote_number: string;
  customer_name: string;
  customer_email: string | null;
  customer_address: string | null;
  project_name: string;
  project_description: string | null;
  reference: string | null;
  valid_until: string | null;
  markup_percent: number;
  notes: string | null;
  terms: string | null;
  created_at: string;
}

interface QuoteLine {
  id: string;
  category_type: string;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  line_markup: number;
  line_total: number;
}

interface CompanySettings {
  company_name: string | null;
  org_number: string | null;
  address: string | null;
  postal_code: string | null;
  city: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  vat_percent: number;
}

const categoryLabels: Record<string, string> = {
  labor: 'Arbeid',
  material: 'Materialer',
  consumable: 'Forbruksmateriell',
  transport: 'Transport/Rigg',
  ndt: 'NDT-tjenester'
};

// Generer PDF for tilbud
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { detailed } = req.query;

    // Hent tilbud
    const quote = db.prepare(`
      SELECT * FROM quotes WHERE id = ? AND user_id = ?
    `).get(id, req.userId) as QuoteData | undefined;

    if (!quote) {
      return res.status(404).json({ error: 'Tilbud ikke funnet' });
    }

    // Hent linjer
    const lines = db.prepare(`
      SELECT * FROM quote_lines WHERE quote_id = ? ORDER BY sort_order, created_at
    `).all(id) as QuoteLine[];

    // Hent bedriftsinfo
    const settings = db.prepare(`
      SELECT * FROM company_settings WHERE user_id = ?
    `).get(req.userId) as CompanySettings | undefined;

    // Beregn totaler
    const totalCost = lines.reduce((sum, line) => sum + line.line_total, 0);
    const markup = totalCost * (quote.markup_percent / 100);
    const totalExVat = totalCost + markup;
    const vatPercent = settings?.vat_percent || 25;
    const vat = totalExVat * (vatPercent / 100);
    const totalIncVat = totalExVat + vat;

    // Opprett PDF
    const doc = new PDFDocument({ margin: 50, size: 'A4' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Tilbud-${quote.quote_number}.pdf"`);

    doc.pipe(res);

    // Header
    doc.fontSize(24).text('TILBUD', { align: 'center' });
    doc.moveDown();

    // Bedriftsinfo
    if (settings?.company_name) {
      doc.fontSize(14).text(settings.company_name, { align: 'right' });
      if (settings.address) doc.fontSize(10).text(settings.address, { align: 'right' });
      if (settings.postal_code || settings.city) {
        doc.text(`${settings.postal_code || ''} ${settings.city || ''}`.trim(), { align: 'right' });
      }
      if (settings.phone) doc.text(`Tlf: ${settings.phone}`, { align: 'right' });
      if (settings.email) doc.text(settings.email, { align: 'right' });
      if (settings.org_number) doc.text(`Org.nr: ${settings.org_number}`, { align: 'right' });
    }

    doc.moveDown(2);

    // Tilbudsinfo
    const infoY = doc.y;
    doc.fontSize(10);
    doc.text(`Tilbudsnr: ${quote.quote_number}`, 50, infoY);
    doc.text(`Dato: ${new Date(quote.created_at).toLocaleDateString('nb-NO')}`, 50);
    doc.text(`Gyldig til: ${quote.valid_until ? new Date(quote.valid_until).toLocaleDateString('nb-NO') : 'Ikke angitt'}`, 50);
    if (quote.reference) doc.text(`Referanse: ${quote.reference}`, 50);

    // Kundinfo
    doc.text(`Kunde: ${quote.customer_name}`, 300, infoY);
    if (quote.customer_address) doc.text(quote.customer_address, 300);
    if (quote.customer_email) doc.text(quote.customer_email, 300);

    doc.moveDown(2);

    // Prosjektinfo
    doc.fontSize(12).text(`Prosjekt: ${quote.project_name}`, 50, doc.y, { underline: true });
    if (quote.project_description) {
      doc.fontSize(10).text(quote.project_description, 50);
    }

    doc.moveDown();

    // Linjer
    if (detailed === 'true') {
      // Detaljert visning med alle linjer
      const tableTop = doc.y;
      const col1 = 50;
      const col2 = 280;
      const col3 = 340;
      const col4 = 390;
      const col5 = 470;

      doc.fontSize(9);
      doc.font('Helvetica-Bold');
      doc.text('Beskrivelse', col1, tableTop);
      doc.text('Antall', col2, tableTop);
      doc.text('Enhet', col3, tableTop);
      doc.text('Pris', col4, tableTop);
      doc.text('Sum', col5, tableTop);

      doc.moveTo(50, tableTop + 15).lineTo(545, tableTop + 15).stroke();

      doc.font('Helvetica');
      let y = tableTop + 25;

      // Grupper linjer etter kategori
      const grouped = lines.reduce((acc, line) => {
        if (!acc[line.category_type]) acc[line.category_type] = [];
        acc[line.category_type].push(line);
        return acc;
      }, {} as Record<string, QuoteLine[]>);

      for (const [type, categoryLines] of Object.entries(grouped)) {
        // Kategorioverskrift
        doc.font('Helvetica-Bold');
        doc.text(categoryLabels[type] || type, col1, y);
        y += 15;

        doc.font('Helvetica');
        for (const line of categoryLines) {
          if (y > 700) {
            doc.addPage();
            y = 50;
          }

          doc.text(line.description.substring(0, 40), col1, y);
          doc.text(line.quantity.toFixed(2), col2, y);
          doc.text(line.unit, col3, y);
          doc.text(formatCurrency(line.unit_price), col4, y);
          doc.text(formatCurrency(line.line_total), col5, y);
          y += 15;
        }
        y += 5;
      }

      doc.y = y;
    } else {
      // Forenklet visning - kun kategoritotaler
      const categoryTotals = lines.reduce((acc, line) => {
        if (!acc[line.category_type]) acc[line.category_type] = 0;
        acc[line.category_type] += line.line_total;
        return acc;
      }, {} as Record<string, number>);

      doc.fontSize(10);
      for (const [type, total] of Object.entries(categoryTotals)) {
        doc.text(`${categoryLabels[type] || type}:`, 50, doc.y, { continued: true });
        doc.text(formatCurrency(total), { align: 'right' });
      }
    }

    doc.moveDown(2);

    // Totaler
    doc.moveTo(300, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(0.5);

    doc.fontSize(10);
    doc.text('Sum kostnad:', 300, doc.y, { continued: true });
    doc.text(formatCurrency(totalCost), { align: 'right' });

    if (quote.markup_percent > 0) {
      doc.text(`Påslag (${quote.markup_percent}%):`, 300, doc.y, { continued: true });
      doc.text(formatCurrency(markup), { align: 'right' });
    }

    doc.font('Helvetica-Bold');
    doc.text('Sum eks. mva:', 300, doc.y, { continued: true });
    doc.text(formatCurrency(totalExVat), { align: 'right' });

    doc.font('Helvetica');
    doc.text(`MVA (${vatPercent}%):`, 300, doc.y, { continued: true });
    doc.text(formatCurrency(vat), { align: 'right' });

    doc.fontSize(12).font('Helvetica-Bold');
    doc.text('TOTALT INKL. MVA:', 300, doc.y, { continued: true });
    doc.text(formatCurrency(totalIncVat), { align: 'right' });

    // Notater og vilkår
    if (quote.notes) {
      doc.moveDown(2);
      doc.fontSize(10).font('Helvetica-Bold').text('Merknader:');
      doc.font('Helvetica').text(quote.notes);
    }

    if (quote.terms) {
      doc.moveDown();
      doc.fontSize(10).font('Helvetica-Bold').text('Vilkår:');
      doc.font('Helvetica').text(quote.terms);
    }

    doc.end();
  } catch (error) {
    console.error('Feil ved generering av PDF:', error);
    res.status(500).json({ error: 'Kunne ikke generere PDF' });
  }
});

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('nb-NO', {
    style: 'currency',
    currency: 'NOK',
    minimumFractionDigits: 2
  }).format(amount);
}

export default router;
