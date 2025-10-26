document.addEventListener('DOMContentLoaded', () => {
    const notificationList = document.getElementById('notification-list');
    const notificationCounter = document.getElementById('notificacao-contador');
    const markAllAsReadBtn = document.getElementById('mark-all-as-read');

    // Função para buscar notificações
    async function fetchNotifications() {
        try {
            const notifications = await window.api.get('/api/lembretes/my');
            renderNotifications(notifications);
        } catch (error) {
            console.error('Erro ao buscar notificações:', error);
            if (notificationList) {
                notificationList.innerHTML = '<p class="empty-message">Erro ao carregar notificações.</p>';
            }
        }
    }

    // Função para renderizar as notificações no painel
    function renderNotifications(notifications) {
        if (!notificationList) return;

        if (!notifications || notifications.length === 0) {
            notificationList.innerHTML = '<p class="empty-message">Nenhuma notificação nova.</p>';
        } else {
            notificationList.innerHTML = notifications.map(n => `
                <div class="notification-item ${n.read ? '' : 'unread'}" data-id="${n._id}" data-link="${n.link || '#'}">
                    <div class="icon-container"><i class='bx bxs-bell'></i></div>
                    <div class="content-container">
                        <p>${n.message}</p>
                        <span class="timestamp">${new Date(n.createdAt).toLocaleString('pt-BR')}</span>
                    </div>
                </div>
            `).join('');
        }

        const unreadCount = notifications.filter(n => !n.read).length;
        updateCounter(unreadCount);
    }

    // Função para atualizar o contador
    function updateCounter(count) {
        if (!notificationCounter) return;
        if (count > 0) {
            notificationCounter.textContent = count;
            notificationCounter.style.display = 'flex';
        } else {
            notificationCounter.style.display = 'none';
        }
    }

    // Função para criar um lembrete (chamada pela página da agenda)
    window.criarLembreteEvento = async (eventoId) => {
        console.log('criarLembreteEvento called for event:', eventoId);
        try {
            await window.api.post('/api/lembretes', { eventoId });
            alert('Lembrete agendado com sucesso!');
            fetchNotifications(); // Atualiza a lista
        } catch (error) {
            console.error('Erro ao criar lembrete:', error);
            alert(error.message || 'Não foi possível agendar o lembrete.');
        }
    };

    // Event listener para marcar todas como lidas
    if (markAllAsReadBtn) {
        markAllAsReadBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            try {
                await window.api.post('/api/lembretes/mark-all-as-read');
                fetchNotifications();
            } catch (error) {
                console.error('Erro ao marcar notificações como lidas:', error);
            }
        });
    }

    // Event listener para clicar em uma notificação
    if (notificationList) {
        notificationList.addEventListener('click', (e) => {
            const item = e.target.closest('.notification-item');
            if (item && item.dataset.link && item.dataset.link !== '#') {
                window.location.href = item.dataset.link;
            }
        });
    }

    // Inicialização
    fetchNotifications();
});