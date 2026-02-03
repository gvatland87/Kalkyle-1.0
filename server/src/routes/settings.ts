import { Router, Response } from 'express';
import db from '../database.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken);

// Hent bedriftsinnstillinger
router.get('/', (req: AuthRequest, res: Response) => {
  try {
    const settings = db.prepare(`
      SELECT * FROM company_settings WHERE user_id = ?
    `).get(req.userId);

    if (!settings) {
      return res.status(404).json({ error: 'Innstillinger ikke funnet' });
    }

    res.json({ settings });
  } catch (error) {
    console.error('Feil ved henting av innstillinger:', error);
    res.status(500).json({ error: 'Kunne ikke hente innstillinger' });
  }
});

// Oppdater bedriftsinnstillinger
router.put('/', (req: AuthRequest, res: Response) => {
  try {
    const {
      companyName,
      orgNumber,
      address,
      postalCode,
      city,
      phone,
      email,
      website,
      logoUrl,
      defaultTerms,
      defaultValidityDays,
      vatPercent
    } = req.body;

    const existing = db.prepare(`
      SELECT id FROM company_settings WHERE user_id = ?
    `).get(req.userId);

    if (!existing) {
      return res.status(404).json({ error: 'Innstillinger ikke funnet' });
    }

    const updates: string[] = [];
    const values: (string | number | null)[] = [];

    const fields: Record<string, string | number | null | undefined> = {
      company_name: companyName,
      org_number: orgNumber,
      address: address,
      postal_code: postalCode,
      city: city,
      phone: phone,
      email: email,
      website: website,
      logo_url: logoUrl,
      default_terms: defaultTerms,
      default_validity_days: defaultValidityDays,
      vat_percent: vatPercent
    };

    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) {
        updates.push(`${key} = ?`);
        values.push(value ?? null);
      }
    }

    if (updates.length > 0) {
      values.push(req.userId!);
      db.prepare(`UPDATE company_settings SET ${updates.join(', ')} WHERE user_id = ?`).run(...values);
    }

    const settings = db.prepare('SELECT * FROM company_settings WHERE user_id = ?').get(req.userId);
    res.json({ settings });
  } catch (error) {
    console.error('Feil ved oppdatering av innstillinger:', error);
    res.status(500).json({ error: 'Kunne ikke oppdatere innstillinger' });
  }
});

export default router;
