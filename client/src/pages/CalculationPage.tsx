import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';

interface CostItem {
  id: string;
  name: string;
  unit: string;
  unit_price: number;
  category_name: string;
  category_type: string;
}

interface CalculationLine {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  unit_cost: number;
  cost_item_id?: string;
}

interface Calculation {
  id: string;
  name: string;
  description: string;
  target_margin_percent: number;
}

export default function CalculationPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [calculation, setCalculation] = useState<Calculation | null>(null);
  const [lines, setLines] = useState<CalculationLine[]>([]);
  const [costItems, setCostItems] = useState<CostItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state for new calculation
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [targetMargin, setTargetMargin] = useState(15);

  // New line state
  const [selectedCostItem, setSelectedCostItem] = useState('');
  const [newLineDesc, setNewLineDesc] = useState('');
  const [newLineQty, setNewLineQty] = useState(1);
  const [newLineUnit, setNewLineUnit] = useState('stk');
  const [newLineCost, setNewLineCost] = useState(0);

  // Edit line state
  const [editingLineId, setEditingLineId] = useState<string | null>(null);
  const [editLineDesc, setEditLineDesc] = useState('');
  const [editLineQty, setEditLineQty] = useState(1);
  const [editLineUnit, setEditLineUnit] = useState('');
  const [editLineCost, setEditLineCost] = useState(0);

  // Load cost items
  useEffect(() => {
    const loadCostItems = async () => {
      try {
        const response = await api.get('/cost-items');
        setCostItems(response.data.items || []);
      } catch (error) {
        console.error('Feil ved lasting av kostpriser:', error);
      }
    };
    loadCostItems();
  }, []);

  // Load existing calculation if editing
  useEffect(() => {
    const loadCalculation = async () => {
      if (!id) {
        setLoading(false);
        return;
      }

      try {
        const response = await api.get(`/calculations/${id}`);
        setCalculation(response.data.calculation);
        setLines(response.data.lines || []);
        setName(response.data.calculation.name);
        setDescription(response.data.calculation.description || '');
        setTargetMargin(response.data.calculation.target_margin_percent);
      } catch (error) {
        console.error('Feil ved lasting av kalkyle:', error);
        navigate('/');
      } finally {
        setLoading(false);
      }
    };
    loadCalculation();
  }, [id, navigate]);

  // Calculate totals
  const totalCost = lines.reduce((sum, line) => sum + (line.quantity * line.unit_cost), 0);
  const totalSales = targetMargin >= 100 ? 0 : totalCost / (1 - targetMargin / 100);
  const marginAmount = totalSales - totalCost;

  // Handle cost item selection
  const handleCostItemSelect = (itemId: string) => {
    setSelectedCostItem(itemId);
    const item = costItems.find(ci => ci.id === itemId);
    if (item) {
      setNewLineDesc(item.name);
      setNewLineUnit(item.unit);
      setNewLineCost(item.unit_price);
    }
  };

  // Create or save calculation
  const handleSaveCalculation = async () => {
    if (!name.trim()) {
      alert('Vennligst oppgi et navn på kalkylen');
      return;
    }

    setSaving(true);
    try {
      if (calculation) {
        // Update existing
        await api.put(`/calculations/${calculation.id}`, {
          name,
          description,
          targetMarginPercent: targetMargin
        });
      } else {
        // Create new
        const response = await api.post('/calculations', {
          name,
          description,
          targetMarginPercent: targetMargin
        });
        setCalculation(response.data.calculation);
        navigate(`/kalkyle/${response.data.calculation.id}`, { replace: true });
      }
    } catch (error) {
      console.error('Feil ved lagring:', error);
      alert('Kunne ikke lagre kalkyle');
    } finally {
      setSaving(false);
    }
  };

  // Add line
  const handleAddLine = async () => {
    if (!calculation) {
      await handleSaveCalculation();
      return;
    }

    if (!newLineDesc.trim() || newLineQty <= 0 || newLineCost < 0) {
      alert('Vennligst fyll ut alle felt');
      return;
    }

    try {
      const response = await api.post(`/calculations/${calculation.id}/lines`, {
        costItemId: selectedCostItem || null,
        description: newLineDesc,
        quantity: newLineQty,
        unit: newLineUnit,
        unitCost: newLineCost
      });

      setLines([...lines, response.data.line]);

      // Reset form
      setSelectedCostItem('');
      setNewLineDesc('');
      setNewLineQty(1);
      setNewLineUnit('stk');
      setNewLineCost(0);
    } catch (error) {
      console.error('Feil ved opprettelse av linje:', error);
      alert('Kunne ikke legge til linje');
    }
  };

  // Delete line
  const handleDeleteLine = async (lineId: string) => {
    if (!calculation) return;

    try {
      await api.delete(`/calculations/${calculation.id}/lines/${lineId}`);
      setLines(lines.filter(l => l.id !== lineId));
    } catch (error) {
      console.error('Feil ved sletting av linje:', error);
    }
  };

  // Start editing a line
  const handleStartEdit = (line: CalculationLine) => {
    setEditingLineId(line.id);
    setEditLineDesc(line.description);
    setEditLineQty(line.quantity);
    setEditLineUnit(line.unit);
    setEditLineCost(line.unit_cost);
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setEditingLineId(null);
    setEditLineDesc('');
    setEditLineQty(1);
    setEditLineUnit('');
    setEditLineCost(0);
  };

  // Save edited line
  const handleSaveEdit = async () => {
    if (!calculation || !editingLineId) return;

    if (!editLineDesc.trim() || editLineQty <= 0 || editLineCost < 0) {
      alert('Vennligst fyll ut alle felt');
      return;
    }

    try {
      const response = await api.put(`/calculations/${calculation.id}/lines/${editingLineId}`, {
        description: editLineDesc,
        quantity: editLineQty,
        unit: editLineUnit,
        unitCost: editLineCost
      });

      setLines(lines.map(l =>
        l.id === editingLineId
          ? {
              ...l,
              description: response.data.line.description,
              quantity: response.data.line.quantity,
              unit: response.data.line.unit,
              unit_cost: response.data.line.unit_cost
            }
          : l
      ));

      handleCancelEdit();
    } catch (error) {
      console.error('Feil ved oppdatering av linje:', error);
      alert('Kunne ikke oppdatere linje');
    }
  };

  // Update margin
  const handleMarginChange = async (newMargin: number) => {
    setTargetMargin(newMargin);

    if (calculation) {
      try {
        await api.put(`/calculations/${calculation.id}`, {
          targetMarginPercent: newMargin
        });
      } catch (error) {
        console.error('Feil ved oppdatering av DG:', error);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Group cost items by category
  const groupedCostItems = costItems.reduce((acc, item) => {
    const key = item.category_type;
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {} as Record<string, CostItem[]>);

  const categoryLabels: Record<string, string> = {
    labor: 'Arbeid',
    material: 'Materialer',
    consumable: 'Forbruksmateriell',
    transport: 'Transport',
    ndt: 'NDT'
  };

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        {calculation ? 'Rediger Kalkyle' : 'Ny Kalkyle'}
      </h1>

      {/* Calculation header */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Navn på kalkyle *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="F.eks. Prosjekt ABC"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Beskrivelse
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Kort beskrivelse"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ønsket DG %
            </label>
            <input
              type="number"
              value={targetMargin}
              onChange={(e) => handleMarginChange(Number(e.target.value))}
              min="0"
              max="99"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {!calculation && (
          <button
            onClick={handleSaveCalculation}
            disabled={saving || !name.trim()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Lagrer...' : 'Opprett Kalkyle'}
          </button>
        )}
      </div>

      {/* Add line form */}
      {calculation && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Legg til linje</h2>

          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Velg fra kostpriser
              </label>
              <select
                value={selectedCostItem}
                onChange={(e) => handleCostItemSelect(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Velg eller skriv manuelt --</option>
                {Object.entries(groupedCostItems).map(([type, items]) => (
                  <optgroup key={type} label={categoryLabels[type] || type}>
                    {items.map(item => (
                      <option key={item.id} value={item.id}>
                        {item.name} ({item.unit_price} kr/{item.unit})
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Beskrivelse *
              </label>
              <input
                type="text"
                value={newLineDesc}
                onChange={(e) => setNewLineDesc(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Beskrivelse av linje"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Antall
              </label>
              <input
                type="number"
                value={newLineQty}
                onChange={(e) => setNewLineQty(Number(e.target.value))}
                min="0"
                step="0.5"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Enhet
              </label>
              <input
                type="text"
                value={newLineUnit}
                onChange={(e) => setNewLineUnit(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="stk, timer, m"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Enhetskost (kr)
              </label>
              <input
                type="number"
                value={newLineCost}
                onChange={(e) => setNewLineCost(Number(e.target.value))}
                min="0"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={handleAddLine}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                + Legg til
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lines table (spreadsheet style) */}
      {calculation && (
        <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
          <table className="w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Beskrivelse</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Antall</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Enhet</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Enhetskost</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Sum Kost</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Handlinger</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {lines.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    Ingen linjer lagt til enda. Bruk skjemaet over for å legge til linjer.
                  </td>
                </tr>
              ) : (
                lines.map((line) => (
                  <tr key={line.id} className={`hover:bg-gray-50 ${editingLineId === line.id ? 'bg-blue-50' : ''}`}>
                    {editingLineId === line.id ? (
                      <>
                        <td className="px-4 py-2">
                          <input
                            type="text"
                            value={editLineDesc}
                            onChange={(e) => setEditLineDesc(e.target.value)}
                            className="w-full px-2 py-1 border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            value={editLineQty}
                            onChange={(e) => setEditLineQty(Number(e.target.value))}
                            min="0"
                            step="0.5"
                            className="w-20 px-2 py-1 border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-right"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="text"
                            value={editLineUnit}
                            onChange={(e) => setEditLineUnit(e.target.value)}
                            className="w-20 px-2 py-1 border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            value={editLineCost}
                            onChange={(e) => setEditLineCost(Number(e.target.value))}
                            min="0"
                            step="0.01"
                            className="w-24 px-2 py-1 border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-right"
                          />
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900 text-right font-medium">
                          {(editLineQty * editLineCost).toLocaleString('nb-NO', { minimumFractionDigits: 2 })} kr
                        </td>
                        <td className="px-4 py-2 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={handleSaveEdit}
                              className="text-green-600 hover:text-green-800"
                              title="Lagre"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="text-gray-600 hover:text-gray-800"
                              title="Avbryt"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-3 text-sm text-gray-900">{line.description}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-right">{line.quantity}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{line.unit}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-right">
                          {line.unit_cost.toLocaleString('nb-NO', { minimumFractionDigits: 2 })} kr
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">
                          {(line.quantity * line.unit_cost).toLocaleString('nb-NO', { minimumFractionDigits: 2 })} kr
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleStartEdit(line)}
                              className="text-blue-600 hover:text-blue-800"
                              title="Rediger linje"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDeleteLine(line.id)}
                              className="text-red-600 hover:text-red-800"
                              title="Slett linje"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Summary box */}
      {calculation && lines.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Sammendrag</h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-100 rounded-lg p-4">
              <p className="text-sm text-gray-600">Total Kost</p>
              <p className="text-2xl font-bold text-gray-900">
                {totalCost.toLocaleString('nb-NO', { minimumFractionDigits: 2 })} kr
              </p>
            </div>

            <div className="bg-blue-100 rounded-lg p-4">
              <p className="text-sm text-blue-600">DG %</p>
              <p className="text-2xl font-bold text-blue-900">{targetMargin}%</p>
            </div>

            <div className="bg-green-100 rounded-lg p-4">
              <p className="text-sm text-green-600">Salgspris</p>
              <p className="text-2xl font-bold text-green-900">
                {totalSales.toLocaleString('nb-NO', { minimumFractionDigits: 2 })} kr
              </p>
            </div>

            <div className="bg-yellow-100 rounded-lg p-4">
              <p className="text-sm text-yellow-600">Dekningsbidrag</p>
              <p className="text-2xl font-bold text-yellow-900">
                {marginAmount.toLocaleString('nb-NO', { minimumFractionDigits: 2 })} kr
              </p>
            </div>
          </div>

          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">
              <strong>Formel:</strong> Salgspris = Kost / (1 - DG%) = {totalCost.toLocaleString('nb-NO')} / (1 - {targetMargin/100}) = {totalSales.toLocaleString('nb-NO', { minimumFractionDigits: 2 })} kr
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
