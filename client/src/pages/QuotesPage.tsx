import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { Quote, QuoteStatus, QUOTE_STATUS_LABELS } from '../types';

export default function QuotesPage() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<QuoteStatus | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadQuotes();
  }, []);

  const loadQuotes = async () => {
    try {
      const { quotes } = await api.getQuotes();
      setQuotes(quotes);
    } catch (error) {
      console.error('Feil ved lasting:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteQuote = async (id: string) => {
    if (!confirm('Er du sikker på at du vil slette dette tilbudet?')) return;
    try {
      await api.deleteQuote(id);
      await loadQuotes();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Feil ved sletting');
    }
  };

  const downloadPdf = async (id: string, quoteNumber: string) => {
    try {
      const blob = await api.downloadQuotePdf(id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Tilbud-${quoteNumber}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      alert('Kunne ikke laste ned PDF');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('nb-NO', {
      style: 'currency',
      currency: 'NOK',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const filteredQuotes = quotes.filter(quote => {
    if (statusFilter !== 'all' && quote.status !== statusFilter) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        quote.quote_number.toLowerCase().includes(term) ||
        quote.customer_name.toLowerCase().includes(term) ||
        quote.project_name.toLowerCase().includes(term)
      );
    }
    return true;
  });

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
        <h1 className="text-2xl font-bold text-steel-900">Tilbud</h1>
        <Link to="/tilbud/ny" className="btn btn-primary">
          Nytt tilbud
        </Link>
      </div>

      {/* Filtre */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            className="input"
            placeholder="Søk i tilbud..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              statusFilter === 'all'
                ? 'bg-primary-600 text-white'
                : 'bg-white text-steel-600 hover:bg-steel-100'
            }`}
          >
            Alle
          </button>
          {(Object.keys(QUOTE_STATUS_LABELS) as QuoteStatus[]).map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === status
                  ? 'bg-primary-600 text-white'
                  : 'bg-white text-steel-600 hover:bg-steel-100'
              }`}
            >
              {QUOTE_STATUS_LABELS[status]}
            </button>
          ))}
        </div>
      </div>

      {/* Tilbudsliste */}
      <div className="card">
        {filteredQuotes.length === 0 ? (
          <p className="text-steel-500 text-center py-8">
            {quotes.length === 0 ? (
              <>
                Ingen tilbud ennå.{' '}
                <Link to="/tilbud/ny" className="text-primary-600 hover:underline">
                  Opprett ditt første tilbud
                </Link>
              </>
            ) : (
              'Ingen tilbud matcher søket ditt.'
            )}
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
                  <th className="table-cell text-center">Linjer</th>
                  <th className="table-cell text-right">Verdi</th>
                  <th className="table-cell">Gyldig til</th>
                  <th className="table-cell">Opprettet</th>
                  <th className="table-cell w-32"></th>
                </tr>
              </thead>
              <tbody>
                {filteredQuotes.map(quote => (
                  <tr key={quote.id} className="hover:bg-steel-50">
                    <td className="table-cell">
                      <Link
                        to={`/tilbud/${quote.id}`}
                        className="text-primary-600 hover:underline font-medium"
                      >
                        {quote.quote_number}
                      </Link>
                    </td>
                    <td className="table-cell">{quote.customer_name}</td>
                    <td className="table-cell">
                      <div className="max-w-xs truncate">{quote.project_name}</div>
                    </td>
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
                    <td className="table-cell text-center">{quote.line_count || 0}</td>
                    <td className="table-cell text-right font-medium">
                      {formatCurrency(quote.total_cost || 0)}
                    </td>
                    <td className="table-cell text-steel-500">
                      {quote.valid_until
                        ? new Date(quote.valid_until).toLocaleDateString('nb-NO')
                        : '-'}
                    </td>
                    <td className="table-cell text-steel-500">
                      {new Date(quote.created_at).toLocaleDateString('nb-NO')}
                    </td>
                    <td className="table-cell">
                      <div className="flex gap-1 justify-end">
                        <Link
                          to={`/tilbud/${quote.id}`}
                          className="p-1 text-steel-400 hover:text-steel-600"
                          title="Rediger"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </Link>
                        <button
                          onClick={() => downloadPdf(quote.id, quote.quote_number)}
                          className="p-1 text-steel-400 hover:text-steel-600"
                          title="Last ned PDF"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => deleteQuote(quote.id)}
                          className="p-1 text-steel-400 hover:text-red-600"
                          title="Slett"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
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
