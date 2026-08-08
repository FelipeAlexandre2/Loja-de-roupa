import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Search, Edit2, Trash2, X, Package } from 'lucide-react';
import { fetchWithAuth } from '../utils/fetchWithAuth';
import { canEdit } from '../App';

interface Produto {
  id?: number;
  nome: string;
  categoria: string;
  tamanho: string;
  preco: number;
  quantidadeEstoque: number;
  imagemUrl: string;
  codigoBarra?: string;
}

import { getApiUrl } from '../utils/apiUrl';

const getProdutosApi = () => `${getApiUrl()}/api/produtos`;
const getUploadApi = () => `${getApiUrl()}/api/arquivos/upload`;
const getBaseUrl = () => getApiUrl();
const BASE_URL = getApiUrl();

const Estoque: React.FC = () => {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [currentProduto, setCurrentProduto] = useState<Partial<Produto>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [savingError, setSavingError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const somenteLeitura = !canEdit('estoque');

  const fetchProdutos = async () => {
    try {
      setLoading(true);
      const response = await fetchWithAuth(getProdutosApi());
      if (response.ok) {
        const data = await response.json();
        setProdutos(Array.isArray(data) ? data : []);
      } else {
        setProdutos([]);
      }
    } catch (error) {
      console.error('Erro ao buscar produtos:', error);
      setProdutos([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProdutos();
  }, []);

  const handleOpenModal = (produto?: Produto) => {
    if (produto) {
      setCurrentProduto(produto);
    } else {
      setCurrentProduto({
        nome: '',
        categoria: '',
        tamanho: '',
        preco: 0,
        quantidadeEstoque: 0,
        imagemUrl: '',
        codigoBarra: ''
      });
    }
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setCurrentProduto({});
    setSavingError('');
  };

  const handleOpenViewModal = (produto: Produto) => {
    setCurrentProduto(produto);
    setViewModalOpen(true);
  };

  const handleCloseViewModal = () => {
    setViewModalOpen(false);
    setCurrentProduto({});
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setCurrentProduto(prev => ({
      ...prev,
      [name]: name === 'preco' || name === 'quantidadeEstoque' ? Number(value) : value
    }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const formData = new FormData();
      formData.append('file', file);
      
      try {
        const response = await fetchWithAuth(getUploadApi(), {
          method: 'POST',
          body: formData,
        });
        const imageUrl = await response.text(); // Assuming the backend returns the URL as plain text
        setCurrentProduto(prev => ({ ...prev, imagemUrl: imageUrl }));
      } catch (error) {
        console.error('Erro ao fazer upload da imagem:', error);
        alert('Erro ao fazer upload da imagem.');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingError('');
    setIsSaving(true);
    try {
      const method = currentProduto.id ? 'PUT' : 'POST';
      const url    = currentProduto.id ? `${getProdutosApi()}/${currentProduto.id}` : getProdutosApi();

      const res = await fetchWithAuth(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentProduto),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setSavingError(err.message || err.error || `Erro ${res.status}: não foi possível salvar.`);
        return;
      }

      await fetchProdutos();
      handleCloseModal();
    } catch (err: any) {
      console.error('Erro ao salvar produto:', err);
      setSavingError('Não foi possível conectar ao servidor. Verifique se o backend está rodando.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Tem certeza que deseja excluir este produto?')) {
      try {
        await fetchWithAuth(`${getProdutosApi()}/${id}`, { method: 'DELETE' });
        fetchProdutos();
      } catch (error) {
        console.error('Erro ao deletar produto:', error);
      }
    }
  };

  const filteredProdutos = (Array.isArray(produtos) ? produtos : []).filter(p => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return true;
    return (
      (p.nome && p.nome.toLowerCase().includes(q)) ||
      (p.categoria && p.categoria.toLowerCase().includes(q)) ||
      (p.codigoBarra && p.codigoBarra.toLowerCase().includes(q)) ||
      (p.tamanho && p.tamanho.toLowerCase().includes(q))
    );
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <h1 style={{ margin: 0, color: '#1B2E5E', fontSize: '1.4rem', fontWeight: 800 }}>Controle de Estoque</h1>
          {somenteLeitura && (
            <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: '6px', background: '#D1FAE5', color: '#065F46', border: '1px solid #6EE7B7' }}>
              👁️ Somente Visualização
            </span>
          )}
        </div>
        {!somenteLeitura && (
          <button className="btn btn-primary" onClick={() => handleOpenModal()}>
            <Plus size={18} /> Novo Produto
          </button>
        )}
      </div>

      <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        {/* ── Barra de busca ── */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
              <Search size={18} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Buscar por nome, código de barras ou categoria..."
                autoComplete="off"
                style={{
                  width: '100%',
                  padding: '0.65rem 2.5rem',
                  fontSize: '0.95rem',
                  border: '2px solid #E2E8F0',
                  borderRadius: '10px',
                  background: 'white',
                  color: '#1B2E5E',
                  fontFamily: 'inherit',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.2s',
                }}
                onFocus={e => e.target.style.borderColor = '#1B2E5E'}
                onBlur={e => e.target.style.borderColor = '#E2E8F0'}
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', display: 'flex', padding: 0 }}
                >
                  <X size={16} />
                </button>
              )}
            </div>
            <span style={{ fontSize: '0.8rem', color: '#64748B', flexShrink: 0 }}>
              {searchTerm
                ? <><strong style={{ color: '#1B2E5E' }}>{filteredProdutos.length}</strong> de {produtos.length} produtos</>
                : <><strong style={{ color: '#1B2E5E' }}>{produtos.length}</strong> produto{produtos.length !== 1 ? 's' : ''} no estoque</>
              }
            </span>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>
            Carregando produtos...
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '1.5rem' }}>
            {filteredProdutos.length > 0 ? (
              filteredProdutos.map(produto => (
                <div 
                  key={produto.id} 
                  onClick={() => handleOpenViewModal(produto)}
                  style={{ 
                    cursor: 'pointer', 
                    borderRadius: '8px', 
                    overflow: 'hidden', 
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                    transition: 'transform 0.2s',
                    backgroundColor: 'white',
                    border: '1px solid var(--color-border)',
                    height: '220px',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.03)'}
                  onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                  {produto.imagemUrl ? (
                    <img 
                      src={produto.imagemUrl.startsWith('http') ? produto.imagemUrl : `${getBaseUrl()}${produto.imagemUrl}`} 
                      alt={produto.nome} 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    />
                  ) : (
                    <div style={{ width: '100%', height: '100%', backgroundColor: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                      <span style={{ padding: '1rem', textAlign: 'center', fontWeight: 'bold' }}>{produto.nome}<br/><br/><span style={{fontWeight: 'normal', fontSize: '12px'}}>Sem Foto</span></span>
                    </div>
                  )}
                  {/* Etiqueta de quantidade se estiver zerado ou muito baixo */}
                  {produto.quantidadeEstoque <= 5 && (
                    <div style={{ position: 'absolute', top: '10px', right: '10px', backgroundColor: 'var(--color-red)', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
                      {produto.quantidadeEstoque === 0 ? 'SEM ESTOQUE' : `Restam ${produto.quantidadeEstoque}`}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>
                Nenhum produto encontrado.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal View Detalhes — renderizado via Portal para evitar clipping */}
      {viewModalOpen && createPortal(
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999,
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '450px', margin: '1rem', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            
            {/* Imagem Destaque */}
            <div style={{ position: 'relative', height: '350px', backgroundColor: '#f1f5f9' }}>
              {currentProduto.imagemUrl ? (
                <img 
                  src={currentProduto.imagemUrl.startsWith('http') ? currentProduto.imagemUrl : `${BASE_URL}${currentProduto.imagemUrl}`} 
                  alt={currentProduto.nome} 
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
                />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>Sem Foto</div>
              )}
              
              <button 
                onClick={handleCloseViewModal}
                style={{ position: 'absolute', top: '15px', right: '15px', background: 'white', border: 'none', cursor: 'pointer', padding: '8px', borderRadius: '50%', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
              >
                <X size={20} />
              </button>
            </div>
            
            {/* Informações */}
            <div style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                 <h2 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--color-navy)', wordBreak: 'break-word', flex: 1 }}>{currentProduto.nome}</h2>
                 <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--color-navy)', marginLeft: '1rem' }}>R$ {Number(currentProduto.preco || 0).toFixed(2).replace('.', ',')}</span>
              </div>
              
              <p style={{ color: 'var(--color-text-muted)', margin: '0 0 1.5rem 0', fontSize: '1rem' }}>
                {currentProduto.categoria || 'Sem categoria'} • {currentProduto.tamanho ? `Tamanho: ${currentProduto.tamanho}` : 'Tamanho Único'}
              </p>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Estoque Atual</span>
                  <span style={{ fontSize: '1.25rem', fontWeight: 'bold', color: (currentProduto.quantidadeEstoque || 0) > 5 ? '#2E7D32' : '#C62828' }}>
                    {currentProduto.quantidadeEstoque} unidades
                  </span>
                </div>
                
                {currentProduto.codigoBarra && (
                   <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'right' }}>
                      <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Cód. Barras</span>
                      <span style={{ fontSize: '1rem', fontWeight: '500' }}>{currentProduto.codigoBarra}</span>
                   </div>
                )}
              </div>

              {/* Ações */}
              {!somenteLeitura && (
                <div style={{ display: 'flex', gap: '1rem', marginTop: 'auto' }}>
                  <button 
                    className="btn btn-outline" 
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.75rem' }}
                    onClick={() => {
                      handleCloseViewModal();
                      handleOpenModal(currentProduto as Produto);
                    }}
                  >
                    <Edit2 size={18} /> Editar Produto
                  </button>
                  <button 
                    className="btn btn-outline" 
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.75rem', color: 'var(--color-red)', borderColor: 'var(--color-red)' }}
                    onClick={() => {
                      handleCloseViewModal();
                      handleDelete(currentProduto.id!);
                    }}
                  >
                    <Trash2 size={18} /> Apagar
                  </button>
                </div>
              )}
              {somenteLeitura && (
                <div style={{ padding: '0.75rem', background: '#f0fdf4', borderRadius: '8px', textAlign: 'center', fontSize: '0.8rem', color: '#065F46', fontWeight: 600, border: '1px solid #6EE7B7' }}>
                  👁️ Acesso somente leitura — editar produtos não é permitido para este perfil
                </div>
              )}
            </div>

          </div>
        </div>,
        document.body
      )}

      {/* Modal De Edição/Criação — renderizado via Portal */}
      {modalOpen && createPortal(
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999,
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '600px', margin: '1rem', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem' }}>{currentProduto.id ? 'Editar Produto' : 'Novo Produto'}</h2>
              <button 
                onClick={handleCloseModal}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}
              >
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} style={{ padding: '1.5rem' }}>
              
              <div className="grid grid-cols-1" style={{ gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}>Nome do Produto *</label>
                  <input required type="text" name="nome" value={currentProduto.nome || ''} onChange={handleChange} className="input" />
                </div>
                
                <div className="grid grid-cols-2" style={{ gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}>Categoria</label>
                    <input type="text" name="categoria" value={currentProduto.categoria || ''} onChange={handleChange} className="input" placeholder="Ex: Camiseta, Calça" />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}>Tamanhos</label>
                    <input type="text" name="tamanho" value={currentProduto.tamanho || ''} onChange={handleChange} className="input" placeholder="Ex: P, M, G, GG ou 38, 40" />
                  </div>
                </div>

                <div className="grid grid-cols-2" style={{ gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}>Preço (R$) *</label>
                    <input required type="number" step="0.01" min="0" name="preco" value={currentProduto.preco || ''} onChange={handleChange} className="input" />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}>Qtd. Estoque *</label>
                    <input required type="number" min="0" name="quantidadeEstoque" value={currentProduto.quantidadeEstoque || ''} onChange={handleChange} className="input" />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}>Código de Barras</label>
                  <input type="text" name="codigoBarra" value={currentProduto.codigoBarra || ''} onChange={handleChange} className="input" placeholder="Opcional" />
                </div>
                
                <div className="grid grid-cols-1" style={{ gap: '0.5rem' }}>
                  <label style={{ display: 'block', fontWeight: 500, fontSize: '0.875rem' }}>Foto do Produto</label>
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="input" style={{ paddingTop: '0.375rem' }} />
                  {currentProduto.imagemUrl && (
                    <div style={{ marginTop: '0.5rem' }}>
                      <img src={currentProduto.imagemUrl.startsWith('http') ? currentProduto.imagemUrl : `${BASE_URL}${currentProduto.imagemUrl}`} alt="Preview" style={{ maxHeight: '100px', borderRadius: '4px' }} />
                    </div>
                  )}
                </div>
              </div>

              {/* Erro visível */}
              {savingError && (
                <div style={{
                  background: '#FEF2F2', border: '1px solid #FECACA', borderLeft: '4px solid #C8102E',
                  borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '1rem',
                  color: '#B91C1C', fontSize: '0.85rem', lineHeight: 1.5,
                }}>
                  ❌ {savingError}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--color-border)' }}>
                <button type="button" className="btn btn-outline" onClick={handleCloseModal} disabled={isSaving}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={isSaving}
                  style={{ opacity: isSaving ? 0.7 : 1 }}>
                  {isSaving ? '⏳ Salvando...' : 'Salvar Produto'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default Estoque;
