import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';

import Dashboard from './pages/Dashboard';
import Estoque from './pages/Estoque';
import PDV from './pages/PDV';
import Barbearia from './pages/Barbearia';
import Caixa from './pages/Caixa';
import Login from './pages/Login';
import Configuracoes from './pages/Configuracoes';
import Fiado from './pages/Fiado';
import Relatorio from './pages/Relatorio';
import Auditoria from './pages/Auditoria';
import axios from 'axios';
import { Lock } from 'lucide-react';

// Interceptor global do Axios
axios.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── helpers ──────────────────────────────────────────────────────
function decodeJwt(token: string): Record<string, any> | null {
  try {
    return JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
  } catch { return null; }
}

function getRole(): string {
  const token = localStorage.getItem('token');
  if (!token) return '';
  const payload = decodeJwt(token);
  const roles: string[] = payload?.roles || payload?.authorities || [];
  if (roles.some((r: string) => r.includes('ADMIN'))) return 'ADMIN';
  if (roles.some((r: string) => r.includes('CAIXA'))) return 'CAIXA';
  return 'USER';
}

// ── Permissões granulares ─────────────────────────────────────────
export type PermLevel = 'NONE' | 'VIEW' | 'EDIT';

const DEFAULT_PERMS: Record<string, Record<string, PermLevel>> = {
  ADMIN: { inicio:'EDIT', pdv:'EDIT', caixa:'EDIT', estoque:'EDIT', barbearia:'EDIT', fiado:'EDIT', relatorio:'EDIT', auditoria:'EDIT', config:'EDIT' },
  USER:  { inicio:'VIEW', pdv:'EDIT', caixa:'EDIT', estoque:'EDIT', barbearia:'EDIT', fiado:'EDIT', relatorio:'VIEW', auditoria:'VIEW', config:'NONE' },
  CAIXA: { inicio:'VIEW', pdv:'EDIT', caixa:'EDIT', estoque:'VIEW', barbearia:'NONE', fiado:'EDIT', relatorio:'NONE', auditoria:'NONE', config:'NONE' },
};

export function getUserPermissions(): Record<string, PermLevel> {
  const role = getRole();
  const defaults = DEFAULT_PERMS[role] || DEFAULT_PERMS['USER'];
  try {
    const stored = localStorage.getItem('userPermissions');
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...defaults, ...parsed };
    }
  } catch {}
  return defaults;
}

export function canAccess(moduleKey: string): boolean {
  if (!moduleKey) return true;
  return getUserPermissions()[moduleKey] !== 'NONE';
}

export function canEdit(moduleKey: string): boolean {
  if (!moduleKey) return true;
  return getUserPermissions()[moduleKey] === 'EDIT';
}

// ── Mapa rota → módulo ────────────────────────────────────────────
const PATH_MODULE: Record<string, string> = {
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

// ── Auth Guard ────────────────────────────────────────────────────
const AuthGuard = ({ children }: { children: React.ReactNode }) => {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

// ── Permission Guard ──────────────────────────────────────────────
const PermGuard = ({ rota, children }: { rota: string; children: React.ReactNode }) => {
  const moduleKey = PATH_MODULE[rota] ?? '';
  if (!canAccess(moduleKey)) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', height: '60vh', gap: '1rem', color: '#94a3b8'
      }}>
        <Lock size={52} />
        <h2 style={{ margin: 0, color: '#1e293b' }}>Acesso Negado</h2>
        <p style={{ margin: 0, color: '#64748b', textAlign: 'center' }}>
          Você não tem permissão para acessar esta página.
        </p>
      </div>
    );
  }
  return <>{children}</>;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<AuthGuard><Layout /></AuthGuard>}>
          <Route index                element={<PermGuard rota="/"><Dashboard /></PermGuard>} />
          <Route path="pdv"       element={<PermGuard rota="/pdv"><PDV /></PermGuard>} />
          <Route path="caixa"     element={<PermGuard rota="/caixa"><Caixa /></PermGuard>} />
          <Route path="estoque"   element={<PermGuard rota="/estoque"><Estoque /></PermGuard>} />
          <Route path="barbearia" element={<PermGuard rota="/barbearia"><Barbearia /></PermGuard>} />
          <Route path="fiado"     element={<PermGuard rota="/fiado"><Fiado /></PermGuard>} />
          <Route path="relatorio" element={<PermGuard rota="/relatorio"><Relatorio /></PermGuard>} />
          <Route path="auditoria" element={<PermGuard rota="/auditoria"><Auditoria /></PermGuard>} />
          <Route path="config"    element={<PermGuard rota="/config"><Configuracoes /></PermGuard>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
