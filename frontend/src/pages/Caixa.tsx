import React, { useState, useEffect } from 'react';
import { fetchWithAuth } from '../utils/fetchWithAuth';
import { getApiUrl } from '../utils/apiUrl';
import { canEdit } from '../App';
import { Wallet, ShoppingCart, Scissors, ArrowDownCircle, ArrowUpCircle, BookOpen, Lock, Unlock, CheckCircle2, AlertTriangle, Printer, RefreshCw, DollarSign, X } from 'lucide-react';

interface ResumoVendas {
    data?: string;
    quantidadeVendas?: number;
    totalArrecadado?: number;
    totalItensVendidos?: number;
}

interface ResumoBarbearia {
    data?: string;
    totalCortes?: number;
    totalArrecadado?: number;
}

interface ResumoMovimentacao {
    data?: string;
    totalSangria?: number;
    totalSuprimento?: number;
    totalRetirada?: number;
    totalTroco?: number;
    valorAbertura?: number;
    valorFechamento?: number;
    diferencaFechamento?: number;
    statusCaixa?: 'ABERTO' | 'FECHADO';
    dataHoraAbertura?: string;
    dataHoraFechamento?: string;
    movimentacoes?: MovimentacaoItem[];
}

interface MovimentacaoItem {
    id: number;
    tipo: 'ABERTURA' | 'FECHAMENTO' | 'TROCO' | 'RETIRADA' | 'SUPRIMENTO' | 'SANGRIA';
    valor: number;
    valorContado?: number;
    diferenca?: number;
    descricao?: string;
    dataHora?: string;
}

interface ResumoFiado {
    data?: string;
    totalPagamentosHoje?: number;
    totalFiadosHoje?: number;
    qtdPagamentos?: number;
    qtdFiados?: number;
}

