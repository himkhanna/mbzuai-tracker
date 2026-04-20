import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, List, PlusCircle,
  BarChart2, Users, ClipboardList, LogOut, Languages, FlaskConical, Settings,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useLanguage } from '../../contexts/LanguageContext';
import { useSettings } from '../../contexts/SettingsContext';

// MBZUAI brand colors
const NAVY   = '#0C2945';
const GOLD   = '#E5C687';
const GOLD_DIM = 'rgba(229,198,135,0.15)';
const WHITE_DIM = 'rgba(255,255,255,0.55)';
const WHITE_MID = 'rgba(255,255,255,0.75)';

const ROLE_LABEL: Record<string, { en: string; ar: string }> = {
  ADMIN:             { en: 'Administrator',     ar: 'مسؤول النظام' },
  VENDOR_MANAGEMENT: { en: 'Vendor Management', ar: 'إدارة الموردين' },
  PROCUREMENT:       { en: 'Procurement',        ar: 'المشتريات' },
  STORE:             { en: 'Store Team',         ar: 'فريق المستودع' },
  FINANCE:           { en: 'Finance Team',       ar: 'الفريق المالي' },
  IT:                { en: 'IT Team',            ar: 'تقنية المعلومات' },
  ASSET:             { en: 'Asset Team',         ar: 'فريق الأصول' },
};

