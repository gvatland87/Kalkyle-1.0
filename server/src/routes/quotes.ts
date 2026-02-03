import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../database.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken);

// Generer tilbudsnummer
function generateQuoteNumber(userId: string): string {
  const year = new Date().getFullYear();
  const count = db.prepare(`
    SELECT COUNT(*) as count FROM quotes
    WHERE user_id = ? AND quote_number LIKE ?
  `).get(userId, `T${year}-%`) as { count: number };

  const num = (count.count + 1).toString().padStart(4, '0');
  return `T${year}-${num}`;
}

// Hent alle tilbud
router.get('/', (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.query;

    let query = `
      SELECT q.*,
        (SELECT COALESCE(SUM(line_total), 0) FROM quote_lines WHERE quote_id = q.id) as total_cost,
        (SELECT COUNT(*) FROM quote_lines WHERE quote_id = q.id) as line_count
      FROM quotes q
      WHERE q.user_id = ?
    `;
    const params: string[] = [req.userId!];

    if (status) {
      query += ' AND q.status = ?';
      params.push(status as string);
    }

    query += ' ORDER BY q.created_at DESC';

    const quotes = db.prepare(query).all(...params);
    res.json({ quotes });
  } catch (error) {
    console.error('Feil ved henting av tilbud:', error);
    res.status(500).json({ error: 'Kunne ikke hente tilbud' });
  }
});

// Hent ett tilbud med linjer
router.get('/:id', (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const quote = db.prepare(`
      SELECT * FROM quotes WHERE id = ? AND user_id = ?
    `).get(id, req.userId);

    if (!quote) {
      return res.status(404).json({ error: 'Tilbud ikke funnet' });
    }

    const lines = db.prepare(`
      SELECT ql.*, ci.name as item_name
      FROM quote_lines ql
      LEFT JOIN cost_items ci ON ql.cost_item_id = ci.id
      WHERE ql.quote_id = ?
      ORDER BY ql.sort_order, ql.created_at
    `).all(id);

    res.json({ quote, lines });
  } catch (error) {
    console.error('Feil ved henting av tilbud:', error);
    res.status(500).json({ error: 'Kunne ikke hente tilbud' });
  }
});

