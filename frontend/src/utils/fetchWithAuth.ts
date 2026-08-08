export const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('token');
  const headers = { ...options.headers } as Record<string, string>;

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, { ...options, headers });

  if (response.status === 401) {
    // Token expirado ou inválido — desloga o usuário
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    window.location.reload();
  }
  // 403 (Sem permissão) não desloga, apenas retorna o erro normalmente

  return response;
};
