document.addEventListener('DOMContentLoaded', () => {
    // --- ESTADO DA APLICAÇÃO ---
    let configs = {};
    let cropper;
    let croppedLogoBlob = null;

    // --- SELETORES DO DOM ---
    const navLinks = document.querySelectorAll('.config-nav-link');
    const sections = document.querySelectorAll('.config-section');
    const corPrincipalInput = document.getElementById('cor-principal');
    const corSecundariaInput = document.getElementById('cor-secundaria');
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
    const listaUsuarios = document.getElementById('lista-usuarios');
    const btnNovoUsuario = document.getElementById('btn-novo-usuario');
    const modalUsuario = document.getElementById('modal-usuario');
    const formUsuario = document.getElementById('form-usuario');
    const modalUsuarioTitulo = document.getElementById('modal-usuario-titulo');
    const usuarioIdInput = document.getElementById('usuario-id');
    const usuarioNomeCompletoInput = document.getElementById('usuario-nome-completo');
    const listaLogs = document.getElementById('lista-logs');
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

    // --- HELPERS ---
    const buildNestedPayload = (path, value) => {
        // transforma 'a.b.c' + value => { a: { b: { c: value } } }
        if (!path || typeof path !== 'string') return value;
        const keys = path.split('.');
        return keys.reduceRight((acc, key) => ({ [key]: acc }), value);
    };

    const getAuthHeader = () => {
        try {
            const ui = JSON.parse(localStorage.getItem('userInfo') || 'null');
            if (ui && ui.token) return { 'Authorization': `Bearer ${ui.token}` };
        } catch (e) { /* ignore */ }
        return {};
    };

    // --- LÓGICA PRINCIPAL DE CONFIGURAÇÕES ---
    const salvarConfiguracao = async (path, value) => {
        try {
            await window.api.patch('/api/configs', { [key]: value });
        } catch (error) {
            console.error(`Erro ao salvar a configuração '${path}':`, error);
            alert(`Não foi possível salvar a configuração: ${error.message || error}`);
        }
    };

    // --- SEÇÃO: APARÊNCIA (Simplificada) ---
    const carregarAparencia = () => {
        const { aparencia } = configs;
        if (!aparencia) return;
        document.documentElement.style.setProperty('--cor-primaria', aparencia.corPrimaria);
        document.documentElement.style.setProperty('--cor-secundaria', aparencia.corSecundaria);
        corPrincipalInput.value = aparencia.corPrimaria;
        corSecundariaInput.value = aparencia.corSecundaria;
    };

    const salvarAparencia = () => {
        const aparencia = {
            theme: 'light', // Hardcoded
            corPrimaria: corPrincipalInput.value,
            corSecundaria: corSecundariaInput.value
        };
        salvarConfiguracao('aparencia', aparencia);
    };

    corPrincipalInput.addEventListener('change', (e) => {
        document.documentElement.style.setProperty('--cor-primaria', e.target.value);
        salvarAparencia();
    });

    corSecundariaInput.addEventListener('change', (e) => {
        document.documentElement.style.setProperty('--cor-secundaria', e.target.value);
        salvarAparencia();
    });

    // --- SEÇÃO: IDENTIDADE DA IGREJA ---
    const carregarIdentidade = () => {
        const { identidade } = configs;
        if (!identidade) return;
        nomeIgrejaInput.value = identidade.nomeIgreja;
        
        // Dynamic logo/icon display
        logoPreview.innerHTML = ''; // Clear existing content
        if (identidade.logoIgrejaUrl) {
            const img = document.createElement('img');
            img.src = identidade.logoIgrejaUrl;
            img.alt = "Logo da Igreja";
            img.style.width = '100px';
            img.style.height = '100px';
            img.style.borderRadius = '50%';
            img.style.objectFit = 'cover';
            logoPreview.appendChild(img);
        } else {
            const icon = document.createElement('i');
            icon.className = 'bx bx-church';
            icon.style.fontSize = '100px';
            icon.style.color = 'var(--cor-primaria)'; // Use primary color for the icon
            logoPreview.appendChild(icon);
        }
    };

    btnTrocarLogo.addEventListener('click', () => logoUploadInput.click());

    logoUploadInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            imageToCrop.src = event.target.result;
            modalCropLogo.style.display = 'flex';
            cropper = new Cropper(imageToCrop, { aspectRatio: 1, viewMode: 1, background: false });
        };
        reader.readAsDataURL(file);
        logoUploadInput.value = '';
    });

    btnConfirmarCorte.addEventListener('click', () => {
        if (!cropper) return;
        cropper.getCroppedCanvas({ width: 512, height: 512 }).toBlob((blob) => {
            croppedLogoBlob = blob;
            logoPreview.innerHTML = `<img src="${URL.createObjectURL(blob)}" style="width:100px; height:100px; border-radius:50%; object-fit:cover;">`;
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
            if (croppedLogoBlob) {
                const formData = new FormData();
                formData.append('nomeIgreja', nomeIgreja);
                formData.append('logo', croppedLogoBlob, 'logo.png');

                try {
                    // Tenta pelo wrapper (se suportar FormData)
                    await window.api.post('/api/configs/upload-logo', formData);
                } catch (err) {
                    console.warn('[config] window.api.post falhou para FormData, tentando fetch direto', err);
                    // Fallback: fetch direto (não setar Content-Type)
                    const headers = getAuthHeader();
                    await fetch('/api/configs/upload-logo', {
                        method: 'POST',
                        body: formData,
                        headers: headers
                    }).then(res => {
                        if (!res.ok) throw new Error(`Upload falhou: ${res.status} ${res.statusText}`);
                        return res.json().catch(()=>null);
                    });
                }
            } else {
                await salvarConfiguracao('identidade.nomeIgreja', nomeIgreja);
            }
            croppedLogoBlob = null;
            await carregarConfigs();
            window.dispatchEvent(new CustomEvent('churchIdentityUpdated', { detail: { ...configs.identidade } }));
            alert('Identidade da igreja salva com sucesso!');
        } catch (error) {
            console.error('Erro ao salvar identidade:', error);
            alert(`Falha ao salvar a identidade: ${error.message || error}`);
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
                } else { alert('Esta categoria já existe.'); }
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



    // --- SEÇÕES DE PERFIL E USUÁRIOS ---
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
            const updatedUser = await window.api.put(`/api/users/${userInfo.id}`, { name: nomeCompleto });
            const currentUserInfo = JSON.parse(localStorage.getItem('userInfo'));
            const newUserInfo = { ...currentUserInfo, ...updatedUser };
            localStorage.setItem('userInfo', JSON.stringify(newUserInfo));
            window.updateUserDisplay();
            alert('Nome atualizado com sucesso!');
        } catch (error) { alert(`Erro ao atualizar o nome: ${error.message}`); }
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
        } catch (error) { alert(`Erro ao alterar a senha: ${error.message}`); }
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
                li.innerHTML = `<div class="membro-info"><strong>${user.name || user.username}</strong><span class="membro-funcao">${user.role === 'admin' ? 'Administrador' : 'Operador'}</span></div><div class="acoes-item"><i class='bx bxs-edit' data-id="${user._id}"></i><i class='bx bxs-trash' data-id="${user._id}"></i></div>`;
                listaUsuarios.appendChild(li);
            });
        } catch (error) { listaUsuarios.innerHTML = '<li class="mensagem-vazio">Falha ao carregar usuários.</li>'; }
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

    btnNovoUsuario.addEventListener('click', () => abrirModalUsuario());
    modalUsuario.addEventListener('click', (e) => {
        if (e.target.matches('.modal-overlay') || e.target.closest('[data-close-modal="modal-usuario"]')) {
            modalUsuario.style.display = 'none';
        }
    });

    formUsuario.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = usuarioIdInput.value;
        const dados = { name: usuarioNomeCompletoInput.value, username: document.getElementById('usuario-username').value, password: document.getElementById('usuario-password').value, role: document.getElementById('usuario-role').value };
        if (id && !dados.password) delete dados.password;
        try {
            const url = id ? `/api/users/${id}` : '/api/users';
            if (id) { await window.api.put(url, dados); } else { await window.api.post(url, dados); }
            modalUsuario.style.display = 'none';
            carregarUsuarios();
            alert('Usuário salvo com sucesso!');
        } catch (error) { alert(`Erro ao salvar usuário: ${error.message}`); }
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
                li.innerHTML = `<div><div class="log-item-details"><strong>${log.username}</strong>: ${log.details}</div><div class="log-item-meta"><span>${new Date(log.createdAt).toLocaleString('pt-BR')}</span><span>Ação: ${log.action}</span></div></div>`;
                listaLogs.appendChild(li);
            });
        } catch (error) { listaLogs.innerHTML = '<li class="mensagem-vazio">Falha ao carregar o log de atividades.</li>'; }
    };

    // --- INICIALIZAÇÃO ---
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