export default function Sidebar() {
  const { user, clearAuth, hasRole } = useAuthStore();
  const { t, lang, toggleLang, isRTL } = useLanguage();
  const { logoBase64 } = useSettings();
  const navigate = useNavigate();

  const sideStyle: React.CSSProperties = {
    width: '256px',
    zIndex: 40,
    backgroundColor: NAVY,
    display: 'flex',
    flexDirection: 'column',
    ...(isRTL
      ? { position: 'fixed', top: 0, right: 0, bottom: 0, borderLeft: `1px solid rgba(229,198,135,0.15)` }
      : { position: 'fixed', top: 0, left: 0, bottom: 0, borderRight: `1px solid rgba(229,198,135,0.15)` }),
  };

  function navLinkStyle({ isActive }: { isActive: boolean }): string {
    const base = `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${isRTL ? 'flex-row-reverse' : ''}`;
    return isActive
      ? `${base} font-semibold`  // colors via inline style
      : base;
  }

  function navInlineStyle(isActive: boolean): React.CSSProperties {
    return isActive
      ? { backgroundColor: GOLD_DIM, color: GOLD, borderLeft: isRTL ? 'none' : `3px solid ${GOLD}`, borderRight: isRTL ? `3px solid ${GOLD}` : 'none', paddingLeft: isRTL ? '12px' : '9px', paddingRight: isRTL ? '9px' : '12px' }
      : { color: WHITE_MID };
  }

  const dividerStyle: React.CSSProperties = { borderTop: `1px solid rgba(229,198,135,0.12)` };
  const sectionLabelStyle: React.CSSProperties = {
    fontSize: '10px', fontWeight: 600, letterSpacing: '0.1em',
    textTransform: 'uppercase', color: 'rgba(229,198,135,0.45)',
    padding: '0 12px', marginBottom: '6px',
    textAlign: isRTL ? 'right' : 'left',
  };

  const roleLabel = user?.role
    ? (ROLE_LABEL[user.role]?.[lang] ?? user.role.replace('_', ' '))
    : '';

  return (
    <aside style={sideStyle}>
      {/* ── Brand / Logo ─────────────────────────────────────── */}
      <div
        className={`flex items-center gap-3 px-4 py-4 ${isRTL ? 'flex-row-reverse' : ''}`}
        style={{ borderBottom: `1px solid rgba(229,198,135,0.12)`, backgroundColor: GOLD }}
      >
        {logoBase64 ? (
          <img
            src={logoBase64}
            alt="Logo"
            className="h-9 w-auto max-w-[140px] object-contain shrink-0"
          />
        ) : (
          <div
            className="shrink-0 flex items-center justify-center rounded-lg font-black text-sm"
            style={{ width: 36, height: 36, backgroundColor: NAVY, color: GOLD }}
          >
            M
          </div>
        )}
        {!logoBase64 && (
          <div className={`min-w-0 ${isRTL ? 'text-right' : ''}`}>
            <p className="font-bold text-sm leading-tight" style={{ color: NAVY }}>MBZUAI</p>
            <p className="text-xs leading-tight" style={{ color: '#154677' }}>Procurement Tracker</p>
          </div>
        )}
      </div>

      {/* ── Navigation ───────────────────────────────────────── */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <p style={sectionLabelStyle}>{t('menu')}</p>

        <NavLink to="/dashboard" className={navLinkStyle} style={({ isActive }) => navInlineStyle(isActive)}>
          <LayoutDashboard size={16} className="shrink-0" />
          {t('dashboard')}
        </NavLink>

        <NavLink to="/tracker" className={navLinkStyle} style={({ isActive }) => navInlineStyle(isActive)}>
          <List size={16} className="shrink-0" />
          {t('orderTracker')}
        </NavLink>

        {hasRole('ADMIN', 'VENDOR_MANAGEMENT', 'PROCUREMENT') && (
          <NavLink to="/orders/new" className={navLinkStyle} style={({ isActive }) => navInlineStyle(isActive)}>
            <PlusCircle size={16} className="shrink-0" />
            {t('createOrder')}
          </NavLink>
        )}

        {hasRole('ADMIN', 'VENDOR_MANAGEMENT', 'PROCUREMENT') && (
          <NavLink to="/reports" className={navLinkStyle} style={({ isActive }) => navInlineStyle(isActive)}>
            <BarChart2 size={16} className="shrink-0" />
            {t('reports')}
          </NavLink>
        )}

        {/* IT/Asset: stage-limited — show a contextual label */}
        {hasRole('IT', 'ASSET') && (
          <div className="mt-2 mx-1 px-3 py-2 rounded-lg text-xs" style={{ backgroundColor: 'rgba(229,198,135,0.08)', color: 'rgba(229,198,135,0.6)' }}>
            {user?.role === 'IT' ? 'Access: IT Configuration stage only' : 'Access: Asset Tagging stage only'}
          </div>
        )}

        {hasRole('ADMIN', 'VENDOR_MANAGEMENT') && (
          <>
            <div className="pt-4 pb-1">
              <p style={sectionLabelStyle}>{t('admin')}</p>
            </div>
            {hasRole('ADMIN') && (
              <NavLink to="/admin/users" className={navLinkStyle} style={({ isActive }) => navInlineStyle(isActive)}>
                <Users size={16} className="shrink-0" />
                {t('users')}
              </NavLink>
            )}
            <NavLink to="/admin/audit" className={navLinkStyle} style={({ isActive }) => navInlineStyle(isActive)}>
              <ClipboardList size={16} className="shrink-0" />
              {t('auditLog')}
            </NavLink>
            {hasRole('ADMIN') && (
              <NavLink to="/admin/test-tools" className={navLinkStyle} style={({ isActive }) => navInlineStyle(isActive)}>
                <FlaskConical size={16} className="shrink-0" />
                Test Tools
              </NavLink>
            )}
            {hasRole('ADMIN') && (
              <NavLink to="/admin/settings" className={navLinkStyle} style={({ isActive }) => navInlineStyle(isActive)}>
                <Settings size={16} className="shrink-0" />
                Settings
              </NavLink>
            )}
          </>
        )}
      </nav>

      {/* ── Language toggle ───────────────────────────────────── */}
      <div className="px-3 pb-1" style={dividerStyle}>
        <button
          onClick={toggleLang}
          className={`flex items-center gap-2 w-full px-3 py-2 mt-2 rounded-lg text-sm font-medium transition-all hover:bg-white/10 ${isRTL ? 'flex-row-reverse' : ''}`}
          style={{ color: WHITE_DIM }}
        >
          <Languages size={15} className="shrink-0" />
          {lang === 'en' ? 'عربي' : 'English'}
        </button>
      </div>

      {/* ── User footer ───────────────────────────────────────── */}
      <div className="px-3 py-3" style={dividerStyle}>
        <div
          className={`flex items-center gap-3 px-3 py-2 rounded-lg mb-1.5 ${isRTL ? 'flex-row-reverse' : ''}`}
          style={{ backgroundColor: 'rgba(255,255,255,0.07)' }}
        >
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold uppercase"
            style={{ backgroundColor: GOLD, color: NAVY }}
          >
            {user?.name?.charAt(0) || 'U'}
          </div>
          <div className={`flex-1 min-w-0 ${isRTL ? 'text-right' : ''}`}>
            <p className="text-xs font-medium truncate" style={{ color: '#fff' }}>{user?.name}</p>
            <p className="text-xs truncate" style={{ color: WHITE_DIM }}>{roleLabel}</p>
          </div>
        </div>
        <button
          onClick={() => { clearAuth(); navigate('/login'); }}
          className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm transition-all hover:bg-white/10 ${isRTL ? 'flex-row-reverse' : ''}`}
          style={{ color: WHITE_DIM }}
        >
          <LogOut size={15} className="shrink-0" />
          {t('signOut')}
        </button>
      </div>
    </aside>
  );
}
