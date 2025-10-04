document.addEventListener('DOMContentLoaded', () => {
    // --- ESTADO DA APLICAÇÃO ---
    let configs = {
        aparencia: { theme: 'light', corPrimaria: '#001f5d' },
        utensilios_categorias: [],
        eventos_categorias: [],
        financeiro_categorias: { entradas: [], saidas: [] },
        identidade: { nomeIgreja: '', logoIgrejaUrl: '' }
    };

    // --- SELETORES DO DOM ---
    // Navegação
    const navLinks = document.querySelectorAll('.config-nav-link');
    const sections = document.querySelectorAll('.config-section');

    // Aparência
    const themeButtons = document.querySelectorAll('.theme-btn');
    const corPrincipalInput = document.getElementById('cor-principal');

    // Perfil
    const formPerfil = document.getElementById('form-perfil');
    const perfilNomeCompletoInput = document.getElementById('perfil-nome-completo');
    const perfilUsernameInput = document.getElementById('perfil-username');
    const btnSalvarPerfil = document.getElementById('btn-salvar-perfil');
    const btnSalvarSenha = document.getElementById('btn-salvar-senha');

    // Identidade
    const nomeIgrejaInput = document.getElementById('config-nome-igreja');
    const logoPreview = document.getElementById('logo-preview');
    const btnTrocarLogo = document.getElementById('btn-trocar-logo');
    const logoUploadInput = document.getElementById('logo-upload-input');
    const btnSalvarIdentidade = document.getElementById('btn-salvar-identidade');

    // Categorias
    const listaCatUtensilios = document.getElementById('lista-cat-utensilios');
    const listaCatEventos = document.getElementById('lista-cat-eventos');
    const listaCatEntradas = document.getElementById('lista-cat-entradas');
    const listaCatSaidas = document.getElementById('lista-cat-saidas');
    const btnsAddCategoria = document.querySelectorAll('.btn-add-categoria');

    // Backup
    const btnExportar = document.getElementById('btn-exportar-dados');
    const btnImportar = document.getElementById('btn-importar-dados');
    const importFileInput = document.getElementById('import-file-input');

    // Usuários
    const listaUsuarios = document.getElementById('lista-usuarios');
    const btnNovoUsuario = document.getElementById('btn-novo-usuario');
    const modalUsuario = document.getElementById('modal-usuario');
    const formUsuario = document.getElementById('form-usuario');
    const modalUsuarioTitulo = document.getElementById('modal-usuario-titulo');
    const usuarioIdInput = document.getElementById('usuario-id');
    const usuarioNomeCompletoInput = document.getElementById('usuario-nome-completo');

    // Log de Atividades
    const listaLogs = document.getElementById('lista-logs');

    // --- LÓGICA DE NAVEGAÇÃO INTERNA ---
    const handleNavigation = () => {
        const hash = window.location.hash || '#perfil'; // Padrão para #perfil
        navLinks.forEach(link => {
            link.classList.toggle('active', link.getAttribute('href') === hash);
        });
        sections.forEach(section => {
            section.classList.toggle('active', `#${section.id}` === hash);
        });
    };

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.hash = link.getAttribute('href');
        });
    });

    window.addEventListener('hashchange', handleNavigation);

    // --- LÓGICA DE APARÊNCIA ---
    const carregarAparencia = () => {
        const { theme, corPrimaria } = configs.aparencia;
        document.body.dataset.theme = theme;
        document.documentElement.style.setProperty('--cor-primaria', corPrimaria);
        themeButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.theme === theme));
        corPrincipalInput.value = corPrimaria;
    };

    themeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            document.body.dataset.theme = btn.dataset.theme;
            configs.aparencia.theme = btn.dataset.theme;
            themeButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            salvarConfigs();
        });
    });

    corPrincipalInput.addEventListener('input', (e) => {
        document.documentElement.style.setProperty('--cor-primaria', e.target.value);
    });
    corPrincipalInput.addEventListener('change', (e) => {
        configs.aparencia.corPrimaria = e.target.value;
        salvarConfigs();
    });

    // --- LÓGICA DE PERFIL ---
    const carregarPerfil = async () => {
        const userInfo = JSON.parse(localStorage.getItem('userInfo'));
        if (!userInfo || !userInfo.id) {
            console.error("Informações do usuário não encontradas no localStorage.");
            return;
        }
        // O nome de usuário (email) e nome completo já vêm do login.
        // Não é necessário fazer uma nova chamada de API aqui, o que evita o erro 404.
        perfilNomeCompletoInput.value = userInfo.name || '';
        perfilUsernameInput.value = userInfo.username || '';
    };

    btnSalvarPerfil.addEventListener('click', async (e) => {
        e.preventDefault();
        const userInfo = JSON.parse(localStorage.getItem('userInfo'));
        const nomeCompleto = perfilNomeCompletoInput.value;

        try {
            // CORREÇÃO: Usar a rota de atualização padrão com o ID do usuário logado.
            // A rota /api/users/profile não existe no backend.
            await window.api.put(`/api/users/${userInfo.id}`, { name: nomeCompleto });
            // Atualiza o nome no localStorage para refletir no menu
            userInfo.name = nomeCompleto;
            localStorage.setItem('userInfo', JSON.stringify(userInfo));
            window.updateUserDisplay(); // Chama a função global para atualizar o menu
            alert('Nome atualizado com sucesso!');
        } catch (error) {
            alert(`Erro ao atualizar o nome: ${error.message}`);
        }
    });

    btnSalvarSenha.addEventListener('click', async () => {
        const currentPassword = document.getElementById('perfil-senha-atual').value;
        const newPassword = document.getElementById('perfil-nova-senha').value;
        const confirmPassword = document.getElementById('perfil-confirmar-senha').value;

        if (!currentPassword || !newPassword) {
            alert('Por favor, preencha a senha atual e a nova senha.');
            return;
        }
        if (newPassword !== confirmPassword) {
            alert('A nova senha e a confirmação não coincidem.');
            return;
        }
        if (newPassword.length < 6) {
            alert('A nova senha deve ter pelo menos 6 caracteres.');
            return;
        }

        try {
            await window.api.put('/api/users/change-password', { currentPassword, newPassword });
            alert('Senha alterada com sucesso!');
            document.getElementById('perfil-senha-atual').value = '';
            document.getElementById('perfil-nova-senha').value = '';
            document.getElementById('perfil-confirmar-senha').value = '';
        } catch (error) {
            alert(`Erro ao alterar a senha: ${error.message}`);
        }
    });


    // --- LÓGICA DE IDENTIDADE DA IGREJA ---
    btnTrocarLogo.addEventListener('click', () => {
        logoUploadInput.click();
    });

    logoUploadInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                logoPreview.src = event.target.result;
            };
            reader.readAsDataURL(file);
        }
    });

    btnSalvarIdentidade.addEventListener('click', async () => {
        const nomeIgreja = nomeIgrejaInput.value.trim();
        configs.identidade.nomeIgreja = nomeIgreja;

        const logoFile = logoUploadInput.files[0];
        if (logoFile) {
            try {
                const formData = new FormData();
                formData.append('logo', logoFile);
                const res = await window.api.post('/api/configs/upload-logo', formData);
                configs.identidade.logoIgrejaUrl = res.filePath;
            } catch (error) {
                console.error('Erro no upload do logo:', error);
                alert('Falha ao enviar o novo logo. As outras alterações foram salvas.');
            }
        }
        await salvarConfigs();
        alert('Identidade da igreja salva com sucesso!');
    });

    // --- LÓGICA DE CONFIGURAÇÕES GERAIS (CARREGAR/SALVAR) ---
    const carregarConfigs = async () => {
        try {
            // Agora buscamos todas as configurações de uma única rota
            const serverConfigs = await window.api.get('/api/configs') || {};
            
            configs.aparencia = serverConfigs.aparencia || { theme: 'light', corPrimaria: '#001f5d' };
            configs.utensilios_categorias = serverConfigs.utensilios_categorias || [];
            configs.eventos_categorias = serverConfigs.eventos_categorias || [];
            configs.financeiro_categorias = serverConfigs.financeiro_categorias || { entradas: [], saidas: [] };
            configs.identidade = serverConfigs.identidade || { nomeIgreja: '', logoIgrejaUrl: '' };

            // Popula os campos de identidade
            nomeIgrejaInput.value = configs.identidade.nomeIgreja;
            logoPreview.src = configs.identidade.logoIgrejaUrl || '/pages/logo.tab.png';

            renderizarCategorias();
        } catch (error) {
            // Se der erro (ex: arquivo não existe), usa os padrões.
            console.error('Erro ao carregar configurações:', error);
            alert('Não foi possível carregar as categorias do servidor.');
        }
    };

    const salvarConfigs = async () => {
        try {
            // O backend deve ter uma rota para salvar o objeto de configurações inteiro
            await window.api.post('/api/configs', configs);
            // Dispara um evento para que outros scripts (como o menu.js) saibam que as configs mudaram
            window.dispatchEvent(new CustomEvent('configsUpdated', { detail: configs }));
            // Não mostra alerta para cada pequena mudança, apenas em ações grandes como salvar identidade.
        } catch (error) {
            console.error('Erro ao salvar configurações:', error);
            alert('Não foi possível salvar as configurações no servidor.');
        }
    };

    // --- LÓGICA DE CATEGORIAS ---
    const renderizarCategorias = () => {
        const renderListaSimples = (listaEl, categorias, tipo) => {
            listaEl.innerHTML = '';
            if (!categorias || categorias.length === 0) {
                listaEl.innerHTML = '<li class="mensagem-vazio">Nenhuma categoria cadastrada.</li>';
                return;
            }
            categorias.forEach(cat => {
                const li = document.createElement('li');
                li.innerHTML = `<span>${cat}</span><i class='bx bxs-trash' data-categoria="${cat}" data-tipo="${tipo}"></i>`;
                listaEl.appendChild(li);
            });
        };

        const renderListaFinanceira = (listaEl, categorias, tipo, subtipo) => {
            listaEl.innerHTML = '';
            if (!categorias || categorias.length === 0) {
                listaEl.innerHTML = '<li class="mensagem-vazio">Nenhuma categoria cadastrada.</li>';
                return;
            }
            categorias.forEach(cat => {
                const li = document.createElement('li');
                li.innerHTML = `<span>${cat}</span><i class='bx bxs-trash' data-categoria="${cat}" data-tipo="${tipo}" data-subtipo="${subtipo}"></i>`;
                listaEl.appendChild(li);
            });
        };

        renderListaSimples(listaCatUtensilios, configs.utensilios_categorias, 'utensilios_categorias');
        renderListaSimples(listaCatEventos, configs.eventos_categorias, 'eventos_categorias');
        
        renderListaFinanceira(listaCatEntradas, configs.financeiro_categorias.entradas, 'financeiro_categorias', 'entradas');
        renderListaFinanceira(listaCatSaidas, configs.financeiro_categorias.saidas, 'financeiro_categorias', 'saidas');
    };

    btnsAddCategoria.forEach(btn => {
        btn.addEventListener('click', async () => {
            const tipo = btn.dataset.tipo;
            const subtipo = btn.dataset.subtipo;
            const inputId = subtipo ? `nova-cat-${subtipo}` : `nova-cat-${tipo}`;
            const input = document.getElementById(inputId);
            const novaCategoria = input.value.trim();

            if (novaCategoria) {
                let listaCategorias;
                if (subtipo) {
                    listaCategorias = configs[tipo][subtipo];
                } else {
                    listaCategorias = configs[tipo];
                }

                if (listaCategorias && !listaCategorias.includes(novaCategoria)) {
                    listaCategorias.push(novaCategoria);
                    await salvarConfigs();
                    renderizarCategorias();
                    input.value = '';
                } else {
                    alert('Esta categoria já existe.');
                }
            }
        });
    });    

    document.getElementById('categorias-container').addEventListener('click', async (e) => {
        if (e.target.matches('.bxs-trash')) {
            const categoria = e.target.dataset.categoria;
            const tipo = e.target.dataset.tipo;
            const subtipo = e.target.dataset.subtipo;

            if (confirm(`Tem certeza que deseja remover a categoria "${categoria}"?`)) {
                if (subtipo) {
                    configs[tipo][subtipo] = configs[tipo][subtipo].filter(c => c !== categoria);
                } else {
                    configs[tipo] = configs[tipo].filter(c => c !== categoria);
                }
                await salvarConfigs();
                renderizarCategorias();
            }
        }
    });

    // --- LÓGICA DE GERENCIAMENTO DE USUÁRIOS ---
    const renderizarUsuarios = (usuarios) => {
        listaUsuarios.innerHTML = '';
        if (!usuarios || usuarios.length === 0) {
            listaUsuarios.innerHTML = '<li class="mensagem-vazio">Nenhum usuário cadastrado.</li>';
            return;
        }
        usuarios.forEach(user => {
            const li = document.createElement('li');
            li.innerHTML = `
                <div class="membro-info">
                    <strong>${user.name || user.username}</strong>
                    <span class="membro-funcao">${user.role === 'admin' ? 'Administrador' : 'Operador'}</span>
                </div>
                <div class="acoes-item">
                    <i class='bx bxs-edit' data-id="${user._id}" title="Editar Usuário"></i>
                    <i class='bx bxs-trash' data-id="${user._id}" title="Excluir Usuário"></i>
                </div>
            `;
            listaUsuarios.appendChild(li);
        });
    };

    const carregarUsuarios = async () => {
        try {
            const usuarios = await window.api.get('/api/users');
            renderizarUsuarios(usuarios);
        } catch (error) {
            console.error('Erro ao carregar usuários:', error);
            listaUsuarios.innerHTML = '<li class="mensagem-vazio">Falha ao carregar usuários.</li>';
        }
    };

    const abrirModalUsuario = (usuario = null) => {
        formUsuario.reset();
        usuarioIdInput.value = '';
        document.getElementById('usuario-password').required = true;
        if (usuario) {
            modalUsuarioTitulo.textContent = 'Editar Usuário';
            usuarioIdInput.value = usuario._id;
            usuarioNomeCompletoInput.value = usuario.name || '';
            document.getElementById('usuario-username').value = usuario.username;
            document.getElementById('usuario-role').value = usuario.role;
            document.getElementById('usuario-password').placeholder = "Deixe em branco para não alterar";
            document.getElementById('usuario-password').required = false;
        } else {
            modalUsuarioTitulo.textContent = 'Adicionar Usuário';
            document.getElementById('usuario-password').placeholder = "Digite a nova senha";
            document.getElementById('usuario-password').required = true;
        }
        modalUsuario.style.display = 'flex';
    };

    btnNovoUsuario.addEventListener('click', () => abrirModalUsuario());
    modalUsuario.addEventListener('click', (e) => {
        if (e.target.matches('.modal-overlay') || e.target.closest('[data-close-modal="modal-usuario"]')) {
            modalUsuario.style.display = 'none';
        }
    });

    formUsuario.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = usuarioIdInput.value;
        const dados = {
            name: usuarioNomeCompletoInput.value,
            username: document.getElementById('usuario-username').value,
            password: document.getElementById('usuario-password').value,
            role: document.getElementById('usuario-role').value,
        };
        if (id && !dados.password) {
            delete dados.password;
        }

        try {
            const url = id ? `/api/users/${id}` : '/api/users';
            await window.api.request(url, id ? 'PUT' : 'POST', dados);
            modalUsuario.style.display = 'none';
            carregarUsuarios();
            alert('Usuário salvo com sucesso!');
        } catch (error) {
            alert(`Erro ao salvar usuário: ${error.message}`);
        }
    });

    listaUsuarios.addEventListener('click', async (e) => {
        const id = e.target.dataset.id;
        if (e.target.matches('.bxs-edit')) {
            const usuarios = await window.api.get('/api/users');
            const usuario = usuarios.find(u => u._id === id);
            abrirModalUsuario(usuario);
        } else if (e.target.matches('.bxs-trash')) {
            if (confirm('Tem certeza que deseja excluir este usuário? Esta ação não pode ser desfeita.')) {
                try {
                    await window.api.delete(`/api/users/${id}`);
                    alert('Usuário excluído com sucesso.');
                    carregarUsuarios();
                } catch (error) { alert(`Erro ao excluir usuário: ${error.message}`); }
            }
        }
    });

    // --- LÓGICA DE LOG DE ATIVIDADES ---
    const carregarLogs = async () => {
        try {
            const logs = await window.api.get('/api/logs');
            listaLogs.innerHTML = '';
            if (logs.length === 0) {
                listaLogs.innerHTML = '<li class="mensagem-vazio">Nenhuma atividade registrada.</li>';
                return;
            }
            logs.forEach(log => {
                const li = document.createElement('li');
                li.innerHTML = `
                    <div>
                        <div class="log-item-details"><strong>${log.username}</strong>: ${log.details}</div>
                        <div class="log-item-meta">
                            <span>${new Date(log.createdAt).toLocaleString('pt-BR')}</span>
                            <span>Ação: ${log.action}</span>
                        </div>
                    </div>
                `;
                listaLogs.appendChild(li);
            });
        } catch (error) {
            console.error('Erro ao carregar logs:', error);
            listaLogs.innerHTML = '<li class="mensagem-vazio">Falha ao carregar o log de atividades.</li>';
        }
    };

    // --- INICIALIZAÇÃO ---
    const init = () => {
        carregarConfigs().then(() => {
            carregarAparencia(); // Carrega aparência com base nas configs do servidor
            carregarPerfil();
            carregarUsuarios();
            carregarLogs();
            handleNavigation(); // Navega para a seção correta com base no hash da URL
        });
    };

    init();
});
