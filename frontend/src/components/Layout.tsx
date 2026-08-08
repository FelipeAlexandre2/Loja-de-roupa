import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Store, ShoppingCart, Settings,
  Scissors, Wallet, LogOut, Crown, ShieldAlert, Briefcase, Menu, X, BookOpen, BarChart3, ShieldCheck
} from 'lucide-react';
import { getUserPermissions } from '../App';

function decodeJwt(token: string): Record<string, any> | null {
  try { return JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))); }
  catch { return null; }
}
function getCurrentRole(): string {
  const token = localStorage.getItem('token');
  if (!token) return 'USER';
  const payload = decodeJwt(token);
  const roles: string[] = payload?.roles || payload?.authorities || [];
  if (roles.some((r: string) => r.includes('ADMIN'))) return 'ADMIN';
  if (roles.some((r: string) => r.includes('CAIXA'))) return 'CAIXA';
  return 'USER';
}
function getCurrentLogin(): string { return localStorage.getItem('username') || 'Usuário'; }

const RolePill: React.FC<{ role: string }> = ({ role }) => {
  const map: Record<string, { label: string; color: string; bg: string; Icon: any }> = {
    ADMIN: { label: 'Admin',   color: '#92400e', bg: '#fef3c7', Icon: Crown      },
    USER:  { label: 'Usuário', color: '#1e40af', bg: '#eff6ff', Icon: ShieldAlert },
    CAIXA: { label: 'Caixa',  color: '#065f46', bg: '#d1fae5', Icon: Briefcase  },
  };
  const cfg = map[role] || map['USER'];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.2rem',
      fontSize: '0.65rem', fontWeight: 700, padding: '0.15rem 0.5rem',
      borderRadius: '0.5rem', backgroundColor: cfg.bg, color: cfg.color,
    }}>
      <cfg.Icon size={9} />{cfg.label}
    </span>
  );
};

const MODULE_KEY: Record<string, string> = {
  '/':          'inicio',
  '/pdv':       'pdv',
  '/caixa':     'caixa',
  '/estoque':   'estoque',
  '/barbearia': 'barbearia',
  '/fiado':     'fiado',
  '/relatorio': 'relatorio',
  '/auditoria': 'auditoria',
  '/config':    'config',
};

const ALL_NAV = [
  { to: '/',          label: 'Início',     Icon: LayoutDashboard, moduleKey: 'inicio',     end: true  },
  { to: '/pdv',       label: 'PDV',         Icon: ShoppingCart,    moduleKey: 'pdv',       end: false },
  { to: '/caixa',     label: 'Caixa',       Icon: Wallet,          moduleKey: 'caixa',     end: false },
  { to: '/estoque',   label: 'Estoque',     Icon: Store,           moduleKey: 'estoque',   end: false },
  { to: '/barbearia', label: 'Barbearia',   Icon: Scissors,        moduleKey: 'barbearia', end: false },
  { to: '/fiado',     label: 'Fiado',       Icon: BookOpen,        moduleKey: 'fiado',     end: false },
  { to: '/relatorio', label: 'Relatórios',  Icon: BarChart3,        moduleKey: 'relatorio', end: false },
  { to: '/auditoria', label: 'Registro de Atividades', Icon: ShieldCheck, moduleKey: 'auditoria', end: false },
  { to: '/config',    label: 'Config',      Icon: Settings,        moduleKey: 'config',    end: false },
];

