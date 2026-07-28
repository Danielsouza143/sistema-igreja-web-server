// Limpa o intervalo antigo para não duplicar requisições se a função for chamada novamente
if (window.notifInterval) clearInterval(window.notifInterval);

var initNotifications = () => {
    let notifications = [];

    // --- FUNÇÕES ---
    const fetchNotifications = async () => {
        // Busca os elementos dinamicamente toda vez que a função roda
        const badge = document.querySelector('.notification-badge');
        const notificationList = document.querySelector('.notifications-list');
        
        if (!badge || !notificationList) return;

        try {
            if (!window.api) return; 
            
            const data = await window.api.get('/api/notifications');
            notifications = data.notifications;
            updateBadge(data.unreadCount, badge);
            renderNotifications(notificationList);
        } catch (error) {
            console.error('Erro ao buscar notificações:', error);
        }
    };

    const updateBadge = (count, badgeElement) => {
        if (count > 0) {
            badgeElement.style.display = 'flex';
            badgeElement.textContent = count > 99 ? '99+' : count;
        } else {
            badgeElement.style.display = 'none';
        }
    };

    const getIconByType = (type) => {
        switch (type) {
            case 'member': return '<i class="bx bx-user-plus" style="color: #4CAF50;"></i>';
            case 'finance': return '<i class="bx bx-dollar-circle" style="color: #2196F3;"></i>';
            case 'event': return '<i class="bx bx-calendar-event" style="color: #FF9800;"></i>';
            case 'inventory': return '<i class="bx bx-box" style="color: #9C27B0;"></i>';
            default: return '<i class="bx bx-info-circle" style="color: #607D8B;"></i>';
        }
    };

    const formatTime = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.round(diffMs / 60000);
        const diffHours = Math.round(diffMs / 3600000);
        const diffDays = Math.round(diffMs / 86400000);

        if (diffMins < 1) return 'Agora mesmo';
        if (diffMins < 60) return `${diffMins} min atrás`;
        if (diffHours < 24) return `${diffHours} h atrás`;
        if (diffDays < 7) return `${diffDays} dias atrás`;
        return date.toLocaleDateString('pt-BR');
    };

    const renderNotifications = (listElement) => {
        listElement.innerHTML = '';

        if (notifications.length === 0) {
            listElement.innerHTML = '<li class="no-notifications">Nenhuma notificação recente.</li>';
            return;
        }

        notifications.forEach(notif => {
            const li = document.createElement('li');
            li.className = `notification-item ${notif.read ? 'read' : 'unread'}`;
            
            // Usamos atributos data-* para não precisar criar eventListeners individuais no loop
            li.dataset.id = notif._id;
            li.dataset.link = notif.link || '#';
            li.dataset.read = notif.read;
            
            li.innerHTML = `
                <div class="notification-icon">
                    ${getIconByType(notif.type)}
                </div>
                <div class="notification-content">
                    <p class="notification-title">${notif.title}</p>
                    <p class="notification-message">${notif.message}</p>
                    <span class="notification-time">${formatTime(notif.createdAt)}</span>
                </div>
                ${!notif.read ? '<span class="unread-dot"></span>' : ''}
            `;
            listElement.appendChild(li);
        });
    };

    window.markAllAsRead = async () => {
        try {
            await window.api.put('/api/notifications/read-all');
            fetchNotifications(); 
        } catch (error) {
            console.error('Erro ao limpar notificações:', error);
        }
    };

    // Remove listener antigo para evitar duplicação em navegações HTMX
    document.removeEventListener('click', window.notificationsClickHandler);

    // --- EVENT LISTENER GLOBAL (DELEGAÇÃO) ---
    window.notificationsClickHandler = async (e) => {
        const dropdown = document.querySelector('.notifications-dropdown');
        
        // 1. Toggle Dropdown ao clicar no sino
        if (e.target.closest('.menu-notifications')) {
            e.stopPropagation();
            if (dropdown) dropdown.classList.toggle('active');
        } 
        // 2. Fechar ao clicar fora
        else if (dropdown && !e.target.closest('.notifications-dropdown')) {
            dropdown.classList.remove('active');
        }

        // 3. Marcar todas como lidas
        if (e.target.closest('.mark-all-read')) {
            e.stopPropagation();
            window.markAllAsRead();
        }

        // 4. Redirecionamento da notificação individual
        const notifItem = e.target.closest('.notification-item');
        if (notifItem) {
            const isRead = notifItem.dataset.read === 'true';
            const notifId = notifItem.dataset.id;
            const notifLink = notifItem.dataset.link;

            if (!isRead && notifId) {
                try {
                    await window.api.put(`/api/notifications/${notifId}/read`);
                    fetchNotifications();
                } catch (err) { console.error(err); }
            }
            if (notifLink && notifLink !== '#') {
                window.location.href = notifLink;
            }
        }
    };

    document.addEventListener('click', window.notificationsClickHandler);

    // --- INICIALIZAÇÃO ---
    setTimeout(() => {
        fetchNotifications();
        window.notifInterval = setInterval(fetchNotifications, 60000);
    }, 1000);
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNotifications);
} else {
    initNotifications();
}

// Escuta as atualizações do HTMX para as notificações não pararem após a troca de páginas
document.body.addEventListener('htmx:afterSwap', () => {
    initNotifications();
});
