import React, { useState, useEffect } from 'react';
import { fetchWithAuth } from '../utils/fetchWithAuth';
import { getApiUrl } from '../utils/apiUrl';
import { canEdit } from '../App';
import { Wallet, ShoppingCart, Scissors, ArrowDownCircle, ArrowUpCircle, BookOpen } from 'lucide-react';

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
    jacson?: { quantidade: number; total: number };
    mizael?: { quantidade: number; total: number };
}

interface ResumoMovimentacao {
    data?: string;
    totalSangria?: number;
    totalSuprimento?: number;
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

    // Modal State
    const [showModal, setShowModal]             = useState(false);
    const [tipoMov, setTipoMov]                 = useState<'SANGRIA' | 'SUPRIMENTO'>('SANGRIA');
    const [valorMov, setValorMov]               = useState('');
    const [descMov, setDescMov]                 = useState('');
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
            setError('Falha de conexão. O servidor pode estar reiniciando ou indisponível.');
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
        if (!valorMov || isNaN(Number(valorMov.replace(',', '.')))) {
            alert('Por favor, insira um valor numérico válido.');
            return;
        }

        try {
            setSubmitting(true);
            const res = await fetchWithAuth(`${getApiUrl()}/api/caixamovimento`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tipo: tipoMov,
                    valor: Number(valorMov.replace(',', '.')),
                    descricao: descMov
                })
            });

            if (!res.ok) throw new Error('Erro ao salvar movimentação');

            setShowModal(false);
            setValorMov('');
            setDescMov('');
            fetchResumos(); // recarrega o caixa
        } catch (err: any) {
            alert(err.message || 'Erro ao registrar movimentação.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div style={{ padding: '2rem', textAlign: 'center', color: '#64748B' }}>Carregando dados do caixa...</div>;
    if (error) return <div style={{ padding: '2rem', textAlign: 'center', color: '#DC2626' }}>{error}</div>;

    const totalVendas = resumoVendas?.totalArrecadado || 0;
    const totalBarbearia = resumoBarbearia?.totalArrecadado || 0;
    const totalSuprimento = resumoMov?.totalSuprimento || 0;
    const totalSangria = resumoMov?.totalSangria || 0;
    const totalPagamentosFiado = resumoFiado?.totalPagamentosHoje || 0;

    const saldoEstimado = totalVendas + totalBarbearia + totalSuprimento + totalPagamentosFiado - totalSangria;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', animation: 'fadeInUp 0.3s ease-out' }}>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1B2E5E', margin: 0, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Wallet color="#1B2E5E" size={26} /> Controle de Caixa Diário
            </h1>

            {/* Saldo Final Estimado */}
            <div style={{ background: 'linear-gradient(135deg, #1B2E5E 0%, #243A72 100%)', color: 'white', padding: '1.75rem', borderRadius: '16px', boxShadow: '0 8px 24px rgba(27,46,94,0.18)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <span style={{ fontSize: '0.82rem', opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Saldo Atual em Caixa (Estimado)</span>
                    <h2 style={{ fontSize: '2.4rem', fontWeight: 900, margin: '0.3rem 0 0 0' }}>
                        R$ {saldoEstimado.toFixed(2).replace('.', ',')}
                    </h2>
                </div>
                <div style={{ display: 'flex', gap: '0.6rem' }}>
                    <button 
                        onClick={() => { setTipoMov('SUPRIMENTO'); setShowModal(true); }}
                        style={{ padding: '0.65rem 1rem', background: '#16A34A', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
                    >
                        <ArrowUpCircle size={16} /> Reforço (Suprimento)
                    </button>
                    <button 
                        onClick={() => { setTipoMov('SANGRIA'); setShowModal(true); }}
                        style={{ padding: '0.65rem 1rem', background: '#C8102E', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
                    >
                        <ArrowDownCircle size={16} /> Retirada (Sangria)
                    </button>
                </div>
            </div>

            {/* Cards de Resumo */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                <div style={{ background: 'white', padding: '1.25rem', borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748B', fontSize: '0.82rem', fontWeight: 700 }}>
                        <ShoppingCart size={16} color="#1B2E5E" /> Vendas PDV (Loja)
                    </div>
                    <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#1B2E5E', marginTop: '0.5rem' }}>
                        R$ {totalVendas.toFixed(2).replace('.', ',')}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: '0.2rem' }}>
                        {resumoVendas?.quantidadeVendas || 0} vendas realizadas
                    </div>
                </div>

                <div style={{ background: 'white', padding: '1.25rem', borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748B', fontSize: '0.82rem', fontWeight: 700 }}>
                        <Scissors size={16} color="#C8102E" /> Barbearia
                    </div>
                    <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#C8102E', marginTop: '0.5rem' }}>
                        R$ {totalBarbearia.toFixed(2).replace('.', ',')}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: '0.2rem' }}>
                        {resumoBarbearia?.totalCortes || 0} cortes no total
                    </div>
                </div>

                <div style={{ background: 'white', padding: '1.25rem', borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748B', fontSize: '0.82rem', fontWeight: 700 }}>
                        <BookOpen size={16} color="#2563EB" /> Pagamentos Fiado
                    </div>
                    <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#2563EB', marginTop: '0.5rem' }}>
                        R$ {totalPagamentosFiado.toFixed(2).replace('.', ',')}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: '0.2rem' }}>
                        {resumoFiado?.qtdPagamentos || 0} recebimentos hoje
                    </div>
                </div>

                <div style={{ background: 'white', padding: '1.25rem', borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748B', fontSize: '0.82rem', fontWeight: 700 }}>
                        <ArrowUpCircle size={16} color="#16A34A" /> Suprimentos
                    </div>
                    <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#16A34A', marginTop: '0.5rem' }}>
                        + R$ {totalSuprimento.toFixed(2).replace('.', ',')}
                    </div>
                </div>

                <div style={{ background: 'white', padding: '1.25rem', borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748B', fontSize: '0.82rem', fontWeight: 700 }}>
                        <ArrowDownCircle size={16} color="#DC2626" /> Sangrias
                    </div>
                    <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#DC2626', marginTop: '0.5rem' }}>
                        - R$ {totalSangria.toFixed(2).replace('.', ',')}
                    </div>
                </div>
            </div>

            {/* Modal Sangria/Suprimento */}
            {showModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
                    <div style={{ background: 'white', padding: '1.5rem', borderRadius: '14px', width: '100%', maxWidth: '400px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
                        <h3 style={{ margin: '0 0 1rem 0', color: '#1B2E5E', fontSize: '1.1rem', fontWeight: 800 }}>
                            {tipoMov === 'SANGRIA' ? '🔴 Nova Sangria (Retirada)' : '🟢 Novo Suprimento (Entrada)'}
                        </h3>

                        <form onSubmit={handleSalvarMovimentacao} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#64748B', marginBottom: '0.3rem' }}>Valor (R$)</label>
                                <input 
                                    type="text" 
                                    value={valorMov} 
                                    onChange={e => setValorMov(e.target.value)} 
                                    placeholder="0,00" 
                                    required 
                                    style={{ width: '100%', padding: '0.6rem', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '1rem', outline: 'none', boxSizing: 'border-box' }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#64748B', marginBottom: '0.3rem' }}>Descrição / Motivo</label>
                                <input 
                                    type="text" 
                                    value={descMov} 
                                    onChange={e => setDescMov(e.target.value)} 
                                    placeholder="ex: Troco inicial ou Pagamento de conta" 
                                    style={{ width: '100%', padding: '0.6rem', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                                <button 
                                    type="button" 
                                    onClick={() => setShowModal(false)}
                                    style={{ flex: 1, padding: '0.65rem', background: '#F1F5F9', color: '#64748B', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
                                >
                                    Cancelar
                                </button>
                                <button 
                                    type="submit" 
                                    disabled={submitting}
                                    style={{ flex: 1, padding: '0.65rem', background: tipoMov === 'SANGRIA' ? '#C8102E' : '#16A34A', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
                                >
                                    {submitting ? 'Salvando...' : 'Confirmar'}
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
                    <h2>Erro Crítico no Caixa</h2>
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
