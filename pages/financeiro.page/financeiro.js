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
    let membroEmVisualizacaoId = null; // Variável para guardar o membro em visualização na aba de dízimos

    // --- Seletores do DOM ---
    const modalLancamento = document.getElementById('modal-lancamento');
    const formLancamento = document.getElementById('form-lancamento');
    const tabelaCorpo = document.getElementById('tabela-lancamentos-corpo');
    const filtroAno = document.getElementById('filtro-ano');
    const filtroMes = document.getElementById('filtro-mes');
    const filtroCategoria = document.getElementById('filtro-categoria');
    const filtroTipo = document.getElementById('filtro-tipo');
    const contextMenu = document.getElementById('context-menu');
    let rightClickedRowId = null;

    // --- Seletores para a busca de membro no modal ---
    const buscaMembroModalInput = document.getElementById('busca-membro-modal');
    const buscaMembroResultadosModal = document.getElementById('busca-membro-resultados-modal');
    const membroIdHiddenInput = document.getElementById('membroId-hidden');
    const clearMembroBtn = document.getElementById('clear-membro-btn');


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
                <td class="coluna-checkbox"><input type="checkbox" class="checkbox-lancamento" data-id="${l._id}" ${lancamentosSelecionados.has(l._id) ? 'checked' : ''}></td>
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
                const mes = data.getUTCMonth();
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
            const mes = new Date(c.data).getUTCMonth();
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
    const aplicarFiltros = (retornarArray = false) => {
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

        if (retornarArray) {
            return lancamentosFiltrados;
        }

        renderizarTabela(lancamentosFiltrados);
        atualizarDashboard(lancamentosFiltrados);
        renderizarGraficoDespesasPizza(lancamentosFiltrados);
        renderizarGraficoAnual(todosLancamentos);
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
        membroIdHiddenInput.value = '';
        buscaMembroModalInput.value = '';
        buscaMembroModalInput.disabled = false;
        clearMembroBtn.classList.add('hidden');
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
                const membro = todosMembros.find(m => m._id === lancamento.membroId);
                if (membro) {
                    buscaMembroModalInput.value = membro.nome;
                    membroIdHiddenInput.value = membro._id;
                    buscaMembroModalInput.disabled = true;
                    clearMembroBtn.classList.remove('hidden');
                }
            }

            if (lancamento.comprovanteUrl) {
                document.getElementById('comprovante-atual-container').classList.remove('hidden');
                document.getElementById('comprovante-atual-link').textContent = lancamento.comprovanteUrl.split('/').pop();
                document.getElementById('comprovante-atual-link').href = lancamento.comprovanteUrl;
            }
        } else if (lancamento && duplicar) { // Modo Duplicação
            document.getElementById('modal-titulo').textContent = 'Duplicar Lançamento';
            document.getElementById('tipo').value = lancamento.tipo;
            document.getElementById('data').value = new Date().toISOString().split('T')[0];
            document.getElementById('valor').value = lancamento.valor;
            document.getElementById('descricao').value = lancamento.descricao;
            
            atualizarCategoriasModal(lancamento.tipo, lancamento.categoria);

            if (lancamento.membroId) {
                 const membro = todosMembros.find(m => m._id === lancamento.membroId);
                if (membro) {
                    buscaMembroModalInput.value = membro.nome;
                    membroIdHiddenInput.value = membro._id;
                    buscaMembroModalInput.disabled = true;
                    clearMembroBtn.classList.remove('hidden');
                }
            }

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
        const categoriaAtual = selectCategoria.value;
        const isContribuicao = categoriaAtual.includes('Dízimo') || categoriaAtual.includes('Oferta');
        document.getElementById('grupo-membro').classList.toggle('hidden', !isContribuicao);
    };

    document.getElementById('btn-novo-lancamento').addEventListener('click', () => abrirModal());
    modalLancamento.querySelector('[data-close]').addEventListener('click', fecharModal);
    document.getElementById('tipo').addEventListener('change', (e) => atualizarCategoriasModal(e.target.value));
    document.getElementById('categoria').addEventListener('change', (e) => {
        const categoria = e.target.value;
        const isContribuicao = categoria.includes('Dízimo') || categoria.includes('Oferta');
        document.getElementById('grupo-membro').classList.toggle('hidden', !isContribuicao);
    });

    // --- Lógica de busca de membro no modal ---
    buscaMembroModalInput.addEventListener('input', () => {
        const termo = buscaMembroModalInput.value.toLowerCase();
        if (termo.length < 2) {
            buscaMembroResultadosModal.classList.remove('active');
            return;
        }
        const membrosFiltrados = todosMembros.filter(m => 
            m.nome.toLowerCase().includes(termo) || (m.cpf && m.cpf.replace(/\D/g, '').includes(termo))
        );
        
        if (membrosFiltrados.length > 0) {
            buscaMembroResultadosModal.innerHTML = membrosFiltrados.map(m => 
                `<div class="resultado-item" data-id="${m._id}" data-nome="${m.nome}">${m.nome} - ${m.cpf || 'CPF não cadastrado'}</div>`
            ).join('');
            buscaMembroResultadosModal.classList.add('active');
        } else {
            buscaMembroResultadosModal.innerHTML = '<div class="resultado-item-none">Nenhum membro encontrado</div>';
            buscaMembroResultadosModal.classList.add('active');
        }
    });

    buscaMembroResultadosModal.addEventListener('click', (e) => {
        const item = e.target.closest('.resultado-item');
        if (item) {
            buscaMembroModalInput.value = item.dataset.nome;
            membroIdHiddenInput.value = item.dataset.id;
            buscaMembroResultadosModal.classList.remove('active');
            buscaMembroModalInput.disabled = true;
            clearMembroBtn.classList.remove('hidden');
        }
    });

    clearMembroBtn.addEventListener('click', () => {
        buscaMembroModalInput.value = '';
        membroIdHiddenInput.value = '';
        buscaMembroModalInput.disabled = false;
        clearMembroBtn.classList.add('hidden');
        buscaMembroModalInput.focus();
    });


    const modalDetalhes = document.getElementById('modal-detalhes-lancamento');

    const abrirModalDetalhes = (lancamento) => {
        document.getElementById('detalhes-data').textContent = new Date(lancamento.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
        document.getElementById('detalhes-tipo').textContent = lancamento.tipo.charAt(0).toUpperCase() + lancamento.tipo.slice(1);
        document.getElementById('detalhes-valor').textContent = formatarMoeda(lancamento.valor);
        document.getElementById('detalhes-categoria').textContent = lancamento.categoria;
        document.getElementById('detalhes-descricao').textContent = lancamento.descricao;

        if (lancamento.membroId) {
            const membro = todosMembros.find(m => m._id === lancamento.membroId);
            document.getElementById('detalhes-membro').textContent = membro ? membro.nome : 'Não encontrado';
            document.getElementById('detalhes-membro-container').classList.remove('hidden');
        } else {
            document.getElementById('detalhes-membro-container').classList.add('hidden');
        }

        const previewContainer = document.getElementById('detalhes-comprovante-preview');
        if (lancamento.comprovanteUrl) {
            if (lancamento.comprovanteUrl.endsWith('.pdf')) {
                previewContainer.innerHTML = `<iframe src="${lancamento.comprovanteUrl}" width="100%" height="400px"></iframe>`;
            } else {
                previewContainer.innerHTML = `<img src="${lancamento.comprovanteUrl}" alt="Comprovante">`;
            }
        } else {
            previewContainer.innerHTML = '<span>Nenhum comprovante carregado</span>';
        }

        const btnImprimir = document.getElementById('detalhes-btn-imprimir');
        const btnCompartilhar = document.getElementById('detalhes-btn-compartilhar');
        const isContribuicao = lancamento.categoria.toLowerCase().includes('dízimo') || lancamento.categoria.toLowerCase().includes('oferta');

        if (isContribuicao && lancamento.membroId) {
            btnImprimir.classList.remove('hidden');
            btnImprimir.onclick = () => gerarReciboPDF(lancamento);
            btnCompartilhar.classList.remove('hidden');
            btnCompartilhar.onclick = () => compartilharRecibo(lancamento);
        } else {
            btnImprimir.classList.add('hidden');
            btnCompartilhar.classList.add('hidden');
        }

        modalDetalhes.style.display = 'flex';
    };

    const fecharModalDetalhes = () => {
        modalDetalhes.style.display = 'none';
    }

    modalDetalhes.querySelectorAll('[data-close]').forEach(el => el.addEventListener('click', fecharModalDetalhes));

    const preencherRecibo = (lancamento, membro) => {
        document.getElementById('recibo-nome-membro').textContent = membro ? membro.nome : 'Anônimo';
        document.getElementById('recibo-valor').textContent = formatarMoeda(lancamento.valor);
        document.getElementById('recibo-descricao').textContent = lancamento.descricao;
        document.getElementById('recibo-data').textContent = new Date(lancamento.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
        document.getElementById('recibo-categoria').textContent = lancamento.categoria;
    };

    const gerarReciboPDF = async (lancamento) => {
        const membro = todosMembros.find(m => m._id === lancamento.membroId);
        if (!membro) {
            alert('Membro não encontrado para gerar o recibo.');
            return;
        }

        preencherRecibo(lancamento, membro);

        const { jsPDF } = window.jspdf;
        const reciboElement = document.getElementById('recibo-template');

        const canvas = await html2canvas(reciboElement, { scale: 2 });
        const imgData = canvas.toDataURL('image/png');

        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`Recibo_${lancamento.categoria}_${membro.nome.split(' ')[0]}.pdf`);
    };

    const compartilharRecibo = async (lancamento) => {
        const membro = todosMembros.find(m => m._id === lancamento.membroId);
        if (!membro) {
            alert('Membro não encontrado para compartilhar o recibo.');
            return;
        }

        preencherRecibo(lancamento, membro);
        const reciboElement = document.getElementById('recibo-template');

        try {
            const canvas = await html2canvas(reciboElement, { scale: 2 });
            canvas.toBlob(async (blob) => {
                const fileName = `Recibo_${membro.nome.split(' ')[0]}.png`;
                const file = new File([blob], fileName, { type: 'image/png' });
                const shareData = {
                    files: [file],
                    title: 'Recibo de Contribuição',
                    text: `Olá ${membro.nome}, segue o seu recibo de contribuição. Deus abençoe!`,
                };

                if (navigator.canShare && navigator.canShare(shareData)) {
                    await navigator.share(shareData);
                } else {
                    alert('O compartilhamento de arquivos não é suportado neste navegador. O recibo será baixado.');
                    const link = document.createElement('a');
                    link.href = URL.createObjectURL(blob);
                    link.download = fileName;
                    link.click();
                }
            }, 'image/png');
        } catch (error) {
            console.error('Erro ao gerar ou compartilhar recibo:', error);
            alert('Ocorreu um erro ao tentar compartilhar o recibo.');
        }
    };

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
            membroId: membroIdHiddenInput.value || null,
            comprovanteUrl: comprovanteUrl
        };

        try {
            if (lancamentoEmEdicaoId) {
                await window.api.put(`/api/financeiro/lancamentos/${lancamentoEmEdicaoId}`, dados);
            } else {
                await window.api.post('/api/financeiro/lancamentos', dados);
            }
            
            fecharModal();
            await carregarDados();
            alert('Lançamento salvo com sucesso!');

            if (membroEmVisualizacaoId) {
                const membroAtualizado = todosMembros.find(m => m._id === membroEmVisualizacaoId);
                if (membroAtualizado) {
                    exibirHistoricoMembro(membroAtualizado);
                }
            }
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
                celula.textContent = formatarMoeda(valorOriginal);
                return;
            }
        }

        if (novoValor === valorOriginal) {
            if (campo === 'valor') celula.textContent = formatarMoeda(valorOriginal);
            return;
        }

        try {
            const dadosAtualizados = { [campo]: novoValor };
            await window.api.put(`/api/financeiro/lancamentos/${id}`, dadosAtualizados);
            
            const index = todosLancamentos.findIndex(l => l._id === id);
            todosLancamentos[index] = { ...todosLancamentos[index], ...dadosAtualizados };
            aplicarFiltros();

        } catch (error) {
            console.error('Erro na edição em linha:', error);
            alert('Falha ao salvar a alteração.');
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
            abrirModal(lancamento, true);
        } else if (e.target.classList.contains('bxs-trash')) {
            iniciarExclusaoComDesfazer(id);
        }
    });

    tabelaCorpo.addEventListener('blur', (e) => {
        if (e.target.classList.contains('celula-editavel')) {
            salvarEdicaoEmLinha(e);
        }
    }, true);

    // --- LÓGICA DO MENU DE CONTEXTO ---
    tabelaCorpo.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        const tr = e.target.closest('tr');
        if (!tr || !tr.dataset.id) return;

        rightClickedRowId = tr.dataset.id;

        const x = e.pageX;
        const y = e.pageY;
        contextMenu.style.display = 'block';
        contextMenu.style.left = `${x}px`;
        contextMenu.style.top = `${y}px`;
    });

    window.addEventListener('click', (e) => {
        if (contextMenu.style.display === 'block') {
            contextMenu.style.display = 'none';
        }
        if (!e.target.closest('.tabela-lancamentos, .context-menu')) {
            const tabelaLancamentos = document.querySelector('.tabela-lancamentos');
            if (tabelaLancamentos) {
                tabelaLancamentos.classList.remove('modo-selecao');
            }
            lancamentosSelecionados.clear();
            const checkboxSelecionarTodos = document.getElementById('selecionar-todos-lancamentos');
            if(checkboxSelecionarTodos) {
                checkboxSelecionarTodos.checked = false;
            }
            tabelaCorpo.querySelectorAll('.checkbox-lancamento').forEach(cb => cb.checked = false);
            tabelaCorpo.querySelectorAll('.selecionada').forEach(row => row.classList.remove('selecionada'));
            atualizarEstadoExclusaoLote();
        }
    });

    document.getElementById('context-selecionar').addEventListener('click', () => {
        if (!rightClickedRowId) return;
        document.querySelector('.tabela-lancamentos').classList.add('modo-selecao');
        const checkbox = tabelaCorpo.querySelector(`.checkbox-lancamento[data-id="${rightClickedRowId}"]`);
        if (checkbox && !checkbox.checked) {
            checkbox.checked = true;
            checkbox.dispatchEvent(new Event('change', { bubbles: true }));
        }
    });

    document.getElementById('context-editar').addEventListener('click', () => {
        if (!rightClickedRowId) return;
        const lancamento = todosLancamentos.find(l => l._id === rightClickedRowId);
        if(lancamento) abrirModal(lancamento);
    });

    document.getElementById('context-excluir').addEventListener('click', () => {
        if (!rightClickedRowId) return;
        iniciarExclusaoComDesfazer(rightClickedRowId);
    });

    document.getElementById('context-copiar').addEventListener('click', () => {
        if (!rightClickedRowId) return;
        const lancamento = todosLancamentos.find(l => l._id === rightClickedRowId);
        if (lancamento) {
            const texto = `Data: ${new Date(lancamento.data).toLocaleDateString('pt-BR')}\tValor: ${formatarMoeda(lancamento.valor)}\tCategoria: ${lancamento.categoria}\tDescrição: ${lancamento.descricao}`;
            navigator.clipboard.writeText(texto).then(() => {
                alert('Dados do lançamento copiados para a área de transferência!');
            }).catch(err => {
                console.error('Erro ao copiar texto: ', err);
                alert('Não foi possível copiar os dados.');
            });
        }
    });

    document.getElementById('context-imprimir').addEventListener('click', () => {
        if (!rightClickedRowId) return;
        const lancamento = todosLancamentos.find(l => l._id === rightClickedRowId);
        if (lancamento) {
            gerarReciboPDF(lancamento);
        } else {
            alert('Lançamento não encontrado.');
        }
    });

    // --- LÓGICA DE SELEÇÃO E EXCLUSÃO EM LOTE ---
    const btnExcluirSelecionados = document.getElementById('btn-excluir-selecionados');
    const checkboxSelecionarTodos = document.getElementById('selecionar-todos-lancamentos');
    const tabelaLancamentos = document.querySelector('.tabela-lancamentos');

    const atualizarEstadoExclusaoLote = () => {
        if (lancamentosSelecionados.size > 0) {
            btnExcluirSelecionados.classList.remove('hidden');
            btnExcluirSelecionados.textContent = `Excluir ${lancamentosSelecionados.size} Iten(s)`;
        } else {
            btnExcluirSelecionados.classList.add('hidden');
            if(tabelaLancamentos) {
                tabelaLancamentos.classList.remove('modo-selecao');
            }
        }
    };

    tabelaCorpo.addEventListener('change', (e) => {
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

    tabelaCorpo.addEventListener('click', (e) => {
        const target = e.target;
        if (target.closest('.acoes-item')) return;
        const tr = target.closest('tr');
        if (!tr) return;

        if (tabelaLancamentos && tabelaLancamentos.classList.contains('modo-selecao')) {
            if (target.closest('a, [contenteditable]')) return;
            const checkbox = tr.querySelector('.checkbox-lancamento');
            if (checkbox) {
                if (target.type !== 'checkbox') {
                    checkbox.checked = !checkbox.checked;
                }
                checkbox.dispatchEvent(new Event('change', { bubbles: true }));
            }
        } else {
            if (!target.closest('a, i, [contenteditable], input')) {
                const id = tr.dataset.id;
                const lancamento = todosLancamentos.find(l => l._id === id);
                if(lancamento) abrirModalDetalhes(lancamento);
            }
        }
    });

    if(checkboxSelecionarTodos) {
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
    }

    if(btnExcluirSelecionados) {
        btnExcluirSelecionados.addEventListener('click', async () => {
            if (confirm(`Tem certeza que deseja excluir os ${lancamentosSelecionados.size} lançamentos selecionados?`)) {
                try {
                    // CORREÇÃO: Usar o método .delete que existe no objeto window.api
                    await window.api.delete('/api/financeiro/lancamentos/lote', { ids: [...lancamentosSelecionados] });
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
    }

    // --- LÓGICA DE EXCLUSÃO COM DESFAZER ---
    const toast = document.getElementById('toast-desfazer');
    const btnDesfazer = document.getElementById('btn-desfazer');

    const iniciarExclusaoComDesfazer = (id) => {
        if (exclusaoTimeout) {
            clearTimeout(exclusaoTimeout);
            if (itemParaExcluir) excluirLancamento(itemParaExcluir.lancamento._id, false);
        }

        const itemIndex = todosLancamentos.findIndex(l => l._id === id);
        if (itemIndex === -1) return;

        itemParaExcluir = { lancamento: todosLancamentos[itemIndex], index: itemIndex };
        todosLancamentos.splice(itemIndex, 1);
        aplicarFiltros();

        document.getElementById('toast-mensagem').textContent = 'Lançamento excluído.';
        toast.classList.add('show');

        exclusaoTimeout = setTimeout(() => {
            excluirLancamento(itemParaExcluir.lancamento._id, false);
            itemParaExcluir = null;
            toast.classList.remove('show');
        }, 5000);
    };

    btnDesfazer.addEventListener('click', () => {
        if (!itemParaExcluir) return;

        clearTimeout(exclusaoTimeout);
        toast.classList.remove('show');

        todosLancamentos.splice(itemParaExcluir.index, 0, itemParaExcluir.lancamento);
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
            if (recarregar) await carregarDados();
        }
    };

    // --- Carregamento Inicial ---
    const carregarDados = async () => {
        try {
            const [resLancamentos, resMembros, resConfig] = await Promise.all([
                window.api.get('/api/financeiro/lancamentos'),
                window.api.get('/api/membros'),
                window.api.get('/api/configs')
            ]);

            todosLancamentos = resLancamentos;
            todosMembros = resMembros;
            categoriasConfig = resConfig.financeiro_categorias;

            popularFiltros();
            aplicarFiltros();

        } catch (error) {
            console.error("Erro no carregamento inicial:", error);
            tabelaCorpo.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 20px; color: red;">Falha ao carregar dados do servidor.</td></tr>';
        }
    };

    // --- Lógica da Aba de Dízimos ---
    const buscaMembroInput = document.getElementById('busca-membro-input');
    const buscaResultados = document.getElementById('busca-membro-resultados');
    const historicoContainer = document.getElementById('historico-membro-container');
    const avisoInicial = document.getElementById('aviso-inicial-dizimos');

    if(buscaMembroInput) {
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
    }

    if(buscaResultados) {
        buscaResultados.addEventListener('click', (e) => {
            if (e.target.classList.contains('resultado-item')) {
                const membroId = e.target.dataset.id;
                const membro = todosMembros.find(m => m._id === membroId);
                exibirHistoricoMembro(membro);
                buscaMembroInput.value = '';
                buscaResultados.classList.remove('active');
            }
        });
    }

    const imprimirRelatorioAnualMembro = (membro, contribuicoes) => {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const anoCorrente = new Date().getFullYear();

        const contribuicoesAno = contribuicoes.filter(c => new Date(c.data).getUTCFullYear() === anoCorrente);
        const totalContribuido = contribuicoesAno.reduce((acc, c) => acc + c.valor, 0);

        doc.setFontSize(18);
        doc.text('Declaração Anual de Contribuições', 105, 22, { align: 'center' });
        doc.setFontSize(12);
        doc.text(`Ano de Referência: ${anoCorrente}`, 105, 30, { align: 'center' });

        doc.setFontSize(11);
        doc.text(`Declaramos para os devidos fins que o(a) irmão(ã) ${membro.nome},
`, 14, 50);
        doc.text(`membro desta igreja, contribuiu durante o ano de ${anoCorrente} com o valor total de:`, 14, 57);
        
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text(formatarMoeda(totalContribuido), 105, 70, { align: 'center' });
        doc.setFont('helvetica', 'normal');

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

        const finalY = doc.lastAutoTable.finalY + 25;
        doc.text('___________________________________', 105, finalY + 10, { align: 'center' });
        doc.text('Tesouraria - ADTC Tabernáculo Celeste', 105, finalY + 17, { align: 'center' });
        doc.save(`Relatorio_Contribuicoes_${membro.nome.split(' ')[0]}_${anoCorrente}.pdf`);
    };

    const exibirHistoricoMembro = (membro) => {
        membroEmVisualizacaoId = membro._id;
        avisoInicial.classList.add('hidden');
        historicoContainer.classList.remove('hidden');
        document.getElementById('historico-membro-nome').textContent = membro.nome;

        const contribuicoes = todosLancamentos.filter(l => l.membroId === membro._id && (l.categoria.includes('Dízimo') || l.categoria.includes('Oferta')));
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
        
        renderizarGraficoContribuicoes(contribuicoes);

        document.getElementById('btn-novo-dizimo-membro').onclick = () => {
            abrirModal();
            setTimeout(() => {
                document.getElementById('tipo').value = 'entrada';
                atualizarCategoriasModal('entrada', 'Dízimo');
                buscaMembroModalInput.value = membro.nome;
                membroIdHiddenInput.value = membro._id;
                buscaMembroModalInput.disabled = true;
                clearMembroBtn.classList.remove('hidden');
            }, 100);
        };

        document.getElementById('btn-imprimir-relatorio-membro').onclick = () => {
            imprimirRelatorioAnualMembro(membro, contribuicoes);
        };
    };

    // --- Lógica de Exportação para PDF ---
    document.getElementById('btn-exportar-pdf').addEventListener('click', () => {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        const lancamentosFiltrados = aplicarFiltros(true);

        const ano = filtroAno.value;
        const mes = filtroMes.options[filtroMes.selectedIndex].text;
        const titulo = `Relatório Financeiro - ${mes} ${ano}`;

        doc.setFontSize(18);
        doc.text(titulo, 14, 22);

        const tableRows = lancamentosFiltrados.map(l => [
            new Date(l.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' }),
            l.descricao,
            l.categoria,
            l.tipo === 'entrada' ? 'Entrada' : 'Saída',
            formatarMoeda(l.valor)
        ]);

        doc.autoTable({
            head: [['Data', 'Descrição', 'Categoria', 'Tipo', 'Valor']],
            body: tableRows,
            startY: 30,
            headStyles: { fillColor: [0, 31, 93] },
            columnStyles: { 4: { halign: 'right' } }
        });

        const receitas = lancamentosFiltrados.filter(l => l.tipo === 'entrada').reduce((acc, l) => acc + l.valor, 0);
        const despesas = lancamentosFiltrados.filter(l => l.tipo === 'saida').reduce((acc, l) => acc + l.valor, 0);
        const balanco = receitas - despesas;
        const finalY = doc.lastAutoTable.finalY + 10;

        doc.setFontSize(12);
        doc.text('Resumo do Período', 14, finalY);
        doc.autoTable({
            startY: finalY + 2,
            theme: 'grid',
            body: [
                ['Total de Receitas', formatarMoeda(receitas)],
                ['Total de Despesas', formatarMoeda(despesas)],
                ['Balanço', formatarMoeda(balanco)]
            ],
            bodyStyles: { fontStyle: 'bold' },
            columnStyles: { 1: { halign: 'right' } }
        });

        doc.save(`Relatorio_Financeiro_${mes}_${ano}.pdf`);
    });

    // --- Lógica das Abas ---
    const abasLink = document.querySelectorAll('.abas-financeiro .aba-link');
    abasLink.forEach(aba => {
        aba.addEventListener('click', () => {
            document.querySelector('.abas-financeiro .aba-link.active').classList.remove('active');
            document.querySelector('.aba-conteudo.active').classList.remove('active');
            aba.classList.add('active');
            document.getElementById(aba.dataset.aba).classList.add('active');
        });
    });

    // Inicializa a página
    carregarDados();
});
