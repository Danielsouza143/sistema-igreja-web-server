// Arquivo: components/menu.js (Versão Final Simplificada)
document.addEventListener('DOMContentLoaded', () => {
    const hamburgerBtnDesktop = document.getElementById('hamburger-btn-desktop');
    const hamburgerBtnMobile = document.getElementById('hamburger-btn-mobile');
    const sidebar = document.getElementById('sidebar-menu');
    const overlay = document.getElementById('sidebar-overlay');
    const closeBtn = document.getElementById('sidebar-close-btn');
    let userInfo = JSON.parse(localStorage.getItem('userInfo'));

    // --- LÓGICA DE CARREGAMENTO GLOBAL DE CONFIGS ---
    const aplicarConfigsGlobais = async () => {
        try {
            const configs = await window.api.get('/api/configs') || {};

            // Aplica Aparência
            const aparencia = configs.aparencia || { theme: 'light', corPrimaria: '#001f5d' };
            document.body.dataset.theme = aparencia.theme;
            document.documentElement.style.setProperty('--cor-primaria', aparencia.corPrimaria);

            // Aplica Identidade da Igreja
            const identidade = configs.identidade || { nomeIgreja: 'ADTC - Tabernáculo Celeste', logoIgrejaUrl: '/pages/logo.tab.png' }; 
            const menuChurchName = document.getElementById('menu-church-name');
            const menuLogoImg = document.getElementById('menu-logo-img');
            if (menuChurchName) {
                menuChurchName.textContent = identidade.nomeIgreja;
            }
            if (menuLogoImg) {
                menuLogoImg.src = identidade.logoIgrejaUrl;
            }
        } catch (error) {
            console.error('Erro ao carregar configurações globais:', error);
            // Mantém os valores padrão do HTML em caso de falha.
        }
    };

    if (!sidebar || !overlay || !closeBtn || !hamburgerBtnDesktop || !hamburgerBtnMobile) {
        console.error('Elementos da sidebar não foram encontrados. O menu está presente no HTML?');
        return;
    }

    const toggleSidebar = () => {
        sidebar.classList.toggle('active');
        overlay.classList.toggle('active');
    };

    if (hamburgerBtnDesktop) hamburgerBtnDesktop.addEventListener('click', toggleSidebar);
    if (hamburgerBtnMobile) hamburgerBtnMobile.addEventListener('click', toggleSidebar);

    closeBtn.addEventListener('click', toggleSidebar);
    overlay.addEventListener('click', toggleSidebar);

    // Lógica para destacar o link ativo
    const currentPage = window.location.pathname;
    const allLinks = document.querySelectorAll('.sub-menu-link, .sidebar-links a');

    allLinks.forEach(link => {
        // Compara o pathname do link com o da página atual.
        // Isso garante que /pages/configuracoes/configuracoes.html seja destacado corretamente.
        if (link.pathname === currentPage) {
            link.classList.add('active');
            // Se o link ativo estiver dentro de um <details>, abre ele
            if (link.closest('details')) {
                link.closest('details').open = true;
            }
        }
    });

    // --- LÓGICA DO MODAL DA CONTA E LOGOUT ---
    const contaTrigger = document.getElementById('conta-area-trigger');
    const userAvatar = document.getElementById('user-avatar'); // Avatar pequeno no menu
    const modalConta = document.getElementById('modal-conta-usuario');

    // Função para atualizar o display do usuário, pode ser chamada de outros lugares
    window.updateUserDisplay = () => {
        userInfo = JSON.parse(localStorage.getItem('userInfo')); // Recarrega info
        if (userInfo) {
            const nome = userInfo.name || userInfo.username;
            if (userAvatar) {
                userAvatar.textContent = nome.charAt(0).toUpperCase();
            }
        }
    };

    if (contaTrigger && modalConta) {
        contaTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            // Preenche o modal com as informações do usuário
            const nome = userInfo.name || userInfo.username;
            document.getElementById('conta-modal-avatar').textContent = nome.charAt(0).toUpperCase();
            document.getElementById('conta-modal-nome').textContent = nome;
            document.getElementById('conta-modal-email').textContent = userInfo.username; // Assumindo que username é o email
            document.getElementById('conta-modal-role').textContent = userInfo.role === 'admin' ? 'Administrador' : 'Operador';
            modalConta.style.display = 'flex';
        });

        // Lógica para fechar o modal
        modalConta.addEventListener('click', (e) => {
            if (e.target.matches('.modal-overlay') || e.target.closest('[data-close-modal="modal-conta-usuario"]')) {
                modalConta.style.display = 'none';
            }
        });
        
        // Lógica de Logout
        document.getElementById('btn-modal-logout').addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('userToken');
            localStorage.removeItem('userInfo');
            window.location.href = '/login.html';
        });
    }

    // Esconde o link de configurações se o usuário não for admin
    if (userInfo && userInfo.role !== 'admin') {
        const configLink = document.querySelector('a[href*="configuracoes.html"]');
        if (configLink) configLink.closest('li').style.display = 'none';
    }

    // --- LÓGICA DE NOTIFICAÇÕES (MOVIDA DE GLOBAL.JS) ---
    const notificacaoContainer = document.getElementById('notificacao-container');
    const contadorEl = document.getElementById('notificacao-contador');
    const painelEl = document.getElementById('notificacao-painel'); // Assumindo que este painel existe no HTML do menu

    if (notificacaoContainer && contadorEl) {
        // Expõe a função para ser chamada por outros scripts (ex: utensilios.js)
        window.renderizarNotificacoes = function() {
            let notificacoes = JSON.parse(localStorage.getItem('notificacoes')) || [];
            const naoLidas = notificacoes.filter(n => !n.lida);
            
            if (naoLidas.length > 0) {
                contadorEl.textContent = naoLidas.length;
                contadorEl.style.display = 'flex';
            } else {
                contadorEl.style.display = 'none';
            }

            if (painelEl) {
                if (notificacoes.length === 0) {
                    painelEl.innerHTML = '<div class="notificacao-vazio">Nenhuma notificação.</div>';
                } else {
                    painelEl.innerHTML = notificacoes.slice(0, 10).map(n => `
                        <div class="notificacao-item">
                            <p>${n.mensagem}</p>
                            <div class="data">${new Date(n.data).toLocaleString('pt-BR')}</div>
                        </div>
                    `).join('');
                }
            }
        };

        notificacaoContainer.addEventListener('click', (e) => {
            // Lógica para mostrar/esconder painel e marcar como lido
            // (Esta parte depende de como o painel de notificações foi implementado no HTML)
        });

        window.renderizarNotificacoes(); // Primeira renderização
    }
    // --- FIM DA LÓGICA DE NOTIFICAÇÕES ---

    // Inicialização
    aplicarConfigsGlobais();
    if (window.updateUserDisplay) window.updateUserDisplay();

    // Ouve por mudanças nas configurações para reaplicar dinamicamente
    window.addEventListener('configsUpdated', () => {
        aplicarConfigsGlobais();
    });
});