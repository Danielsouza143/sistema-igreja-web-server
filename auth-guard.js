// Este script deve ser o PRIMEIRO a ser carregado no <head> de todas as páginas protegidas.

(function() {
    /**
     * Decodifica o payload de um JWT.
     */
    const decodeJwt = (token) => {
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            return JSON.parse(jsonPayload);
        } catch (e) {
            return null;
        }
    };

    /**
     * Redireciona o usuário para a página de login, limpando qualquer estado local.
     */
    const redirectToLogin = () => {
        localStorage.clear();
        window.location.href = '/login.html';
    };

    const userToken = localStorage.getItem('userToken');
    const currentPage = window.location.pathname;

    // 1. Se não há token, redireciona para o login
    if (!userToken) {
        redirectToLogin();
        return;
    }

    const payload = decodeJwt(userToken);

    // 2. Se o token é inválido ou malformado, redireciona para o login
    if (!payload) {
        redirectToLogin();
        return;
    }

    const { role, tenantType } = payload;

    // 3. Define as "casas" de cada tipo de usuário e as páginas que eles podem acessar
    const pagesConfig = {
        super_admin: {
            home: '/pages/admin-panel/admin.html',
            allowedPaths: ['/pages/admin-panel/', '/', '/login.html']
        },
        sede: {
            home: '/pages/sede-panel/sede.html',
            allowedPaths: ['/pages/sede-panel/', '/pages/configuracoes/', '/', '/login.html'] 
        },
        filial: {
            home: '/pages/dashboard/dashboard.html',
            allowedPaths: [
                '/pages/dashboard/',
                '/pages/agenda/',
                '/pages/lista.membros/',
                '/pages/cadastro.membro.page/',
                '/pages/financeiro.page/',
                '/pages/utensilios/',
                '/pages/pequenos-grupos/',
                '/pages/configuracoes/',
                 // Permitir acesso a detalhes de membro e outras páginas relacionadas
                '/pages/lista.membros/detalhes_membro.html',
                '/',
                '/login.html'
            ]
        }
    };

    // Determina o tipo de usuário atual para encontrar a configuração correta
    let userProfileType = role === 'super_admin' ? 'super_admin' : tenantType;
    if (role === 'admin') {
        userProfileType = 'filial';
    }
    const userConfig = pagesConfig[userProfileType];

    // 4. Se o tipo de usuário é desconhecido, redireciona para o login
    if (!userConfig) {
        redirectToLogin();
        return;
    }

    // 5. Verifica se o usuário está em uma página permitida para seu perfil
    const isAuthorized = userConfig.allowedPaths.some(path => currentPage.startsWith(path));

    // 6. Se não estiver autorizado, redireciona para a página inicial correta, sem deslogar
    if (!isAuthorized) {
        // Evita loop de redirecionamento se já estiver na home
        if (window.location.pathname !== userConfig.home) {
            window.location.href = userConfig.home;
        }
        return;
    }

})();