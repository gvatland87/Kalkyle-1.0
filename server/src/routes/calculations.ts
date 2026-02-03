import { Router, Response } from 'express';
import { Calculation, CalculationLine } from '../database.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken);

// Hent alle kalkyler for bruker
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const calculations = await Calculation.find({ userId: req.userId })
      .sort({ updatedAt: -1 });

    res.json({
      calculations: calculations.map(calc => ({
        id: calc._id,
        user_id: calc.userId,
        name: calc.name,
        description: calc.description,
        target_margin_percent: calc.targetMarginPercent,
        created_at: calc.createdAt,
        updated_at: calc.updatedAt
      }))
    });
  } catch (error) {
    console.error('Feil ved henting av kalkyler:', error);
    res.status(500).json({ error: 'Kunne ikke hente kalkyler' });
  }
});

// Hent én kalkyle med linjer og summer
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const calculation = await Calculation.findOne({ _id: id, userId: req.userId });

    if (!calculation) {
      return res.status(404).json({ error: 'Kalkyle ikke funnet' });
    }

    const lines = await CalculationLine.find({ calculationId: id })
      .populate('costItemId', 'name')
      .sort({ sortOrder: 1, createdAt: 1 });

    // Beregn summer
    const totalCost = lines.reduce((sum, line) => sum + (line.quantity * line.unitCost), 0);
    const marginPercent = calculation.targetMarginPercent;
    const totalSales = marginPercent >= 100 ? 0 : totalCost / (1 - marginPercent / 100);
    const marginAmount = totalSales - totalCost;

    res.json({
      calculation: {
        id: calculation._id,
        user_id: calculation.userId,
        name: calculation.name,
        description: calculation.description,
        target_margin_percent: calculation.targetMarginPercent,
        created_at: calculation.createdAt,
        updated_at: calculation.updatedAt
      },
      lines: lines.map(line => ({
        id: line._id,
        calculation_id: line.calculationId,
        cost_item_id: line.costItemId?._id || line.costItemId,
        cost_item_name: (line.costItemId as any)?.name || '',
        description: line.description,
        quantity: line.quantity,
        unit: line.unit,
        unit_cost: line.unitCost,
        sort_order: line.sortOrder,
        created_at: line.createdAt
      })),
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
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, targetMarginPercent } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Navn er påkrevd' });
    }

    const calculation = new Calculation({
      userId: req.userId,
      name,
      description: description || null,
      targetMarginPercent: targetMarginPercent || 15
    });
    await calculation.save();

    res.status(201).json({
      calculation: {
        id: calculation._id,
        user_id: calculation.userId,
        name: calculation.name,
        description: calculation.description,
        target_margin_percent: calculation.targetMarginPercent,
        created_at: calculation.createdAt,
        updated_at: calculation.updatedAt
      }
    });
  } catch (error) {
    console.error('Feil ved opprettelse av kalkyle:', error);
    res.status(500).json({ error: 'Kunne ikke opprette kalkyle' });
  }
});

// Oppdater kalkyle (navn, beskrivelse, DG%)
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, targetMarginPercent } = req.body;

    const calculation = await Calculation.findOne({ _id: id, userId: req.userId });

    if (!calculation) {
      return res.status(404).json({ error: 'Kalkyle ikke funnet' });
    }

    if (name !== undefined) calculation.name = name;
    if (description !== undefined) calculation.description = description || undefined;
    if (targetMarginPercent !== undefined) calculation.targetMarginPercent = targetMarginPercent;
    calculation.updatedAt = new Date();

    await calculation.save();

    res.json({
      calculation: {
        id: calculation._id,
        user_id: calculation.userId,
        name: calculation.name,
        description: calculation.description,
        target_margin_percent: calculation.targetMarginPercent,
        created_at: calculation.createdAt,
        updated_at: calculation.updatedAt
      }
    });
  } catch (error) {
    console.error('Feil ved oppdatering av kalkyle:', error);
    res.status(500).json({ error: 'Kunne ikke oppdatere kalkyle' });
  }
});

