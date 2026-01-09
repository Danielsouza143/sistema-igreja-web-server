document.addEventListener('DOMContentLoaded', () => {

    // --- ESTADO DA APLICAÇÃO ---
    let todosMembros = [];
    let presencasMembros = {};
    // --- ELEMENTOS DO DOM ---
    const filtroNomeInput = document.getElementById('filtro-nome');
    const tabelaCorpo = document.querySelector('.membros-lista');

    // --- MODAL DE FILTROS ---
    const modalFiltros = document.getElementById('modal-filtros');
    const btnAbrirFiltros = document.getElementById('btn-filtros-avancados');
    const btnFecharFiltros = document.getElementById('btn-close-filtros');
    const formFiltros = document.getElementById('form-filtros');
    const btnLimparFiltros = document.getElementById('btn-limpar-filtros');

    // Abrir/Fechar Modal
    btnAbrirFiltros.addEventListener('click', () => modalFiltros.classList.add('active'));
    
    const fecharModalFiltros = () => modalFiltros.classList.remove('active');
    btnFecharFiltros.addEventListener('click', fecharModalFiltros);
    modalFiltros.addEventListener('click', (e) => {
        if (e.target === modalFiltros) fecharModalFiltros();
    });

    // --- CONTROLE DAS ABAS ---
    const abasLink = document.querySelectorAll('.aba-link');
    const abasConteudo = document.querySelectorAll('.aba-conteudo');
    abasLink.forEach(aba => {
        aba.addEventListener('click', () => {
            const target = document.getElementById(aba.dataset.aba);
            abasLink.forEach(l => l.classList.remove('active'));
            aba.classList.add('active');
            abasConteudo.forEach(c => c.classList.remove('active'));
            target.classList.add('active');

            if (aba.dataset.aba === 'engajamento') {
                renderizarRankingEngajamento();
            }
        });
    });

    // --- LÓGICA DA LISTA DE MEMBROS E FILTROS ---
    
    // Função auxiliar para processar diferentes formatos de data
    const parseDate = (dateInput) => {
        if (!dateInput) return null;
        if (dateInput instanceof Date) return dateInput;
        
        // Tenta criar Data padrão (ISO string, etc)
        let date = new Date(dateInput);
        if (!isNaN(date.getTime())) return date;

        // Tenta formato brasileiro DD/MM/YYYY
        if (typeof dateInput === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(dateInput)) {
            const [day, month, year] = dateInput.split('/').map(Number);
            date = new Date(year, month - 1, day);
            if (!isNaN(date.getTime())) return date;
        }
        
        return null;
    };

    const calcularIdade = (dataNascimento, idadePrevia) => {
        // Se já tiver idade cadastrada diretamente (legado/importação), usa ela
        if (idadePrevia !== undefined && idadePrevia !== null && !isNaN(idadePrevia)) {
            return parseInt(idadePrevia);
        }

        const nascimento = parseDate(dataNascimento);
        if (!nascimento) return null;

        const hoje = new Date();
        let idade = hoje.getFullYear() - nascimento.getFullYear();
        const mes = hoje.getMonth() - nascimento.getMonth();
        if (mes < 0 || (mes === 0 && hoje.getDate() < nascimento.getDate())) {
            idade--;
        }
        return idade;
    };

    const renderizarTabelaMembros = (membros) => {
        tabelaCorpo.innerHTML = '';
        if (membros.length === 0) {
            tabelaCorpo.innerHTML = '<tr><td colspan="6" class="mensagem-vazio">Nenhum membro encontrado com os filtros atuais.</td></tr>';
            return;
        }

        membros.forEach(membro => {
            const tr = document.createElement('tr');
            tr.dataset.id = membro._id;

            // Célula da Foto
            const fotoHtml = membro.fotoUrl
                ? `<img src="${membro.fotoUrl}" alt="${membro.nome}" class="membro-foto-lista">`
                : `<div class="membro-foto-placeholder"><i class='bx bx-user'></i></div>`;

            // Célula do Status
            const status = membro.status || 'ativo'; // Default para ativo se não definido
            const statusClasse = `status-badge status-${status}`;
            const statusTexto = status.charAt(0).toUpperCase() + status.slice(1);
            const statusHtml = `<span class="${statusClasse}">${statusTexto}</span>`;

            tr.innerHTML = `
                <td data-label="Foto">${fotoHtml}</td>
                <td data-label="Nome">${membro.nome}</td>
                <td data-label="Status">${statusHtml}</td>
                <td data-label="Cargo">${membro.cargoEclesiastico ? membro.cargoEclesiastico.charAt(0).toUpperCase() + membro.cargoEclesiastico.slice(1) : 'Membro'}</td>
                <td data-label="Telefone">${membro.telefone || 'Não informado'}</td>
                <td data-label="Ações">
                    <div class="acoes-item">
                        <i class='bx bxs-edit' title="Editar Membro"></i>
                        <i class='bx bxs-printer' title="Imprimir Cartão"></i>
                        <i class='bx bxs-trash' title="Excluir Membro"></i>
                    </div>
                </td>
            `;
            tabelaCorpo.appendChild(tr);
        });
    };

    const aplicarFiltros = () => {
        const nomeFiltro = filtroNomeInput.value.toLowerCase();
        
        // Captura dados do formulário do modal
        const formData = new FormData(formFiltros);
        const filtros = Object.fromEntries(formData.entries());

        const membrosFiltrados = todosMembros.filter(membro => {
            // Filtro de Nome (Barra de Pesquisa)
            const nomeOk = membro.nome.toLowerCase().includes(nomeFiltro) || 
                         (membro.cpf && membro.cpf.includes(nomeFiltro)) ||
                         (membro.nomeConjuge && membro.nomeConjuge.toLowerCase().includes(nomeFiltro));
            
            if (!nomeOk) return false;

            // Filtros Avançados
            if (filtros.status && (membro.status || 'ativo') !== filtros.status) return false;
            if (filtros.genero && membro.genero !== filtros.genero) return false;
            if (filtros.cargoEclesiastico && membro.cargoEclesiastico !== filtros.cargoEclesiastico) return false;
            if (filtros.estadoCivil && membro.estadoCivil !== filtros.estadoCivil) return false;
            
            // Filtro de Faixa Etária
            if (filtros.faixaEtaria) {
                const idade = calcularIdade(membro.dataNascimento, membro.idade);
                if (idade === null) return false; // Sem data de nascimento não entra em faixa etária

                if (filtros.faixaEtaria === '60+') {
                    if (idade < 60) return false;
                } else {
                    const [min, max] = filtros.faixaEtaria.split('-').map(Number);
                    if (idade < min || idade > max) return false;
                }
            }

            // Filtros Booleanos/Especiais
            if (filtros.temMinisterio) {
                if (filtros.temMinisterio === 'sim' && membro.temMinisterio !== 'sim') return false;
                if (filtros.temMinisterio === 'nao' && membro.temMinisterio === 'sim') return false;
            }

            if (filtros.batismoAguas) {
                if (filtros.batismoAguas === 'sim' && membro.batismoAguas !== 'sim') return false;
                if (filtros.batismoAguas === 'nao' && membro.batismoAguas === 'sim') return false;
            }

            if (filtros.eDizimista) {
                const isDizimista = membro.eDizimista === true;
                const filterValue = filtros.eDizimista === 'true';
                if (isDizimista !== filterValue) return false;
            }

            return true;
        });
        
        renderizarTabelaMembros(membrosFiltrados);
    };

    // Listeners
    filtroNomeInput.addEventListener('input', aplicarFiltros);
    
    formFiltros.addEventListener('submit', (e) => {
        e.preventDefault();
        aplicarFiltros();
        fecharModalFiltros();
    });

    btnLimparFiltros.addEventListener('click', () => {
        formFiltros.reset();
        aplicarFiltros();
        // Não fecha o modal automaticamente, permitindo que o usuário veja que limpou
    });

    tabelaCorpo.addEventListener('click', (e) => {
        const target = e.target;
        const tr = target.closest('tr');
        if (!tr) return;

        const membroId = tr.dataset.id;

        if (target.classList.contains('bxs-edit')) {
            window.location.href = `../cadastro.membro.page/cadastro.membro.html?id=${membroId}`;
        } else if (target.classList.contains('bxs-trash')) {
            if (confirm('Tem certeza que deseja excluir este membro?')) {
                excluirMembro(membroId);
            }
        } else if (target.classList.contains('bxs-printer')) {
            window.location.href = `cartao_membro.html?id=${membroId}`;
        } else {
            window.location.href = `detalhes_membro.html?id=${membroId}`;
        }
    });

    const excluirMembro = async (id) => {
        try {
            await window.api.delete(`/api/membros/${id}`);
            alert('Membro excluído com sucesso!');
            buscarMembrosDaAPI(); // Recarrega a lista
        } catch (error) {
            console.error('Erro ao excluir:', error);
            alert('Não foi possível excluir o membro.');
        }
    };

    // --- LÓGICA DO CONTROLE DE PRESENÇA ---
    const dataCultoInput = document.getElementById('data-culto');
    const buscaPresencaInput = document.getElementById('busca-presenca');
    const listaPresencaContainer = document.getElementById('lista-presenca-container');
    const btnSalvarPresenca = document.getElementById('btn-salvar-presenca');

    const renderizarListaPresenca = (data, filtro) => {
        if (!data) {
            listaPresencaContainer.innerHTML = '<p class="mensagem-vazio">Selecione uma data para iniciar.</p>';
            btnSalvarPresenca.disabled = true;
            return;
        }
        btnSalvarPresenca.disabled = false;
        listaPresencaContainer.innerHTML = '';
        const presencasDoDia = presencasMembros[data] || [];
        const membrosFiltrados = todosMembros.filter(m => m.nome.toLowerCase().includes(filtro.toLowerCase()));

        membrosFiltrados.forEach(m => {
            const isPresente = presencasDoDia.includes(m._id);
            const item = document.createElement('div');
            item.className = `item-presenca ${isPresente ? 'presente' : ''}`;
            item.innerHTML = `<input type="checkbox" id="presenca-${m._id}" data-id="${m._id}" ${isPresente ? 'checked' : ''}><label for="presenca-${m._id}">${m.nome}</label>`;
            item.addEventListener('click', (e) => {
                const checkbox = item.querySelector('input');
                if (e.target !== checkbox) checkbox.checked = !checkbox.checked;
                item.classList.toggle('presente', checkbox.checked);
            });
            listaPresencaContainer.appendChild(item);
        });
    };

    [dataCultoInput, buscaPresencaInput].forEach(input => {
        input.addEventListener('input', () => renderizarListaPresenca(dataCultoInput.value, buscaPresencaInput.value));
    });

    btnSalvarPresenca.addEventListener('click', async () => {
        const data = dataCultoInput.value;
        const presentesIds = Array.from(document.querySelectorAll('#lista-presenca-container input:checked')).map(input => input.dataset.id);
        try {
            await window.api.post('/api/presencas-membros', { data, membros: presentesIds }); // Rota já estava correta, confirmando.
            presencasMembros[data] = presentesIds;
            alert('Presenças salvas com sucesso!');
        } catch (error) {
            console.error('Erro ao salvar presenças:', error);
            alert('Não foi possível salvar as presenças.');
        }
    });

    // --- LÓGICA DE ANÁLISE DE ENGAJAMENTO ---
    const renderizarRankingEngajamento = () => {
        const hoje = new Date();
        const tresMesesAtras = new Date();
        tresMesesAtras.setMonth(hoje.getMonth() - 3);

        const presencasRecentes = Object.entries(presencasMembros).filter(([data]) => new Date(data) >= tresMesesAtras);

        const ultimaPresencaDeCadaMembro = {};
        presencasRecentes.forEach(([data, ids]) => {
            ids.forEach(id => {
                if (!ultimaPresencaDeCadaMembro[id] || new Date(data) > new Date(ultimaPresencaDeCadaMembro[id])) {
                    ultimaPresencaDeCadaMembro[id] = data;
                }
            });
        });

        const engajamento = {};
        Object.values(presencasMembros).flat().forEach(id => {
            engajamento[id] = (engajamento[id] || 0) + 1;
        });

        const rankingOrdenado = Object.entries(engajamento).sort((a, b) => b[1] - a[1]).slice(0, 10);
        const listaRanking = document.getElementById('lista-ranking-engajamento');
        listaRanking.innerHTML = '';

        if (rankingOrdenado.length === 0) {
            listaRanking.innerHTML = '<li class="mensagem-vazio">Nenhum registro de presença para gerar o ranking.</li>';
            return;
        }

        rankingOrdenado.forEach(([id, contagem], index) => {
            const membro = todosMembros.find(m => m._id == id);
            const ultimaPresenca = ultimaPresencaDeCadaMembro[id] ? new Date(ultimaPresencaDeCadaMembro[id]) : null;
            const diasDesdeUltimaPresenca = ultimaPresenca ? Math.floor((hoje - ultimaPresenca) / (1000 * 60 * 60 * 24)) : Infinity;
            const precisaAtencao = diasDesdeUltimaPresenca > 30;

            if (membro) {
                const li = document.createElement('li');
                li.className = 'ranking-item';
                li.innerHTML = `
                    <span class="ranking-posicao">#${index + 1}</span>
                    <span class="ranking-nome">${membro.nome} ${precisaAtencao ? "<i class='bx bxs-error-circle ranking-alerta' title='Ausente há mais de 30 dias'></i>" : ""}</span>
                    <span class="ranking-presencas">${contagem} presenças</span>
                `;
                li.style.cursor = 'pointer';
                li.addEventListener('click', () => {
                    window.location.href = `detalhes_membro.html?id=${membro._id}`;
                });
                listaRanking.appendChild(li);
            }
        });
    };

    // --- CARREGAMENTO INICIAL DE DADOS ---
    const buscarMembrosDaAPI = async () => {
        try {
            todosMembros = await window.api.get('/api/membros'); // Já estava correto, mas confirmando
            aplicarFiltros(); // Renderiza a tabela com todos os membros inicialmente
        } catch (error) {
            console.error('Erro ao buscar membros:', error);
            tabelaCorpo.innerHTML = `<tr><td colspan="4" class="mensagem-vazio">Erro ao carregar membros. Verifique a conexão.</td></tr>`;
        }
    };

    const carregarPresencasMembros = async () => {
        try {
            const listaPresencas = await window.api.get('/api/presencas-membros');
            presencasMembros = listaPresencas.reduce((acc, p) => {
                acc[p.data] = p.membros;
                return acc;
            }, {});
        } catch (error) {
            console.error(error);
        }
    };

    const init = async () => {
        await buscarMembrosDaAPI();
        await carregarPresencasMembros();

        // Prepara a aba de presença
        dataCultoInput.value = new Date().toISOString().split('T')[0];
        renderizarListaPresenca(dataCultoInput.value, buscaPresencaInput.value);
    };

    init();

    // Botão de relatório
    document.querySelector('.btn-relatorio').addEventListener('click', () => {
        alert("Funcionalidade de impressão de relatório a ser implementada.");
    });

    // --- LÓGICA DO MODAL DE COMPARTILHAMENTO ---
    const modalShare = document.getElementById('modal-share');
    const btnShare = document.getElementById('btn-share-link');
    const btnCloseShare = document.getElementById('btn-close-share');
    const inputShareLink = document.getElementById('share-link-input');
    const btnCopyModal = document.getElementById('btn-copy-modal');
    const btnNativeShare = document.getElementById('btn-native-share');

    // Abrir Modal
    btnShare.addEventListener('click', () => {
        const userInfo = JSON.parse(localStorage.getItem('userInfo'));
        const tenantId = userInfo?.tenant?.id || userInfo?.tenantId;

        if (!tenantId) {
            alert('Não foi possível identificar a sua igreja. Faça login novamente.');
            return;
        }
        
        const link = `${window.location.origin}/pages/public-form/cadastro.html?t=${tenantId}`;
        inputShareLink.value = link;
        
        // Verifica suporte a compartilhamento nativo (Mobile)
        if (navigator.share) {
            btnNativeShare.style.display = 'flex';
        } else {
            btnNativeShare.style.display = 'none';
        }

        modalShare.classList.add('active');
    });

    // Fechar Modal
    const fecharModalShare = () => modalShare.classList.remove('active');
    btnCloseShare.addEventListener('click', fecharModalShare);
    modalShare.addEventListener('click', (e) => {
        if (e.target === modalShare) fecharModalShare();
    });

    // Copiar Link do Modal
    btnCopyModal.addEventListener('click', () => {
        inputShareLink.select();
        inputShareLink.setSelectionRange(0, 99999); // Para mobile
        navigator.clipboard.writeText(inputShareLink.value).then(() => {
            const originalIcon = btnCopyModal.innerHTML;
            btnCopyModal.innerHTML = "<i class='bx bx-check'></i>";
            setTimeout(() => {
                btnCopyModal.innerHTML = originalIcon;
            }, 2000);
        }).catch(err => console.error('Erro ao copiar', err));
    });

    // Compartilhar Nativo (WhatsApp/Outros)
    btnNativeShare.addEventListener('click', async () => {
        const link = inputShareLink.value;
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'Cadastro de Membros',
                    text: 'Olá! Segue o link para realizar o seu cadastro na igreja:',
                    url: link
                });
            } catch (err) {
                console.log('Compartilhamento cancelado ou falhou', err);
            }
        }
    });
});
