// Função de logout robusta para garantir a limpeza completa do estado
if (typeof handleLogout === 'undefined') {
    window.handleLogout = () => {
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = '/login.html';
    };
}

var iniciarMenu = () => {
    // --- LÓGICA DE IDENTIDADE DA IGREJA ---
    class ChurchIdentity {
        static async loadAndApplyIdentity() {
            try {
                const configs = await window.api.get('/api/configs');
                if (!configs || !configs.identidade) throw new Error('Identidade não encontrada');
                const { nomeIgreja, logoIgrejaUrl } = configs.identidade;
                this.updateMenuDisplay(nomeIgreja, logoIgrejaUrl);
                localStorage.setItem('churchIdentity', JSON.stringify({ nomeIgreja, logoIgrejaUrl }));
            } catch (error) {
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
                logoContainer.innerHTML = ''; 
                if (logoUrl) {
                    const img = document.createElement('img');
                    img.src = logoUrl;
                    img.alt = "Logo da Igreja";
                    img.style.width = '45px';
                    img.style.height = '45px';
                    img.style.borderRadius = '50%';
                    img.style.objectFit = 'cover';
                    logoContainer.appendChild(img);
                } else {
                    const icon = document.createElement('i');
                    icon.className = 'bx bx-church';
                    icon.style.fontSize = '45px';
                    icon.style.color = '#fff';
                    logoContainer.appendChild(icon);
                }
            }

            if (menuChurchName) menuChurchName.textContent = nomeIgreja || ''; 
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
                    if (newIdentity) ChurchIdentity.updateMenuDisplay(newIdentity.nomeIgreja, newIdentity.logoIgrejaUrl);
                }
            });
        }
    }

    // --- APLICAÇÃO DE TEMAS E CORES ---
    let userInfo = JSON.parse(localStorage.getItem('userInfo'));

    const aplicarAparencia = async () => {
        try {
            const configs = await window.api.get('/api/configs') || {};
            const aparencia = configs.aparencia || { corPrimaria: '#001f5d', corSecundaria: '#0033a0' };
            document.documentElement.style.setProperty('--cor-primaria', aparencia.corPrimaria);
            document.documentElement.style.setProperty('--cor-secundaria', aparencia.corSecundaria);
        } catch (error) {}
    };

    // --- EVENT DELEGATION (Previne duplicação do HTMX) ---
    document.removeEventListener('click', window.menuClickHandler);
    window.menuClickHandler = (e) => {
        if (e.target.closest('#hamburger-btn-desktop') || e.target.closest('#hamburger-btn-mobile')) {
            const sidebar = document.getElementById('sidebar-menu');
            const overlay = document.getElementById('sidebar-overlay');
            if (sidebar && overlay) {
                sidebar.classList.toggle('active');
                overlay.classList.toggle('active');
            }
        }
        else if (e.target.closest('#sidebar-close-btn') || e.target.closest('#sidebar-overlay')) {
            const sidebar = document.getElementById('sidebar-menu');
            const overlay = document.getElementById('sidebar-overlay');
            if (sidebar && sidebar.classList.contains('active')) {
                sidebar.classList.remove('active');
                if (overlay) overlay.classList.remove('active');
            }
        }

        if (e.target.closest('#conta-area-trigger')) {
            e.stopPropagation();
            const modalConta = document.getElementById('modal-conta-usuario');
            if (modalConta && userInfo) {
                const nome = userInfo.name || userInfo.username;
                const avatarEl = document.getElementById('conta-modal-avatar');
                if(avatarEl) avatarEl.textContent = nome.charAt(0).toUpperCase();
                
                const nomeEl = document.getElementById('conta-modal-nome');
                if(nomeEl) nomeEl.textContent = nome;
                
                const emailEl = document.getElementById('conta-modal-email');
                if(emailEl) emailEl.textContent = userInfo.username;
                
                const roleEl = document.getElementById('conta-modal-role');
                if(roleEl) roleEl.textContent = userInfo.role === 'admin' ? 'Administrador' : 'Operador';
                
                modalConta.style.display = 'flex';
            }
        } 
        else if (e.target.closest('.modal-overlay') || e.target.closest('[data-close-modal="modal-conta-usuario"]')) {
            const modalConta = document.getElementById('modal-conta-usuario');
            if (modalConta) modalConta.style.display = 'none';
        }

        if (e.target.closest('#btn-modal-logout')) {
            e.preventDefault();
            handleLogout();
        }
    };
    document.addEventListener('click', window.menuClickHandler);

    const currentPage = window.location.pathname;
    const allLinks = document.querySelectorAll('.sub-menu-link, .sidebar-links a');
    allLinks.forEach(link => {
        if (link.pathname === currentPage) {
            link.classList.add('active');
            if (link.closest('details')) link.closest('details').open = true;
        }
    });

    window.updateUserDisplay = () => {
        userInfo = JSON.parse(localStorage.getItem('userInfo'));
        if (userInfo) {
            const nome = userInfo.name || userInfo.username;
            const userAvatar = document.getElementById('user-avatar');
            if (userAvatar) userAvatar.textContent = nome.charAt(0).toUpperCase();
        }
    };

    if (userInfo && userInfo.role !== 'admin') {
        const configLink = document.querySelector('a[href*="configuracoes.html"]');
        if (configLink && configLink.closest('li')) configLink.closest('li').style.display = 'none';
    }

    ChurchIdentity.init();
    aplicarAparencia();
    if (window.updateUserDisplay) window.updateUserDisplay();

    window.addEventListener('configsUpdated', (e) => {
        if (e.detail && e.detail.aparencia) {
            document.body.dataset.theme = e.detail.aparencia.theme;
            document.documentElement.style.setProperty('--cor-primaria', e.detail.aparencia.corPrimaria);
        }
    });
}

document.addEventListener('DOMContentLoaded', iniciarMenu);
document.body.addEventListener('htmx:afterSwap', iniciarMenu);
if (document.readyState !== 'loading') iniciarMenu();

// Expondo de forma correta para o Global Loader achar
window.initMenu = function() {
    if (typeof iniciarMenu === 'function') {
        iniciarMenu();
    }
};
