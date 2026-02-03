import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

interface Calculation {
  id: string;
  name: string;
  description: string;
  target_margin_percent: number;
  created_at: string;
  updated_at: string;
}

export default function DashboardPage() {
  const [calculations, setCalculations] = useState<Calculation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const response = await api.get('/calculations');
      setCalculations(response.data.calculations || []);
    } catch (error) {
      console.error('Feil ved lasting av data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Er du sikker på at du vil slette denne kalkylen?')) return;

    try {
      await api.delete(`/calculations/${id}`);
      setCalculations(calculations.filter(c => c.id !== id));
    } catch (error) {
      console.error('Feil ved sletting:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <Link
          to="/kalkyle"
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          + Ny Kalkyle
        </Link>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link to="/kostpriser" className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center">
            <div className="p-3 bg-gray-100 rounded-lg">
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="font-medium text-gray-900">Administrer Kostpriser</p>
              <p className="text-sm text-gray-500">Legg til og rediger globale kostpriser</p>
            </div>
          </div>
        </Link>

        <Link to="/kalkyle" className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-lg">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="font-medium text-gray-900">Ny Kalkyle</p>
              <p className="text-sm text-gray-500">Opprett en ny prosjektkalkyle</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Recent calculations */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Mine Kalkyler</h2>
        </div>

        {calculations.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="mt-4 text-gray-500">Ingen kalkyler ennå.</p>
            <Link to="/kalkyle" className="mt-2 inline-block text-blue-600 hover:underline">
              Opprett din første kalkyle
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Navn</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Beskrivelse</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">DG %</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Oppdatert</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Handlinger</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {calculations.map((calc) => (
                  <tr key={calc.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <Link to={`/kalkyle/${calc.id}`} className="text-blue-600 hover:underline font-medium">
                        {calc.name}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {calc.description || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 text-right">
                      {calc.target_margin_percent}%
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(calc.updated_at).toLocaleDateString('nb-NO')}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Link
                        to={`/kalkyle/${calc.id}`}
                        className="text-blue-600 hover:text-blue-800 mr-4"
                      >
                        Åpne
                      </Link>
                      <button
                        onClick={() => handleDelete(calc.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Slett
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
