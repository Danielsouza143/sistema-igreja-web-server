// Polyfill para window.api para ambiente de navegador que não é o Electron
if (!window.api) {
    console.log("Criando polyfill de window.api para ambiente de navegador.");
    
    const createApiHandler = (method) => {
        return async (url, data) => {
            const token = localStorage.getItem('userToken');
            const headers = new Headers();
            if (token) {
                headers.append('Authorization', `Bearer ${token}`);
            }
            
            let body = data;

            // CORREÇÃO: Só define JSON se NÃO for FormData (arquivo/foto)
            if (data && !(data instanceof FormData)) {
                headers.append('Content-Type', 'application/json');
                body = JSON.stringify(data);
            }

            const config = {
                method: method,
                headers: headers,
                body: body,
            };

            const response = await fetch(`${url.startsWith('/') ? '' : '/'}${url}`, config);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: `HTTP error! status: ${response.status}` }));
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }
            // Retorna um objeto vazio se a resposta for 204 No Content
            return response.status === 204 ? {} : response.json();
        };
    };

    window.api = {
        get: createApiHandler('GET'),
        post: createApiHandler('POST'),
        patch: createApiHandler('PATCH'),
        put: createApiHandler('PUT'),
        delete: createApiHandler('DELETE'),
        getImageUrl: (url) => {
            if (!url) return '';
            if (url.startsWith('http') || url.startsWith('data:')) return url;
            // Se for relativo, garante que começa com / e concatena com a origem
            return `${window.location.origin}${url.startsWith('/') ? '' : '/'}${url}`;
        }
    };
}
