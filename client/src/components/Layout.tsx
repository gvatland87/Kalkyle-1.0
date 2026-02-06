import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';

interface CostItem {
  id: string;
  name: string;
  unit: string;
  unit_price: number;
  category_name: string;
  category_type: string;
}

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  // Kostpriser fra database
  const [costItems, setCostItems] = useState<CostItem[]>([]);
  const [selectedCostItem, setSelectedCostItem] = useState<string>('');

  // DG Kalkulator state - Linje 1
  const [unitPrice, setUnitPrice] = useState<number>(0);
  const [quantity, setQuantity] = useState<number>(1);
  const [unit, setUnit] = useState<string>('stk');
  const [targetDG, setTargetDG] = useState<number>(15);

  // DG Kalkulator state - Linje 2 (Kilo/Tonnasje)
  const [kiloAmount, setKiloAmount] = useState<number>(0);
  const [kiloPrice, setKiloPrice] = useState<number>(0);

  // Beregningsvalg: separat eller samlet
  const [calcMode, setCalcMode] = useState<'separate' | 'combined'>('separate');

  // Last inn kostpriser ved oppstart
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

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Håndter valg av kostpris
  const handleCostItemSelect = (itemId: string) => {
    setSelectedCostItem(itemId);
    const item = costItems.find(ci => ci.id === itemId);
    if (item) {
      setUnitPrice(item.unit_price);
      setUnit(item.unit);
    }
  };

  // Beregn salgspris basert på enhetspris, antall, kilo og DG
  const lineCost1 = unitPrice * quantity;
  const lineCost2 = kiloAmount * kiloPrice;

  // Separate beregninger per linje
  const salesPrice1 = targetDG >= 100 ? 0 : lineCost1 / (1 - targetDG / 100);
  const margin1 = salesPrice1 - lineCost1;
  const salesPrice2 = targetDG >= 100 ? 0 : lineCost2 / (1 - targetDG / 100);
  const margin2 = salesPrice2 - lineCost2;

  // Samlet beregning
  const totalCost = lineCost1 + lineCost2;
  const totalSalesPrice = targetDG >= 100 ? 0 : totalCost / (1 - targetDG / 100);
  const totalMargin = totalSalesPrice - totalCost;

  // Grupper kostpriser etter kategori
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

  const navItems = [
    { to: '/', label: 'Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { to: '/kostpriser', label: 'Kostpriser', icon: 'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z' },
    { to: '/kalkyle', label: 'Ny Kalkyle', icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top navbar - DG Kalkulator */}
      <div className="lg:ml-64 bg-white border-b border-gray-200 px-4 py-2">
        {/* Header med DG og beregningsvalg */}
        <div className="flex flex-wrap items-center gap-4 mb-2 pb-2 border-b border-gray-100">
          <span className="text-sm font-bold text-gray-800">Hurtigkalkulator</span>

          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500">DG %</label>
            <input
              type="number"
              value={targetDG}
              onChange={(e) => setTargetDG(Number(e.target.value))}
              className="w-16 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              min="0"
              max="99"
            />
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={() => setCalcMode('separate')}
              className={`px-3 py-1 text-xs rounded ${calcMode === 'separate' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
            >
              Separat
            </button>
            <button
              onClick={() => setCalcMode('combined')}
              className={`px-3 py-1 text-xs rounded ${calcMode === 'combined' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
            >
              Samlet
            </button>
          </div>
        </div>

        {/* Linje 1 - Arbeid/Enhetspris */}
        <div className="flex flex-wrap items-center gap-3 mb-2">
          <span className="text-sm font-medium text-gray-700 w-20">Arbeid:</span>

          {/* Dropdown for kostpriser */}
          <select
            value={selectedCostItem}
            onChange={(e) => handleCostItemSelect(e.target.value)}
            className="w-40 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">-- Velg --</option>
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

          <div className="flex items-center gap-1">
            <input
              type="number"
              value={unitPrice || ''}
              onChange={(e) => {
                setUnitPrice(Number(e.target.value));
                setSelectedCostItem('');
              }}
              className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Pris"
              min="0"
            />
            <span className="text-xs text-gray-400">×</span>
            <input
              type="number"
              value={quantity || ''}
              onChange={(e) => setQuantity(Number(e.target.value))}
              className="w-16 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Ant"
              min="0"
            />
            <span className="text-xs text-gray-500">{unit}</span>
          </div>

          <div className="h-5 w-px bg-gray-300"></div>

          <div className="flex items-center gap-3 text-sm">
            <span className="text-gray-600">Kost: <span className="font-medium">{lineCost1.toLocaleString('nb-NO')} kr</span></span>
            {calcMode === 'separate' && lineCost1 > 0 && (
              <>
                <span className="text-green-600">Salg: <span className="font-bold">{salesPrice1.toLocaleString('nb-NO')} kr</span></span>
                <span className="text-blue-600">DB: <span className="font-medium">{margin1.toLocaleString('nb-NO')} kr</span></span>
              </>
            )}
          </div>
        </div>

        {/* Linje 2 - Materiale/Kilo */}
        <div className="flex flex-wrap items-center gap-3 mb-2">
          <span className="text-sm font-medium text-gray-700 w-20">Materiale:</span>

          <div className="flex items-center gap-1">
            <input
              type="number"
              value={kiloPrice || ''}
              onChange={(e) => setKiloPrice(Number(e.target.value))}
              className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="kr/kg"
              min="0"
            />
            <span className="text-xs text-gray-400">×</span>
            <input
              type="number"
              value={kiloAmount || ''}
              onChange={(e) => setKiloAmount(Number(e.target.value))}
              className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="kg"
              min="0"
            />
            <span className="text-xs text-gray-500">kg</span>
          </div>

          <div className="h-5 w-px bg-gray-300"></div>

          <div className="flex items-center gap-3 text-sm">
            <span className="text-gray-600">Kost: <span className="font-medium">{lineCost2.toLocaleString('nb-NO')} kr</span></span>
            {calcMode === 'separate' && lineCost2 > 0 && (
              <>
                <span className="text-green-600">Salg: <span className="font-bold">{salesPrice2.toLocaleString('nb-NO')} kr</span></span>
                <span className="text-blue-600">DB: <span className="font-medium">{margin2.toLocaleString('nb-NO')} kr</span></span>
              </>
            )}
          </div>
        </div>

        {/* Samlet resultat (vises kun i combined mode) */}
        {calcMode === 'combined' && (lineCost1 > 0 || lineCost2 > 0) && (
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-gray-200">
            <span className="text-sm font-bold text-gray-700 w-20">Totalt:</span>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-gray-600">Kost: <span className="font-medium">{totalCost.toLocaleString('nb-NO')} kr</span></span>
              <span className="text-green-600">Salg: <span className="font-bold">{totalSalesPrice.toLocaleString('nb-NO')} kr</span></span>
              <span className="text-blue-600">DB: <span className="font-medium">{totalMargin.toLocaleString('nb-NO')} kr</span></span>
            </div>
          </div>
        )}
      </div>

      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 w-64 bg-gray-800 text-white hidden lg:block">
        <div className="p-6">
          <h1 className="text-2xl font-bold">Kalkyle 1.0</h1>
          <p className="text-gray-400 text-sm mt-1">Kalkulasjonssystem</p>
        </div>

        <nav className="mt-6">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center px-6 py-3 text-sm transition-colors ${
                  isActive
                    ? 'bg-gray-700 text-white border-l-4 border-blue-500'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`
              }
            >
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
              </svg>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{user?.name}</p>
              <p className="text-xs text-gray-400">{user?.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-gray-400 hover:text-white transition-colors"
              title="Logg ut"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile header */}
      <header className="lg:hidden bg-gray-800 text-white p-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">Kalkyle 1.0</h1>
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="p-2"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={menuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
          </svg>
        </button>
      </header>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="lg:hidden bg-gray-800 text-white">
          <nav>
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center px-6 py-3 text-sm ${
                    isActive ? 'bg-gray-700' : 'hover:bg-gray-700'
                  }`
                }
              >
                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                </svg>
                {item.label}
              </NavLink>
            ))}
            <button
              onClick={handleLogout}
              className="flex items-center w-full px-6 py-3 text-sm text-red-400 hover:bg-gray-700"
            >
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Logg ut
            </button>
          </nav>
        </div>
      )}

      {/* Main content */}
      <main className="lg:ml-64 min-h-screen p-6">
        <Outlet />
      </main>
    </div>
  );
}
