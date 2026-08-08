import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldAlert, Search, RefreshCw, Trash2, Edit3, PlusCircle,
  LogIn, Eye, Filter, Printer, Clock, Download, Zap, ZapOff, FileSpreadsheet
} from 'lucide-react';
import { fetchWithAuth } from '../utils/fetchWithAuth';
import { getApiUrl } from '../utils/apiUrl';

interface AuditLog {
  id: number;
  dataHora: string;
  usuario: string;
  role: string;
  acao: 'EXCLUSAO' | 'EDICAO' | 'CRIACAO' | 'LOGIN' | 'ACESSO' | string;
  modulo: string;
  descricao: string;
  ip: string;
}

interface ResumoAuditoria {
  totalHoje: number;
  exclusoesHoje: number;
  edicoesHoje: number;
  loginsHoje: number;
}

const Auditoria: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [resumo, setResumo] = useState<ResumoAuditoria | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filtroAcao, setFiltroAcao] = useState<string>('TODAS');
  const [filtroModulo, setFiltroModulo] = useState<string>('TODOS');
  const [periodo, setPeriodo] = useState<'hoje' | '7dias' | 'mes' | 'tudo'>('tudo');
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fmtDataHora = (isoStr: string) => {
    if (!isoStr) return '-';
    try {
      const d = new Date(isoStr);
      return d.toLocaleString('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      });
    } catch { return isoStr; }
  };

  const loadLogs = useCallback(async () => {
    try {
      setLoading(true);
      let queryParams = '';
      const hoje = new Date();
      const fmtIso = (d: Date) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      if (periodo === 'hoje') {
        queryParams = `?dataInicio=${fmtIso(hoje)}&dataFim=${fmtIso(hoje)}`;
      } else if (periodo === '7dias') {
        const d7 = new Date(); d7.setDate(hoje.getDate() - 7);
        queryParams = `?dataInicio=${fmtIso(d7)}&dataFim=${fmtIso(hoje)}`;
      } else if (periodo === 'mes') {
        const dMes = new Date(); dMes.setDate(1);
        queryParams = `?dataInicio=${fmtIso(dMes)}&dataFim=${fmtIso(hoje)}`;
      }

      const [resLogs, resResumo] = await Promise.all([
        fetchWithAuth(`${getApiUrl()}/api/auditoria${queryParams}`),
        fetchWithAuth(`${getApiUrl()}/api/auditoria/resumo`)
      ]);

      if (resLogs.ok) {
        const data = await resLogs.json();
        setLogs(Array.isArray(data) ? data : []);
      } else {
        setLogs([]);
      }
      if (resResumo.ok) setResumo(await resResumo.json());
    } catch (e) {
      console.error('Erro ao carregar logs:', e);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [periodo]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  // Atualização automática a cada 10s se ativada
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      loadLogs();
    }, 10000);
    return () => clearInterval(interval);
  }, [autoRefresh, loadLogs]);

  // Filtros aplicados com proteção total contra nulos
  const logsFiltrados = logs.filter(l => {
    const u = (l.usuario || '').toLowerCase();
    const d = (l.descricao || '').toLowerCase();
    const ip = l.ip || '';
    const ac = (l.acao || '').toUpperCase();
    const mo = (l.modulo || '').toLowerCase();
    const s = search.toLowerCase();

    const matchSearch = !search || u.includes(s) || d.includes(s) || ip.includes(s);
    const matchAcao = filtroAcao === 'TODAS' || ac === filtroAcao.toUpperCase();
    const matchModulo = filtroModulo === 'TODOS' || mo === filtroModulo.toLowerCase();

    return matchSearch && matchAcao && matchModulo;
  });

  const getAcaoBadge = (acao: string) => {
    switch ((acao || '').toUpperCase()) {
      case 'EXCLUSAO':
        return { bg: '#FEE2E2', color: '#DC2626', icon: Trash2, label: 'Exclusão' };
      case 'EDICAO':
        return { bg: '#FEF3C7', color: '#D97706', icon: Edit3, label: 'Edição' };
      case 'CRIACAO':
        return { bg: '#D1FAE5', color: '#059669', icon: PlusCircle, label: 'Criação' };
      case 'LOGIN':
        return { bg: '#F3E8FF', color: '#7E22CE', icon: LogIn, label: 'Login' };
      default:
        return { bg: '#EFF6FF', color: '#2563EB', icon: Eye, label: acao || 'Acesso' };
    }
  };

  const handleExportCsv = () => {
    if (logsFiltrados.length === 0) return;
    const headers = ['ID', 'Data/Hora', 'Usuario', 'Perfil', 'Acao', 'Modulo', 'Descricao', 'IP'];
    const rows = logsFiltrados.map(l => [
      l.id,
      `"${fmtDataHora(l.dataHora)}"`,
      `"${l.usuario || ''}"`,
      `"${l.role || ''}"`,
      `"${l.acao || ''}"`,
      `"${l.modulo || ''}"`,
      `"${(l.descricao || '').replace(/"/g, '""')}"`,
      `"${l.ip || ''}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `registro_atividades_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleLimparAntigos = async () => {
    if (!confirm('Deseja remover registros de atividades com mais de 30 dias?')) return;
    try {
      const r = await fetchWithAuth(`${getApiUrl()}/api/auditoria/limpar?dias=30`, { method: 'DELETE' });
      if (r.ok) {
        const data = await r.json();
        alert(`${data.deletados || 0} registros antigos foram limpos com sucesso.`);
        loadLogs();
      }
    } catch {
      alert('Erro ao limpar registros antigos.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', paddingBottom: '2rem' }}>
      
      {/* ── Cabeçalho ────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ margin: 0, color: '#1B2E5E', fontSize: '1.4rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <ShieldAlert size={26} color="#C8102E" /> Registro de Atividades
          </h1>
          <p style={{ margin: '0.2rem 0 0', color: '#64748B', fontSize: '0.85rem' }}>
            Monitoramento detalhado de quem acessou, criou, editou ou excluiu informações no sistema
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              padding: '0.55rem 0.9rem', borderRadius: '8px',
              border: autoRefresh ? '1px solid #6EE7B7' : '1px solid #E2E8F0',
              background: autoRefresh ? '#F0FDF4' : 'white',
              color: autoRefresh ? '#065F46' : '#64748B',
              cursor: 'pointer', fontWeight: 700, fontSize: '0.82rem'
            }}
            title="Atualizar automaticamente a cada 10s"
          >
            {autoRefresh ? <Zap size={15} color="#10B981" /> : <ZapOff size={15} />}
            {autoRefresh ? 'Auto 10s: ON' : 'Auto 10s: OFF'}
          </button>

          <button
            onClick={loadLogs}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              padding: '0.55rem 0.9rem', borderRadius: '8px',
              border: '1px solid #E2E8F0', background: 'white',
              cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem', color: '#1B2E5E'
            }}
          >
            <RefreshCw size={15} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            Atualizar
          </button>

          <button
            onClick={handleExportCsv}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              padding: '0.55rem 0.9rem', borderRadius: '8px',
              border: '1px solid #CBD5E1', background: 'white',
              cursor: 'pointer', fontWeight: 700, fontSize: '0.82rem', color: '#0F172A'
            }}
          >
            <FileSpreadsheet size={15} color="#059669" /> Exportar CSV
          </button>

          <button
            onClick={() => window.print()}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              padding: '0.55rem 0.9rem', borderRadius: '8px',
              border: 'none', background: '#1B2E5E', color: 'white',
              cursor: 'pointer', fontWeight: 700, fontSize: '0.82rem'
            }}
          >
            <Printer size={15} /> Imprimir Log
          </button>
        </div>
      </div>

      {/* ── Cards de Métricas ────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        
        {/* Total Hoje */}
        <div style={{ background: 'white', borderRadius: '12px', padding: '1rem 1.25rem', border: '1px solid #E2E8F0', boxShadow: '0 2px 6px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Ações Registradas Hoje</span>
            <Clock size={18} color="#1B2E5E" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#1B2E5E', marginTop: '0.4rem' }}>
            {resumo?.totalHoje ?? 0}
          </div>
        </div>

        {/* Exclusões Hoje */}
        <div style={{ background: '#FEF2F2', borderRadius: '12px', padding: '1rem 1.25rem', border: '1px solid #FECACA', boxShadow: '0 2px 6px rgba(220,38,38,0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#DC2626', textTransform: 'uppercase' }}>Exclusões Hoje</span>
            <Trash2 size={18} color="#DC2626" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#DC2626', marginTop: '0.4rem' }}>
            {resumo?.exclusoesHoje ?? 0}
          </div>
        </div>

        {/* Edições Hoje */}
        <div style={{ background: '#FEF3C7', borderRadius: '12px', padding: '1rem 1.25rem', border: '1px solid #FDE68A', boxShadow: '0 2px 6px rgba(217,119,6,0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#D97706', textTransform: 'uppercase' }}>Edições Hoje</span>
            <Edit3 size={18} color="#D97706" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#D97706', marginTop: '0.4rem' }}>
            {resumo?.edicoesHoje ?? 0}
          </div>
        </div>

        {/* Logins Hoje */}
        <div style={{ background: '#F3E8FF', borderRadius: '12px', padding: '1rem 1.25rem', border: '1px solid #E9D5FF', boxShadow: '0 2px 6px rgba(126,34,206,0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#7E22CE', textTransform: 'uppercase' }}>Logins Efetuados</span>
            <LogIn size={18} color="#7E22CE" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#7E22CE', marginTop: '0.4rem' }}>
            {resumo?.loginsHoje ?? 0}
          </div>
        </div>
      </div>

      {/* ── Filtros e Buscas ─────────────────────────────────────── */}
      <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #E2E8F0', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem', boxShadow: '0 2px 8px rgba(27,46,94,0.05)' }}>
        
        {/* Linha 1: Seletor de Período + Busca */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          
          {/* Seletor de Período */}
          <div style={{ display: 'flex', gap: '0.35rem', background: '#F1F5F9', padding: '0.25rem', borderRadius: '10px' }}>
            {(['hoje', '7dias', 'mes', 'tudo'] as const).map(p => (
              <button
                key={p}
                onClick={() => setPeriodo(p)}
                style={{
                  padding: '0.45rem 0.85rem', borderRadius: '8px', border: 'none',
                  background: periodo === p ? '#1B2E5E' : 'transparent',
                  color: periodo === p ? 'white' : '#64748B',
                  fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
              >
                {p === 'hoje' ? 'Hoje' : p === '7dias' ? '7 Dias' : p === 'mes' ? 'Este Mês' : 'Todos'}
              </button>
            ))}
          </div>

          {/* Campo de Busca */}
          <div style={{ position: 'relative', flex: 1, maxWidth: '380px', minWidth: '220px' }}>
            <Search size={16} style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por usuário, detalhes ou IP..."
              style={{
                width: '100%', padding: '0.55rem 0.8rem 0.55rem 2.4rem',
                border: '1.5px solid #E2E8F0', borderRadius: '8px',
                fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box'
              }}
            />
          </div>
        </div>

        {/* Linha 2: Pills de Filtro por Ação */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <Filter size={14} /> Ação:
          </span>
          {(['TODAS', 'EXCLUSAO', 'EDICAO', 'CRIACAO', 'LOGIN'] as const).map(ac => {
            const isSel = filtroAcao === ac;
            return (
              <button
                key={ac}
                onClick={() => setFiltroAcao(ac)}
                style={{
                  padding: '0.3rem 0.65rem', borderRadius: '6px',
                  border: isSel ? '1.5px solid #1B2E5E' : '1px solid #E2E8F0',
                  background: isSel ? '#EEF2FA' : 'white',
                  color: isSel ? '#1B2E5E' : '#64748B',
                  fontWeight: isSel ? 800 : 600, fontSize: '0.74rem', cursor: 'pointer'
                }}
              >
                {ac === 'TODAS' ? 'Todas' : ac === 'EXCLUSAO' ? 'Exclusões' : ac === 'EDICAO' ? 'Edições' : ac === 'CRIACAO' ? 'Criações' : 'Logins'}
              </button>
            );
          })}

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              onClick={handleLimparAntigos}
              style={{ background: 'none', border: 'none', color: '#DC2626', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.3rem' }}
              title="Limpar logs com mais de 30 dias"
            >
              <Trash2 size={13} /> Limpar +30 dias
            </button>
          </div>
        </div>
      </div>

      {/* ── Tabela de Logs ────────────────────────────────────────── */}
      <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #E2E8F0', overflow: 'hidden', boxShadow: '0 2px 8px rgba(27,46,94,0.05)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: '#F8FAFC', borderBottom: '2px solid #E2E8F0', color: '#64748B', fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <th style={{ padding: '0.85rem 1rem' }}>Data & Hora</th>
                <th style={{ padding: '0.85rem 1rem' }}>Usuário</th>
                <th style={{ padding: '0.85rem 1rem' }}>Ação</th>
                <th style={{ padding: '0.85rem 1rem' }}>Módulo</th>
                <th style={{ padding: '0.85rem 1rem' }}>Detalhes da Atividade</th>
                <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>IP Dispositivo</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: '#64748B' }}>
                    <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', marginBottom: '0.5rem' }} /><br />
                    Carregando histórico de atividades...
                  </td>
                </tr>
              ) : logsFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: '#64748B' }}>
                    Nenhuma atividade registrada para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                logsFiltrados.map(l => {
                  const badge = getAcaoBadge(l.acao);
                  const Icon = badge.icon;
                  return (
                    <tr key={l.id} style={{ borderBottom: '1px solid #F1F5F9', transition: 'background 0.15s' }}>
                      <td style={{ padding: '0.8rem 1rem', color: '#475569', fontWeight: 600, whiteSpace: 'nowrap', fontSize: '0.8rem' }}>
                        {fmtDataHora(l.dataHora)}
                      </td>
                      <td style={{ padding: '0.8rem 1rem', whiteSpace: 'nowrap' }}>
                        <div style={{ fontWeight: 800, color: '#1B2E5E' }}>{l.usuario || 'Sistema'}</div>
                        <div style={{ fontSize: '0.68rem', color: '#94A3B8', fontWeight: 700 }}>{l.role || 'USER'}</div>
                      </td>
                      <td style={{ padding: '0.8rem 1rem', whiteSpace: 'nowrap' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.2rem 0.55rem', borderRadius: '6px', background: badge.bg, color: badge.color, fontSize: '0.72rem', fontWeight: 800 }}>
                          <Icon size={12} /> {badge.label}
                        </span>
                      </td>
                      <td style={{ padding: '0.8rem 1rem', fontWeight: 700, color: '#334155', whiteSpace: 'nowrap' }}>
                        {l.modulo || 'Geral'}
                      </td>
                      <td style={{ padding: '0.8rem 1rem', color: '#1E293B', lineHeight: 1.4 }}>
                        {l.descricao || 'Atividade realizada'}
                      </td>
                      <td style={{ padding: '0.8rem 1rem', textAlign: 'right', color: '#94A3B8', fontFamily: 'monospace', fontSize: '0.76rem', whiteSpace: 'nowrap' }}>
                        {l.ip || '127.0.0.1'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Auditoria;
