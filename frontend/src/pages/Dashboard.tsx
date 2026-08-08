import React, { useState, useEffect } from 'react';
import {
  TrendingUp, ShoppingBag, Package, Star,
  ShoppingCart, Wallet, Scissors, ArrowRight, RefreshCw, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import { fetchWithAuth } from '../utils/fetchWithAuth';
import { getApiUrl } from '../utils/apiUrl';

/* ── Brand Colors (extraídas do logo TT Store) ─────────────── */
const BRAND = {
  navy:      '#1B2E5E',   // azul marinho do fundo do logo
  navyLight: '#243A72',   // azul um tom mais claro
  navyDark:  '#111D3D',   // azul mais escuro para contraste
  red:       '#C8102E',   // vermelho do "store" e poste
  redLight:  '#E63950',   // vermelho com brilho
  white:     '#FFFFFF',
  offWhite:  '#F5F7FB',   // fundo da página
  silver:    '#E2E8F0',   // bordas suaves
  muted:     '#64748B',   // texto secundário
};

interface DashboardResumo {
  vendasHoje: number;
  vendas30Dias: number;
  produtoMaisVendido: string;
  totalPecasEstoque: number;
  caixaHoje: ResumoCaixa;
  caixaUltimos30Dias: ResumoCaixa[];
}

interface ResumoCaixa {
  data: string;
  entradas: number;
  saidas: number;
  saldo: number;
  movimentacoes: number;
}

/* ── Mini Barchart semanal ───────────────────────────────────── */
const WEEK = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
function BarChart({ accent }: { accent: string }) {
  const [vals] = useState(() => WEEK.map(() => 30 + Math.random() * 65));
  const max = Math.max(...vals);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '36px' }}>
      {vals.map((v, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
          <div style={{
            width: '100%',
            height: `${(v / max) * 30}px`,
            background: accent,
            borderRadius: '2px 2px 0 0',
            transition: 'height 0.8s ease',
          }} />
          <span style={{ fontSize: '8px', color: BRAND.muted, letterSpacing: '0' }}>{WEEK[i]}</span>
        </div>
      ))}
    </div>
  );
}

/* ── Skeleton shimmer ────────────────────────────────────────── */
function Skeleton() {
  return (
    <div style={{
      height: '2rem', borderRadius: '6px', width: '80%',
      background: `linear-gradient(90deg, ${BRAND.silver} 25%, #f1f5f9 50%, ${BRAND.silver} 75%)`,
      backgroundSize: '200% 100%',
      animation: 'ttShimmer 1.4s infinite',
    }} />
  );
}

