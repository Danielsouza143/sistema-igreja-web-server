document.addEventListener('DOMContentLoaded', async () => {

    // --- FUNÇÕES DE DECODIFICAÇÃO E FORMATAÇÃO ---
    const decodeJwt = (token) => {
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            return JSON.parse(jsonPayload);
        } catch (e) {
            return null;
        }
    };

    window.showConfirmCustom = (msg) => {
        return new Promise((resolve) => {
            const modal = document.getElementById('modal-confirmacao');
            const msgEl = document.getElementById('msg-confirmacao');
            const btnSim = document.getElementById('btn-confirm-sim');
            const btnNao = document.getElementById('btn-confirm-nao');

            if(!modal || !msgEl || !btnSim || !btnNao) {
                resolve(confirm(msg));
                return;
            }

            msgEl.innerText = msg;
            modal.style.display = 'flex';

            const newBtnSim = btnSim.cloneNode(true);
            const newBtnNao = btnNao.cloneNode(true);
            btnSim.parentNode.replaceChild(newBtnSim, btnSim);
            btnNao.parentNode.replaceChild(newBtnNao, btnNao);

            newBtnSim.onclick = () => { 
                modal.style.display = 'none'; 
                resolve(true); 
            };
            newBtnNao.onclick = () => { 
                modal.style.display = 'none'; 
                resolve(false); 
            };
        });
    };

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
            return (value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
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
                
                if (comparativoFiliais && comparativoFiliais.length > 0) {
                    comparativoFiliais.forEach((item, index) => {
                        const row = `
                            <tr>
                                <td style="font-weight: bold; color: var(--cor-texto-claro);">${index + 1}º</td>
                                <td style="font-weight: 600;">${item.nome || 'Sede Principal'}</td>
                                <td><span class="badge" style="background: rgba(77, 80, 255, 0.1); color: var(--cor-acao);">${item.membros} Membro(s)</span></td>
                            </tr>
                        `;
                        comparativoBody.insertAdjacentHTML('beforeend', row);
                    });
                } else {
                    comparativoBody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding: 20px; color: #888;">Nenhum dado para comparar.</td></tr>';
                }
            } catch (error) {
                console.error("Erro ao carregar dados do dashboard:", error);
            }
        }
    };

    // --- MÓDULO DE GESTÃO DE FILIAIS ---
    const FilialManager = {
        modal: document.getElementById('filial-modal'),
        closeModalBtn: document.getElementById('close-modal-btn'),
        cancelBtn: document.getElementById('cancel-filial-btn'),
        addFilialBtn: document.getElementById('add-filial-btn'),
        filialForm: document.getElementById('filial-form'),
        filialTableBody: document.querySelector('#filiais-table tbody'),
        modalTitle: document.getElementById('modal-title'),
        filialIdField: document.getElementById('filial-id'),
        adminFields: document.getElementById('admin-fields-container'),
        modalError: document.getElementById('modal-error-message'),

        init() {
            this.addFilialBtn.addEventListener('click', () => this.openModalForCreate());
            this.closeModalBtn.addEventListener('click', () => this.closeModal());
            if(this.cancelBtn) this.cancelBtn.addEventListener('click', () => this.closeModal());
            
            this.filialForm.addEventListener('submit', (e) => this.handleFormSubmit(e));
            this.filialTableBody.addEventListener('click', (e) => this.handleTableClick(e));
        },

        async loadFiliais() {
            try {
                const filiais = await window.api.get('/api/sedes/filiais');
                this.filialTableBody.innerHTML = ''; 
                
                if (filiais.length === 0) {
                    this.filialTableBody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 20px; color: #888;">Nenhuma filial cadastrada no sistema.</td></tr>';
                    return;
                }
                
                filiais.forEach(f => {
                    const row = `
                        <tr>
                            <td style="font-weight: 600;">${f.name}</td>
                            <td>${f.address || '<span style="color:#aaa;">Não informado</span>'}</td>
                            <td>${f.cnpj || '<span style="color:#aaa;">Não informado</span>'}</td>
                            <td class="actions">
                                <a href="#" class="edit-btn" data-id="${f._id}"><i class='bx bxs-edit'></i> Editar</a>
                                <a href="#" class="impersonate-btn" data-id="${f._id}"><i class='bx bx-log-in-circle'></i> Entrar (Auditoria)</a>
                            </td>
                        </tr>
                    `;
                    this.filialTableBody.insertAdjacentHTML('beforeend', row);
                });
            } catch (error) {
                console.error('Erro ao carregar filiais:', error);
                this.filialTableBody.innerHTML = '<tr><td colspan="4" style="color:red; text-align:center;">Erro ao carregar os dados.</td></tr>';
            }
        },

        openModalForCreate() {
            this.modalTitle.textContent = 'Nova Congregação / Filial';
            this.filialForm.reset();
            this.filialIdField.value = '';
            
            // Exige campos de Admin na criação
            this.adminFields.style.display = 'block';
            document.getElementById('admin-username').required = true;
            document.getElementById('admin-name').required = true;
            document.getElementById('admin-password').required = true;

            this.modal.classList.add('active');
        },

        async openModalForEdit(id) {
            const filiais = await window.api.get('/api/sedes/filiais');
            const filial = filiais.find(f => f._id === id);

            if (!filial) return;
            
            this.modalTitle.textContent = 'Editar Congregação';
            this.filialForm.reset();
            this.filialIdField.value = id;
            document.getElementById('filial-name').value = filial.name;
            document.getElementById('filial-cnpj').value = filial.cnpj || '';
            document.getElementById('filial-address').value = filial.address || '';
            
            // Oculta os campos de Admin na edição
            this.adminFields.style.display = 'none';
            document.getElementById('admin-username').required = false;
            document.getElementById('admin-name').required = false;
            document.getElementById('admin-password').required = false;

            this.modal.classList.add('active');
        },

        closeModal() {
            this.modal.classList.remove('active');
            this.modalError.textContent = '';
        },

        handleTableClick(e) {
            const target = e.target.closest('a');
            if (!target) return;
            
            if (target.classList.contains('edit-btn')) {
                e.preventDefault();
                this.openModalForEdit(target.dataset.id);
            } else if (target.classList.contains('impersonate-btn')) {
                e.preventDefault();
                this.impersonate(target.dataset.id);
            }
        },

        async impersonate(id) {
            const confirmed = await window.showConfirmCustom('Deseja acessar o painel desta congregação em modo de auditoria? Você poderá fazer alterações no sistema como um administrador local.');
            if (!confirmed) return;

            try {
                const response = await window.api.post(`/api/sedes/filiais/${id}/impersonate`, {});
                const { impersonationToken } = response;

                if (impersonationToken) {
                    const currentToken = localStorage.getItem('userToken');
                    localStorage.setItem('originalUserToken', currentToken);
                    localStorage.setItem('userToken', impersonationToken);
                    
                    const newPayload = decodeJwt(impersonationToken);
                    localStorage.setItem('userInfo', JSON.stringify(newPayload));
                    
                    window.location.href = '/pages/dashboard/dashboard.html';
                }
            } catch (error) {
                alert('Não foi possível auditar a filial: ' + error.message);
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
                const saveBtn = document.getElementById('save-filial-btn');
                saveBtn.disabled = true;
                saveBtn.textContent = 'Aguarde...';

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
                
                saveBtn.disabled = false;
                saveBtn.textContent = 'Concluir Cadastro';
                
            } catch (error) {
                this.modalError.textContent = error.message || 'Ocorreu um erro no servidor.';
                const saveBtn = document.getElementById('save-filial-btn');
                saveBtn.disabled = false;
                saveBtn.textContent = 'Concluir Cadastro';
            }
        }
    };
    
    // --- MÓDULO DE CONFIGURAÇÕES (SEDE) ---
    const SettingsManager = {
        form: document.getElementById('settings-form'),
        logoInput: document.getElementById('settings-logo-upload'),
        logoPreview: document.getElementById('settings-logo-preview'),
        btnTrocarLogo: document.getElementById('btn-trocar-logo-sede'),
        btnSalvar: document.getElementById('save-settings-btn'),

        init() {
            this.form.addEventListener('submit', (e) => this.handleFormSubmit(e));
            
            // Interação com o input de cores
            const pColor = document.getElementById('settings-primaryColor');
            const pText = document.getElementById('settings-primaryColor-text');
            pColor.addEventListener('input', (e) => { pText.value = e.target.value; });

            const sColor = document.getElementById('settings-secondaryColor');
            const sText = document.getElementById('settings-secondaryColor-text');
            sColor.addEventListener('input', (e) => { sText.value = e.target.value; });

            // Upload de Logo Preview
            if(this.btnTrocarLogo) {
                this.btnTrocarLogo.addEventListener('click', () => this.logoInput.click());
            }

            if(this.logoInput) {
                this.logoInput.addEventListener('change', (e) => {
                    const file = e.target.files[0];
                    if (file) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                            this.logoPreview.src = event.target.result;
                        };
                        reader.readAsDataURL(file);
                    }
                });
            }
        },

        async loadData() {
            try {
                const data = await window.api.get('/api/tenants/current');
                
                document.getElementById('settings-name').value = data.name || '';
                document.getElementById('settings-cnpj').value = data.cnpj || '';
                document.getElementById('settings-telefone').value = data.telefone || '';
                document.getElementById('settings-address').value = data.address || '';
                
                if (data.config && data.config.theme) {
                    const pColor = data.config.theme.primaryColor || '#001f5d';
                    const sColor = data.config.theme.secondaryColor || '#0033a0';
                    
                    document.getElementById('settings-primaryColor').value = pColor;
                    document.getElementById('settings-primaryColor-text').value = pColor;
                    
                    document.getElementById('settings-secondaryColor').value = sColor;
                    document.getElementById('settings-secondaryColor-text').value = sColor;
                }

                if (data.config && data.config.logoUrl) {
                    this.logoPreview.src = data.config.logoUrl;
                }
            } catch (error) {
                console.error('Erro ao carregar as configurações.', error);
            }
        },

        async handleFormSubmit(e) {
            e.preventDefault();
            this.btnSalvar.disabled = true;
            this.btnSalvar.innerHTML = `<i class='bx bx-loader-alt bx-spin'></i> Salvando...`;

            try {
                // Monta o FormData para enviar arquivos + textos
                const formData = new FormData();
                formData.append('name', document.getElementById('settings-name').value);
                formData.append('cnpj', document.getElementById('settings-cnpj').value);
                formData.append('telefone', document.getElementById('settings-telefone').value);
                formData.append('address', document.getElementById('settings-address').value);
                formData.append('primaryColor', document.getElementById('settings-primaryColor').value);
                formData.append('secondaryColor', document.getElementById('settings-secondaryColor').value);
                
                if (this.logoInput && this.logoInput.files[0]) {
                    formData.append('logo', this.logoInput.files[0]);
                }

                await window.api.patch('/api/tenants/onboarding', formData);
                
                alert('Configurações da Sede salvas com sucesso!');
                
                // Dispara evento para o header do sistema atualizar as cores
                const nomeAtualizado = document.getElementById('settings-name').value;
                tenantNamePlaceholder.textContent = nomeAtualizado;
                
                // Força reload suave para recarregar logo no header central
                setTimeout(() => { window.location.reload(); }, 1000);

            } catch (error) {
                alert(error.message || 'Ocorreu um erro ao salvar configurações.');
            } finally {
                this.btnSalvar.disabled = false;
                this.btnSalvar.innerHTML = `<i class='bx bx-save'></i> Salvar Todas as Alterações`;
            }
        }
    };

    // --- NAVEGAÇÃO E CONTROLE DE EXIBIÇÃO ---
    const showSection = (targetId) => {
        sections.forEach(section => section.classList.remove('active'));
        navLinks.forEach(link => link.classList.remove('active'));

        const sectionToActivate = document.getElementById(`${targetId}-section`);
        const linkToActivate = document.querySelector(`.nav-link[data-target="${targetId}"]`);
        
        if (sectionToActivate) sectionToActivate.classList.add('active');
        if (linkToActivate) linkToActivate.classList.add('active');

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
            showSection('dashboard'); 

        } catch (error) {
            document.body.innerHTML = `<div style="text-align: center; padding: 50px; font-family: sans-serif;">
                <i class='bx bx-error-circle' style="font-size: 4rem; color: #dc3545;"></i>
                <h2 style="color: #333;">Sessão Expirada ou Acesso Negado</h2>
                <p style="color: #666; margin-bottom: 20px;">Você precisa estar logado como Administrador da Sede para ver esta página.</p>
                <a href="/login.html" style="background: #001f5d; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold;">Voltar para o Login</a>
            </div>`;
        }
    };

    // Fechar modal de filial ao clicar fora
    const modalFilialOverlay = document.getElementById('filial-modal');
    modalFilialOverlay.addEventListener('click', (e) => {
        if (e.target === modalFilialOverlay) FilialManager.closeModal();
    });

    mainContent.style.visibility = 'hidden';
    initializePanel();
});
