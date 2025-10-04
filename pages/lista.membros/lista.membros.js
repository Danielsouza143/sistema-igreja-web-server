document.addEventListener('DOMContentLoaded', () => {

    // --- ESTADO DA APLICAÇÃO ---
    let todosMembros = [];
    let presencasMembros = {};
    // --- ELEMENTOS DO DOM ---
    const filtroNomeInput = document.getElementById('filtro-nome');
    const filtroGeneroInput = document.getElementById('filtro-genero');
    const filtroCargoInput = document.getElementById('filtro-cargo');
    // CORREÇÃO: Ajustar os valores do filtro de gênero para corresponder ao banco de dados
    filtroGeneroInput.innerHTML = `
        <option value="">Gênero</option>
        <option value="masculino">Masculino</option>
        <option value="feminino">Feminino</option>
    `;
    const tabelaCorpo = document.querySelector('.membros-lista');

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
    const renderizarTabelaMembros = (membros) => {
        tabelaCorpo.innerHTML = '';
        if (membros.length === 0) {
            tabelaCorpo.innerHTML = '<tr><td colspan="4" class="mensagem-vazio">Nenhum membro encontrado.</td></tr>';
            return;
        }

        membros.forEach(membro => {
            const tr = document.createElement('tr');
            tr.dataset.id = membro._id;
            tr.innerHTML = `
                <td data-label="Nome">${membro.nome}</td>
                <td data-label="Cargo">${membro.cargoEclesiastico || 'Não definido'}</td>
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
        const generoFiltro = filtroGeneroInput.value;
        const cargoFiltro = filtroCargoInput.value;

        const membrosFiltrados = todosMembros.filter(membro => {
            const nomeOk = membro.nome.toLowerCase().includes(nomeFiltro) || (membro.cpf && membro.cpf.includes(nomeFiltro));
            const generoOk = !generoFiltro || membro.genero === generoFiltro;
            const cargoOk = !cargoFiltro || membro.cargoEclesiastico === cargoFiltro;
            return nomeOk && generoOk && cargoOk;
        });
        renderizarTabelaMembros(membrosFiltrados);
    };

    [filtroNomeInput, filtroGeneroInput, filtroCargoInput].forEach(input => {
        input.addEventListener('input', aplicarFiltros);
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
            alert('Impressão de cartão em desenvolvimento.');
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
});
