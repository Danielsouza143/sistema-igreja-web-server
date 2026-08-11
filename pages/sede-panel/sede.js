document.addEventListener('DOMContentLoaded', async () => {

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

            newBtnSim.onclick = () => { modal.style.display = 'none'; resolve(true); };
            newBtnNao.onclick = () => { modal.style.display = 'none'; resolve(false); };
        });
    };

    const tenantNamePlaceholder = document.getElementById('tenant-name-placeholder');
    const mainContent = document.querySelector('.main-content');
    const navContainer = document.querySelector('.sidebar-nav ul');
    const logoutButton = document.getElementById('logout-button');
    const sections = document.querySelectorAll('.panel-section');
    const navLinks = document.querySelectorAll('.nav-link');
    
    let globalChartInstance = null;
    let pieChartInstance = null;
    let cacheFiliais = []; 

    const DashboardManager = {
        formatCurrency(value) {
            return (value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        },
        async loadData() {
            try {
                const data = await window.api.get('/api/sedes/dashboard');
                const { resumo, comparativoFiliais, graficos } = data;

                document.getElementById('total-filiais').textContent = resumo.totalFiliais;
                document.getElementById('total-membros').textContent = resumo.totalMembros;
                document.getElementById('total-entradas').textContent = this.formatCurrency(resumo.totalEntradas);
                document.getElementById('total-saidas').textContent = this.formatCurrency(resumo.totalSaidas);
                
                const saldoGlobal = document.getElementById('saldo-global');
                if(saldoGlobal) {
                    saldoGlobal.textContent = this.formatCurrency(resumo.saldoGlobal);
                    saldoGlobal.style.color = resumo.saldoGlobal >= 0 ? '#28a745' : '#dc3545';
                }

                // Tabela Comparativa
                const comparativoBody = document.getElementById('comparativo-tbody');
                comparativoBody.innerHTML = '';
                
                if (comparativoFiliais && comparativoFiliais.length > 0) {
                    comparativoFiliais.forEach((item, index) => {
                        const row = `
                            <tr>
                                <td style="font-weight: bold; color: var(--cor-texto-claro);">${index + 1}º</td>
                                <td style="font-weight: 600;">${item.nome || 'Sede Principal'}</td>
                                <td><span class="badge" style="background: rgba(77, 80, 255, 0.1); color: var(--cor-acao); padding: 5px 12px; border-radius: 20px;">${item.membros} Membro(s)</span></td>
                            </tr>
                        `;
                        comparativoBody.insertAdjacentHTML('beforeend', row);
                    });
                } else {
                    comparativoBody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding: 20px; color: #888;">Nenhum dado para comparar.</td></tr>';
                }

                // Gráfico Global Line
                this.renderChart(graficos.evolucaoFinanceira);
                // Novo: Gráfico de Pizza
                this.renderPieChart(comparativoFiliais);

            } catch (error) {
                console.error("Erro ao carregar dados do dashboard:", error);
            }
        },
        renderChart(evolucaoMensal) {
            const canvas = document.getElementById('grafico-evolucao-global');
            if(!canvas || !evolucaoMensal) return;

            if(globalChartInstance) globalChartInstance.destroy();

            const labels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
            
            globalChartInstance = new Chart(canvas.getContext('2d'), {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Entradas Globais',
                            data: evolucaoMensal.map(d => d.entradas),
                            borderColor: '#28a745',
                            backgroundColor: 'rgba(40, 167, 69, 0.1)',
                            fill: true,
                            tension: 0.4,
                            borderWidth: 3,
                            pointRadius: 4
                        },
                        {
                            label: 'Saídas Globais',
                            data: evolucaoMensal.map(d => d.saidas),
                            borderColor: '#dc3545',
                            backgroundColor: 'rgba(220, 53, 69, 0.1)',
                            fill: true,
                            tension: 0.4,
                            borderWidth: 3,
                            pointRadius: 4
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: { mode: 'index', intersect: false },
                    plugins: { legend: { position: 'bottom' } },
                    scales: {
                        y: { beginAtZero: true, grid: { color: '#f1f5f9' } },
                        x: { grid: { display: false } }
                    }
                }
            });
        },
        renderPieChart(comparativo) {
            const canvas = document.getElementById('grafico-distribuicao-membros');
            if(!canvas || !comparativo || comparativo.length === 0) return;

            if(pieChartInstance) pieChartInstance.destroy();

            const labels = comparativo.map(c => c.nome || 'Sede');
            const data = comparativo.map(c => c.membros);
            const cores = ['#0033a0', '#ff8800', '#28a745', '#0056b3', '#ffcd56', '#4bc0c0', '#6c757d'];

            pieChartInstance = new Chart(canvas.getContext('2d'), {
                type: 'doughnut',
                data: {
                    labels: labels,
                    datasets: [{
                        data: data,
                        backgroundColor: cores,
                        borderWidth: 2,
                        borderColor: '#fff'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { position: 'bottom' } },
                    cutout: '60%'
                }
            });
        }
    };

    // --- MÓDULO DE GESTÃO DE FILIAIS ---
    const FilialManager = {
        modal: document.getElementById('filial-modal'),
        detailsModal: document.getElementById('filial-details-modal'),
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

            // Fechar Mega Modal
            document.getElementById('close-fd-modal-btn').addEventListener('click', () => {
                this.detailsModal.style.display = 'none';
            });
            
            // Botões do Mega Modal
            document.getElementById('fd-btn-auditar').addEventListener('click', (e) => {
                const id = e.target.dataset.id;
                if(id) this.impersonate(id);
            });
            document.getElementById('fd-btn-editar').addEventListener('click', (e) => {
                const id = e.target.dataset.id;
                this.detailsModal.style.display = 'none';
                if(id) this.openModalForEdit(id);
            });
        },

        async loadFiliais() {
            try {
                const filiais = await window.api.get('/api/sedes/filiais');
                cacheFiliais = filiais; 
                this.filialTableBody.innerHTML = ''; 
                
                if (filiais.length === 0) {
                    this.filialTableBody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 20px; color: #888;">Nenhuma filial cadastrada no sistema.</td></tr>';
                    return;
                }
                
                filiais.forEach(f => {
                    const imgUrl = f.logoUrl || '/assets/placeholder-image.png';
                    const telefone = f.telefone ? `Tel: ${f.telefone}` : '';
                    const endereco = f.address ? f.address : '<span style="color:#aaa;">Endereço não informado</span>';
                    
                    const row = `
                        <tr class="filial-row" data-id="${f._id}" style="cursor:pointer; transition: background 0.2s;">
                            <td>
                                <div class="filial-info-td">
                                    <img src="${imgUrl}" alt="Logo">
                                    <div class="filial-info-text">
                                        <strong>${f.name}</strong>
                                        <small><i class='bx bxs-user'></i> Pr. ${f.pastor}</small>
                                    </div>
                                </div>
                            </td>
                            <td><span style="display:block; font-size: 0.9rem;">${telefone}</span><span style="font-size: 0.85rem; color: #666;">${endereco}</span></td>
                            <td>${f.cnpj || '<span style="color:#aaa;">S/N</span>'}</td>
                            <td class="actions">
                                <a href="#" class="impersonate-btn" data-id="${f._id}"><i class='bx bx-log-in-circle'></i> Auditar</a>
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
            
            this.adminFields.style.display = 'block';
            document.getElementById('admin-username').required = true;
            document.getElementById('admin-name').required = true;
            document.getElementById('admin-password').required = true;

            this.modal.classList.add('active');
        },

        openModalForEdit(id) {
            const filial = cacheFiliais.find(f => f._id === id);
            if (!filial) return;
            
            this.modalTitle.textContent = 'Editar Congregação';
            this.filialForm.reset();
            this.filialIdField.value = id;
            document.getElementById('filial-name').value = filial.name;
            document.getElementById('filial-cnpj').value = filial.cnpj || '';
            document.getElementById('filial-telefone').value = filial.telefone || '';
            document.getElementById('filial-address').value = filial.address || '';
            
            this.adminFields.style.display = 'none';
            document.getElementById('admin-username').required = false;
            document.getElementById('admin-name').required = false;
            document.getElementById('admin-password').required = false;

            this.modal.classList.add('active');
        },
        
        openFilialDetails(id) {
            const f = cacheFiliais.find(f => f._id === id);
            if(!f) return;

            document.getElementById('fd-logo').src = f.logoUrl || '/assets/placeholder-image.png';
            document.getElementById('fd-name').textContent = f.name;
            document.getElementById('fd-pastor').textContent = f.pastor;
            
            document.getElementById('fd-cnpj').textContent = f.cnpj || 'Não cadastrado';
            document.getElementById('fd-address').textContent = f.address || 'Não cadastrado';
            document.getElementById('fd-date').textContent = new Date(f.createdAt).toLocaleDateString('pt-BR');

            document.getElementById('fd-membros').textContent = f.membros;
            document.getElementById('fd-saldo').textContent = DashboardManager.formatCurrency(f.saldo);
            document.getElementById('fd-receitas').textContent = DashboardManager.formatCurrency(f.receitas);
            document.getElementById('fd-despesas').textContent = DashboardManager.formatCurrency(f.despesas);
            
            // Popula a barra de progresso do impacto na rede
            const perc = f.percentualMembros || 0;
            document.getElementById('fd-perc-membros').textContent = perc;
            document.getElementById('fd-bar-membros').style.width = `${perc}%`;

            document.getElementById('fd-btn-auditar').dataset.id = id;
            document.getElementById('fd-btn-editar').dataset.id = id;

            this.detailsModal.style.display = 'flex';
        },

        closeModal() {
            this.modal.classList.remove('active');
            this.modalError.textContent = '';
        },

        handleTableClick(e) {
            const targetAction = e.target.closest('a');
            
            if (targetAction && targetAction.classList.contains('impersonate-btn')) {
                e.preventDefault();
                e.stopPropagation();
                this.impersonate(targetAction.dataset.id);
                return;
            } 
            
            const row = e.target.closest('.filial-row');
            if(row) {
                this.openFilialDetails(row.dataset.id);
            }
        },

        async impersonate(id) {
            const confirmed = await window.showConfirmCustom('Deseja acessar o painel desta congregação em modo de auditoria? Você poderá fazer alterações no sistema local.');
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
                telefone: document.getElementById('filial-telefone').value,
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
                DashboardManager.loadData(); 
                
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
            
            const pColor = document.getElementById('settings-primaryColor');
            const pText = document.getElementById('settings-primaryColor-text');
            pColor.addEventListener('input', (e) => { pText.value = e.target.value; });

            const sColor = document.getElementById('settings-secondaryColor');
            const sText = document.getElementById('settings-secondaryColor-text');
            sColor.addEventListener('input', (e) => { sText.value = e.target.value; });

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
                    const headerLogo = document.getElementById('sidebar-sede-logo');
                    const headerIcon = document.getElementById('sidebar-sede-icon');
                    if(headerLogo) {
                        headerLogo.src = data.config.logoUrl;
                        headerLogo.style.display = 'block';
                    }
                    if(headerIcon) headerIcon.style.display = 'none';
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
                
                const nomeAtualizado = document.getElementById('settings-name').value;
                tenantNamePlaceholder.textContent = nomeAtualizado;
                
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

    const modalFilialOverlay = document.getElementById('filial-modal');
    const modalDetailsOverlay = document.getElementById('filial-details-modal');
    window.addEventListener('click', (e) => {
        if (e.target === modalFilialOverlay) FilialManager.closeModal();
        if (e.target === modalDetailsOverlay) modalDetailsOverlay.style.display = 'none';
    });

    mainContent.style.visibility = 'hidden';
    initializePanel();
});
