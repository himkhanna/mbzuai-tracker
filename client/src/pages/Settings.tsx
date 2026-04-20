import { useEffect, useState } from 'react';
import apiClient from '../api/client';
import toast from 'react-hot-toast';
import { Save, RefreshCw, Mail, Clock, Tag, ToggleLeft, ToggleRight } from 'lucide-react';

const NAVY = '#0C2945';

interface SettingMeta { value: string; description: string; }
type SettingsMap = Record<string, SettingMeta>;

const KEYS = {
  MAILBOX:         'email.mailbox',
  ENABLED:         'email.enabled',
  POLL_MINUTES:    'email.poll.interval.minutes',
  PO_SUBJECTS:     'email.po.subjects',
  DP_SUBJECTS:     'email.dp.subjects',
  AMAZON_SUBJECTS: 'email.amazon.subjects',
} as const;

function Card({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 bg-gray-50">
        <span style={{ color: NAVY }}>{icon}</span>
        <h2 className="font-semibold text-gray-800">{title}</h2>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

export default function Settings() {
  const [settings, setSettings] = useState<SettingsMap>({});
  const [draft, setDraft]       = useState<Record<string, string>>({});
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await apiClient.get<SettingsMap>('/settings');
      setSettings(res.data);
      const flat: Record<string, string> = {};
      for (const [k, v] of Object.entries(res.data)) flat[k] = v.value;
      setDraft(flat);
    } catch {
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function set(key: string, value: string) {
    setDraft(d => ({ ...d, [key]: value }));
  }

  function get(key: string) { return draft[key] ?? ''; }

  async function save() {
    setSaving(true);
    try {
      await apiClient.put('/settings', draft);
      toast.success('Settings saved');
      load();
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  }

  const enabled = get(KEYS.ENABLED) === 'true';

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: NAVY }}>Settings</h1>
          <p className="text-sm text-gray-500 mt-0.5">Configure email ingestion — changes take effect immediately, no restart needed</p>
        </div>
        <span className="px-3 py-1 text-xs font-semibold rounded-full bg-amber-50 text-amber-800">Admin Only</span>
      </div>

      {/* ── Email Ingestion ─────────────────────────────────────────────── */}
      <Card title="Email Ingestion" icon={<Mail size={18} />}>

        {/* Enable toggle */}
        <div className="flex items-center justify-between p-3 rounded-lg border border-gray-200 mb-5">
          <div>
            <p className="text-sm font-medium text-gray-800">Enable Email Polling</p>
            <p className="text-xs text-gray-400 mt-0.5">When enabled, the system automatically checks the mailbox for new orders</p>
          </div>
          <button
            onClick={() => set(KEYS.ENABLED, enabled ? 'false' : 'true')}
            className="flex items-center gap-2 text-sm font-medium transition-colors"
            style={{ color: enabled ? '#16a34a' : '#6b7280' }}
          >
            {enabled
              ? <ToggleRight size={32} className="text-green-500" />
              : <ToggleLeft size={32} className="text-gray-400" />}
            {enabled ? 'Enabled' : 'Disabled'}
          </button>
        </div>

        <div className="space-y-4">
          <Field
            label="Mailbox to Monitor"
            hint={settings[KEYS.MAILBOX]?.description}
          >
            <input
              type="email"
              value={get(KEYS.MAILBOX)}
              onChange={e => set(KEYS.MAILBOX, e.target.value)}
              placeholder="himanshu@idctechnologies.com"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </Field>
        </div>
      </Card>

      {/* ── Poll Interval ───────────────────────────────────────────────── */}
      <Card title="Poll Interval" icon={<Clock size={18} />}>
        <Field
          label="Check Every (minutes)"
          hint="Minimum 1 minute. Changes apply on the next scheduler tick (up to 1 minute delay)."
        >
          <div className="flex items-center gap-3">
            <input
              type="number"
              min={1}
              max={1440}
              value={get(KEYS.POLL_MINUTES)}
              onChange={e => set(KEYS.POLL_MINUTES, e.target.value)}
              className="w-32 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-500">minutes</span>
            <div className="flex gap-2 ml-2">
              {[5, 10, 15, 30, 60].map(m => (
                <button
                  key={m}
                  onClick={() => set(KEYS.POLL_MINUTES, String(m))}
                  className="px-2.5 py-1 text-xs rounded-lg border transition-colors"
                  style={get(KEYS.POLL_MINUTES) === String(m)
                    ? { backgroundColor: NAVY, color: '#fff', borderColor: NAVY }
                    : { backgroundColor: '#f8fafc', color: '#374151', borderColor: '#e5e7eb' }}
                >
                  {m}m
                </button>
              ))}
            </div>
          </div>
        </Field>
      </Card>

      {/* ── Subject Keywords ────────────────────────────────────────────── */}
      <Card title="Subject Keywords" icon={<Tag size={18} />}>
        <p className="text-sm text-gray-500 mb-4">
          Emails are only processed if their subject contains at least one keyword from the lists below.
          Enter keywords separated by commas. Matching is case-insensitive.
        </p>
        <div className="space-y-4">
          <Field
            label="PO Order Keywords"
            hint="e.g. PO Order, Purchase Order, MBZUAI PO"
          >
            <input
              value={get(KEYS.PO_SUBJECTS)}
              onChange={e => set(KEYS.PO_SUBJECTS, e.target.value)}
              placeholder="PO Order, Purchase Order, MBZUAI PO"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <KeywordPreview value={get(KEYS.PO_SUBJECTS)} color="blue" />
          </Field>

          <Field
            label="DP Order Keywords"
            hint="e.g. DP Order, Direct Payment, MBZUAI DP"
          >
            <input
              value={get(KEYS.DP_SUBJECTS)}
              onChange={e => set(KEYS.DP_SUBJECTS, e.target.value)}
              placeholder="DP Order, Direct Payment, MBZUAI DP"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <KeywordPreview value={get(KEYS.DP_SUBJECTS)} color="purple" />
          </Field>

          <Field
            label="Amazon Screenshot Keywords"
            hint="e.g. Amazon Delivery, Amazon Order, Delivery Confirmation"
          >
            <input
              value={get(KEYS.AMAZON_SUBJECTS)}
              onChange={e => set(KEYS.AMAZON_SUBJECTS, e.target.value)}
              placeholder="Amazon Delivery, Amazon Order, Delivery Confirmation"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <KeywordPreview value={get(KEYS.AMAZON_SUBJECTS)} color="orange" />
          </Field>
        </div>
      </Card>

      {/* Save bar */}
      <div className="flex justify-end gap-3 pt-2">
        <button
          onClick={load}
          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          <RefreshCw size={14} /> Reset
        </button>
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-60"
          style={{ backgroundColor: NAVY }}
        >
          {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
          {saving ? 'Saving…' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}

function KeywordPreview({ value, color }: { value: string; color: 'blue' | 'purple' | 'orange' }) {
  const tags = value.split(',').map(s => s.trim()).filter(Boolean);
  if (tags.length === 0) return null;
  const cls = {
    blue:   'bg-blue-50 text-blue-700',
    purple: 'bg-purple-50 text-purple-700',
    orange: 'bg-orange-50 text-orange-700',
  }[color];
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {tags.map((t, i) => (
        <span key={i} className={`text-xs px-2 py-0.5 rounded-full font-medium ${cls}`}>{t}</span>
      ))}
    </div>
  );
}