const CaixaContent: React.FC = () => {
    const somenteLeitura = !canEdit('caixa');
    const [resumoVendas, setResumoVendas]       = useState<ResumoVendas | null>(null);
    const [resumoBarbearia, setResumoBarbearia] = useState<ResumoBarbearia | null>(null);
    const [resumoMov, setResumoMov]             = useState<ResumoMovimentacao | null>(null);
    const [resumoFiado, setResumoFiado]         = useState<ResumoFiado | null>(null);
    const [loading, setLoading]                 = useState<boolean>(true);
    const [error, setError]                     = useState<string | null>(null);

    // Modais
    const [modalTipo, setModalTipo]             = useState<'ABERTURA' | 'FECHAMENTO' | 'TROCO' | 'RETIRADA' | null>(null);
    const [valorInput, setValorInput]           = useState('');
    const [valorContadoInput, setValorContadoInput] = useState('');
    const [descInput, setDescInput]             = useState('');
    const [submitting, setSubmitting]           = useState(false);

    useEffect(() => {
        fetchResumos();
    }, []);

    const fetchResumos = async () => {
        try {
            setLoading(true);
            setError(null);
            const hoje = new Date().toISOString().split('T')[0];

            const [vendasRes, barbeariaRes, movRes, fiadoRes] = await Promise.all([
                fetchWithAuth(`${getApiUrl()}/api/vendas/resumo?data=${hoje}`),
                fetchWithAuth(`${getApiUrl()}/api/barbearia/resumo?data=${hoje}`),
                fetchWithAuth(`${getApiUrl()}/api/caixamovimento/resumo?data=${hoje}`),
                fetchWithAuth(`${getApiUrl()}/api/fiado/resumo?data=${hoje}`)
            ]);

            if (!vendasRes.ok || !barbeariaRes.ok || !movRes.ok) {
                throw new Error('Falha ao carregar resumos do caixa');
            }

            const vendasData    = await vendasRes.json();
            const barbeariaData = await barbeariaRes.json();
            const movData       = await movRes.json();
            const fiadoData     = fiadoRes.ok ? await fiadoRes.json() : {};

            setResumoVendas(vendasData);
            setResumoBarbearia(barbeariaData);
            setResumoMov(movData);
            setResumoFiado(fiadoData);
        } catch (err: any) {
            console.error('Erro Caixa:', err);
            setError('Falha de conexão ao carregar dados do caixa.');
        } finally {
            setLoading(false);
        }
    };

    const handleSalvarMovimentacao = async (e: React.FormEvent) => {
        e.preventDefault();
        if (somenteLeitura) {
            alert('Acesso Restrito: Seu usuário tem permissão apenas para visualizar o Caixa.');
            return;
        }

        if (!modalTipo) return;

        const valNum = parseFloat(valorInput.replace(',', '.')) || 0;
        const valContadoNum = parseFloat(valorContadoInput.replace(',', '.')) || 0;

        if (modalTipo !== 'FECHAMENTO' && valNum <= 0) {
            alert('Por favor, insira um valor válido maior que zero.');
            return;
        }

        try {
            setSubmitting(true);

            let bodyPayload: any = {
                tipo: modalTipo,
                valor: valNum,
                descricao: descInput
            };

            if (modalTipo === 'FECHAMENTO') {
                const diff = valContadoNum - saldoEstimado;
                bodyPayload = {
                    tipo: 'FECHAMENTO',
                    valor: saldoEstimado,
                    valorContado: valContadoNum,
                    diferenca: diff,
                    descricao: descInput || `Fechamento de caixa. Esperado: R$ ${saldoEstimado.toFixed(2)} | Contado: R$ ${valContadoNum.toFixed(2)}`
                };
            }

            const res = await fetchWithAuth(`${getApiUrl()}/api/caixamovimento`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bodyPayload)
            });

            if (!res.ok) throw new Error('Erro ao salvar movimentação de caixa');

            if (modalTipo === 'FECHAMENTO') {
                imprimirComprovanteFechamento(valContadoNum, saldoEstimado, valContadoNum - saldoEstimado);
            }

            setModalTipo(null);
            setValorInput('');
            setValorContadoInput('');
            setDescInput('');
            fetchResumos();
        } catch (err: any) {
            alert(err.message || 'Erro ao registrar movimentação no caixa.');
        } finally {
            setSubmitting(false);
        }
    };

    const imprimirComprovanteFechamento = (valContado: number, esperado: number, diferenca: number) => {
        const win = window.open('', '_blank');
        if (!win) return;
        const dataHoje = new Date().toLocaleDateString('pt-BR');
        const horaHoje = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        const operador = localStorage.getItem('username') || 'Operador';

        const html = `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8" />
              <title>Fechamento de Caixa - TT Store</title>
              <style>
                @page { size: auto; margin: 0; }
                body { font-family: 'Courier New', Courier, monospace; width: 270px; margin: 0 auto; padding: 10px; font-size: 11px; color: #000; }
                .text-center { text-align: center; }
                .line { border-top: 1px dashed #000; margin: 5px 0; }
                .title { font-size: 14px; font-weight: bold; }
                .item-row { display: flex; justify-content: space-between; margin-bottom: 3px; }
                .bold { font-weight: bold; }
              </style>
            </head>
            <body>
              <div class="text-center">
                <div class="title">TT STORE & BARBEARIA</div>
                <div>COMPROVANTE DE FECHAMENTO</div>
                <div>Data: ${dataHoje} - ${horaHoje}</div>
                <div>Operador: ${operador}</div>
              </div>

              <div class="line"></div>

              <div class="item-row">
                <span>Fundo de Troco Inicial:</span>
                <span>R$ ${valorAbertura.toFixed(2).replace('.', ',')}</span>
              </div>
              <div class="item-row">
                <span>(+) Entradas de Troco:</span>
                <span>R$ ${totalTroco.toFixed(2).replace('.', ',')}</span>
              </div>
              <div class="item-row">
                <span>(+) Vendas PDV (Loja):</span>
                <span>R$ ${totalVendas.toFixed(2).replace('.', ',')}</span>
              </div>
              <div class="item-row">
                <span>(+) Barbearia:</span>
                <span>R$ ${totalBarbearia.toFixed(2).replace('.', ',')}</span>
              </div>
              <div class="item-row">
                <span>(+) Pagamentos Fiado:</span>
                <span>R$ ${totalPagamentosFiado.toFixed(2).replace('.', ',')}</span>
              </div>
              <div class="item-row">
                <span>(-) Retiradas:</span>
                <span>- R$ ${totalRetiradas.toFixed(2).replace('.', ',')}</span>
              </div>

              <div class="line"></div>

              <div class="item-row bold">
                <span>SALDO ESPERADO:</span>
                <span>R$ ${esperado.toFixed(2).replace('.', ',')}</span>
              </div>
              <div class="item-row bold">
                <span>VALOR CONTADO:</span>
                <span>R$ ${valContado.toFixed(2).replace('.', ',')}</span>
              </div>
              <div class="item-row bold" style="color: ${diferenca < 0 ? 'red' : 'black'};">
                <span>DIFERENÇA:</span>
                <span>R$ ${diferenca.toFixed(2).replace('.', ',')}</span>
              </div>

              <div class="line"></div>

              <div style="margin-top: 25px; text-align: center;">
                <div>_______________________________</div>
                <div style="font-size: 10px; margin-top: 3px;">Assinatura do Responsável</div>
              </div>
            </body>
            </html>
        `;
        win.document.write(html);
        win.document.close();
        win.print();
    };

    if (loading) return <div style={{ padding: '2rem', textAlign: 'center', color: '#64748B' }}>Carregando dados do caixa...</div>;
    if (error) return <div style={{ padding: '2rem', textAlign: 'center', color: '#DC2626' }}>{error}</div>;

    const totalVendas = resumoVendas?.totalArrecadado || 0;
    const totalBarbearia = resumoBarbearia?.totalArrecadado || 0;
    const totalTroco = resumoMov?.totalTroco || resumoMov?.totalSuprimento || 0;
    const totalRetiradas = resumoMov?.totalRetirada || resumoMov?.totalSangria || 0;
    const totalPagamentosFiado = resumoFiado?.totalPagamentosHoje || 0;
    const valorAbertura = resumoMov?.valorAbertura || 0;

    const caixaAberto = resumoMov?.statusCaixa === 'ABERTO';

    const saldoEstimado = totalVendas + totalBarbearia + totalTroco + totalPagamentosFiado - totalRetiradas;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', animation: 'fadeInUp 0.3s ease-out' }}>
            
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#FFFFFF', margin: 0, display: 'flex', alignItems: 'center', gap: '0.6rem', textShadow: '0 2px 8px rgba(0,0,0,0.6)' }}>
                    <Wallet color="#38BDF8" size={28} /> Controle e Gestão de Caixa
                </h1>

                {/* Badge Status do Caixa */}
                <div style={{
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                    padding: '0.5rem 1rem', borderRadius: '20px',
                    background: caixaAberto ? '#166534' : '#991B1B',
                    color: '#FFFFFF',
                    fontWeight: 800, fontSize: '0.85rem',
                    border: `1.5px solid ${caixaAberto ? '#4ADE80' : '#F87171'}`,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                }}>
                    {caixaAberto ? <Unlock size={16} /> : <Lock size={16} />}
                    <span>{caixaAberto ? 'CAIXA ABERTO' : 'CAIXA FECHADO'}</span>
                </div>
            </div>

            {/* Saldo Final Estimado + Ações de Caixa (card-dark para alto contraste) */}
            <div className="card-dark" style={{ padding: '1.75rem', borderRadius: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.25rem' }}>
                <div>
                    <span style={{ fontSize: '0.85rem', color: '#93C5FD', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 800 }}>
                        Saldo Atual em Dinheiro (Estimado)
                    </span>
                    <h2 style={{ fontSize: '2.8rem', fontWeight: 900, margin: '0.2rem 0 0 0', color: '#FFFFFF', textShadow: '0 2px 10px rgba(0,0,0,0.4)', letterSpacing: '-0.5px' }}>
                        R$ {saldoEstimado.toFixed(2).replace('.', ',')}
                    </h2>
                    {valorAbertura > 0 && (
                        <div style={{ fontSize: '0.82rem', color: '#6EE7B7', marginTop: '0.4rem', fontWeight: 700 }}>
                            🔓 Fundo de troco inicial: R$ {valorAbertura.toFixed(2).replace('.', ',')}
                        </div>
                    )}
                </div>

                {/* Botões Principais */}
                <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
                    {!caixaAberto ? (
                        <button 
                            onClick={() => { setModalTipo('ABERTURA'); setValorInput('100,00'); setDescInput('Fundo de troco inicial'); }}
                            style={{ padding: '0.75rem 1.25rem', background: '#16A34A', color: '#FFFFFF', border: 'none', borderRadius: '10px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', boxShadow: '0 4px 14px rgba(22,163,74,0.5)' }}
                        >
                            <Unlock size={18} /> Abrir Caixa
                        </button>
                    ) : (
                        <button 
                            onClick={() => { setModalTipo('FECHAMENTO'); setValorContadoInput(saldoEstimado.toFixed(2).replace('.', ',')); setDescInput(''); }}
                            style={{ padding: '0.75rem 1.25rem', background: '#C8102E', color: '#FFFFFF', border: 'none', borderRadius: '10px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', boxShadow: '0 4px 14px rgba(200,16,46,0.5)' }}
                        >
                            <Lock size={18} /> Fechar Caixa
                        </button>
                    )}

                    <button 
                        onClick={() => { setModalTipo('TROCO'); setValorInput(''); setDescInput(''); }}
                        style={{ padding: '0.75rem 1.1rem', background: '#2563EB', color: '#FFFFFF', border: 'none', borderRadius: '10px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.88rem', boxShadow: '0 4px 14px rgba(37,99,235,0.4)' }}
                    >
                        <ArrowUpCircle size={17} /> + Troco
                    </button>
                    
                    <button 
                        onClick={() => { setModalTipo('RETIRADA'); setValorInput(''); setDescInput(''); }}
                        style={{ padding: '0.75rem 1.1rem', background: '#DC2626', color: '#FFFFFF', border: 'none', borderRadius: '10px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.88rem', boxShadow: '0 4px 14px rgba(220,38,38,0.4)' }}
                    >
                        <ArrowDownCircle size={17} /> - Retirada
                    </button>
                </div>
            </div>

            {/* Cards de Resumo */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748B', fontSize: '0.8rem', fontWeight: 700 }}>
                        <ShoppingCart size={16} color="#1B2E5E" /> Vendas PDV (Loja)
                    </div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1B2E5E' }}>
                        R$ {totalVendas.toFixed(2).replace('.', ',')}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>
                        {resumoVendas?.quantidadeVendas || 0} vendas hoje
                    </div>
                </div>

                <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748B', fontSize: '0.8rem', fontWeight: 700 }}>
                        <Scissors size={16} color="#C8102E" /> Barbearia
                    </div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#C8102E' }}>
                        R$ {totalBarbearia.toFixed(2).replace('.', ',')}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>
                        {resumoBarbearia?.totalCortes || 0} cortes hoje
                    </div>
                </div>

                <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748B', fontSize: '0.8rem', fontWeight: 700 }}>
                        <BookOpen size={16} color="#2563EB" /> Pagamentos Fiado
                    </div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#2563EB' }}>
                        R$ {totalPagamentosFiado.toFixed(2).replace('.', ',')}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>
                        {resumoFiado?.qtdPagamentos || 0} recebimentos hoje
                    </div>
                </div>

                <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#16A34A', fontSize: '0.8rem', fontWeight: 700 }}>
                        <ArrowUpCircle size={16} /> Entradas de Troco
                    </div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#16A34A' }}>
                        + R$ {totalTroco.toFixed(2).replace('.', ',')}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>
                        Entradas de troco/fundo
                    </div>
                </div>

                <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#DC2626', fontSize: '0.8rem', fontWeight: 700 }}>
                        <ArrowDownCircle size={16} /> Retiradas de Caixa
                    </div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#DC2626' }}>
                        - R$ {totalRetiradas.toFixed(2).replace('.', ',')}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>
                        Retiradas realizadas
                    </div>
                </div>
            </div>

            {/* Modais */}
            {modalTipo && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
                    <div className="card" style={{ padding: '1.5rem', borderRadius: '16px', width: '100%', maxWidth: '440px', boxShadow: '0 20px 50px rgba(0,0,0,0.3)', background: 'white' }}>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #E2E8F0', paddingBottom: '0.75rem' }}>
                            <h3 style={{ margin: 0, color: '#1B2E5E', fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                {modalTipo === 'ABERTURA' && <>🔓 Abertura de Caixa (Fundo de Troco)</>}
                                {modalTipo === 'FECHAMENTO' && <>🔒 Fechamento de Caixa</>}
                                {modalTipo === 'TROCO' && <>🟢 Adicionar Fundo de Troco</>}
                                {modalTipo === 'RETIRADA' && <>🔴 Realizar Retirada de Caixa</>}
                            </h3>
                            <button onClick={() => setModalTipo(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}>
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSalvarMovimentacao} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            
                            {modalTipo === 'FECHAMENTO' ? (
                                <>
                                    <div style={{ background: '#F8FAFC', padding: '0.85rem', borderRadius: '10px', border: '1px solid #E2E8F0', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span>Saldo Esperado em Caixa:</span>
                                            <span style={{ fontWeight: 800, color: '#1B2E5E' }}>R$ {saldoEstimado.toFixed(2).replace('.', ',')}</span>
                                        </div>
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#1B2E5E', marginBottom: '0.3rem' }}>
                                            Valor Contado no Gaveteiro (R$)
                                        </label>
                                        <input 
                                            type="text" 
                                            autoFocus
                                            value={valorContadoInput} 
                                            onChange={e => setValorContadoInput(e.target.value)} 
                                            placeholder="0,00" 
                                            required 
                                            style={{ width: '100%', padding: '0.65rem', border: '2px solid #1B2E5E', borderRadius: '8px', fontSize: '1.2rem', fontWeight: 800, outline: 'none', boxSizing: 'border-box' }}
                                        />
                                    </div>

                                    {/* Resumo da Diferença */}
                                    {valorContadoInput && (
                                        <div style={{
                                            padding: '0.75rem', borderRadius: '8px', fontWeight: 700, fontSize: '0.85rem',
                                            background: (parseFloat(valorContadoInput.replace(',', '.')) - saldoEstimado) >= 0 ? '#DCFCE7' : '#FEE2E2',
                                            color: (parseFloat(valorContadoInput.replace(',', '.')) - saldoEstimado) >= 0 ? '#15803D' : '#991B1B',
                                            display: 'flex', justifyContent: 'space-between'
                                        }}>
                                            <span>Diferença (Sobras/Faltas):</span>
                                            <span>R$ {(parseFloat(valorContadoInput.replace(',', '.')) - saldoEstimado).toFixed(2).replace('.', ',')}</span>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#64748B', marginBottom: '0.3rem' }}>
                                        {modalTipo === 'ABERTURA' ? 'Valor Inicial de Troco (R$)' : 'Valor (R$)'}
                                    </label>
                                    <input 
                                        type="text" 
                                        autoFocus
                                        value={valorInput} 
                                        onChange={e => setValorInput(e.target.value)} 
                                        placeholder="0,00" 
                                        required 
                                        style={{ width: '100%', padding: '0.65rem', border: '1.5px solid #CBD5E1', borderRadius: '8px', fontSize: '1.1rem', fontWeight: 700, outline: 'none', boxSizing: 'border-box' }}
                                    />
                                </div>
                            )}

                            <div>
                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#64748B', marginBottom: '0.3rem' }}>
                                    Descrição / Observação (Opcional)
                                </label>
                                <input 
                                    type="text" 
                                    value={descInput} 
                                    onChange={e => setDescInput(e.target.value)} 
                                    placeholder={modalTipo === 'ABERTURA' ? 'ex: Fundo de troco inicial do turno' : modalTipo === 'RETIRADA' ? 'ex: Retirada para pagamento' : 'ex: Observações'} 
                                    style={{ width: '100%', padding: '0.6rem', border: '1.5px solid #CBD5E1', borderRadius: '8px', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.5rem' }}>
                                <button 
                                    type="button" 
                                    onClick={() => setModalTipo(null)}
                                    style={{ flex: 1, padding: '0.7rem', background: '#F1F5F9', color: '#64748B', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
                                >
                                    Cancelar
                                </button>
                                <button 
                                    type="submit" 
                                    disabled={submitting}
                                    style={{
                                        flex: 1.2, padding: '0.7rem',
                                        background: modalTipo === 'RETIRADA' || modalTipo === 'FECHAMENTO' ? '#C8102E' : '#16A34A',
                                        color: 'white', border: 'none', borderRadius: '8px', fontWeight: 800, cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem'
                                    }}
                                >
                                    {submitting ? 'Salvando...' : modalTipo === 'FECHAMENTO' ? 'Concluir Fechamento' : 'Confirmar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; errorMsg: string }> {
    constructor(props: { children: React.ReactNode }) {
        super(props);
        this.state = { hasError: false, errorMsg: '' };
    }

    static getDerivedStateFromError(error: any) {
        return { hasError: true, errorMsg: error?.message || 'Erro desconhecido' };
    }

    componentDidCatch(error: any, errorInfo: any) {
        console.error("Erro capturado no ErrorBoundary do Caixa:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: '2rem', color: 'red' }}>
                    <h2>Erro Crítico no Controle de Caixa</h2>
                    <p>Detalhes: {this.state.errorMsg}</p>
                </div>
            );
        }
        return this.props.children;
    }
}

const Caixa: React.FC = () => (
    <ErrorBoundary>
        <CaixaContent />
    </ErrorBoundary>
);

export default Caixa;
