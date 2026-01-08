document.addEventListener('DOMContentLoaded', () => {
    // Definição de elementos da UI
    const navLinks = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('.panel-section');
    const addSedeBtn = document.getElementById('add-sede-btn');
    const sedeModal = document.getElementById('sede-modal');
    const closeSedeModalBtn = document.getElementById('close-sede-modal-btn');
    const sedeForm = document.getElementById('sede-form');
    
    const addFilialBtn = document.getElementById('add-filial-btn');
    const filialModal = document.getElementById('filial-modal');
    const closeFilialModalBtn = document.getElementById('close-filial-modal-btn');
    const filialForm = document.getElementById('filial-form');
    const filialSedeSelect = document.getElementById('filial-sede-select');
    const filialErrorMessage = document.getElementById('filial-modal-error-message');

    const tenantsTbody = document.getElementById('tenants-tbody');
    const logsTbody = document.getElementById('logs-tbody');
    const logoutButton = document.getElementById('logout-button');
    const errorMessage = document.getElementById('sede-modal-error-message');

    const usersTbody = document.getElementById('global-users-tbody');
    const addGlobalUserBtn = document.getElementById('add-global-user-btn');
    const globalUserModal = document.getElementById('global-user-modal');
    const closeGlobalUserModalBtn = document.getElementById('close-global-user-modal-btn');
    const globalUserForm = document.getElementById('global-user-form');
    const globalUserTenantSelect = document.getElementById('global-user-tenant');
    const globalUserRoleSelect = document.getElementById('global-user-role');

    // --- Lógica de Navegação --- //
    const switchSection = (targetId) => {
        // Atualiza seções
        sections.forEach(section => {
            section.classList.toggle('active', section.id === `${targetId}-section`);
        });
        // Atualiza links
        navLinks.forEach(link => {
            link.classList.toggle('active', link.dataset.target === targetId);
        });

        // Carrega os dados da seção ativa
        switch (targetId) {
            case 'dashboard':
                loadDashboardStats();
                break;
            case 'tenants':
                loadTenants();
                break;
            case 'users':
                loadUsers();
                break;
            case 'logs':
                loadLogs();
                break;
        }
    };

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            switchSection(e.target.dataset.target);
        });
    });

    // --- Lógica do Modal SEDE --- //
    addSedeBtn.addEventListener('click', () => {
        sedeModal.style.display = 'block';
        sedeForm.reset();
        errorMessage.textContent = '';
        document.getElementById('modal-title-sede').textContent = 'Criar Nova Sede';
    });

    closeSedeModalBtn.addEventListener('click', () => {
        sedeModal.style.display = 'none';
    });

    // --- Lógica do Modal FILIAL --- //
    addFilialBtn.addEventListener('click', async () => {
        filialModal.style.display = 'block';
        filialForm.reset();
        filialErrorMessage.textContent = '';
        await loadSedesForSelect(); // Carrega as sedes no select
    });

    closeFilialModalBtn.addEventListener('click', () => {
        filialModal.style.display = 'none';
    });

    // --- Lógica do Modal USUÁRIOS --- //
    addGlobalUserBtn.addEventListener('click', async () => {
        globalUserModal.style.display = 'block';
        globalUserForm.reset();
        document.getElementById('global-user-id').value = '';
        document.getElementById('modal-title-global-user').textContent = 'Novo Usuário';
        await loadAllTenantsForSelect(); // Carrega todas as igrejas no select
        toggleTenantSelect(); // Ajusta estado inicial do select
    });

    closeGlobalUserModalBtn.addEventListener('click', () => {
        globalUserModal.style.display = 'none';
    });

    // Fechar modais ao clicar fora
    window.addEventListener('click', (e) => {
        if (e.target === sedeModal) {
            sedeModal.style.display = 'none';
        }
        if (e.target === filialModal) {
            filialModal.style.display = 'none';
        }
        if (e.target === globalUserModal) {
            globalUserModal.style.display = 'none';
        }
    });

    // --- Lógica de Logout --- //
    logoutButton.addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.clear();
        window.location.href = '/login.html';
    });

    // --- Carregamento de Dados --- //
    
    // Dashboard
    const loadDashboardStats = async () => {
        try {
            const stats = await window.api.get('/api/admin/stats');
            document.getElementById('stats-total-tenants').textContent = stats.totalTenants || '0';
            document.getElementById('stats-total-users').textContent = stats.totalUsers || '0';
            document.getElementById('stats-total-entradas').textContent = `R$ ${stats.totalEntradas.toFixed(2) || '0.00'}`;
            document.getElementById('stats-total-saidas').textContent = `R$ ${stats.totalSaidas.toFixed(2) || '0.00'}`;
        } catch (error) {
            console.error('Falha ao carregar estatísticas:', error);
            // Manter os valores padrão '--' ou mostrar erro
        }
    };

    // Tenants
    const loadTenants = async () => {
        try {
            const tenants = await window.api.get('/api/admin/tenants');
            tenantsTbody.innerHTML = ''; // Limpa a tabela
            tenants.forEach(tenant => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${tenant.name}</td>
                    <td><span class="badge type-${tenant.tenantType}">${tenant.tenantType}</span></td>
                    <td><span class="badge status-${tenant.status}">${tenant.status}</span></td>
                    <td>${tenant.parentTenant ? tenant.parentTenant.name : 'N/A'}</td>
                    <td class="actions">
                        <button class="btn-sm btn-status-toggle" data-id="${tenant._id}" data-status="${tenant.status}">
                            ${tenant.status === 'active' ? 'Suspender' : 'Ativar'}
                        </button>
                        <button class="btn-sm btn-impersonate" data-id="${tenant._id}" data-type="${tenant.tenantType}">
                            Acessar
                        </button>
                    </td>
                `;
                tenantsTbody.appendChild(tr);
            });
            // Adiciona event listeners aos novos botões
            addTenantActionListeners();
        } catch (error) {
            console.error('Falha ao carregar tenants:', error);
            tenantsTbody.innerHTML = `<tr><td colspan="5">Erro ao carregar dados.</td></tr>`;
        }
    };
    
    // Carregar Sedes para o Select de Filial
    const loadSedesForSelect = async () => {
        try {
            const tenants = await window.api.get('/api/admin/tenants');
            const sedes = tenants.filter(t => t.tenantType === 'sede');
            
            filialSedeSelect.innerHTML = '<option value="">Selecione a Sede...</option>';
            sedes.forEach(sede => {
                const option = document.createElement('option');
                option.value = sede._id;
                option.textContent = sede.name;
                filialSedeSelect.appendChild(option);
            });
        } catch (error) {
            console.error('Erro ao carregar sedes:', error);
            filialSedeSelect.innerHTML = '<option value="">Erro ao carregar</option>';
        }
    };

    // Carregar Todos os Tenants para o Select de Usuário
    const loadAllTenantsForSelect = async () => {
        try {
            const tenants = await window.api.get('/api/admin/tenants');
            
            globalUserTenantSelect.innerHTML = '<option value="">Selecione...</option>';
            tenants.forEach(t => {
                const option = document.createElement('option');
                option.value = t._id;
                option.textContent = `${t.name} (${t.tenantType})`;
                globalUserTenantSelect.appendChild(option);
            });
        } catch (error) {
            console.error('Erro ao carregar tenants:', error);
        }
    };

    // Lógica para desabilitar seleção de Tenant se for Super Admin
    const toggleTenantSelect = () => {
        if (globalUserRoleSelect.value === 'super_admin') {
            globalUserTenantSelect.value = '';
            globalUserTenantSelect.disabled = true;
            globalUserTenantSelect.removeAttribute('required');
        } else {
            globalUserTenantSelect.disabled = false;
            globalUserTenantSelect.setAttribute('required', 'true');
        }
    };

    globalUserRoleSelect.addEventListener('change', toggleTenantSelect);

    // Ações dos Tenants
    const addTenantActionListeners = () => {
        document.querySelectorAll('.btn-status-toggle').forEach(button => {
            button.addEventListener('click', async (e) => {
                const tenantId = e.target.dataset.id;
                const currentStatus = e.target.dataset.status;
                const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
                
                try {
                    await window.api.patch(`/api/admin/tenants/${tenantId}/status`, { status: newStatus });
                    loadTenants(); // Recarrega a lista
                } catch (error) {
                    console.error('Falha ao atualizar status do tenant:', error);
                    alert('Não foi possível atualizar o status.');
                }
            });
        });

        document.querySelectorAll('.btn-impersonate').forEach(button => {
            button.addEventListener('click', async (e) => {
                const tenantId = e.target.dataset.id;
                const tenantType = e.target.dataset.type;
                
                try {
                    let url = '';
                    if (tenantType === 'sede') {
                        url = `/api/admin/tenants/${tenantId}/impersonate`;
                    } else if (tenantType === 'filial') {
                        url = `/api/admin/filiais/${tenantId}/impersonate`;
                    } else {
                        alert('Tipo de tenant desconhecido.');
                        return;
                    }

                    const response = await window.api.post(url);

                    if (response.impersonationToken) {
                        localStorage.setItem('userToken', response.impersonationToken);
                        window.location.href = '/index.html';
                    }

                } catch (error) {
                    console.error('Falha ao tentar representar o tenant:', error);
                    alert('Não foi possível representar o tenant.');
                }
            });
        });
    };

    // Submissão do Formulário de Sede
    sedeForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        errorMessage.textContent = '';
        const sedeData = {
            name: document.getElementById('sede-name').value,
            adminUsername: document.getElementById('sede-admin-username').value,
            adminName: document.getElementById('sede-admin-name').value,
            adminPassword: document.getElementById('sede-admin-password').value
        };

        try {
            await window.api.post('/api/admin/tenants/sede', sedeData);
            sedeModal.style.display = 'none';
            loadTenants(); // Recarrega a lista para mostrar a nova sede
        } catch (error) {
            console.error('Falha ao criar sede:', error);
            errorMessage.textContent = error.message || 'Erro desconhecido.';
        }
    });

    // Submissão do Formulário de Filial
    filialForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        filialErrorMessage.textContent = '';
        const filialData = {
            name: document.getElementById('filial-name').value,
            parentTenantId: document.getElementById('filial-sede-select').value,
            adminUsername: document.getElementById('filial-admin-username').value,
            adminName: document.getElementById('filial-admin-name').value,
            adminPassword: document.getElementById('filial-admin-password').value
        };

        try {
            // Nota: Você precisa garantir que esta rota exista no backend
            await window.api.post('/api/admin/tenants/filial', filialData);
            filialModal.style.display = 'none';
            loadTenants();
            alert('Filial criada com sucesso!');
        } catch (error) {
            console.error('Falha ao criar filial:', error);
            filialErrorMessage.textContent = error.message || 'Erro desconhecido.';
        }
    });

    // --- Gestão de Usuários --- //
    const loadUsers = async () => {
        try {
            // Nota: Rota nova no backend
            const users = await window.api.get('/api/admin/users');
            usersTbody.innerHTML = '';
            users.forEach(user => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${user.name}</td>
                    <td>${user.username}</td>
                    <td>${user.tenantName || 'N/A'}</td>
                    <td>${user.role}</td>
                    <td class="actions">
                        <button class="btn-sm btn-edit-user" data-user='${JSON.stringify(user)}'><i class='bx bxs-edit'></i> Editar</button>
                        <button class="btn-sm btn-delete-user" data-id="${user._id}"><i class='bx bxs-trash'></i></button>
                    </td>
                `;
                usersTbody.appendChild(tr);
            });

            // Listeners para botões de usuário
            document.querySelectorAll('.btn-edit-user').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const user = JSON.parse(e.currentTarget.dataset.user);
                    await loadAllTenantsForSelect();
                    
                    document.getElementById('global-user-id').value = user._id;
                    document.getElementById('global-user-name').value = user.name;
                    document.getElementById('global-user-username').value = user.username;
                    document.getElementById('global-user-role').value = user.role;
                    document.getElementById('global-user-tenant').value = user.tenantId;
                    document.getElementById('modal-title-global-user').textContent = 'Editar Usuário';
                    toggleTenantSelect(); // Atualiza UI baseada na role carregada
                    
                    globalUserModal.style.display = 'block';
                });
            });

            document.querySelectorAll('.btn-delete-user').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    if(confirm('Tem certeza que deseja excluir este usuário?')) {
                        try {
                            await window.api.delete(`/api/admin/users/${e.currentTarget.dataset.id}`);
                            loadUsers();
                        } catch (err) {
                            alert('Erro ao excluir: ' + err.message);
                        }
                    }
                });
            });

        } catch (error) {
            console.error('Falha ao carregar usuários:', error);
            usersTbody.innerHTML = `<tr><td colspan="5">Erro ao carregar usuários.</td></tr>`;
        }
    };

    // Submissão do Formulário de Usuário Global
    globalUserForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('global-user-id').value;
        const userData = {
            name: document.getElementById('global-user-name').value,
            username: document.getElementById('global-user-username').value,
            role: document.getElementById('global-user-role').value,
            tenantId: document.getElementById('global-user-role').value === 'super_admin' ? null : document.getElementById('global-user-tenant').value,
            password: document.getElementById('global-user-password').value
        };

        if (!userData.password) delete userData.password;

        try {
            if (id) {
                await window.api.put(`/api/admin/users/${id}`, userData);
            } else {
                await window.api.post('/api/admin/users', userData);
            }
            globalUserModal.style.display = 'none';
            loadUsers();
        } catch (error) {
            alert('Erro ao salvar usuário: ' + error.message);
        }
    });

    // Logs
    const loadLogs = async () => {
        try {
            const logs = await window.api.get('/api/admin/logs');
            logsTbody.innerHTML = ''; // Limpa a tabela
            logs.forEach(log => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${new Date(log.timestamp).toLocaleString('pt-BR')}</td>
                    <td>${log.user ? log.user.name : 'Sistema'} (${log.user ? log.user.username : ''})</td>
                    <td>${log.action}</td>
                    <td>${log.details}</td>
                `;
                logsTbody.appendChild(tr);
            });
        } catch (error) {
            console.error('Falha ao carregar logs:', error);
            logsTbody.innerHTML = `<tr><td colspan="4">Erro ao carregar logs.</td></tr>`;
        }
    };


    // --- Inicialização --- //
    // Carrega a primeira seção (Dashboard) por padrão
    switchSection('dashboard');
});
