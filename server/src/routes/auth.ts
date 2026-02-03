import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { User } from '../database.js';
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
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'En bruker med denne e-postadressen eksisterer allerede' });
    }

    // Hash passord
    const passwordHash = await bcrypt.hash(password, 10);

    // Opprett bruker
    const user = new User({
      email,
      passwordHash,
      name,
      role: 'user'
    });
    await user.save();

    const token = generateToken(user._id.toString(), 'user');

    res.status(201).json({
      message: 'Bruker opprettet',
      token,
      user: { id: user._id, email: user.email, name: user.name, role: user.role }
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

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({ error: 'Feil e-post eller passord' });
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Feil e-post eller passord' });
    }

    const token = generateToken(user._id.toString(), user.role);

    res.json({
      token,
      user: {
        id: user._id,
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
router.get('/me', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.userId).select('-passwordHash');

    if (!user) {
      return res.status(404).json({ error: 'Bruker ikke funnet' });
    }

    res.json({
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Feil ved henting av bruker:', error);
    res.status(500).json({ error: 'Kunne ikke hente brukerinfo' });
  }
});

export default router;
