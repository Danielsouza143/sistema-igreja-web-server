// Arquivo: /pages/config.js
// Este arquivo define a URL base para todas as chamadas de API no sistema.
// Altere esta variável se o endereço do seu servidor mudar.
// Usar 'localhost' é mais estável para desenvolvimento, pois não muda.

if (typeof window.API_BASE_URL === 'undefined') {
    window.API_BASE_URL = 'http://localhost:8080';
}

if (typeof window.api === 'undefined') {
    window.api = {
        async request(endpoint, method = 'GET', data = null) {
            const isFormData = data instanceof FormData;

            const config = {
                method,
                headers: {
                    // Adiciona o token de autorização se ele existir
                    'Authorization': localStorage.getItem('userToken') 
                        ? `Bearer ${localStorage.getItem('userToken')}` 
                        : ''
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

            const response = await fetch(`${window.API_BASE_URL}${endpoint}`, config);

            if (!response.ok) {
                // --- ADICIONADO: Lógica de redirecionamento ---
                // Se o erro for 401 (Não Autorizado), o token é inválido ou expirou.
                if (response.status === 401) {
                    localStorage.removeItem('userToken'); // Limpa o token antigo
                    window.location.href = '/index.html'; // Redireciona para a página de login
                }
                const errorData = await response.json().catch(() => ({ message: 'Erro desconhecido' }));
                throw new Error(errorData.message || `Erro na requisição: ${response.status}`);
            }

            // Retorna a resposta JSON apenas se houver conteúdo
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                return response.json();
            }
            // Retorna a resposta bruta para casos como DELETE sem corpo
            return response;
        },

        async get(endpoint) {
            return this.request(endpoint);
        },

        async post(endpoint, data) {
            return this.request(endpoint, 'POST', data);
        },

        async put(endpoint, data) {
            return this.request(endpoint, 'PUT', data);
        },

        async delete(endpoint) {
            return this.request(endpoint, 'DELETE');
        }
    };
}