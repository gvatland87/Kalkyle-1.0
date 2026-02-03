import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../database.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken);

// Hent alle kostnadsposter (globale - tilgjengelige for alle)
router.get('/', (req: AuthRequest, res: Response) => {
  try {
    const { categoryId } = req.query;

    let query = `
      SELECT ci.*, cc.name as category_name, cc.type as category_type
      FROM cost_items ci
      JOIN cost_categories cc ON ci.category_id = cc.id
    `;
    const params: string[] = [];

    if (categoryId) {
      query += ' WHERE ci.category_id = ?';
      params.push(categoryId as string);
    }

    query += ' ORDER BY cc.sort_order, cc.name, ci.sort_order, ci.name';

    const items = db.prepare(query).all(...params);
    res.json({ items });
  } catch (error) {
    console.error('Feil ved henting av kostnadsposter:', error);
    res.status(500).json({ error: 'Kunne ikke hente kostnadsposter' });
  }
});

// Hent kostnadsposter gruppert etter kategori
router.get('/grouped', (req: AuthRequest, res: Response) => {
  try {
    const items = db.prepare(`
      SELECT ci.*, cc.name as category_name, cc.type as category_type
      FROM cost_items ci
      JOIN cost_categories cc ON ci.category_id = cc.id
      ORDER BY cc.sort_order, cc.name, ci.sort_order, ci.name
    `).all() as Array<{
      id: string;
      category_id: string;
      name: string;
      description: string;
      unit: string;
      unit_price: number;
      category_name: string;
      category_type: string;
    }>;

    const grouped = items.reduce((acc, item) => {
      const key = item.category_type;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(item);
      return acc;
    }, {} as Record<string, typeof items>);

    res.json({ items: grouped });
  } catch (error) {
    console.error('Feil ved henting av grupperte kostnadsposter:', error);
    res.status(500).json({ error: 'Kunne ikke hente kostnadsposter' });
  }
});

// Hent én kostnadspost
router.get('/:id', (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const item = db.prepare(`
      SELECT ci.*, cc.name as category_name, cc.type as category_type
      FROM cost_items ci
      JOIN cost_categories cc ON ci.category_id = cc.id
      WHERE ci.id = ?
    `).get(id);

    if (!item) {
      return res.status(404).json({ error: 'Kostnadspost ikke funnet' });
    }

    res.json({ item });
  } catch (error) {
    console.error('Feil ved henting av kostnadspost:', error);
    res.status(500).json({ error: 'Kunne ikke hente kostnadspost' });
  }
});

// Opprett kostnadspost (kun admin kan legge til globale priser)
router.post('/', (req: AuthRequest, res: Response) => {
  try {
    const { categoryId, name, description, unit, unitPrice } = req.body;

    if (!categoryId || !name || !unit || unitPrice === undefined) {
      return res.status(400).json({ error: 'Kategori, navn, enhet og pris er påkrevd' });
    }

    // Sjekk at kategorien finnes
    const category = db.prepare('SELECT id FROM cost_categories WHERE id = ?').get(categoryId);

    if (!category) {
      return res.status(404).json({ error: 'Kategori ikke funnet' });
    }

    const id = uuidv4();
    db.prepare(`
      INSERT INTO cost_items (id, category_id, name, description, unit, unit_price)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, categoryId, name, description || null, unit, unitPrice);

    const item = db.prepare(`
      SELECT ci.*, cc.name as category_name, cc.type as category_type
      FROM cost_items ci
      JOIN cost_categories cc ON ci.category_id = cc.id
      WHERE ci.id = ?
    `).get(id);

    res.status(201).json({ item });
  } catch (error) {
    console.error('Feil ved opprettelse av kostnadspost:', error);
    res.status(500).json({ error: 'Kunne ikke opprette kostnadspost' });
  }
});

// Oppdater kostnadspost
router.put('/:id', (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, unit, unitPrice } = req.body;

    const existing = db.prepare('SELECT id FROM cost_items WHERE id = ?').get(id);

    if (!existing) {
      return res.status(404).json({ error: 'Kostnadspost ikke funnet' });
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
    if (unit !== undefined) {
      updates.push('unit = ?');
      values.push(unit);
    }
    if (unitPrice !== undefined) {
      updates.push('unit_price = ?');
      values.push(unitPrice);
    }

    if (updates.length > 0) {
      updates.push('updated_at = datetime("now")');
      values.push(id);
      db.prepare(`UPDATE cost_items SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    }

    const item = db.prepare(`
      SELECT ci.*, cc.name as category_name, cc.type as category_type
      FROM cost_items ci
      JOIN cost_categories cc ON ci.category_id = cc.id
      WHERE ci.id = ?
    `).get(id);

    res.json({ item });
  } catch (error) {
    console.error('Feil ved oppdatering av kostnadspost:', error);
    res.status(500).json({ error: 'Kunne ikke oppdatere kostnadspost' });
  }
});

// Slett kostnadspost
router.delete('/:id', (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const existing = db.prepare('SELECT id FROM cost_items WHERE id = ?').get(id);

    if (!existing) {
      return res.status(404).json({ error: 'Kostnadspost ikke funnet' });
    }

    db.prepare('DELETE FROM cost_items WHERE id = ?').run(id);
    res.json({ message: 'Kostnadspost slettet' });
  } catch (error) {
    console.error('Feil ved sletting av kostnadspost:', error);
    res.status(500).json({ error: 'Kunne ikke slette kostnadspost' });
  }
});

export default router;
