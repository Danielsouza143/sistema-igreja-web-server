document.addEventListener('DOMContentLoaded', () => {

    // --- LÓGICA DE IDENTIDADE DA IGREJA (MOVIDA DE CHURCH-IDENTITY.JS) ---
    class ChurchIdentity {
        static async loadAndApplyIdentity() {
            try {
                const configs = await window.api.get('/api/public/configs');
                if (!configs || !configs.identidade) {
                    throw new Error('Objeto de identidade não encontrado nas configurações.');
                }
                const { nomeIgreja, logoIgrejaUrl } = configs.identidade;
                this.updateMenuDisplay(nomeIgreja, logoIgrejaUrl);
                localStorage.setItem('churchIdentity', JSON.stringify({ nomeIgreja, logoIgrejaUrl }));
            } catch (error) {
                console.error('Falha ao carregar a identidade da igreja:', error);
                const storedIdentity = JSON.parse(localStorage.getItem('churchIdentity'));
                if (storedIdentity) {
                    this.updateMenuDisplay(storedIdentity.nomeIgreja, storedIdentity.logoIgrejaUrl);
                }
            }
        }

        static updateMenuDisplay(nomeIgreja, logoUrl) {
            const menuLogo = document.getElementById('menu-logo-img');
            const menuChurchName = document.getElementById('menu-church-name');
            if (menuLogo) {
                menuLogo.src = window.api.getImageUrl(logoUrl) || '/pages/logo.tab.png';
            }
            if (menuChurchName) {
                menuChurchName.textContent = nomeIgreja || 'Sistema Igreja';
            }
        }

        static init() {
            window.addEventListener('churchIdentityUpdated', (event) => {
                const { nomeIgreja, logoUrl } = event.detail;
                ChurchIdentity.updateMenuDisplay(nomeIgreja, logoUrl);
                localStorage.setItem('churchIdentity', JSON.stringify({ nomeIgreja, logoIgrejaUrl: logoUrl }));
            });

            this.loadAndApplyIdentity();

            window.addEventListener('storage', (event) => {
                if (event.key === 'churchIdentity') {
                    const newIdentity = JSON.parse(event.newValue);
                    if (newIdentity) {
                        ChurchIdentity.updateMenuDisplay(newIdentity.nomeIgreja, newIdentity.logoIgrejaUrl);
                    }
                }
            });
        }
    }
    // --- FIM DA LÓGICA DE IDENTIDADE ---


    const hamburgerBtnDesktop = document.getElementById('hamburger-btn-desktop');
    const hamburgerBtnMobile = document.getElementById('hamburger-btn-mobile');
    const sidebar = document.getElementById('sidebar-menu');
    const overlay = document.getElementById('sidebar-overlay');
    const closeBtn = document.getElementById('sidebar-close-btn');
    let userInfo = JSON.parse(localStorage.getItem('userInfo'));

    const aplicarAparencia = async () => {
        try {
            const configs = await window.api.get('/api/configs') || {};
            const aparencia = configs.aparencia || { theme: 'light', corPrimaria: '#001f5d' };
            document.body.dataset.theme = aparencia.theme;
            document.documentElement.style.setProperty('--cor-primaria', aparencia.corPrimaria);
        } catch (error) {
            console.error('Erro ao aplicar aparência:', error);
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

    const currentPage = window.location.pathname;
    const allLinks = document.querySelectorAll('.sub-menu-link, .sidebar-links a');

    allLinks.forEach(link => {
        if (link.pathname === currentPage) {
            link.classList.add('active');
            if (link.closest('details')) {
                link.closest('details').open = true;
            }
        }
    });

    const contaTrigger = document.getElementById('conta-area-trigger');
    const userAvatar = document.getElementById('user-avatar');
    const modalConta = document.getElementById('modal-conta-usuario');

    window.updateUserDisplay = () => {
        userInfo = JSON.parse(localStorage.getItem('userInfo'));
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
            const nome = userInfo.name || userInfo.username;
            document.getElementById('conta-modal-avatar').textContent = nome.charAt(0).toUpperCase();
            document.getElementById('conta-modal-nome').textContent = nome;
            document.getElementById('conta-modal-email').textContent = userInfo.username;
            document.getElementById('conta-modal-role').textContent = userInfo.role === 'admin' ? 'Administrador' : 'Operador';
            modalConta.style.display = 'flex';
        });

        modalConta.addEventListener('click', (e) => {
            if (e.target.matches('.modal-overlay') || e.target.closest('[data-close-modal="modal-conta-usuario"]')) {
                modalConta.style.display = 'none';
            }
        });
        
        document.getElementById('btn-modal-logout').addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('userToken');
            localStorage.removeItem('userInfo');
            window.location.href = '/login.html';
        });
    }

    if (userInfo && userInfo.role !== 'admin') {
        const configLink = document.querySelector('a[href*="configuracoes.html"]');
        if (configLink) configLink.closest('li').style.display = 'none';
    }

    const notificacaoContainer = document.getElementById('notificacao-container');
    const contadorEl = document.getElementById('notificacao-contador');
    const painelEl = document.getElementById('notificacao-painel');

    if (notificacaoContainer && contadorEl) {
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
        });

        window.renderizarNotificacoes();
    }

    // --- INICIALIZAÇÃO ---
    ChurchIdentity.init(); // INICIA A LÓGICA DE IDENTIDADE
    aplicarAparencia();
    if (window.updateUserDisplay) window.updateUserDisplay();

    window.addEventListener('configsUpdated', (e) => {
        if (e.detail && e.detail.aparencia) {
            document.body.dataset.theme = e.detail.aparencia.theme;
            document.documentElement.style.setProperty('--cor-primaria', e.detail.aparencia.corPrimaria);
        }
    });
});
