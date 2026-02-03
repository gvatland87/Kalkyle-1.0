import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../database.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken);

// Hent alle kostnadsposter for bruker
router.get('/', (req: AuthRequest, res: Response) => {
  try {
    const { categoryId, type } = req.query;

    let query = `
      SELECT ci.*, cc.name as category_name, cc.type as category_type
      FROM cost_items ci
      JOIN cost_categories cc ON ci.category_id = cc.id
      WHERE cc.user_id = ?
    `;
    const params: (string | undefined)[] = [req.userId];

    if (categoryId) {
      query += ' AND ci.category_id = ?';
      params.push(categoryId as string);
    }

    if (type) {
      query += ' AND cc.type = ?';
      params.push(type as string);
    }

    query += ' ORDER BY cc.type, cc.name, ci.name';

    const items = db.prepare(query).all(...params);
    res.json({ items });
  } catch (error) {
    console.error('Feil ved henting av kostnadsposter:', error);
    res.status(500).json({ error: 'Kunne ikke hente kostnadsposter' });
  }
});

// Hent kostnadsposter gruppert
router.get('/grouped', (req: AuthRequest, res: Response) => {
  try {
    const items = db.prepare(`
      SELECT ci.*, cc.name as category_name, cc.type as category_type
      FROM cost_items ci
      JOIN cost_categories cc ON ci.category_id = cc.id
      WHERE cc.user_id = ?
      ORDER BY cc.type, cc.name, ci.name
    `).all(req.userId) as Array<{
      id: string;
      category_id: string;
      name: string;
      description: string;
      unit: string;
      unit_price: number;
      ndt_method: string | null;
      ndt_level: string | null;
      category_name: string;
      category_type: string;
    }>;

    const grouped = items.reduce((acc, item) => {
      if (!acc[item.category_type]) {
        acc[item.category_type] = {};
      }
      if (!acc[item.category_type][item.category_name]) {
        acc[item.category_type][item.category_name] = [];
      }
      acc[item.category_type][item.category_name].push(item);
      return acc;
    }, {} as Record<string, Record<string, typeof items>>);

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
      WHERE ci.id = ? AND cc.user_id = ?
    `).get(id, req.userId);

    if (!item) {
      return res.status(404).json({ error: 'Kostnadspost ikke funnet' });
    }

    res.json({ item });
  } catch (error) {
    console.error('Feil ved henting av kostnadspost:', error);
    res.status(500).json({ error: 'Kunne ikke hente kostnadspost' });
  }
});

// Opprett kostnadspost
router.post('/', (req: AuthRequest, res: Response) => {
  try {
    const { categoryId, name, description, unit, unitPrice, ndtMethod, ndtLevel } = req.body;

    if (!categoryId || !name || !unit || unitPrice === undefined) {
      return res.status(400).json({ error: 'Kategori, navn, enhet og pris er påkrevd' });
    }

    // Sjekk at kategorien tilhører brukeren
    const category = db.prepare(`
      SELECT id, type FROM cost_categories WHERE id = ? AND user_id = ?
    `).get(categoryId, req.userId) as { id: string; type: string } | undefined;

    if (!category) {
      return res.status(404).json({ error: 'Kategori ikke funnet' });
    }

    // Valider NDT-felt
    if (category.type === 'ndt') {
      const validMethods = ['RT', 'UT', 'MT', 'PT', 'VT'];
      const validLevels = ['Level I', 'Level II', 'Level III'];

      if (ndtMethod && !validMethods.includes(ndtMethod)) {
        return res.status(400).json({ error: 'Ugyldig NDT-metode' });
      }
      if (ndtLevel && !validLevels.includes(ndtLevel)) {
        return res.status(400).json({ error: 'Ugyldig NDT-nivå' });
      }
    }

    const id = uuidv4();
    db.prepare(`
      INSERT INTO cost_items (id, category_id, name, description, unit, unit_price, ndt_method, ndt_level)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, categoryId, name, description || null, unit, unitPrice,
           category.type === 'ndt' ? ndtMethod || null : null,
           category.type === 'ndt' ? ndtLevel || null : null);

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
    const { name, description, unit, unitPrice, ndtMethod, ndtLevel } = req.body;

    // Sjekk at posten tilhører brukeren
    const existing = db.prepare(`
      SELECT ci.id, cc.type as category_type
      FROM cost_items ci
      JOIN cost_categories cc ON ci.category_id = cc.id
      WHERE ci.id = ? AND cc.user_id = ?
    `).get(id, req.userId) as { id: string; category_type: string } | undefined;

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
    if (existing.category_type === 'ndt') {
      if (ndtMethod !== undefined) {
        updates.push('ndt_method = ?');
        values.push(ndtMethod || null);
      }
      if (ndtLevel !== undefined) {
        updates.push('ndt_level = ?');
        values.push(ndtLevel || null);
      }
    }

    if (updates.length > 0) {
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

    // Sjekk at posten tilhører brukeren
    const existing = db.prepare(`
      SELECT ci.id
      FROM cost_items ci
      JOIN cost_categories cc ON ci.category_id = cc.id
      WHERE ci.id = ? AND cc.user_id = ?
    `).get(id, req.userId);

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
