import { useEffect, useState, useRef } from 'react';
import { PlusCircle, Edit2, UserX, KeyRound, Upload, Trash2, ImageIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import apiClient from '../api/client';
import { useSettings } from '../contexts/SettingsContext';
import { useLanguage } from '../contexts/LanguageContext';
import type { User, Role } from '../types';

const ROLES: Role[] = ['ADMIN', 'VENDOR_MANAGEMENT', 'PROCUREMENT', 'STORE', 'FINANCE', 'IT', 'ASSET'];

interface UserForm {
  name: string;
  email: string;
  role: Role;
  department: string;
  password: string;
}

const emptyForm = (): UserForm => ({ name: '', email: '', role: 'STORE', department: '', password: '' });

export default function UserManagement() {
  const { t } = useLanguage();
  const { logoBase64, refreshLogo } = useSettings();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [form, setForm] = useState<UserForm>(emptyForm());
  const [saving, setSaving] = useState(false);

  // Logo state
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoSaving, setLogoSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function fetchUsers() {
    try {
      const res = await apiClient.get('/users');
      setUsers(res.data);
    } catch {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchUsers(); }, []);
  useEffect(() => { setLogoPreview(logoBase64); }, [logoBase64]);

  function openCreate() {
    setEditUser(null);
    setForm(emptyForm());
    setShowModal(true);
  }

  function openEdit(u: User) {
    setEditUser(u);
    setForm({ name: u.name, email: u.email, role: u.role, department: u.department || '', password: '' });
    setShowModal(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      if (editUser) {
        await apiClient.put(`/users/${editUser.id}`, {
          name: form.name,
          role: form.role,
          department: form.department || undefined,
        });
        toast.success('User updated');
      } else {
        await apiClient.post('/users', form);
        toast.success('User created — welcome email sent');
      }
      setShowModal(false);
      fetchUsers();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate(u: User) {
    if (!confirm(`Deactivate ${u.name}?`)) return;
    try {
      await apiClient.put(`/users/${u.id}/deactivate`, {});
      toast.success('User deactivated');
      fetchUsers();
    } catch {
      toast.error('Failed to deactivate');
    }
  }

  async function handleResetPassword(u: User) {
    if (!confirm(`Send password reset to ${u.email}?`)) return;
    try {
      await apiClient.put(`/users/${u.id}/reset-password`, {});
      toast.success('Reset email sent');
    } catch {
      toast.error('Failed to send reset email');
    }
  }

  function handleLogoFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Logo must be under 2MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setLogoPreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function handleLogoSave() {
    setLogoSaving(true);
    try {
      await apiClient.put('/settings/logo', { logoBase64: logoPreview });
      await refreshLogo();
      toast.success('Logo updated');
    } catch {
      toast.error('Failed to update logo');
    } finally {
      setLogoSaving(false);
    }
  }

  async function handleLogoRemove() {
    setLogoSaving(true);
    try {
      await apiClient.put('/settings/logo', { logoBase64: null });
      setLogoPreview(null);
      await refreshLogo();
      toast.success('Logo removed');
    } catch {
      toast.error('Failed to remove logo');
    } finally {
      setLogoSaving(false);
    }
  }

  const roleColors: Record<Role, string> = {
    ADMIN: 'bg-red-100 text-red-700',
    VENDOR_MANAGEMENT: 'bg-blue-100 text-blue-700',
    PROCUREMENT: 'bg-purple-100 text-purple-700',
    STORE: 'bg-orange-100 text-orange-700',
    FINANCE: 'bg-teal-100 text-teal-700',
    IT: 'bg-cyan-100 text-cyan-700',
    ASSET: 'bg-green-100 text-green-700',
  };

  return (
    <div className="p-6 space-y-6">

      {/* ── Logo & Branding ──────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-800 mb-1">{t('logoSettings')}</h3>
        <p className="text-xs text-gray-400 mb-4">{t('logoHint')}</p>

        <div className="flex items-start gap-6 flex-wrap">
          {/* Preview */}
          <div className="flex flex-col items-center gap-2">
            <p className="text-xs text-gray-500 font-medium">{t('currentLogo')}</p>
            <div
              className="w-24 h-24 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden"
              style={{ background: '#0a3557' }}
            >
              {logoPreview ? (
                <img src={logoPreview} alt="Logo preview" className="max-w-full max-h-full object-contain p-2" />
              ) : (
                <div className="flex flex-col items-center gap-1">
                  <ImageIcon size={20} className="text-white/30" />
                  <span className="text-[10px] text-white/30">{t('noLogo')}</span>
                </div>
              )}
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-col gap-2 pt-6">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/svg+xml,image/webp"
              onChange={handleLogoFile}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 text-sm border border-gray-300 bg-white rounded-lg px-3 py-2 hover:bg-gray-50"
            >
              <Upload size={14} /> {t('uploadLogo')}
            </button>

            {logoPreview !== logoBase64 && logoPreview && (
              <button
                onClick={handleLogoSave}
                disabled={logoSaving}
                className="flex items-center gap-2 text-sm bg-blue-600 text-white rounded-lg px-3 py-2 hover:bg-blue-700 disabled:opacity-60"
              >
                {logoSaving ? '…' : t('saveLogo')}
              </button>
            )}

            {logoPreview && (
              <button
                onClick={handleLogoRemove}
                disabled={logoSaving}
                className="flex items-center gap-2 text-sm text-red-600 border border-red-200 rounded-lg px-3 py-2 hover:bg-red-50 disabled:opacity-60"
              >
                <Trash2 size={14} /> {t('removeLogo')}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Users ───────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">{t('userManagement')}</h2>
            <p className="text-sm text-gray-500">{users.length} users</p>
          </div>
          <button onClick={openCreate} className="flex items-center gap-1.5 text-sm bg-blue-600 text-white rounded-lg px-3 py-2 hover:bg-blue-700">
            <PlusCircle size={15} /> {t('newUser')}
          </button>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-48 text-gray-500">{t('loading')}</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Name</th>
                  <th className="px-4 py-3 text-left">Email</th>
                  <th className="px-4 py-3 text-left">Role</th>
                  <th className="px-4 py-3 text-left">Department</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{u.name}</td>
                    <td className="px-4 py-3 text-gray-600">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${roleColors[u.role]}`}>
                        {u.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{u.department || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${u.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {u.isActive ? t('active') : t('inactive')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button onClick={() => openEdit(u)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded" title="Edit">
                          <Edit2 size={14} />
                        </button>
                        <button onClick={() => handleResetPassword(u)} className="p-1.5 text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 rounded" title="Reset Password">
                          <KeyRound size={14} />
                        </button>
                        {u.isActive && (
                          <button onClick={() => handleDeactivate(u)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded" title="Deactivate">
                            <UserX size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-800">
              {editUser ? t('editUser') : t('createUser')}
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('fullName')} *</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              {!editUser && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('email')} *</label>
                  <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('role')} *</label>
                <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {ROLES.map((r) => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('department')}</label>
                <input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              {!editUser && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('initialPassword')} *</label>
                  <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              )}
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button onClick={() => setShowModal(false)} className="border border-gray-300 text-gray-700 rounded-lg px-4 py-2 text-sm hover:bg-gray-50">
                {t('cancel')}
              </button>
              <button onClick={handleSave} disabled={saving} className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm hover:bg-blue-700 disabled:opacity-60">
                {saving ? '…' : t('save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
