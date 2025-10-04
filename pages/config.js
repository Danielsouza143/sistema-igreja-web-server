// Arquivo: /pages/config.js (VERSÃO FINAL PARA PRODUÇÃO)
// Este arquivo define a URL base para todas as chamadas de API no sistema.

// Quando o sistema está online, usamos a URL pública do servidor no Render.
const API_BASE_URL_PRODUCAO = 'https://sistema-igreja-web-server.onrender.com/';

// Quando você está desenvolvendo no seu PC, pode usar o endereço local.
const API_BASE_URL_LOCAL = 'http://localhost:3000';

// O código abaixo decide qual URL usar. Se o site está em 'localhost', usa a local.
// Se está online (no Render, Netlify, etc.), usa a de produção.
const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const API_BASE_URL = isLocal ? API_BASE_URL_LOCAL : API_BASE_URL_PRODUCAO;


// O objeto 'api' continua o mesmo, ele vai usar a variável API_BASE_URL correta.
if (typeof window.api === 'undefined') {
    window.api = {
        async request(endpoint, method = 'GET', data = null) {
            const isFormData = data instanceof FormData;
            const config = {
                method,
                headers: {
                    'Authorization': localStorage.getItem('userToken') ? `Bearer ${localStorage.getItem('userToken')}` : ''
                }
            };
            if (data) {
                if (!isFormData) {
                    config.headers['Content-Type'] = 'application/json';
                    config.body = JSON.stringify(data);
                } else {
                    config.body = data;
                }
            }
            try {
                const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
                if (!response.ok) {
                    if (response.status === 401) {
                        localStorage.removeItem('userToken');
                        localStorage.removeItem('userInfo'); // Limpa também os dados do usuário
                        window.location.href = '/index.html';
                    }
                    const errorData = await response.json().catch(() => ({ message: 'Erro de comunicação com o servidor.' }));
                    throw new Error(errorData.message || `Erro na requisição: ${response.status}`);
                }
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    return response.json();
                }
                return response;
            } catch (error) {
                // Captura erros de rede (ex: servidor offline) e re-lança com uma mensagem mais clara.
                if (error instanceof TypeError) { // TypeError é comum para falhas de fetch
                    throw new Error('Não foi possível conectar ao servidor. Verifique sua conexão com a internet.');
                }
                throw error; // Re-lança outros erros (como os que já tratamos acima)
            }
        },
        async get(endpoint) { return this.request(endpoint); },
        async post(endpoint, data) { return this.request(endpoint, 'POST', data); },
        async put(endpoint, data) { return this.request(endpoint, 'PUT', data); },
        async delete(endpoint) { return this.request(endpoint, 'DELETE'); }
    };
}