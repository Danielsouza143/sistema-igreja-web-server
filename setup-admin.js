document.addEventListener('DOMContentLoaded', () => {
    const setupForm = document.getElementById('setup-form');
    const errorMessage = document.getElementById('error-message');

    // Verifica se o setup é realmente necessário, caso contrário, volta para o login
    window.api.get('/api/auth/setup-status')
        .then(status => {
            if (!status.needsSetup) {
                window.location.href = '/index.html';
            }
        })
        .catch(() => {
            errorMessage.textContent = 'Não foi possível verificar o status do sistema. Tente novamente mais tarde.';
        });

    setupForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        errorMessage.textContent = '';

        const username = event.target.username.value;
        const password = event.target.password.value;
        const confirmPassword = event.target['confirm-password'].value;

        if (password !== confirmPassword) {
            errorMessage.textContent = 'As senhas não coincidem.';
            return;
        }

        try {
            const data = await window.api.post('/api/auth/setup-admin', { username, password });
            localStorage.setItem('userToken', data.token);
            localStorage.setItem('userData', JSON.stringify(data.user));
            window.location.href = '/pages/admin-panel/admin.html';
        } catch (error) {
            errorMessage.textContent = error.message || 'Falha ao criar administrador.';
        }
    });
});