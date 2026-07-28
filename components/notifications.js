// Arquivo: notifications.js

// Garante que o intervalo antigo seja limpo se o script rodar novamente
if (window.notifInterval) clearInterval(window.notifInterval);

window.initNotifications = () => {
    // --- 1. DELEGAÇÃO DE EVENTOS GLOBAL ---
    // Criamos os eventos de clique no document UMA ÚNICA VEZ.
    if (!window.notifEventsBound) {
        document.addEventListener('click', async (e) => {
            const bellContainer = e.target.closest('.menu-notifications');
            // Busca o dropdown toda vez que clica para pegar o elemento atualizado pelo HTMX
            const dropdown = document.querySelector('.notifications-dropdown');
            
            // A) Abrir/Fechar o Dropdown do Sino
            if (bellContainer) {
                // Evita fechar se o usuário clicar dentro da lista de notificações
                if (!e.target.closest('.notifications-dropdown')) {
                    e.preventDefault();
                    if (dropdown) dropdown.classList.toggle('active');
                }
            } else {
                // B) Clicou fora do sino: fecha o dropdown
                if (dropdown && dropdown.classList.contains('active')) {
                    dropdown.classList.remove('active');
                }
            }

            // C) Marcar todas como lidas
            if (e.target.closest('.mark-all-read')) {
                e.preventDefault();
                e.stopPropagation();
                try {
                    await window.api.put('/api/notifications/read-all');
                    window.fetchNotifications(); 
                } catch (error) { console.error('Erro ao limpar notificações:', error); }
            }

            // D) Clicar em uma notificação específica
            const notifItem = e.target.closest('.notification-item');
            if (notifItem) {
                const isRead = notifItem.dataset.read === 'true';
                const notifId = notifItem.dataset.id;
                const notifLink = notifItem.dataset.link;

                if (!isRead && notifId) {
                    try {
                        await window.api.put(`/api/notifications/${notifId}/read`);
                        window.fetchNotifications();
                    } catch (err) { console.error('Erro ao marcar como lida:', err); }
                }
                if (notifLink && notifLink !== '#') {
                    window.location.href = notifLink;
                }
            }
        });
        window.notifEventsBound = true;
    }

    // --- 2. FUNÇÕES DE DADOS E RENDERIZAÇÃO ---
    window.fetchNotifications = async () => {
        const badge = document.querySelector('.notification-badge');
        const notificationList = document.querySelector('.notifications-list');
        
        // Se a página atual não tiver o menu, não faz nada
        if (!badge || !notificationList) return;

        try {
            if (!window.api) return; 
            
            const data = await window.api.get('/api/notifications');
            window.renderBadge(data.unreadCount, badge);
            window.renderNotificationsList(data.notifications, notificationList);
        } catch (error) {
            console.error('Erro ao buscar notificações:', error);
        }
    };

    window.renderBadge = (count, badgeElement) => {
        if (count > 0) {
            badgeElement.style.display = 'flex';
            badgeElement.textContent = count > 99 ? '99+' : count;
        } else {
            badgeElement.style.display = 'none';
        }
    };

    window.renderNotificationsList = (notifications, listElement) => {
        listElement.innerHTML = '';

        if (!notifications || notifications.length === 0) {
            listElement.innerHTML = '<li class="no-notifications">Nenhuma notificação recente.</li>';
            return;
        }

        notifications.forEach(notif => {
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
            listElement.appendChild(li);
        });
    };

    // --- 3. INICIAR REQUISIÇÕES ---
    setTimeout(() => {
        window.fetchNotifications();
        window.notifInterval = setInterval(window.fetchNotifications, 60000);
    }, 1000);
};

// Inicialização segura
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', window.initNotifications);
} else {
    window.initNotifications();
}

// Inicialização após trocas de página via HTMX
if (!window.notifHtmxBound) {
    document.body.addEventListener('htmx:afterSwap', () => {
        window.initNotifications();
    });
    window.notifHtmxBound = true;
}
