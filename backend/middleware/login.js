document.addEventListener('DOMContentLoaded', () => {
    // Se o usuário já estiver logado, redireciona para o dashboard
    if (localStorage.getItem('userToken')) {
        window.location.href = '/pages/dashboard/dashboard.html';
    }

    const loginForm = document.getElementById('login-form');
    const errorMessage = document.getElementById('error-message');

    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        errorMessage.textContent = '';

        const username = event.target.username.value;
        const password = event.target.password.value;

        try {
            const data = await window.api.post('/api/auth/login', { username, password });
            
            if (data.token) {
                localStorage.setItem('userToken', data.token);
                localStorage.setItem('userData', JSON.stringify(data.user));
                window.location.href = '/pages/dashboard/dashboard.html'; // Redireciona para a página principal
            }
        } catch (error) {
            errorMessage.textContent = error.message || 'Falha no login. Verifique suas credenciais.';
        }
    });
});