const Dashboard: React.FC = () => {
  const [resumo, setResumo] = useState<DashboardResumo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [spinning, setSpinning] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      setLoading(true); setError(null);
      const res = await fetchWithAuth(`${getApiUrl()}/api/dashboard`);
      if (!res.ok) throw new Error();
      const d = await res.json();
      setResumo({
        vendasHoje:          Number(d.vendasHoje)          || 0,
        vendas30Dias:        Number(d.vendas30Dias)        || 0,
        produtoMaisVendido:  d.produtoMaisVendido          || 'Nenhum',
        totalPecasEstoque:   Number(d.totalPecasEstoque)   || 0,
        caixaHoje: {
          data: d.caixaHoje?.data || new Date().toISOString().slice(0, 10),
          entradas: Number(d.caixaHoje?.entradas) || 0,
          saidas: Number(d.caixaHoje?.saidas) || 0,
          saldo: Number(d.caixaHoje?.saldo) || 0,
          movimentacoes: Number(d.caixaHoje?.movimentacoes) || 0,
        },
        caixaUltimos30Dias: Array.isArray(d.caixaUltimos30Dias) ? d.caixaUltimos30Dias.map((item: any) => ({
          data: item.data,
          entradas: Number(item.entradas) || 0,
          saidas: Number(item.saidas) || 0,
          saldo: Number(item.saldo) || 0,
          movimentacoes: Number(item.movimentacoes) || 0,
        })) : [],
      });
    } catch { setError('Não foi possível carregar o painel.'); }
    finally   { setLoading(false); setSpinning(false); }
  };

  const handleRefresh = () => { setSpinning(true); load(); };
  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const fmtDate = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  const username = localStorage.getItem('username') || 'Administrador';
  const h = new Date().getHours();
  const greet = h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';

  /* ── KPI Cards ── */
  const kpis = [
    {
      label:    'Vendas Hoje',
      value:    resumo ? fmt(resumo.vendasHoje) : null,
      sub:      'receita do dia',
      Icon:     TrendingUp,
      accent:   BRAND.red,
      accentBg: '#FFF0F2',
      bar:      '#FBAABB',
    },
    {
      label:    'Últimos 30 Dias',
      value:    resumo ? fmt(resumo.vendas30Dias) : null,
      sub:      'faturamento mensal',
      Icon:     ShoppingBag,
      accent:   BRAND.navy,
      accentBg: '#EEF2FA',
      bar:      '#93A8D4',
    },
    {
      label:    'Produto Destaque',
      value:    resumo ? resumo.produtoMaisVendido : null,
      sub:      'mais vendido',
      Icon:     Star,
      accent:   '#B45309',
      accentBg: '#FEF3C7',
      bar:      null,
      isText:   true,
    },
    {
      label:    'Peças em Estoque',
      value:    resumo ? resumo.totalPecasEstoque.toLocaleString('pt-BR') : null,
      sub:      'unidades disponíveis',
      Icon:     Package,
      accent:   '#0D7A4E',
      accentBg: '#DCFCE7',
      bar:      '#6EE7B7',
    },
  ];

  /* ── Quick Actions ── */
  const actions = [
    { href: '/pdv',       Icon: ShoppingCart, label: 'Frente de Caixa', sub: 'Registrar venda',          delay: '0.05s' },
    { href: '/caixa',     Icon: Wallet,        label: 'Caixa',           sub: 'Resumo financeiro do dia',  delay: '0.10s' },
    { href: '/estoque',   Icon: Package,       label: 'Estoque',         sub: 'Gerenciar produtos',        delay: '0.15s' },
    { href: '/barbearia', Icon: Scissors,      label: 'Barbearia',       sub: 'Serviços e agendamentos',   delay: '0.20s' },
  ];

  return (
    <>
      <style>{`
        @keyframes ttShimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes ttFadeUp {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes ttSpin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        .tt-kpi {
          background: #fff;
          border-radius: 14px;
          border: 1px solid ${BRAND.silver};
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          box-shadow: 0 2px 8px rgba(27,46,94,0.07);
          transition: box-shadow 0.25s, transform 0.25s;
          animation: ttFadeUp 0.5s ease both;
        }
        .tt-kpi:hover {
          box-shadow: 0 8px 28px rgba(27,46,94,0.14);
          transform: translateY(-4px);
        }
        .tt-action {
          background: #fff;
          border: 1px solid ${BRAND.silver};
          border-radius: 14px;
          padding: 1.4rem 1.5rem;
          text-decoration: none;
          display: flex;
          align-items: center;
          gap: 1rem;
          transition: box-shadow 0.25s, transform 0.25s, border-color 0.25s;
          box-shadow: 0 2px 8px rgba(27,46,94,0.07);
          animation: ttFadeUp 0.5s ease both;
          cursor: pointer;
        }
        .tt-action:hover {
          box-shadow: 0 8px 28px rgba(27,46,94,0.14);
          transform: translateY(-4px);
          border-color: ${BRAND.navy};
        }
        .tt-action:hover .tt-arrow {
          transform: translateX(4px);
          opacity: 1;
        }
        .tt-arrow {
          margin-left: auto;
          opacity: 0.35;
          color: ${BRAND.navy};
          transition: transform 0.25s, opacity 0.25s;
          flex-shrink: 0;
        }
        .tt-section-title {
          font-size: 0.7rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          color: ${BRAND.muted};
        }
        .tt-hero-header {
          background: linear-gradient(135deg, ${BRAND.navyDark} 0%, ${BRAND.navy} 60%, ${BRAND.navyLight} 100%);
          border-radius: 18px;
          padding: 2rem 2.5rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 1.5rem;
          position: relative;
          overflow: hidden;
          box-shadow: 0 8px 32px rgba(27,46,94,0.35);
          animation: ttFadeUp 0.4s ease both;
        }
        .tt-hero-watermark {
          position: absolute;
          bottom: -40px;
          left: 30%;
          width: 210px;
          height: 210px;
          border-radius: 50%;
          overflow: hidden;
          pointer-events: none;
          opacity: 0.15;
          border: 2px solid rgba(255,255,255,0.25);
          box-shadow: 0 0 30px rgba(255,255,255,0.1);
        }
        .tt-hero-title {
          margin: 0;
          color: ${BRAND.white};
          font-size: 1.75rem;
          font-weight: 800;
          letter-spacing: -0.5px;
          line-height: 1.1;
        }
        .tt-hero-avatar {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          border: 3px solid rgba(255,255,255,0.2);
          object-fit: cover;
          flex-shrink: 0;
        }
        @media (max-width: 768px) {
          .tt-hero-header {
            padding: 1.25rem 1rem !important;
            gap: 1rem !important;
            border-radius: 14px !important;
          }
          .tt-hero-watermark {
            width: 120px !important;
            height: 120px !important;
            bottom: -20px !important;
            right: -10px !important;
            left: auto !important;
            opacity: 0.18 !important;
          }
          .tt-hero-title {
            font-size: 1.25rem !important;
          }
          .tt-hero-avatar {
            width: 48px !important;
            height: 48px !important;
          }
        }
      `}</style>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

        {/* ══ HERO HEADER ══════════════════════════════════════════════ */}
        <div className="tt-hero-header">
          {/* Decoração: estrela do logo */}
          <div style={{
            position: 'absolute', top: '-30px', right: '120px',
            width: '180px', height: '180px', borderRadius: '50%',
            background: `radial-gradient(circle, ${BRAND.red}22, transparent 70%)`,
            pointerEvents: 'none',
          }} />
          {/* Marca d'água do símbolo TT Store na bola de fundo */}
          <div className="tt-hero-watermark">
            <img
              src="/logo.png"
              alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>

          {/* Logo + Saudação */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', position: 'relative', zIndex: 1, minWidth: 0, flex: 1 }}>
            <img
              src="/logo.png"
              alt="TT Store"
              className="tt-hero-avatar"
            />
            <div style={{ minWidth: 0 }}>
              <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.8rem', fontWeight: 500, marginBottom: '0.15rem', letterSpacing: '0.04em' }}>
                {greet}, {username}
              </div>
              <h1 className="tt-hero-title">
                TT Store &amp; Barbearia
              </h1>
              <div style={{ marginTop: '0.3rem', color: 'rgba(255,255,255,0.45)', fontSize: '0.75rem' }}>
                {new Date().toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })}
              </div>
            </div>
          </div>

          {/* Botão Atualizar */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem', position: 'relative', zIndex: 1, marginLeft: 'auto' }}>
            {error && (
              <span style={{ color: '#fca5a5', fontSize: '0.78rem', background: 'rgba(200,16,46,0.25)', padding: '0.35rem 0.8rem', borderRadius: '6px', border: '1px solid rgba(200,16,46,0.4)' }}>
                ⚠️ {error}
              </span>
            )}
            <button
              onClick={handleRefresh}
              disabled={loading || spinning}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                background: BRAND.red,
                color: BRAND.white,
                border: 'none',
                borderRadius: '10px',
                padding: '0.65rem 1.4rem',
                cursor: 'pointer',
                fontSize: '0.85rem',
                fontWeight: 600,
                letterSpacing: '0.02em',
                boxShadow: `0 4px 14px rgba(200,16,46,0.4)`,
                transition: 'background 0.2s, transform 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = BRAND.redLight)}
              onMouseLeave={e => (e.currentTarget.style.background = BRAND.red)}
            >
              <RefreshCw size={14} style={{ animation: spinning ? 'ttSpin 0.8s linear infinite' : 'none' }} />
              Atualizar
            </button>
          </div>
        </div>

        {/* ══ KPI CARDS ════════════════════════════════════════════════ */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <span className="tt-section-title">Indicadores</span>
            <div className="tt-divider-line" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1rem' }}>
            {kpis.map(({ label, value, sub, Icon, accent, accentBg, bar, isText }, idx) => (
              <div key={label} className="tt-kpi" style={{ animationDelay: `${0.05 + idx * 0.08}s` }}>
                {/* Top row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{
                    width: '42px', height: '42px', borderRadius: '10px',
                    background: accentBg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: accent, flexShrink: 0,
                  }}>
                    <Icon size={20} />
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: BRAND.muted }}>
                      {label}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: BRAND.muted, opacity: 0.7 }}>{sub}</div>
                  </div>
                </div>

                {/* Value */}
                {loading ? (
                  <Skeleton />
                ) : (
                  <div style={{
                    fontSize: isText ? '1rem' : '1.6rem',
                    fontWeight: 800,
                    color: BRAND.navy,
                    letterSpacing: isText ? '0' : '-0.5px',
                    lineHeight: 1.15,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {value}
                  </div>
                )}

                {/* Divider + Barchart */}
                {!isText && bar && (
                  <>
                    <div style={{ height: '1px', background: BRAND.silver }} />
                    <BarChart accent={bar} />
                  </>
                )}
                {isText && (
                  <div style={{
                    fontSize: '0.72rem', color: accent,
                    background: accentBg, display: 'inline-flex',
                    alignItems: 'center', gap: '0.3rem',
                    padding: '0.25rem 0.6rem', borderRadius: '6px',
                    fontWeight: 600, width: 'fit-content',
                  }}>
                    ★ Destaque da semana
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <span className="tt-section-title">Relatório de Caixa</span>
            <div className="tt-divider-line" />
            <a href="/caixa" style={{ color: BRAND.red, fontSize: '0.78rem', fontWeight: 700, textDecoration: 'none' }}>Abrir caixa</a>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(185px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
            {[
              { label: 'Entradas hoje', value: resumo?.caixaHoje.entradas || 0, Icon: ArrowUpRight, color: '#0D7A4E', bg: '#DCFCE7' },
              { label: 'Saídas hoje', value: resumo?.caixaHoje.saidas || 0, Icon: ArrowDownRight, color: BRAND.red, bg: '#FFF0F2' },
              { label: 'Saldo do dia', value: resumo?.caixaHoje.saldo || 0, Icon: Wallet, color: BRAND.navy, bg: '#EEF2FA' },
            ].map(({ label, value, Icon, color, bg }) => (
              <div key={label} style={{ background: BRAND.white, border: `1px solid ${BRAND.silver}`, borderRadius: '12px', padding: '1rem 1.15rem', display: 'flex', alignItems: 'center', gap: '0.8rem', boxShadow: '0 2px 8px rgba(27,46,94,0.05)' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '9px', background: bg, color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon size={19} /></div>
                <div>
                  <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.06em', color: BRAND.muted }}>{label}</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color }}>{loading ? '...' : fmt(value)}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ background: BRAND.white, border: `1px solid ${BRAND.silver}`, borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(27,46,94,0.05)' }}>
            <div style={{ padding: '0.85rem 1.15rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${BRAND.silver}` }}>
              <div style={{ fontWeight: 800, color: BRAND.navy, fontSize: '0.9rem' }}>Últimos 30 dias</div>
              <div style={{ color: BRAND.muted, fontSize: '0.75rem' }}>{resumo?.caixaHoje.movimentacoes || 0} movimentações hoje</div>
            </div>
            <div style={{ maxHeight: '260px', overflowY: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '0.8fr 1fr 1fr 1fr 0.7fr', gap: '0.5rem', padding: '0.65rem 1.15rem', background: BRAND.offWhite, color: BRAND.muted, fontSize: '0.66rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                <span>Data</span><span>Entradas</span><span>Saídas</span><span>Saldo</span><span>Mov.</span>
              </div>
              {!loading && resumo?.caixaUltimos30Dias.map((dia) => (
                <div key={dia.data} style={{ display: 'grid', gridTemplateColumns: '0.8fr 1fr 1fr 1fr 0.7fr', gap: '0.5rem', padding: '0.7rem 1.15rem', borderTop: `1px solid ${BRAND.silver}`, fontSize: '0.78rem', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, color: BRAND.navy }}>{fmtDate(dia.data)}</span>
                  <span style={{ color: '#0D7A4E', fontWeight: 600 }}>{fmt(dia.entradas)}</span>
                  <span style={{ color: BRAND.red, fontWeight: 600 }}>{fmt(dia.saidas)}</span>
                  <span style={{ color: dia.saldo < 0 ? BRAND.red : BRAND.navy, fontWeight: 800 }}>{fmt(dia.saldo)}</span>
                  <span style={{ color: BRAND.muted }}>{dia.movimentacoes}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ══ AÇÕES RÁPIDAS ════════════════════════════════════════════ */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <span className="tt-section-title">Acesso Rápido</span>
            <div className="tt-divider-line" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            {actions.map(({ href, Icon, label, sub, delay }) => (
              <a key={href} href={href} className="tt-action" style={{ animationDelay: delay }}>
                {/* Ícone com acento da marca */}
                <div style={{
                  width: '46px', height: '46px', borderRadius: '12px',
                  background: `linear-gradient(135deg, ${BRAND.navy}, ${BRAND.navyLight})`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: BRAND.white, flexShrink: 0,
                  boxShadow: `0 4px 12px rgba(27,46,94,0.25)`,
                }}>
                  <Icon size={22} />
                </div>
                {/* Texto */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', color: BRAND.navy, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {label}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: BRAND.muted, marginTop: '0.15rem' }}>{sub}</div>
                </div>
                <ArrowRight size={18} className="tt-arrow" />
              </a>
            ))}
          </div>
        </div>

        {/* ══ RODAPÉ INSTITUCIONAL ══════════════════════════════════════ */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          padding: '1rem 1.5rem',
          background: BRAND.white,
          borderRadius: '12px',
          border: `1px solid ${BRAND.silver}`,
          animation: 'ttFadeUp 0.5s ease both',
          animationDelay: '0.35s',
        }}>
          <img src="/logo.png" alt="TT Store" style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: '0.85rem', color: BRAND.navy }}>TT Store &amp; Barbearia — Sistema de Gestão</div>
            <div style={{ fontSize: '0.75rem', color: BRAND.muted }}>Controle inteligente de estoque, vendas e caixa em um só lugar.</div>
          </div>
          <div style={{
            padding: '0.3rem 0.8rem',
            background: `linear-gradient(135deg, ${BRAND.navy}, ${BRAND.navyLight})`,
            color: BRAND.white,
            borderRadius: '6px',
            fontSize: '0.7rem',
            fontWeight: 700,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            flexShrink: 0,
          }}>
            v1.0
          </div>
        </div>

      </div>
    </>
  );
};

export default Dashboard;
