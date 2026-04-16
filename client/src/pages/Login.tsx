import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import apiClient from '../api/client';
import { useAuthStore } from '../store/authStore';
import { useSettings } from '../contexts/SettingsContext';

export default function Login() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const { logoBase64 } = useSettings();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await apiClient.post('/auth/login', { email, password });
      const { user, token } = res.data;
      setAuth(user, token);
      toast.success(`Welcome, ${user.name}!`);
      navigate('/dashboard');
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Invalid email or password';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: '#0C2945' }}
    >
      {/* Gold top stripe */}
      <div style={{ height: '5px', backgroundColor: '#E5C687', flexShrink: 0 }} />

      {/* Header */}
      <div
        className="flex items-center gap-4 px-8 py-4"
        style={{ backgroundColor: '#E5C687' }}
      >
        {logoBase64 ? (
          <img src={logoBase64} alt="Logo" className="h-10 w-auto object-contain" />
        ) : (
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center font-black text-base"
            style={{ backgroundColor: '#0C2945', color: '#E5C687' }}
          >
            M
          </div>
        )}
        <div>
          <p className="font-bold text-sm leading-tight" style={{ color: '#0C2945' }}>MBZUAI</p>
          <p className="text-xs" style={{ color: '#154677' }}>Mohamed Bin Zayed University of Artificial Intelligence</p>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div
            className="rounded-xl overflow-hidden"
            style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }}
          >
            {/* Card header */}
            <div
              className="px-8 py-6 text-center"
              style={{ backgroundColor: '#154677' }}
            >
              <h1 className="text-xl font-bold text-white">Procurement Tracker</h1>
              <p className="text-sm mt-1" style={{ color: 'rgba(229,198,135,0.8)' }}>
                Delivery &amp; Store Management System
              </p>
            </div>

            {/* Form */}
            <div className="bg-white px-8 py-7">
              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
                    {error}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold mb-1.5" style={{ color: '#0C2945' }}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="you@mbzuai.ac.ae"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:border-transparent"
                    style={{ '--tw-ring-color': '#0081FB' } as React.CSSProperties}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-1.5" style={{ color: '#0C2945' }}>
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:border-transparent"
                    style={{ '--tw-ring-color': '#0081FB' } as React.CSSProperties}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full text-white rounded-lg py-3 text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed transition-all hover:opacity-90"
                  style={{ backgroundColor: '#154677' }}
                >
                  {loading ? 'Signing in…' : 'Sign In'}
                </button>
              </form>
            </div>

            {/* Card footer */}
            <div
              className="px-8 py-4 text-center"
              style={{ backgroundColor: '#f8f9fa', borderTop: '1px solid #e9ecef' }}
            >
              <p className="text-xs" style={{ color: '#6c757d' }}>
                © 2025 Mohamed Bin Zayed University of Artificial Intelligence
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
