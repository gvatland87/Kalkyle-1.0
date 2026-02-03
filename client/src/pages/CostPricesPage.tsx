import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Category, CostItem, CategoryType, CATEGORY_LABELS, NDT_METHODS, NDT_LEVELS } from '../types';

export default function CostPricesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<CostItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<CategoryType | 'all'>('all');
  const [loading, setLoading] = useState(true);

  // Modal states
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingItem, setEditingItem] = useState<CostItem | null>(null);

  // Form states
  const [categoryForm, setCategoryForm] = useState({ name: '', type: 'labor' as CategoryType });
  const [itemForm, setItemForm] = useState({
    categoryId: '',
    name: '',
    description: '',
    unit: '',
    unitPrice: 0,
    ndtMethod: '' as string,
    ndtLevel: '' as string
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [catResponse, itemResponse] = await Promise.all([
        api.getCategories(),
        api.getCostItems()
      ]);
      setCategories(catResponse.categories);
      setItems(itemResponse.items);
    } catch (error) {
      console.error('Feil ved lasting:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCategories = selectedType === 'all'
    ? categories
    : categories.filter(c => c.type === selectedType);

  const filteredItems = items.filter(item => {
    if (selectedCategory && item.category_id !== selectedCategory) return false;
    if (selectedType !== 'all' && item.category_type !== selectedType) return false;
    return true;
  });

  // Category handlers
  const openCategoryModal = (category?: Category) => {
    if (category) {
      setEditingCategory(category);
      setCategoryForm({ name: category.name, type: category.type });
    } else {
      setEditingCategory(null);
      setCategoryForm({ name: '', type: selectedType !== 'all' ? selectedType : 'labor' });
    }
    setShowCategoryModal(true);
  };

  const saveCategory = async () => {
    try {
      if (editingCategory) {
        await api.updateCategory(editingCategory.id, categoryForm);
      } else {
        await api.createCategory(categoryForm.name, categoryForm.type);
      }
      await loadData();
      setShowCategoryModal(false);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Feil ved lagring');
    }
  };

  const deleteCategory = async (id: string) => {
    if (!confirm('Er du sikker på at du vil slette denne kategorien?')) return;
    try {
      await api.deleteCategory(id);
      await loadData();
      if (selectedCategory === id) setSelectedCategory(null);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Feil ved sletting');
    }
  };

  // Item handlers
  const openItemModal = (item?: CostItem) => {
    if (item) {
      setEditingItem(item);
      setItemForm({
        categoryId: item.category_id,
        name: item.name,
        description: item.description || '',
        unit: item.unit,
        unitPrice: item.unit_price,
        ndtMethod: item.ndt_method || '',
        ndtLevel: item.ndt_level || ''
      });
    } else {
      setEditingItem(null);
      const defaultCat = selectedCategory || categories[0]?.id || '';
      setItemForm({
        categoryId: defaultCat,
        name: '',
        description: '',
        unit: 'timer',
        unitPrice: 0,
        ndtMethod: '',
        ndtLevel: ''
      });
    }
    setShowItemModal(true);
  };

  const saveItem = async () => {
    try {
      if (editingItem) {
        await api.updateCostItem(editingItem.id, {
          name: itemForm.name,
          description: itemForm.description,
          unit: itemForm.unit,
          unitPrice: itemForm.unitPrice,
          ndtMethod: itemForm.ndtMethod || undefined,
          ndtLevel: itemForm.ndtLevel || undefined
        });
      } else {
        await api.createCostItem({
          categoryId: itemForm.categoryId,
          name: itemForm.name,
          description: itemForm.description || undefined,
          unit: itemForm.unit,
          unitPrice: itemForm.unitPrice,
          ndtMethod: itemForm.ndtMethod || undefined,
          ndtLevel: itemForm.ndtLevel || undefined
        });
      }
      await loadData();
      setShowItemModal(false);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Feil ved lagring');
    }
  };

  const deleteItem = async (id: string) => {
    if (!confirm('Er du sikker på at du vil slette denne posten?')) return;
    try {
      await api.deleteCostItem(id);
      await loadData();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Feil ved sletting');
    }
  };

  const selectedCategoryObj = categories.find(c => c.id === itemForm.categoryId);
  const isNdtCategory = selectedCategoryObj?.type === 'ndt';

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
        <h1 className="text-2xl font-bold text-steel-900">Kostpriser</h1>
        <div className="flex gap-2">
          <button onClick={() => openCategoryModal()} className="btn btn-secondary">
            Ny kategori
          </button>
          <button onClick={() => openItemModal()} className="btn btn-primary">
            Ny kostpris
          </button>
        </div>
      </div>

      {/* Type filter */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => { setSelectedType('all'); setSelectedCategory(null); }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            selectedType === 'all'
              ? 'bg-primary-600 text-white'
              : 'bg-white text-steel-600 hover:bg-steel-100'
          }`}
        >
          Alle
        </button>
        {(Object.keys(CATEGORY_LABELS) as CategoryType[]).map(type => (
          <button
            key={type}
            onClick={() => { setSelectedType(type); setSelectedCategory(null); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedType === type
                ? 'bg-primary-600 text-white'
                : 'bg-white text-steel-600 hover:bg-steel-100'
            }`}
          >
            {CATEGORY_LABELS[type]}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Kategoriliste */}
        <div className="lg:col-span-1">
          <div className="card">
            <h2 className="font-semibold text-steel-900 mb-4">Kategorier</h2>
            <div className="space-y-1">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                  !selectedCategory
                    ? 'bg-primary-100 text-primary-700'
                    : 'hover:bg-steel-100'
                }`}
              >
                Alle kategorier ({filteredItems.length})
              </button>
              {filteredCategories.map(cat => {
                const count = items.filter(i => i.category_id === cat.id).length;
                return (
                  <div key={cat.id} className="flex items-center group">
                    <button
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`flex-1 text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                        selectedCategory === cat.id
                          ? 'bg-primary-100 text-primary-700'
                          : 'hover:bg-steel-100'
                      }`}
                    >
                      {cat.name} ({count})
                    </button>
                    <div className="hidden group-hover:flex gap-1 mr-2">
                      <button
                        onClick={() => openCategoryModal(cat)}
                        className="p-1 text-steel-400 hover:text-steel-600"
                        title="Rediger"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => deleteCategory(cat.id)}
                        className="p-1 text-steel-400 hover:text-red-600"
                        title="Slett"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Kostprisliste */}
        <div className="lg:col-span-3">
          <div className="card">
            <h2 className="font-semibold text-steel-900 mb-4">
              Kostpriser
              {selectedCategory && categories.find(c => c.id === selectedCategory) && (
                <span className="font-normal text-steel-500">
                  {' '}/ {categories.find(c => c.id === selectedCategory)?.name}
                </span>
              )}
            </h2>

            {filteredItems.length === 0 ? (
              <p className="text-steel-500 text-center py-8">
                Ingen kostpriser funnet.{' '}
                <button onClick={() => openItemModal()} className="text-primary-600 hover:underline">
                  Legg til en ny
                </button>
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="table-header">
                      <th className="table-cell">Navn</th>
                      <th className="table-cell">Kategori</th>
                      <th className="table-cell">Enhet</th>
                      <th className="table-cell text-right">Pris</th>
                      {selectedType === 'ndt' && (
                        <>
                          <th className="table-cell">Metode</th>
                          <th className="table-cell">Nivå</th>
                        </>
                      )}
                      <th className="table-cell w-20"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.map(item => (
                      <tr key={item.id} className="hover:bg-steel-50">
                        <td className="table-cell">
                          <div>
                            <p className="font-medium">{item.name}</p>
                            {item.description && (
                              <p className="text-sm text-steel-500">{item.description}</p>
                            )}
                          </div>
                        </td>
                        <td className="table-cell text-steel-600">{item.category_name}</td>
                        <td className="table-cell">{item.unit}</td>
                        <td className="table-cell text-right font-medium">
                          {item.unit_price.toLocaleString('nb-NO')} kr
                        </td>
                        {selectedType === 'ndt' && (
                          <>
                            <td className="table-cell">{item.ndt_method || '-'}</td>
                            <td className="table-cell">{item.ndt_level || '-'}</td>
                          </>
                        )}
                        <td className="table-cell">
                          <div className="flex gap-1 justify-end">
                            <button
                              onClick={() => openItemModal(item)}
                              className="p-1 text-steel-400 hover:text-steel-600"
                              title="Rediger"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => deleteItem(item.id)}
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
      </div>

      {/* Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold mb-4">
              {editingCategory ? 'Rediger kategori' : 'Ny kategori'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="label">Navn</label>
                <input
                  type="text"
                  className="input"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  placeholder="Kategorinavn"
                />
              </div>
              <div>
                <label className="label">Type</label>
                <select
                  className="input"
                  value={categoryForm.type}
                  onChange={(e) => setCategoryForm({ ...categoryForm, type: e.target.value as CategoryType })}
                >
                  {(Object.keys(CATEGORY_LABELS) as CategoryType[]).map(type => (
                    <option key={type} value={type}>{CATEGORY_LABELS[type]}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setShowCategoryModal(false)} className="btn btn-secondary">
                Avbryt
              </button>
              <button onClick={saveCategory} className="btn btn-primary">
                Lagre
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Item Modal */}
      {showItemModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">
              {editingItem ? 'Rediger kostpris' : 'Ny kostpris'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="label">Kategori</label>
                <select
                  className="input"
                  value={itemForm.categoryId}
                  onChange={(e) => setItemForm({ ...itemForm, categoryId: e.target.value })}
                  disabled={!!editingItem}
                >
                  <option value="">Velg kategori</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name} ({CATEGORY_LABELS[cat.type]})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Navn</label>
                <input
                  type="text"
                  className="input"
                  value={itemForm.name}
                  onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                  placeholder="Postnavn"
                />
              </div>
              <div>
                <label className="label">Beskrivelse (valgfritt)</label>
                <input
                  type="text"
                  className="input"
                  value={itemForm.description}
                  onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                  placeholder="Kort beskrivelse"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Enhet</label>
                  <input
                    type="text"
                    className="input"
                    value={itemForm.unit}
                    onChange={(e) => setItemForm({ ...itemForm, unit: e.target.value })}
                    placeholder="f.eks. timer, kg, stk"
                  />
                </div>
                <div>
                  <label className="label">Pris per enhet (NOK)</label>
                  <input
                    type="number"
                    className="input"
                    value={itemForm.unitPrice}
                    onChange={(e) => setItemForm({ ...itemForm, unitPrice: parseFloat(e.target.value) || 0 })}
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>

              {isNdtCategory && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">NDT Metode</label>
                    <select
                      className="input"
                      value={itemForm.ndtMethod}
                      onChange={(e) => setItemForm({ ...itemForm, ndtMethod: e.target.value })}
                    >
                      <option value="">Velg metode</option>
                      {NDT_METHODS.map(method => (
                        <option key={method} value={method}>{method}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">Sertifiseringsnivå</label>
                    <select
                      className="input"
                      value={itemForm.ndtLevel}
                      onChange={(e) => setItemForm({ ...itemForm, ndtLevel: e.target.value })}
                    >
                      <option value="">Velg nivå</option>
                      {NDT_LEVELS.map(level => (
                        <option key={level} value={level}>{level}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setShowItemModal(false)} className="btn btn-secondary">
                Avbryt
              </button>
              <button onClick={saveItem} className="btn btn-primary">
                Lagre
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
