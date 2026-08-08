import React, { useState, useCallback } from 'react';
import {
  BarChart3, ShoppingCart, Scissors, Wallet, BookOpen,
  RefreshCw, Printer, TrendingUp, ArrowDownCircle, ArrowUpCircle,
  DollarSign, Users, Calendar, ChevronDown
} from 'lucide-react';
import { fetchWithAuth } from '../utils/fetchWithAuth';
import { getApiUrl } from '../utils/apiUrl';

const getRelatorioApi = () => `${getApiUrl()}/api/relatorio`;

type Periodo = 'hoje' | 'semana' | 'mes' | 'custom';

interface Relatorio {
  periodo: { dataInicio: string; dataFim: string };
  resumo: {
    faturamentoTotal: number; vendasPDV: number; barbearia: number;
    fiadoRecebido: number; saldoCaixa: number;
  };
  vendas: {
    total: number; quantidade: number;
    porFormaPagamento: Record<string, number>;
  };
  barbearia: {
    total: number; quantidade: number;
    porBarbeiro: Record<string, { total: number; quantidade: number }>;
    porFormaPagamento: Record<string, number>;
    porServico: Record<string, number>;
  };
  caixa: { totalSangria: number; totalSuprimento: number };
  fiado: {
    totalDebitosNoPeriodo: number; totalPagamentosNoPeriodo: number;
    quantidadeDebitos: number; quantidadePagamentos: number;
    clientesComSaldo: number; totalDevidoGeral: number; totalClientes: number;
  };
}

const fmt = (v: any) => {
  const n = Number(v) || 0;
  return `R$ ${n.toFixed(2).replace('.', ',')}`;
};

const fmtDate = (iso: string) => {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};

const toIso = (d: Date) => d.toISOString().split('T')[0];

function getRange(p: Periodo): [string, string] {
  const hoje = new Date();
  if (p === 'hoje')  return [toIso(hoje), toIso(hoje)];
  if (p === 'semana') {
    const seg = new Date(hoje); seg.setDate(hoje.getDate() - hoje.getDay() + 1);
    return [toIso(seg), toIso(hoje)];
  }
  const ini = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  return [toIso(ini), toIso(hoje)];
}

