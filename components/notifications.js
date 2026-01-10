const initNotifications = () => {
    const bellIcon = document.querySelector('.menu-notifications i');
    const badge = document.querySelector('.notification-badge');
    const notificationList = document.querySelector('.notifications-list');
    const notificationDropdown = document.querySelector('.notifications-dropdown');
    const markAllReadBtn = document.querySelector('.mark-all-read');

    // Estado local
    let notifications = [];

    // --- FUNÇÕES ---

    const fetchNotifications = async () => {
        try {
            if (!window.api) return; // Aguarda API carregar
            
            const data = await window.api.get('/api/notifications');
            notifications = data.notifications;
            updateBadge(data.unreadCount);
            renderNotifications();
        } catch (error) {
            console.error('Erro ao buscar notificações:', error);
        }
    };

    const updateBadge = (count) => {
        if (count > 0) {
            badge.style.display = 'flex'; // Exibe apenas se houver notificações
            badge.textContent = count > 99 ? '99+' : count;
        } else {
            badge.style.display = 'none'; // Oculta completamente se zero
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

    const renderNotifications = () => {
        notificationList.innerHTML = '';

        if (notifications.length === 0) {
            notificationList.innerHTML = '<li class="no-notifications">Nenhuma notificação recente.</li>';
            return;
        }

        notifications.forEach(notif => {
            const li = document.createElement('li');
            li.className = `notification-item ${notif.read ? 'read' : 'unread'}`;
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

            li.addEventListener('click', async () => {
                // Marca como lida e redireciona
                if (!notif.read) {
                    try {
                        await window.api.put(`/api/notifications/${notif._id}/read`);
                        fetchNotifications(); // Atualiza contador
                    } catch (e) { console.error(e); }
                }
                if (notif.link && notif.link !== '#') {
                    window.location.href = notif.link;
                }
            });

            notificationList.appendChild(li);
        });
    };

    const markAllAsRead = async () => {
        try {
            await window.api.put('/api/notifications/read-all');
            fetchNotifications(); // Recarrega lista (deve vir vazia ou tudo lido)
        } catch (error) {
            console.error('Erro ao limpar notificações:', error);
        }
    };

    // --- EVENT LISTENERS ---

    // Toggle Dropdown
    document.querySelector('.menu-notifications').addEventListener('click', (e) => {
        e.stopPropagation();
        notificationDropdown.classList.toggle('active');
    });

    // Fechar ao clicar fora
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.menu-notifications')) {
            notificationDropdown.classList.remove('active');
        }
    });

    // Marcar todas como lidas
    if (markAllReadBtn) {
        markAllReadBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            markAllAsRead();
        });
    }

    // --- INICIALIZAÇÃO ---
    // Aguarda um pouco para garantir que o token esteja pronto (api.js)
    setTimeout(() => {
        fetchNotifications();
        // Polling: Atualiza a cada 60 segundos
        setInterval(fetchNotifications, 60000);
    }, 1000);
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNotifications);
} else {
    initNotifications();
}