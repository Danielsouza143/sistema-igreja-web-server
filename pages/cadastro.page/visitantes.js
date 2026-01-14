if (typeof iniciarVisitantes === 'undefined') {
    window.iniciarVisitantes = () => {

        // --- ESTADO DA APLICAÇÃO ---
    let visitantes = [];
    let presencas = {};
    const graficos = {};

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

            // Recarregar dados da aba de análise ao abri-la
            if (aba.dataset.aba === 'analise') {
                renderizarAnalises();
            }
        });
    });

    // --- LÓGICA DO MODAL ---
    const modal = document.getElementById('modal-visitante');
    const btnNovoVisitante = document.getElementById('btn-novo-visitante');
    const btnFecharModal = document.getElementById('btn-fechar-modal');
    const btnCancelarModal = document.getElementById('btn-cancelar-modal');
    const formVisitante = document.getElementById('form-visitante');
    const modalTitulo = document.getElementById('modal-titulo');
    const visitanteIdInput = document.getElementById('visitante-id');

    const abrirModal = (visitante = null) => {
        formVisitante.reset();
        if (visitante) {
            modalTitulo.textContent = 'Editar Visitante';
            visitanteIdInput.value = visitante._id; // Correção: Usar _id do MongoDB
            document.getElementById('nome').value = visitante.nome;
            document.getElementById('telefone').value = visitante.telefone;
            document.getElementById('data-nascimento').value = visitante.dataNascimento;
            document.getElementById('genero').value = visitante.genero || '';
            document.getElementById('bairro').value = visitante.bairro;
            document.getElementById('evangelico').value = visitante.evangelico;
            document.getElementById('como-conheceu').value = visitante.comoConheceu;
        } else {
            modalTitulo.textContent = 'Cadastrar Novo Visitante';
            visitanteIdInput.value = '';
        }
        modal.classList.add('active');
    };

    const fecharModal = () => modal.classList.remove('active');

    btnNovoVisitante.addEventListener('click', () => abrirModal());
    btnFecharModal.addEventListener('click', fecharModal);
    btnCancelarModal.addEventListener('click', fecharModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) fecharModal();
    });

    // --- LÓGICA DO MODAL DE DETALHES ---
    const modalDetalhes = document.getElementById('modal-detalhes-visitante');
    const corpoDetalhes = document.getElementById('detalhes-visitante-corpo');

    const calcularIdade = (dataNascimento) => {
        if (!dataNascimento) return null;
        const hoje = new Date();
        const nascimento = new Date(dataNascimento);
        let idade = hoje.getFullYear() - nascimento.getFullYear();
        const mes = hoje.getMonth() - nascimento.getMonth();
        if (mes < 0 || (mes === 0 && hoje.getDate() < nascimento.getDate())) {
            idade--;
        }
        return idade >= 0 ? idade : null;
    };

    const abrirModalDetalhes = (visitante) => {
        if (!visitante) return;
        const idade = calcularIdade(visitante.dataNascimento);
        corpoDetalhes.innerHTML = `
            <div class="detalhe-header">
                <h2>${visitante.nome}</h2>
                <p>Visitante desde ${new Date(visitante.dataPrimeiraVisita).toLocaleDateString('pt-BR')}</p>
            </div>
            <div class="detalhe-dados">
                <h3>Informações de Contato</h3>
                <p><strong>Telefone:</strong> ${visitante.telefone || 'Não informado'}</p>
                <p><strong>Bairro/Cidade:</strong> ${visitante.bairro || 'Não informado'}</p>
            </div>
            <div class="detalhe-dados">
                <h3>Perfil</h3>
                <p><strong>Gênero:</strong> ${visitante.genero ? visitante.genero.charAt(0).toUpperCase() + visitante.genero.slice(1) : 'Não informado'}</p>
                <p><strong>Idade:</strong> ${idade !== null ? `${idade} anos` : 'Não informada'}</p>
                <p><strong>Já é evangélico?</strong> ${visitante.evangelico === 'sim' ? 'Sim' : 'Não'}</p>
                <p><strong>Como nos conheceu:</strong> ${visitante.comoConheceu ? visitante.comoConheceu.replace('_', ' ') : 'Não informado'}</p>
            </div>
        `;
        modalDetalhes.classList.add('active');
    };

    modalDetalhes.addEventListener('click', (e) => {
        if (e.target === modalDetalhes || e.target.hasAttribute('data-close-details')) {
            modalDetalhes.classList.remove('active');
        }
    });

    // --- FUNÇÕES DE RENDERIZAÇÃO E CRUD ---
    const renderizarTabelaVisitantes = () => {
        const corpoTabela = document.getElementById('corpo-tabela-visitantes');
        corpoTabela.innerHTML = '';

        if (visitantes.length === 0) {
            corpoTabela.innerHTML = '<tr><td colspan="5" class="mensagem-vazio">Nenhum visitante cadastrado ainda.</td></tr>';
            return;
        }

        visitantes.forEach(v => {
            const tr = document.createElement('tr');
            // Usamos _id que é o padrão do MongoDB
            tr.className = 'linha-clicavel';
            const id = v._id;
            tr.innerHTML = `
                <td data-label="Nome">${v.nome}</td>
                <td data-label="Telefone">${v.telefone}</td>
                <td data-label="Bairro/Cidade">${v.bairro}</td>
                <td data-label="Primeira Visita">${new Date(v.dataPrimeiraVisita).toLocaleDateString('pt-BR')}</td>
                <td data-label="Ações">
                    <div class="acoes-item">
                        <i class='bx bxs-edit' data-id="${id}" title="Editar"></i>
                        <i class='bx bxs-trash' data-id="${id}" title="Excluir"></i>
                    </div>
                </td>
            `;
            corpoTabela.appendChild(tr);
        });

        // Adicionar evento de clique na linha para ver detalhes
        document.querySelectorAll('.linha-clicavel').forEach(row => {
            row.addEventListener('click', (e) => {
                if (e.target.closest('.acoes-item')) return; // Não abre se clicar nos botões de ação
                const visitante = visitantes.find(v => v._id == row.querySelector('.bxs-edit').dataset.id);
                abrirModalDetalhes(visitante);
            });
        });
        // Adicionar eventos aos botões de ação
        document.querySelectorAll('.bxs-edit').forEach(btn => btn.addEventListener('click', (e) => {
            const id = e.target.dataset.id;
            const visitante = visitantes.find(v => v._id == id);
            abrirModal(visitante);
        }));
        document.querySelectorAll('.bxs-trash').forEach(btn => btn.addEventListener('click', (e) => {
            if (confirm('Tem certeza que deseja excluir este visitante?')) {
                excluirVisitante(e.target.dataset.id);
            }
        }));
    };

    formVisitante.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = visitanteIdInput.value;
        const dadosVisitante = {
            nome: document.getElementById('nome').value,
            telefone: document.getElementById('telefone').value,
            dataNascimento: document.getElementById('data-nascimento').value,
            genero: document.getElementById('genero').value,
            bairro: document.getElementById('bairro').value,
            evangelico: document.getElementById('evangelico').value,
            comoConheceu: document.getElementById('como-conheceu').value,
        };

        try {
            if (id) {
                // Edição (PUT)
                await window.api.put(`/api/visitantes/${id}`, dadosVisitante);
            } else {
                // Criação (POST)
                await window.api.post('/api/visitantes', dadosVisitante);
            }

            await carregarVisitantes(); // Recarrega a lista da API
            fecharModal();
            alert('Visitante salvo com sucesso!');
        } catch (error) {
            console.error('Erro ao salvar visitante:', error);
            alert('Não foi possível salvar o visitante. Tente novamente.');
        }
    });

    const excluirVisitante = async (id) => {
        try {
            await window.api.delete(`/api/visitantes/${id}`);

            await carregarVisitantes(); // Recarrega a lista
            alert('Visitante excluído com sucesso!');
        } catch (error) {
            console.error('Erro ao excluir visitante:', error);
            alert('Não foi possível excluir o visitante. Tente novamente.');
        }
    };

    // --- CONTROLE DE PRESENÇA ---
    const dataCultoInput = document.getElementById('data-culto');
    const listaPresencaContainer = document.getElementById('lista-presenca-container');
    const btnSalvarPresenca = document.getElementById('btn-salvar-presenca');
    const buscaPresencaInput = document.getElementById('busca-presenca');

    const renderizarListaPresenca = (dataSelecionada, filtroBusca = '') => {
        if (!dataSelecionada) {
            listaPresencaContainer.innerHTML = '<p class="mensagem-vazio">Selecione uma data para iniciar.</p>';
            btnSalvarPresenca.disabled = true;
            return;
        }

        if (visitantes.length === 0) {
            listaPresencaContainer.innerHTML = '<p class="mensagem-vazio">Cadastre visitantes para poder registrar presenças.</p>';
            btnSalvarPresenca.disabled = true;
            return;
        }

        btnSalvarPresenca.disabled = false;
        listaPresencaContainer.innerHTML = '';
        const presencasDoDia = presencas[dataSelecionada] || [];

        const visitantesFiltrados = visitantes.filter(v => 
            v.nome.toLowerCase().includes(filtroBusca.toLowerCase()) ||
            v.telefone.includes(filtroBusca)
        );

        visitantesFiltrados.forEach(v => {
            const isPresente = presencasDoDia.includes(v._id);
            const item = document.createElement('div');
            item.className = `item-presenca ${isPresente ? 'presente' : ''}`;
            item.innerHTML = `
                <input type="checkbox" id="presenca-${v._id}" data-id="${v._id}" ${isPresente ? 'checked' : ''}>
                <label for="presenca-${v._id}">${v.nome}</label>
            `;
            item.addEventListener('click', (e) => {
                const checkbox = item.querySelector('input');
                if (e.target !== checkbox) {
                    checkbox.checked = !checkbox.checked;
                }
                item.classList.toggle('presente', checkbox.checked);
            });
            listaPresencaContainer.appendChild(item);
        });
    };

    dataCultoInput.addEventListener('change', () => {
        const dataSelecionada = dataCultoInput.value;
        renderizarListaPresenca(dataSelecionada, buscaPresencaInput.value);
    });

    buscaPresencaInput.addEventListener('input', () => {
        const dataSelecionada = dataCultoInput.value;
        renderizarListaPresenca(dataSelecionada, buscaPresencaInput.value);
    })

    btnSalvarPresenca.addEventListener('click', async () => {
        const dataSelecionada = dataCultoInput.value;
        const presentesIds = [];
        document.querySelectorAll('#lista-presenca-container input:checked').forEach(input => {
            presentesIds.push(input.dataset.id);
        });

        try {
            await window.api.post('/api/presencas-visitantes', { data: dataSelecionada, visitantes: presentesIds });
            presencas[dataSelecionada] = presentesIds; // Atualiza o estado local
            alert(`Presenças salvas para o dia ${new Date(dataSelecionada + 'T00:00:00').toLocaleDateString('pt-BR')}!`);
        } catch (error) {
            console.error('Erro ao salvar presenças:', error);
            alert('Não foi possível salvar as presenças. Tente novamente.');
        }
    });

    // --- ANÁLISES E GRÁFICOS ---
    const criarGrafico = (idCanvas, tipo, dados, opcoes) => {
        const ctx = document.getElementById(idCanvas).getContext('2d');
        if (graficos[idCanvas]) graficos[idCanvas].destroy();
        graficos[idCanvas] = new Chart(ctx, { type: tipo, data: dados, options: opcoes });
    };

    const renderizarAnalises = () => {
        // Cards de resumo
        const hoje = new Date();
        const mesAtual = hoje.getMonth();
        const anoAtual = hoje.getFullYear();

        document.getElementById('total-visitantes').textContent = visitantes.length;

        const novosNoMes = visitantes.filter(v => {
            const dataVisita = new Date(v.dataPrimeiraVisita);
            return dataVisita.getMonth() === mesAtual && dataVisita.getFullYear() === anoAtual;
        }).length;
        document.getElementById('novos-visitantes-mes').textContent = novosNoMes;

        const totalPresencas = Object.values(presencas).reduce((sum, arr) => sum + arr.length, 0);
        const numeroDeCultos = Object.keys(presencas).length;
        const mediaPorCulto = numeroDeCultos > 0 ? (totalPresencas / numeroDeCultos).toFixed(1) : '0';
        document.getElementById('media-visitantes-culto').textContent = mediaPorCulto;

        const contagemPresencas = {};
        Object.values(presencas).flat().forEach(id => {
            contagemPresencas[id] = (contagemPresencas[id] || 0) + 1;
        });
        const visitantesRecorrentes = Object.values(contagemPresencas).filter(count => count > 1).length;
        const totalVisitantesUnicosPresentes = Object.keys(contagemPresencas).length;
        const taxaRetorno = totalVisitantesUnicosPresentes > 0 ? ((visitantesRecorrentes / totalVisitantesUnicosPresentes) * 100).toFixed(0) : '0';
        document.getElementById('taxa-retorno').textContent = `${taxaRetorno}%`;
        
        // Gráfico de Gênero (exemplo, pois não temos o dado)
        const contagemGenero = { masculino: 0, feminino: 0 };
        visitantes.forEach(v => {
            if (v.genero === 'masculino') contagemGenero.masculino++;
            else if (v.genero === 'feminino') contagemGenero.feminino++;
        });
        criarGrafico('grafico-genero', 'doughnut', {
            labels: ['Masculino', 'Feminino'],
            datasets: [{ data: [contagemGenero.masculino, contagemGenero.feminino], backgroundColor: ['#0033a0', '#ff8c00'] }]
        }, { responsive: true, maintainAspectRatio: false });

        // Gráfico de Faixa Etária
        const faixas = { '0-17': 0, '18-29': 0, '30-45': 0, '46+': 0 };
        visitantes.forEach(v => {
            if (v.dataNascimento) {
                const idade = new Date().getFullYear() - new Date(v.dataNascimento).getFullYear();
                if (idade <= 17) faixas['0-17']++;
                else if (idade <= 29) faixas['18-29']++;
                else if (idade <= 45) faixas['30-45']++;
                else faixas['46+']++;
            }
        });
        criarGrafico('grafico-faixa-etaria', 'bar', {
            labels: Object.keys(faixas),
            datasets: [{ label: 'Nº de Visitantes', data: Object.values(faixas), backgroundColor: '#28a745' }]
        }, { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } });

        // Gráfico de Origem
        const origens = {};
        visitantes.forEach(v => {
            origens[v.comoConheceu] = (origens[v.comoConheceu] || 0) + 1;
        });
        criarGrafico('grafico-origem', 'pie', {
            labels: Object.keys(origens).map(k => k.replace('_', ' ')),
            datasets: [{ data: Object.values(origens), backgroundColor: ['#0056b3', '#ffcd56', '#4bc0c0', '#6c757d'] }]
        }, { responsive: true, maintainAspectRatio: false });

        // Gráfico de Bairro
        const bairros = {};
        visitantes.forEach(v => {
            bairros[v.bairro] = (bairros[v.bairro] || 0) + 1;
        });
        criarGrafico('grafico-bairro', 'bar', {
            labels: Object.keys(bairros),
            datasets: [{ label: 'Nº de Visitantes', data: Object.values(bairros), backgroundColor: '#dc3545' }]
        }, { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } });

        // Gráfico Evangélico / Não Evangélico
        const contagemEvangelico = { sim: 0, nao: 0 };
        visitantes.forEach(v => {
            contagemEvangelico[v.evangelico] = (contagemEvangelico[v.evangelico] || 0) + 1;
        });
        criarGrafico('grafico-evangelico', 'pie', {
            labels: ['Evangélico', 'Não Evangélico'],
            datasets: [{ data: [contagemEvangelico.sim, contagemEvangelico.nao], backgroundColor: ['#0056b3', '#6c757d'] }]
        }, { responsive: true, maintainAspectRatio: false });

        // Ranking de Engajamento
        const engajamento = {};
        Object.values(presencas).flat().forEach(id => {
            engajamento[id] = (engajamento[id] || 0) + 1;
        });
        const rankingOrdenado = Object.entries(engajamento).sort((a, b) => b[1] - a[1]).slice(0, 5);
        const listaRanking = document.getElementById('lista-ranking-engajamento');
        listaRanking.innerHTML = '';
        rankingOrdenado.forEach(([id, contagem], index) => { // id aqui é o _id
            const visitante = visitantes.find(v => v._id == id);
            if (visitante) {
                const li = document.createElement('li');
                li.className = 'ranking-item';
                li.innerHTML = `
                    <span class="ranking-posicao">#${index + 1}</span>
                    <span class="ranking-nome">${visitante.nome}</span>
                    <span class="ranking-presencas">${contagem} presenças</span>
                `;
                li.style.cursor = 'pointer';
                li.addEventListener('click', () => {
                    abrirModalDetalhes(visitante);
                });
                listaRanking.appendChild(li);
            }
        });
    };

    // --- FUNÇÕES DE CARREGAMENTO INICIAL ---
    const carregarVisitantes = async () => {
        try {
            visitantes = await window.api.get('/api/visitantes');
            renderizarTabelaVisitantes();
        } catch (error) {
            console.error(error);
            document.getElementById('corpo-tabela-visitantes').innerHTML = `<tr><td colspan="5" class="mensagem-vazio">Erro ao carregar visitantes. Verifique a conexão com o servidor.</td></tr>`;
        }
    };

    const carregarPresencas = async () => {
        try {
            const listaPresencas = await window.api.get('/api/presencas-visitantes');
             // Transforma a lista de presenças em um objeto para acesso rápido por data
            presencas = listaPresencas.reduce((acc, p) => {
                acc[p.data] = p.visitantes;
                return acc;
            }, {});
        } catch (error) {
            console.error(error);
        }
    };

    const init = async () => {
        await carregarVisitantes();
        await carregarPresencas();

        dataCultoInput.value = new Date().toISOString().split('T')[0];
        renderizarListaPresenca(dataCultoInput.value, buscaPresencaInput.value);
        renderizarTabelaVisitantes();
    };

    init();
    };
}

document.addEventListener('DOMContentLoaded', window.iniciarVisitantes);
document.body.addEventListener('htmx:afterSwap', window.iniciarVisitantes);
if (document.readyState !== 'loading') window.iniciarVisitantes();