const Layout: React.FC = () => {
  const role = getCurrentRole();
  const login = getCurrentLogin();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Permissões granulares
  const perms = getUserPermissions();
  const navItems = ALL_NAV.filter(item =>
    item.moduleKey === '' || perms[item.moduleKey] !== 'NONE'
  );
  const bottomItems = navItems.slice(0, 5);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('userPermissions');
    navigate('/login');
  };

  return (
    <div className="app-layout">

      {/* ══ SIDEBAR — Desktop only ══════════════════════════════════ */}
      <aside className="sidebar">
        <NavLink to="/" end style={{ textDecoration: 'none', display: 'block' }}>
          <div className="sidebar-header"
            style={{ cursor: 'pointer', transition: 'opacity 0.2s' }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.8')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
          >
            <img src="/logo.png" alt="TT Store"
              style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
            <h2 style={{ margin: 0, fontSize: '1.1rem', letterSpacing: '1px', color: 'white' }}>TT STORE</h2>
          </div>
        </NavLink>

        <nav className="sidebar-nav">
          {navItems.map(({ to, label, Icon, end }) => (
            <NavLink key={to} to={to} end={end}
              className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
              <Icon size={20} />{label}
            </NavLink>
          ))}
          <div style={{ flex: 1 }} />
        </nav>

        {/* Footer sidebar */}
        <div style={{ padding: '1rem', borderTop: '1px solid rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div style={{ width: '34px', height: '34px', borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg,#C8102E,#1B2E5E)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '0.9rem' }}>
            {login.charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: 'white', fontWeight: 600, fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{login}</div>
            <RolePill role={role} />
          </div>
          <button onClick={handleLogout} title="Sair"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.55)', padding: '0.25rem', borderRadius: '6px', flexShrink: 0 }}
            onMouseEnter={e => (e.currentTarget.style.color = 'white')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.55)')}>
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      {/* ══ MAIN CONTENT ════════════════════════════════════════════ */}
      <main className="main-content">

        {/* Topbar Desktop */}
        <header className="topbar topbar-desktop">
          <div style={{ fontWeight: 500, color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#C8102E', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold' }}>
              {login.charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{login}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                {role === 'ADMIN' ? 'Administrador' : role === 'CAIXA' ? 'Operador de Caixa' : 'Usuário'}
              </div>
            </div>
          </div>
        </header>

        {/* Topbar Mobile */}
        <header className="topbar topbar-mobile">
          <NavLink to="/" end style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <img src="/logo.png" alt="TT Store" style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} />
            <span style={{ fontWeight: 800, fontSize: '1rem', color: '#1B2E5E', letterSpacing: '0.5px' }}>TT Store</span>
          </NavLink>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg,#C8102E,#1B2E5E)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: '0.85rem' }}>
              {login.charAt(0).toUpperCase()}
            </div>
            <button onClick={() => setDrawerOpen(true)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.4rem', color: '#1B2E5E', display: 'flex' }}>
              <Menu size={24} />
            </button>
          </div>
        </header>

        {/* ── Drawer Mobile (menu lateral) ─────────────────────────── */}
        {drawerOpen && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 999 }} onClick={() => setDrawerOpen(false)}>
            {/* Overlay */}
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)' }} />
            {/* Drawer */}
            <div
              onClick={e => e.stopPropagation()}
              style={{
                position: 'absolute', top: 0, right: 0, bottom: 0,
                width: '280px', background: '#1B2E5E',
                display: 'flex', flexDirection: 'column',
                animation: 'slideInRight 0.25s ease',
                boxShadow: '-8px 0 32px rgba(0,0,0,0.3)',
              }}>
              {/* Header Drawer */}
              <div style={{ padding: '1.25rem 1.25rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <img src="/logo.png" alt="TT Store" style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }} />
                  <div>
                    <div style={{ color: 'white', fontWeight: 700, fontSize: '0.9rem' }}>{login}</div>
                    <RolePill role={role} />
                  </div>
                </div>
                <button onClick={() => setDrawerOpen(false)}
                  style={{ background: 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer', color: 'white', borderRadius: '8px', padding: '0.4rem', display: 'flex' }}>
                  <X size={20} />
                </button>
              </div>

              {/* Nav Links Drawer */}
              <nav style={{ flex: 1, padding: '0.75rem 0', overflowY: 'auto' }}>
                {navItems.map(({ to, label, Icon, end }) => (
                  <NavLink key={to} to={to} end={end}
                    onClick={() => setDrawerOpen(false)}
                    className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}
                    style={{ fontSize: '1rem', padding: '0.9rem 1.5rem' }}>
                    <Icon size={22} />{label}
                  </NavLink>
                ))}
              </nav>

              {/* Logout Drawer */}
              <div style={{ padding: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <button onClick={handleLogout}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.8rem 1rem', background: 'rgba(200,16,46,0.2)', border: '1px solid rgba(200,16,46,0.3)', borderRadius: '10px', color: '#fca5a5', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem' }}>
                  <LogOut size={18} /> Sair da conta
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Conteúdo da página */}
        <div className="page-content">
          <Outlet />
        </div>

        {/* ══ BOTTOM NAV — Mobile only ════════════════════════════════ */}
        <nav className="bottom-nav">
          {bottomItems.map(({ to, label, Icon, end }) => (
            <NavLink key={to} to={to} end={end}
              className={({ isActive }) => isActive ? 'bottom-nav-item active' : 'bottom-nav-item'}>
              <Icon size={22} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

      </main>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);   opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default Layout;
