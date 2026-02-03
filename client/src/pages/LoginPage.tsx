import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, error } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const success = await login(email, password);
    if (success) {
      navigate('/');
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-steel-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h1 className="text-center text-4xl font-bold text-steel-800">Kalkyle 1.0</h1>
          <p className="mt-2 text-center text-steel-600">Kalkulasjonssystem for stålindustri</p>
          <h2 className="mt-6 text-center text-2xl font-semibold text-steel-900">
            Logg inn
          </h2>
        </div>

        <form className="mt-8 space-y-6 card" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="label">E-postadresse</label>
              <input
                id="email"
                type="email"
                required
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="din@epost.no"
              />
            </div>

            <div>
              <label htmlFor="password" className="label">Passord</label>
              <input
                id="password"
                type="password"
                required
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="********"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary w-full"
          >
            {loading ? 'Logger inn...' : 'Logg inn'}
          </button>

          <p className="text-center text-sm text-steel-600">
            Har du ikke konto?{' '}
            <Link to="/register" className="text-primary-600 hover:text-primary-700 font-medium">
              Registrer deg
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
