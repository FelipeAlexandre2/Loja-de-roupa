import React, { useState, useEffect } from 'react';
import {
  BookOpen, Plus, Search, X, CheckCircle, AlertTriangle,
  User, Phone, DollarSign, Clock, Trash2, ChevronRight,
  ArrowDownCircle, ArrowUpCircle, RefreshCw, CreditCard, MapPin, Printer, Tag
} from 'lucide-react';
import { fetchWithAuth } from '../utils/fetchWithAuth';
import { getApiUrl } from '../utils/apiUrl';
import { canEdit } from '../App';

const getFiadoApi = () => `${getApiUrl()}/api/fiado`;

/* ─── Interfaces ──────────────────────────────────────────────── */
interface Cliente {
  id: number;
  nome: string;
  telefone?: string;
  totalDevido: number;
  ultimoLancamento?: string;
}

interface Lancamento {
  id: number;
  tipo: 'DEBITO' | 'PAGAMENTO';
  valor: number;
  descricao?: string;
  data: string;
}

interface Toast { id: number; tipo: 'sucesso' | 'erro'; mensagem: string; }

/* ─── Componente principal ────────────────────────────────────── */
const Fiado: React.FC = () => {
  const [clientes, setClientes]           = useState<Cliente[]>([]);
  const [loading, setLoading]             = useState(true);
  const [busca, setBusca]                 = useState('');
  const [toasts, setToasts]               = useState<Toast[]>([]);
  const somenteLeitura                    = !canEdit('fiado');

  // Modal novo cliente
  const [modalCliente, setModalCliente]   = useState(false);
  const [nomeNovo, setNomeNovo]           = useState('');
  const [telNovo, setTelNovo]             = useState('');
  const [cpfNovo, setCpfNovo]             = useState('');
  const [endNovo, setEndNovo]             = useState('');
  const [salvando, setSalvando]           = useState(false);

  // Drawer de detalhes
  const [clienteSel, setClienteSel]       = useState<Cliente | null>(null);
  const [lancamentos, setLancamentos]     = useState<Lancamento[]>([]);
  const [loadingLanc, setLoadingLanc]     = useState(false);

  // Modal lançamento
  const [modalLanc, setModalLanc]         = useState<'DEBITO' | 'PAGAMENTO' | null>(null);
  const [valorLanc, setValorLanc]         = useState('');
  const [descLanc, setDescLanc]           = useState('');
  const [salvandoLanc, setSalvandoLanc]   = useState(false);

  /* ── Toasts ── */
  const toast = (tipo: 'sucesso' | 'erro', mensagem: string) => {
    const id = Date.now();
    setToasts(p => [...p, { id, tipo, mensagem }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4000);
  };

  /* ── Impressão de Extrato Detalhado ── */
  const imprimirExtrato = (c: Cliente, lList: Lancamento[]) => {
    const win = window.open('', '_blank');
    if (!win) return;
    const dataHoje = new Date().toLocaleDateString('pt-BR');
    const horaHoje = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Extrato Fiado - ${c.nome}</title>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; padding: 20px; color: #1e293b; max-width: 650px; margin: 0 auto; }
          .header { text-align: center; border-bottom: 2px solid #1B2E5E; padding-bottom: 12px; margin-bottom: 20px; }
          .title { font-size: 20px; font-weight: 800; color: #1B2E5E; margin: 0; }
          .sub { font-size: 11px; color: #64748b; margin-top: 4px; }
          .box { background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px; }
          .box-title { font-weight: 700; font-size: 14px; color: #1B2E5E; margin-bottom: 6px; }
          .item-row { border-bottom: 1px solid #F1F5F9; padding: 10px 0; display: flex; justify-content: space-between; font-size: 13px; }
          .badge-debito { color: #C8102E; font-weight: 800; }
          .badge-pago { color: #16a34a; font-weight: 800; }
          .desc-detalhe { font-size: 11px; color: #334155; background: #FFF; border: 1px solid #CBD5E1; padding: 6px 10px; border-radius: 6px; margin-top: 6px; line-height: 1.4; }
          .total-box { background: #FEF2F2; border: 1px solid #FECACA; border-radius: 8px; padding: 14px; text-align: right; margin-top: 20px; }
          .total-val { font-size: 22px; font-weight: 900; color: #C8102E; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 class="title">TT STORE & BARBEARIA</h1>
          <div style="font-size: 11px; font-weight: bold; margin-top: 2px;">*** COMPROVANTE NÃO FISCAL ***</div>
          <div class="sub">EXTRATO DETALHADO DE COMPRAS FIADO • ${dataHoje} às ${horaHoje}</div>
        </div>

        <div class="box">
          <div class="box-title">Cliente: ${c.nome}</div>
          ${c.telefone ? `<div style="font-size:12px;color:#64748b;">📱 Telefone: ${c.telefone}</div>` : ''}
          ${(c as any).cpf ? `<div style="font-size:12px;color:#64748b;">🪪 CPF: ${(c as any).cpf}</div>` : ''}
          ${(c as any).endereco ? `<div style="font-size:12px;color:#64748b;">📍 Endereço: ${(c as any).endereco}</div>` : ''}
        </div>

        <div class="box-title">Histórico Detalhado de Compras e Pagamentos</div>
        ${lList.length === 0 ? '<div style="font-size:13px;color:#94a3b8;">Nenhum lançamento registrado.</div>' : lList.map(l => `
          <div class="item-row">
            <div>
              <strong>${new Date(l.data).toLocaleDateString('pt-BR')} ${new Date(l.data).toLocaleTimeString('pt-BR', {hour:'2-digit',minute:'2-digit'})}</strong> — 
              <span>${l.tipo === 'DEBITO' ? '🛒 Compra Fiado' : '💰 Pagamento / Quitação'}</span>
              ${l.descricao ? `<div class="desc-detalhe">📌 <strong>Itens / Detalhes:</strong> ${l.descricao.replace(/ \+ /g, '<br/>• ')}</div>` : ''}
            </div>
            <div class="${l.tipo === 'DEBITO' ? 'badge-debito' : 'badge-pago'}">
              ${l.tipo === 'DEBITO' ? '+' : '-'} R$ ${l.valor.toFixed(2).replace('.', ',')}
            </div>
          </div>
        `).join('')}

        <div class="total-box">
          <div style="font-size:11px;color:#991B1B;font-weight:800;text-transform:uppercase;">Saldo Devedor Total Atual</div>
          <div class="total-val">R$ ${c.totalDevido.toFixed(2).replace('.', ',')}</div>
        </div>

      </body>
      </html>
    `;
    win.document.write(html);
    win.document.close();
    win.print();
  };

  /* ── Formatar Descrição Detalhada dos Lançamentos ── */
  const renderDescricaoDetalhada = (desc?: string, tipo?: 'DEBITO' | 'PAGAMENTO') => {
    if (!desc) return <div style={{ fontSize: '0.8rem', color: '#64748b', fontStyle: 'italic' }}>{tipo === 'DEBITO' ? 'Compra sem descrição' : 'Pagamento efetuado'}</div>;
    
    // Se for uma compra com itens detalhados (ex: "Compra PDV: 2x Camiseta (R$ 50,00) + 1x Calça (R$ 100,00)")
    if (desc.includes(' + ') || desc.includes('x ') || desc.includes('Compra PDV')) {
      const textoLimpo = desc.replace(/^Compra PDV:\s*/i, '');
      const itens = textoLimpo.split(' + ');
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.25rem' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#1B2E5E', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <Tag size={12} color="#1B2E5E" /> Detalhamento das Peças:
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
            {itens.map((item, idx) => (
              <span key={idx} style={{ background: '#F1F5F9', border: '1px solid #CBD5E1', padding: '0.2rem 0.55rem', borderRadius: '6px', fontSize: '0.75rem', color: '#1E293B', fontWeight: 700 }}>
                • {item}
              </span>
            ))}
          </div>
        </div>
      );
    }

    return <div style={{ fontSize: '0.82rem', color: '#334155', marginTop: '0.1rem', fontWeight: 600 }}>{desc}</div>;
  };

  /* ── Buscar clientes ── */
  const fetchClientes = async () => {
    try {
      setLoading(true);
      const r = await fetchWithAuth(`${getFiadoApi()}/clientes`);
      if (r.ok) {
        const data = await r.json();
        setClientes(Array.isArray(data) ? data : []);
      } else {
        setClientes([]);
      }
    } catch {
      toast('erro', 'Erro ao carregar clientes.');
      setClientes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchClientes(); }, []);

  /* ── Buscar lançamentos do cliente ── */
  const fetchLancamentos = async (id: number) => {
    try {
      setLoadingLanc(true);
      const r = await fetchWithAuth(`${getFiadoApi()}/clientes/${id}/lancamentos`);
      if (r.ok) setLancamentos(await r.json());
    } catch { toast('erro', 'Erro ao carregar histórico.'); }
    finally { setLoadingLanc(false); }
  };

  const abrirCliente = (c: Cliente) => {
    setClienteSel(c);
    fetchLancamentos(c.id);
  };

  /* ── Cadastrar cliente ── */
  const handleSalvarCliente = async (e: React.FormEvent) => {
    e.preventDefault();
    if (somenteLeitura) {
      toast('erro', 'Acesso Restrito: Permissão apenas para visualizar o fiado.');
      return;
    }
    if (!nomeNovo.trim()) return;
    setSalvando(true);
    try {
      const r = await fetchWithAuth(`${getFiadoApi()}/clientes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: nomeNovo.trim(), telefone: telNovo.trim(), cpf: cpfNovo.trim(), endereco: endNovo.trim() }),
      });
      if (r.ok) {
        toast('sucesso', `Cliente "${nomeNovo}" cadastrado!`);
        setModalCliente(false); setNomeNovo(''); setTelNovo(''); setCpfNovo(''); setEndNovo('');
        fetchClientes();
      } else {
        const err = await r.json().catch(() => ({}));
        toast('erro', err.message || 'Erro ao cadastrar cliente.');
      }
    } catch { toast('erro', 'Erro de conexão.'); }
    finally { setSalvando(false); }
  };

  /* ── Registrar lançamento ── */
  const handleLancamento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (somenteLeitura) {
      toast('erro', 'Acesso Restrito: Permissão apenas para visualizar o fiado.');
      return;
    }
    if (!clienteSel || !modalLanc || !valorLanc) return;
    setSalvandoLanc(true);
    try {
      const r = await fetchWithAuth(`${getFiadoApi()}/lancamentos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clienteId: clienteSel.id,
          tipo: modalLanc,
          valor: parseFloat(valorLanc.replace(',', '.')),
          descricao: descLanc.trim(),
        }),
      });
      if (r.ok) {
        toast('sucesso', modalLanc === 'DEBITO' ? 'Fiado registrado!' : 'Pagamento registrado!');
        setModalLanc(null); setValorLanc(''); setDescLanc('');
        fetchClientes();
        fetchLancamentos(clienteSel.id);
        // Atualiza saldo do cliente selecionado
        const upd = await fetchWithAuth(`${getFiadoApi()}/clientes/${clienteSel.id}`);
        if (upd.ok) setClienteSel(await upd.json());
      } else {
        const err = await r.json().catch(() => ({}));
        toast('erro', err.message || 'Erro ao registrar.');
      }
    } catch { toast('erro', 'Erro de conexão.'); }
    finally { setSalvandoLanc(false); }
  };

  /* ── Deletar cliente ── */
  const handleDeletar = async (id: number, nome: string) => {
    if (somenteLeitura) {
      toast('erro', 'Acesso Restrito: Permissão apenas para visualizar o fiado.');
      return;
    }
    if (!confirm(`Deseja remover o cliente "${nome}"? Todo o histórico será perdido.`)) return;
    try {
      const r = await fetchWithAuth(`${getFiadoApi()}/clientes/${id}`, { method: 'DELETE' });
      if (r.ok) {
        toast('sucesso', `Cliente "${nome}" removido.`);
        if (clienteSel?.id === id) setClienteSel(null);
        fetchClientes();
      } else toast('erro', 'Erro ao remover cliente.');
    } catch { toast('erro', 'Erro de conexão.'); }
  };

  /* ── Filtro de busca ── */
  const clientesFiltrados = clientes.filter(c =>
    c.nome.toLowerCase().includes(busca.toLowerCase()) ||
    (c.telefone || '').includes(busca)
  );

  const totalGeral = clientes.reduce((s, c) => s + c.totalDevido, 0);

  /* ══════════════════════════════════════════════════════════════ */
  return (
    <>
      <style>{`
        @keyframes slideIn  { from{opacity:0;transform:translateX(40px)} to{opacity:1;transform:translateX(0)} }
        @keyframes fadeIn   { from{opacity:0} to{opacity:1} }
        @keyframes popIn    { from{opacity:0;transform:scale(0.92)} to{opacity:1;transform:scale(1)} }
        @keyframes spin     { to{transform:rotate(360deg)} }

        .fiado-grid { display: grid; grid-template-columns: 1fr 1.1fr; gap: 1.25rem; }
        .fiado-row {
          display: flex; align-items: center; justify-content: space-between;
          padding: 0.85rem 1rem; border-bottom: 1px solid var(--color-border);
          cursor: pointer; transition: background 0.15s; gap: 0.75rem;
        }
        .fiado-row:hover { background: #f8fafc; }
        .fiado-row:last-child { border-bottom: none; }

        @media (max-width: 768px) {
          .fiado-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      {/* ── TOASTS ── */}
      <div style={{ position: 'fixed', top: '1rem', right: '1rem', left: '1rem', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '0.5rem', pointerEvents: 'none' }}>
        {toasts.map(t => (
          <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.85rem 1rem', borderRadius: '12px', boxShadow: '0 8px 30px rgba(0,0,0,0.15)', backgroundColor: t.tipo === 'sucesso' ? '#f0fdf4' : '#fef2f2', borderLeft: `4px solid ${t.tipo === 'sucesso' ? '#16a34a' : '#dc2626'}`, maxWidth: '400px', marginLeft: 'auto', animation: 'slideIn 0.3s ease', pointerEvents: 'all' }}>
            {t.tipo === 'sucesso' ? <CheckCircle size={18} color="#16a34a" /> : <AlertTriangle size={18} color="#dc2626" />}
            <span style={{ fontWeight: 600, fontSize: '0.88rem', color: t.tipo === 'sucesso' ? '#15803d' : '#b91c1c' }}>{t.mensagem}</span>
          </div>
        ))}
      </div>

      {/* ── MODAL NOVO CLIENTE ── */}
      {modalCliente && (
        <div onClick={() => setModalCliente(false)} style={{ position: 'fixed', inset: 0, zIndex: 9998, backgroundColor: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(3px)', padding: '1rem', animation: 'fadeIn 0.2s ease' }}>
          <div onClick={e => e.stopPropagation()} style={{ backgroundColor: 'white', borderRadius: '16px', padding: '1.75rem', width: '100%', maxWidth: '400px', boxShadow: '0 20px 60px rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column', gap: '1rem', animation: 'popIn 0.25s ease' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#1B2E5E', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <User size={20} /> Novo Cliente
              </div>
              <button onClick={() => setModalCliente(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><X size={18} /></button>
            </div>
            <form onSubmit={handleSalvarCliente} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.35rem' }}>Nome *</label>
                <input autoFocus value={nomeNovo} onChange={e => setNomeNovo(e.target.value)} required placeholder="Nome completo do cliente"
                  style={{ width: '100%', padding: '0.7rem 0.9rem', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '0.95rem', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
              </div>

              {/* Telefone + CPF lado a lado */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.35rem' }}>Telefone</label>
                  <div style={{ position: 'relative' }}>
                    <Phone size={14} style={{ position: 'absolute', left: '0.7rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input value={telNovo} onChange={e => setTelNovo(e.target.value)} placeholder="(00) 00000-0000" inputMode="tel"
                      style={{ width: '100%', padding: '0.7rem 0.9rem 0.7rem 2.1rem', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '0.88rem', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.35rem' }}>CPF</label>
                  <div style={{ position: 'relative' }}>
                    <CreditCard size={14} style={{ position: 'absolute', left: '0.7rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input value={cpfNovo} onChange={e => setCpfNovo(e.target.value)} placeholder="000.000.000-00" inputMode="numeric"
                      style={{ width: '100%', padding: '0.7rem 0.9rem 0.7rem 2.1rem', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '0.88rem', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.35rem' }}>Endereço</label>
                <div style={{ position: 'relative' }}>
                  <MapPin size={14} style={{ position: 'absolute', left: '0.7rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input value={endNovo} onChange={e => setEndNovo(e.target.value)} placeholder="Rua, número, bairro..."
                    style={{ width: '100%', padding: '0.7rem 0.9rem 0.7rem 2.1rem', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '0.88rem', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.25rem' }}>
                <button type="button" onClick={() => setModalCliente(false)} style={{ flex: 1, padding: '0.7rem', borderRadius: '8px', border: '1.5px solid #e2e8f0', background: 'white', fontWeight: 600, cursor: 'pointer', color: '#475569', fontFamily: 'inherit' }}>Cancelar</button>
                <button type="submit" disabled={salvando} style={{ flex: 1, padding: '0.7rem', borderRadius: '8px', border: 'none', background: salvando ? '#94a3b8' : '#1B2E5E', fontWeight: 700, cursor: salvando ? 'not-allowed' : 'pointer', color: 'white', fontFamily: 'inherit' }}>
                  {salvando ? 'Salvando...' : 'Cadastrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL LANÇAMENTO ── */}
      {modalLanc && clienteSel && (
        <div onClick={() => setModalLanc(null)} style={{ position: 'fixed', inset: 0, zIndex: 9998, backgroundColor: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(3px)', padding: '1rem', animation: 'fadeIn 0.2s ease' }}>
          <div onClick={e => e.stopPropagation()} style={{ backgroundColor: 'white', borderRadius: '16px', padding: '1.75rem', width: '100%', maxWidth: '380px', boxShadow: '0 20px 60px rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column', gap: '1rem', animation: 'popIn 0.25s ease' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontWeight: 800, fontSize: '1.05rem', color: modalLanc === 'DEBITO' ? '#C8102E' : '#16a34a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {modalLanc === 'DEBITO' ? <ArrowDownCircle size={20} /> : <ArrowUpCircle size={20} />}
                {modalLanc === 'DEBITO' ? 'Registrar Fiado' : 'Registrar Pagamento'}
              </div>
              <button onClick={() => setModalLanc(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><X size={18} /></button>
            </div>
            <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '0.6rem 0.9rem', fontSize: '0.85rem', color: '#64748b' }}>
              Cliente: <strong style={{ color: '#1B2E5E' }}>{clienteSel.nome}</strong>
            </div>
            <form onSubmit={handleLancamento} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.35rem' }}>Valor (R$) *</label>
                <input autoFocus type="number" min="0.01" step="0.01" inputMode="decimal" required value={valorLanc} onChange={e => setValorLanc(e.target.value)} placeholder="0,00"
                  style={{ width: '100%', padding: '0.7rem 0.9rem', border: `1.5px solid ${modalLanc === 'DEBITO' ? '#fca5a5' : '#86efac'}`, borderRadius: '8px', fontSize: '1.1rem', fontWeight: 700, color: '#1B2E5E', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.35rem' }}>Descrição</label>
                <input value={descLanc} onChange={e => setDescLanc(e.target.value)} placeholder={modalLanc === 'DEBITO' ? 'Ex: Camiseta azul' : 'Ex: Pagamento em dinheiro'}
                  style={{ width: '100%', padding: '0.7rem 0.9rem', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.25rem' }}>
                <button type="button" onClick={() => setModalLanc(null)} style={{ flex: 1, padding: '0.7rem', borderRadius: '8px', border: '1.5px solid #e2e8f0', background: 'white', fontWeight: 600, cursor: 'pointer', color: '#475569', fontFamily: 'inherit' }}>Cancelar</button>
                <button type="submit" disabled={salvandoLanc} style={{ flex: 1, padding: '0.7rem', borderRadius: '8px', border: 'none', background: salvandoLanc ? '#94a3b8' : modalLanc === 'DEBITO' ? '#C8102E' : '#16a34a', fontWeight: 700, cursor: salvandoLanc ? 'not-allowed' : 'pointer', color: 'white', fontFamily: 'inherit' }}>
                  {salvandoLanc ? 'Salvando...' : 'Confirmar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── CONTEÚDO PRINCIPAL ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
          <h1 style={{ margin: 0, color: '#1B2E5E', fontSize: '1.4rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BookOpen size={24} /> Fiado
          </h1>
          <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
            <button onClick={fetchClientes} style={{ background: 'none', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '0.4rem 0.7rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.78rem', color: 'var(--color-text-muted)', fontFamily: 'inherit' }}>
              <RefreshCw size={13} style={{ animation: loading ? 'spin 0.8s linear infinite' : 'none' }} /> Atualizar
            </button>
            <button onClick={() => setModalCliente(true)} style={{ background: '#1B2E5E', color: 'white', border: 'none', borderRadius: '8px', padding: '0.55rem 1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, fontSize: '0.85rem', fontFamily: 'inherit', boxShadow: '0 4px 12px rgba(27,46,94,0.3)' }}>
              <Plus size={16} /> Novo Cliente
            </button>
          </div>
        </div>

        {/* Card resumo total */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px,1fr))', gap: '1rem' }}>
          <div style={{ background: 'white', border: '1px solid var(--color-border)', borderTop: '4px solid #d97706', borderRadius: '12px', padding: '1rem 1.25rem', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.4rem' }}>Total em Aberto</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#C8102E' }}>R$ {totalGeral.toFixed(2).replace('.', ',')}</div>
          </div>
          <div style={{ background: 'white', border: '1px solid var(--color-border)', borderTop: '4px solid #1B2E5E', borderRadius: '12px', padding: '1rem 1.25rem', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.4rem' }}>Clientes</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#1B2E5E' }}>{clientes.length}</div>
          </div>
          <div style={{ background: 'white', border: '1px solid var(--color-border)', borderTop: '4px solid #C8102E', borderRadius: '12px', padding: '1rem 1.25rem', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.4rem' }}>Com Débito</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#d97706' }}>{clientes.filter(c => c.totalDevido > 0).length}</div>
          </div>
        </div>

        {/* Grid: lista + detalhes */}
        <div className="fiado-grid">

          {/* ── Lista de clientes ── */}
          <div style={{ background: 'white', border: '1px solid var(--color-border)', borderRadius: '14px', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
            {/* Busca */}
            <div style={{ padding: '0.85rem 1rem', borderBottom: '1px solid var(--color-border)' }}>
              <div style={{ position: 'relative' }}>
                <Search size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar cliente..."
                  style={{ width: '100%', padding: '0.55rem 0.75rem 0.55rem 2.25rem', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '0.88rem', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
              </div>
            </div>

            {/* Itens */}
            <div style={{ overflowY: 'auto', maxHeight: '420px' }}>
              {loading ? (
                <div style={{ padding: '2.5rem', textAlign: 'center', color: '#94a3b8', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                  <RefreshCw size={22} style={{ animation: 'spin 0.8s linear infinite' }} />
                  <span style={{ fontSize: '0.85rem' }}>Carregando...</span>
                </div>
              ) : clientesFiltrados.length === 0 ? (
                <div style={{ padding: '2.5rem', textAlign: 'center', color: '#94a3b8', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                  <BookOpen size={28} style={{ opacity: 0.25 }} />
                  <span style={{ fontSize: '0.875rem' }}>Nenhum cliente encontrado</span>
                  <button onClick={() => setModalCliente(true)} style={{ marginTop: '0.5rem', background: '#1B2E5E', color: 'white', border: 'none', borderRadius: '8px', padding: '0.5rem 1rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700, fontFamily: 'inherit' }}>
                    <Plus size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />Cadastrar Cliente
                  </button>
                </div>
              ) : clientesFiltrados.map(c => (
                <div key={c.id} className="fiado-row" onClick={() => abrirCliente(c)}
                  style={{ background: clienteSel?.id === c.id ? '#EEF2FA' : undefined }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 0 }}>
                    <div style={{ width: 38, height: 38, borderRadius: '50%', background: c.totalDevido > 0 ? '#FEE2E2' : '#EEF2FA', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <User size={18} color={c.totalDevido > 0 ? '#C8102E' : '#1B2E5E'} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1B2E5E', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.nome}</div>
                      {c.telefone && <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{c.telefone}</div>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 800, fontSize: '0.95rem', color: c.totalDevido > 0 ? '#C8102E' : '#16a34a' }}>
                        {c.totalDevido > 0 ? `R$ ${c.totalDevido.toFixed(2).replace('.', ',')}` : '✓ Quitado'}
                      </div>
                      {c.ultimoLancamento && (
                        <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>
                          {new Date(c.ultimoLancamento).toLocaleDateString('pt-BR')}
                        </div>
                      )}
                    </div>
                    <button onClick={e => { e.stopPropagation(); handleDeletar(c.id, c.nome); }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#cbd5e1', padding: '0.25rem', borderRadius: '6px', display: 'flex', transition: 'color 0.2s' }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#dc2626')}
                      onMouseLeave={e => (e.currentTarget.style.color = '#cbd5e1')}>
                      <Trash2 size={14} />
                    </button>
                    <ChevronRight size={16} color="#cbd5e1" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Painel de detalhes ── */}
          <div style={{ background: 'white', border: '1px solid var(--color-border)', borderRadius: '14px', overflow: 'hidden', boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column' }}>
            {!clienteSel ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 2rem', color: '#94a3b8', gap: '0.75rem' }}>
                <BookOpen size={36} style={{ opacity: 0.2 }} />
                <span style={{ fontSize: '0.9rem' }}>Selecione um cliente para ver os detalhes</span>
              </div>
            ) : (
              <>
                {/* Header do cliente */}
                <div style={{ background: '#1B2E5E', padding: '1.1rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <User size={20} color="white" />
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, color: 'white', fontSize: '1rem' }}>{clienteSel.nome}</div>
                      <div style={{ display: 'flex', gap: '0.85rem', flexWrap: 'wrap', marginTop: '0.15rem' }}>
                        {clienteSel.telefone && (
                          <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.65)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Phone size={11} /> {clienteSel.telefone}
                          </div>
                        )}
                        {(clienteSel as any).cpf && (
                          <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.65)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <CreditCard size={11} /> {(clienteSel as any).cpf}
                          </div>
                        )}
                      </div>
                      {(clienteSel as any).endereco && (
                        <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.55)', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.1rem' }}>
                          <MapPin size={11} /> {(clienteSel as any).endereco}
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <button
                      onClick={() => imprimirExtrato(clienteSel, lancamentos)}
                      title="Imprimir Extrato Detalhado do Cliente"
                      style={{
                        background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.3)',
                        color: 'white', borderRadius: '8px', padding: '0.35rem 0.65rem',
                        display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer',
                        fontSize: '0.75rem', fontWeight: 700, fontFamily: 'inherit'
                      }}
                    >
                      <Printer size={13} /> Imprimir Extrato
                    </button>
                    <button onClick={() => setClienteSel(null)} style={{ background: 'rgba(255,255,255,0.12)', border: 'none', color: 'white', borderRadius: '50%', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                      <X size={14} />
                    </button>
                  </div>
                </div>

                {/* Saldo + botões */}
                <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.2rem' }}>Saldo em Aberto</div>
                    <div style={{ fontSize: '1.6rem', fontWeight: 900, color: clienteSel.totalDevido > 0 ? '#C8102E' : '#16a34a' }}>
                      R$ {clienteSel.totalDevido.toFixed(2).replace('.', ',')}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={() => { setModalLanc('DEBITO'); setValorLanc(''); setDescLanc(''); }}
                      style={{ padding: '0.55rem 0.85rem', background: '#FEE2E2', color: '#C8102E', border: '1.5px solid #fca5a5', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem', fontFamily: 'inherit' }}>
                      <ArrowDownCircle size={15} /> Fiado
                    </button>
                    <button onClick={() => { setModalLanc('PAGAMENTO'); setValorLanc(''); setDescLanc(''); }}
                      style={{ padding: '0.55rem 0.85rem', background: '#f0fdf4', color: '#16a34a', border: '1.5px solid #86efac', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem', fontFamily: 'inherit' }}>
                      <ArrowUpCircle size={15} /> Pagamento
                    </button>
                  </div>
                </div>

                {/* Histórico de lançamentos */}
                <div style={{ flex: 1, overflowY: 'auto', maxHeight: '360px' }}>
                  <div style={{ padding: '0.6rem 1.25rem', fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Clock size={12} /> Histórico Detalhado
                  </div>
                  {loadingLanc ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
                      <RefreshCw size={18} style={{ animation: 'spin 0.8s linear infinite' }} />
                    </div>
                  ) : lancamentos.length === 0 ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>Nenhum lançamento ainda</div>
                  ) : lancamentos.map(l => (
                    <div key={l.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.85rem 1.25rem', borderBottom: '1px solid #f8fafc' }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: l.tipo === 'DEBITO' ? '#FEE2E2' : '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px' }}>
                        {l.tipo === 'DEBITO'
                          ? <ArrowDownCircle size={16} color="#C8102E" />
                          : <ArrowUpCircle size={16} color="#16a34a" />
                        }
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 800, fontSize: '0.88rem', color: l.tipo === 'DEBITO' ? '#991B1B' : '#166534' }}>
                            {l.tipo === 'DEBITO' ? '🛒 Compra Fiado' : '💰 Pagamento'}
                          </span>
                          <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                            • {new Date(l.data).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        {renderDescricaoDetalhada(l.descricao, l.tipo)}
                      </div>
                      <div style={{ fontWeight: 900, fontSize: '1rem', color: l.tipo === 'DEBITO' ? '#C8102E' : '#16a34a', whiteSpace: 'nowrap' }}>
                        {l.tipo === 'DEBITO' ? '+' : '-'} R$ {l.valor.toFixed(2).replace('.', ',')}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

        </div>
      </div>
    </>
  );
};

export default Fiado;
