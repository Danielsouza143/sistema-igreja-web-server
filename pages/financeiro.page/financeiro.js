const iniciarFinanceiro = () => {
    let todosLancamentos = [];
    let lancamentosSelecionados = new Set();
    let todosMembros = [];
    let lancamentoEmEdicaoId = null;
    let fundoEmEdicaoId = null;
    let fundoEmVisualizacao = null; 
    let categoriasConfig = { entradas: [], saidas: [] };
    let graficoAnual = null;
    let graficoDespesasPizza = null;
    let exclusaoTimeout = null;
    let itemParaExcluir = null;
    let graficoContribuicoesMembro = null;
    let membroEmVisualizacaoId = null; 

    // --- VARIÁVEIS GLOBAIS DE FUNDOS ---
    let fundosAtivos = [];
    let graficoFundoAtual = null;

    // --- Seletores do DOM ---
    const modalLancamento = document.getElementById('modal-lancamento');
    const formLancamento = document.getElementById('form-lancamento');
    const modalFundo = document.getElementById('modal-fundo');
    const formFundo = document.getElementById('form-fundo');
    const tabelaCorpo = document.getElementById('tabela-lancamentos-corpo');
    const filtroAno = document.getElementById('filtro-ano');
    const filtroMes = document.getElementById('filtro-mes');
    const filtroTipo = document.getElementById('filtro-tipo');
    const contextMenu = document.getElementById('context-menu');
    let rightClickedRowId = null;

    // --- Funções de Máscara de Moeda ---
    const formatarMoeda = (valor) => `R$ ${(valor || 0).toFixed(2).replace('.', ',')}`;

    const aplicarMascaraMoeda = (e) => {
        let valor = e.target.value.replace(/\D/g, "");
        if (valor === "") {
            e.target.value = "";
            return;
        }
        valor = (parseInt(valor) / 100).toFixed(2) + "";
        valor = valor.replace(".", ",");
        valor = valor.replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1.");
        e.target.value = "R$ " + valor;
    };

    const parseMoedaToFloat = (str) => {
        if (!str) return 0;
        if (typeof str === 'number') return str;
        return parseFloat(str.replace(/\D/g, '')) / 100;
    };

    const inputValorLancamento = document.getElementById('valor');
    const inputMetaFundo = document.getElementById('fundo-meta');
    if(inputValorLancamento) inputValorLancamento.addEventListener('input', aplicarMascaraMoeda);
    if(inputMetaFundo) inputMetaFundo.addEventListener('input', aplicarMascaraMoeda);

    // --- Funções de Multi-select ---
    window.toggleMultiSelect = () => {
        const checkboxes = document.getElementById('categorias-checkboxes');
        if(checkboxes) checkboxes.classList.toggle('active');
    };

    window.addEventListener('click', (e) => {
        const cbContainer = document.getElementById('categorias-checkboxes');
        if (cbContainer && !e.target.closest('#multi-select-categoria')) {
            cbContainer.classList.remove('active');
        }
    });

    const atualizarTextoCategorias = () => {
        const checkboxes = document.querySelectorAll('.categoria-checkbox:checked');
        const textSpan = document.getElementById('selected-categories-text');
        if (!textSpan) return;
        
        if (checkboxes.length === 0) {
            textSpan.textContent = 'Todas as Categorias';
        } else if (checkboxes.length === 1) {
            textSpan.textContent = checkboxes[0].value;
        } else {
            textSpan.textContent = `${checkboxes.length} selecionadas`;
        }
    };

    const buscaMembroModalInput = document.getElementById('busca-membro-modal');
    const buscaMembroResultadosModal = document.getElementById('busca-membro-resultados-modal');
    const membroIdHiddenInput = document.getElementById('membroId-hidden');
    const clearMembroBtn = document.getElementById('clear-membro-btn');

    // --- Funções de Renderização Básicas ---
    const renderizarTabela = (lancamentos) => {
        if(!tabelaCorpo) return;
        tabelaCorpo.innerHTML = '';
        
        if (!Array.isArray(lancamentos) || lancamentos.length === 0) {
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
                    ${l.fundoId ? '<i class="bx bx-target-lock" title="Vinculado a um Fundo" style="color:#007bff; margin-left: 5px;"></i>' : ''}
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
        if(!Array.isArray(lancamentos)) return;
        const receitas = lancamentos.filter(l => l.tipo === 'entrada').reduce((acc, l) => acc + l.valor, 0);
        const despesas = lancamentos.filter(l => l.tipo === 'saida').reduce((acc, l) => acc + l.valor, 0);
        const balanco = receitas - despesas;

        const elReceitas = document.getElementById('total-receitas');
        const elDespesas = document.getElementById('total-despesas');
        const balancoEl = document.getElementById('balanco-mensal');

        if(elReceitas) elReceitas.textContent = formatarMoeda(receitas);
        if(elDespesas) elDespesas.textContent = formatarMoeda(despesas);
        if (balancoEl) {
            balancoEl.textContent = formatarMoeda(balanco);
            balancoEl.style.color = balanco >= 0 ? '#28a745' : '#dc3545';
        }
    };

    const calcularBalancoGeral = (todosOsLancamentosNoBanco) => {
        if(!Array.isArray(todosOsLancamentosNoBanco)) return;
        const receitas = todosOsLancamentosNoBanco.filter(l => l.tipo === 'entrada').reduce((acc, l) => acc + l.valor, 0);
        const despesas = todosOsLancamentosNoBanco.filter(l => l.tipo === 'saida').reduce((acc, l) => acc + l.valor, 0);
        const balanco = receitas - despesas;
        
        const geralEl = document.getElementById('balanco-geral');
        if (geralEl) {
            geralEl.textContent = formatarMoeda(balanco);
            geralEl.style.color = balanco >= 0 ? '#28a745' : '#dc3545';
        }
    };

    const renderizarGraficoAnual = (lancamentos, anoReferencia) => {
        const tituloEl = document.getElementById('grafico-ano-titulo');
        if (tituloEl) tituloEl.textContent = (anoReferencia === 'todos' || !anoReferencia) ? 'Geral' : anoReferencia;

        const dadosPorMes = Array(12).fill(null).map(() => ({ entradas: 0, saidas: 0 }));

        (lancamentos || []).forEach(l => {
            const data = new Date(l.data);
            const mesIdx = data.getUTCMonth();
            if (l.tipo === 'entrada') {
                dadosPorMes[mesIdx].entradas += l.valor;
            } else {
                dadosPorMes[mesIdx].saidas += l.valor;
            }
        });

        const labels = (['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']);
        const dadosEntradas = dadosPorMes.map(d => d.entradas);
        const dadosSaidas = dadosPorMes.map(d => d.saidas);

        const canvas = document.getElementById('grafico-mensal');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (graficoAnual) graficoAnual.destroy();
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
        const despesas = (lancamentos || []).filter(l => l.tipo === 'saida');
        const pizzaContainer = document.getElementById('grafico-pizza-container');
        if(!pizzaContainer) return;

        if (despesas.length === 0) {
            pizzaContainer.innerHTML = '<p style="text-align:center; padding: 40px 20px; color: #888;">Nenhuma despesa nos filtros selecionados.</p>';
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
        if (graficoDespesasPizza) graficoDespesasPizza.destroy();
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
        if(!container) return;
        
        const anoCorrente = new Date().getFullYear();
        const elGraficoAno = document.getElementById('grafico-ano-membro');
        if(elGraficoAno) elGraficoAno.textContent = anoCorrente;

        const contribuicoesAno = contribuicoes.filter(c => new Date(c.data).getUTCFullYear() === anoCorrente);

        if (graficoContribuicoesMembro) {
            graficoContribuicoesMembro.destroy();
        }

        if (contribuicoesAno.length === 0) {
            container.innerHTML = '<p class="aviso-grafico-vazio">Nenhuma contribuição registrada neste ano.</p>';
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

    // --- LÓGICA DO MÓDULO DE FUNDOS E METAS ---
    const carregarFundos = async () => {
        try {
            const response = await window.api.get('/api/financeiro/fundos');
            fundosAtivos = Array.isArray(response) ? response : [];
            renderizarFundos(fundosAtivos);
        } catch (error) {
            console.error('Erro ao carregar fundos:', error);
            fundosAtivos = [];
            renderizarFundos(fundosAtivos);
        }
    }

    const popularSelectFundos = () => {
        const selectFundo = document.getElementById('fundoId');
        if (!selectFundo) return;
        selectFundo.innerHTML = '<option value="">Não vincular a nenhum fundo</option>';
        fundosAtivos.forEach(fundo => {
            const option = document.createElement('option');
            option.value = fundo._id;
            option.textContent = fundo.nome;
            selectFundo.appendChild(option);
        });
    };

    const calcularRitmoFundo = (fundo) => {
        if (!fundo.prazo) return 'Prazo não definido';
        
        // Isola apenas o YYYY-MM-DD para evitar conflito de fuso horário resultando em NaN
        const prazoStr = typeof fundo.prazo === 'string' ? fundo.prazo.split('T')[0] : fundo.prazo;
        const prazo = new Date(prazoStr + 'T23:59:59'); 
        const hoje = new Date();
        
        const diasRestantes = Math.ceil((prazo - hoje) / (1000 * 60 * 60 * 24));
        const faltante = (fundo.meta || 0) - (fundo.arrecadado || 0);
        
        if (faltante <= 0) return 'Meta atingida! Parabéns!';
        if (diasRestantes <= 0) return `Prazo encerrado. Faltou ${formatarMoeda(faltante)}.`;
        
        const mesesRestantes = diasRestantes / 30;
        if (mesesRestantes <= 1) {
            return `Faltam ${diasRestantes} dias. Necessário ${formatarMoeda(faltante)} na reta final.`;
        }
        
        const porMes = faltante / mesesRestantes;
        return `Faltam ${diasRestantes} dias. Aprox. ${formatarMoeda(porMes)}/mês.`;
    };

    const renderizarFundos = (fundos) => {
        const grid = document.getElementById('grid-fundos');
        if(!grid) return;
        grid.innerHTML = '';

        if(fundos.length === 0) {
            grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #666; padding: 40px;">Nenhuma meta ou fundo cadastrado no momento.</p>';
            return;
        }

        fundos.forEach(fundo => {
            const meta = fundo.meta || 1;
            const arrecadado = fundo.arrecadado || 0;
            const porcentagemNum = Math.min((arrecadado / meta) * 100, 100);
            const porcentagem = porcentagemNum.toFixed(1);
            
            const statusClass = porcentagemNum >= 100 ? 'status-concluido' : 'status-ativo';
            const badgeClass = porcentagemNum >= 100 ? 'badge-concluido' : 'badge-andamento';
            const statusText = porcentagemNum >= 100 ? 'Concluído' : 'Em Andamento';
            const ritmoTexto = calcularRitmoFundo(fundo);

            const card = document.createElement('div');
            card.className = `card-fundo ${statusClass}`;
            card.innerHTML = `
                <div class="card-fundo-header">
                    <h3>${fundo.nome}</h3>
                    <div class="badge-status">
                        <span class="badge-status ${badgeClass}">${statusText}</span>
                    </div>
                </div>
                <p class="fundo-desc">${fundo.descricao}</p>
                <p class="fundo-ritmo"><i class='bx bx-time-five'></i> ${ritmoTexto}</p>
                
                <div class="progresso-container">
                    <div class="progresso-barra" style="width: ${porcentagem}%"></div>
                </div>
                <div class="progresso-texto">
                    <span><strong>Arrecadado:</strong> ${formatarMoeda(fundo.arrecadado)}</span>
                    <span><strong>Meta:</strong> ${formatarMoeda(fundo.meta)}</span>
                </div>
                <div class="progresso-porcentagem">
                    ${porcentagem}%
                </div>
                <div style="text-align: right; margin-top: 10px;">
                    <i class='bx bxs-edit btn-editar-fundo' style="font-size: 1.2rem; color: #007bff; cursor: pointer; margin-right: 10px;" title="Editar"></i>
                    <i class='bx bxs-trash btn-excluir-fundo' style="font-size: 1.2rem; color: #dc3545; cursor: pointer;" title="Excluir"></i>
                </div>
            `;

            card.addEventListener('click', (e) => {
                if(!e.target.classList.contains('btn-editar-fundo') && !e.target.classList.contains('btn-excluir-fundo')) {
                    abrirDetalhesFundo(fundo);
                }
            });

            card.querySelector('.btn-editar-fundo').addEventListener('click', (e) => {
                e.stopPropagation();
                abrirModalFundo(fundo);
            });

            card.querySelector('.btn-excluir-fundo').addEventListener('click', async (e) => {
                e.stopPropagation();
                if(confirm('Deseja realmente excluir este fundo? Os lançamentos vinculados a ele continuarão existindo no caixa geral.')) {
                    try {
                        await window.api.delete(`/api/financeiro/fundos/${fundo._id}`);
                        carregarFundos();
                    } catch(err) {
                        console.error('Erro ao excluir', err);
                        alert('Erro ao excluir fundo.');
                    }
                }
            });

            grid.appendChild(card);
        });
    };

    const abrirModalFundo = (fundo = null) => {
        formFundo.reset();
        fundoEmEdicaoId = null;
        if(fundo) {
            document.getElementById('modal-fundo-titulo').textContent = 'Editar Fundo / Meta';
            fundoEmEdicaoId = fundo._id;
            document.getElementById('fundo-nome').value = fundo.nome;
            document.getElementById('fundo-descricao').value = fundo.descricao;
            document.getElementById('fundo-meta').value = "R$ " + fundo.meta.toFixed(2).replace('.', ',');
            document.getElementById('fundo-prazo').value = fundo.prazo ? fundo.prazo.split('T')[0] : '';
        } else {
            document.getElementById('modal-fundo-titulo').textContent = 'Novo Fundo / Meta';
        }
        modalFundo.style.display = 'flex';
    };

    formFundo.addEventListener('submit', async (e) => {
        e.preventDefault();
        const dados = {
            nome: document.getElementById('fundo-nome').value,
            descricao: document.getElementById('fundo-descricao').value,
            meta: parseMoedaToFloat(document.getElementById('fundo-meta').value),
            prazo: document.getElementById('fundo-prazo').value
        };

        try {
            if(fundoEmEdicaoId) {
                await window.api.put(`/api/financeiro/fundos/${fundoEmEdicaoId}`, dados);
            } else {
                await window.api.post('/api/financeiro/fundos', dados);
            }
            modalFundo.style.display = 'none';
            carregarFundos();
            alert('Fundo salvo com sucesso!');
        } catch(error) {
            alert('Erro ao salvar fundo.');
            console.error(error);
        }
    });

    const abrirDetalhesFundo = (fundo) => {
        const modal = document.getElementById('modal-detalhes-fundo');
        if(!modal) return;
        
        fundoEmVisualizacao = fundo; 

        document.getElementById('fundo-titulo-detalhe').textContent = fundo.nome;
        document.getElementById('fundo-valor-arrecadado').textContent = formatarMoeda(fundo.arrecadado);
        document.getElementById('fundo-valor-meta').textContent = formatarMoeda(fundo.meta);
        
        const porcentagem = ((fundo.arrecadado / (fundo.meta || 1)) * 100).toFixed(1);
        document.getElementById('fundo-porcentagem').textContent = `${porcentagem}%`;

        const lancamentosDoFundo = todosLancamentos.filter(l => l.fundoId === fundo._id);

        const tabela = document.getElementById('tabela-fundo-lancamentos');
        if(tabela) {
            if(lancamentosDoFundo.length > 0) {
                tabela.innerHTML = lancamentosDoFundo.map(l => {
                    const membroNome = l.membroId ? (todosMembros.find(m => m._id === l.membroId)?.nome || 'Anônimo') : 'Caixa Geral (ou Outros)';
                    return `
                        <tr>
                            <td>${new Date(l.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</td>
                            <td>${membroNome}</td>
                            <td style="color: ${l.tipo === 'entrada' ? '#28a745' : '#dc3545'}; font-weight: bold;">
                                ${l.tipo === 'entrada' ? '+' : '-'} ${formatarMoeda(l.valor)}
                            </td>
                        </tr>
                    `;
                }).join('');
            } else {
                tabela.innerHTML = '<tr><td colspan="3" style="text-align: center; color: #666; padding: 15px;">Nenhum lançamento vinculado ainda.</td></tr>';
            }
        }

        renderizarGraficoFundoEspecifico(lancamentosDoFundo);
        modal.style.display = 'flex';
    };

    const btnNovaArrec = document.getElementById('btn-nova-arrecadacao-fundo');
    if(btnNovaArrec) {
        btnNovaArrec.addEventListener('click', () => {
            document.getElementById('modal-detalhes-fundo').style.display = 'none'; 
            abrirModal(); 
            setTimeout(() => {
                document.getElementById('tipo').value = 'entrada';
                atualizarCategoriasModal('entrada');
                const fundoSelect = document.getElementById('fundoId');
                if(fundoSelect && fundoEmVisualizacao) {
                    fundoSelect.value = fundoEmVisualizacao._id;
                    fundoSelect.dispatchEvent(new Event('change')); 
                }
            }, 100);
        });
    }

    const btnTransferirCaixa = document.getElementById('btn-transferir-caixa');
    if(btnTransferirCaixa) {
        btnTransferirCaixa.addEventListener('click', async () => {
            if(!fundoEmVisualizacao) return;
            const valorStr = prompt(`Quanto do saldo em caixa deseja transferir para "${fundoEmVisualizacao.nome}"?\n\nDigite apenas números (Ex: 150,50):`);
            if(!valorStr) return;
            
            const valorTransferencia = parseFloat(valorStr.replace(',', '.'));
            if(isNaN(valorTransferencia) || valorTransferencia <= 0) {
                return alert("Valor inválido.");
            }

            if(confirm(`Confirmar transferência de ${formatarMoeda(valorTransferencia)} para o fundo?`)) {
                try {
                    await window.api.post('/api/financeiro/lancamentos', {
                        tipo: 'saida',
                        data: new Date().toISOString().split('T')[0],
                        valor: valorTransferencia,
                        categoria: 'Transferência de Fundo',
                        descricao: `Transferência para o projeto: ${fundoEmVisualizacao.nome}`,
                        fundoId: null
                    });

                    await window.api.post('/api/financeiro/lancamentos', {
                        tipo: 'entrada',
                        data: new Date().toISOString().split('T')[0],
                        valor: valorTransferencia,
                        categoria: 'Aporte de Caixa',
                        descricao: 'Aporte recebido do caixa geral da igreja',
                        fundoId: fundoEmVisualizacao._id
                    });

                    alert('Transferência realizada com sucesso!');
                    document.getElementById('modal-detalhes-fundo').style.display = 'none';
                    carregarDados(); 
                } catch (err) {
                    console.error(err);
                    alert('Erro ao transferir saldo.');
                }
            }
        });
    }

    const renderizarGraficoFundoEspecifico = (lancamentos) => {
        const canvas = document.getElementById('grafico-fundo-historico');
        if(!canvas) return;
        const ctx = canvas.getContext('2d');
        
        const dadosPorMes = Array(12).fill(0);
        lancamentos.forEach(l => {
            const mes = new Date(l.data).getUTCMonth();
            if(l.tipo === 'entrada') {
                dadosPorMes[mes] += l.valor;
            } else {
                dadosPorMes[mes] -= l.valor; 
            }
        });

        if(graficoFundoAtual) graficoFundoAtual.destroy();

        graficoFundoAtual = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
                datasets: [{
                    label: 'Arrecadação Mensal Líquida',
                    data: dadosPorMes,
                    borderColor: '#28a745',
                    backgroundColor: 'rgba(40, 167, 69, 0.2)',
                    fill: true,
                    tension: 0.3
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    };

    const modalDetalhesFundo = document.getElementById('modal-detalhes-fundo');
    if (modalDetalhesFundo) {
        modalDetalhesFundo.querySelectorAll('[data-close]').forEach(el => {
            el.addEventListener('click', () => modalDetalhesFundo.style.display = 'none');
        });
    }
    
    document.getElementById('btn-nova-meta')?.addEventListener('click', () => abrirModalFundo());
    modalFundo?.querySelector('[data-close]').addEventListener('click', () => modalFundo.style.display = 'none');

    // --- Lógica de Filtros ---
    const aplicarFiltros = async (retornarArray = false) => {
        const ano = filtroAno ? filtroAno.value : 'todos';
        const mes = filtroMes ? filtroMes.value : 'todos';
        const tipo = filtroTipo ? filtroTipo.value : 'todos';
        const categoriasSelecionadas = Array.from(document.querySelectorAll('.categoria-checkbox:checked')).map(cb => cb.value);

        const queryParams = new URLSearchParams();
        if (ano && ano !== 'todos') queryParams.append('ano', ano);
        if (mes && mes !== 'todos') queryParams.append('mes', mes);
        if (categoriasSelecionadas.length > 0) queryParams.append('categorias', categoriasSelecionadas.join(','));

        try {
            const lancamentos = await window.api.get(`/api/financeiro/lancamentos?${queryParams.toString()}`);
            if (!lancamentos) return [];

            let lancamentosFiltrados = tipo === 'todos' ? lancamentos : lancamentos.filter(l => l.tipo === tipo);

            if (itemParaExcluir) {
                lancamentosFiltrados = lancamentosFiltrados.filter(l => l._id !== itemParaExcluir.lancamento._id);
            }

            if (retornarArray) return lancamentosFiltrados;

            renderizarTabela(lancamentosFiltrados);
            atualizarDashboard(lancamentosFiltrados);
            renderizarGraficoDespesasPizza(lancamentosFiltrados);
            
            if (ano !== 'todos') {
                const resAno = await window.api.get(`/api/financeiro/lancamentos?ano=${ano}`);
                renderizarGraficoAnual(resAno || [], ano);
            } else {
                renderizarGraficoAnual(lancamentos, 'Geral');
            }

            return lancamentosFiltrados;
        } catch (error) {
            console.error("Erro ao filtrar:", error);
            return [];
        }
    };

    const popularFiltros = (lancamentosIniciais) => {
        if (!filtroAno || !filtroMes) return;

        const anosNoBanco = [...new Set((lancamentosIniciais || []).map(l => new Date(l.data).getUTCFullYear()))];
        const hoje = new Date();
        const anoAtual = hoje.getFullYear();
        const mesAtual = hoje.getMonth() + 1;

        if (!anosNoBanco.includes(anoAtual)) anosNoBanco.push(anoAtual);
        
        filtroAno.innerHTML = '<option value="todos">Todos os Anos</option>' + 
                             anosNoBanco.sort((a, b) => b - a).map(ano => `<option value="${ano}">${ano}</option>`).join('');
        
        filtroAno.value = anoAtual;
        filtroMes.value = mesAtual;

        const categoriasConfigSet = new Set([...(categoriasConfig?.entradas || []), ...(categoriasConfig?.saidas || [])]);
        const categoriasLancamentosSet = new Set((lancamentosIniciais || []).map(l => l.categoria));
        const todasCategorias = [...new Set([...categoriasConfigSet, ...categoriasLancamentosSet])].sort();

        const containerCheckbox = document.getElementById('categorias-checkboxes');
        if (containerCheckbox) {
            containerCheckbox.innerHTML = todasCategorias.map(cat => `
                <label><input type="checkbox" class="categoria-checkbox" value="${cat}"> ${cat}</label>
            `).join('');
            containerCheckbox.querySelectorAll('.categoria-checkbox').forEach(cb => {
                cb.addEventListener('change', atualizarTextoCategorias);
            });
        }

        const btnAplicar = document.getElementById('btn-aplicar-filtros');
        if (btnAplicar) {
            const novoBtn = btnAplicar.cloneNode(true);
            btnAplicar.parentNode.replaceChild(novoBtn, btnAplicar);
            novoBtn.addEventListener('click', () => aplicarFiltros());
        }
    };

    // Função Exclusiva para liberar busca de membros em Fundos e Dízimos
    const toggleMembroSearch = () => {
        const categoria = document.getElementById('categoria') ? document.getElementById('categoria').value : '';
        const fundoVinculado = document.getElementById('fundoId') ? document.getElementById('fundoId').value : '';
        const isContribuicao = categoria.includes('Dízimo') || categoria.includes('Oferta') || fundoVinculado !== '';
        
        const grupoMembro = document.getElementById('grupo-membro');
        if(grupoMembro) grupoMembro.classList.toggle('hidden', !isContribuicao);
    };

    // --- Lógica do Modal de Lançamentos ---
    const abrirModal = (lancamento = null, duplicar = false) => {
        if(formLancamento) formLancamento.reset();
        popularSelectFundos(); 
        
        lancamentoEmEdicaoId = null;
        if(membroIdHiddenInput) membroIdHiddenInput.value = '';
        if(buscaMembroModalInput) {
            buscaMembroModalInput.value = '';
            buscaMembroModalInput.disabled = false;
        }
        if(clearMembroBtn) clearMembroBtn.classList.add('hidden');
        if(document.getElementById('grupo-membro')) document.getElementById('grupo-membro').classList.add('hidden');
        if(document.getElementById('comprovante-atual-container')) document.getElementById('comprovante-atual-container').classList.add('hidden');

        if (lancamento && !duplicar) { // Modo Edição
            document.getElementById('modal-titulo').textContent = 'Editar Lançamento';
            lancamentoEmEdicaoId = lancamento._id;
            document.getElementById('tipo').value = lancamento.tipo;
            document.getElementById('data').value = lancamento.data.split('T')[0];
            document.getElementById('valor').value = "R$ " + (lancamento.valor || 0).toFixed(2).replace('.', ',');
            document.getElementById('descricao').value = lancamento.descricao;
            
            if(lancamento.fundoId && document.getElementById('fundoId')) {
                document.getElementById('fundoId').value = lancamento.fundoId;
            }
            
            atualizarCategoriasModal(lancamento.tipo, lancamento.categoria);

            if (lancamento.membroId) {
                const membro = todosMembros.find(m => m._id === lancamento.membroId);
                if (membro && buscaMembroModalInput) {
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
            document.getElementById('valor').value = "R$ " + (lancamento.valor || 0).toFixed(2).replace('.', ',');
            document.getElementById('descricao').value = lancamento.descricao;
            
            if(lancamento.fundoId && document.getElementById('fundoId')) {
                document.getElementById('fundoId').value = lancamento.fundoId;
            }

            atualizarCategoriasModal(lancamento.tipo, lancamento.categoria);

            if (lancamento.membroId) {
                 const membro = todosMembros.find(m => m._id === lancamento.membroId);
                if (membro && buscaMembroModalInput) {
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
        toggleMembroSearch();
        if(modalLancamento) modalLancamento.style.display = 'flex';
    };

    const fecharModal = () => {
        if(modalLancamento) modalLancamento.style.display = 'none';
    };

    const atualizarCategoriasModal = (tipo, categoriaSelecionada = null) => {
        const selectCategoria = document.getElementById('categoria');
        if(!selectCategoria) return;
        const categorias = (tipo === 'entrada' ? categoriasConfig?.entradas : categoriasConfig?.saidas) || [];
        selectCategoria.innerHTML = categorias.map(c => `<option value="${c}">${c}</option>`).join('');
        if (categoriaSelecionada) {
            selectCategoria.value = categoriaSelecionada;
        }
    };

    document.getElementById('btn-novo-lancamento')?.addEventListener('click', () => abrirModal());
    modalLancamento?.querySelector('[data-close]')?.addEventListener('click', fecharModal);
    
    document.getElementById('tipo')?.addEventListener('change', (e) => {
        atualizarCategoriasModal(e.target.value);
        toggleMembroSearch();
    });
    document.getElementById('categoria')?.addEventListener('change', toggleMembroSearch);
    const selFundo = document.getElementById('fundoId');
    if(selFundo) selFundo.addEventListener('change', toggleMembroSearch);

    if(buscaMembroModalInput) {
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
    }

    if(buscaMembroResultadosModal) {
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
    }

    if(clearMembroBtn) {
        clearMembroBtn.addEventListener('click', () => {
            buscaMembroModalInput.value = '';
            membroIdHiddenInput.value = '';
            buscaMembroModalInput.disabled = false;
            clearMembroBtn.classList.add('hidden');
            buscaMembroModalInput.focus();
        });
    }


    const modalDetalhes = document.getElementById('modal-detalhes-lancamento');

    const abrirModalDetalhes = (lancamento) => {
        if(!modalDetalhes) return;
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

    if(modalDetalhes) {
        modalDetalhes.querySelectorAll('[data-close]').forEach(el => el.addEventListener('click', () => modalDetalhes.style.display = 'none'));
    }

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

    if(formLancamento) {
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

            const fundoElement = document.getElementById('fundoId');

            const dados = {
                tipo: document.getElementById('tipo').value,
                data: document.getElementById('data').value,
                valor: parseMoedaToFloat(document.getElementById('valor').value),
                categoria: document.getElementById('categoria').value,
                descricao: document.getElementById('descricao').value,
                membroId: membroIdHiddenInput.value || null,
                fundoId: fundoElement && fundoElement.value ? fundoElement.value : null,
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
    }

    const salvarEdicaoEmLinha = async (evento) => {
        const celula = evento.target;
        const id = celula.dataset.id;
        const campo = celula.dataset.field;
        const lancamentoOriginal = todosLancamentos.find(l => l._id === id);

        if (!lancamentoOriginal) return;

        let novoValor = celula.textContent.trim();
        let valorOriginal = lancamentoOriginal[campo];

        if (campo === 'valor') {
            novoValor = parseMoedaToFloat(novoValor);
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
            carregarFundos();

        } catch (error) {
            console.error('Erro na edição em linha:', error);
            alert('Falha ao salvar a alteração.');
            celula.textContent = campo === 'valor' ? formatarMoeda(valorOriginal) : valorOriginal;
        }
    };

    if(tabelaCorpo) {
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

        tabelaCorpo.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            const tr = e.target.closest('tr');
            if (!tr || !tr.dataset.id) return;

            rightClickedRowId = tr.dataset.id;
            contextMenu.style.display = 'block';
            contextMenu.style.left = `${e.pageX}px`;
            contextMenu.style.top = `${e.pageY}px`;
        });
    }

    window.addEventListener('click', (e) => {
        if (contextMenu && contextMenu.style.display === 'block') {
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
            if(tabelaCorpo) {
                tabelaCorpo.querySelectorAll('.checkbox-lancamento').forEach(cb => cb.checked = false);
                tabelaCorpo.querySelectorAll('.selecionada').forEach(row => row.classList.remove('selecionada'));
            }
            atualizarEstadoExclusaoLote();
        }
    });

    const btnSelecionar = document.getElementById('context-selecionar');
    if(btnSelecionar) {
        btnSelecionar.addEventListener('click', () => {
            if (!rightClickedRowId) return;
            document.querySelector('.tabela-lancamentos').classList.add('modo-selecao');
            const checkbox = tabelaCorpo.querySelector(`.checkbox-lancamento[data-id="${rightClickedRowId}"]`);
            if (checkbox && !checkbox.checked) {
                checkbox.checked = true;
                checkbox.dispatchEvent(new Event('change', { bubbles: true }));
            }
        });
    }

    const btnEditarCtx = document.getElementById('context-editar');
    if(btnEditarCtx) {
        btnEditarCtx.addEventListener('click', () => {
            if (!rightClickedRowId) return;
            const lancamento = todosLancamentos.find(l => l._id === rightClickedRowId);
            if(lancamento) abrirModal(lancamento);
        });
    }

    const btnExcluirCtx = document.getElementById('context-excluir');
    if(btnExcluirCtx) {
        btnExcluirCtx.addEventListener('click', () => {
            if (!rightClickedRowId) return;
            iniciarExclusaoComDesfazer(rightClickedRowId);
        });
    }

    const btnCopiarCtx = document.getElementById('context-copiar');
    if(btnCopiarCtx) {
        btnCopiarCtx.addEventListener('click', () => {
            if (!rightClickedRowId) return;
            const lancamento = todosLancamentos.find(l => l._id === rightClickedRowId);
            if (lancamento) {
                const texto = `Data: ${new Date(lancamento.data).toLocaleDateString('pt-BR')}\tValor: ${formatarMoeda(lancamento.valor)}\tCategoria: ${lancamento.categoria}\tDescrição: ${lancamento.descricao}`;
                navigator.clipboard.writeText(texto).then(() => {
                    alert('Dados do lançamento copiados para a área de transferência!');
                });
            }
        });
    }

    const btnImprimirCtx = document.getElementById('context-imprimir');
    if(btnImprimirCtx) {
        btnImprimirCtx.addEventListener('click', () => {
            if (!rightClickedRowId) return;
            const lancamento = todosLancamentos.find(l => l._id === rightClickedRowId);
            if (lancamento) {
                gerarReciboPDF(lancamento);
            }
        });
    }

    const btnExcluirSelecionados = document.getElementById('btn-excluir-selecionados');
    const checkboxSelecionarTodos = document.getElementById('selecionar-todos-lancamentos');
    const tabelaLancamentos = document.querySelector('.tabela-lancamentos');

    const atualizarEstadoExclusaoLote = () => {
        if (lancamentosSelecionados.size > 0) {
            btnExcluirSelecionados.classList.remove('hidden');
            btnExcluirSelecionados.textContent = `Excluir ${lancamentosSelecionados.size} Iten(s)`;
        } else {
            if(btnExcluirSelecionados) btnExcluirSelecionados.classList.add('hidden');
            if(tabelaLancamentos) tabelaLancamentos.classList.remove('modo-selecao');
        }
    };

    if(tabelaCorpo) {
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
                if (checkbox && target.type !== 'checkbox') {
                    checkbox.checked = !checkbox.checked;
                    checkbox.dispatchEvent(new Event('change', { bubbles: true }));
                }
            } else if (!target.closest('a, i, [contenteditable], input')) {
                const id = tr.dataset.id;
                const lancamento = todosLancamentos.find(l => l._id === id);
                if(lancamento) abrirModalDetalhes(lancamento);
            }
        });
    }

    if(checkboxSelecionarTodos) {
        checkboxSelecionarTodos.addEventListener('change', (e) => {
            const isChecked = e.target.checked;
            tabelaCorpo.querySelectorAll('.checkbox-lancamento').forEach(checkbox => {
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

    if(btnDesfazer) {
        btnDesfazer.addEventListener('click', () => {
            if (!itemParaExcluir) return;
            clearTimeout(exclusaoTimeout);
            toast.classList.remove('show');
            todosLancamentos.splice(itemParaExcluir.index, 0, itemParaExcluir.lancamento);
            aplicarFiltros();
            itemParaExcluir = null;
            exclusaoTimeout = null;
        });
    }

    const excluirLancamento = async (id, recarregar = true) => {
        try {
            await window.api.delete(`/api/financeiro/lancamentos/${id}`);
            if (recarregar) {
                await carregarDados();
                alert('Lançamento excluído com sucesso.');
            }
        } catch (error) {
            console.error('Erro ao excluir:', error);
            if (recarregar) await carregarDados();
        }
    };

    // --- Carregamento Inicial BLINDADO contra falhas de API ---
    const carregarDados = async () => {
        try {
            // Promise.all com catch para evitar que um erro derrube os outros
            const [resMembros, resConfig, resLancamentosTodos] = await Promise.all([
                window.api.get('/api/membros').catch(() => []),
                window.api.get('/api/configs').catch(() => ({})),
                window.api.get('/api/financeiro/lancamentos?ano=todos').catch(() => [])
            ]);

            todosMembros = Array.isArray(resMembros) ? resMembros : [];
            categoriasConfig = resConfig?.financeiro_categorias || { entradas: [], saidas: [] };
            todosLancamentos = Array.isArray(resLancamentosTodos) ? resLancamentosTodos : [];

            await carregarFundos();

            calcularBalancoGeral(todosLancamentos);
            popularFiltros(todosLancamentos);
            await aplicarFiltros();

        } catch (error) {
            console.error("Erro no carregamento inicial:", error);
            if (tabelaCorpo) tabelaCorpo.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 20px; color: red;">Falha ao carregar dados do servidor.</td></tr>';
        }
    };

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
        doc.text(`Declaramos para os devidos fins que o(a) irmão(ã) ${membro.nome},\n`, 14, 50);
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
        if(avisoInicial) avisoInicial.classList.add('hidden');
        if(historicoContainer) historicoContainer.classList.remove('hidden');
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

    const btnExportarPdf = document.getElementById('btn-exportar-pdf');
    if(btnExportarPdf) {
        btnExportarPdf.addEventListener('click', async () => {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();

            const lancamentosFiltrados = await aplicarFiltros(true);

            const ano = filtroAno.value;
            const titulo = `Relatório Financeiro - Ano ${ano === 'todos' ? 'Geral' : ano}`;

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

            doc.save(`Relatorio_Financeiro_${ano}.pdf`);
        });
    }

    const abasLink = document.querySelectorAll('.abas-financeiro .aba-link');
    abasLink.forEach(aba => {
        aba.addEventListener('click', () => {
            document.querySelector('.abas-financeiro .aba-link.active').classList.remove('active');
            document.querySelector('.aba-conteudo.active').classList.remove('active');
            aba.classList.add('active');
            document.getElementById(aba.dataset.aba).classList.add('active');
        });
    });

};

document.addEventListener('DOMContentLoaded', iniciarFinanceiro);
document.body.addEventListener('htmx:afterSwap', iniciarFinanceiro);
if (document.readyState !== 'loading') iniciarFinanceiro();