// Opprett tilbud
router.post('/', (req: AuthRequest, res: Response) => {
  try {
    const {
      customerName,
      customerEmail,
      customerAddress,
      projectName,
      projectDescription,
      reference,
      validUntil,
      markupPercent,
      notes,
      terms
    } = req.body;

    if (!customerName || !projectName) {
      return res.status(400).json({ error: 'Kundenavn og prosjektnavn er påkrevd' });
    }

    const id = uuidv4();
    const quoteNumber = generateQuoteNumber(req.userId!);

    // Hent standard vilkår hvis ikke oppgitt
    let finalTerms = terms;
    if (!finalTerms) {
      const settings = db.prepare(`
        SELECT default_terms FROM company_settings WHERE user_id = ?
      `).get(req.userId) as { default_terms: string } | undefined;
      finalTerms = settings?.default_terms || null;
    }

    // Beregn gyldighet hvis ikke oppgitt
    let finalValidUntil = validUntil;
    if (!finalValidUntil) {
      const settings = db.prepare(`
        SELECT default_validity_days FROM company_settings WHERE user_id = ?
      `).get(req.userId) as { default_validity_days: number } | undefined;
      const days = settings?.default_validity_days || 30;
      const date = new Date();
      date.setDate(date.getDate() + days);
      finalValidUntil = date.toISOString().split('T')[0];
    }

    db.prepare(`
      INSERT INTO quotes (
        id, user_id, quote_number, customer_name, customer_email, customer_address,
        project_name, project_description, reference, valid_until, markup_percent, notes, terms
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, req.userId, quoteNumber, customerName, customerEmail || null,
      customerAddress || null, projectName, projectDescription || null,
      reference || null, finalValidUntil, markupPercent || 0, notes || null, finalTerms
    );

    const quote = db.prepare('SELECT * FROM quotes WHERE id = ?').get(id);
    res.status(201).json({ quote });
  } catch (error) {
    console.error('Feil ved opprettelse av tilbud:', error);
    res.status(500).json({ error: 'Kunne ikke opprette tilbud' });
  }
});

// Oppdater tilbud
router.put('/:id', (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const {
      customerName,
      customerEmail,
      customerAddress,
      projectName,
      projectDescription,
      reference,
      validUntil,
      status,
      markupPercent,
      notes,
      terms
    } = req.body;

    const existing = db.prepare(`
      SELECT id FROM quotes WHERE id = ? AND user_id = ?
    `).get(id, req.userId);

    if (!existing) {
      return res.status(404).json({ error: 'Tilbud ikke funnet' });
    }

    const updates: string[] = ['updated_at = datetime(\'now\')'];
    const values: (string | number | null)[] = [];

    const fields: Record<string, string | number | null | undefined> = {
      customer_name: customerName,
      customer_email: customerEmail,
      customer_address: customerAddress,
      project_name: projectName,
      project_description: projectDescription,
      reference: reference,
      valid_until: validUntil,
      status: status,
      markup_percent: markupPercent,
      notes: notes,
      terms: terms
    };

    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) {
        updates.push(`${key} = ?`);
        values.push(value ?? null);
      }
    }

    values.push(id);
    db.prepare(`UPDATE quotes SET ${updates.join(', ')} WHERE id = ?`).run(...values);

    const quote = db.prepare('SELECT * FROM quotes WHERE id = ?').get(id);
    res.json({ quote });
  } catch (error) {
    console.error('Feil ved oppdatering av tilbud:', error);
    res.status(500).json({ error: 'Kunne ikke oppdatere tilbud' });
  }
});

// Slett tilbud
router.delete('/:id', (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const existing = db.prepare(`
      SELECT id FROM quotes WHERE id = ? AND user_id = ?
    `).get(id, req.userId);

    if (!existing) {
      return res.status(404).json({ error: 'Tilbud ikke funnet' });
    }

    db.prepare('DELETE FROM quotes WHERE id = ?').run(id);
    res.json({ message: 'Tilbud slettet' });
  } catch (error) {
    console.error('Feil ved sletting av tilbud:', error);
    res.status(500).json({ error: 'Kunne ikke slette tilbud' });
  }
});

// --- Tilbudslinjer ---

// Legg til linje
router.post('/:id/lines', (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { costItemId, categoryType, description, quantity, unit, unitPrice, lineMarkup } = req.body;

    // Sjekk at tilbudet tilhører brukeren
    const quote = db.prepare(`
      SELECT id FROM quotes WHERE id = ? AND user_id = ?
    `).get(id, req.userId);

    if (!quote) {
      return res.status(404).json({ error: 'Tilbud ikke funnet' });
    }

    if (!categoryType || !description || quantity === undefined || !unit || unitPrice === undefined) {
      return res.status(400).json({ error: 'Type, beskrivelse, antall, enhet og pris er påkrevd' });
    }

    const lineTotal = quantity * unitPrice * (1 + (lineMarkup || 0) / 100);
    const lineId = uuidv4();

    // Finn neste sort_order
    const maxOrder = db.prepare(`
      SELECT COALESCE(MAX(sort_order), 0) as max_order FROM quote_lines WHERE quote_id = ?
    `).get(id) as { max_order: number };

    db.prepare(`
      INSERT INTO quote_lines (id, quote_id, cost_item_id, category_type, description, quantity, unit, unit_price, line_markup, line_total, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(lineId, id, costItemId || null, categoryType, description, quantity, unit, unitPrice, lineMarkup || 0, lineTotal, maxOrder.max_order + 1);

    // Oppdater tilbudets updated_at
    db.prepare('UPDATE quotes SET updated_at = datetime(\'now\') WHERE id = ?').run(id);

    const line = db.prepare('SELECT * FROM quote_lines WHERE id = ?').get(lineId);
    res.status(201).json({ line });
  } catch (error) {
    console.error('Feil ved opprettelse av tilbudslinje:', error);
    res.status(500).json({ error: 'Kunne ikke opprette tilbudslinje' });
  }
});

// Oppdater linje
router.put('/:id/lines/:lineId', (req: AuthRequest, res: Response) => {
  try {
    const { id, lineId } = req.params;
    const { description, quantity, unit, unitPrice, lineMarkup, sortOrder } = req.body;

    // Sjekk tilhørighet
    const existing = db.prepare(`
      SELECT ql.id FROM quote_lines ql
      JOIN quotes q ON ql.quote_id = q.id
      WHERE ql.id = ? AND q.id = ? AND q.user_id = ?
    `).get(lineId, id, req.userId);

    if (!existing) {
      return res.status(404).json({ error: 'Tilbudslinje ikke funnet' });
    }

    const updates: string[] = [];
    const values: (string | number | null)[] = [];

    if (description !== undefined) {
      updates.push('description = ?');
      values.push(description);
    }
    if (quantity !== undefined) {
      updates.push('quantity = ?');
      values.push(quantity);
    }
    if (unit !== undefined) {
      updates.push('unit = ?');
      values.push(unit);
    }
    if (unitPrice !== undefined) {
      updates.push('unit_price = ?');
      values.push(unitPrice);
    }
    if (lineMarkup !== undefined) {
      updates.push('line_markup = ?');
      values.push(lineMarkup);
    }
    if (sortOrder !== undefined) {
      updates.push('sort_order = ?');
      values.push(sortOrder);
    }

    // Rekalkuler line_total hvis relevant
    if (quantity !== undefined || unitPrice !== undefined || lineMarkup !== undefined) {
      const current = db.prepare('SELECT quantity, unit_price, line_markup FROM quote_lines WHERE id = ?').get(lineId) as {
        quantity: number;
        unit_price: number;
        line_markup: number;
      };

      const finalQty = quantity ?? current.quantity;
      const finalPrice = unitPrice ?? current.unit_price;
      const finalMarkup = lineMarkup ?? current.line_markup;
      const lineTotal = finalQty * finalPrice * (1 + finalMarkup / 100);

      updates.push('line_total = ?');
      values.push(lineTotal);
    }

    if (updates.length > 0) {
      values.push(lineId);
      db.prepare(`UPDATE quote_lines SET ${updates.join(', ')} WHERE id = ?`).run(...values);
      db.prepare('UPDATE quotes SET updated_at = datetime(\'now\') WHERE id = ?').run(id);
    }

    const line = db.prepare('SELECT * FROM quote_lines WHERE id = ?').get(lineId);
    res.json({ line });
  } catch (error) {
    console.error('Feil ved oppdatering av tilbudslinje:', error);
    res.status(500).json({ error: 'Kunne ikke oppdatere tilbudslinje' });
  }
});

// Slett linje
router.delete('/:id/lines/:lineId', (req: AuthRequest, res: Response) => {
  try {
    const { id, lineId } = req.params;

    const existing = db.prepare(`
      SELECT ql.id FROM quote_lines ql
      JOIN quotes q ON ql.quote_id = q.id
      WHERE ql.id = ? AND q.id = ? AND q.user_id = ?
    `).get(lineId, id, req.userId);

    if (!existing) {
      return res.status(404).json({ error: 'Tilbudslinje ikke funnet' });
    }

    db.prepare('DELETE FROM quote_lines WHERE id = ?').run(lineId);
    db.prepare('UPDATE quotes SET updated_at = datetime(\'now\') WHERE id = ?').run(id);

    res.json({ message: 'Tilbudslinje slettet' });
  } catch (error) {
    console.error('Feil ved sletting av tilbudslinje:', error);
    res.status(500).json({ error: 'Kunne ikke slette tilbudslinje' });
  }
});

// Beregn tilbudssammendrag
router.get('/:id/summary', (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const quote = db.prepare(`
      SELECT * FROM quotes WHERE id = ? AND user_id = ?
    `).get(id, req.userId) as {
      id: string;
      markup_percent: number;
    } | undefined;

    if (!quote) {
      return res.status(404).json({ error: 'Tilbud ikke funnet' });
    }

    // Hent summer per kategori
    const categoryTotals = db.prepare(`
      SELECT category_type, SUM(line_total) as total
      FROM quote_lines
      WHERE quote_id = ?
      GROUP BY category_type
    `).all(id) as { category_type: string; total: number }[];

    // Hent MVA-sats
    const settings = db.prepare(`
      SELECT vat_percent FROM company_settings WHERE user_id = ?
    `).get(req.userId) as { vat_percent: number } | undefined;
    const vatPercent = settings?.vat_percent || 25;

    const totalCost = categoryTotals.reduce((sum, cat) => sum + cat.total, 0);
    const markup = totalCost * (quote.markup_percent / 100);
    const totalExVat = totalCost + markup;
    const vat = totalExVat * (vatPercent / 100);
    const totalIncVat = totalExVat + vat;

    res.json({
      categoryTotals: categoryTotals.reduce((acc, cat) => {
        acc[cat.category_type] = cat.total;
        return acc;
      }, {} as Record<string, number>),
      totalCost,
      markupPercent: quote.markup_percent,
      markup,
      totalExVat,
      vatPercent,
      vat,
      totalIncVat
    });
  } catch (error) {
    console.error('Feil ved beregning av tilbudssammendrag:', error);
    res.status(500).json({ error: 'Kunne ikke beregne sammendrag' });
  }
});

export default router;
