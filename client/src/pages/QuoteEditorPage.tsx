import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Quote, QuoteLine, CostItem, QuoteSummary, CategoryType, CATEGORY_LABELS, QUOTE_STATUS_LABELS, QuoteStatus } from '../types';

export default function QuoteEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id || id === 'ny';

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [lines, setLines] = useState<QuoteLine[]>([]);
  const [costItems, setCostItems] = useState<CostItem[]>([]);
  const [summary, setSummary] = useState<QuoteSummary | null>(null);

  // Form state
  const [form, setForm] = useState({
    customerName: '',
    customerEmail: '',
    customerAddress: '',
    projectName: '',
    projectDescription: '',
    reference: '',
    validUntil: '',
    markupPercent: 0,
    notes: '',
    terms: ''
  });

  // Line modal
  const [showLineModal, setShowLineModal] = useState(false);
  const [editingLine, setEditingLine] = useState<QuoteLine | null>(null);
  const [lineForm, setLineForm] = useState({
    costItemId: '',
    categoryType: 'labor' as CategoryType,
    description: '',
    quantity: 1,
    unit: '',
    unitPrice: 0,
    lineMarkup: 0
  });

  useEffect(() => {
    loadCostItems();
    if (!isNew && id) {
      loadQuote(id);
    }
  }, [id, isNew]);

  const loadCostItems = async () => {
    try {
      const { items } = await api.getCostItems();
      setCostItems(items);
    } catch (error) {
      console.error('Feil ved lasting av kostpriser:', error);
    }
  };

  const loadQuote = async (quoteId: string) => {
    try {
      const { quote, lines } = await api.getQuote(quoteId);
      setQuote(quote);
      setLines(lines);
      setForm({
        customerName: quote.customer_name,
        customerEmail: quote.customer_email || '',
        customerAddress: quote.customer_address || '',
        projectName: quote.project_name,
        projectDescription: quote.project_description || '',
        reference: quote.reference || '',
        validUntil: quote.valid_until || '',
        markupPercent: quote.markup_percent,
        notes: quote.notes || '',
        terms: quote.terms || ''
      });
      await loadSummary(quoteId);
    } catch (error) {
      console.error('Feil ved lasting av tilbud:', error);
      navigate('/tilbud');
    } finally {
      setLoading(false);
    }
  };

  const loadSummary = async (quoteId: string) => {
    try {
      const summaryData = await api.getQuoteSummary(quoteId);
      setSummary(summaryData);
    } catch (error) {
      console.error('Feil ved lasting av sammendrag:', error);
    }
  };

  const saveQuote = async () => {
    if (!form.customerName || !form.projectName) {
      alert('Kundenavn og prosjektnavn er påkrevd');
      return;
    }

    setSaving(true);
    try {
      if (isNew) {
        const { quote: newQuote } = await api.createQuote({
          customerName: form.customerName,
          customerEmail: form.customerEmail || undefined,
          customerAddress: form.customerAddress || undefined,
          projectName: form.projectName,
          projectDescription: form.projectDescription || undefined,
          reference: form.reference || undefined,
          validUntil: form.validUntil || undefined,
          markupPercent: form.markupPercent,
          notes: form.notes || undefined,
          terms: form.terms || undefined
        });
        navigate(`/tilbud/${newQuote.id}`, { replace: true });
      } else if (quote) {
        await api.updateQuote(quote.id, {
          customerName: form.customerName,
          customerEmail: form.customerEmail || undefined,
          customerAddress: form.customerAddress || undefined,
          projectName: form.projectName,
          projectDescription: form.projectDescription || undefined,
          reference: form.reference || undefined,
          validUntil: form.validUntil || undefined,
          markupPercent: form.markupPercent,
          notes: form.notes || undefined,
          terms: form.terms || undefined
        });
        await loadQuote(quote.id);
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Feil ved lagring');
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (status: QuoteStatus) => {
    if (!quote) return;
    try {
      await api.updateQuote(quote.id, { status });
      await loadQuote(quote.id);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Feil ved oppdatering');
    }
  };

  // Line handlers
  const openLineModal = (line?: QuoteLine) => {
    if (line) {
      setEditingLine(line);
      setLineForm({
        costItemId: line.cost_item_id || '',
        categoryType: line.category_type,
        description: line.description,
        quantity: line.quantity,
        unit: line.unit,
        unitPrice: line.unit_price,
        lineMarkup: line.line_markup
      });
    } else {
      setEditingLine(null);
      setLineForm({
        costItemId: '',
        categoryType: 'labor',
        description: '',
        quantity: 1,
        unit: 'timer',
        unitPrice: 0,
        lineMarkup: 0
      });
    }
    setShowLineModal(true);
  };

  const selectCostItem = (itemId: string) => {
    const item = costItems.find(i => i.id === itemId);
    if (item) {
      setLineForm({
        ...lineForm,
        costItemId: itemId,
        categoryType: item.category_type as CategoryType,
        description: item.name,
        unit: item.unit,
        unitPrice: item.unit_price
      });
    }
  };

  const saveLine = async () => {
    if (!quote) return;
    if (!lineForm.description || !lineForm.unit || lineForm.quantity <= 0) {
      alert('Beskrivelse, enhet og antall er påkrevd');
      return;
    }

    try {
      if (editingLine) {
        await api.updateQuoteLine(quote.id, editingLine.id, {
          description: lineForm.description,
          quantity: lineForm.quantity,
          unit: lineForm.unit,
          unitPrice: lineForm.unitPrice,
          lineMarkup: lineForm.lineMarkup
        });
      } else {
        await api.addQuoteLine(quote.id, {
          costItemId: lineForm.costItemId || undefined,
          categoryType: lineForm.categoryType,
          description: lineForm.description,
          quantity: lineForm.quantity,
          unit: lineForm.unit,
          unitPrice: lineForm.unitPrice,
          lineMarkup: lineForm.lineMarkup
        });
      }
      await loadQuote(quote.id);
      setShowLineModal(false);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Feil ved lagring');
    }
  };

  const deleteLine = async (lineId: string) => {
    if (!quote) return;
    if (!confirm('Er du sikker på at du vil slette denne linjen?')) return;
    try {
      await api.deleteQuoteLine(quote.id, lineId);
      await loadQuote(quote.id);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Feil ved sletting');
    }
  };

  const downloadPdf = async (detailed: boolean = false) => {
    if (!quote) return;
    try {
      const blob = await api.downloadQuotePdf(quote.id, detailed);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Tilbud-${quote.quote_number}${detailed ? '-detaljert' : ''}.pdf`;
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
      minimumFractionDigits: 2
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-steel-900">
            {isNew ? 'Nytt tilbud' : `Tilbud ${quote?.quote_number}`}
          </h1>
          {quote && (
            <p className="text-steel-500">
              Opprettet {new Date(quote.created_at).toLocaleDateString('nb-NO')}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {quote && (
            <>
              <select
                value={quote.status}
                onChange={(e) => updateStatus(e.target.value as QuoteStatus)}
                className="input w-auto"
              >
                {(Object.keys(QUOTE_STATUS_LABELS) as QuoteStatus[]).map(status => (
                  <option key={status} value={status}>{QUOTE_STATUS_LABELS[status]}</option>
                ))}
              </select>
              <button onClick={() => downloadPdf(false)} className="btn btn-secondary">
                PDF
              </button>
              <button onClick={() => downloadPdf(true)} className="btn btn-secondary">
                Detaljert PDF
              </button>
            </>
          )}
          <button onClick={saveQuote} disabled={saving} className="btn btn-primary">
            {saving ? 'Lagrer...' : 'Lagre'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tilbudsinfo */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Kundeinformasjon</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Kundenavn *</label>
                <input
                  type="text"
                  className="input"
                  value={form.customerName}
                  onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                  placeholder="Bedrift AS"
                />
              </div>
              <div>
                <label className="label">E-post</label>
                <input
                  type="email"
                  className="input"
                  value={form.customerEmail}
                  onChange={(e) => setForm({ ...form, customerEmail: e.target.value })}
                  placeholder="kontakt@bedrift.no"
                />
              </div>
              <div className="md:col-span-2">
                <label className="label">Adresse</label>
                <input
                  type="text"
                  className="input"
                  value={form.customerAddress}
                  onChange={(e) => setForm({ ...form, customerAddress: e.target.value })}
                  placeholder="Gateadresse, postnr og sted"
                />
              </div>
            </div>
          </div>

          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Prosjektinformasjon</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Prosjektnavn *</label>
                <input
                  type="text"
                  className="input"
                  value={form.projectName}
                  onChange={(e) => setForm({ ...form, projectName: e.target.value })}
                  placeholder="Prosjekttittel"
                />
              </div>
              <div>
                <label className="label">Referanse</label>
                <input
                  type="text"
                  className="input"
                  value={form.reference}
                  onChange={(e) => setForm({ ...form, reference: e.target.value })}
                  placeholder="Kundens referanse"
                />
              </div>
              <div className="md:col-span-2">
                <label className="label">Beskrivelse</label>
                <textarea
                  className="input"
                  rows={3}
                  value={form.projectDescription}
                  onChange={(e) => setForm({ ...form, projectDescription: e.target.value })}
                  placeholder="Kort beskrivelse av prosjektet"
                />
              </div>
              <div>
                <label className="label">Gyldig til</label>
                <input
                  type="date"
                  className="input"
                  value={form.validUntil}
                  onChange={(e) => setForm({ ...form, validUntil: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Påslag (%)</label>
                <input
                  type="number"
                  className="input"
                  value={form.markupPercent}
                  onChange={(e) => setForm({ ...form, markupPercent: parseFloat(e.target.value) || 0 })}
                  min="0"
                  step="0.1"
                />
              </div>
            </div>
          </div>

          {/* Linjer */}
          {!isNew && (
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Tilbudslinjer</h2>
                <button onClick={() => openLineModal()} className="btn btn-primary">
                  Legg til linje
                </button>
              </div>

              {lines.length === 0 ? (
                <p className="text-steel-500 text-center py-8">
                  Ingen linjer ennå. Klikk &quot;Legg til linje&quot; for å starte.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="table-header">
                        <th className="table-cell">Type</th>
                        <th className="table-cell">Beskrivelse</th>
                        <th className="table-cell text-right">Antall</th>
                        <th className="table-cell">Enhet</th>
                        <th className="table-cell text-right">Pris</th>
                        <th className="table-cell text-right">Sum</th>
                        <th className="table-cell w-20"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {lines.map(line => (
                        <tr key={line.id} className="hover:bg-steel-50">
                          <td className="table-cell">
                            <span className="text-xs bg-steel-100 px-2 py-1 rounded">
                              {CATEGORY_LABELS[line.category_type]}
                            </span>
                          </td>
                          <td className="table-cell">{line.description}</td>
                          <td className="table-cell text-right">{line.quantity}</td>
                          <td className="table-cell">{line.unit}</td>
                          <td className="table-cell text-right">{formatCurrency(line.unit_price)}</td>
                          <td className="table-cell text-right font-medium">{formatCurrency(line.line_total)}</td>
                          <td className="table-cell">
                            <div className="flex gap-1 justify-end">
                              <button
                                onClick={() => openLineModal(line)}
                                className="p-1 text-steel-400 hover:text-steel-600"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => deleteLine(line.id)}
                                className="p-1 text-steel-400 hover:text-red-600"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          )}

          {/* Notater og vilkår */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Notater og vilkår</h2>
            <div className="space-y-4">
              <div>
                <label className="label">Merknader</label>
                <textarea
                  className="input"
                  rows={3}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Evt. merknader til tilbudet"
                />
              </div>
              <div>
                <label className="label">Vilkår</label>
                <textarea
                  className="input"
                  rows={4}
                  value={form.terms}
                  onChange={(e) => setForm({ ...form, terms: e.target.value })}
                  placeholder="Betalingsbetingelser, leveringsvilkår etc."
                />
              </div>
            </div>
          </div>
        </div>

        {/* Sammendrag */}
        <div className="lg:col-span-1">
          <div className="card sticky top-6">
            <h2 className="text-lg font-semibold mb-4">Sammendrag</h2>

            {!isNew && summary ? (
              <div className="space-y-4">
                {/* Kategoritotaler */}
                <div className="space-y-2">
                  {(Object.keys(CATEGORY_LABELS) as CategoryType[]).map(type => {
                    const total = summary.categoryTotals[type] || 0;
                    if (total === 0) return null;
                    return (
                      <div key={type} className="flex justify-between text-sm">
                        <span className="text-steel-600">{CATEGORY_LABELS[type]}</span>
                        <span>{formatCurrency(total)}</span>
                      </div>
                    );
                  })}
                </div>

                <hr className="border-steel-200" />

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-steel-600">Sum kostnad</span>
                    <span>{formatCurrency(summary.totalCost)}</span>
                  </div>
                  {summary.markupPercent > 0 && (
                    <div className="flex justify-between">
                      <span className="text-steel-600">Påslag ({summary.markupPercent}%)</span>
                      <span>{formatCurrency(summary.markup)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-medium">
                    <span>Sum eks. mva</span>
                    <span>{formatCurrency(summary.totalExVat)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-steel-600">MVA ({summary.vatPercent}%)</span>
                    <span>{formatCurrency(summary.vat)}</span>
                  </div>
                </div>

                <hr className="border-steel-200" />

                <div className="flex justify-between text-lg font-bold">
                  <span>Totalt inkl. mva</span>
                  <span className="text-primary-600">{formatCurrency(summary.totalIncVat)}</span>
                </div>
              </div>
            ) : (
              <p className="text-steel-500 text-sm">
                {isNew
                  ? 'Lagre tilbudet først for å se sammendrag.'
                  : 'Legg til linjer for å se sammendrag.'}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Line Modal */}
      {showLineModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">
              {editingLine ? 'Rediger linje' : 'Legg til linje'}
            </h3>

            <div className="space-y-4">
              {!editingLine && (
                <div>
                  <label className="label">Velg fra kostprisliste (valgfritt)</label>
                  <select
                    className="input"
                    value={lineForm.costItemId}
                    onChange={(e) => selectCostItem(e.target.value)}
                  >
                    <option value="">-- Velg eller skriv manuelt --</option>
                    {(Object.keys(CATEGORY_LABELS) as CategoryType[]).map(type => {
                      const typeItems = costItems.filter(i => i.category_type === type);
                      if (typeItems.length === 0) return null;
                      return (
                        <optgroup key={type} label={CATEGORY_LABELS[type]}>
                          {typeItems.map(item => (
                            <option key={item.id} value={item.id}>
                              {item.name} - {item.unit_price} kr/{item.unit}
                            </option>
                          ))}
                        </optgroup>
                      );
                    })}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Kategori</label>
                  <select
                    className="input"
                    value={lineForm.categoryType}
                    onChange={(e) => setLineForm({ ...lineForm, categoryType: e.target.value as CategoryType })}
                    disabled={!!editingLine}
                  >
                    {(Object.keys(CATEGORY_LABELS) as CategoryType[]).map(type => (
                      <option key={type} value={type}>{CATEGORY_LABELS[type]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Enhet</label>
                  <input
                    type="text"
                    className="input"
                    value={lineForm.unit}
                    onChange={(e) => setLineForm({ ...lineForm, unit: e.target.value })}
                    placeholder="timer, kg, stk"
                  />
                </div>
              </div>

              <div>
                <label className="label">Beskrivelse</label>
                <input
                  type="text"
                  className="input"
                  value={lineForm.description}
                  onChange={(e) => setLineForm({ ...lineForm, description: e.target.value })}
                  placeholder="Beskrivelse av arbeid/materiell"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="label">Antall</label>
                  <input
                    type="number"
                    className="input"
                    value={lineForm.quantity}
                    onChange={(e) => setLineForm({ ...lineForm, quantity: parseFloat(e.target.value) || 0 })}
                    min="0"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="label">Pris per enhet</label>
                  <input
                    type="number"
                    className="input"
                    value={lineForm.unitPrice}
                    onChange={(e) => setLineForm({ ...lineForm, unitPrice: parseFloat(e.target.value) || 0 })}
                    min="0"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="label">Linjepåslag (%)</label>
                  <input
                    type="number"
                    className="input"
                    value={lineForm.lineMarkup}
                    onChange={(e) => setLineForm({ ...lineForm, lineMarkup: parseFloat(e.target.value) || 0 })}
                    min="0"
                    step="0.1"
                  />
                </div>
              </div>

              <div className="bg-steel-50 p-4 rounded-lg">
                <div className="flex justify-between">
                  <span className="text-steel-600">Linjesum:</span>
                  <span className="font-semibold">
                    {formatCurrency(
                      lineForm.quantity * lineForm.unitPrice * (1 + lineForm.lineMarkup / 100)
                    )}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setShowLineModal(false)} className="btn btn-secondary">
                Avbryt
              </button>
              <button onClick={saveLine} className="btn btn-primary">
                {editingLine ? 'Oppdater' : 'Legg til'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
