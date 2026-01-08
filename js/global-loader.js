document.addEventListener('DOMContentLoaded', () => {

    /**
     * Lógica para o modo de Supervisão (Impersonation)
     */
    const handleImpersonation = () => {
        const originalToken = localStorage.getItem('originalUserToken');
        if (!originalToken) return;

        const banner = document.createElement('div');
        banner.innerHTML = `
            Você está em <strong>Modo de Supervisão</strong>. 
            <a href="#" id="return-to-sede-btn">Retornar ao seu painel de Sede</a>.
        `;
        Object.assign(banner.style, {
            position: 'fixed', top: '0', left: '0', width: '100%',
            backgroundColor: '#ffc107', color: '#333', textAlign: 'center',
            padding: '10px', zIndex: '2000', fontSize: '1rem', borderBottom: '1px solid #e0a800'
        });

        const returnBtn = banner.querySelector('#return-to-sede-btn');
        returnBtn.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.setItem('userToken', originalToken);
            localStorage.removeItem('originalUserToken');
            window.location.href = '/pages/sede-panel/sede.html';
        });

        document.body.prepend(banner);
        document.body.style.paddingTop = `${banner.offsetHeight}px`;
    };

    /**
     * Lógica para carregar o menu
     */
    const loadMenu = async () => {
        const menuPlaceholder = document.getElementById('menu-placeholder');
        if (!menuPlaceholder) return;

        try {
            const response = await fetch('/components/menu.html');
            if (!response.ok) throw new Error(`Failed to fetch menu HTML: ${response.status}`);
            
            menuPlaceholder.innerHTML = await response.text();

            const menuScript = document.createElement('script');
            menuScript.src = '/components/menu.js';
            menuScript.onload = () => {
                if (typeof initMenu === 'function') {
                    initMenu();
                } else {
                    console.error('Falha ao inicializar o menu: função initMenu() não encontrada.');
                }
            };
            document.body.appendChild(menuScript);

        } catch (error) {
            console.error('Error loading menu component:', error);
            menuPlaceholder.innerHTML = '<p style="color: red; text-align: center;">Erro ao carregar o menu.</p>';
        }
    };

    // --- PONTO DE ENTRADA PRINCIPAL ---
    const apiScript = document.createElement('script');
    apiScript.src = '/js/api.js';

    // Garante que api.js seja carregado ANTES de qualquer outra lógica que dependa dele.
    apiScript.onload = () => {
        handleImpersonation();
        loadMenu();
    };
    
    apiScript.onerror = () => {
        console.error("ERRO CRÍTICO: Falha ao carregar o api.js. A aplicação não funcionará.");
        // Opcional: Mostrar uma mensagem de erro para o usuário na tela.
    };

    document.head.appendChild(apiScript);
});
