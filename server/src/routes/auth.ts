import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import db from '../database.js';
import { generateToken, authenticateToken, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Registrer ny bruker
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, name, company } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'E-post, passord og navn er påkrevd' });
    }

    // Sjekk om bruker allerede eksisterer
    const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existingUser) {
      return res.status(400).json({ error: 'En bruker med denne e-postadressen eksisterer allerede' });
    }

    // Hash passord
    const passwordHash = await bcrypt.hash(password, 10);
    const userId = uuidv4();

    // Opprett bruker
    db.prepare(`
      INSERT INTO users (id, email, password_hash, name, company)
      VALUES (?, ?, ?, ?, ?)
    `).run(userId, email, passwordHash, name, company || null);

    // Opprett standard kategorier for brukeren
    const defaultCategories = [
      { name: 'Sveising', type: 'labor' },
      { name: 'Montering', type: 'labor' },
      { name: 'Engineering', type: 'labor' },
      { name: 'Stålmaterialer', type: 'material' },
      { name: 'Rør og profiler', type: 'material' },
      { name: 'Sveiseforbruk', type: 'consumable' },
      { name: 'Slipemateriell', type: 'consumable' },
      { name: 'Transport', type: 'transport' },
      { name: 'Rigg og mobilisering', type: 'transport' },
      { name: 'NDT-tjenester', type: 'ndt' },
    ];

    const insertCategory = db.prepare(`
      INSERT INTO cost_categories (id, user_id, name, type)
      VALUES (?, ?, ?, ?)
    `);

    for (const cat of defaultCategories) {
      insertCategory.run(uuidv4(), userId, cat.name, cat.type);
    }

    // Opprett standard bedriftsinnstillinger
    db.prepare(`
      INSERT INTO company_settings (id, user_id)
      VALUES (?, ?)
    `).run(uuidv4(), userId);

    const token = generateToken(userId, 'user');

    res.status(201).json({
      message: 'Bruker opprettet',
      token,
      user: { id: userId, email, name, company, role: 'user' }
    });
  } catch (error) {
    console.error('Registreringsfeil:', error);
    res.status(500).json({ error: 'Kunne ikke registrere bruker' });
  }
});

// Logg inn
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'E-post og passord er påkrevd' });
    }

    const user = db.prepare(`
      SELECT id, email, password_hash, name, company, role
      FROM users WHERE email = ?
    `).get(email) as { id: string; email: string; password_hash: string; name: string; company: string; role: string } | undefined;

    if (!user) {
      return res.status(401).json({ error: 'Feil e-post eller passord' });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Feil e-post eller passord' });
    }

    const token = generateToken(user.id, user.role);

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        company: user.company,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Innloggingsfeil:', error);
    res.status(500).json({ error: 'Kunne ikke logge inn' });
  }
});

// Hent innlogget bruker
router.get('/me', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const user = db.prepare(`
      SELECT id, email, name, company, role, created_at
      FROM users WHERE id = ?
    `).get(req.userId) as { id: string; email: string; name: string; company: string; role: string; created_at: string } | undefined;

    if (!user) {
      return res.status(404).json({ error: 'Bruker ikke funnet' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Feil ved henting av bruker:', error);
    res.status(500).json({ error: 'Kunne ikke hente brukerinfo' });
  }
});

// Oppdater bruker
router.put('/me', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { name, company, currentPassword, newPassword } = req.body;

    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ error: 'Nåværende passord er påkrevd for å endre passord' });
      }

      const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.userId) as { password_hash: string } | undefined;
      if (!user) {
        return res.status(404).json({ error: 'Bruker ikke funnet' });
      }

      const validPassword = await bcrypt.compare(currentPassword, user.password_hash);
      if (!validPassword) {
        return res.status(401).json({ error: 'Feil nåværende passord' });
      }

      const newPasswordHash = await bcrypt.hash(newPassword, 10);
      db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newPasswordHash, req.userId);
    }

    if (name || company !== undefined) {
      const updates: string[] = [];
      const values: (string | null)[] = [];

      if (name) {
        updates.push('name = ?');
        values.push(name);
      }
      if (company !== undefined) {
        updates.push('company = ?');
        values.push(company || null);
      }

      if (updates.length > 0) {
        values.push(req.userId!);
        db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...values);
      }
    }

    const updatedUser = db.prepare(`
      SELECT id, email, name, company, role
      FROM users WHERE id = ?
    `).get(req.userId);

    res.json({ user: updatedUser });
  } catch (error) {
    console.error('Feil ved oppdatering av bruker:', error);
    res.status(500).json({ error: 'Kunne ikke oppdatere bruker' });
  }
});

export default router;
