import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [loading, setLoading] = useState(false);
  const [validationError, setValidationError] = useState('');
  const { register, error } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    if (password !== confirmPassword) {
      setValidationError('Passordene stemmer ikke overens');
      return;
    }

    if (password.length < 6) {
      setValidationError('Passordet må være minst 6 tegn');
      return;
    }

    setLoading(true);

    const success = await register(email, password, name, company || undefined);
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
            Opprett konto
          </h2>
        </div>

        <form className="mt-8 space-y-6 card" onSubmit={handleSubmit}>
          {(error || validationError) && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {validationError || error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="label">Navn</label>
              <input
                id="name"
                type="text"
                required
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ditt navn"
              />
            </div>

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
              <label htmlFor="company" className="label">Bedrift (valgfritt)</label>
              <input
                id="company"
                type="text"
                className="input"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Bedriftsnavn"
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
                placeholder="Minst 6 tegn"
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="label">Bekreft passord</label>
              <input
                id="confirmPassword"
                type="password"
                required
                className="input"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Gjenta passord"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary w-full"
          >
            {loading ? 'Registrerer...' : 'Registrer deg'}
          </button>

          <p className="text-center text-sm text-steel-600">
            Har du allerede konto?{' '}
            <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium">
              Logg inn
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
