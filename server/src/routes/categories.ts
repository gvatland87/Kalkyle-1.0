import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../database.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Alle ruter krever autentisering
router.use(authenticateToken);

// Hent alle kategorier for bruker
router.get('/', (req: AuthRequest, res: Response) => {
  try {
    const categories = db.prepare(`
      SELECT id, name, type, created_at
      FROM cost_categories
      WHERE user_id = ?
      ORDER BY type, name
    `).all(req.userId);

    res.json({ categories });
  } catch (error) {
    console.error('Feil ved henting av kategorier:', error);
    res.status(500).json({ error: 'Kunne ikke hente kategorier' });
  }
});

// Hent kategorier gruppert etter type
router.get('/grouped', (req: AuthRequest, res: Response) => {
  try {
    const categories = db.prepare(`
      SELECT id, name, type, created_at
      FROM cost_categories
      WHERE user_id = ?
      ORDER BY type, name
    `).all(req.userId) as { id: string; name: string; type: string; created_at: string }[];

    const grouped = categories.reduce((acc, cat) => {
      if (!acc[cat.type]) {
        acc[cat.type] = [];
      }
      acc[cat.type].push(cat);
      return acc;
    }, {} as Record<string, typeof categories>);

    res.json({ categories: grouped });
  } catch (error) {
    console.error('Feil ved henting av grupperte kategorier:', error);
    res.status(500).json({ error: 'Kunne ikke hente kategorier' });
  }
});

// Opprett kategori
router.post('/', (req: AuthRequest, res: Response) => {
  try {
    const { name, type } = req.body;

    if (!name || !type) {
      return res.status(400).json({ error: 'Navn og type er påkrevd' });
    }

    const validTypes = ['labor', 'material', 'consumable', 'transport', 'ndt'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: 'Ugyldig kategoritype' });
    }

    const id = uuidv4();
    db.prepare(`
      INSERT INTO cost_categories (id, user_id, name, type)
      VALUES (?, ?, ?, ?)
    `).run(id, req.userId, name, type);

    const category = db.prepare('SELECT * FROM cost_categories WHERE id = ?').get(id);
    res.status(201).json({ category });
  } catch (error) {
    console.error('Feil ved opprettelse av kategori:', error);
    res.status(500).json({ error: 'Kunne ikke opprette kategori' });
  }
});

// Oppdater kategori
router.put('/:id', (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, type } = req.body;

    // Sjekk at kategorien tilhører brukeren
    const existing = db.prepare(`
      SELECT id FROM cost_categories WHERE id = ? AND user_id = ?
    `).get(id, req.userId);

    if (!existing) {
      return res.status(404).json({ error: 'Kategori ikke funnet' });
    }

    const updates: string[] = [];
    const values: string[] = [];

    if (name) {
      updates.push('name = ?');
      values.push(name);
    }
    if (type) {
      const validTypes = ['labor', 'material', 'consumable', 'transport', 'ndt'];
      if (!validTypes.includes(type)) {
        return res.status(400).json({ error: 'Ugyldig kategoritype' });
      }
      updates.push('type = ?');
      values.push(type);
    }

    if (updates.length > 0) {
      values.push(id);
      db.prepare(`UPDATE cost_categories SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    }

    const category = db.prepare('SELECT * FROM cost_categories WHERE id = ?').get(id);
    res.json({ category });
  } catch (error) {
    console.error('Feil ved oppdatering av kategori:', error);
    res.status(500).json({ error: 'Kunne ikke oppdatere kategori' });
  }
});

// Slett kategori
router.delete('/:id', (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Sjekk at kategorien tilhører brukeren
    const existing = db.prepare(`
      SELECT id FROM cost_categories WHERE id = ? AND user_id = ?
    `).get(id, req.userId);

    if (!existing) {
      return res.status(404).json({ error: 'Kategori ikke funnet' });
    }

    // Sjekk om det finnes kostnadsposter
    const itemCount = db.prepare(`
      SELECT COUNT(*) as count FROM cost_items WHERE category_id = ?
    `).get(id) as { count: number };

    if (itemCount.count > 0) {
      return res.status(400).json({
        error: 'Kan ikke slette kategori med kostnadsposter. Slett postene først.'
      });
    }

    db.prepare('DELETE FROM cost_categories WHERE id = ?').run(id);
    res.json({ message: 'Kategori slettet' });
  } catch (error) {
    console.error('Feil ved sletting av kategori:', error);
    res.status(500).json({ error: 'Kunne ikke slette kategori' });
  }
});

export default router;
