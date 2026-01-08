document.addEventListener('DOMContentLoaded', async () => {
    // --- ELEMENTOS GLOBAIS DO PAINEL ---
    const tenantNamePlaceholder = document.getElementById('tenant-name-placeholder');
    const mainContent = document.querySelector('.main-content');
    const navContainer = document.querySelector('.sidebar-nav ul');
    const logoutButton = document.getElementById('logout-button');
    const sections = document.querySelectorAll('.panel-section');
    const navLinks = document.querySelectorAll('.nav-link');

    // --- MÓDULO DO DASHBOARD ---
    const DashboardManager = {
        formatCurrency(value) {
            return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        },
        async loadData() {
            try {
                const data = await window.api.get('/api/sedes/dashboard');
                const { resumo, comparativoFiliais } = data;

                document.getElementById('total-filiais').textContent = resumo.totalFiliais;
                document.getElementById('total-membros').textContent = resumo.totalMembros;
                document.getElementById('total-entradas').textContent = this.formatCurrency(resumo.totalEntradas);
                document.getElementById('total-saidas').textContent = this.formatCurrency(resumo.totalSaidas);

                const comparativoBody = document.getElementById('comparativo-tbody');
                comparativoBody.innerHTML = '';
                if (comparativoFiliais.length > 0) {
                    comparativoFiliais.forEach((item, index) => {
                        const row = `
                            <tr>
                                <td>${index + 1}º</td>
                                <td>${item.nome}</td>
                                <td>${item.membros}</td>
                            </tr>
                        `;
                        comparativoBody.insertAdjacentHTML('beforeend', row);
                    });
                } else {
                    comparativoBody.innerHTML = '<tr><td colspan="3">Nenhum dado de filial para comparar.</td></tr>';
                }
            } catch (error) {
                console.error("Erro ao carregar dados do dashboard:", error);
            }
        }
    };

    // --- MÓDULO DE GESTÃO DE FILIAIS ---
    const FilialManager = {
        //... (código existente do FilialManager)
        modal: document.getElementById('filial-modal'),
        closeModalBtn: document.getElementById('close-modal-btn'),
        addFilialBtn: document.getElementById('add-filial-btn'),
        filialForm: document.getElementById('filial-form'),
        filialTableBody: document.querySelector('#filiais-table tbody'),
        modalTitle: document.getElementById('modal-title'),
        filialIdField: document.getElementById('filial-id'),
        adminFields: document.getElementById('admin-fields'),
        modalError: document.getElementById('modal-error-message'),

        init() {
            this.addFilialBtn.addEventListener('click', () => this.openModalForCreate());
            this.closeModalBtn.addEventListener('click', () => this.closeModal());
            this.filialForm.addEventListener('submit', (e) => this.handleFormSubmit(e));
            this.filialTableBody.addEventListener('click', (e) => this.handleTableClick(e));
        },

        async loadFiliais() {
            try {
                const filiais = await window.api.get('/api/sedes/filiais');
                this.filialTableBody.innerHTML = ''; // Limpa a tabela
                if (filiais.length === 0) {
                    this.filialTableBody.innerHTML = '<tr><td colspan="4">Nenhuma filial cadastrada.</td></tr>';
                    return;
                }
                filiais.forEach(f => {
                    const row = `
                        <tr>
                            <td>${f.name}</td>
                            <td>${f.address || 'Não informado'}</td>
                            <td>${f.cnpj || 'Não informado'}</td>
                            <td class="actions">
                                <a href="#" class="edit-btn" data-id="${f._id}">Editar</a>
                                <a href="#" class="impersonate-btn" data-id="${f._id}">Entrar</a>
                            </td>
                        </tr>
                    `;
                    this.filialTableBody.insertAdjacentHTML('beforeend', row);
                });
            } catch (error) {
                console.error('Erro ao carregar filiais:', error);
                this.filialTableBody.innerHTML = '<tr><td colspan="4">Erro ao carregar dados.</td></tr>';
            }
        },

        openModalForCreate() {
            this.modalTitle.textContent = 'Adicionar Nova Filial';
            this.filialForm.reset();
            this.filialIdField.value = '';
            this.adminFields.style.display = 'block';
            this.modal.style.display = 'block';
        },

        async openModalForEdit(id) {
            const filiais = await window.api.get('/api/sedes/filiais');
            const filial = filiais.find(f => f._id === id);

            if (!filial) return;
            
            this.modalTitle.textContent = 'Editar Filial';
            this.filialForm.reset();
            this.filialIdField.value = id;
            document.getElementById('filial-name').value = filial.name;
            document.getElementById('filial-cnpj').value = filial.cnpj || '';
            document.getElementById('filial-address').value = filial.address || '';
            
            this.adminFields.style.display = 'none';
            this.modal.style.display = 'block';
        },

        closeModal() {
            this.modal.style.display = 'none';
            this.modalError.textContent = '';
        },

        handleTableClick(e) {
            if (e.target.classList.contains('edit-btn')) {
                e.preventDefault();
                const id = e.target.dataset.id;
                this.openModalForEdit(id);
            } else if (e.target.classList.contains('impersonate-btn')) {
                e.preventDefault();
                const id = e.target.dataset.id;
                this.impersonate(id);
            }
        },

        async impersonate(id) {
            if (!confirm('Você tem certeza que deseja entrar no painel desta filial? Você será redirecionado.')) {
                return;
            }

            try {
                const response = await window.api.post(`/api/sedes/filiais/${id}/impersonate`, {});
                const { impersonationToken } = response;

                if (impersonationToken) {
                    // Guarda o token original da Sede
                    localStorage.setItem('originalUserToken', localStorage.getItem('userToken'));
                    // Define o novo token da filial como o token ativo
                    localStorage.setItem('userToken', impersonationToken);
                    // Redireciona para o dashboard da filial
                    window.location.href = '/pages/dashboard/dashboard.html';
                }
            } catch (error) {
                alert('Não foi possível entrar no painel da filial: ' + error.message);
            }
        },

        async handleFormSubmit(e) {
            e.preventDefault();
            this.modalError.textContent = '';
            const id = this.filialIdField.value;
            const isEditing = !!id;

            const data = {
                name: document.getElementById('filial-name').value,
                cnpj: document.getElementById('filial-cnpj').value,
                address: document.getElementById('filial-address').value,
            };

            try {
                if (isEditing) {
                    await window.api.put(`/api/sedes/filiais/${id}`, data);
                } else {
                    data.adminUsername = document.getElementById('admin-username').value;
                    data.adminName = document.getElementById('admin-name').value;
                    data.adminPassword = document.getElementById('admin-password').value;
                    await window.api.post('/api/sedes/filiais', data);
                }
                this.closeModal();
                this.loadFiliais();
            } catch (error) {
                this.modalError.textContent = error.message || 'Ocorreu um erro.';
            }
        }
    };
    
    // --- MÓDULO DE CONFIGURAÇÕES ---
    const SettingsManager = {
        form: document.getElementById('settings-form'),
        successMessage: document.getElementById('settings-success-message'),
        errorMessage: document.getElementById('settings-error-message'),

        init() {
            this.form.addEventListener('submit', (e) => this.handleFormSubmit(e));
        },

        async loadData() {
            try {
                const data = await window.api.get('/api/tenants/me');
                document.getElementById('settings-name').value = data.name || '';
                document.getElementById('settings-cnpj').value = data.cnpj || '';
                document.getElementById('settings-address').value = data.address || '';
                document.getElementById('settings-primaryColor').value = data.config.theme.primaryColor || '#3498db';
                document.getElementById('settings-secondaryColor').value = data.config.theme.secondaryColor || '#2c3e50';
                document.getElementById('settings-logoUrl').value = data.config.logoUrl || '';
            } catch (error) {
                this.errorMessage.textContent = 'Erro ao carregar as configurações.';
            }
        },

        async handleFormSubmit(e) {
            e.preventDefault();
            this.errorMessage.textContent = '';
            this.successMessage.textContent = '';

            const data = {
                name: document.getElementById('settings-name').value,
                cnpj: document.getElementById('settings-cnpj').value,
                address: document.getElementById('settings-address').value,
                theme: {
                    primaryColor: document.getElementById('settings-primaryColor').value,
                    secondaryColor: document.getElementById('settings-secondaryColor').value,
                },
                logoUrl: document.getElementById('settings-logoUrl').value
            };

            try {
                await window.api.patch('/api/tenants/onboarding', data);
                this.successMessage.textContent = 'Configurações salvas com sucesso!';
                // Atualiza o nome do tenant no header da sidebar
                tenantNamePlaceholder.textContent = data.name;
            } catch (error) {
                this.errorMessage.textContent = error.message || 'Ocorreu um erro ao salvar.';
            }
        }
    };

    // --- FUNÇÕES GLOBAIS DO PAINEL ---
    const showSection = (targetId) => {
        sections.forEach(section => section.classList.remove('active'));
        navLinks.forEach(link => link.classList.remove('active'));

        document.getElementById(`${targetId}-section`).classList.add('active');
        document.querySelector(`.nav-link[data-target="${targetId}"]`).classList.add('active');

        // Carrega os dados da seção apropriada
        if (targetId === 'filiais') {
            FilialManager.loadFiliais();
        } else if (targetId === 'dashboard') {
            DashboardManager.loadData();
        } else if (targetId === 'configuracoes') {
            SettingsManager.loadData();
        }
    };

    const initializePanel = async () => {
        try {
            const status = await window.api.get('/api/tenants/status');
            if (!status.completedOnboard) {
                window.location.href = '/pages/onboarding/onboarding.html';
                return;
            }

            tenantNamePlaceholder.textContent = status.tenantName;
            mainContent.style.visibility = 'visible';

            navContainer.addEventListener('click', (e) => {
                e.preventDefault();
                const link = e.target.closest('.nav-link');
                if (link) showSection(link.dataset.target);
            });

            logoutButton.addEventListener('click', (e) => {
                e.preventDefault();
                localStorage.clear();
                window.location.href = '/login.html';
            });
            
            FilialManager.init();
            SettingsManager.init();
            showSection('dashboard'); // Mostra e carrega o dashboard ao iniciar

        } catch (error) {
            document.body.innerHTML = `<div style="text-align: center; padding: 50px;"><h2>Erro Crítico</h2><p>Não foi possível carregar as informações do seu painel.</p><p><i>${error.message || 'Erro desconhecido'}</i></p><a href="/login.html">Voltar para o Login</a></div>`;
        }
    };

    mainContent.style.visibility = 'hidden';
    initializePanel();
});


