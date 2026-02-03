import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import db from '../database.js';
import { generateToken, authenticateToken, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Registrer ny bruker
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body;

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
      INSERT INTO users (id, email, password_hash, name)
      VALUES (?, ?, ?, ?)
    `).run(userId, email, passwordHash, name);

    const token = generateToken(userId, 'user');

    res.status(201).json({
      message: 'Bruker opprettet',
      token,
      user: { id: userId, email, name, role: 'user' }
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
      SELECT id, email, password_hash, name, role
      FROM users WHERE email = ?
    `).get(email) as { id: string; email: string; password_hash: string; name: string; role: string } | undefined;

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
      SELECT id, email, name, role, created_at
      FROM users WHERE id = ?
    `).get(req.userId) as { id: string; email: string; name: string; role: string; created_at: string } | undefined;

    if (!user) {
      return res.status(404).json({ error: 'Bruker ikke funnet' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Feil ved henting av bruker:', error);
    res.status(500).json({ error: 'Kunne ikke hente brukerinfo' });
  }
});

export default router;
