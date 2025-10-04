document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const errorMessage = document.getElementById('error-message');
    const btnCadastrar = document.getElementById('btn-cadastrar-usuario');

    // Função principal de inicialização
    const initialize = async () => {
        // 1. Se já existe um token, tenta ir para o dashboard
        if (localStorage.getItem('userToken')) {
            window.location.href = '/pages/dashboard/dashboard.html';
            return;
        }

        // 2. Se não está logado, verifica se o setup inicial é necessário
        try {
            const status = await window.api.get('/api/auth/setup-status');
            if (status.needsSetup) {
                window.location.href = '/setup-admin.html';
            } else {
                // Se o setup já foi feito, mostra o botão para cadastrar novos usuários
                if (btnCadastrar) btnCadastrar.style.display = 'block';
            }
        } catch (error) {
            errorMessage.textContent = 'Não foi possível conectar ao servidor para verificar o status do sistema.';
        }
    };

    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        errorMessage.textContent = '';

        const username = event.target.username.value;
        const password = event.target.password.value;

        try {
            const data = await window.api.post('/api/auth/login', { username, password });
            
            if (data.token) {
                localStorage.setItem('userToken', data.token);
                localStorage.setItem('userInfo', JSON.stringify(data.user));
                window.location.href = '/pages/dashboard/dashboard.html'; // Redireciona para a página principal
            }
        } catch (error) {
            errorMessage.textContent = error.message || 'Falha no login. Verifique suas credenciais.';
        }
    });

    initialize();
});