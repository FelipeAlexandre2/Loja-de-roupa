import React, { useState, useEffect } from 'react';
import { Search, Plus, Minus, Trash2, ShoppingCart, Banknote, QrCode, CreditCard, X, ChevronUp, Package, Tag, Hash, Layers, CheckCircle2, ImageOff, BookOpen, Percent, User, CornerDownLeft } from 'lucide-react';
import { fetchWithAuth } from '../utils/fetchWithAuth';
import { getApiUrl } from '../utils/apiUrl';
import { canEdit } from '../App';

const BASE_URL = getApiUrl();

interface ProdutoCart {
  id: number;
  nome: string;
  preco: number;
  quantidade: number;
}

interface ProdutoDetalhe {
  id: number;
  nome: string;
  preco: number;
  codigoBarras?: string;
  categoria?: string;
  quantidadeEstoque?: number;
  descricao?: string;
  imagemUrl?: string;
  isNovo?: boolean; // se está sendo adicionado agora ou já estava no cart
}

const PDV: React.FC = () => {
  const somenteLeitura = !canEdit('pdv');
  const [carrinho, setCarrinho] = useState<ProdutoCart[]>([]);
  const [busca, setBusca] = useState('');
  const [mensagemExtra, setMensagemExtra] = useState('');
  const [formaPagamento, setFormaPagamento] = useState<'Dinheiro' | 'Pix' | 'Cartão' | 'Crédito' | 'Débito' | 'Fiado'>('Dinheiro'); // mantido para compatibilidade API
  const [pagamentos, setPagamentos] = useState<Partial<Record<'Dinheiro'|'Pix'|'Cartão'|'Crédito'|'Débito'|'Fiado', string>>>({ 'Dinheiro': '' });
  const [subCartaoAberto, setSubCartaoAberto] = useState(false);
  const [carrinhoAberto, setCarrinhoAberto] = useState(false);
  const [produtoDetalhe, setProdutoDetalhe] = useState<ProdutoDetalhe | null>(null);
  const [scanKey, setScanKey] = useState(0);
  const [desconto, setDesconto] = useState<string>('');
  const [tipoDesconto, setTipoDesconto] = useState<'R$' | '%'>('R$');

  // Seletor de cliente fiado
  const [modalFiadoCliente, setModalFiadoCliente] = useState(false);
  const [clientesFiado, setClientesFiado] = useState<{id:number,nome:string,telefone?:string,totalDevido:number}[]>([]);
  const [buscaFiado, setBuscaFiado] = useState('');
  const [loadingClientes, setLoadingClientes] = useState(false);

  const buscarProdutoPorCodigo = async (codigo: string) => {
    try {
      setMensagemExtra('Buscando...');
      let response = await fetchWithAuth(`${getApiUrl()}/api/produtos/barras/${codigo}`);
      if (!response.ok && !isNaN(Number(codigo))) {
        response = await fetchWithAuth(`${getApiUrl()}/api/produtos/${codigo}`);
      }
      if (response.ok) {
        const produto = await response.json();

        // Verifica se já estava no carrinho
        const jaExistia = carrinho.some(i => i.id === produto.id);

        setCarrinho(prev => {
          const existe = prev.find(i => i.id === produto.id);
          if (existe) return prev.map(i => i.id === produto.id ? { ...i, quantidade: i.quantidade + 1 } : i);
          return [...prev, { id: produto.id, nome: produto.nome, preco: produto.preco, quantidade: 1 }];
        });

        // Exibe o detalhe do produto
        setProdutoDetalhe({
          id: produto.id,
          nome: produto.nome,
          preco: produto.preco,
          codigoBarras: produto.codigoBarras || produto.codigo_barras || produto.codigoBarra || codigo,
          categoria: produto.categoria,
          quantidadeEstoque: produto.quantidadeEstoque ?? produto.quantidade_estoque ?? produto.estoque,
          descricao: produto.descricao,
          imagemUrl: produto.imagemUrl || produto.imagem_url || produto.imagem || '',
          isNovo: !jaExistia,
        });
        setScanKey(k => k + 1);

        setMensagemExtra('');
        setBusca('');
      } else {
        setProdutoDetalhe(null);
        setMensagemExtra('Produto não encontrado! Tente o ID (ex: 1) ou Cód. de Barras.');
      }
    } catch { setMensagemExtra('Erro ao conectar com a API.'); }
  };

  const fetchClientesFiado = async () => {
    setLoadingClientes(true);
    try {
      const r = await fetchWithAuth(`${getApiUrl()}/api/fiado/clientes`);
      if (r.ok) setClientesFiado(await r.json());
    } catch {}
    finally { setLoadingClientes(false); }
  };

  const handleFinalizarVenda = async () => {
    if (somenteLeitura) {
      alert('Acesso Restrito: Seu usuário tem permissão apenas para visualizar o PDV.');
      return;
    }
    if (carrinho.length === 0) { alert('O carrinho está vazio!'); return; }
    const formasSelecionadas = Object.keys(pagamentos) as ('Dinheiro'|'Pix'|'Cartão'|'Crédito'|'Débito'|'Fiado')[];
    if (formasSelecionadas.length === 0) { alert('Selecione pelo menos uma forma de pagamento!'); return; }
    // Se Fiado está entre os métodos, abrir seletor de cliente
    if ('Fiado' in pagamentos) {
      await fetchClientesFiado();
      setBuscaFiado('');
      setModalFiadoCliente(true);
      return;
    }
    await executarVenda(null);
  };

  const executarVenda = async (clienteFiadoId: number | null) => {
    if (somenteLeitura) {
      alert('Acesso Restrito: Seu usuário tem permissão apenas para visualizar o PDV.');
      return;
    }
    const formasSelecionadas = Object.keys(pagamentos) as ('Dinheiro'|'Pix'|'Cartão'|'Crédito'|'Débito'|'Fiado')[];
    const formaPrincipal = formasSelecionadas.reduce((a, b) =>
      (parseFloat(pagamentos[a]||'0') >= parseFloat(pagamentos[b]||'0')) ? a : b
    );
    try {
      setModalFiadoCliente(false);
      setMensagemExtra('Finalizando venda...');
      const res = await fetchWithAuth(`${getApiUrl()}/api/vendas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itens: carrinho.map(i => ({ produto: { id: i.id }, quantidade: i.quantidade })),
          formaPagamento: formaPrincipal,
          pagamentoMisto: pagamentos,
          desconto: valorDesconto,
        }),
      });
      if (res.ok) {
        // Registrar débito no fiado do cliente selecionado
        if (clienteFiadoId !== null && 'Fiado' in pagamentos) {
          const vFiado = parseFloat(pagamentos['Fiado']?.replace(',', '.') || '0');
          const valorFiado = vFiado > 0 ? vFiado : total;
          const descFiado = `Compra PDV \u2013 ${carrinho.map(i => i.nome).join(', ')}`;
          await fetchWithAuth(`${getApiUrl()}/api/fiado/lancamentos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ clienteId: clienteFiadoId, tipo: 'DEBITO', valor: valorFiado, descricao: descFiado }),
          }).catch(() => {}); // não bloqueia a venda se falhar
        }
        setCarrinho([]); setPagamentos({ 'Dinheiro': '' }); setFormaPagamento('Dinheiro');
        setSubCartaoAberto(false);
        setCarrinhoAberto(false); setProdutoDetalhe(null); setDesconto('');
        setMensagemExtra('✅ Venda finalizada com sucesso!');
        setTimeout(() => setMensagemExtra(''), 3000);
      } else {
        const err = await res.json();
        setMensagemExtra('Erro: ' + (err.message || 'Falha ao registrar venda.'));
      }
    } catch { setMensagemExtra('Erro de conexão ao finalizar a venda.'); }
  };

  const alterarQtd = (id: number, delta: number) =>
    setCarrinho(prev => prev.map(i => i.id === id ? { ...i, quantidade: Math.max(1, i.quantidade + delta) } : i));

  const remover = (id: number) => {
    setCarrinho(prev => prev.filter(i => i.id !== id));
    if (produtoDetalhe?.id === id) setProdutoDetalhe(null);
  };

  const subtotal = carrinho.reduce((acc, i) => acc + i.preco * i.quantidade, 0);
  const qtdTotal  = carrinho.reduce((acc, i) => acc + i.quantidade, 0);

  const valorDesconto = (() => {
    const v = parseFloat(desconto.replace(',', '.')) || 0;
    if (tipoDesconto === '%') return Math.min(subtotal, subtotal * v / 100);
    return Math.min(subtotal, v);
  })();
  const total = Math.max(0, subtotal - valorDesconto);

  // Pagamento misto
  const totalPago = Object.values(pagamentos).reduce((s, v) => s + (parseFloat(v?.replace(',', '.') || '0') || 0), 0);
  const troco     = totalPago > total ? totalPago - total : 0;
  const falta     = totalPago < total ? total - totalPago : 0;

  const togglePagamento = (fp: 'Dinheiro'|'Pix'|'Cartão'|'Fiado') => {
    if (fp === 'Cartão') {
      // Se já tem crédito ou débito selecionado, remove e fecha
      if ('Crédito' in pagamentos || 'Débito' in pagamentos) {
        setPagamentos(prev => {
          const next = { ...prev };
          delete next['Crédito'];
          delete next['Débito'];
          // se ficou vazio, mantém Dinheiro
          return Object.keys(next).length === 0 ? { 'Dinheiro': '' } : next;
        });
        setSubCartaoAberto(false);
      } else {
        // Abre o sub-seletor
        setSubCartaoAberto(prev => !prev);
      }
      return;
    }
    setPagamentos(prev => {
      if (fp in prev) {
        const keys = Object.keys(prev);
        if (keys.length === 1) return prev;
        const next = { ...prev };
        delete next[fp];
        return next;
      }
      const jaAlocado = Object.values(prev).reduce((s, v) => s + (parseFloat(v?.replace(',', '.') || '0') || 0), 0);
      const restante  = Math.max(0, total - jaAlocado);
      return { ...prev, [fp]: restante > 0 ? restante.toFixed(2) : '' };
    });
  };

  const selecionarTipoCartao = (tipo: 'Crédito' | 'Débito') => {
    setPagamentos(prev => {
      const next = { ...prev };
      delete next['Crédito'];
      delete next['Débito'];
      const jaAlocado = Object.values(next).reduce((s, v) => s + (parseFloat(v?.replace(',', '.') || '0') || 0), 0);
      const restante  = Math.max(0, total - jaAlocado);
      return { ...next, [tipo]: restante > 0 ? restante.toFixed(2) : '' };
    });
    setSubCartaoAberto(false);
  };

  const setPgValor = (fp: string, val: string) => {
    setPagamentos(prev => ({ ...prev, [fp]: val }));
  };

  const pgColors: Record<string, { border: string; bg: string; color: string }> = {
    'Dinheiro': { border: '#16a34a', bg: '#f0fdf4', color: '#16a34a' },
    'Pix':      { border: '#7c3aed', bg: '#f5f3ff', color: '#7c3aed' },
    'Cartão':   { border: '#0369a1', bg: '#eff6ff', color: '#0369a1' },
    'Crédito':  { border: '#0369a1', bg: '#eff6ff', color: '#0369a1' },
    'Débito':   { border: '#0891b2', bg: '#ecfeff', color: '#0891b2' },
    'Fiado':    { border: '#d97706', bg: '#fffbeb', color: '#d97706' },
  };

  // Quantidade atual no carrinho desse produto
  const qtdNoCart = produtoDetalhe
    ? (carrinho.find(i => i.id === produtoDetalhe.id)?.quantidade ?? 0)
    : 0;

  const CarrinhoPanel = ({ modal = false }) => (
    <div style={{
      display: 'flex', flexDirection: 'column',
      background: 'white',
      ...(modal ? {} : { flex: '1.2', minWidth: '300px', borderRadius: '12px', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-sm)' }),
    }}>
      {/* Header carrinho */}
      <div style={{ padding: '1rem 1.25rem', background: '#1B2E5E', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderRadius: modal ? '16px 16px 0 0' : '12px 12px 0 0', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '1rem' }}>
          <ShoppingCart size={20} /> Carrinho
          {qtdTotal > 0 && <span style={{ background: '#C8102E', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800 }}>{qtdTotal}</span>}
        </div>
        {modal && (
          <button onClick={() => setCarrinhoAberto(false)} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', borderRadius: '8px', padding: '0.3rem', cursor: 'pointer', display: 'flex' }}>
            <X size={20} />
          </button>
        )}
      </div>

      {/* Itens */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: modal ? '40vh' : undefined }}>
        {carrinho.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '2rem 1rem', fontSize: '0.9rem' }}>
            <ShoppingCart size={32} style={{ opacity: 0.3, marginBottom: '0.5rem' }} /><br/>
            Carrinho vazio
          </div>
        ) : carrinho.map(item => (
          <div key={item.id} style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.6rem 0.5rem',
            borderBottom: '1px dashed var(--color-border)',
            background: produtoDetalhe?.id === item.id ? '#EEF2FA' : 'transparent',
            borderRadius: produtoDetalhe?.id === item.id ? '8px' : '0',
            transition: 'background 0.3s',
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#1B2E5E', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.nome}</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>R$ {item.preco.toFixed(2).replace('.', ',')} un.</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flexShrink: 0 }}>
              <button onClick={() => alterarQtd(item.id, -1)} style={{ width: '28px', height: '28px', border: '1px solid var(--color-border)', background: 'white', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Minus size={14} /></button>
              <span style={{ fontWeight: 700, width: '20px', textAlign: 'center', fontSize: '0.9rem' }}>{item.quantidade}</span>
              <button onClick={() => alterarQtd(item.id, 1)} style={{ width: '28px', height: '28px', border: '1px solid var(--color-border)', background: 'white', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Plus size={14} /></button>
              <button onClick={() => remover(item.id)} style={{ width: '28px', height: '28px', border: 'none', background: '#FEF2F2', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#C8102E' }}><Trash2 size={14} /></button>
            </div>
          </div>
        ))}
      </div>

      {/* Rodapé pagamento */}
      <div style={{ padding: '1rem', borderTop: '2px dashed var(--color-border)', background: '#FAFAFA', flexShrink: 0 }}>
        
        {/* Desconto */}
        <div style={{ marginBottom: '0.75rem' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-muted)', marginBottom: '0.4rem' }}>Desconto</div>
          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
            {/* Toggle R$ / % */}
            <div style={{ display: 'flex', border: '1.5px solid var(--color-border)', borderRadius: '8px', overflow: 'hidden', flexShrink: 0 }}>
              {(['R$', '%'] as const).map(t => (
                <button key={t} onClick={() => setTipoDesconto(t)}
                  style={{ padding: '0.45rem 0.65rem', border: 'none', background: tipoDesconto === t ? '#1B2E5E' : 'white', color: tipoDesconto === t ? 'white' : 'var(--color-text-muted)', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.2rem', transition: 'all 0.15s', fontFamily: 'inherit' }}>
                  {t === '%' ? <Percent size={12} /> : <span>R$</span>} {t}
                </button>
              ))}
            </div>
            {/* Valor do desconto */}
            <input
              type="number"
              min="0"
              step="0.01"
              value={desconto}
              onChange={e => setDesconto(e.target.value)}
              placeholder={tipoDesconto === '%' ? 'Ex: 10' : 'Ex: 5,00'}
              inputMode="decimal"
              style={{ flex: 1, padding: '0.5rem 0.65rem', border: '1.5px solid var(--color-border)', borderRadius: '8px', fontSize: '0.9rem', fontFamily: 'inherit', outline: 'none', background: 'white', color: '#1B2E5E', fontWeight: 600 }}
            />
            {desconto && (
              <button onClick={() => setDesconto('')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '0.2rem', display: 'flex' }}>
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Totais */}
        <div style={{ marginBottom: '0.75rem' }}>
          {valorDesconto > 0 && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                <span style={{ color: 'var(--color-text-muted)', fontSize: '0.82rem' }}>Subtotal</span>
                <span style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>R$ {subtotal.toFixed(2).replace('.', ',')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                <span style={{ color: '#16a34a', fontSize: '0.82rem', fontWeight: 600 }}>
                  Desconto {tipoDesconto === '%' ? `(${desconto}%)` : ''}
                </span>
                <span style={{ fontSize: '0.9rem', color: '#16a34a', fontWeight: 700 }}>- R$ {valorDesconto.toFixed(2).replace('.', ',')}</span>
              </div>
              <div style={{ height: 1, background: 'var(--color-border)', marginBottom: '0.4rem' }} />
            </>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--color-text-muted)', fontWeight: 500 }}>Total</span>
            <span style={{ fontSize: '1.75rem', fontWeight: 800, color: valorDesconto > 0 ? '#C8102E' : '#1B2E5E' }}>R$ {total.toFixed(2).replace('.', ',')}</span>
          </div>
        </div>

        {/* Forma de Pagamento */}
        <div style={{ marginBottom: '0.75rem' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>Pagamento</div>

          {/* Botões de seleção */}
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.4rem' }}>
            {(['Dinheiro', 'Pix', 'Cartão', 'Fiado'] as const).map(fp => {
              const cartaoAtivo = fp === 'Cartão' && ('Crédito' in pagamentos || 'Débito' in pagamentos);
              const tipoAtual   = 'Crédito' in pagamentos ? 'Crédito' : 'Débito' in pagamentos ? 'Débito' : null;
              const cAtivo      = fp === 'Cartão' && tipoAtual ? pgColors[tipoAtual] : pgColors[fp];
              const sel         = fp === 'Cartão' ? (cartaoAtivo || subCartaoAberto) : fp in pagamentos;
              const c           = sel ? cAtivo : pgColors[fp];
              return (
                <button key={fp} onClick={() => togglePagamento(fp)} style={{
                  flex: '1 1 calc(50% - 0.2rem)', minWidth: '70px',
                  padding: '0.55rem 0.2rem', border: `2px solid ${sel ? c.border : 'var(--color-border)'}`,
                  background: sel ? c.bg : 'white', borderRadius: '8px', cursor: 'pointer',
                  fontWeight: 700, fontSize: '0.72rem', display: 'flex', flexDirection: 'column',
                  alignItems: 'center', gap: '0.2rem', color: sel ? c.color : 'var(--color-text-muted)',
                  transition: 'all 0.15s', position: 'relative',
                }}>
                  {sel && <span style={{ position: 'absolute', top: 3, right: 5, fontSize: '0.6rem', fontWeight: 900, color: c.color }}>✓</span>}
                  {fp === 'Dinheiro' ? <Banknote size={15} /> : fp === 'Pix' ? <QrCode size={15} /> : fp === 'Cartão' ? <CreditCard size={15} /> : <BookOpen size={15} />}
                  {fp === 'Cartão' && tipoAtual ? tipoAtual : fp}
                </button>
              );
            })}
          </div>

          {/* Sub-seletor Crédito / Débito */}
          {(subCartaoAberto || 'Crédito' in pagamentos || 'Débito' in pagamentos) && (
            <div style={{
              display: 'flex', gap: '0.4rem', marginBottom: '0.6rem',
              animation: 'fadeIn 0.18s ease',
              padding: '0.5rem', background: '#f0f9ff',
              borderRadius: '10px', border: '1.5px solid #bae6fd',
            }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#0369a1', textTransform: 'uppercase', letterSpacing: '0.06em', alignSelf: 'center', whiteSpace: 'nowrap', paddingRight: '0.25rem' }}>
                Tipo:
              </div>
              {(['Crédito', 'Débito'] as const).map(tipo => {
                const c   = pgColors[tipo];
                const sel = tipo in pagamentos;
                return (
                  <button key={tipo} onClick={() => selecionarTipoCartao(tipo)} style={{
                    flex: 1, padding: '0.45rem 0.25rem',
                    border: `2px solid ${sel ? c.border : '#e0f2fe'}`,
                    background: sel ? c.bg : 'white', borderRadius: '7px', cursor: 'pointer',
                    fontWeight: 700, fontSize: '0.72rem', display: 'flex', flexDirection: 'column',
                    alignItems: 'center', gap: '0.15rem', color: sel ? c.color : '#64748b',
                    transition: 'all 0.15s', position: 'relative',
                  }}>
                    {sel && <span style={{ position: 'absolute', top: 2, right: 4, fontSize: '0.55rem', fontWeight: 900, color: c.color }}>✓</span>}
                    <CreditCard size={13} />
                    {tipo === 'Crédito' ? '💳 Crédito' : '🏧 Débito'}
                  </button>
                );
              })}
            </div>
          )}

          {/* Inputs de valor por forma selecionada */}
          {Object.keys(pagamentos).length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {(Object.keys(pagamentos) as ('Dinheiro'|'Pix'|'Cartão'|'Crédito'|'Débito'|'Fiado')[]).map(fp => {
                const c = pgColors[fp];
                return (
                  <div key={fp} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', minWidth: 72 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: c.border, flexShrink: 0 }} />
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: c.color }}>{fp}</span>
                    </div>
                    <div style={{ flex: 1, position: 'relative' }}>
                      <span style={{ position: 'absolute', left: '0.6rem', top: '50%', transform: 'translateY(-50%)', fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8' }}>R$</span>
                      <input
                        type="number" min="0" step="0.01"
                        value={pagamentos[fp] || ''}
                        onChange={e => setPgValor(fp, e.target.value)}
                        placeholder="0,00"
                        inputMode="decimal"
                        style={{ width: '100%', padding: '0.45rem 0.5rem 0.45rem 2rem', border: `1.5px solid ${c.border}`, borderRadius: '7px', fontSize: '0.88rem', fontFamily: 'inherit', outline: 'none', color: '#1B2E5E', fontWeight: 700, boxSizing: 'border-box', background: c.bg }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Resumo: pago / falta / troco */}
          {totalPago > 0 && (
            <div style={{ marginTop: '0.6rem', background: falta > 0.01 ? '#FEF2F2' : troco > 0.01 ? '#F0FDF4' : '#EEF2FA', borderRadius: '8px', padding: '0.5rem 0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: `1px solid ${falta > 0.01 ? '#FECACA' : troco > 0.01 ? '#BBF7D0' : '#C7D4F0'}` }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: falta > 0.01 ? '#B91C1C' : troco > 0.01 ? '#15803D' : '#1B2E5E' }}>
                {falta > 0.01 ? '⚠️ Falta' : troco > 0.01 ? '💰 Troco' : '✅ Pago'}
              </span>
              <span style={{ fontSize: '0.9rem', fontWeight: 800, color: falta > 0.01 ? '#B91C1C' : troco > 0.01 ? '#15803D' : '#1B2E5E' }}>
                {falta > 0.01 || troco > 0.01 ? `R$ ${(falta > 0.01 ? falta : troco).toFixed(2).replace('.', ',')}` : 'OK'}
              </span>
            </div>
          )}
        </div>

        <button onClick={handleFinalizarVenda}
          disabled={somenteLeitura || carrinho.length === 0}
          style={{ width: '100%', padding: '0.9rem', fontSize: '1rem', fontWeight: 800, background: (somenteLeitura || carrinho.length === 0) ? '#94A3B8' : '#C8102E', color: 'white', border: 'none', borderRadius: '10px', cursor: (somenteLeitura || carrinho.length === 0) ? 'not-allowed' : 'pointer', transition: 'background 0.2s', boxShadow: (somenteLeitura || carrinho.length === 0) ? 'none' : '0 4px 14px rgba(200,16,46,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
          <CheckCircle2 size={18} /> {somenteLeitura ? 'Modo Somente Leitura' : 'Finalizar Compra'}
        </button>

      </div>
    </div>
  );

  return (
    <>
      <style>{`
        @keyframes slideUp   { from{transform:translateY(100%);opacity:0} to{transform:translateY(0);opacity:1} }
        @keyframes scanPop   { 0%{transform:scale(0.93);opacity:0} 60%{transform:scale(1.03)} 100%{transform:scale(1);opacity:1} }
        @keyframes scanLine  { 0%{top:0} 100%{top:calc(100% - 2px)} }
        @keyframes fadeIn    { from{opacity:0} to{opacity:1} }
        .pdv-layout { display: flex; gap: 1.25rem; height: calc(100vh - 130px); }
        .pdv-left   { flex: 2; display: flex; flex-direction: column; gap: 0.75rem; overflow: hidden; }
        .pdv-right  { display: flex; }
        .pdv-cart-fab    { display: none !important; }
        .pdv-cart-drawer { display: none !important; }
        .pdv-mobile-confirm-btn { display: none !important; }
        .scan-card { animation: scanPop 0.35s cubic-bezier(0.34,1.56,0.64,1) both; }

        @media (max-width: 768px) {
          .pdv-layout { flex-direction: column; height: auto; min-height: calc(100vh - 140px); padding-bottom: 90px; }
          .pdv-left   { overflow: visible; }
          .pdv-right  { display: none !important; }
          .pdv-cart-fab    { display: flex !important; }
          .pdv-cart-drawer { display: block !important; }
          .pdv-mobile-confirm-btn { display: inline-flex !important; }
        }
      `}</style>
      {/* ── Modal: seleção de cliente Fiado ─────────────────────── */}
      {modalFiadoCliente && (
        <div onClick={() => setModalFiadoCliente(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 9998, backgroundColor: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)', padding: '1rem', animation: 'fadeIn 0.2s ease' }}>
          <div onClick={e => e.stopPropagation()}
            style={{ backgroundColor: 'white', borderRadius: '18px', width: '100%', maxWidth: '480px', boxShadow: '0 24px 70px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column', overflow: 'hidden', maxHeight: '82vh', animation: 'scanPop 0.25s ease' }}>

            {/* Header */}
            <div style={{ background: 'linear-gradient(135deg,#1B2E5E,#2d4a8f)', padding: '1.1rem 1.4rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <div style={{ fontWeight: 800, color: 'white', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <BookOpen size={20} /> Selecionar Cliente — Fiado
              </div>
              <button onClick={() => setModalFiadoCliente(false)} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', borderRadius: '50%', width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <X size={15} />
              </button>
            </div>

            {/* Valor do fiado */}
            <div style={{ padding: '0.8rem 1.4rem', borderBottom: '1px solid #e2e8f0', background: '#fffbeb', flexShrink: 0 }}>
              <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.15rem' }}>Valor a lançar no fiado</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#d97706' }}>
                R$ {(() => { const v = parseFloat((pagamentos['Fiado'] || '').replace(',', '.')); return (v > 0 ? v : total).toFixed(2).replace('.', ','); })()}
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

            {/* Lista */}
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
                  <button key={c.id} onClick={() => executarVenda(c.id)}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.9rem', padding: '0.9rem 1.25rem', border: 'none', borderBottom: '1px solid #f1f5f9', background: 'white', cursor: 'pointer', textAlign: 'left', transition: 'background 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#f0f9ff')}
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

      <div className="pdv-layout">
        {/* ── Esquerda: busca + detalhe ── */}
        <div className="pdv-left">
          <h1 style={{ margin: 0, color: '#1B2E5E', fontSize: '1.4rem', fontWeight: 800 }}>Frente de Caixa</h1>

          {/* Campo de busca + Botao Confirmar (Mobile) */}
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
              <input
                type="text" value={busca}
                onChange={e => setBusca(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && busca.trim()) buscarProdutoPorCodigo(busca.trim()); }}
                placeholder="ID ou código de barras... (Enter para buscar)"
                inputMode="numeric"
                style={{ width: '100%', padding: '0.85rem 1rem 0.85rem 2.75rem', fontSize: '1rem', border: '2px solid #1B2E5E', borderRadius: '10px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                autoFocus
              />
            </div>

            {/* Botão Confirmar/Enter visível APENAS no celular */}
            <button
              type="button"
              className="pdv-mobile-confirm-btn"
              onClick={() => { if (busca.trim()) buscarProdutoPorCodigo(busca.trim()); }}
              style={{
                padding: '0.85rem 1.1rem',
                background: '#1B2E5E',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                fontWeight: 800,
                fontSize: '0.9rem',
                cursor: 'pointer',
                fontFamily: 'inherit',
                whiteSpace: 'nowrap',
                gap: '0.35rem',
                alignItems: 'center',
                boxShadow: '0 4px 12px rgba(27,46,94,0.25)',
                transition: 'transform 0.1s active',
              }}
            >
              <CornerDownLeft size={16} /> Confirmar
            </button>
          </div>

          {/* Mensagem de erro */}
          {mensagemExtra && (
            <div style={{ padding: '0.6rem 0.85rem', borderRadius: '8px', fontWeight: 600, fontSize: '0.875rem', background: mensagemExtra.startsWith('✅') ? '#D1FAE5' : mensagemExtra.includes('Erro') || mensagemExtra.includes('não') ? '#FEE2E2' : '#EEF2FA', color: mensagemExtra.startsWith('✅') ? '#065F46' : mensagemExtra.includes('Erro') || mensagemExtra.includes('não') ? '#B91C1C' : '#1B2E5E' }}>
              {mensagemExtra}
            </div>
          )}

          {/* ── CARD DE DETALHE DO PRODUTO ── */}
          {produtoDetalhe ? (
            <div key={scanKey} className="scan-card" style={{
              flex: 1,
              border: '2px solid #1B2E5E',
              borderRadius: '14px',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              background: 'white',
              boxShadow: '0 8px 32px rgba(27,46,94,0.13)',
              minHeight: '120px',
            }}>
              {/* Header do card */}
              <div style={{ background: '#1B2E5E', padding: '0.85rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Package size={17} color="white" />
                  </div>
                  <div>
                    <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                      Produto Detectado
                    </div>
                    <div style={{ color: 'white', fontWeight: 800, fontSize: '0.9rem' }}>
                      {produtoDetalhe.isNovo ? '✦ Novo item adicionado' : '＋ Quantidade atualizada'}
                    </div>
                  </div>
                </div>
                <button onClick={() => setProdutoDetalhe(null)}
                  style={{ background: 'rgba(255,255,255,0.12)', border: 'none', color: 'white', borderRadius: '50%', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <X size={14} />
                </button>
              </div>

              {/* Corpo do card */}
              <div style={{ flex: 1, padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto' }}>

                {/* Foto + Nome + Preço */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>

                  {/* Foto do produto */}
                  <div style={{ width: 90, height: 90, flexShrink: 0, borderRadius: '12px', overflow: 'hidden', border: '2px solid #E2E8F0', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {produtoDetalhe.imagemUrl ? (
                      <img
                        src={produtoDetalhe.imagemUrl.startsWith('http') ? produtoDetalhe.imagemUrl : `${BASE_URL}${produtoDetalhe.imagemUrl}`}
                        alt={produtoDetalhe.nome}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; (e.currentTarget.nextSibling as HTMLElement).style.display = 'flex'; }}
                      />
                    ) : null}
                    <div style={{ display: produtoDetalhe.imagemUrl ? 'none' : 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem', color: '#CBD5E1' }}>
                      <ImageOff size={22} />
                      <span style={{ fontSize: '0.6rem', fontWeight: 600 }}>Sem foto</span>
                    </div>
                  </div>

                  {/* Nome e preço */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Nome</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1B2E5E', lineHeight: 1.25 }}>{produtoDetalhe.nome}</div>
                    <div style={{ marginTop: '0.25rem' }}>
                      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Preço Unit.</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#16a34a' }}>
                        R$ {produtoDetalhe.preco.toFixed(2).replace('.', ',')}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Detalhes em grade */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '0.6rem' }}>

                  {/* ID */}
                  <div style={{ background: '#F8FAFC', borderRadius: '10px', padding: '0.65rem 0.9rem', border: '1px solid #E2E8F0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.68rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.2rem' }}>
                      <Hash size={11} /> ID
                    </div>
                    <div style={{ fontWeight: 700, color: '#1B2E5E', fontSize: '0.9rem' }}>#{produtoDetalhe.id}</div>
                  </div>

                  {/* Código de barras */}
                  {produtoDetalhe.codigoBarras && (
                    <div style={{ background: '#F8FAFC', borderRadius: '10px', padding: '0.65rem 0.9rem', border: '1px solid #E2E8F0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.68rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.2rem' }}>
                        <QrCode size={11} /> Cód. Barras
                      </div>
                      <div style={{ fontWeight: 700, color: '#1B2E5E', fontSize: '0.85rem', fontFamily: 'monospace' }}>{produtoDetalhe.codigoBarras}</div>
                    </div>
                  )}

                  {/* Categoria */}
                  {produtoDetalhe.categoria && (
                    <div style={{ background: '#F8FAFC', borderRadius: '10px', padding: '0.65rem 0.9rem', border: '1px solid #E2E8F0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.68rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.2rem' }}>
                        <Tag size={11} /> Categoria
                      </div>
                      <div style={{ fontWeight: 700, color: '#1B2E5E', fontSize: '0.85rem' }}>{produtoDetalhe.categoria}</div>
                    </div>
                  )}

                  {/* Estoque */}
                  {produtoDetalhe.quantidadeEstoque !== undefined && (
                    <div style={{ background: produtoDetalhe.quantidadeEstoque <= 0 ? '#FEF2F2' : produtoDetalhe.quantidadeEstoque <= 5 ? '#FFFBEB' : '#F0FDF4', borderRadius: '10px', padding: '0.65rem 0.9rem', border: `1px solid ${produtoDetalhe.quantidadeEstoque <= 0 ? '#FECACA' : produtoDetalhe.quantidadeEstoque <= 5 ? '#FDE68A' : '#BBF7D0'}` }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.68rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.2rem' }}>
                        <Layers size={11} /> Estoque
                      </div>
                      <div style={{ fontWeight: 800, fontSize: '0.9rem', color: produtoDetalhe.quantidadeEstoque <= 0 ? '#DC2626' : produtoDetalhe.quantidadeEstoque <= 5 ? '#D97706' : '#16a34a' }}>
                        {produtoDetalhe.quantidadeEstoque} un.
                        {produtoDetalhe.quantidadeEstoque <= 0 && ' ⚠ Esgotado'}
                        {produtoDetalhe.quantidadeEstoque > 0 && produtoDetalhe.quantidadeEstoque <= 5 && ' ⚠ Baixo'}
                      </div>
                    </div>
                  )}
                </div>

                {/* Subtotal no carrinho */}
                {qtdNoCart > 0 && (
                  <div style={{ background: '#EEF2FA', borderRadius: '10px', padding: '0.8rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1.5px solid #C7D4F0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <CheckCircle2 size={17} color="#1B2E5E" />
                      <span style={{ fontWeight: 600, color: '#1B2E5E', fontSize: '0.88rem' }}>
                        {qtdNoCart}× no carrinho
                      </span>
                    </div>
                    <span style={{ fontWeight: 800, color: '#1B2E5E', fontSize: '1rem' }}>
                      = R$ {(produtoDetalhe.preco * qtdNoCart).toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                )}

                {/* Descrição */}
                {produtoDetalhe.descricao && (
                  <div style={{ fontSize: '0.82rem', color: '#64748b', lineHeight: 1.5, padding: '0.5rem 0.75rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    {produtoDetalhe.descricao}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Área de aguarde */
            <div style={{ flex: 1, border: '2px dashed var(--color-border)', borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', color: 'var(--color-text-muted)', gap: '0.5rem', minHeight: '120px' }}>
              <Search size={28} style={{ opacity: 0.3 }} />
              <span style={{ fontSize: '0.875rem' }}>Digite o código e pressione Enter</span>
              <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>ou use o leitor de código de barras</span>
            </div>
          )}
        </div>

        {/* ── Direita: carrinho desktop ── */}
        <div className="pdv-right">
          <CarrinhoPanel />
        </div>
      </div>

      {/* ── Barra Fixa Mobile: Finalizar Compra ── */}
      <div
        className="pdv-cart-fab"
        style={{
          position: 'fixed', bottom: 'calc(62px + env(safe-area-inset-bottom))', left: '0.75rem', right: '0.75rem',
          background: '#1B2E5E', color: 'white', borderRadius: '16px',
          padding: '0.65rem 0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          zIndex: 90, boxShadow: '0 8px 25px rgba(27,46,94,0.4)', border: '1px solid rgba(255,255,255,0.12)',
        }}
      >
        <div onClick={() => setCarrinhoAberto(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', flex: 1, minWidth: 0 }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <ShoppingCart size={22} color="#93C5FD" />
            {qtdTotal > 0 && (
              <span style={{
                position: 'absolute', top: -6, right: -8,
                background: '#C8102E', color: 'white', borderRadius: '50%',
                width: '18px', height: '18px', display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: '0.7rem', fontWeight: 800
              }}>
                {qtdTotal}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <span style={{ fontSize: '0.68rem', color: '#93C5FD', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {qtdTotal} {qtdTotal === 1 ? 'item' : 'itens'} no carrinho
            </span>
            <span style={{ fontSize: '1.1rem', fontWeight: 900, color: 'white' }}>
              R$ {total.toFixed(2).replace('.', ',')}
            </span>
          </div>
        </div>

        <button
          onClick={() => {
            if (carrinho.length === 0) {
              alert('O carrinho está vazio!');
              return;
            }
            setCarrinhoAberto(true);
          }}
          style={{
            background: carrinho.length === 0 ? '#475569' : '#C8102E',
            color: 'white',
            border: 'none',
            borderRadius: '10px',
            padding: '0.6rem 1rem',
            fontWeight: 800,
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            cursor: 'pointer',
            flexShrink: 0,
            boxShadow: carrinho.length > 0 ? '0 4px 12px rgba(200,16,46,0.4)' : 'none',
            transition: 'all 0.2s',
            fontFamily: 'inherit',
          }}
        >
          Finalizar Compra
          <ChevronUp size={16} />
        </button>
      </div>

      {/* ── Drawer carrinho mobile ── */}
      {carrinhoAberto && (
        <div className="pdv-cart-drawer" style={{ position: 'fixed', inset: 0, zIndex: 200 }}>
          <div onClick={() => setCarrinhoAberto(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)' }} />
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, animation: 'slideUp 0.3s ease', maxHeight: '85vh', display: 'flex', flexDirection: 'column', borderRadius: '16px 16px 0 0', overflow: 'hidden' }}>
            <CarrinhoPanel modal />
          </div>
        </div>
      )}
    </>
  );
};

export default PDV;
