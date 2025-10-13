// Arquivo: /pages/config.js (VERSÃO FINAL PARA PRODUÇÃO)
// Este arquivo define a URL base para todas as chamadas de API no sistema.

// Quando o sistema está online, usamos a URL pública do servidor no Render.
const API_BASE_URL_PRODUCAO = 'https://sistema-igreja-web-server.onrender.com';

// Quando você está desenvolvendo no seu PC, pode usar o endereço local.
const API_BASE_URL_LOCAL = 'http://localhost:8080';

// O código abaixo decide automaticamente qual URL usar.
// Se o site estiver rodando em 'localhost', usa a URL local. Caso contrário, usa a de produção.
let API_BASE_URL;
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    API_BASE_URL = API_BASE_URL_LOCAL;
} else {
    API_BASE_URL = API_BASE_URL_PRODUCAO;
}


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
                if (isFormData) {
                    // Para FormData, o navegador define o Content-Type automaticamente com o boundary correto.
                    // Não definimos manualmente.
                    config.body = data;
                } else {
                    config.headers['Content-Type'] = 'application/json';
                    config.body = JSON.stringify(data);
                }
            }
            try {
                const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
                if (!response.ok) {
                    if (response.status === 401 && window.location.pathname !== '/login.html') {
                        localStorage.removeItem('userToken');
                        localStorage.removeItem('userInfo');
                        window.location.href = '/login.html'; // Redireciona apenas se não estiver já no login
                        return Promise.reject(new Error('Sessão expirada. Redirecionando para o login.'));
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
        // NOVA FUNÇÃO: Monta a URL correta para imagens
        getImageUrl(path) {
            if (!path) {
                return '';
            }
            if (path.startsWith('http')) {
                return path;
            }

            // Verifica se o ambiente é de produção (online)
            const isProduction = window.location.hostname !== 'localhost' &&
                                 window.location.hostname !== '127.0.0.1' &&
                                 window.location.protocol !== 'file:';

            if (isProduction) {
                // Em produção, o caminho relativo /uploads/... é suficiente
                return path;
            } else {
                // Em desenvolvimento (localhost, 127.0.0.1 ou file://), precisamos da URL completa do backend
                return `${API_BASE_URL}${path}`;
            }
        },
        async get(endpoint) { return this.request(endpoint); },
        async post(endpoint, data) { return this.request(endpoint, 'POST', data); },
        async put(endpoint, data) { return this.request(endpoint, 'PUT', data); },
        async delete(endpoint) { return this.request(endpoint, 'DELETE'); }
    };
}