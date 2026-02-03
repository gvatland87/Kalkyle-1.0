import { Router, Response } from 'express';
import { CostCategory } from '../database.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Hent alle kategorier (globale - tilgjengelig for alle innloggede brukere)
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const categories = await CostCategory.find().sort({ sortOrder: 1, name: 1 });

    res.json({
      categories: categories.map(cat => ({
        id: cat._id,
        name: cat.name,
        type: cat.type,
        sort_order: cat.sortOrder,
        created_at: cat.createdAt
      }))
    });
  } catch (error) {
    console.error('Feil ved henting av kategorier:', error);
    res.status(500).json({ error: 'Kunne ikke hente kategorier' });
  }
});

// Hent én kategori
router.get('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const category = await CostCategory.findById(req.params.id);

    if (!category) {
      return res.status(404).json({ error: 'Kategori ikke funnet' });
    }

    res.json({
      category: {
        id: category._id,
        name: category.name,
        type: category.type,
        sort_order: category.sortOrder,
        created_at: category.createdAt
      }
    });
  } catch (error) {
    console.error('Feil ved henting av kategori:', error);
    res.status(500).json({ error: 'Kunne ikke hente kategori' });
  }
});

export default router;
