import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { CompanySettings } from '../types';

export default function SettingsPage() {
  const { user, updateProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'company' | 'profile'>('company');

  // Company settings
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [companyForm, setCompanyForm] = useState({
    companyName: '',
    orgNumber: '',
    address: '',
    postalCode: '',
    city: '',
    phone: '',
    email: '',
    website: '',
    defaultTerms: '',
    defaultValidityDays: 30,
    vatPercent: 25
  });

  // Profile form
  const [profileForm, setProfileForm] = useState({
    name: '',
    company: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    if (user) {
      setProfileForm({
        name: user.name,
        company: user.company || '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    }
  }, [user]);

  const loadSettings = async () => {
    try {
      const { settings } = await api.getSettings();
      setSettings(settings);
      setCompanyForm({
        companyName: settings.company_name || '',
        orgNumber: settings.org_number || '',
        address: settings.address || '',
        postalCode: settings.postal_code || '',
        city: settings.city || '',
        phone: settings.phone || '',
        email: settings.email || '',
        website: settings.website || '',
        defaultTerms: settings.default_terms || '',
        defaultValidityDays: settings.default_validity_days || 30,
        vatPercent: settings.vat_percent || 25
      });
    } catch (error) {
      console.error('Feil ved lasting:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveCompanySettings = async () => {
    setSaving(true);
    try {
      await api.updateSettings({
        companyName: companyForm.companyName || undefined,
        orgNumber: companyForm.orgNumber || undefined,
        address: companyForm.address || undefined,
        postalCode: companyForm.postalCode || undefined,
        city: companyForm.city || undefined,
        phone: companyForm.phone || undefined,
        email: companyForm.email || undefined,
        website: companyForm.website || undefined,
        defaultTerms: companyForm.defaultTerms || undefined,
        defaultValidityDays: companyForm.defaultValidityDays,
        vatPercent: companyForm.vatPercent
      });
      alert('Innstillinger lagret!');
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Feil ved lagring');
    } finally {
      setSaving(false);
    }
  };

  const saveProfile = async () => {
    if (profileForm.newPassword) {
      if (profileForm.newPassword !== profileForm.confirmPassword) {
        alert('Passordene stemmer ikke overens');
        return;
      }
      if (!profileForm.currentPassword) {
        alert('Nåværende passord er påkrevd');
        return;
      }
    }

    setSaving(true);
    try {
      const success = await updateProfile({
        name: profileForm.name,
        company: profileForm.company || undefined,
        currentPassword: profileForm.currentPassword || undefined,
        newPassword: profileForm.newPassword || undefined
      });

      if (success) {
        alert('Profil oppdatert!');
        setProfileForm(prev => ({
          ...prev,
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        }));
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Feil ved lagring');
    } finally {
      setSaving(false);
    }
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
      <h1 className="text-2xl font-bold text-steel-900">Innstillinger</h1>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-steel-200">
        <button
          onClick={() => setActiveTab('company')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeTab === 'company'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-steel-600 hover:text-steel-900'
          }`}
        >
          Bedriftsinformasjon
        </button>
        <button
          onClick={() => setActiveTab('profile')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeTab === 'profile'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-steel-600 hover:text-steel-900'
          }`}
        >
          Min profil
        </button>
      </div>

      {/* Company Settings */}
      {activeTab === 'company' && (
        <div className="space-y-6">
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Bedriftsinformasjon</h2>
            <p className="text-sm text-steel-500 mb-4">
              Denne informasjonen vises på tilbudene dine.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Bedriftsnavn</label>
                <input
                  type="text"
                  className="input"
                  value={companyForm.companyName}
                  onChange={(e) => setCompanyForm({ ...companyForm, companyName: e.target.value })}
                  placeholder="Bedrift AS"
                />
              </div>
              <div>
                <label className="label">Organisasjonsnummer</label>
                <input
                  type="text"
                  className="input"
                  value={companyForm.orgNumber}
                  onChange={(e) => setCompanyForm({ ...companyForm, orgNumber: e.target.value })}
                  placeholder="123 456 789"
                />
              </div>
              <div className="md:col-span-2">
                <label className="label">Adresse</label>
                <input
                  type="text"
                  className="input"
                  value={companyForm.address}
                  onChange={(e) => setCompanyForm({ ...companyForm, address: e.target.value })}
                  placeholder="Gateadresse"
                />
              </div>
              <div>
                <label className="label">Postnummer</label>
                <input
                  type="text"
                  className="input"
                  value={companyForm.postalCode}
                  onChange={(e) => setCompanyForm({ ...companyForm, postalCode: e.target.value })}
                  placeholder="0000"
                />
              </div>
              <div>
                <label className="label">Sted</label>
                <input
                  type="text"
                  className="input"
                  value={companyForm.city}
                  onChange={(e) => setCompanyForm({ ...companyForm, city: e.target.value })}
                  placeholder="Oslo"
                />
              </div>
              <div>
                <label className="label">Telefon</label>
                <input
                  type="tel"
                  className="input"
                  value={companyForm.phone}
                  onChange={(e) => setCompanyForm({ ...companyForm, phone: e.target.value })}
                  placeholder="+47 123 45 678"
                />
              </div>
              <div>
                <label className="label">E-post</label>
                <input
                  type="email"
                  className="input"
                  value={companyForm.email}
                  onChange={(e) => setCompanyForm({ ...companyForm, email: e.target.value })}
                  placeholder="post@bedrift.no"
                />
              </div>
              <div className="md:col-span-2">
                <label className="label">Nettside</label>
                <input
                  type="url"
                  className="input"
                  value={companyForm.website}
                  onChange={(e) => setCompanyForm({ ...companyForm, website: e.target.value })}
                  placeholder="https://www.bedrift.no"
                />
              </div>
            </div>
          </div>

          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Standardinnstillinger for tilbud</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Standard gyldighet (dager)</label>
                <input
                  type="number"
                  className="input"
                  value={companyForm.defaultValidityDays}
                  onChange={(e) => setCompanyForm({ ...companyForm, defaultValidityDays: parseInt(e.target.value) || 30 })}
                  min="1"
                />
              </div>
              <div>
                <label className="label">MVA-sats (%)</label>
                <input
                  type="number"
                  className="input"
                  value={companyForm.vatPercent}
                  onChange={(e) => setCompanyForm({ ...companyForm, vatPercent: parseFloat(e.target.value) || 25 })}
                  min="0"
                  step="0.1"
                />
              </div>
              <div className="md:col-span-2">
                <label className="label">Standard vilkår</label>
                <textarea
                  className="input"
                  rows={5}
                  value={companyForm.defaultTerms}
                  onChange={(e) => setCompanyForm({ ...companyForm, defaultTerms: e.target.value })}
                  placeholder="Betalingsbetingelser, leveringsvilkår etc. som skal brukes som standard på nye tilbud."
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button onClick={saveCompanySettings} disabled={saving} className="btn btn-primary">
              {saving ? 'Lagrer...' : 'Lagre innstillinger'}
            </button>
          </div>
        </div>
      )}

      {/* Profile Settings */}
      {activeTab === 'profile' && (
        <div className="space-y-6">
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Profil</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Navn</label>
                <input
                  type="text"
                  className="input"
                  value={profileForm.name}
                  onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Bedrift</label>
                <input
                  type="text"
                  className="input"
                  value={profileForm.company}
                  onChange={(e) => setProfileForm({ ...profileForm, company: e.target.value })}
                />
              </div>
              <div className="md:col-span-2">
                <label className="label">E-post</label>
                <input
                  type="email"
                  className="input bg-steel-100"
                  value={user?.email || ''}
                  disabled
                />
                <p className="text-xs text-steel-500 mt-1">E-postadressen kan ikke endres</p>
              </div>
            </div>
          </div>

          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Endre passord</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="label">Nåværende passord</label>
                <input
                  type="password"
                  className="input"
                  value={profileForm.currentPassword}
                  onChange={(e) => setProfileForm({ ...profileForm, currentPassword: e.target.value })}
                  placeholder="Skriv inn nåværende passord"
                />
              </div>
              <div>
                <label className="label">Nytt passord</label>
                <input
                  type="password"
                  className="input"
                  value={profileForm.newPassword}
                  onChange={(e) => setProfileForm({ ...profileForm, newPassword: e.target.value })}
                  placeholder="Minst 6 tegn"
                />
              </div>
              <div>
                <label className="label">Bekreft nytt passord</label>
                <input
                  type="password"
                  className="input"
                  value={profileForm.confirmPassword}
                  onChange={(e) => setProfileForm({ ...profileForm, confirmPassword: e.target.value })}
                  placeholder="Gjenta nytt passord"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button onClick={saveProfile} disabled={saving} className="btn btn-primary">
              {saving ? 'Lagrer...' : 'Lagre profil'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
