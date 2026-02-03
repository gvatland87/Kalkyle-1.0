import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../database.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken);

// Hent alle kalkyler for bruker
router.get('/', (req: AuthRequest, res: Response) => {
  try {
    const calculations = db.prepare(`
      SELECT * FROM calculations
      WHERE user_id = ?
      ORDER BY updated_at DESC
    `).all(req.userId);

    res.json({ calculations });
  } catch (error) {
    console.error('Feil ved henting av kalkyler:', error);
    res.status(500).json({ error: 'Kunne ikke hente kalkyler' });
  }
});

// Hent én kalkyle med linjer og summer
router.get('/:id', (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const calculation = db.prepare(`
      SELECT * FROM calculations WHERE id = ? AND user_id = ?
    `).get(id, req.userId) as {
      id: string;
      name: string;
      description: string;
      target_margin_percent: number;
    } | undefined;

    if (!calculation) {
      return res.status(404).json({ error: 'Kalkyle ikke funnet' });
    }

    const lines = db.prepare(`
      SELECT cl.*, ci.name as cost_item_name
      FROM calculation_lines cl
      LEFT JOIN cost_items ci ON cl.cost_item_id = ci.id
      WHERE cl.calculation_id = ?
      ORDER BY cl.sort_order, cl.created_at
    `).all(id) as Array<{
      id: string;
      description: string;
      quantity: number;
      unit: string;
      unit_cost: number;
    }>;

    // Beregn summer
    const totalCost = lines.reduce((sum, line) => sum + (line.quantity * line.unit_cost), 0);
    const marginPercent = calculation.target_margin_percent;
    const totalSales = totalCost / (1 - marginPercent / 100);
    const marginAmount = totalSales - totalCost;

    res.json({
      calculation,
      lines,
      summary: {
        totalCost: Math.round(totalCost * 100) / 100,
        totalSales: Math.round(totalSales * 100) / 100,
        marginPercent,
        marginAmount: Math.round(marginAmount * 100) / 100
      }
    });
  } catch (error) {
    console.error('Feil ved henting av kalkyle:', error);
    res.status(500).json({ error: 'Kunne ikke hente kalkyle' });
  }
});

// Opprett ny kalkyle
router.post('/', (req: AuthRequest, res: Response) => {
  try {
    const { name, description, targetMarginPercent } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Navn er påkrevd' });
    }

    const id = uuidv4();
    db.prepare(`
      INSERT INTO calculations (id, user_id, name, description, target_margin_percent)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, req.userId, name, description || null, targetMarginPercent || 15);

    const calculation = db.prepare('SELECT * FROM calculations WHERE id = ?').get(id);
    res.status(201).json({ calculation });
  } catch (error) {
    console.error('Feil ved opprettelse av kalkyle:', error);
    res.status(500).json({ error: 'Kunne ikke opprette kalkyle' });
  }
});

// Oppdater kalkyle (navn, beskrivelse, DG%)
router.put('/:id', (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, targetMarginPercent } = req.body;

    const existing = db.prepare('SELECT id FROM calculations WHERE id = ? AND user_id = ?')
      .get(id, req.userId);

    if (!existing) {
      return res.status(404).json({ error: 'Kalkyle ikke funnet' });
    }

    const updates: string[] = [];
    const values: (string | number | null)[] = [];

    if (name !== undefined) {
      updates.push('name = ?');
      values.push(name);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      values.push(description || null);
    }
    if (targetMarginPercent !== undefined) {
      updates.push('target_margin_percent = ?');
      values.push(targetMarginPercent);
    }

    if (updates.length > 0) {
      updates.push('updated_at = datetime("now")');
      values.push(id);
      db.prepare(`UPDATE calculations SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    }

    const calculation = db.prepare('SELECT * FROM calculations WHERE id = ?').get(id);
    res.json({ calculation });
  } catch (error) {
    console.error('Feil ved oppdatering av kalkyle:', error);
    res.status(500).json({ error: 'Kunne ikke oppdatere kalkyle' });
  }
});

// Slett kalkyle
router.delete('/:id', (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const existing = db.prepare('SELECT id FROM calculations WHERE id = ? AND user_id = ?')
      .get(id, req.userId);

    if (!existing) {
      return res.status(404).json({ error: 'Kalkyle ikke funnet' });
    }

    db.prepare('DELETE FROM calculations WHERE id = ?').run(id);
    res.json({ message: 'Kalkyle slettet' });
  } catch (error) {
    console.error('Feil ved sletting av kalkyle:', error);
    res.status(500).json({ error: 'Kunne ikke slette kalkyle' });
  }
});