// Slett kalkyle
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const calculation = await Calculation.findOneAndDelete({ _id: id, userId: req.userId });

    if (!calculation) {
      return res.status(404).json({ error: 'Kalkyle ikke funnet' });
    }

    // Slett alle linjer tilknyttet kalkylen
    await CalculationLine.deleteMany({ calculationId: id });

    res.json({ message: 'Kalkyle slettet' });
  } catch (error) {
    console.error('Feil ved sletting av kalkyle:', error);
    res.status(500).json({ error: 'Kunne ikke slette kalkyle' });
  }
});

// === LINJER ===

// Legg til linje
router.post('/:id/lines', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { costItemId, description, quantity, unit, unitCost } = req.body;

    // Sjekk at kalkylen tilhører brukeren
    const calculation = await Calculation.findOne({ _id: id, userId: req.userId });

    if (!calculation) {
      return res.status(404).json({ error: 'Kalkyle ikke funnet' });
    }

    if (!description || quantity === undefined || !unit || unitCost === undefined) {
      return res.status(400).json({ error: 'Beskrivelse, antall, enhet og enhetskost er påkrevd' });
    }

    // Finn høyeste sort_order
    const maxOrderLine = await CalculationLine.findOne({ calculationId: id })
      .sort({ sortOrder: -1 });
    const nextOrder = (maxOrderLine?.sortOrder || 0) + 1;

    const line = new CalculationLine({
      calculationId: id,
      costItemId: costItemId || null,
      description,
      quantity,
      unit,
      unitCost,
      sortOrder: nextOrder
    });
    await line.save();

    // Oppdater kalkylens updated_at
    calculation.updatedAt = new Date();
    await calculation.save();

    res.status(201).json({
      line: {
        id: line._id,
        calculation_id: line.calculationId,
        cost_item_id: line.costItemId,
        description: line.description,
        quantity: line.quantity,
        unit: line.unit,
        unit_cost: line.unitCost,
        sort_order: line.sortOrder,
        created_at: line.createdAt
      }
    });
  } catch (error) {
    console.error('Feil ved opprettelse av linje:', error);
    res.status(500).json({ error: 'Kunne ikke opprette linje' });
  }
});

// Oppdater linje
router.put('/:id/lines/:lineId', async (req: AuthRequest, res: Response) => {
  try {
    const { id, lineId } = req.params;
    const { description, quantity, unit, unitCost } = req.body;

    // Sjekk at kalkylen tilhører brukeren
    const calculation = await Calculation.findOne({ _id: id, userId: req.userId });

    if (!calculation) {
      return res.status(404).json({ error: 'Kalkyle ikke funnet' });
    }

    const line = await CalculationLine.findOne({ _id: lineId, calculationId: id });

    if (!line) {
      return res.status(404).json({ error: 'Linje ikke funnet' });
    }

    if (description !== undefined) line.description = description;
    if (quantity !== undefined) line.quantity = quantity;
    if (unit !== undefined) line.unit = unit;
    if (unitCost !== undefined) line.unitCost = unitCost;

    await line.save();

    // Oppdater kalkylens updated_at
    calculation.updatedAt = new Date();
    await calculation.save();

    res.json({
      line: {
        id: line._id,
        calculation_id: line.calculationId,
        cost_item_id: line.costItemId,
        description: line.description,
        quantity: line.quantity,
        unit: line.unit,
        unit_cost: line.unitCost,
        sort_order: line.sortOrder,
        created_at: line.createdAt
      }
    });
  } catch (error) {
    console.error('Feil ved oppdatering av linje:', error);
    res.status(500).json({ error: 'Kunne ikke oppdatere linje' });
  }
});

// Slett linje
router.delete('/:id/lines/:lineId', async (req: AuthRequest, res: Response) => {
  try {
    const { id, lineId } = req.params;

    // Sjekk at kalkylen tilhører brukeren
    const calculation = await Calculation.findOne({ _id: id, userId: req.userId });

    if (!calculation) {
      return res.status(404).json({ error: 'Kalkyle ikke funnet' });
    }

    const line = await CalculationLine.findOneAndDelete({ _id: lineId, calculationId: id });

    if (!line) {
      return res.status(404).json({ error: 'Linje ikke funnet' });
    }

    // Oppdater kalkylens updated_at
    calculation.updatedAt = new Date();
    await calculation.save();

    res.json({ message: 'Linje slettet' });
  } catch (error) {
    console.error('Feil ved sletting av linje:', error);
    res.status(500).json({ error: 'Kunne ikke slette linje' });
  }
});

export default router;
