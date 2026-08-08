import React, { useState, useEffect } from 'react';
import {
  Scissors, DollarSign, User, Banknote, CreditCard,
  QrCode, CheckCircle, AlertTriangle, X, Trash2, RefreshCw,
  BookOpen, Search
} from 'lucide-react';
import axios from 'axios';
import { getApiUrl } from '../utils/apiUrl';
import { canEdit } from '../App';

const getBarbeariaApi = () => `${getApiUrl()}/api/barbearia`;

interface ResumoMensal {
  cortesDia: any[];
  jacson: { quantidade: number; total: number };
  mizael: { quantidade: number; total: number };
}

interface Toast {
  id: number;
  tipo: 'sucesso' | 'erro';
  mensagem: string;
  sub?: string;
}

interface ModalConfirm {
  aberto: boolean;
  corteId: number | null;
  barbeiro: string;
  valor: number;
}

const Barbearia: React.FC = () => {
  const [resumo, setResumo] = useState<ResumoMensal | null>(null);
  const [loading, setLoading] = useState(true);
  const [valorCorte, setValorCorte] = useState<number | string>(35);
  const [barbeiro, setBarbeiro] = useState<'Jacson' | 'Mizael'>('Jacson');
  const [formaPagamento, setFormaPagamento] = useState<'Dinheiro' | 'Pix' | 'Cartão' | 'Crédito' | 'Débito' | 'Fiado'>('Dinheiro');
  const [subCartaoAberto, setSubCartaoAberto] = useState(false);
  const [tipoServico, setTipoServico] = useState<'Cabelo' | 'Barba' | 'Sobrancelha'>('Cabelo');
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [modal, setModal] = useState<ModalConfirm>({ aberto: false, corteId: null, barbeiro: '', valor: 0 });
  const [lancando, setLancando] = useState(false);
  const somenteLeitura = !canEdit('barbearia');

  // Fiado
  const [modalFiadoCliente, setModalFiadoCliente] = useState(false);
  const [clientesFiado, setClientesFiado] = useState<{id:number,nome:string,telefone?:string,totalDevido:number}[]>([]);
  const [buscaFiado, setBuscaFiado] = useState('');
  const [loadingClientes, setLoadingClientes] = useState(false);
  const [detalhesBarbeiro, setDetalhesBarbeiro] = useState<'Jacson' | 'Mizael' | null>(null);

  const showToast = (tipo: 'sucesso' | 'erro', mensagem: string, sub?: string) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, tipo, mensagem, sub }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  };

  const fetchResumo = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${getBarbeariaApi()}/resumo`);
      setResumo(response.data);
    } catch (error) {
      console.error('Erro ao buscar resumo da barbearia', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchResumo(); }, []);

  const fetchClientesFiado = async () => {
    setLoadingClientes(true);
    try {
      const r = await axios.get(`${getApiUrl()}/api/fiado/clientes`);
      setClientesFiado(r.data);
    } catch {}
    finally { setLoadingClientes(false); }
  };

  const handleCartao = () => {
    if (formaPagamento === 'Crédito' || formaPagamento === 'Débito') {
      // já tem tipo selecionado: remove e fecha
      setFormaPagamento('Dinheiro');
      setSubCartaoAberto(false);
    } else {
      // abre/fecha sub-seletor
      setSubCartaoAberto(prev => !prev);
    }
  };

  const selecionarTipoCartao = (tipo: 'Crédito' | 'Débito') => {
    setFormaPagamento(tipo);
    setSubCartaoAberto(false);
  };

  const handleLancar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (somenteLeitura) {
      showToast('erro', 'Acesso Restrito', 'Seu usuário tem permissão apenas para visualizar a barbearia.');
      return;
    }
    if (!valorCorte || Number(valorCorte) <= 0) return;
    // Valida que não submeteu com cartão sem tipo
    if (subCartaoAberto) { setSubCartaoAberto(false); return; }
    if (formaPagamento === 'Fiado') {
      await fetchClientesFiado();
      setBuscaFiado('');
      setModalFiadoCliente(true);
      return;
    }
    await executarLancamento(null);
  };

  const executarLancamento = async (clienteFiadoId: number | null) => {
    if (somenteLeitura) {
      showToast('erro', 'Acesso Restrito', 'Seu usuário tem permissão apenas para visualizar a barbearia.');
      return;
    }
    setLancando(true);
    try {
      setModalFiadoCliente(false);
      await axios.post(getBarbeariaApi(), { barbeiro, valor: Number(valorCorte), formaPagamento, tipoServico });
      // Registrar débito no fiado do cliente selecionado
      if (clienteFiadoId !== null && formaPagamento === 'Fiado') {
        const desc = `Barbearia – ${barbeiro} – ${tipoServico}`;
        await axios.post(`${getApiUrl()}/api/fiado/lancamentos`, {
          clienteId: clienteFiadoId,
          tipo: 'DEBITO',
          valor: Number(valorCorte),
          descricao: desc,
        }).catch(() => {}); // não bloqueia o lançamento se falhar
      }
      fetchResumo();
      showToast('sucesso', 'Corte lançado!', `${barbeiro} — ${tipoServico} — R$ ${Number(valorCorte).toFixed(2).replace('.', ',')} via ${formaPagamento}`);
      setValorCorte(35);
      setFormaPagamento('Dinheiro');
      setSubCartaoAberto(false);
      setTipoServico('Cabelo');
    } catch {
      showToast('erro', 'Erro ao lançar o corte.', 'Verifique a conexão e tente novamente.');
    } finally {
      setLancando(false);
    }
  };

  const abrirModalDeletar = (corte: any) =>
    setModal({ aberto: true, corteId: corte.id, barbeiro: corte.barbeiro, valor: corte.valor });

  const confirmarDeletar = async () => {
    if (!modal.corteId) return;
    try {
      await axios.delete(`${getBarbeariaApi()}/${modal.corteId}`);
      fetchResumo();
      showToast('sucesso', 'Corte removido.', `Lançamento de ${modal.barbeiro} apagado.`);
    } catch {
      showToast('erro', 'Erro ao apagar o corte.');
    } finally {
      setModal({ aberto: false, corteId: null, barbeiro: '', valor: 0 });
    }
  };

  const pgColors: Record<string, { border: string; bg: string; color: string }> = {
    'Dinheiro': { border: '#16a34a', bg: '#f0fdf4', color: '#16a34a' },
    'Pix':      { border: '#7c3aed', bg: '#f5f3ff', color: '#7c3aed' },
    'Crédito':  { border: '#0369a1', bg: '#eff6ff', color: '#0369a1' },
    'Débito':   { border: '#0891b2', bg: '#ecfeff', color: '#0891b2' },
    'Fiado':    { border: '#d97706', bg: '#fffbeb', color: '#d97706' },
    // compatibilidade com registros antigos
    'Cartão':   { border: '#0369a1', bg: '#eff6ff', color: '#0369a1' },
  };

  const pgIcon: Record<string, React.ReactNode> = {
    'Dinheiro': <Banknote size={18} />,
    'Pix':      <QrCode size={18} />,
    'Crédito':  <CreditCard size={18} />,
    'Débito':   <CreditCard size={18} />,
    'Fiado':    <BookOpen size={18} />,
    'Cartão':   <CreditCard size={18} />,
  };

  const pgEmoji: Record<string, string> = {
    'Dinheiro': '💵', 'Pix': '⬡', 'Crédito': '💳', 'Débito': '🏧', 'Fiado': '📒', 'Cartão': '🃏',
  };

  if (loading && !resumo) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4rem', gap: '0.75rem', color: 'var(--color-text-muted)' }}>
      <RefreshCw size={20} style={{ animation: 'spin 1s linear infinite' }} />
      Carregando barbearia...
    </div>
  );

  // ── Dados filtrados para o modal de detalhes ──────────────────────────────
  const cortesDoBarb = (nome: string) =>
    (resumo?.cortesDia ?? []).filter((c: any) => c.barbeiro === nome);

  const totalPor = (cortes: any[], campo: string, valor: string) =>
    cortes.filter((c: any) => c[campo] === valor).reduce((s: number, c: any) => s + c.valor, 0);

  const barbColor = (nome: string) => nome === 'Jacson' ? '#1B2E5E' : '#C8102E';
  const barbBg    = (nome: string) => nome === 'Jacson' ? '#EEF2FA'  : '#FEE2E2';

  return (
    <>
      <style>{`
        @keyframes slideIn  { from{opacity:0;transform:translateX(40px)} to{opacity:1;transform:translateX(0)} }
        @keyframes slideUp  { from{opacity:0;transform:translateY(40px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeIn   { from{opacity:0} to{opacity:1} }
        @keyframes popIn    { from{opacity:0;transform:scale(0.92)} to{opacity:1;transform:scale(1)} }
        @keyframes spin     { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }

        .barb-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.25rem;
        }
        .barb-history-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.5rem;
          padding: 0.85rem 1.25rem;
          border-bottom: 1px dotted var(--color-border);
        }
        .barb-history-right {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          flex-shrink: 0;
        }
        .barb-barbeiro-btn {
          flex: 1; padding: 0.9rem; border: 2px solid; border-radius: 10px;
          cursor: pointer; font-weight: 700; font-size: 1rem;
          transition: all 0.18s; font-family: inherit;
          -webkit-tap-highlight-color: transparent;
        }
        .barb-pay-btn {
          flex: 1; padding: 0.65rem 0.25rem; border: 2px solid; border-radius: 8px;
          cursor: pointer; font-weight: 700; font-size: 0.78rem;
          display: flex; flex-direction: column; align-items: center; gap: 0.2rem;
          transition: all 0.18s; font-family: inherit;
          -webkit-tap-highlight-color: transparent;
        }
        .barb-card-nome {
          display: flex; align-items: center; gap: 0.4rem;
        }
        .barb-card-clickable {
          cursor: pointer;
          border-radius: 12px;
          transition: transform 0.18s, box-shadow 0.18s;
        }
        .barb-card-clickable:hover {
          transform: translateY(-3px);
        }
        .detail-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.65rem 0;
          border-bottom: 1px solid #f1f5f9;
          gap: 0.5rem;
        }
        .detail-row:last-child { border-bottom: none; }

        @media (max-width: 768px) {
          .barb-grid {
            grid-template-columns: 1fr;
          }
          .barb-history-row {
            padding: 0.75rem 1rem;
            flex-wrap: wrap;
          }
          .barb-history-right {
            flex-wrap: wrap;
            justify-content: flex-end;
          }
        }
      `}</style>

      {/* ── TOASTS ── */}
      <div style={{ position: 'fixed', top: '1rem', right: '1rem', left: '1rem', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '0.5rem', pointerEvents: 'none' }}>
        {toasts.map(t => (
          <div key={t.id} style={{
            display: 'flex', alignItems: 'flex-start', gap: '0.65rem',
            padding: '0.85rem 1rem',
            borderRadius: '12px',
            boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
            backgroundColor: t.tipo === 'sucesso' ? '#f0fdf4' : '#fef2f2',
            borderLeft: `4px solid ${t.tipo === 'sucesso' ? '#16a34a' : '#dc2626'}`,
            maxWidth: '400px', marginLeft: 'auto',
            animation: 'slideIn 0.3s ease',
            pointerEvents: 'all',
          }}>
            {t.tipo === 'sucesso'
              ? <CheckCircle size={20} color="#16a34a" style={{ flexShrink: 0, marginTop: '1px' }} />
              : <AlertTriangle size={20} color="#dc2626" style={{ flexShrink: 0, marginTop: '1px' }} />
            }
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: t.tipo === 'sucesso' ? '#15803d' : '#b91c1c' }}>{t.mensagem}</div>
              {t.sub && <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.15rem' }}>{t.sub}</div>}
            </div>
            <button onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 0, flexShrink: 0, display: 'flex' }}>
              <X size={15} />
            </button>
          </div>
        ))}
      </div>

      {/* ── MODAL EXCLUSÃO ── */}
      {modal.aberto && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9998, backgroundColor: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(3px)', padding: '1rem', animation: 'fadeIn 0.2s ease' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '1.75rem', width: '100%', maxWidth: '380px', boxShadow: '0 20px 60px rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column', gap: '1.1rem', animation: 'popIn 0.25s ease' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ width: 42, height: 42, borderRadius: '50%', backgroundColor: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Trash2 size={20} color="#dc2626" />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#1e293b' }}>Apagar lançamento?</div>
                <div style={{ fontSize: '0.82rem', color: '#64748b' }}>Esta ação não pode ser desfeita.</div>
              </div>
            </div>
            <div style={{ backgroundColor: '#f8fafc', borderRadius: '10px', padding: '0.8rem 1rem', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.2rem' }}>Corte a remover</div>
              <div style={{ fontWeight: 700, color: '#1e293b' }}>{modal.barbeiro} — R$ {modal.valor?.toFixed(2).replace('.', ',')}</div>
            </div>
            <div style={{ display: 'flex', gap: '0.6rem' }}>
              <button onClick={() => setModal({ aberto: false, corteId: null, barbeiro: '', valor: 0 })}
                style={{ flex: 1, padding: '0.7rem', borderRadius: '8px', border: '1.5px solid #e2e8f0', background: 'white', fontWeight: 600, cursor: 'pointer', color: '#475569', fontSize: '0.9rem', fontFamily: 'inherit' }}>
                Cancelar
              </button>
              <button onClick={confirmarDeletar}
                style={{ flex: 1, padding: '0.7rem', borderRadius: '8px', border: 'none', backgroundColor: '#dc2626', fontWeight: 700, cursor: 'pointer', color: 'white', fontSize: '0.9rem', fontFamily: 'inherit' }}>
                Apagar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL DETALHES DO BARBEIRO ── */}
      {detalhesBarbeiro && (() => {
        const cortes = cortesDoBarb(detalhesBarbeiro);
        const cor    = barbColor(detalhesBarbeiro);
        const bg     = barbBg(detalhesBarbeiro);
        const totalGeral = cortes.reduce((s: number, c: any) => s + c.valor, 0);
        const totDinheiro = totalPor(cortes, 'formaPagamento', 'Dinheiro');
        const totPix      = totalPor(cortes, 'formaPagamento', 'Pix');
        const totCredito  = totalPor(cortes, 'formaPagamento', 'Crédito');
        const totDebito   = totalPor(cortes, 'formaPagamento', 'Débito');
        const totCartao   = totalPor(cortes, 'formaPagamento', 'Cartão'); // registros antigos
        const totFiado    = totalPor(cortes, 'formaPagamento', 'Fiado');
        const totCabelo   = totalPor(cortes, 'tipoServico', 'Cabelo');
        const totBarba    = totalPor(cortes, 'tipoServico', 'Barba');
        const totSobrancelha = totalPor(cortes, 'tipoServico', 'Sobrancelha');
        return (
          <div onClick={() => setDetalhesBarbeiro(null)}
            style={{ position: 'fixed', inset: 0, zIndex: 9999, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)', padding: '1rem', animation: 'fadeIn 0.2s ease' }}>
            <div onClick={e => e.stopPropagation()}
              style={{ backgroundColor: 'white', borderRadius: '18px', width: '100%', maxWidth: '460px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 64px rgba(0,0,0,0.3)', animation: 'popIn 0.25s ease', overflow: 'hidden' }}>

              {/* Header modal */}
              <div style={{ background: cor, padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Scissors size={20} color="white" />
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'white' }}>{detalhesBarbeiro}</div>
                    <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.75)' }}>{cortes.length} corte{cortes.length !== 1 ? 's' : ''} hoje</div>
                  </div>
                </div>
                <button onClick={() => setDetalhesBarbeiro(null)}
                  style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white' }}>
                  <X size={16} />
                </button>
              </div>

              {/* Corpo scroll */}
              <div style={{ overflowY: 'auto', flex: 1, padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

                {/* Total geral */}
                <div style={{ background: bg, borderRadius: '12px', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 700, color: cor, fontSize: '0.9rem' }}>Total do Dia</span>
                  <span style={{ fontWeight: 900, fontSize: '1.4rem', color: '#16a34a' }}>R$ {totalGeral.toFixed(2).replace('.', ',')}</span>
                </div>

                {/* Por forma de pagamento */}
                <div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.6rem' }}>Por Forma de Pagamento</div>
                  <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '0.25rem 1rem', border: '1px solid #e2e8f0' }}>
                    {[['Dinheiro', '💵', '#16a34a', totDinheiro], ['Pix', '⬡', '#7c3aed', totPix], ['Crédito', '💳', '#0369a1', totCredito], ['Débito', '🏧', '#0891b2', totDebito], ['Cartão', '🃏', '#0369a1', totCartao], ['Fiado', '📒', '#d97706', totFiado]]
                      .filter(([,,,v]) => (v as number) > 0)
                      .map(([label, emoji, color, val]) => (
                        <div key={label as string} className="detail-row">
                          <span style={{ fontSize: '0.88rem', color: '#475569', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <span>{emoji as string}</span> {label as string}
                          </span>
                          <span style={{ fontWeight: 700, color: color as string }}>R$ {(val as number).toFixed(2).replace('.', ',')}</span>
                        </div>
                      ))}
                    {totDinheiro === 0 && totPix === 0 && totCredito === 0 && totDebito === 0 && totCartao === 0 && totFiado === 0 && (
                      <div style={{ padding: '0.75rem 0', color: '#94a3b8', fontSize: '0.85rem', textAlign: 'center' }}>Nenhum lançamento</div>
                    )}
                  </div>
                </div>

                {/* Por tipo de serviço */}
                <div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.6rem' }}>Por Tipo de Serviço</div>
                  <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '0.25rem 1rem', border: '1px solid #e2e8f0' }}>
                    {[['Cabelo', '✂️', totCabelo], ['Barba', '🪒', totBarba], ['Sobrancelha', '✨', totSobrancelha]]
                      .filter(([,,v]) => (v as number) > 0)
                      .map(([label, emoji, val]) => (
                        <div key={label as string} className="detail-row">
                          <span style={{ fontSize: '0.88rem', color: '#475569', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <span>{emoji as string}</span> {label as string}
                            <span style={{ fontSize: '0.72rem', background: bg, color: cor, fontWeight: 700, borderRadius: '20px', padding: '0.1rem 0.45rem' }}>
                              {cortes.filter((c: any) => c.tipoServico === label).length}x
                            </span>
                          </span>
                          <span style={{ fontWeight: 700, color: '#1B2E5E' }}>R$ {(val as number).toFixed(2).replace('.', ',')}</span>
                        </div>
                      ))}
                    {totCabelo === 0 && totBarba === 0 && totSobrancelha === 0 && (
                      <div style={{ padding: '0.75rem 0', color: '#94a3b8', fontSize: '0.85rem', textAlign: 'center' }}>Nenhum lançamento</div>
                    )}
                  </div>
                </div>

                {/* Lançamentos individuais */}
                {cortes.length > 0 && (
                  <div>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.6rem' }}>Lançamentos</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {cortes.map((c: any) => {
                        const pc = pgColors[c.formaPagamento] || pgColors['Dinheiro'];
                        return (
                          <div key={c.id} style={{ background: '#f8fafc', borderRadius: '10px', padding: '0.75rem 1rem', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                {c.tipoServico && (
                                  <span style={{ fontSize: '0.7rem', fontWeight: 700, background: bg, color: cor, padding: '0.1rem 0.45rem', borderRadius: '20px' }}>{c.tipoServico}</span>
                                )}
                                <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '0.1rem 0.45rem', borderRadius: '20px', background: pc.bg, color: pc.color }}>
                                  {pgEmoji[c.formaPagamento]} {c.formaPagamento}
                                </span>
                              </div>
                              <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                                {new Date(c.dataCorte + 'Z').toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <span style={{ fontWeight: 800, fontSize: '1rem', color: '#1B2E5E', whiteSpace: 'nowrap' }}>R$ {c.valor.toFixed(2).replace('.', ',')}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {cortes.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '2rem 0', color: '#94a3b8', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                    <Scissors size={28} style={{ opacity: 0.25 }} />
                    <span style={{ fontSize: '0.875rem' }}>Nenhum corte registrado hoje</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

        {/* ── HEADER ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
          <h1 style={{ margin: 0, color: '#1B2E5E', fontSize: '1.4rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Scissors size={24} /> Barbearia
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ color: 'var(--color-text-muted)', fontSize: '0.82rem' }}>Controle do Dia</span>
            <button onClick={fetchResumo} style={{ background: 'none', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '0.4rem 0.7rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.78rem', color: 'var(--color-text-muted)', fontFamily: 'inherit' }}>
              <RefreshCw size={13} style={{ animation: loading ? 'spin 0.8s linear infinite' : 'none' }} /> Atualizar
            </button>
          </div>
        </div>

        {/* ── CARDS RESUMO ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem' }}>
          {/* Jacson */}
          <div
            className="barb-card-clickable"
            onClick={() => setDetalhesBarbeiro('Jacson')}
            title="Ver detalhes de Jacson"
            style={{ background: 'white', border: '1px solid var(--color-border)', borderTop: '4px solid #1B2E5E', borderRadius: '12px', padding: '1.1rem', boxShadow: 'var(--shadow-sm)' }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 8px 24px rgba(27,46,94,0.18)'; }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
              <div className="barb-card-nome">
                <User size={18} color="#1B2E5E" />
                <span style={{ fontWeight: 700, color: '#1B2E5E', fontSize: '0.95rem' }}>Jacson</span>
              </div>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, background: '#EEF2FA', color: '#1B2E5E', padding: '0.15rem 0.5rem', borderRadius: '20px' }}>
                {resumo?.jacson.quantidade ?? 0} cortes
              </span>
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#16a34a' }}>
              R$ {resumo?.jacson.total?.toFixed(2).replace('.', ',') ?? '0,00'}
            </div>
          </div>

          {/* Mizael */}
          <div
            className="barb-card-clickable"
            onClick={() => setDetalhesBarbeiro('Mizael')}
            title="Ver detalhes de Mizael"
            style={{ background: 'white', border: '1px solid var(--color-border)', borderTop: '4px solid #C8102E', borderRadius: '12px', padding: '1.1rem', boxShadow: 'var(--shadow-sm)' }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 8px 24px rgba(200,16,46,0.15)'; }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
              <div className="barb-card-nome">
                <User size={18} color="#C8102E" />
                <span style={{ fontWeight: 700, color: '#1B2E5E', fontSize: '0.95rem' }}>Mizael</span>
              </div>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, background: '#FEE2E2', color: '#C8102E', padding: '0.15rem 0.5rem', borderRadius: '20px' }}>
                {resumo?.mizael.quantidade ?? 0} cortes
              </span>
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#16a34a' }}>
              R$ {resumo?.mizael.total?.toFixed(2).replace('.', ',') ?? '0,00'}
            </div>
          </div>
        </div>

        {/* ── GRID: LANÇAR + HISTÓRICO ── */}
        <div className="barb-grid">

          {/* LANÇAR CORTE */}
          <div style={{ background: 'white', border: '1px solid var(--color-border)', borderRadius: '14px', padding: '1.25rem', boxShadow: 'var(--shadow-sm)' }}>
            <h2 style={{ margin: '0 0 1.1rem 0', fontSize: '1rem', color: '#1B2E5E', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 800 }}>
              <DollarSign size={18} /> Lançar Novo Corte
            </h2>

            <form onSubmit={handleLancar} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

              {/* Barbeiro */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.78rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Barbeiro</label>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button type="button" className="barb-barbeiro-btn" onClick={() => setBarbeiro('Jacson')}
                    style={{ borderColor: barbeiro === 'Jacson' ? '#1B2E5E' : 'var(--color-border)', backgroundColor: barbeiro === 'Jacson' ? '#EEF2FA' : 'white', color: barbeiro === 'Jacson' ? '#1B2E5E' : 'var(--color-text-muted)' }}>
                    Jacson
                  </button>
                  <button type="button" className="barb-barbeiro-btn" onClick={() => setBarbeiro('Mizael')}
                    style={{ borderColor: barbeiro === 'Mizael' ? '#C8102E' : 'var(--color-border)', backgroundColor: barbeiro === 'Mizael' ? '#FEE2E2' : 'white', color: barbeiro === 'Mizael' ? '#C8102E' : 'var(--color-text-muted)' }}>
                    Mizael
                  </button>
                </div>
              </div>

              {/* Tipo de Serviço */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.78rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Tipo de Serviço</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                  {([
                    { key: 'Cabelo',      label: 'Cabelo'      },
                    { key: 'Barba',       label: 'Barba'       },
                    { key: 'Sobrancelha', label: 'Sobrancelha' },
                  ] as const).map(({ key, label }) => {
                    const sel = tipoServico === key;
                    return (
                      <button key={key} type="button" onClick={() => setTipoServico(key)}
                        style={{
                          padding: '0.75rem 0.25rem', border: `2px solid ${sel ? '#1B2E5E' : 'var(--color-border)'}`,
                          borderRadius: '10px', cursor: 'pointer', fontFamily: 'inherit',
                          background: sel ? '#EEF2FA' : 'white',
                          color: sel ? '#1B2E5E' : 'var(--color-text-muted)',
                          fontWeight: sel ? 700 : 500, fontSize: '0.8rem',
                          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem',
                          transition: 'all 0.18s',
                          WebkitTapHighlightColor: 'transparent',
                        }}>
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Valor */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.78rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Valor (R$)</label>
                <input
                  type="number" className="input" value={valorCorte}
                  onChange={e => setValorCorte(e.target.value)}
                  min="0" step="0.01" required inputMode="decimal"
                  style={{ fontSize: '1.25rem', padding: '0.65rem 0.85rem', fontWeight: 700, color: '#1B2E5E' }}
                />
              </div>

              {/* Pagamento */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.78rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Pagamento</label>

                {/* Botões principais: 2×2 */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.4rem' }}>
                  {(['Dinheiro', 'Pix', 'Cartão', 'Fiado'] as const).map(fp => {
                    const cartaoAtivo = fp === 'Cartão' && (formaPagamento === 'Crédito' || formaPagamento === 'Débito');
                    const tipoAtual   = formaPagamento === 'Crédito' ? 'Crédito' : formaPagamento === 'Débito' ? 'Débito' : null;
                    const cKey        = fp === 'Cartão' && tipoAtual ? tipoAtual : fp;
                    const c           = pgColors[cKey];
                    const sel         = fp === 'Cartão' ? (cartaoAtivo || subCartaoAberto) : formaPagamento === fp;
                    return (
                      <button
                        key={fp} type="button" className="barb-pay-btn"
                        onClick={() => fp === 'Cartão' ? handleCartao() : setFormaPagamento(fp)}
                        style={{ borderColor: sel ? c.border : 'var(--color-border)', backgroundColor: sel ? c.bg : 'white', color: sel ? c.color : 'var(--color-text-muted)', position: 'relative' }}>
                        {sel && <span style={{ position: 'absolute', top: 3, right: 6, fontSize: '0.6rem', fontWeight: 900, color: c.color }}>✓</span>}
                        {pgIcon[cKey]}
                        {fp === 'Cartão' && tipoAtual ? tipoAtual : fp}
                      </button>
                    );
                  })}
                </div>

                {/* Sub-seletor Crédito / Débito */}
                {(subCartaoAberto || formaPagamento === 'Crédito' || formaPagamento === 'Débito') && (
                  <div style={{
                    display: 'flex', gap: '0.4rem', marginBottom: '0.5rem',
                    padding: '0.5rem', background: '#f0f9ff',
                    borderRadius: '10px', border: '1.5px solid #bae6fd',
                    animation: 'slideUp 0.18s ease',
                  }}>
                    <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#0369a1', textTransform: 'uppercase', letterSpacing: '0.06em', alignSelf: 'center', whiteSpace: 'nowrap', paddingRight: '0.25rem' }}>
                      Tipo:
                    </div>
                    {(['Crédito', 'Débito'] as const).map(tipo => {
                      const c   = pgColors[tipo];
                      const sel = formaPagamento === tipo;
                      return (
                        <button key={tipo} type="button"
                          onClick={() => selecionarTipoCartao(tipo)}
                          style={{
                            flex: 1, padding: '0.45rem 0.25rem',
                            border: `2px solid ${sel ? c.border : '#e0f2fe'}`,
                            background: sel ? c.bg : 'white', borderRadius: '7px', cursor: 'pointer',
                            fontWeight: 700, fontSize: '0.72rem', display: 'flex', flexDirection: 'column',
                            alignItems: 'center', gap: '0.15rem', color: sel ? c.color : '#64748b',
                            transition: 'all 0.15s', position: 'relative', fontFamily: 'inherit',
                          }}>
                          {sel && <span style={{ position: 'absolute', top: 2, right: 4, fontSize: '0.55rem', fontWeight: 900, color: c.color }}>✓</span>}
                          <CreditCard size={13} />
                          {tipo === 'Crédito' ? '💳 Crédito' : '🏧 Débito'}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Aviso Fiado */}
                {formaPagamento === 'Fiado' && (
                  <div style={{ marginTop: '0.25rem', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '0.5rem 0.75rem', fontSize: '0.75rem', color: '#92400e', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <BookOpen size={13} /> Ao confirmar, você selecionará o cliente para registrar o débito.
                  </div>
                )}
              </div>

              {/* Botão */}
              <button type="submit" disabled={lancando}
                style={{ padding: '0.9rem', fontSize: '1rem', fontWeight: 800, background: lancando ? '#94A3B8' : '#1B2E5E', color: 'white', border: 'none', borderRadius: '10px', cursor: lancando ? 'not-allowed' : 'pointer', boxShadow: lancando ? 'none' : '0 4px 14px rgba(27,46,94,0.3)', fontFamily: 'inherit', transition: 'all 0.2s' }}>
                {lancando ? 'Lançando...' : '✓ Confirmar Lançamento'}
              </button>
            </form>
          </div>

          {/* HISTÓRICO */}
          <div style={{ background: 'white', border: '1px solid var(--color-border)', borderRadius: '14px', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ margin: 0, fontSize: '1rem', color: '#1B2E5E', fontWeight: 800 }}>Lançamentos de Hoje</h2>
              {resumo?.cortesDia && <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-muted)', background: '#F1F5F9', padding: '0.2rem 0.5rem', borderRadius: '20px' }}>{resumo.cortesDia.length} cortes</span>}
            </div>

            <div style={{ overflowY: 'auto', maxHeight: '360px' }}>
              {resumo?.cortesDia && resumo.cortesDia.length > 0 ? (
                resumo.cortesDia.map((corte: any) => {
                  const isJacson = corte.barbeiro === 'Jacson';
                  const pc = pgColors[corte.formaPagamento] || pgColors['Dinheiro'];
                  return (
                    <div key={corte.id} className="barb-history-row">
                      {/* Esquerda: barbeiro + tipo + hora */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.9rem', color: isJacson ? '#1B2E5E' : '#C8102E' }}>
                          {corte.barbeiro}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          {corte.tipoServico && (
                            <span style={{ fontSize: '0.68rem', fontWeight: 700, background: '#EEF2FA', color: '#1B2E5E', padding: '0.1rem 0.45rem', borderRadius: '20px' }}>
                              {corte.tipoServico}
                            </span>
                          )}
                          <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                            {new Date(corte.dataCorte + 'Z').toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>

                      {/* Direita: badge pagamento + valor + delete */}
                      <div className="barb-history-right">
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '0.2rem 0.55rem', borderRadius: '20px', background: pc.bg, color: pc.color, whiteSpace: 'nowrap' }}>
                          {pgEmoji[corte.formaPagamento]} {corte.formaPagamento}
                        </span>
                        <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#1B2E5E', whiteSpace: 'nowrap' }}>
                          R$ {corte.valor.toFixed(2).replace('.', ',')}
                        </span>
                        <button onClick={() => abrirModalDeletar(corte)} title="Apagar"
                          style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '0.25rem', borderRadius: '6px', display: 'flex', alignItems: 'center', transition: 'color 0.2s' }}
                          onMouseEnter={e => (e.currentTarget.style.color = '#dc2626')}
                          onMouseLeave={e => (e.currentTarget.style.color = '#94a3b8')}>
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--color-text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                  <Scissors size={28} style={{ opacity: 0.25 }} />
                  <span style={{ fontSize: '0.875rem' }}>Nenhum corte registrado hoje</span>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* ── MODAL: seleção de cliente Fiado ── */}
      {modalFiadoCliente && (
        <div onClick={() => setModalFiadoCliente(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 9998, backgroundColor: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)', padding: '1rem', animation: 'fadeIn 0.2s ease' }}>
          <div onClick={e => e.stopPropagation()}
            style={{ backgroundColor: 'white', borderRadius: '18px', width: '100%', maxWidth: '480px', boxShadow: '0 24px 70px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column', overflow: 'hidden', maxHeight: '82vh', animation: 'popIn 0.25s ease' }}>

            {/* Header */}
            <div style={{ background: 'linear-gradient(135deg,#d97706,#b45309)', padding: '1.1rem 1.4rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <div style={{ fontWeight: 800, color: 'white', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <BookOpen size={20} /> Selecionar Cliente — Fiado
              </div>
              <button onClick={() => setModalFiadoCliente(false)} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', borderRadius: '50%', width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <X size={15} />
              </button>
            </div>

            {/* Resumo do lançamento */}
            <div style={{ padding: '0.8rem 1.4rem', borderBottom: '1px solid #e2e8f0', background: '#fffbeb', flexShrink: 0 }}>
              <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.15rem' }}>Valor a lançar no fiado</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#d97706' }}>
                R$ {Number(valorCorte).toFixed(2).replace('.', ',')}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#92400e', marginTop: '0.15rem' }}>
                {barbeiro} — {tipoServico}
              </div>
            </div>

            {/* Busca */}
            <div style={{ padding: '0.7rem 1.1rem', borderBottom: '1px solid #e2e8f0', flexShrink: 0 }}>
              <div style={{ position: 'relative' }}>
                <Search size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input autoFocus value={buscaFiado} onChange={e => setBuscaFiado(e.target.value)}
                  placeholder="Buscar por nome ou telefone..."
                  style={{ width: '100%', padding: '0.6rem 0.75rem 0.6rem 2.25rem', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
              </div>
            </div>

            {/* Lista de clientes */}
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {loadingClientes ? (
                <div style={{ padding: '2.5rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.875rem' }}>Carregando clientes...</div>
              ) : (() => {
                const filtrados = clientesFiado.filter(c =>
                  c.nome.toLowerCase().includes(buscaFiado.toLowerCase()) ||
                  (c.telefone || '').includes(buscaFiado)
                );
                if (filtrados.length === 0) return (
                  <div style={{ padding: '2.5rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.875rem' }}>
                    Nenhum cliente encontrado.<br />
                    <span style={{ fontSize: '0.78rem' }}>Cadastre clientes na aba Fiado.</span>
                  </div>
                );
                return filtrados.map(c => (
                  <button key={c.id} onClick={() => executarLancamento(c.id)}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.9rem', padding: '0.9rem 1.25rem', border: 'none', borderBottom: '1px solid #f1f5f9', background: 'white', cursor: 'pointer', textAlign: 'left', transition: 'background 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#fffbeb')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'white')}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: c.totalDevido > 0 ? '#FEE2E2' : '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <User size={19} color={c.totalDevido > 0 ? '#C8102E' : '#16a34a'} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#1B2E5E', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.nome}</div>
                      {c.telefone && <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{c.telefone}</div>}
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 800, color: c.totalDevido > 0 ? '#C8102E' : '#16a34a' }}>
                        {c.totalDevido > 0 ? `Deve R$ ${c.totalDevido.toFixed(2).replace('.', ',')}` : '✓ Quitado'}
                      </div>
                      <div style={{ fontSize: '0.68rem', color: '#d97706', fontWeight: 600, marginTop: '0.1rem' }}>Toque para selecionar →</div>
                    </div>
                  </button>
                ));
              })()}
            </div>

          </div>
        </div>
      )}
    </>
  );
};

export default Barbearia;
