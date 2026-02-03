import { Router, Response } from 'express';
import db from '../database.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Hent alle kategorier (globale - tilgjengelig for alle innloggede brukere)
router.get('/', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const categories = db.prepare(`
      SELECT * FROM cost_categories ORDER BY sort_order, name
    `).all();

    res.json({ categories });
  } catch (error) {
    console.error('Feil ved henting av kategorier:', error);
    res.status(500).json({ error: 'Kunne ikke hente kategorier' });
  }
});

// Hent én kategori
router.get('/:id', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const category = db.prepare('SELECT * FROM cost_categories WHERE id = ?').get(req.params.id);

    if (!category) {
      return res.status(404).json({ error: 'Kategori ikke funnet' });
    }

    res.json({ category });
  } catch (error) {
    console.error('Feil ved henting av kategori:', error);
    res.status(500).json({ error: 'Kunne ikke hente kategori' });
  }
});

export default router;
