import { Router, Response } from 'express';
import { CostItem, CostCategory } from '../database.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken);

// Hent alle kostnadsposter (globale - tilgjengelige for alle)
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { categoryId } = req.query;

    let query: any = {};
    if (categoryId) {
      query.categoryId = categoryId;
    }

    const items = await CostItem.find(query)
      .populate('categoryId', 'name type sortOrder')
      .sort({ sortOrder: 1, name: 1 });

    res.json({
      items: items.map(item => ({
        id: item._id,
        category_id: item.categoryId?._id || item.categoryId,
        name: item.name,
        description: item.description,
        unit: item.unit,
        unit_price: item.unitPrice,
        category_name: (item.categoryId as any)?.name || '',
        category_type: (item.categoryId as any)?.type || '',
        created_at: item.createdAt,
        updated_at: item.updatedAt
      }))
    });
  } catch (error) {
    console.error('Feil ved henting av kostnadsposter:', error);
    res.status(500).json({ error: 'Kunne ikke hente kostnadsposter' });
  }
});

// Hent kostnadsposter gruppert etter kategori
router.get('/grouped', async (req: AuthRequest, res: Response) => {
  try {
    const items = await CostItem.find()
      .populate('categoryId', 'name type sortOrder')
      .sort({ sortOrder: 1, name: 1 });

    const grouped = items.reduce((acc, item) => {
      const categoryType = (item.categoryId as any)?.type || 'unknown';
      if (!acc[categoryType]) {
        acc[categoryType] = [];
      }
      acc[categoryType].push({
        id: item._id,
        category_id: item.categoryId?._id || item.categoryId,
        name: item.name,
        description: item.description,
        unit: item.unit,
        unit_price: item.unitPrice,
        category_name: (item.categoryId as any)?.name || '',
        category_type: categoryType
      });
      return acc;
    }, {} as Record<string, any[]>);

    res.json({ items: grouped });
  } catch (error) {
    console.error('Feil ved henting av grupperte kostnadsposter:', error);
    res.status(500).json({ error: 'Kunne ikke hente kostnadsposter' });
  }
});

// Hent én kostnadspost
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const item = await CostItem.findById(req.params.id)
      .populate('categoryId', 'name type');

    if (!item) {
      return res.status(404).json({ error: 'Kostnadspost ikke funnet' });
    }

    res.json({
      item: {
        id: item._id,
        category_id: item.categoryId?._id || item.categoryId,
        name: item.name,
        description: item.description,
        unit: item.unit,
        unit_price: item.unitPrice,
        category_name: (item.categoryId as any)?.name || '',
        category_type: (item.categoryId as any)?.type || ''
      }
    });
  } catch (error) {
    console.error('Feil ved henting av kostnadspost:', error);
    res.status(500).json({ error: 'Kunne ikke hente kostnadspost' });
  }
});

// Opprett kostnadspost
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { categoryId, name, description, unit, unitPrice } = req.body;

    if (!categoryId || !name || !unit || unitPrice === undefined) {
      return res.status(400).json({ error: 'Kategori, navn, enhet og pris er påkrevd' });
    }

    // Sjekk at kategorien finnes
    const category = await CostCategory.findById(categoryId);
    if (!category) {
      return res.status(404).json({ error: 'Kategori ikke funnet' });
    }

    const item = new CostItem({
      categoryId,
      name,
      description: description || null,
      unit,
      unitPrice
    });
    await item.save();

    res.status(201).json({
      item: {
        id: item._id,
        category_id: categoryId,
        name: item.name,
        description: item.description,
        unit: item.unit,
        unit_price: item.unitPrice,
        category_name: category.name,
        category_type: category.type
      }
    });
  } catch (error) {
    console.error('Feil ved opprettelse av kostnadspost:', error);
    res.status(500).json({ error: 'Kunne ikke opprette kostnadspost' });
  }
});

// Oppdater kostnadspost
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, unit, unitPrice } = req.body;

    const item = await CostItem.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ error: 'Kostnadspost ikke funnet' });
    }

    if (name !== undefined) item.name = name;
    if (description !== undefined) item.description = description || undefined;
    if (unit !== undefined) item.unit = unit;
    if (unitPrice !== undefined) item.unitPrice = unitPrice;
    item.updatedAt = new Date();

    await item.save();

    const category = await CostCategory.findById(item.categoryId);

    res.json({
      item: {
        id: item._id,
        category_id: item.categoryId,
        name: item.name,
        description: item.description,
        unit: item.unit,
        unit_price: item.unitPrice,
        category_name: category?.name || '',
        category_type: category?.type || ''
      }
    });
  } catch (error) {
    console.error('Feil ved oppdatering av kostnadspost:', error);
    res.status(500).json({ error: 'Kunne ikke oppdatere kostnadspost' });
  }
});

// Slett kostnadspost
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const item = await CostItem.findByIdAndDelete(req.params.id);

    if (!item) {
      return res.status(404).json({ error: 'Kostnadspost ikke funnet' });
    }

    res.json({ message: 'Kostnadspost slettet' });
  } catch (error) {
    console.error('Feil ved sletting av kostnadspost:', error);
    res.status(500).json({ error: 'Kunne ikke slette kostnadspost' });
  }
});

export default router;
