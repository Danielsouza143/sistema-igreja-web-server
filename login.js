document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('form-login');
    const errorMessage = document.getElementById('error-message');

    const decodeJwt = (token) => {
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            return JSON.parse(jsonPayload);
        } catch (e) {
            console.error("Erro ao decodificar o JWT:", e);
            return null;
        }
    };

    const redirectUser = async (payload) => {
        if (!payload) {
            localStorage.clear();
            return;
        }

        if (payload.role === 'super_admin') {
            window.location.href = '/pages/admin-panel/admin.html';
        } else {
            try {
                const status = await window.api.get('/api/tenants/status');
                if (!status.completedOnboard) {
                    window.location.href = '/pages/onboarding/onboarding.html';
                } else if (payload.role === 'admin' || payload.tenantType === 'filial') {
                    window.location.href = '/pages/dashboard/dashboard.html';
                } else if (payload.tenantType === 'sede') {
                    window.location.href = '/pages/sede-panel/sede.html';
                } else {
                    errorMessage.textContent = 'Tipo de conta não reconhecido. Contate o suporte.';
                    localStorage.clear();
                }
            } catch (error) {
                errorMessage.textContent = 'Não foi possível verificar o status do tenant.';
            }
        }
    };

    const initialize = async () => {
        const token = localStorage.getItem('userToken');
        
        if (token) {
            const payload = decodeJwt(token);
            await redirectUser(payload);
            return;
        }

        try {
            const status = await window.api.get('/api/auth/setup-status');
            if (status.needsSetup) {
                window.location.href = '/setup-admin.html';
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
                
                const payload = decodeJwt(data.token);
                await redirectUser(payload);
            }
        } catch (error) {
            errorMessage.textContent = error.message || 'Falha no login. Verifique suas credenciais.';
        }
    });

    initialize();
});