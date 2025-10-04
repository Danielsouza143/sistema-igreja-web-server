document.addEventListener('DOMContentLoaded', () => {
    // --- ESTADO DA APLICAÇÃO ---
    let inventario = [];
    let emprestimos = [];
    let manutencoes = [];
    let membros = [];
    let fotoCortadaBlob = null;

    // --- SELETORES DO DOM ---
    const corpoTabelaInventario = document.getElementById('corpo-tabela-inventario');
    const corpoTabelaEmprestimos = document.getElementById('corpo-tabela-emprestimos');
    const corpoTabelaManutencao = document.getElementById('corpo-tabela-manutencao');
    
    // --- SELETORES DO MODAL ---
    const modalItem = document.getElementById('modal-item');
    const formItem = document.getElementById('form-item');
    const modalItemTitulo = document.getElementById('modal-item-titulo');
    const itemIdInput = document.getElementById('item-id');
    const btnNovoItem = document.getElementById('btn-novo-item');
    const btnsFecharModal = document.querySelectorAll('[data-close]');
    const selectCategoriaModal = document.getElementById('item-categoria');
    const fotoPreview = document.getElementById('foto-preview');

    // --- SELETORES DO CROPPER ---
    const btnEscolherFoto = document.getElementById('btn-escolher-foto');
    const itemFotoUpload = document.getElementById('item-foto-upload');
    const modalCropper = document.getElementById('modal-cropper');
    const imageToCrop = document.getElementById('image-to-crop');
    const btnCortar = document.getElementById('btn-cortar');
    let cropper;

    // --- SELETORES DO MODAL DE DETALHES ---
    const modalDetalhes = document.getElementById('modal-detalhes');
    const corpoDetalhes = document.getElementById('detalhes-item-corpo');

    // --- SELETORES DO MODAL DE EMPRÉSTIMO ---
    const btnNovoEmprestimo = document.getElementById('btn-novo-emprestimo');
    const modalEmprestimo = document.getElementById('modal-emprestimo');
    const formEmprestimo = document.getElementById('form-emprestimo');

    // --- SELETORES DO MODAL DE MANUTENÇÃO ---
    const btnNovaManutencao = document.getElementById('btn-nova-manutencao');
    const modalManutencao = document.getElementById('modal-manutencao');
    const formManutencao = document.getElementById('form-manutencao');
    const manutencaoItemSelect = document.getElementById('manutencao-item-select');
    const manutencaoSelectContainer = document.getElementById('manutencao-select-container');
    const manutencaoTextoItem = document.getElementById('manutencao-texto-item-selecionado');


    // --- FUNÇÕES DE RENDERIZAÇÃO ---
    const renderizarTabelaInventario = () => {
        corpoTabelaInventario.innerHTML = '';
        if (inventario.length === 0) {
            corpoTabelaInventario.innerHTML = '<tr><td colspan="5" class="mensagem-vazio">Nenhum utensílio cadastrado.</td></tr>';
            return;
        }
        inventario.forEach(item => {
            const tr = document.createElement('tr');
            tr.dataset.id = item._id;
            tr.innerHTML = `
                <td data-label="Foto"><img src="${item.fotoUrl || '/assets/placeholder-image.png'}" alt="Foto de ${item.nome}" class="foto-tabela"></td>
                <td data-label="Nome">${item.nome}</td>
                <td>${item.categoria}</td>
                <td data-label="Quantidade">${item.quantidade}</td>
                <td data-label="Status"><span class="status-badge status-${item.status.toLowerCase().replace(/\s+/g, '-')}">${item.status}</span></td>
                <td class="acoes-item">
                    <i class='bx bxs-edit' data-id="${item._id}" title="Editar"></i>
                    <i class='bx bxs-wrench' data-id="${item._id}" title="Enviar para Manutenção"></i>
                    <i class='bx bxs-trash' data-id="${item._id}" title="Excluir"></i>
                </td>
            `;
            corpoTabelaInventario.appendChild(tr);
        });

        corpoTabelaInventario.querySelectorAll('tr').forEach(row => {
            row.addEventListener('click', (e) => {
                const itemId = e.target.dataset.id;
                if (e.target.matches('.bxs-edit')) {
                    const item = inventario.find(i => i._id === itemId);
                    abrirModalItem(item);
                } else if (e.target.matches('.bxs-wrench')) {
                    const item = inventario.find(i => i._id === itemId);
                    abrirModalManutencao(item);
                } else if (e.target.matches('.bxs-trash')) {
                    // Adicionar lógica de exclusão aqui
                } else {
                    handleRowClick(e, inventario);
                }
            });
        });
    };

    const renderizarTabelaEmprestimos = () => {
        corpoTabelaEmprestimos.innerHTML = '';
        if (emprestimos.length === 0) {
            corpoTabelaEmprestimos.innerHTML = '<tr><td colspan="5" class="mensagem-vazio">Nenhum empréstimo registrado.</td></tr>';
            return;
        }
        emprestimos.forEach(emp => {
            const hoje = new Date();
            hoje.setHours(0, 0, 0, 0);
            const dataDevolucao = new Date(emp.dataDevolucaoPrevista);
            let status = emp.status;
            if (status === 'Emprestado' && hoje > dataDevolucao) {
                status = 'Atrasado';
            }

            const tr = document.createElement('tr');
            tr.dataset.id = emp.utensilioId?._id;
            tr.innerHTML = `
                <td data-label="Foto"><img src="${emp.utensilioId?.fotoUrl || '/assets/placeholder-image.png'}" alt="Foto de ${emp.utensilioId?.nome}" class="foto-tabela"></td>
                <td data-label="Item">${emp.utensilioId?.nome || 'Item não encontrado'}</td>
                <td data-label="Membro">${emp.membroId?.nome || 'Membro não encontrado'}</td>
                <td data-label="Data Empréstimo">${new Date(emp.dataEmprestimo).toLocaleDateString('pt-BR')}</td>
                <td data-label="Devolução Prevista">${dataDevolucao.toLocaleDateString('pt-BR')}</td>
                <td data-label="Status"><span class="status-badge status-${status.toLowerCase().replace(/\s+/g, '-')}">${status}</span></td>
            `;
            corpoTabelaEmprestimos.appendChild(tr);
        });

        corpoTabelaEmprestimos.querySelectorAll('tr').forEach(row => {
            row.addEventListener('click', (e) => handleRowClick(e, inventario));
        });
    };

    const renderizarTabelaManutencao = () => {
        corpoTabelaManutencao.innerHTML = '';
        if (manutencoes.length === 0) {
            corpoTabelaManutencao.innerHTML = '<tr><td colspan="5" class="mensagem-vazio">Nenhum item em manutenção.</td></tr>';
            return;
        }
        manutencoes.forEach(item => {
            const tr = document.createElement('tr');
            tr.dataset.id = item._id;
            tr.innerHTML = `
                <td data-label="Foto"><img src="${item.fotoUrl || '/assets/placeholder-image.png'}" alt="Foto de ${item.nome}" class="foto-tabela"></td>
                <td data-label="Item">${item.nome}</td>
                <td data-label="Quantidade">${item.quantidade}</td>
                <td data-label="Início Manutenção">${item.dataManutencao ? new Date(item.dataManutencao).toLocaleDateString('pt-BR') : 'Não informado'}</td>
                <td data-label="Observações">${item.observacoesManutencao || 'Nenhuma'}</td>
                <td class="acoes-item">
                    <i class='bx bxs-check-square' data-id="${item._id}" title="Marcar como Disponível"></i>
                    <i class='bx bxs-trash' data-id="${item._id}" title="Excluir Item"></i>
                </td>
            `;
            corpoTabelaManutencao.appendChild(tr);
        });

        // Adiciona os event listeners para as ações e para o clique na linha
        corpoTabelaManutencao.querySelectorAll('tr').forEach(row => {
            row.addEventListener('click', (e) => {
                const itemId = e.target.dataset.id;
                if (e.target.matches('.bxs-check-square')) {
                    marcarComoDisponivel(itemId);
                } else if (e.target.matches('.bxs-trash')) {
                    // Adicionar lógica de exclusão aqui
                } else {
                    // Se não clicou em um ícone de ação, abre os detalhes
                    handleRowClick(e, inventario);
                }
            });
        });
    };

    // --- LÓGICA DO MODAL ---
    const abrirModalItem = (item = null) => {
        formItem.reset();
        fotoCortadaBlob = null; // Limpa a foto cortada anterior
        fotoPreview.src = '/assets/placeholder-image.png'; // Reseta a preview
        if (item) {
            modalItemTitulo.textContent = 'Editar Item';
            itemIdInput.value = item._id;
            document.getElementById('item-nome').value = item.nome;
            document.getElementById('item-categoria').value = item.categoria;
            document.getElementById('item-quantidade').value = item.quantidade;
            document.getElementById('item-status').value = item.status;
            // Novos campos
            document.getElementById('item-data-compra').value = item.dataCompra ? item.dataCompra.split('T')[0] : '';
            document.getElementById('item-valor').value = item.valor || '';
            document.getElementById('item-numero-serie').value = item.numeroSerie || '';
            if (item.fotoUrl) {
                fotoPreview.src = item.fotoUrl;
            }

        } else {
            modalItemTitulo.textContent = 'Adicionar Novo Item';
            itemIdInput.value = '';
        }
        modalItem.classList.add('active');
    };

    const fecharModalItem = () => {
        formItem.reset();
        modalItem.classList.remove('active');
    };

    btnNovoItem.addEventListener('click', () => abrirModalItem());
    btnsFecharModal.forEach(btn => btn.addEventListener('click', fecharModalItem));
    modalItem.addEventListener('click', (e) => {
        if (e.target === modalItem) fecharModalItem();
    });

    // --- LÓGICA DO CROPPER ---
    btnEscolherFoto.addEventListener('click', () => itemFotoUpload.click());

    itemFotoUpload.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            imageToCrop.src = event.target.result;
            modalCropper.classList.add('active');
            if (cropper) cropper.destroy();
            cropper = new Cropper(imageToCrop, {
                aspectRatio: 1, // Proporção 1x1
                viewMode: 1,
            });
        };
        reader.readAsDataURL(file);
    });

    document.getElementById('btn-cancelar-crop').addEventListener('click', () => modalCropper.classList.remove('active'));

    btnCortar.addEventListener('click', () => {
        cropper.getCroppedCanvas({ width: 400, height: 400 }).toBlob((blob) => {
            fotoCortadaBlob = blob;
            fotoPreview.src = URL.createObjectURL(blob);
            modalCropper.classList.remove('active');
        }, 'image/jpeg');
    });

    formItem.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = itemIdInput.value;
        const nfFile = document.getElementById('item-nf').files[0];
        const formData = new FormData();

        // Adiciona os dados do formulário ao FormData
        formData.append('nome', document.getElementById('item-nome').value);
        formData.append('categoria', document.getElementById('item-categoria').value);
        formData.append('quantidade', document.getElementById('item-quantidade').value);
        formData.append('status', document.getElementById('item-status').value);
        formData.append('dataCompra', document.getElementById('item-data-compra').value);
        formData.append('valor', document.getElementById('item-valor').value);
        formData.append('numeroSerie', document.getElementById('item-numero-serie').value);

        if (fotoCortadaBlob) {
            formData.append('foto', fotoCortadaBlob, 'utensilio.jpg');
        }
        if (nfFile) formData.append('notaFiscal', nfFile);

        const method = id ? 'PUT' : 'POST';
        const url = id ? `/api/utensilios/${id}` : '/api/utensilios';

        try {
            await window.api.request(url, method, formData);
            fecharModalItem();
            await carregarDados(); // Recarrega tudo
            alert('Item salvo com sucesso!');
        } catch (error) {
            console.error('Erro ao salvar item:', error);
            alert(`Falha ao salvar item: ${error.message}`);
        }
    });

    // --- LÓGICA DO MODAL DE EMPRÉSTIMO ---
    const abrirModalEmprestimo = () => {
        formEmprestimo.reset();
        // Popula o select de utensílios apenas com os disponíveis
        const selectUtensilio = document.getElementById('emprestimo-utensilio');
        const utensiliosDisponiveis = inventario.filter(item => item.status === 'Disponível');
        selectUtensilio.innerHTML = utensiliosDisponiveis.map(item => `<option value="${item._id}">${item.nome}</option>`).join('');

        // Popula o select de membros
        const selectMembro = document.getElementById('emprestimo-membro');
        selectMembro.innerHTML = membros.map(membro => `<option value="${membro._id}">${membro.nome}</option>`).join('');

        modalEmprestimo.classList.add('active');
    };

    btnNovoEmprestimo.addEventListener('click', abrirModalEmprestimo);
    modalEmprestimo.addEventListener('click', (e) => {
        if (e.target === modalEmprestimo || e.target.closest('[data-close]')) {
            modalEmprestimo.classList.remove('active');
        }
    });

    formEmprestimo.addEventListener('submit', async (e) => {
        e.preventDefault();
        const dados = {
            utensilioId: document.getElementById('emprestimo-utensilio').value,
            membroId: document.getElementById('emprestimo-membro').value,
            quantidade: parseInt(document.getElementById('emprestimo-quantidade').value, 10),
            dataDevolucaoPrevista: document.getElementById('emprestimo-data-devolucao').value,
        };
        try {
            await window.api.post('/api/emprestimos', dados);
            modalEmprestimo.classList.remove('active');
            await carregarDados();
            alert('Empréstimo registrado com sucesso!');
        } catch (error) {
            console.error('Erro ao registrar empréstimo:', error);
            alert(`Falha ao registrar empréstimo: ${error.message}`);
        }
    });

    // --- LÓGICA DO MODAL DE MANUTENÇÃO ---
    const abrirModalManutencao = (item = null) => {
        formManutencao.reset();
        if (item) {
            // Veio do ícone da tabela
            manutencaoSelectContainer.style.display = 'none';
            manutencaoTextoItem.style.display = 'block';
            document.getElementById('manutencao-item-nome').textContent = item.nome;
            // Define o valor no select escondido para o formulário funcionar
            manutencaoItemSelect.innerHTML = `<option value="${item._id}" selected>${item.nome}</option>`;
        } else {
            // Veio do botão do cabeçalho
            manutencaoSelectContainer.style.display = 'block';
            manutencaoTextoItem.style.display = 'none';
            // Popula o select com todos os itens que não estão em manutenção
            const itensDisponiveis = inventario.filter(i => i.status !== 'Em Manutenção');
            manutencaoItemSelect.innerHTML = '<option value="">Selecione um item...</option>' 
                + itensDisponiveis.map(i => `<option value="${i._id}">${i.nome}</option>`).join('');
        }
        modalManutencao.classList.add('active');
    };

    btnNovaManutencao.addEventListener('click', () => abrirModalManutencao());
    modalManutencao.addEventListener('click', (e) => {
        if (e.target === modalManutencao || e.target.closest('[data-close]')) {
            modalManutencao.classList.remove('active');
        }
    });

    formManutencao.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = manutencaoItemSelect.value;
        const dados = {
            status: 'Em Manutenção',
            observacoesManutencao: document.getElementById('manutencao-observacoes').value,
            dataManutencao: new Date().toISOString()
        };
        try {
            await window.api.put(`/api/utensilios/${id}`, dados);
            modalManutencao.classList.remove('active');
            await carregarDados();
            alert('Item enviado para manutenção.');
        } catch (error) {
            console.error('Erro ao enviar para manutenção:', error);
            alert(`Falha ao enviar para manutenção: ${error.message}`);
        }
    });

    // --- LÓGICA DE AÇÕES DA TABELA ---
    const marcarComoDisponivel = async (id) => {
        if (!confirm('Deseja marcar este item como "Disponível" e finalizar a manutenção?')) return;

        try {
            await window.api.put(`/api/utensilios/${id}`, { status: 'Disponível' });
            await carregarDados();
            alert('Status do item atualizado para Disponível.');
        } catch (error) {
            console.error('Erro ao atualizar status do item:', error);
            alert(`Falha ao atualizar status: ${error.message}`);
        }
    };

    // --- LÓGICA DO MODAL DE DETALHES ---
    const abrirModalDetalhes = (item) => {
        if (!item) return;
        corpoDetalhes.innerHTML = `
            <div class="detalhe-grid">
                <div class="detalhe-foto-container">
                    <img src="${item.fotoUrl || '/assets/placeholder-image.png'}" alt="Foto de ${item.nome}" class="detalhe-foto">
                </div>
                <div class="detalhe-info-container">
                    <div class="info-bloco">
                        <h4>Informações Básicas</h4>
                        <p><strong>Categoria:</strong> ${item.categoria}</p>
                        <p><strong>Quantidade Total:</strong> ${item.quantidade}</p>
                        <p><strong>Status Atual:</strong> <span class="status-badge status-${item.status.toLowerCase().replace(/\s+/g, '-')}">${item.status}</span></p>
                    </div>
                    <div class="info-bloco">
                        <h4>Detalhes da Aquisição</h4>
                        <p><strong>Data da Compra:</strong> ${item.dataCompra ? new Date(item.dataCompra).toLocaleDateString('pt-BR') : 'Não informada'}</p>
                        <p><strong>Valor:</strong> ${item.valor ? `R$ ${item.valor.toFixed(2).replace('.', ',')}` : 'Não informado'}</p>
                        <p><strong>Número de Série:</strong> ${item.numeroSerie || 'Não informado'}</p>
                        <p><strong>Nota Fiscal:</strong> ${item.notaFiscalUrl ? `<a href="${item.notaFiscalUrl}" target="_blank">Ver Documento</a>` : 'Não anexada'}</p>
                    </div>
                </div>
            </div>
        `;
        modalDetalhes.classList.add('active');
    };

    const fecharModalDetalhes = () => {
        modalDetalhes.classList.remove('active');
    };

    modalDetalhes.addEventListener('click', (e) => {
        if (e.target === modalDetalhes || e.target.closest('[data-close]')) {
            fecharModalDetalhes();
        }
    });

    const handleRowClick = (event, dataArray) => {
        const row = event.target.closest('tr');
        if (!row || event.target.closest('.acoes-item')) return;

        const id = row.dataset.id;
        const item = dataArray.find(d => d._id === id);
        if (item) abrirModalDetalhes(item);
    };

    const popularCategorias = async () => {
        try {
            const config = await window.api.get('/api/configs');
            const categorias = config.utensilios_categorias || [];
            selectCategoriaModal.innerHTML = categorias.map(cat => `<option value="${cat}">${cat}</option>`).join('');
        } catch (error) {
            console.error("Erro ao carregar categorias de utensílios:", error);
        }
    };

    // --- CONTROLE DE ABAS ---
    const abasLink = document.querySelectorAll('.aba-link');
    const abasConteudo = document.querySelectorAll('.aba-conteudo');
    abasLink.forEach(aba => {
        aba.addEventListener('click', () => {
            const target = document.getElementById(aba.dataset.aba);
            abasLink.forEach(l => l.classList.remove('active'));
            aba.classList.add('active');
            abasConteudo.forEach(c => c.classList.remove('active'));
            target.classList.add('active');
        });
    });

    // --- CARREGAMENTO INICIAL ---
    const carregarDados = async () => {
        try {
            const [resInventario, resEmprestimos, resMembros, resManutencoes] = await Promise.all([
                window.api.get('/api/utensilios/inventario'),
                window.api.get('/api/utensilios/emprestimos'),
                window.api.get('/api/membros'),
                window.api.get('/api/utensilios/manutencao')
            ]);

            inventario = resInventario;
            emprestimos = resEmprestimos;
            manutencoes = resManutencoes;
            membros = resMembros;

            renderizarTabelaInventario();
            renderizarTabelaEmprestimos();
            renderizarTabelaManutencao();
            await popularCategorias();

        } catch (error) {
            console.error("Erro ao carregar dados da página de utensílios:", error);
            if (corpoTabelaInventario) corpoTabelaInventario.innerHTML = '<tr><td colspan="5" class="mensagem-vazio">Falha ao carregar dados do servidor.</td></tr>';
            if (corpoTabelaEmprestimos) corpoTabelaEmprestimos.innerHTML = '<tr><td colspan="5" class="mensagem-vazio">Falha ao carregar dados do servidor.</td></tr>';
            if (corpoTabelaManutencao) corpoTabelaManutencao.innerHTML = '<tr><td colspan="5" class="mensagem-vazio">Falha ao carregar dados do servidor.</td></tr>';
        }
    };

    carregarDados();
});
