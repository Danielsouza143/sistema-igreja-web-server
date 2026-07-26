var iniciarConfiguracoes = () => {
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
    
    // Identidade da Igreja
    const nomeIgrejaInput = document.getElementById('config-nome-igreja');
    const cnpjInput = document.getElementById('config-cnpj');
    const telefoneInput = document.getElementById('config-telefone');
    const enderecoInput = document.getElementById('config-endereco');
    const emailInput = document.getElementById('config-email');
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

    const getAuthHeader = () => {
        try {
            const ui = JSON.parse(localStorage.getItem('userInfo') || 'null');
            if (ui && ui.token) return { 'Authorization': `Bearer ${ui.token}` };
        } catch (e) {}
        return {};
    };

    const salvarConfiguracao = async (path, value) => {
        try {
            await window.api.patch('/api/configs', { [path]: value });
        } catch (error) {
            console.error(`Erro ao salvar a configuração '${path}':`, error);
        }
    };

    // --- SEÇÃO: APARÊNCIA ---
    const carregarAparencia = () => {
        const { aparencia } = configs;
        if (!aparencia) return;
        document.documentElement.style.setProperty('--cor-primaria', aparencia.corPrimaria);
        document.documentElement.style.setProperty('--cor-secundaria', aparencia.corSecundaria);
        if(corPrincipalInput) corPrincipalInput.value = aparencia.corPrimaria;
        if(corSecundariaInput) corSecundariaInput.value = aparencia.corSecundaria;
    };

    const salvarAparencia = () => {
        const aparencia = {
            theme: 'light',
            corPrimaria: corPrincipalInput.value,
            corSecundaria: corSecundariaInput.value
        };
        salvarConfiguracao('aparencia', aparencia);
    };

    if(corPrincipalInput) corPrincipalInput.addEventListener('change', (e) => {
        document.documentElement.style.setProperty('--cor-primaria', e.target.value);
        salvarAparencia();
    });

    if(corSecundariaInput) corSecundariaInput.addEventListener('change', (e) => {
        document.documentElement.style.setProperty('--cor-secundaria', e.target.value);
        salvarAparencia();
    });

    // --- SEÇÃO: IDENTIDADE DA IGREJA ---
    const carregarIdentidade = () => {
        const { identidade } = configs;
        if (!identidade) return;
        
        if(nomeIgrejaInput) nomeIgrejaInput.value = identidade.nomeIgreja || '';
        if(cnpjInput) cnpjInput.value = identidade.cnpj || '';
        if(telefoneInput) telefoneInput.value = identidade.telefone || '';
        if(enderecoInput) enderecoInput.value = identidade.endereco || '';
        if(emailInput) emailInput.value = identidade.email || '';
        
        if(logoPreview) {
            logoPreview.innerHTML = ''; 
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
                icon.style.color = 'var(--cor-primaria)';
                logoPreview.appendChild(icon);
            }
        }
    };

    if(btnTrocarLogo) btnTrocarLogo.addEventListener('click', () => logoUploadInput.click());

    if(logoUploadInput) {
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
    }

    if(btnConfirmarCorte) {
        btnConfirmarCorte.addEventListener('click', () => {
            if (!cropper) return;
            cropper.getCroppedCanvas({ width: 512, height: 512 }).toBlob((blob) => {
                croppedLogoBlob = blob;
                logoPreview.innerHTML = `<img src="${URL.createObjectURL(blob)}" style="width:100px; height:100px; border-radius:50%; object-fit:cover;">`;
                modalCropLogo.style.display = 'none';
                cropper.destroy();
            }, 'image/png');
        });
    }

    if(modalCropLogo) {
        modalCropLogo.addEventListener('click', (e) => {
            if (e.target.matches('.modal-overlay') || e.target.closest('[data-close-modal]')) {
                modalCropLogo.style.display = 'none';
                if (cropper) cropper.destroy();
            }
        });
    }

    if(btnSalvarIdentidade) {
        btnSalvarIdentidade.addEventListener('click', async () => {
            btnSalvarIdentidade.disabled = true;
            btnSalvarIdentidade.textContent = 'Salvando...';
            
            const nomeIgreja = nomeIgrejaInput ? nomeIgrejaInput.value.trim() : '';
            const cnpj = cnpjInput ? cnpjInput.value.trim() : '';
            const telefone = telefoneInput ? telefoneInput.value.trim() : '';
            const endereco = enderecoInput ? enderecoInput.value.trim() : '';
            const email = emailInput ? emailInput.value.trim() : '';

            try {
                if (croppedLogoBlob) {
                    const formData = new FormData();
                    formData.append('nomeIgreja', nomeIgreja);
                    formData.append('cnpj', cnpj);
                    formData.append('telefone', telefone);
                    formData.append('endereco', endereco);
                    formData.append('email', email);
                    formData.append('logo', croppedLogoBlob, 'logo.png');

                    try {
                        await window.api.post('/api/configs/upload-logo', formData);
                    } catch (err) {
                        const headers = getAuthHeader();
                        await fetch('/api/configs/upload-logo', {
                            method: 'POST',
                            body: formData,
                            headers: headers
                        });
                    }
                } else {
                    await window.api.patch('/api/configs', {
                        'identidade.nomeIgreja': nomeIgreja,
                        'identidade.cnpj': cnpj,
                        'identidade.telefone': telefone,
                        'identidade.endereco': endereco,
                        'identidade.email': email
                    });
                }
                croppedLogoBlob = null;
                await carregarConfigs();
                window.dispatchEvent(new CustomEvent('churchIdentityUpdated', { detail: { ...configs.identidade } }));
                alert('Identidade da igreja salva com sucesso!');
            } catch (error) {
                alert(`Falha ao salvar a identidade: ${error.message || error}`);
            } finally {
                btnSalvarIdentidade.disabled = false;
                btnSalvarIdentidade.textContent = 'Salvar Identidade';
            }
        });
    }

    // --- SEÇÃO: CATEGORIAS ---
    const renderizarCategorias = () => {
        const renderLista = (listaEl, categorias, tipo, subtipo = null) => {
            if(!listaEl) return;
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

    if(categoriasContainer) {
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
    }

    // --- SEÇÕES DE PERFIL E USUÁRIOS ---
    const carregarPerfil = async () => {
        const userInfo = JSON.parse(localStorage.getItem('userInfo'));
        if (!userInfo) return;
        if(perfilNomeCompletoInput) perfilNomeCompletoInput.value = userInfo.name || '';
        if(perfilUsernameInput) perfilUsernameInput.value = userInfo.username || '';
    };

    if(btnSalvarPerfil) {
        btnSalvarPerfil.addEventListener('click', async (e) => {
            e.preventDefault();
            const userInfo = JSON.parse(localStorage.getItem('userInfo'));
            const nomeCompleto = perfilNomeCompletoInput.value;
            try {
                const updatedUser = await window.api.put(`/api/users/${userInfo.id}`, { name: nomeCompleto });
                const currentUserInfo = JSON.parse(localStorage.getItem('userInfo'));
                const newUserInfo = { ...currentUserInfo, ...updatedUser };
                localStorage.setItem('userInfo', JSON.stringify(newUserInfo));
                if(window.updateUserDisplay) window.updateUserDisplay();
                alert('Nome atualizado com sucesso!');
            } catch (error) { alert(`Erro ao atualizar o nome: ${error.message}`); }
        });
    }

    if(btnSalvarSenha) {
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
    }

    const carregarUsuarios = async () => {
        if(!listaUsuarios) return;
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
        if(formUsuario) formUsuario.reset();
        if(usuarioIdInput) usuarioIdInput.value = '';
        const passInput = document.getElementById('usuario-password');
        if(passInput) passInput.required = true;

        if (usuario) {
            if(modalUsuarioTitulo) modalUsuarioTitulo.textContent = 'Editar Usuário';
            if(usuarioIdInput) usuarioIdInput.value = usuario._id;
            if(usuarioNomeCompletoInput) usuarioNomeCompletoInput.value = usuario.name || '';
            document.getElementById('usuario-username').value = usuario.username;
            document.getElementById('usuario-role').value = usuario.role;
            if(passInput) {
                passInput.placeholder = "Deixe em branco para não alterar";
                passInput.required = false;
            }
        } else {
            if(modalUsuarioTitulo) modalUsuarioTitulo.textContent = 'Adicionar Usuário';
            if(passInput) {
                passInput.placeholder = "Digite a nova senha";
                passInput.required = true;
            }
        }
        if(modalUsuario) modalUsuario.style.display = 'flex';
    };

    if(listaUsuarios) {
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
    }

    if(btnNovoUsuario) btnNovoUsuario.addEventListener('click', () => abrirModalUsuario());
    if(modalUsuario) {
        modalUsuario.addEventListener('click', (e) => {
            if (e.target.matches('.modal-overlay') || e.target.closest('[data-close-modal="modal-usuario"]')) {
                modalUsuario.style.display = 'none';
            }
        });
    }

    if(formUsuario) {
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
    }

    const carregarLogs = async () => {
        if(!listaLogs) return;
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
            console.error('Erro ao carregar configurações:', error);
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
};

document.addEventListener('DOMContentLoaded', iniciarConfiguracoes);
document.body.addEventListener('htmx:afterSwap', iniciarConfiguracoes);
if (document.readyState !== 'loading') iniciarConfiguracoes();
