// Função de logout robusta para garantir a limpeza completa do estado
if (typeof handleLogout === 'undefined') {
    window.handleLogout = () => {
        // Limpa TODO o armazenamento local e de sessão para evitar vazamento de estado.
        // Esta é a etapa mais crucial para a segurança em um ambiente multi-tenant.
        localStorage.clear();
        sessionStorage.clear();

        // Redireciona para a página de login. O navegador irá carregar a página do zero.
        window.location.href = '/login.html';
    };
}

const iniciarMenu = () => {
    // --- LÓGICA DE IDENTIDADE DA IGREJA (MOVIDA DE CHURCH-IDENTITY.JS) ---
    class ChurchIdentity {
        static async loadAndApplyIdentity() {
            try {
                // CORREÇÃO: Usar a rota autenticada que retorna os dados do tenant
                const configs = await window.api.get('/api/configs');
                if (!configs || !configs.identidade) {
                    throw new Error('Objeto de identidade não encontrado nas configurações do tenant.');
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
            const logoContainer = document.getElementById('menu-logo-container');
            const menuChurchName = document.getElementById('menu-church-name');
            
            if (logoContainer) {
                logoContainer.innerHTML = ''; // Limpa o container primeiro
                if (logoUrl) {
                    const img = document.createElement('img');
                    img.src = logoUrl;
                    img.alt = "Logo da Igreja";
                    img.style.width = '50px';
                    img.style.height = '50px';
                    img.style.borderRadius = '50%';
                    img.style.objectFit = 'cover';
                    logoContainer.appendChild(img);
                } else {
                    const icon = document.createElement('i');
                    icon.className = 'bx bx-church';
                    icon.style.fontSize = '50px';
                    icon.style.color = '#fff';
                    logoContainer.appendChild(icon);
                }
            } else {
                console.warn('Container do logo (#menu-logo-container) não encontrado.');
            }

            if (menuChurchName) {
                menuChurchName.textContent = nomeIgreja || ''; // Usa string vazia como fallback
            } else {
                console.warn('Elemento #menu-church-name não encontrado no menu.');
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
            const aparencia = configs.aparencia || { corPrimaria: '#001f5d', corSecundaria: '#0033a0' };
            // Remove a lógica de tema, aplica apenas as cores
            document.documentElement.style.setProperty('--cor-primaria', aparencia.corPrimaria);
            document.documentElement.style.setProperty('--cor-secundaria', aparencia.corSecundaria);
        } catch (error) {
            console.error('Erro ao aplicar aparência:', error);
        }
    };

    if (!sidebar || !overlay || !closeBtn || !hamburgerBtnDesktop || !hamburgerBtnMobile) {
        console.error('Elementos da sidebar não foram encontrados. O menu está presente no HTML?');
    } else {
        const toggleSidebar = () => {
            // A verificação do painel de notificações foi movida para o listener de overlay
            sidebar.classList.toggle('active');
            overlay.classList.toggle('active');
        };

        if (hamburgerBtnDesktop) hamburgerBtnDesktop.addEventListener('click', toggleSidebar);
        if (hamburgerBtnMobile) hamburgerBtnMobile.addEventListener('click', toggleSidebar);

        closeBtn.addEventListener('click', toggleSidebar);
        overlay.addEventListener('click', () => {
            // Se a sidebar estiver ativa, fecha ela
            if (sidebar.classList.contains('active')) {
                toggleSidebar();
            }
        });
    }

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
            handleLogout();
        });
    }

    if (userInfo && userInfo.role !== 'admin') {
        const configLink = document.querySelector('a[href*="configuracoes.html"]');
        if (configLink) configLink.closest('li').style.display = 'none';
    }

    // --- INICIALIZAÇÃO ---
    ChurchIdentity.init();
    aplicarAparencia();
    if (window.updateUserDisplay) window.updateUserDisplay();

    window.addEventListener('configsUpdated', (e) => {
        if (e.detail && e.detail.aparencia) {
            document.body.dataset.theme = e.detail.aparencia.theme;
            document.documentElement.style.setProperty('--cor-primaria', e.detail.aparencia.corPrimaria);
        }
    });

    // Adiciona o script de notificações dinamicamente
    if (!document.querySelector('script[src="/components/notifications.js"]')) {
        const notificationsScript = document.createElement('script');
        notificationsScript.src = '/components/notifications.js';
        document.body.appendChild(notificationsScript);
    }
}

// Inicialização compatível com HTMX
document.addEventListener('DOMContentLoaded', iniciarMenu);
document.body.addEventListener('htmx:afterSwap', iniciarMenu);

// Se carregado dinamicamente via script tag no body (pelo global-loader)
if (document.readyState !== 'loading') {
    iniciarMenu();
}

// Expõe globalmente para o global-loader chamar se necessário
window.initMenu = iniciarMenu;