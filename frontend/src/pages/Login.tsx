import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, User, AlertCircle, Loader } from 'lucide-react';
import { getApiUrl } from '../utils/apiUrl';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${getApiUrl()}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('token', data.token);
        localStorage.setItem('username', data.username);
        if (data.permissoes) {
          localStorage.setItem('userPermissions', data.permissoes);
        }
        navigate('/');
      } else {
        const errData = await response.json().catch(() => ({}));
        setError(errData.error || 'Usuário ou senha incorretos.');
      }
    } catch {
      setError('Não foi possível conectar ao servidor.\nVerifique se o backend está rodando.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.85) 0%, rgba(27, 46, 94, 0.82) 100%), url("/background.png")',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      padding: '1.5rem',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Círculos decorativos */}
      <div style={{ position: 'absolute', top: '-80px', right: '-80px', width: '300px', height: '300px', borderRadius: '50%', background: 'rgba(200,16,46,0.1)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '-100px', left: '-100px', width: '400px', height: '400px', borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />

      <div style={{
        background: 'rgba(255,255,255,0.97)',
        backdropFilter: 'blur(20px)',
        borderRadius: '20px',
        padding: '2.5rem 2rem',
        width: '100%',
        maxWidth: '380px',
        boxShadow: '0 25px 60px rgba(0,0,0,0.35)',
        animation: 'fadeInUp 0.5s ease',
        position: 'relative',
        zIndex: 1,
      }}>
        <style>{`
          @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(24px); }
            to   { opacity: 1; transform: translateY(0); }
          }
          @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
          .login-input {
            width: 100%;
            padding: 0.75rem 0.85rem 0.75rem 2.85rem;
            border: 2px solid #E2E8F0;
            border-radius: 10px;
            font-size: 1rem;
            font-family: inherit;
            color: #1B2E5E;
            background: #F8FAFC;
            transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
            box-sizing: border-box;
            outline: none;
          }
          .login-input:focus {
            border-color: #1B2E5E;
            background: white;
            box-shadow: 0 0 0 3px rgba(27,46,94,0.1);
          }
          .login-btn {
            width: 100%;
            padding: 0.9rem;
            background: #1B2E5E;
            color: white;
            border: none;
            border-radius: 10px;
            font-size: 1rem;
            font-weight: 700;
            cursor: pointer;
            margin-top: 0.5rem;
            transition: background 0.2s, transform 0.15s, box-shadow 0.2s;
            font-family: inherit;
            box-shadow: 0 4px 14px rgba(27,46,94,0.3);
          }
          .login-btn:hover:not(:disabled) {
            background: #243A72;
            transform: translateY(-1px);
            box-shadow: 0 6px 20px rgba(27,46,94,0.4);
          }
          .login-btn:active:not(:disabled) { transform: scale(0.98); }
          .login-btn:disabled { opacity: 0.65; cursor: not-allowed; }
        `}</style>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <img
            src="/logo.png"
            alt="TT Store"
            style={{ width: '76px', height: '76px', borderRadius: '50%', objectFit: 'cover', boxShadow: '0 4px 16px rgba(27,46,94,0.2)', border: '3px solid #EEF2FA' }}
          />
          <h1 style={{ margin: '0.75rem 0 0.2rem', color: '#1B2E5E', fontSize: '1.4rem', fontWeight: 800 }}>
            TT Store
          </h1>
          <p style={{ margin: 0, color: '#64748B', fontSize: '0.83rem' }}>
            Área restrita — faça seu login
          </p>
        </div>

        {/* Erro */}
        {error && (
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: '0.5rem',
            background: '#FEF2F2', border: '1px solid #FECACA',
            borderLeft: '4px solid #C8102E',
            color: '#B91C1C', padding: '0.75rem 0.85rem',
            borderRadius: '10px', marginBottom: '1.25rem',
            fontSize: '0.85rem', lineHeight: 1.5,
            animation: 'fadeInUp 0.3s ease',
          }}>
            <AlertCircle size={17} style={{ flexShrink: 0, marginTop: '1px' }} />
            <span style={{ whiteSpace: 'pre-line' }}>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {/* Usuário */}
          <div style={{ position: 'relative' }}>
            <User size={17} style={{ position: 'absolute', top: '50%', left: '0.9rem', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
            <input
              type="text"
              className="login-input"
              placeholder="Nome de usuário"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
              autoComplete="username"
              autoFocus
            />
          </div>

          {/* Senha */}
          <div style={{ position: 'relative' }}>
            <Lock size={17} style={{ position: 'absolute', top: '50%', left: '0.9rem', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
            <input
              type="password"
              className="login-input"
              placeholder="Senha"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          <button type="submit" className="login-btn" disabled={loading}>
            {loading
              ? <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  <Loader size={17} style={{ animation: 'spin 0.8s linear infinite' }} /> Acessando...
                </span>
              : 'Entrar no Sistema'
            }
          </button>
        </form>

        {/* Dica de acesso padrão */}
        <div style={{
          marginTop: '1.5rem', padding: '0.75rem', background: '#F1F5F9',
          borderRadius: '10px', border: '1px solid #E2E8F0',
          fontSize: '0.76rem', color: '#64748B', textAlign: 'center', lineHeight: 1.6,
        }}>
          <strong style={{ color: '#1B2E5E' }}>Primeiro acesso?</strong><br />
          Usuário: <code style={{ background: '#E2E8F0', padding: '0.1rem 0.35rem', borderRadius: '4px' }}>admin</code>
          &nbsp;Senha: <code style={{ background: '#E2E8F0', padding: '0.1rem 0.35rem', borderRadius: '4px' }}>admin123</code>
        </div>
      </div>
    </div>
  );
};

export default Login;
