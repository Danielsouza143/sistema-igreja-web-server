document.addEventListener('DOMContentLoaded', () => {
    let todosLancamentos = [];
    let lancamentosSelecionados = new Set();
    let todosMembros = [];
    let lancamentoEmEdicaoId = null;
    let categoriasConfig = { entradas: [], saidas: [] };
    let graficoAnual = null;
    let graficoDespesasPizza = null;
    let exclusaoTimeout = null;
    let itemParaExcluir = null;
    let graficoContribuicoesMembro = null;

    // --- Seletores do DOM ---
    const modalLancamento = document.getElementById('modal-lancamento');
    const formLancamento = document.getElementById('form-lancamento');
    const tabelaCorpo = document.getElementById('tabela-lancamentos-corpo');
    const filtroAno = document.getElementById('filtro-ano');
    const filtroMes = document.getElementById('filtro-mes');
    const filtroCategoria = document.getElementById('filtro-categoria');
    const filtroTipo = document.getElementById('filtro-tipo');

    // --- Funções de Renderização ---
    const formatarMoeda = (valor) => `R$ ${valor.toFixed(2).replace('.', ',')}`;

    const renderizarTabela = (lancamentos) => {
        tabelaCorpo.innerHTML = '';
        if (lancamentos.length === 0) {
            tabelaCorpo.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 20px;">Nenhum lançamento encontrado para este período.</td></tr>';
            return;
        }
        lancamentos.forEach(l => {
            const tr = document.createElement('tr');
            tr.dataset.id = l._id;
            if (lancamentosSelecionados.has(l._id)) {
                tr.classList.add('selecionada');
            }
            tr.innerHTML = `
                <td><input type="checkbox" class="checkbox-lancamento" data-id="${l._id}" ${lancamentosSelecionados.has(l._id) ? 'checked' : ''}></td>
                <td data-label="Data">${new Date(l.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</td>
                <td data-label="Descrição" class="celula-editavel" contenteditable="true" data-id="${l._id}" data-field="descricao">
                    ${l.descricao}
                    ${l.comprovanteUrl ? `<a href="${l.comprovanteUrl}" target="_blank" title="Ver Comprovante"><i class='bx bx-paperclip anexo-icon'></i></a>` : ''}
                </td>
                <td data-label="Categoria">${l.categoria}</td>
                <td data-label="Valor" class="celula-editavel ${l.tipo === 'entrada' ? 'valor-entrada' : 'valor-saida'}" contenteditable="true" data-id="${l._id}" data-field="valor">${formatarMoeda(l.valor)}</td>
                <td class="acoes-item">
                    <i class='bx bxs-edit' data-id="${l._id}" title="Editar"></i>
                    <i class='bx bxs-copy' data-id="${l._id}" title="Duplicar"></i>
                    <i class='bx bxs-trash' data-id="${l._id}" title="Excluir"></i>
                </td>
            `;
            tabelaCorpo.appendChild(tr);
        });
    };

    const atualizarDashboard = (lancamentos) => {
        const receitas = lancamentos.filter(l => l.tipo === 'entrada').reduce((acc, l) => acc + l.valor, 0);
        const despesas = lancamentos.filter(l => l.tipo === 'saida').reduce((acc, l) => acc + l.valor, 0);
        const balanco = receitas - despesas;

        document.getElementById('total-receitas').textContent = formatarMoeda(receitas);
        document.getElementById('total-despesas').textContent = formatarMoeda(despesas);
        const balancoEl = document.getElementById('balanco-mensal');
        balancoEl.textContent = formatarMoeda(balanco);
        balancoEl.style.color = balanco >= 0 ? '#28a745' : '#dc3545';
    };

    const renderizarGraficoAnual = (lancamentos) => {
        const anoSelecionado = filtroAno.value === 'todos' ? new Date().getFullYear() : filtroAno.value;
        document.getElementById('grafico-ano-titulo').textContent = anoSelecionado;

        const dadosPorMes = Array(12).fill(null).map(() => ({ entradas: 0, saidas: 0 }));

        lancamentos.forEach(l => {
            const data = new Date(l.data);
            if (data.getUTCFullYear() == anoSelecionado) {
                const mes = data.getUTCMonth(); // 0-11
                if (l.tipo === 'entrada') {
                    dadosPorMes[mes].entradas += l.valor;
                } else {
                    dadosPorMes[mes].saidas += l.valor;
                }
            }
        });

        const labels = (['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']);
        const dadosEntradas = dadosPorMes.map(d => d.entradas);
        const dadosSaidas = dadosPorMes.map(d => d.saidas);

        const ctx = document.getElementById('grafico-mensal').getContext('2d');
        if (graficoAnual) {
            graficoAnual.destroy();
        }
        graficoAnual = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    { label: 'Receitas', data: dadosEntradas, backgroundColor: '#28a745' },
                    { label: 'Despesas', data: dadosSaidas, backgroundColor: '#dc3545' }
                ]
            },
            options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }
        });
    };
    
    const renderizarGraficoDespesasPizza = (lancamentos) => {
        const despesas = lancamentos.filter(l => l.tipo === 'saida');
        const pizzaContainer = document.getElementById('grafico-pizza-container');

        if (despesas.length === 0) {
            pizzaContainer.innerHTML = '<p style="text-align:center; padding: 40px 20px; color: #888;">Nenhuma despesa no período para exibir o gráfico.</p>';
            if (graficoDespesasPizza) graficoDespesasPizza.destroy();
            return;
        }
        // Garante que o canvas exista se foi removido
        if (!pizzaContainer.querySelector('canvas')) {
            pizzaContainer.innerHTML = '<canvas id="grafico-despesas-pizza"></canvas>';
        }

        const despesasPorCategoria = despesas.reduce((acc, l) => {
            acc[l.categoria] = (acc[l.categoria] || 0) + l.valor;
            return acc;
        }, {});

        const labels = Object.keys(despesasPorCategoria);
        const data = Object.values(despesasPorCategoria);
        const cores = ['#dc3545', '#fd7e14', '#ffc107', '#6c757d', '#343a40', '#17a2b8', '#6f42c1'];

        const ctx = document.getElementById('grafico-despesas-pizza').getContext('2d');
        if (graficoDespesasPizza) {
            graficoDespesasPizza.destroy();
        }
        graficoDespesasPizza = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: cores,
                    borderColor: '#fff',
                    borderWidth: 2
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
        });
    };

    const renderizarGraficoContribuicoes = (contribuicoes) => {
        const container = document.getElementById('grafico-contribuicoes-container');
        const anoCorrente = new Date().getFullYear();
        document.getElementById('grafico-ano-membro').textContent = anoCorrente;

        const contribuicoesAno = contribuicoes.filter(c => new Date(c.data).getUTCFullYear() === anoCorrente);

        if (graficoContribuicoesMembro) {
            graficoContribuicoesMembro.destroy();
        }

        if (contribuicoesAno.length === 0) {
            container.innerHTML = '<p class="aviso-grafico-vazio">Nenhuma contribuição registrada neste ano para exibir o gráfico.</p>';
            return;
        }

        if (!container.querySelector('canvas')) {
            container.innerHTML = '<canvas id="grafico-contribuicoes-membro"></canvas>';
        }

        const dadosPorMes = Array(12).fill(0);
        contribuicoesAno.forEach(c => {
            const mes = new Date(c.data).getUTCMonth(); // 0-11
            dadosPorMes[mes] += c.valor;
        });

        const labels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        
        const ctx = document.getElementById('grafico-contribuicoes-membro').getContext('2d');
        graficoContribuicoesMembro = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: `Contribuições em ${anoCorrente}`,
                    data: dadosPorMes,
                    backgroundColor: 'rgba(40, 167, 69, 0.7)',
                    borderColor: 'rgba(40, 167, 69, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, ticks: { callback: (value) => formatarMoeda(value) } } }, plugins: { legend: { display: false } }
            }
        });
    };

    // --- Lógica de Filtros ---
    const aplicarFiltros = () => {
        const ano = filtroAno.value;
        const mes = filtroMes.value;
        const categoria = filtroCategoria.value;
        const tipo = filtroTipo.value;

        const lancamentosFiltrados = todosLancamentos.filter(l => {
            const dataLancamento = new Date(l.data);
            const anoOk = ano === 'todos' || dataLancamento.getUTCFullYear() == ano;
            const mesOk = mes === 'todos' || dataLancamento.getUTCMonth() + 1 == mes;
            const categoriaOk = categoria === 'todos' || l.categoria === categoria;
            const tipoOk = tipo === 'todos' || l.tipo === tipo;
            return anoOk && mesOk && categoriaOk && tipoOk;
        });

        renderizarTabela(lancamentosFiltrados);
        atualizarDashboard(lancamentosFiltrados);
        renderizarGraficoDespesasPizza(lancamentosFiltrados);
        renderizarGraficoAnual(todosLancamentos); // Atualiza o gráfico com base no ano
    };

    const popularFiltros = () => {
        const anos = [...new Set(todosLancamentos.map(l => new Date(l.data).getUTCFullYear()))].sort((a, b) => b - a);
        filtroAno.innerHTML = '<option value="todos">Todos os Anos</option>' + anos.map(ano => `<option value="${ano}">${ano}</option>`).join('');

        const meses = [
            { v: 1, n: 'Janeiro' }, { v: 2, n: 'Fevereiro' }, { v: 3, n: 'Março' }, { v: 4, n: 'Abril' },
            { v: 5, n: 'Maio' }, { v: 6, n: 'Junho' }, { v: 7, n: 'Julho' }, { v: 8, n: 'Agosto' },
            { v: 9, n: 'Setembro' }, { v: 10, n: 'Outubro' }, { v: 11, n: 'Novembro' }, { v: 12, n: 'Dezembro' }
        ];
        filtroMes.innerHTML = '<option value="todos">Todos os Meses</option>' + meses.map(m => `<option value="${m.v}">${m.n}</option>`).join('');

        const categorias = [...new Set(todosLancamentos.map(l => l.categoria))].sort();
        filtroCategoria.innerHTML = '<option value="todos">Todas as Categorias</option>' + categorias.map(c => `<option value="${c}">${c}</option>`).join('');

        // Seleciona o ano e mês corrente por padrão
        const hoje = new Date();
        filtroAno.value = hoje.getFullYear();
        filtroMes.value = hoje.getMonth() + 1;

        [filtroAno, filtroMes, filtroCategoria, filtroTipo].forEach(filtro => {
            filtro.addEventListener('change', aplicarFiltros);
        });
    };

    // --- Lógica do Modal ---
    const abrirModal = (lancamento = null, duplicar = false) => {
        formLancamento.reset();
        lancamentoEmEdicaoId = null;
        document.getElementById('grupo-membro').classList.add('hidden');
        document.getElementById('comprovante-atual-container').classList.add('hidden');
        document.getElementById('comprovante-atual-link').href = '#';

        if (lancamento && !duplicar) { // Modo Edição
            document.getElementById('modal-titulo').textContent = 'Editar Lançamento';
            lancamentoEmEdicaoId = lancamento._id;
            document.getElementById('tipo').value = lancamento.tipo;
            document.getElementById('data').value = lancamento.data.split('T')[0];
            document.getElementById('valor').value = lancamento.valor;
            document.getElementById('descricao').value = lancamento.descricao;
            
            atualizarCategoriasModal(lancamento.tipo, lancamento.categoria);

            if (lancamento.membroId) {
                document.getElementById('grupo-membro').classList.remove('hidden');
                document.getElementById('membroId').value = lancamento.membroId;
            }

            if (lancamento.comprovanteUrl) {
                document.getElementById('comprovante-atual-container').classList.remove('hidden');
                document.getElementById('comprovante-atual-link').textContent = lancamento.comprovanteUrl.split('/').pop();
                document.getElementById('comprovante-atual-link').href = lancamento.comprovanteUrl;
            }
        } else if (lancamento && duplicar) { // Modo Duplicação
            document.getElementById('modal-titulo').textContent = 'Duplicar Lançamento';
            // Preenche os dados, mas não o ID. A data é a de hoje.
            document.getElementById('tipo').value = lancamento.tipo;
            document.getElementById('data').value = new Date().toISOString().split('T')[0];
            document.getElementById('valor').value = lancamento.valor;
            document.getElementById('descricao').value = lancamento.descricao;
            
            atualizarCategoriasModal(lancamento.tipo, lancamento.categoria);

            if (lancamento.membroId) {
                document.getElementById('grupo-membro').classList.remove('hidden');
                document.getElementById('membroId').value = lancamento.membroId;
            }
            // Não duplica o comprovante

        } else { // Modo Novo Lançamento
            document.getElementById('modal-titulo').textContent = 'Novo Lançamento';
            document.getElementById('data').value = new Date().toISOString().split('T')[0];
            atualizarCategoriasModal('entrada');
        }
        modalLancamento.style.display = 'flex';
    };

    const fecharModal = () => {
        modalLancamento.style.display = 'none';
    };

    const atualizarCategoriasModal = (tipo, categoriaSelecionada = null) => {
        const selectCategoria = document.getElementById('categoria');
        const categorias = tipo === 'entrada' ? categoriasConfig.entradas : categoriasConfig.saidas;
        selectCategoria.innerHTML = categorias.map(c => `<option value="${c}">${c}</option>`).join('');
        if (categoriaSelecionada) {
            selectCategoria.value = categoriaSelecionada;
        }
        // Mostra/esconde campo de membro se a categoria for Dízimo ou Oferta
        const isContribuicao = selectCategoria.value === 'Dízimo' || selectCategoria.value === 'Oferta Geral';
        document.getElementById('grupo-membro').classList.toggle('hidden', !isContribuicao);
    };

    document.getElementById('btn-novo-lancamento').addEventListener('click', () => abrirModal());
    modalLancamento.querySelector('[data-close]').addEventListener('click', fecharModal);
    document.getElementById('tipo').addEventListener('change', (e) => atualizarCategoriasModal(e.target.value));
    document.getElementById('categoria').addEventListener('change', (e) => {
        const isContribuicao = e.target.value === 'Dízimo' || e.target.value === 'Oferta Geral';
        document.getElementById('grupo-membro').classList.toggle('hidden', !isContribuicao);
    });

    // --- Ações (Salvar, Editar, Excluir) ---
    formLancamento.addEventListener('submit', async (e) => {
        e.preventDefault();
        const comprovanteInput = document.getElementById('comprovante');
        let comprovanteUrl = document.getElementById('comprovante-atual-link').href;
        comprovanteUrl = comprovanteUrl.endsWith('#') ? null : new URL(comprovanteUrl).pathname;

        try {
            if (comprovanteInput.files[0]) {
                const formData = new FormData();
                formData.append('comprovante', comprovanteInput.files[0]);
                const res = await window.api.post('/api/financeiro/upload-comprovante', formData);
                comprovanteUrl = res.filePath;
            }
        } catch (error) {
            console.error('Erro no upload do comprovante:', error);
            alert('Falha ao enviar o comprovante. O lançamento não foi salvo.');
            return;
        }

        const dados = {
            tipo: document.getElementById('tipo').value,
            data: document.getElementById('data').value,
            valor: parseFloat(document.getElementById('valor').value),
            categoria: document.getElementById('categoria').value,
            descricao: document.getElementById('descricao').value,
            membroId: document.getElementById('membroId').value || null,
            comprovanteUrl: comprovanteUrl
        };

        try {
            if (lancamentoEmEdicaoId) {
                await window.api.put(`/api/financeiro/lancamentos/${lancamentoEmEdicaoId}`, dados);
            } else {
                await window.api.post('/api/financeiro/lancamentos', dados); // Corrigido erro de digitação
            }
            
            fecharModal();
            await carregarDados();
            alert('Lançamento salvo com sucesso!');
        } catch (error) {
            console.error('Erro ao salvar:', error);
            alert('Não foi possível salvar o lançamento.');
        }
    });

    // --- LÓGICA DE EDIÇÃO EM LINHA ---
    const salvarEdicaoEmLinha = async (evento) => {
        const celula = evento.target;
        const id = celula.dataset.id;
        const campo = celula.dataset.field;
        const lancamentoOriginal = todosLancamentos.find(l => l._id === id);

        if (!lancamentoOriginal) return;

        let novoValor = celula.textContent.trim();
        let valorOriginal = lancamentoOriginal[campo];

        if (campo === 'valor') {
            novoValor = parseFloat(novoValor.replace('R$', '').replace('.', '').replace(',', '.').trim());
            if (isNaN(novoValor)) {
                alert('Valor inválido. Por favor, insira um número.');
                celula.textContent = formatarMoeda(valorOriginal); // Restaura o valor original
                return;
            }
        }

        // Se o valor não mudou, não faz nada
        if (novoValor === valorOriginal) {
            if (campo === 'valor') celula.textContent = formatarMoeda(valorOriginal);
            return;
        }

        try {
            const dadosAtualizados = { [campo]: novoValor };
            await window.api.put(`/api/financeiro/lancamentos/${id}`, dadosAtualizados);
            
            // Atualiza o estado local e re-renderiza
            const index = todosLancamentos.findIndex(l => l._id === id);
            todosLancamentos[index] = { ...lancamentos[index], ...dadosAtualizados };
            aplicarFiltros();

        } catch (error) {
            console.error('Erro na edição em linha:', error);
            alert('Falha ao salvar a alteração.');
            // Restaura o valor original na célula em caso de erro
            celula.textContent = campo === 'valor' ? formatarMoeda(valorOriginal) : valorOriginal;
        }
    };

    tabelaCorpo.addEventListener('click', (e) => {
        const id = e.target.dataset.id;
        if (e.target.classList.contains('bxs-edit')) {
            const lancamento = todosLancamentos.find(l => l._id === id);
            abrirModal(lancamento);
        } else if (e.target.classList.contains('bxs-copy')) {
            const lancamento = todosLancamentos.find(l => l._id === id);
            abrirModal(lancamento, true); // Passa o segundo argumento como true para duplicar
        } else if (e.target.classList.contains('bxs-trash')) {
            iniciarExclusaoComDesfazer(id);
        }
    });

    // Adiciona o listener para o evento 'blur' (quando o foco sai da célula)
    tabelaCorpo.addEventListener('blur', (e) => {
        if (e.target.classList.contains('celula-editavel')) {
            salvarEdicaoEmLinha(e);
        }
    }, true); // Usa 'capturing' para garantir que o evento seja pego

    // --- LÓGICA DE SELEÇÃO E EXCLUSÃO EM LOTE ---
    const btnExcluirSelecionados = document.getElementById('btn-excluir-selecionados');
    const checkboxSelecionarTodos = document.getElementById('selecionar-todos-lancamentos');

    const atualizarEstadoExclusaoLote = () => {
        if (lancamentosSelecionados.size > 0) {
            btnExcluirSelecionados.classList.remove('hidden');
            btnExcluirSelecionados.textContent = `Excluir ${lancamentosSelecionados.size} Iten(s)`;
        } else {
            btnExcluirSelecionados.classList.add('hidden');
        }
    };

    tabelaCorpo.addEventListener('click', (e) => {
        if (e.target.classList.contains('checkbox-lancamento')) {
            const id = e.target.dataset.id;
            const tr = e.target.closest('tr');
            if (e.target.checked) {
                lancamentosSelecionados.add(id);
                tr.classList.add('selecionada');
            } else {
                lancamentosSelecionados.delete(id);
                tr.classList.remove('selecionada');
            }
            atualizarEstadoExclusaoLote();
        }
    });

    checkboxSelecionarTodos.addEventListener('change', (e) => {
        const isChecked = e.target.checked;
        const checkboxes = tabelaCorpo.querySelectorAll('.checkbox-lancamento');
        checkboxes.forEach(checkbox => {
            const id = checkbox.dataset.id;
            const tr = checkbox.closest('tr');
            checkbox.checked = isChecked;
            if (isChecked) {
                lancamentosSelecionados.add(id);
                tr.classList.add('selecionada');
            } else {
                lancamentosSelecionados.delete(id);
                tr.classList.remove('selecionada');
            }
        });
        atualizarEstadoExclusaoLote();
    });

    btnExcluirSelecionados.addEventListener('click', async () => {
        if (confirm(`Tem certeza que deseja excluir os ${lancamentosSelecionados.size} lançamentos selecionados?`)) {
            try {
                await window.api.request('/api/financeiro/lancamentos/lote', 'DELETE', { ids: [...lancamentosSelecionados] });
                lancamentosSelecionados.clear();
                atualizarEstadoExclusaoLote();
                await carregarDados();
                alert('Lançamentos excluídos com sucesso.');
            } catch (error) {
                console.error('Erro ao excluir em lote:', error);
                alert('Não foi possível excluir os lançamentos selecionados.');
            }
        }
    });

    // --- LÓGICA DE EXCLUSÃO COM DESFAZER ---
    const toast = document.getElementById('toast-desfazer');
    const btnDesfazer = document.getElementById('btn-desfazer');

    const iniciarExclusaoComDesfazer = (id) => {
        // Cancela qualquer exclusão anterior que ainda esteja pendente
        if (exclusaoTimeout) {
            clearTimeout(exclusaoTimeout);
            // Se houver um item pendente, exclui ele permanentemente antes de lidar com o novo
            if (itemParaExcluir) excluirLancamento(itemParaExcluir.id, false);
        }

        itemParaExcluir = { id: id, index: todosLancamentos.findIndex(l => l._id === id) };
        if (itemParaExcluir.index === -1) return;

        // Remove o item da lista principal temporariamente e atualiza a UI
        todosLancamentos.splice(itemParaExcluir.index, 1);
        aplicarFiltros();

        // Mostra o toast
        document.getElementById('toast-mensagem').textContent = 'Lançamento excluído.';
        toast.classList.add('show');

        // Agenda a exclusão permanente
        exclusaoTimeout = setTimeout(() => {
            excluirLancamento(itemParaExcluir.id, false); // 'false' para não recarregar tudo de novo
            itemParaExcluir = null;
            toast.classList.remove('show');
        }, 5000); // 5 segundos para desfazer
    };

    btnDesfazer.addEventListener('click', () => {
        clearTimeout(exclusaoTimeout);
        toast.classList.remove('show');

        // Restaura o item na sua posição original
        const lancamentoRestaurado = todosLancamentos[itemParaExcluir.index];
        todosLancamentos.splice(itemParaExcluir.index, 0, lancamentoRestaurado);
        aplicarFiltros();

        itemParaExcluir = null;
        exclusaoTimeout = null;
    });

    const excluirLancamento = async (id, recarregar = true) => {
        try {
            await window.api.delete(`/api/financeiro/lancamentos/${id}`);
            if (recarregar) {
                await carregarDados();
                alert('Lançamento excluído com sucesso.');
            }
        } catch (error) {
            console.error('Erro ao excluir:', error);
            alert('Não foi possível excluir o lançamento.');
            // Se der erro, recarrega os dados para restaurar o estado visual
            if (recarregar) await carregarDados();
        }
    };

    // --- Carregamento Inicial --- //
    const carregarDados = async () => {
        try {
            const [resLancamentos, resMembros, resConfig] = await Promise.all([
                window.api.get('/api/financeiro/lancamentos'),
                window.api.get('/api/membros'),
                window.api.get('/api/configs') // CORREÇÃO: Busca as configurações da rota correta.
            ]);

            [todosLancamentos, todosMembros, configData] = [resLancamentos, resMembros, resConfig];
            categoriasConfig = configData.financeiro_categorias;

            // Popular select de membros no modal
            const selectMembro = document.getElementById('membroId');
            selectMembro.innerHTML = '<option value="">Anônimo/Geral</option>' + todosMembros.map(m => `<option value="${m._id}">${m.nome}</option>`).join('');

            popularFiltros();
            aplicarFiltros();
            // Lógica para abas e outros componentes que dependem dos dados...

        } catch (error) {
            console.error("Erro no carregamento inicial:", error);
            tabelaCorpo.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 20px; color: red;">Falha ao carregar dados do servidor.</td></tr>';
        }
    };

    // --- Lógica das Abas ---
    const abasLink = document.querySelectorAll('.abas-financeiro .aba-link');
    const abasConteudo = document.querySelectorAll('.aba-conteudo');

    abasLink.forEach(aba => {
        aba.addEventListener('click', () => {
            // Remove 'active' de todos
            abasLink.forEach(l => l.classList.remove('active'));
            abasConteudo.forEach(c => c.classList.remove('active'));

            // Adiciona 'active' ao clicado
            aba.classList.add('active');
            document.getElementById(aba.dataset.aba).classList.add('active');
        });
    });

    // --- Lógica da Aba de Dízimos ---
    const buscaMembroInput = document.getElementById('busca-membro-input');
    const buscaResultados = document.getElementById('busca-membro-resultados');
    const historicoContainer = document.getElementById('historico-membro-container');
    const avisoInicial = document.getElementById('aviso-inicial-dizimos');

    buscaMembroInput.addEventListener('input', () => {
        const termo = buscaMembroInput.value.toLowerCase();
        if (termo.length < 2) {
            buscaResultados.classList.remove('active');
            return;
        }
        const membrosFiltrados = todosMembros.filter(m => m.nome.toLowerCase().includes(termo));
        
        if (membrosFiltrados.length > 0) {
            buscaResultados.innerHTML = membrosFiltrados.map(m => `<div class="resultado-item" data-id="${m._id}">${m.nome}</div>`).join('');
            buscaResultados.classList.add('active');
        } else {
            buscaResultados.classList.remove('active');
        }
    });

    buscaResultados.addEventListener('click', (e) => {
        if (e.target.classList.contains('resultado-item')) {
            const membroId = e.target.dataset.id;
            const membro = todosMembros.find(m => m._id === membroId);
            exibirHistoricoMembro(membro);
            buscaMembroInput.value = '';
            buscaResultados.classList.remove('active');
        }
    });

    const imprimirRelatorioAnualMembro = (membro, contribuicoes) => {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const anoCorrente = new Date().getFullYear();

        const contribuicoesAno = contribuicoes.filter(c => new Date(c.data).getUTCFullYear() === anoCorrente);
        const totalContribuido = contribuicoesAno.reduce((acc, c) => acc + c.valor, 0);

        // --- Cabeçalho ---
        doc.setFontSize(18);
        doc.text('Declaração Anual de Contribuições', 105, 22, { align: 'center' });
        doc.setFontSize(12);
        doc.text(`Ano de Referência: ${anoCorrente}`, 105, 30, { align: 'center' });

        // --- Informações do Membro ---
        doc.setFontSize(11);
        doc.text(`Declaramos para os devidos fins que o(a) irmão(ã) ${membro.nome},`, 14, 50);
        doc.text(`membro desta igreja, contribuiu durante o ano de ${anoCorrente} com o valor total de:`, 14, 57);
        
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text(formatarMoeda(totalContribuido), 105, 70, { align: 'center' });
        doc.setFont('helvetica', 'normal');

        // --- Tabela de Detalhamento ---
        const tableRows = contribuicoesAno.map(c => [
            new Date(c.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' }),
            c.categoria,
            c.descricao,
            formatarMoeda(c.valor)
        ]);

        doc.autoTable({
            head: [['Data', 'Categoria', 'Descrição', 'Valor']],
            body: tableRows,
            startY: 80,
            headStyles: { fillColor: [0, 31, 93] },
            foot: [['', '', 'Total Contribuído', formatarMoeda(totalContribuido)]],
            footStyles: { fontStyle: 'bold', fillColor: [230, 230, 230], textColor: [0,0,0] },
            columnStyles: { 3: { halign: 'right' } }
        });

        // --- Rodapé e Assinatura ---
        const finalY = doc.lastAutoTable.finalY + 25;
        doc.text('___________________________________', 105, finalY + 10, { align: 'center' });
        doc.text('Tesouraria - ADTC Tabernáculo Celeste', 105, finalY + 17, { align: 'center' });
        doc.save(`Relatorio_Contribuicoes_${membro.nome.split(' ')[0]}_${anoCorrente}.pdf`);
    };

    const exibirHistoricoMembro = (membro) => {
        avisoInicial.classList.add('hidden');
        historicoContainer.classList.remove('hidden');
        document.getElementById('historico-membro-nome').textContent = membro.nome;

        const contribuicoes = todosLancamentos.filter(l => l.membroId === membro._id && (l.categoria === 'Dízimo' || l.categoria === 'Oferta Geral'));
        const corpoHistorico = document.getElementById('tabela-historico-corpo');
        
        if (contribuicoes.length > 0) {
            corpoHistorico.innerHTML = contribuicoes.map(c => `
                <tr>
                    <td>${new Date(c.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</td>
                    <td>${c.categoria}</td>
                    <td>${c.descricao}</td>
                    <td>${formatarMoeda(c.valor)}</td>
                </tr>
            `).join('');
            document.getElementById('aviso-sem-historico').classList.add('hidden');
        } else {
            corpoHistorico.innerHTML = '';
            document.getElementById('aviso-sem-historico').classList.remove('hidden');
        }

        const totalGeral = contribuicoes.reduce((acc, c) => acc + c.valor, 0);
        document.getElementById('total-geral-historico').textContent = formatarMoeda(totalGeral);

        const anoCorrente = new Date().getFullYear();
        document.getElementById('ano-corrente-historico').textContent = anoCorrente;
        const totalAnual = contribuicoes
            .filter(c => new Date(c.data).getUTCFullYear() === anoCorrente)
            .reduce((acc, c) => acc + c.valor, 0);
        document.getElementById('total-anual-membro').textContent = formatarMoeda(totalAnual);
        
        // Renderiza o novo gráfico de contribuições
        renderizarGraficoContribuicoes(contribuicoes);

        document.getElementById('btn-novo-dizimo-membro').onclick = () => {
            abrirModal();
            setTimeout(() => {
                document.getElementById('tipo').value = 'entrada';
                atualizarCategoriasModal('entrada', 'Dízimo');
                document.getElementById('membroId').value = membro._id;
            }, 100);
        };

        document.getElementById('btn-imprimir-relatorio-membro').onclick = () => {
            imprimirRelatorioAnualMembro(membro, contribuicoes);
        };
    };

    // Inicializa a página
    carregarDados();
});
