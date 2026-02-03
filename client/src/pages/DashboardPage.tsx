import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { Quote, QUOTE_STATUS_LABELS } from '../types';

export default function DashboardPage() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalQuotes: 0,
    drafts: 0,
    sent: 0,
    accepted: 0,
    totalValue: 0
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { quotes } = await api.getQuotes();
      setQuotes(quotes);

      const totalValue = quotes
        .filter((q: Quote) => q.status === 'accepted')
        .reduce((sum: number, q: Quote) => sum + (q.total_cost || 0), 0);

      setStats({
        totalQuotes: quotes.length,
        drafts: quotes.filter((q: Quote) => q.status === 'draft').length,
        sent: quotes.filter((q: Quote) => q.status === 'sent').length,
        accepted: quotes.filter((q: Quote) => q.status === 'accepted').length,
        totalValue
      });
    } catch (error) {
      console.error('Feil ved lasting av data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('nb-NO', {
      style: 'currency',
      currency: 'NOK',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const recentQuotes = quotes.slice(0, 5);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-steel-900">Dashboard</h1>
        <Link to="/tilbud/ny" className="btn btn-primary">
          Nytt tilbud
        </Link>
      </div>

      {/* Statistikk */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-primary-100 rounded-lg">
              <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm text-steel-500">Totalt tilbud</p>
              <p className="text-2xl font-semibold text-steel-900">{stats.totalQuotes}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-yellow-100 rounded-lg">
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm text-steel-500">Utkast</p>
              <p className="text-2xl font-semibold text-steel-900">{stats.drafts}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-lg">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm text-steel-500">Sendt</p>
              <p className="text-2xl font-semibold text-steel-900">{stats.sent}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-lg">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm text-steel-500">Akseptert verdi</p>
              <p className="text-2xl font-semibold text-steel-900">{formatCurrency(stats.totalValue)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Siste tilbud */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-steel-900">Siste tilbud</h2>
          <Link to="/tilbud" className="text-sm text-primary-600 hover:text-primary-700">
            Se alle
          </Link>
        </div>

        {recentQuotes.length === 0 ? (
          <p className="text-steel-500 text-center py-8">
            Ingen tilbud ennå. <Link to="/tilbud/ny" className="text-primary-600 hover:underline">Opprett ditt første tilbud</Link>
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="table-header">
                  <th className="table-cell">Nr.</th>
                  <th className="table-cell">Kunde</th>
                  <th className="table-cell">Prosjekt</th>
                  <th className="table-cell">Status</th>
                  <th className="table-cell text-right">Verdi</th>
                  <th className="table-cell">Dato</th>
                </tr>
              </thead>
              <tbody>
                {recentQuotes.map((quote) => (
                  <tr key={quote.id} className="hover:bg-steel-50">
                    <td className="table-cell">
                      <Link to={`/tilbud/${quote.id}`} className="text-primary-600 hover:underline">
                        {quote.quote_number}
                      </Link>
                    </td>
                    <td className="table-cell">{quote.customer_name}</td>
                    <td className="table-cell">{quote.project_name}</td>
                    <td className="table-cell">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        quote.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                        quote.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                        quote.status === 'accepted' ? 'bg-green-100 text-green-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {QUOTE_STATUS_LABELS[quote.status]}
                      </span>
                    </td>
                    <td className="table-cell text-right">{formatCurrency(quote.total_cost || 0)}</td>
                    <td className="table-cell text-steel-500">
                      {new Date(quote.created_at).toLocaleDateString('nb-NO')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Hurtiglenker */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link to="/kostpriser" className="card hover:shadow-md transition-shadow">
          <div className="flex items-center">
            <div className="p-3 bg-steel-100 rounded-lg">
              <svg className="w-6 h-6 text-steel-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="font-medium text-steel-900">Administrer kostpriser</p>
              <p className="text-sm text-steel-500">Arbeid, materialer, NDT m.m.</p>
            </div>
          </div>
        </Link>

        <Link to="/tilbud/ny" className="card hover:shadow-md transition-shadow">
          <div className="flex items-center">
            <div className="p-3 bg-primary-100 rounded-lg">
              <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="font-medium text-steel-900">Nytt tilbud</p>
              <p className="text-sm text-steel-500">Opprett en ny kalkyle</p>
            </div>
          </div>
        </Link>

        <Link to="/innstillinger" className="card hover:shadow-md transition-shadow">
          <div className="flex items-center">
            <div className="p-3 bg-steel-100 rounded-lg">
              <svg className="w-6 h-6 text-steel-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="font-medium text-steel-900">Innstillinger</p>
              <p className="text-sm text-steel-500">Bedriftsinfo og vilkår</p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
