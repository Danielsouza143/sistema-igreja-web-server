if (typeof handleLogout === 'undefined') {
    window.handleLogout = () => {
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = '/login.html';
    };
}

var iniciarMenu = () => {
    class ChurchIdentity {
        static async loadAndApplyIdentity() {
            try {
                const tenant = await window.api.get('/api/tenants/current');
                if (!tenant) throw new Error('Identidade não encontrada');
                
                const nomeIgreja = tenant.name;
                const logoIgrejaUrl = tenant.config ? tenant.config.logoUrl : null;
                
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

    let userInfo = JSON.parse(localStorage.getItem('userInfo'));

    const aplicarAparencia = async () => {
        try {
            const configs = await window.api.get('/api/configs') || {};
            const aparencia = configs.aparencia || { corPrimaria: '#001f5d', corSecundaria: '#0033a0' };
            document.documentElement.style.setProperty('--cor-primaria', aparencia.corPrimaria);
            document.documentElement.style.setProperty('--cor-secundaria', aparencia.corSecundaria);
        } catch (error) {}
    };

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

    // ========================================================
    // --- LÓGICA DE NOTIFICAÇÕES INTEGRADA ---
    // ========================================================
    window.fetchNotifications = async () => {
        const badge = document.querySelector('.notification-badge');
        const notificationList = document.querySelector('.notifications-list');

        if (!badge || !notificationList || !window.api) return;

        try {
            const data = await window.api.get('/api/notifications');

            // Renderiza Badge
            if (data.unreadCount > 0) {
                badge.style.display = 'flex';
                badge.textContent = data.unreadCount > 99 ? '99+' : data.unreadCount;
            } else {
                badge.style.display = 'none';
            }

            // Renderiza Lista
            notificationList.innerHTML = '';
            if (!data.notifications || data.notifications.length === 0) {
                notificationList.innerHTML = '<li class="no-notifications">Nenhuma notificação recente.</li>';
                return;
            }

            data.notifications.forEach(notif => {
                const date = new Date(notif.createdAt);
                const now = new Date();
                const diffMins = Math.round((now - date) / 60000);
                const diffHours = Math.round((now - date) / 3600000);
                const diffDays = Math.round((now - date) / 86400000);

                let timeStr = date.toLocaleDateString('pt-BR');
                if (diffMins < 1) timeStr = 'Agora mesmo';
                else if (diffMins < 60) timeStr = `${diffMins} min atrás`;
                else if (diffHours < 24) timeStr = `${diffHours} h atrás`;
                else if (diffDays < 7) timeStr = `${diffDays} dias atrás`;

                let iconStr = '<i class="bx bx-info-circle" style="color: #607D8B;"></i>';
                switch (notif.type) {
                    case 'member': iconStr = '<i class="bx bx-user-plus" style="color: #4CAF50;"></i>'; break;
                    case 'finance': iconStr = '<i class="bx bx-dollar-circle" style="color: #2196F3;"></i>'; break;
                    case 'event': iconStr = '<i class="bx bx-calendar-event" style="color: #FF9800;"></i>'; break;
                    case 'inventory': iconStr = '<i class="bx bx-box" style="color: #9C27B0;"></i>'; break;
                }

                const li = document.createElement('li');
                li.className = `notification-item ${notif.read ? 'read' : 'unread'}`;
                li.dataset.id = notif._id;
                li.dataset.link = notif.link || '#';
                li.dataset.read = notif.read;

                li.innerHTML = `
                    <div class="notification-icon">${iconStr}</div>
                    <div class="notification-content">
                        <p class="notification-title">${notif.title}</p>
                        <p class="notification-message">${notif.message}</p>
                        <span class="notification-time">${timeStr}</span>
                    </div>
                    ${!notif.read ? '<span class="unread-dot"></span>' : ''}
                `;
                notificationList.appendChild(li);
            });
        } catch (error) {
            console.error('Erro ao buscar notificações:', error);
        }
    };

    // Dispara a busca 1 segundo após o menu iniciar e depois a cada minuto
    setTimeout(() => { if(window.api) window.fetchNotifications(); }, 1000);
    if (window.notifInterval) clearInterval(window.notifInterval);
    window.notifInterval = setInterval(() => { if(window.api) window.fetchNotifications(); }, 60000);
}

// DELEGAÇÃO DE EVENTOS GLOBAL (CONTROLADOR ÚNICO DA TELA)
document.removeEventListener('click', window.menuClickHandler);
window.menuClickHandler = async (e) => {
    
    // 1. Sidebar
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

    // 2. Conta do Usuário
    let userInfo = JSON.parse(localStorage.getItem('userInfo'));
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

    // 3. Logout
    if (e.target.closest('#btn-modal-logout')) {
        e.preventDefault();
        handleLogout();
    }

    // 4. Lógica de Notificações
    const dropdown = document.querySelector('.notifications-dropdown');
    const sino = e.target.closest('.menu-notifications');

    if (sino && !e.target.closest('.notifications-dropdown')) {
        e.preventDefault();
        if (dropdown) dropdown.classList.toggle('active');
    } else if (dropdown && !sino) {
        dropdown.classList.remove('active');
    }

    if (e.target.closest('.mark-all-read')) {
        e.preventDefault();
        e.stopPropagation();
        try {
            await window.api.put('/api/notifications/read-all');
            if(window.fetchNotifications) window.fetchNotifications();
        } catch (error) {}
    }

    const notifItem = e.target.closest('.notification-item');
    if (notifItem) {
        const isRead = notifItem.dataset.read === 'true';
        const notifId = notifItem.dataset.id;
        const notifLink = notifItem.dataset.link;

        if (!isRead && notifId) {
            try {
                await window.api.put(`/api/notifications/${notifId}/read`);
                if(window.fetchNotifications) window.fetchNotifications();
            } catch (err) {}
        }
        if (notifLink && notifLink !== '#') {
            window.location.href = notifLink;
        }
    }
};

document.addEventListener('click', window.menuClickHandler);
document.addEventListener('DOMContentLoaded', iniciarMenu);
document.body.addEventListener('htmx:afterSwap', iniciarMenu);

if (document.readyState !== 'loading') iniciarMenu();

window.initMenu = function() {
    if (typeof iniciarMenu === 'function') {
        iniciarMenu();
    }
};
