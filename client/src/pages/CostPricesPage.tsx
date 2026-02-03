import { useState, useEffect } from 'react';
import api from '../services/api';

interface Category {
  id: string;
  name: string;
  type: string;
}

interface CostItem {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  unit: string;
  unit_price: number;
  category_name: string;
  category_type: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  labor: 'Arbeid',
  material: 'Materialer',
  consumable: 'Forbruksmateriell',
  transport: 'Transport',
  ndt: 'NDT'
};

export default function CostPricesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<CostItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<CostItem | null>(null);

  // Form state
  const [itemForm, setItemForm] = useState({
    categoryId: '',
    name: '',
    description: '',
    unit: '',
    unitPrice: 0
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [catResponse, itemResponse] = await Promise.all([
        api.get('/categories'),
        api.get('/cost-items')
      ]);
      setCategories(catResponse.data.categories || []);
      setItems(itemResponse.data.items || []);
    } catch (error) {
      console.error('Feil ved lasting:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = selectedCategory
    ? items.filter(item => item.category_id === selectedCategory)
    : items;

  // Item handlers
  const openItemModal = (item?: CostItem) => {
    if (item) {
      setEditingItem(item);
      setItemForm({
        categoryId: item.category_id,
        name: item.name,
        description: item.description || '',
        unit: item.unit,
        unitPrice: item.unit_price
      });
    } else {
      setEditingItem(null);
      const defaultCat = selectedCategory || categories[0]?.id || '';
      setItemForm({
        categoryId: defaultCat,
        name: '',
        description: '',
        unit: 'timer',
        unitPrice: 0
      });
    }
    setShowItemModal(true);
  };

  const saveItem = async () => {
    try {
      if (editingItem) {
        await api.put(`/cost-items/${editingItem.id}`, {
          name: itemForm.name,
          description: itemForm.description,
          unit: itemForm.unit,
          unitPrice: itemForm.unitPrice
        });
      } else {
        await api.post('/cost-items', {
          categoryId: itemForm.categoryId,
          name: itemForm.name,
          description: itemForm.description || undefined,
          unit: itemForm.unit,
          unitPrice: itemForm.unitPrice
        });
      }
      await loadData();
      setShowItemModal(false);
    } catch (error) {
      alert('Feil ved lagring');
    }
  };

  const deleteItem = async (id: string) => {
    if (!confirm('Er du sikker på at du vil slette denne posten?')) return;
    try {
      await api.delete(`/cost-items/${id}`);
      await loadData();
    } catch (error) {
      alert('Feil ved sletting');
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
        <h1 className="text-2xl font-bold text-gray-900">Kostpriser</h1>
        <button
          onClick={() => openItemModal()}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          + Ny kostpris
        </button>
      </div>

      <p className="text-gray-600">
        Kostpriser er globale og deles av alle brukere. Legg til priser for arbeid, materialer og annet.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Kategoriliste */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="font-semibold text-gray-900 mb-4">Kategorier</h2>
            <div className="space-y-1">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                  !selectedCategory
                    ? 'bg-blue-100 text-blue-700'
                    : 'hover:bg-gray-100'
                }`}
              >
                Alle ({items.length})
              </button>
              {categories.map(cat => {
                const count = items.filter(i => i.category_id === cat.id).length;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                      selectedCategory === cat.id
                        ? 'bg-blue-100 text-blue-700'
                        : 'hover:bg-gray-100'
                    }`}
                  >
                    {cat.name} ({count})
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Kostprisliste */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900">
                Kostpriser
                {selectedCategory && categories.find(c => c.id === selectedCategory) && (
                  <span className="font-normal text-gray-500">
                    {' '}/ {categories.find(c => c.id === selectedCategory)?.name}
                  </span>
                )}
              </h2>
            </div>

            {filteredItems.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <p className="text-gray-500">
                  Ingen kostpriser funnet.{' '}
                  <button onClick={() => openItemModal()} className="text-blue-600 hover:underline">
                    Legg til en ny
                  </button>
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Navn</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kategori</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Enhet</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Pris</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase w-24">Handlinger</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredItems.map(item => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-medium text-gray-900">{item.name}</p>
                            {item.description && (
                              <p className="text-sm text-gray-500">{item.description}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {item.category_name}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">{item.unit}</td>
                        <td className="px-6 py-4 text-sm text-gray-900 text-right font-medium">
                          {item.unit_price.toLocaleString('nb-NO')} kr
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => openItemModal(item)}
                            className="text-blue-600 hover:text-blue-800 mr-3"
                            title="Rediger"
                          >
                            Rediger
                          </button>
                          <button
                            onClick={() => deleteItem(item.id)}
                            className="text-red-600 hover:text-red-800"
                            title="Slett"
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
      </div>

      {/* Item Modal */}
      {showItemModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 p-6">
            <h3 className="text-lg font-semibold mb-4">
              {editingItem ? 'Rediger kostpris' : 'Ny kostpris'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={itemForm.categoryId}
                  onChange={(e) => setItemForm({ ...itemForm, categoryId: e.target.value })}
                  disabled={!!editingItem}
                >
                  <option value="">Velg kategori</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name} ({CATEGORY_LABELS[cat.type] || cat.type})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Navn</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={itemForm.name}
                  onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                  placeholder="Postnavn"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Beskrivelse (valgfritt)</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={itemForm.description}
                  onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                  placeholder="Kort beskrivelse"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Enhet</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={itemForm.unit}
                    onChange={(e) => setItemForm({ ...itemForm, unit: e.target.value })}
                    placeholder="f.eks. timer, kg, stk"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pris per enhet (kr)</label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={itemForm.unitPrice}
                    onChange={(e) => setItemForm({ ...itemForm, unitPrice: parseFloat(e.target.value) || 0 })}
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowItemModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Avbryt
              </button>
              <button
                onClick={saveItem}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Lagre
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
