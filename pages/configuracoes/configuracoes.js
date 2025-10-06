document.addEventListener('DOMContentLoaded', () => {
    // --- ESTADO DA APLICAÇÃO ---
    let configs = {};
    let cropper;
    let croppedLogoBlob = null;

    // --- SELETORES DO DOM ---
    const navLinks = document.querySelectorAll('.config-nav-link');
    const sections = document.querySelectorAll('.config-section');
    const themeButtons = document.querySelectorAll('.theme-btn');
    const corPrincipalInput = document.getElementById('cor-principal');
    const perfilNomeCompletoInput = document.getElementById('perfil-nome-completo');
    const perfilUsernameInput = document.getElementById('perfil-username');
    const btnSalvarPerfil = document.getElementById('btn-salvar-perfil');
    const btnSalvarSenha = document.getElementById('btn-salvar-senha');
    const nomeIgrejaInput = document.getElementById('config-nome-igreja');
    const logoPreview = document.getElementById('logo-preview');
    const btnTrocarLogo = document.getElementById('btn-trocar-logo');
    const logoUploadInput = document.getElementById('logo-upload-input');
    const btnSalvarIdentidade = document.getElementById('btn-salvar-identidade');
    const categoriasContainer = document.getElementById('categorias-container');
    const btnExportar = document.getElementById('btn-exportar-dados');
    const btnImportar = document.getElementById('btn-importar-dados');
    const importFileInput = document.getElementById('import-file-input');
    const listaUsuarios = document.getElementById('lista-usuarios');
    const btnNovoUsuario = document.getElementById('btn-novo-usuario');
    const modalUsuario = document.getElementById('modal-usuario');
    const formUsuario = document.getElementById('form-usuario');
    const modalUsuarioTitulo = document.getElementById('modal-usuario-titulo');
    const usuarioIdInput = document.getElementById('usuario-id');
    const usuarioNomeCompletoInput = document.getElementById('usuario-nome-completo');
    const listaLogs = document.getElementById('lista-logs');

    // Seletores do Modal de Corte
    const modalCropLogo = document.getElementById('modal-crop-logo');
    const imageToCrop = document.getElementById('image-to-crop');
    const btnConfirmarCorte = document.getElementById('btn-confirmar-corte');

    // --- LÓGICA DE NAVEGAÇÃO ---
    const handleNavigation = () => {
        const hash = window.location.hash || '#perfil';
        navLinks.forEach(link => link.classList.toggle('active', link.getAttribute('href') === hash));
        sections.forEach(section => section.classList.toggle('active', `#${section.id}` === hash));
    };
    navLinks.forEach(link => link.addEventListener('click', e => {
        e.preventDefault();
        window.location.hash = link.getAttribute('href');
    }));
    window.addEventListener('hashchange', handleNavigation);

    // --- LÓGICA PRINCIPAL DE CONFIGURAÇÕES ---
    const salvarConfiguracao = async (key, value) => {
        try {
            await window.api.request('/api/configs', 'PATCH', { [key]: value });
        } catch (error) {
            console.error(`Erro ao salvar a configuração '${key}':`, error);
            alert(`Não foi possível salvar a configuração: ${error.message}`);
        }
    };

    const carregarConfigs = async () => {
        try {
            const serverConfigs = await window.api.get('/api/configs') || {};
            configs = serverConfigs;
            carregarAparencia();
            carregarIdentidade();
            renderizarCategorias();
        } catch (error) {
            console.error('Erro fatal ao carregar configurações:', error);
            alert('Não foi possível carregar as configurações do servidor. A página pode não funcionar corretamente.');
        }
    };

    // --- SEÇÃO: APARÊNCIA ---
    const carregarAparencia = () => {
        const { aparencia } = configs;
        if (!aparencia) return;
        document.body.dataset.theme = aparencia.theme;
        document.documentElement.style.setProperty('--cor-primaria', aparencia.corPrimaria);
        themeButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.theme === aparencia.theme));
        corPrincipalInput.value = aparencia.corPrimaria;
    };

    themeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const newTheme = btn.dataset.theme;
            document.body.dataset.theme = newTheme;
            themeButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            salvarConfiguracao('aparencia.theme', newTheme);
        });
    });

    corPrincipalInput.addEventListener('change', (e) => {
        const newColor = e.target.value;
        document.documentElement.style.setProperty('--cor-primaria', newColor);
        salvarConfiguracao('aparencia.corPrimaria', newColor);
    });

    // --- SEÇÃO: IDENTIDADE DA IGREJA (COM MODAL DE CORTE) ---
    const carregarIdentidade = () => {
        const { identidade } = configs;
        if (!identidade) return;
        nomeIgrejaInput.value = identidade.nomeIgreja;
        logoPreview.src = window.api.getImageUrl(identidade.logoIgrejaUrl) || '/pages/logo.tab.png';
    };

    btnTrocarLogo.addEventListener('click', () => logoUploadInput.click());

    logoUploadInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            imageToCrop.src = event.target.result;
            modalCropLogo.style.display = 'flex';
            cropper = new Cropper(imageToCrop, {
                aspectRatio: 1 / 1,
                viewMode: 1,
                background: false,
            });
        };
        reader.readAsDataURL(file);
        logoUploadInput.value = ''; // Limpa o input para permitir selecionar o mesmo arquivo novamente
    });

    btnConfirmarCorte.addEventListener('click', () => {
        if (!cropper) return;
        cropper.getCroppedCanvas({
            width: 512,
            height: 512,
            imageSmoothingQuality: 'high',
        }).toBlob((blob) => {
            croppedLogoBlob = blob;
            logoPreview.src = URL.createObjectURL(blob);
            modalCropLogo.style.display = 'none';
            cropper.destroy();
        }, 'image/png');
    });

    modalCropLogo.addEventListener('click', (e) => {
        if (e.target.matches('.modal-overlay') || e.target.closest('[data-close-modal]')) {
            modalCropLogo.style.display = 'none';
            if (cropper) cropper.destroy();
        }
    });

    btnSalvarIdentidade.addEventListener('click', async () => {
        btnSalvarIdentidade.disabled = true;
        btnSalvarIdentidade.textContent = 'Salvando...';

        const nomeIgreja = nomeIgrejaInput.value.trim();

        try {
            // Se um novo logo foi cortado, usa a rota de upload
            if (croppedLogoBlob) {
                const formData = new FormData();
                formData.append('nomeIgreja', nomeIgreja);
                // O terceiro parâmetro define o nome do arquivo no backend
                formData.append('logo', croppedLogoBlob, 'logo.png');
                await window.api.post('/api/configs/upload-logo', formData);
            } else {
                // Se apenas o nome mudou, usa a rota de patch
                await salvarConfiguracao('identidade.nomeIgreja', nomeIgreja);
            }

            croppedLogoBlob = null; // Limpa o blob após o envio
            await carregarConfigs();

            window.dispatchEvent(new CustomEvent('churchIdentityUpdated', {
                detail: { ...configs.identidade }
            }));

            alert('Identidade da igreja salva com sucesso!');
        } catch (error) {
            console.error('Erro ao salvar identidade:', error);
            alert(`Falha ao salvar a identidade: ${error.message}`);
        } finally {
            btnSalvarIdentidade.disabled = false;
            btnSalvarIdentidade.textContent = 'Salvar Identidade';
        }
    });

    // --- SEÇÃO: CATEGORIAS ---
    const renderizarCategorias = () => {
        const renderLista = (listaEl, categorias, tipo, subtipo = null) => {
            listaEl.innerHTML = '';
            if (!categorias || categorias.length === 0) {
                listaEl.innerHTML = '<li class="mensagem-vazio">Nenhuma categoria.</li>';
                return;
            }
            categorias.forEach(cat => {
                const li = document.createElement('li');
                li.innerHTML = `<span>${cat}</span><i class='bx bxs-trash' data-categoria="${cat}" data-tipo="${tipo}" ${subtipo ? `data-subtipo="${subtipo}"` : ''}></i>`;
                listaEl.appendChild(li);
            });
        };

        renderLista(document.getElementById('lista-cat-utensilios'), configs.utensilios_categorias, 'utensilios_categorias');
        renderLista(document.getElementById('lista-cat-eventos'), configs.eventos_categorias, 'eventos_categorias');
        if (configs.financeiro_categorias) {
            renderLista(document.getElementById('lista-cat-entradas'), configs.financeiro_categorias.entradas, 'financeiro_categorias', 'entradas');
            renderLista(document.getElementById('lista-cat-saidas'), configs.financeiro_categorias.saidas, 'financeiro_categorias', 'saidas');
        }
    };

    categoriasContainer.addEventListener('click', async (e) => {
        if (e.target.matches('.btn-add-categoria')) {
            const tipo = e.target.dataset.tipo;
            const subtipo = e.target.dataset.subtipo;
            const input = e.target.previousElementSibling;
            const novaCategoria = input.value.trim();

            if (novaCategoria) {
                const path = subtipo ? `${tipo}.${subtipo}` : tipo;
                const listaAtual = subtipo ? configs[tipo][subtipo] : configs[tipo];
                
                if (listaAtual && !listaAtual.includes(novaCategoria)) {
                    const novaLista = [...listaAtual, novaCategoria];
                    await salvarConfiguracao(path, novaLista);
                    if (subtipo) configs[tipo][subtipo] = novaLista; else configs[tipo] = novaLista;
                    renderizarCategorias();
                    input.value = '';
                } else {
                    alert('Esta categoria já existe.');
                }
            }
        }

        if (e.target.matches('.bxs-trash')) {
            const categoria = e.target.dataset.categoria;
            const tipo = e.target.dataset.tipo;
            const subtipo = e.target.dataset.subtipo;

            if (confirm(`Tem certeza que deseja remover a categoria "${categoria}"?`)) {
                const path = subtipo ? `${tipo}.${subtipo}` : tipo;
                const listaAtual = subtipo ? configs[tipo][subtipo] : configs[tipo];
                const novaLista = listaAtual.filter(c => c !== categoria);
                await salvarConfiguracao(path, novaLista);
                if (subtipo) configs[tipo][subtipo] = novaLista; else configs[tipo] = novaLista;
                renderizarCategorias();
            }
        }
    });

    // --- SEÇÃO: BACKUP E RESTAURAÇÃO ---
    btnExportar.addEventListener('click', () => {
        window.open('/api/configs/export', '_blank');
    });

    btnImportar.addEventListener('click', () => importFileInput.click());

    importFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!confirm("ATENÇÃO: Importar um backup substituirá TODAS as configurações atuais. Deseja continuar?")) {
            return;
        }

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const importData = JSON.parse(event.target.result);
                await window.api.post('/api/configs/import', importData);
                alert('Configurações importadas com sucesso! A página será recarregada para aplicar as alterações.');
                window.location.reload();
            } catch (error) {
                console.error('Erro ao importar configurações:', error);
                alert(`Falha na importação: ${error.message}`);
            }
        };
        reader.readAsText(file);
    });

    // --- SEÇÕES QUE JÁ FUNCIONAVAM (Lógica mantida) ---
    const carregarPerfil = async () => {
        const userInfo = JSON.parse(localStorage.getItem('userInfo'));
        if (!userInfo) return;
        perfilNomeCompletoInput.value = userInfo.name || '';
        perfilUsernameInput.value = userInfo.username || '';
    };

    btnSalvarPerfil.addEventListener('click', async (e) => {
        e.preventDefault();
        const userInfo = JSON.parse(localStorage.getItem('userInfo'));
        const nomeCompleto = perfilNomeCompletoInput.value;
        try {
            await window.api.put(`/api/users/${userInfo.id}`, { name: nomeCompleto });
            userInfo.name = nomeCompleto;
            localStorage.setItem('userInfo', JSON.stringify(userInfo));
            window.updateUserDisplay();
            alert('Nome atualizado com sucesso!');
        } catch (error) {
            alert(`Erro ao atualizar o nome: ${error.message}`);
        }
    });

    btnSalvarSenha.addEventListener('click', async () => {
        const currentPassword = document.getElementById('perfil-senha-atual').value;
        const newPassword = document.getElementById('perfil-nova-senha').value;
        const confirmPassword = document.getElementById('perfil-confirmar-senha').value;
        if (!currentPassword || !newPassword) return alert('Por favor, preencha a senha atual e a nova senha.');
        if (newPassword !== confirmPassword) return alert('A nova senha e a confirmação não coincidem.');
        if (newPassword.length < 6) return alert('A nova senha deve ter pelo menos 6 caracteres.');
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

    const carregarUsuarios = async () => {
        try {
            const usuarios = await window.api.get('/api/users');
            listaUsuarios.innerHTML = '';
            if (!usuarios || usuarios.length === 0) {
                listaUsuarios.innerHTML = '<li class="mensagem-vazio">Nenhum usuário cadastrado.</li>';
                return;
            }
            usuarios.forEach(user => {
                const li = document.createElement('li');
                li.innerHTML = `
                    <div class="membro-info"><strong>${user.name || user.username}</strong><span class="membro-funcao">${user.role === 'admin' ? 'Administrador' : 'Operador'}</span></div>
                    <div class="acoes-item"><i class='bx bxs-edit' data-id="${user._id}"></i><i class='bx bxs-trash' data-id="${user._id}"></i></div>
                `;
                listaUsuarios.appendChild(li);
            });
        } catch (error) {
            listaUsuarios.innerHTML = '<li class="mensagem-vazio">Falha ao carregar usuários.</li>';
        }
    };

    listaUsuarios.addEventListener('click', async (e) => {
        const id = e.target.dataset.id;
        if (e.target.matches('.bxs-edit')) {
            const usuarios = await window.api.get('/api/users');
            const usuario = usuarios.find(u => u._id === id);
            abrirModalUsuario(usuario);
        } else if (e.target.matches('.bxs-trash')) {
            if (confirm('Tem certeza que deseja excluir este usuário?')) {
                try {
                    await window.api.delete(`/api/users/${id}`);
                    carregarUsuarios();
                } catch (error) { alert(`Erro ao excluir usuário: ${error.message}`); }
            }
        }
    });

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
        if (id && !dados.password) delete dados.password;
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
                        <div class="log-item-meta"><span>${new Date(log.createdAt).toLocaleString('pt-BR')}</span><span>Ação: ${log.action}</span></div>
                    </div>
                `;
                listaLogs.appendChild(li);
            });
        } catch (error) {
            listaLogs.innerHTML = '<li class="mensagem-vazio">Falha ao carregar o log de atividades.</li>';
        }
    };

    // --- INICIALIZAÇÃO ---
    const init = () => {
        carregarConfigs().then(() => {
            carregarPerfil();
            carregarUsuarios();
            carregarLogs();
            handleNavigation();
        });
    };

    init();
});