// === LINJER ===

// Legg til linje
router.post('/:id/lines', (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { costItemId, description, quantity, unit, unitCost } = req.body;

    // Sjekk at kalkylen tilhører brukeren
    const calculation = db.prepare('SELECT id FROM calculations WHERE id = ? AND user_id = ?')
      .get(id, req.userId);

    if (!calculation) {
      return res.status(404).json({ error: 'Kalkyle ikke funnet' });
    }

    if (!description || quantity === undefined || !unit || unitCost === undefined) {
      return res.status(400).json({ error: 'Beskrivelse, antall, enhet og enhetskost er påkrevd' });
    }

    const lineId = uuidv4();

    // Finn høyeste sort_order
    const maxOrder = db.prepare(`
      SELECT COALESCE(MAX(sort_order), 0) as max_order FROM calculation_lines WHERE calculation_id = ?
    `).get(id) as { max_order: number };

    db.prepare(`
      INSERT INTO calculation_lines (id, calculation_id, cost_item_id, description, quantity, unit, unit_cost, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(lineId, id, costItemId || null, description, quantity, unit, unitCost, maxOrder.max_order + 1);

    // Oppdater kalkylens updated_at
    db.prepare('UPDATE calculations SET updated_at = datetime("now") WHERE id = ?').run(id);

    const line = db.prepare('SELECT * FROM calculation_lines WHERE id = ?').get(lineId);
    res.status(201).json({ line });
  } catch (error) {
    console.error('Feil ved opprettelse av linje:', error);
    res.status(500).json({ error: 'Kunne ikke opprette linje' });
  }
});

// Oppdater linje
router.put('/:id/lines/:lineId', (req: AuthRequest, res: Response) => {
  try {
    const { id, lineId } = req.params;
    const { description, quantity, unit, unitCost } = req.body;

    // Sjekk at kalkylen tilhører brukeren
    const calculation = db.prepare('SELECT id FROM calculations WHERE id = ? AND user_id = ?')
      .get(id, req.userId);

    if (!calculation) {
      return res.status(404).json({ error: 'Kalkyle ikke funnet' });
    }

    const existing = db.prepare('SELECT id FROM calculation_lines WHERE id = ? AND calculation_id = ?')
      .get(lineId, id);

    if (!existing) {
      return res.status(404).json({ error: 'Linje ikke funnet' });
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
    if (unitCost !== undefined) {
      updates.push('unit_cost = ?');
      values.push(unitCost);
    }

    if (updates.length > 0) {
      values.push(lineId);
      db.prepare(`UPDATE calculation_lines SET ${updates.join(', ')} WHERE id = ?`).run(...values);
      db.prepare('UPDATE calculations SET updated_at = datetime("now") WHERE id = ?').run(id);
    }

    const line = db.prepare('SELECT * FROM calculation_lines WHERE id = ?').get(lineId);
    res.json({ line });
  } catch (error) {
    console.error('Feil ved oppdatering av linje:', error);
    res.status(500).json({ error: 'Kunne ikke oppdatere linje' });
  }
});

// Slett linje
router.delete('/:id/lines/:lineId', (req: AuthRequest, res: Response) => {
  try {
    const { id, lineId } = req.params;

    // Sjekk at kalkylen tilhører brukeren
    const calculation = db.prepare('SELECT id FROM calculations WHERE id = ? AND user_id = ?')
      .get(id, req.userId);

    if (!calculation) {
      return res.status(404).json({ error: 'Kalkyle ikke funnet' });
    }

    const existing = db.prepare('SELECT id FROM calculation_lines WHERE id = ? AND calculation_id = ?')
      .get(lineId, id);

    if (!existing) {
      return res.status(404).json({ error: 'Linje ikke funnet' });
    }

    db.prepare('DELETE FROM calculation_lines WHERE id = ?').run(lineId);
    db.prepare('UPDATE calculations SET updated_at = datetime("now") WHERE id = ?').run(id);

    res.json({ message: 'Linje slettet' });
  } catch (error) {
    console.error('Feil ved sletting av linje:', error);
    res.status(500).json({ error: 'Kunne ikke slette linje' });
  }
});

export default router;