// ─── Barra de progresso simples ────────────────────────────────────────────
const BarRow: React.FC<{ label: string; emoji?: string; valor: number; total: number; color: string }> = ({ label, emoji, valor, total, color }) => {
  const pct = total > 0 ? Math.min((valor / total) * 100, 100) : 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.45rem 0' }}>
      <div style={{ width: 120, flexShrink: 0, fontSize: '0.8rem', color: '#475569', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
        {emoji && <span>{emoji}</span>}{label}
      </div>
      <div style={{ flex: 1, height: 8, background: '#f1f5f9', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 99, transition: 'width 0.5s ease' }} />
      </div>
      <div style={{ width: 90, textAlign: 'right', fontWeight: 700, fontSize: '0.82rem', color: '#1B2E5E', flexShrink: 0 }}>{fmt(valor)}</div>
    </div>
  );
};

const Relatorio: React.FC = () => {
  const [periodo, setPeriodo] = useState<Periodo>('mes');
  const [customIni, setCustomIni] = useState('');
  const [customFim, setCustomFim] = useState('');
  const [dados, setDados] = useState<Relatorio | null>(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');

  const buscar = useCallback(async (p: Periodo = periodo, ci = customIni, cf = customFim) => {
    setLoading(true); setErro('');
    try {
      let ini: string, fim: string;
      if (p === 'custom') {
        if (!ci || !cf) { setErro('Selecione as datas.'); setLoading(false); return; }
        ini = ci; fim = cf;
      } else {
        [ini, fim] = getRange(p);
      }
      const r = await fetchWithAuth(`${getRelatorioApi()}?dataInicio=${ini}&dataFim=${fim}`);
      if (r.ok) setDados(await r.json());
      else setErro('Erro ao carregar relatório.');
    } catch { setErro('Sem conexão com o servidor.'); }
    finally { setLoading(false); }
  }, [periodo, customIni, customFim]);

  const KPI: React.FC<{ icon: React.ReactNode; label: string; valor: number; sub?: string; color: string; bg: string }> =
    ({ icon, label, valor, sub, color, bg }) => (
      <div style={{ background: 'white', borderRadius: 14, padding: '1.1rem 1.25rem', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', display: 'flex', gap: '0.85rem', alignItems: 'center' }}>
        <div style={{ width: 46, height: 46, borderRadius: 12, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color }}>
          {icon}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#94a3b8', marginBottom: 2 }}>{label}</div>
          <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#1B2E5E', lineHeight: 1 }}>{fmt(valor)}</div>
          {sub && <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: 2 }}>{sub}</div>}
        </div>
      </div>
    );

  const Section: React.FC<{ title: string; icon: React.ReactNode; color: string; children: React.ReactNode }> =
    ({ title, icon, color, children }) => (
      <div style={{ background: 'white', borderRadius: 16, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
        <div style={{ padding: '0.9rem 1.25rem', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#fafbff' }}>
          <div style={{ color }}>{icon}</div>
          <span style={{ fontWeight: 800, fontSize: '0.92rem', color: '#1B2E5E' }}>{title}</span>
        </div>
        <div style={{ padding: '1rem 1.25rem' }}>{children}</div>
      </div>
    );

  const StatRow: React.FC<{ label: string; value: string | number; bold?: boolean; color?: string }> =
    ({ label, value, bold, color }) => (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.45rem 0', borderBottom: '1px solid #f8fafc' }}>
        <span style={{ fontSize: '0.82rem', color: '#64748b' }}>{label}</span>
        <span style={{ fontSize: '0.88rem', fontWeight: bold ? 800 : 600, color: color || '#1B2E5E' }}>{value}</span>
      </div>
    );

  const pgEmoji: Record<string, string> = { Dinheiro: '💵', Pix: '⬡', 'Cartão': '🃏', Fiado: '📒' };
  const pgColor: Record<string, string> = { Dinheiro: '#16a34a', Pix: '#7c3aed', 'Cartão': '#0369a1', Fiado: '#d97706' };

  return (
    <>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spinRel { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        .rel-kpi-grid { display: grid; grid-template-columns: repeat(auto-fit,minmax(175px,1fr)); gap: 0.9rem; }
        .rel-main-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
        @media(max-width:768px) { .rel-main-grid { grid-template-columns: 1fr; } }
        @media print {
          body * { visibility: hidden !important; }
          #relatorio-print, #relatorio-print * { visibility: visible !important; }
          #relatorio-print { position: absolute; inset: 0; padding: 1rem; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem', animation: 'fadeUp 0.4s ease' }}>

        {/* ── Header ─────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h1 style={{ margin: 0, color: '#1B2E5E', fontSize: '1.4rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <BarChart3 size={24} /> Relatórios
            </h1>
            <p style={{ margin: '0.2rem 0 0', color: '#94a3b8', fontSize: '0.8rem' }}>
              {dados ? `${fmtDate(dados.periodo.dataInicio)} a ${fmtDate(dados.periodo.dataFim)}` : 'Selecione o período e gere o relatório'}
            </p>
          </div>
          {dados && (
            <button className="no-print" onClick={() => window.print()}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 1rem', borderRadius: 8, background: '#1B2E5E', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.82rem', fontFamily: 'inherit' }}>
              <Printer size={15} /> Imprimir
            </button>
          )}
        </div>

        {/* ── Seletor de Período ─────────────────────────────────────── */}
        <div className="no-print" style={{ background: 'white', borderRadius: 14, border: '1px solid #e2e8f0', padding: '1rem 1.25rem', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'flex-end' }}>
          <div>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.45rem' }}>Período</div>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              {(['hoje', 'semana', 'mes', 'custom'] as Periodo[]).map(p => {
                const labels = { hoje: 'Hoje', semana: 'Esta Semana', mes: 'Este Mês', custom: 'Personalizado' };
                const sel = periodo === p;
                return (
                  <button key={p} onClick={() => setPeriodo(p)}
                    style={{ padding: '0.45rem 0.85rem', borderRadius: 8, border: `1.5px solid ${sel ? '#1B2E5E' : '#e2e8f0'}`, background: sel ? '#1B2E5E' : 'white', color: sel ? 'white' : '#475569', fontWeight: sel ? 700 : 500, fontSize: '0.82rem', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}>
                    {labels[p]}
                  </button>
                );
              })}
            </div>
          </div>

          {periodo === 'custom' && (
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.35rem' }}>De</div>
                <input type="date" value={customIni} onChange={e => setCustomIni(e.target.value)}
                  style={{ padding: '0.45rem 0.65rem', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: '0.85rem', fontFamily: 'inherit', outline: 'none' }} />
              </div>
              <div>
                <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.35rem' }}>Até</div>
                <input type="date" value={customFim} onChange={e => setCustomFim(e.target.value)}
                  style={{ padding: '0.45rem 0.65rem', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: '0.85rem', fontFamily: 'inherit', outline: 'none' }} />
              </div>
            </div>
          )}

          <button onClick={() => buscar()}
            disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.6rem 1.3rem', borderRadius: 8, background: loading ? '#94a3b8' : '#C8102E', color: 'white', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 800, fontSize: '0.88rem', fontFamily: 'inherit', transition: 'background 0.2s', boxShadow: loading ? 'none' : '0 3px 10px rgba(200,16,46,0.3)' }}>
            <RefreshCw size={15} style={{ animation: loading ? 'spinRel 0.8s linear infinite' : 'none' }} />
            {loading ? 'Gerando...' : 'Gerar Relatório'}
          </button>
        </div>

        {/* ── Erro ───────────────────────────────────────────────────── */}
        {erro && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '0.75rem 1rem', color: '#b91c1c', fontWeight: 600, fontSize: '0.875rem' }}>
            {erro}
          </div>
        )}

        {/* ── Estado vazio ────────────────────────────────────────────── */}
        {!dados && !loading && !erro && (
          <div style={{ background: 'white', borderRadius: 16, border: '1px solid #e2e8f0', padding: '4rem 2rem', textAlign: 'center', color: '#94a3b8' }}>
            <BarChart3 size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
            <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#64748b' }}>Nenhum relatório gerado</div>
            <div style={{ fontSize: '0.82rem', marginTop: '0.3rem' }}>Selecione o período acima e clique em "Gerar Relatório"</div>
          </div>
        )}

        {/* ── Conteúdo do Relatório ─────────────────────────────────── */}
        {dados && (
          <div id="relatorio-print" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', animation: 'fadeUp 0.35s ease' }}>

            {/* KPIs */}
            <div className="rel-kpi-grid">
              <KPI icon={<TrendingUp size={22} />} label="Faturamento Total" valor={dados.resumo.faturamentoTotal}
                color="#1B2E5E" bg="#EEF2FA"
                sub={`${dados.vendas.quantidade} vendas + ${dados.barbearia.quantidade} cortes`} />
              <KPI icon={<ShoppingCart size={22} />} label="Vendas PDV" valor={dados.resumo.vendasPDV}
                color="#0369a1" bg="#eff6ff" sub={`${dados.vendas.quantidade} vendas`} />
              <KPI icon={<Scissors size={22} />} label="Barbearia" valor={dados.resumo.barbearia}
                color="#7c3aed" bg="#f5f3ff" sub={`${dados.barbearia.quantidade} cortes`} />
              <KPI icon={<BookOpen size={22} />} label="Fiado Recebido" valor={dados.resumo.fiadoRecebido}
                color="#d97706" bg="#fffbeb" sub={`${dados.fiado.quantidadePagamentos} pagamentos`} />
              <KPI icon={<ArrowUpCircle size={22} />} label="Suprimentos" valor={dados.caixa.totalSuprimento}
                color="#16a34a" bg="#f0fdf4" />
              <KPI icon={<ArrowDownCircle size={22} />} label="Sangrias" valor={dados.caixa.totalSangria}
                color="#C8102E" bg="#FEE2E2" />
              <KPI icon={<Wallet size={22} />} label="Saldo na Gaveta" valor={dados.resumo.saldoCaixa}
                color="#16a34a" bg="#f0fdf4"
                sub="Faturamento + Suprimentos − Sangrias" />
            </div>

            {/* Grade principal */}
            <div className="rel-main-grid">

              {/* ── Vendas PDV ────────────────────────────────────────── */}
              <Section title="Vendas PDV" icon={<ShoppingCart size={17} />} color="#0369a1">
                <StatRow label="Total" value={fmt(dados.vendas.total)} bold />
                <StatRow label="Quantidade de Vendas" value={dados.vendas.quantidade} />
                <div style={{ margin: '0.75rem 0 0.3rem', fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Por Forma de Pagamento</div>
                {Object.entries(dados.vendas.porFormaPagamento).sort((a, b) => b[1] - a[1]).map(([fp, v]) => (
                  <BarRow key={fp} label={fp} emoji={pgEmoji[fp]} valor={v} total={dados.vendas.total} color={pgColor[fp] || '#1B2E5E'} />
                ))}
                {Object.keys(dados.vendas.porFormaPagamento).length === 0 && (
                  <div style={{ color: '#94a3b8', fontSize: '0.82rem', padding: '0.5rem 0' }}>Sem vendas no período</div>
                )}
              </Section>

              {/* ── Barbearia ─────────────────────────────────────────── */}
              <Section title="Barbearia" icon={<Scissors size={17} />} color="#7c3aed">
                <StatRow label="Total" value={fmt(dados.barbearia.total)} bold />
                <StatRow label="Total de Cortes" value={dados.barbearia.quantidade} />
                <div style={{ margin: '0.75rem 0 0.3rem', fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Por Barbeiro</div>
                {Object.entries(dados.barbearia.porBarbeiro).map(([nome, info]) => (
                  <BarRow key={nome} label={`${nome} (${info.quantidade}x)`} valor={info.total} total={dados.barbearia.total}
                    color={nome === 'Jacson' ? '#1B2E5E' : '#C8102E'} />
                ))}
                <div style={{ margin: '0.75rem 0 0.3rem', fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Por Serviço</div>
                {Object.entries(dados.barbearia.porServico).sort((a, b) => b[1] - a[1]).map(([s, v]) => {
                  const em = s === 'Cabelo' ? '✂️' : s === 'Barba' ? '🪒' : '✨';
                  return <BarRow key={s} label={s} emoji={em} valor={v} total={dados.barbearia.total} color="#7c3aed" />;
                })}
                <div style={{ margin: '0.75rem 0 0.3rem', fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Por Pagamento</div>
                {Object.entries(dados.barbearia.porFormaPagamento).sort((a, b) => b[1] - a[1]).map(([fp, v]) => (
                  <BarRow key={fp} label={fp} emoji={pgEmoji[fp]} valor={v} total={dados.barbearia.total} color={pgColor[fp] || '#7c3aed'} />
                ))}
              </Section>

              {/* ── Fiado ─────────────────────────────────────────────── */}
              <Section title="Fiado" icon={<BookOpen size={17} />} color="#d97706">
                <StatRow label="Débitos no período" value={fmt(dados.fiado.totalDebitosNoPeriodo)} color="#C8102E" bold />
                <StatRow label="Pagamentos recebidos" value={fmt(dados.fiado.totalPagamentosNoPeriodo)} color="#16a34a" bold />
                <StatRow label="Nº Lançamentos fiado" value={dados.fiado.quantidadeDebitos} />
                <StatRow label="Nº Pagamentos" value={dados.fiado.quantidadePagamentos} />
                <div style={{ margin: '0.75rem 0 0.3rem', fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Carteira Geral</div>
                <StatRow label="Total de Clientes" value={dados.fiado.totalClientes} />
                <StatRow label="Clientes com saldo devedor" value={dados.fiado.clientesComSaldo} />
                <StatRow label="Total devido (todos)" value={fmt(dados.fiado.totalDevidoGeral)} color="#C8102E" bold />
              </Section>

              {/* ── Movimentações de Caixa ────────────────────────────── */}
              <Section title="Movimentações de Caixa" icon={<Wallet size={17} />} color="#16a34a">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div style={{ background: '#f0fdf4', borderRadius: 10, padding: '0.85rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Suprimentos</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#15803d', marginTop: 2 }}>{fmt(dados.caixa.totalSuprimento)}</div>
                  </div>
                  <div style={{ background: '#FEE2E2', borderRadius: 10, padding: '0.85rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#C8102E', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Sangrias</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#C8102E', marginTop: 2 }}>{fmt(dados.caixa.totalSangria)}</div>
                  </div>
                </div>

                {/* Resumo financeiro final */}
                <div style={{ background: 'linear-gradient(135deg,#111D3D,#1B2E5E)', borderRadius: 12, padding: '1rem 1.25rem', marginTop: '0.5rem' }}>
                  <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.5rem' }}>Resumo do Período</div>
                  {[
                    ['Vendas PDV', dados.resumo.vendasPDV],
                    ['Barbearia', dados.resumo.barbearia],
                    ['Fiado Recebido', dados.resumo.fiadoRecebido],
                    ['(+) Suprimentos', dados.caixa.totalSuprimento],
                    ['(−) Sangrias', -dados.caixa.totalSangria],
                  ].map(([label, val]) => (
                    <div key={label as string} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                      <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.6)' }}>{label as string}</span>
                      <span style={{ fontSize: '0.82rem', fontWeight: 700, color: Number(val) >= 0 ? '#86efac' : '#fca5a5' }}>{fmt(Math.abs(Number(val)))}</span>
                    </div>
                  ))}
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.15)', marginTop: '0.5rem', paddingTop: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 800, color: 'white', fontSize: '0.88rem' }}>Saldo na Gaveta</span>
                    <span style={{ fontWeight: 900, color: '#4ade80', fontSize: '1.05rem' }}>{fmt(dados.resumo.saldoCaixa)}</span>
                  </div>
                </div>
              </Section>

            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default Relatorio;
