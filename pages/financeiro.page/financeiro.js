var iniciarFinanceiro = () => {
    // ==========================================
    // 1. VARIÁVEIS GLOBAIS DE ESTADO
    // ==========================================
    let todosLancamentos = [];
    let lancamentosSelecionados = new Set();
    let todosMembros = [];
    let fundosAtivos = [];
    let categoriasConfig = { entradas: [], saidas: [] };
    let tenantInfo = null; // AQUI FICAM OS DADOS DA IGREJA (NOME, LOGO, CNPJ)

    let lancamentoEmEdicaoId = null;
    let fundoEmEdicaoId = null;
    let fundoEmVisualizacao = null; 
    let itemParaExcluir = null;
    let membroEmVisualizacaoId = null; 
    let rightClickedRowId = null;
    let exclusaoTimeout = null;

    let graficoAnual = null;
    let graficoDespesasPizza = null;
    let graficoContribuicoesMembro = null;
    let graficoFundoAtual = null;

    // ==========================================
    // FECHAMENTO DE MENUS GLOBAIS
    // ==========================================
    const fecharMenusGlobais = (e) => {
        const cbContainer = document.getElementById('categorias-checkboxes');
        if (cbContainer && !e.target.closest('#multi-select-categoria')) {
            cbContainer.classList.remove('active');
        }
        const contextMenu = document.getElementById('context-menu');
        if (contextMenu && contextMenu.style.display === 'block') {
            contextMenu.style.display = 'none';
        }
        if (!e.target.closest('.tabela-lancamentos, .context-menu')) {
            const tabelaLancamentos = document.querySelector('.tabela-lancamentos');
            if (tabelaLancamentos) tabelaLancamentos.classList.remove('modo-selecao');
            
            const checkboxSelecionarTodos = document.getElementById('selecionar-todos-lancamentos');
            if(checkboxSelecionarTodos) checkboxSelecionarTodos.checked = false;
            
            const tabelaCorpo = document.getElementById('tabela-lancamentos-corpo');
            if(tabelaCorpo) {
                tabelaCorpo.querySelectorAll('.checkbox-lancamento').forEach(cb => cb.checked = false);
                tabelaCorpo.querySelectorAll('.selecionada').forEach(row => row.classList.remove('selecionada'));
            }
            
            const btnExcluirSelecionados = document.getElementById('btn-excluir-selecionados');
            if(btnExcluirSelecionados) btnExcluirSelecionados.classList.add('hidden');
        }
    };

    window.removeEventListener('click', fecharMenusGlobais);
    window.addEventListener('click', fecharMenusGlobais);

    // ==========================================
    // 2. SELETORES DO DOM E BOTÕES
    // ==========================================
    const tabelaCorpo = document.getElementById('tabela-lancamentos-corpo');
    const tabelaLancamentos = document.querySelector('.tabela-lancamentos');
    const filtroAno = document.getElementById('filtro-ano');
    const filtroMes = document.getElementById('filtro-mes');
    const filtroTipo = document.getElementById('filtro-tipo');
    const btnAplicarFiltros = document.getElementById('btn-aplicar-filtros');
    const categoriasCheckboxes = document.getElementById('categorias-checkboxes');
    
    const modalLancamento = document.getElementById('modal-lancamento');
    const formLancamento = document.getElementById('form-lancamento');
    const modalFundo = document.getElementById('modal-fundo');
    const formFundo = document.getElementById('form-fundo');
    const modalDetalhes = document.getElementById('modal-detalhes-lancamento');
    const modalDetalhesFundo = document.getElementById('modal-detalhes-fundo');
    
    const inputValorLancamento = document.getElementById('valor');
    const selectTipo = document.getElementById('tipo');
    const selectCategoria = document.getElementById('categoria');
    const selectFundo = document.getElementById('fundoId');
    const grupoMembro = document.getElementById('grupo-membro');
    const comprovanteInput = document.getElementById('comprovante');
    const inputMetaFundo = document.getElementById('fundo-meta');
    
    const buscaMembroModalInput = document.getElementById('busca-membro-modal');
    const buscaMembroResultadosModal = document.getElementById('busca-membro-resultados-modal');
    const membroIdHiddenInput = document.getElementById('membroId-hidden');
    const clearMembroBtn = document.getElementById('clear-membro-btn');

    const buscaMembroInput = document.getElementById('busca-membro-input');
    const buscaResultados = document.getElementById('busca-membro-resultados');
    const historicoContainer = document.getElementById('historico-membro-container');
    const avisoInicial = document.getElementById('aviso-inicial-dizimos');
    
    const contextMenu = document.getElementById('context-menu');
    const btnExcluirSelecionados = document.getElementById('btn-excluir-selecionados');
    const checkboxSelecionarTodos = document.getElementById('selecionar-todos-lancamentos');
    const toast = document.getElementById('toast-desfazer');
    const btnDesfazer = document.getElementById('btn-desfazer');

    const btnNovoLancamento = document.getElementById('btn-novo-lancamento');
    const btnNovaMeta = document.getElementById('btn-nova-meta');
    const btnSelecionar = document.getElementById('context-selecionar');
    const btnEditarCtx = document.getElementById('context-editar');
    const btnExcluirCtx = document.getElementById('context-excluir');
    const btnCopiarCtx = document.getElementById('context-copiar');
    const btnImprimirCtx = document.getElementById('context-imprimir');
    const btnExportarPdf = document.getElementById('btn-exportar-pdf');
    const btnNovaArrec = document.getElementById('btn-nova-arrecadacao-fundo');
    const btnTransferirCaixa = document.getElementById('btn-transferir-caixa');
    const btnNovoDizimoMembro = document.getElementById('btn-novo-dizimo-membro');
    const btnImprimirRelatorioMembro = document.getElementById('btn-imprimir-relatorio-membro');

    // ==========================================
    // 3. FUNÇÕES UTILITÁRIAS
    // ==========================================
    const formatarMoeda = (valor) => `R$ ${(valor || 0).toFixed(2).replace('.', ',')}`;

    const aplicarMascaraMoeda = (e) => {
        let valor = e.target.value.replace(/\D/g, "");
        if (valor === "") { e.target.value = ""; return; }
        valor = (parseInt(valor) / 100).toFixed(2) + "";
        valor = valor.replace(".", ",");
        valor = valor.replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1.");
        e.target.value = "R$ " + valor;
    };

    const parseMoedaToFloat = (str) => {
        if (!str) return 0;
        if (typeof str === 'number') return str;
        return parseFloat(str.toString().replace(/\D/g, '')) / 100;
    };

    if(inputValorLancamento) inputValorLancamento.oninput = aplicarMascaraMoeda;
    if(inputMetaFundo) inputMetaFundo.oninput = aplicarMascaraMoeda;

    window.toggleMultiSelect = () => {
        if(categoriasCheckboxes) categoriasCheckboxes.classList.toggle('active');
    };

    const atualizarTextoCategorias = () => {
        const checkboxes = document.querySelectorAll('.categoria-checkbox:checked');
        const textSpan = document.getElementById('selected-categories-text');
        if (!textSpan) return;
        if (checkboxes.length === 0) textSpan.textContent = 'Todas as Categorias';
        else if (checkboxes.length === 1) textSpan.textContent = checkboxes[0].value;
        else textSpan.textContent = `${checkboxes.length} selecionadas`;
    };

    document.onclick = (e) => {
        if (categoriasCheckboxes && !e.target.closest('#multi-select-categoria')) {
            categoriasCheckboxes.classList.remove('active');
        }
        if (contextMenu && contextMenu.style.display === 'block') {
            contextMenu.style.display = 'none';
        }
        if (e.target.matches('[data-close]') || e.target.closest('[data-close]')) {
            const modalOverlay = e.target.closest('.modal-overlay') || e.target.closest('.modal');
            if (modalOverlay) modalOverlay.style.display = 'none';
        }
    };

    const configurarAbas = () => {
        const abasLink = document.querySelectorAll('.abas-financeiro .aba-link');
        const abaSalva = localStorage.getItem('abaFinanceiroAtiva') || 'lancamentos';
        
        document.querySelectorAll('.abas-financeiro .aba-link').forEach(a => a.classList.remove('active'));
        document.querySelectorAll('.aba-conteudo').forEach(c => c.classList.remove('active'));
        
        const abaParaAtivar = document.querySelector(`.abas-financeiro .aba-link[data-aba="${abaSalva}"]`);
        const conteudoParaAtivar = document.getElementById(abaSalva);
        
        if(abaParaAtivar && conteudoParaAtivar) {
            abaParaAtivar.classList.add('active');
            conteudoParaAtivar.classList.add('active');
        }

        abasLink.forEach(aba => {
            aba.onclick = () => {
                document.querySelector('.abas-financeiro .aba-link.active')?.classList.remove('active');
                document.querySelector('.aba-conteudo.active')?.classList.remove('active');
                aba.classList.add('active');
                const idAba = aba.dataset.aba;
                document.getElementById(idAba)?.classList.add('active');
                localStorage.setItem('abaFinanceiroAtiva', idAba);
            };
        });
    };
    configurarAbas();

    // ==========================================
    // 4. RENDERIZAÇÃO: TABELAS E DASHBOARD
    // ==========================================
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
            if (lancamentosSelecionados.has(l._id)) tr.classList.add('selecionada');
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
        if(document.getElementById('total-receitas')) document.getElementById('total-receitas').textContent = formatarMoeda(receitas);
        if(document.getElementById('total-despesas')) document.getElementById('total-despesas').textContent = formatarMoeda(despesas);
        const balancoEl = document.getElementById('balanco-mensal');
        if (balancoEl) {
            balancoEl.textContent = formatarMoeda(balanco);
            balancoEl.style.color = balanco >= 0 ? '#28a745' : '#dc3545';
        }
    };

    const calcularBalancoGeral = (todos) => {
        if(!Array.isArray(todos)) return;
        const caixaPrincipal = todos.filter(l => !l.fundoId);
        const receitas = caixaPrincipal.filter(l => l.tipo === 'entrada').reduce((acc, l) => acc + l.valor, 0);
        const despesas = caixaPrincipal.filter(l => l.tipo === 'saida').reduce((acc, l) => acc + l.valor, 0);
        const balanco = receitas - despesas;
        const geralEl = document.getElementById('balanco-geral');
        if (geralEl) {
            geralEl.textContent = formatarMoeda(balanco);
            geralEl.style.color = balanco >= 0 ? '#28a745' : '#dc3545';
        }
    };

    // ==========================================
    // 5. RENDERIZAÇÃO: GRÁFICOS
    // ==========================================
    const renderizarGraficoAnual = (lancamentos, anoReferencia) => {
        const tituloEl = document.getElementById('grafico-ano-titulo');
        if (tituloEl) tituloEl.textContent = (anoReferencia === 'todos' || !anoReferencia) ? 'Geral' : anoReferencia;
        const canvas = document.getElementById('grafico-mensal');
        if (!canvas) return;

        let chartExistente = Chart.getChart('grafico-mensal');
        if (chartExistente) chartExistente.destroy();

        const dadosPorMes = Array(12).fill(null).map(() => ({ entradas: 0, saidas: 0 }));
        (lancamentos || []).forEach(l => {
            const data = new Date(l.data);
            const mesIdx = data.getUTCMonth();
            if (l.tipo === 'entrada') dadosPorMes[mesIdx].entradas += l.valor;
            else dadosPorMes[mesIdx].saidas += l.valor;
        });

        const labels = (['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']);
        new Chart(canvas.getContext('2d'), {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    { label: 'Receitas', data: dadosPorMes.map(d => d.entradas), backgroundColor: '#28a745' },
                    { label: 'Despesas', data: dadosPorMes.map(d => d.saidas), backgroundColor: '#dc3545' }
                ]
            },
            options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }
        });
    };
    
    const renderizarGraficoDespesasPizza = (lancamentos) => {
        const despesas = (lancamentos || []).filter(l => l.tipo === 'saida');
        const canvas = document.getElementById('grafico-despesas-pizza');
        if(!canvas) return;

        let chartExistente = Chart.getChart('grafico-despesas-pizza');
        if (chartExistente) chartExistente.destroy();

        const container = canvas.parentElement;
        const oldMsg = container.querySelector('.aviso-vazio');
        if(oldMsg) oldMsg.remove();

        if (despesas.length === 0) {
            canvas.style.display = 'none';
            container.insertAdjacentHTML('beforeend', '<p class="aviso-vazio" style="text-align:center; padding: 40px 20px; color: #888;">Nenhuma despesa nos filtros selecionados.</p>');
            return;
        }
        
        canvas.style.display = 'block';
        const despesasPorCategoria = despesas.reduce((acc, l) => {
            acc[l.categoria] = (acc[l.categoria] || 0) + l.valor;
            return acc;
        }, {});

        const cores = ['#dc3545', '#fd7e14', '#ffc107', '#6c757d', '#343a40', '#17a2b8', '#6f42c1'];
        new Chart(canvas.getContext('2d'), {
            type: 'pie',
            data: { labels: Object.keys(despesasPorCategoria), datasets: [{ data: Object.values(despesasPorCategoria), backgroundColor: cores, borderColor: '#fff', borderWidth: 2 }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
        });
    };

    const renderizarGraficoContribuicoes = (contribuicoes) => {
        const canvas = document.getElementById('grafico-contribuicoes-membro');
        if(!canvas) return;

        let chartExistente = Chart.getChart('grafico-contribuicoes-membro');
        if (chartExistente) chartExistente.destroy();
        
        const anoCorrente = new Date().getFullYear();
        if(document.getElementById('grafico-ano-membro')) document.getElementById('grafico-ano-membro').textContent = anoCorrente;

        const contribuicoesAno = contribuicoes.filter(c => new Date(c.data).getUTCFullYear() === anoCorrente);
        const container = canvas.parentElement;
        const oldMsg = container.querySelector('.aviso-vazio');
        if(oldMsg) oldMsg.remove();

        if (contribuicoesAno.length === 0) {
            canvas.style.display = 'none';
            container.insertAdjacentHTML('beforeend', '<p class="aviso-vazio" style="text-align:center; padding: 40px 20px; color: #888;">Nenhuma contribuição registrada neste ano.</p>');
            return;
        }
        canvas.style.display = 'block';

        const dadosPorMes = Array(12).fill(0);
        contribuicoesAno.forEach(c => {
            const mes = new Date(c.data).getUTCMonth();
            dadosPorMes[mes] += c.valor;
        });
        
        new Chart(canvas.getContext('2d'), {
            type: 'bar',
            data: {
                labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
                datasets: [{ label: `Contribuições em ${anoCorrente}`, data: dadosPorMes, backgroundColor: 'rgba(40, 167, 69, 0.7)', borderColor: 'rgba(40, 167, 69, 1)', borderWidth: 1 }]
            },
            options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } }, plugins: { legend: { display: false } } }
        });
    };

    // ==========================================
    // 6. MÓDULO DE FUNDOS E METAS
    // ==========================================
    const carregarFundos = async () => {
        try {
            const response = await window.api.get(`/api/financeiro/fundos?_t=${Date.now()}`);
            fundosAtivos = Array.isArray(response) ? response : [];
            renderizarFundos(fundosAtivos);
            popularSelectFundos(); 
        } catch (error) {
            fundosAtivos = [];
            renderizarFundos(fundosAtivos);
        }
    }

    const popularSelectFundos = () => {
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
        const prazoStr = typeof fundo.prazo === 'string' ? fundo.prazo.split('T')[0] : fundo.prazo;
        const prazo = new Date(prazoStr + 'T23:59:59'); 
        const hoje = new Date();
        const diasRestantes = Math.ceil((prazo - hoje) / (1000 * 60 * 60 * 24));
        const faltante = (fundo.meta || 0) - Math.max(fundo.arrecadado || 0, 0);
        
        if (faltante <= 0) return 'Meta atingida! Parabéns!';
        if (diasRestantes <= 0) return `Prazo encerrado. Faltou ${formatarMoeda(faltante)}.`;
        
        let mesesRestantes = (prazo.getFullYear() - hoje.getFullYear()) * 12 + (prazo.getMonth() - hoje.getMonth());
        if (hoje.getDate() > prazo.getDate()) mesesRestantes--; 
        mesesRestantes = Math.max(mesesRestantes, 0); 

        if (mesesRestantes < 1) return `Faltam ${diasRestantes} dias. Necessário ${formatarMoeda(faltante)} na reta final.`;
        return `Faltam ${diasRestantes} dias. Aprox. ${formatarMoeda(faltante / mesesRestantes)} / mês.`;
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
            const arrecadado = Math.max(fundo.arrecadado || 0, 0);
            const porcentagemNum = Math.min((arrecadado / meta) * 100, 100);
            const porcentagem = porcentagemNum.toFixed(1);
            
            const cardStatusClass = porcentagemNum >= 100 ? 'meta-concluida' : 'meta-andamento';
            const badgeClass = porcentagemNum >= 100 ? 'badge-concluido' : 'badge-andamento';
            const statusText = porcentagemNum >= 100 ? 'Concluído' : 'Em Andamento';
            const ritmoTexto = calcularRitmoFundo(fundo);

            const card = document.createElement('div');
            card.className = `card-fundo ${cardStatusClass}`;
            card.innerHTML = `
                <div class="card-fundo-header">
                    <h3>${fundo.nome}</h3>
                    <div class="badge-status">
                        <span class="badge-status ${badgeClass}">${statusText}</span>
                    </div>
                </div>
                <p class="fundo-desc">${fundo.descricao}</p>
                <p class="fundo-ritmo"><i class='bx bx-time-five'></i> ${ritmoTexto}</p>
                <div class="progresso-container"><div class="progresso-barra" style="width: ${porcentagem}%"></div></div>
                <div class="progresso-texto"><span><strong>Arrecadado:</strong> ${formatarMoeda(fundo.arrecadado)}</span><span><strong>Meta:</strong> ${formatarMoeda(fundo.meta)}</span></div>
                <div class="progresso-porcentagem">${porcentagem}%</div>
                <div style="text-align: right; margin-top: 10px;">
                    <i class='bx bxs-edit btn-editar-fundo' style="font-size: 1.2rem; color: #007bff; cursor: pointer; margin-right: 10px;" title="Editar"></i>
                    <i class='bx bxs-trash btn-excluir-fundo' style="font-size: 1.2rem; color: #dc3545; cursor: pointer;" title="Excluir"></i>
                </div>
            `;

            card.onclick = (e) => {
                if(!e.target.classList.contains('btn-editar-fundo') && !e.target.classList.contains('btn-excluir-fundo')) {
                    abrirDetalhesFundo(fundo);
                }
            };
            card.querySelector('.btn-editar-fundo').onclick = (e) => {
                e.stopPropagation();
                abrirModalFundo(fundo);
            };
            card.querySelector('.btn-excluir-fundo').onclick = async (e) => {
                e.stopPropagation();
                if(confirm('Deseja realmente excluir este fundo? Os lançamentos vinculados a ele continuarão existindo no caixa geral.')) {
                    await window.api.delete(`/api/financeiro/fundos/${fundo._id}`);
                    carregarFundos();
                }
            };
            grid.appendChild(card);
        });
    };

    const abrirModalFundo = (fundo = null) => {
        if(formFundo) formFundo.reset();
        fundoEmEdicaoId = null;
        if(fundo) {
            document.getElementById('modal-fundo-titulo').textContent = 'Editar Fundo / Meta';
            fundoEmEdicaoId = fundo._id;
            document.getElementById('fundo-nome').value = fundo.nome;
            document.getElementById('fundo-descricao').value = fundo.descricao;
            document.getElementById('fundo-meta').value = "R$ " + (fundo.meta || 0).toFixed(2).replace('.', ',');
            document.getElementById('fundo-prazo').value = fundo.prazo ? fundo.prazo.split('T')[0] : '';
        } else {
            document.getElementById('modal-fundo-titulo').textContent = 'Novo Fundo / Meta';
        }
        if(modalFundo) modalFundo.style.display = 'flex';
    };

    if(formFundo) {
        formFundo.onsubmit = async (e) => {
            e.preventDefault();
            const dados = {
                nome: document.getElementById('fundo-nome').value,
                descricao: document.getElementById('fundo-descricao').value,
                meta: parseMoedaToFloat(inputMetaFundo ? inputMetaFundo.value : '0'),
                prazo: document.getElementById('fundo-prazo').value
            };
            try {
                if(fundoEmEdicaoId) await window.api.put(`/api/financeiro/fundos/${fundoEmEdicaoId}`, dados);
                else await window.api.post('/api/financeiro/fundos', dados);
                
                if(modalFundo) modalFundo.style.display = 'none';
                carregarFundos();
            } catch(error) {
                alert('Erro ao salvar fundo.');
            }
        };
    }

    const abrirDetalhesFundo = (fundo) => {
        if(!modalDetalhesFundo) return;
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
                    const membroNome = l.membroId ? (todosMembros.find(m => m._id === l.membroId)?.nome || 'Anônimo') : 'Caixa Geral (Transferência)';
                    return `<tr>
                            <td>${new Date(l.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</td>
                            <td>${membroNome}</td>
                            <td style="color: ${l.tipo === 'entrada' ? '#28a745' : '#dc3545'}; font-weight: bold;">${l.tipo === 'entrada' ? '+' : '-'} ${formatarMoeda(l.valor)}</td>
                        </tr>`;
                }).join('');
            } else {
                tabela.innerHTML = '<tr><td colspan="3" style="text-align: center; color: #666; padding: 15px;">Nenhum lançamento vinculado ainda.</td></tr>';
            }
        }
        renderizarGraficoFundoEspecifico(lancamentosDoFundo);
        modalDetalhesFundo.style.display = 'flex';
    };

    const renderizarGraficoFundoEspecifico = (lancamentos) => {
        const canvas = document.getElementById('grafico-fundo-historico');
        if(!canvas) return;
        
        let chartExistente = Chart.getChart('grafico-fundo-historico');
        if (chartExistente) chartExistente.destroy();

        const ctx = canvas.getContext('2d');
        const dadosPorMes = Array(12).fill(0);
        
        lancamentos.forEach(l => {
            const mes = new Date(l.data).getUTCMonth();
            if(l.tipo === 'entrada') dadosPorMes[mes] += l.valor;
            else dadosPorMes[mes] -= l.valor; 
        });

        new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
                datasets: [{ label: 'Arrecadação Mensal Líquida', data: dadosPorMes, borderColor: '#28a745', backgroundColor: 'rgba(40, 167, 69, 0.2)', fill: true, tension: 0.3 }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    };

    if(btnNovaArrec) {
        btnNovaArrec.onclick = () => {
            if(modalDetalhesFundo) modalDetalhesFundo.style.display = 'none'; 
            abrirModal(); 
            setTimeout(() => {
                if(selectTipo) selectTipo.value = 'entrada';
                atualizarCategoriasModal('entrada');
                if(selectFundo && fundoEmVisualizacao) {
                    selectFundo.value = fundoEmVisualizacao._id;
                    toggleMembroSearch();
                }
            }, 100);
        };
    }

    if(btnTransferirCaixa) {
        btnTransferirCaixa.onclick = async () => {
            if(!fundoEmVisualizacao) return;
            const valorStr = prompt(`Quanto do saldo em caixa deseja transferir para "${fundoEmVisualizacao.nome}"?\n\nDigite apenas números (Ex: 150,50):`);
            if(!valorStr) return;
            const valorTransferencia = parseFloat(valorStr.replace(',', '.'));
            if(isNaN(valorTransferencia) || valorTransferencia <= 0) return alert("Valor inválido.");

            if(confirm(`Confirmar transferência de ${formatarMoeda(valorTransferencia)} para o fundo?`)) {
                try {
                    await window.api.post('/api/financeiro/lancamentos', { tipo: 'saida', data: new Date().toISOString().split('T')[0], valor: valorTransferencia, categoria: 'Transferência de Fundo', descricao: `Transferência para o projeto: ${fundoEmVisualizacao.nome}`, fundoId: null });
                    await window.api.post('/api/financeiro/lancamentos', { tipo: 'entrada', data: new Date().toISOString().split('T')[0], valor: valorTransferencia, categoria: 'Aporte de Caixa', descricao: 'Aporte recebido do caixa geral', fundoId: fundoEmVisualizacao._id });
                    if(modalDetalhesFundo) modalDetalhesFundo.style.display = 'none';
                    carregarDados(); 
                } catch (err) { alert('Erro ao transferir saldo.'); }
            }
        };
    }

    // ==========================================
    // 7. LÓGICA DE FILTROS E PESQUISAS
    // ==========================================
    const aplicarFiltros = async (retornarArray = false) => {
        const ano = filtroAno ? filtroAno.value : 'todos';
        const mes = filtroMes ? filtroMes.value : 'todos';
        const tipo = filtroTipo ? filtroTipo.value : 'todos';
        const checkboxes = document.querySelectorAll('.categoria-checkbox:checked');
        const categoriasSelecionadas = Array.from(checkboxes).map(cb => cb.value);

        const queryParams = new URLSearchParams();
        if (ano && ano !== 'todos') queryParams.append('ano', ano);
        if (mes && mes !== 'todos') queryParams.append('mes', mes);
        if (categoriasSelecionadas.length > 0) queryParams.append('categorias', categoriasSelecionadas.join(','));

        try {
            let lancamentos = await window.api.get(`/api/financeiro/lancamentos?${queryParams.toString()}&_t=${Date.now()}`);
            if (!Array.isArray(lancamentos)) lancamentos = [];

            let lancamentosCaixaPrincipal = lancamentos.filter(l => !l.fundoId);
            let lancamentosFiltrados = tipo === 'todos' ? lancamentosCaixaPrincipal : lancamentosCaixaPrincipal.filter(l => l.tipo === tipo);
            if (itemParaExcluir) lancamentosFiltrados = lancamentosFiltrados.filter(l => l._id !== itemParaExcluir.lancamento._id);
            if (retornarArray) return lancamentosFiltrados;

            renderizarTabela(lancamentosFiltrados);
            atualizarDashboard(lancamentosFiltrados);
            renderizarGraficoDespesasPizza(lancamentosFiltrados);
            
            if (ano !== 'todos') {
                const resAno = await window.api.get(`/api/financeiro/lancamentos?ano=${ano}&_t=${Date.now()}`);
                const resAnoCaixaPrincipal = (resAno || []).filter(l => !l.fundoId);
                renderizarGraficoAnual(resAnoCaixaPrincipal, ano);
            } else {
                renderizarGraficoAnual(lancamentosCaixaPrincipal, 'Geral');
            }
            return lancamentosFiltrados;
        } catch (error) { return []; }
    };

    const popularFiltros = (lancamentosIniciais) => {
        if (!filtroAno || !filtroMes) return;
        const anosNoBanco = [...new Set((lancamentosIniciais || []).map(l => new Date(l.data).getUTCFullYear()))];
        const hoje = new Date();
        const anoAtual = hoje.getFullYear();
        const mesAtual = hoje.getMonth() + 1; 

        if (!anosNoBanco.includes(anoAtual)) anosNoBanco.push(anoAtual);
        filtroAno.innerHTML = '<option value="todos">Todos os Anos</option>' + anosNoBanco.sort((a, b) => b - a).map(ano => `<option value="${ano}">${ano}</option>`).join('');
        filtroAno.value = anoAtual.toString();
        filtroMes.value = mesAtual.toString();

        const categoriasConfigSet = new Set([...(categoriasConfig?.entradas || []), ...(categoriasConfig?.saidas || [])]);
        const categoriasLancamentosSet = new Set((lancamentosIniciais || []).map(l => l.categoria));
        const todasCategorias = [...new Set([...categoriasConfigSet, ...categoriasLancamentosSet])].sort();

        if (categoriasCheckboxes) {
            categoriasCheckboxes.innerHTML = todasCategorias.map(cat => `<label><input type="checkbox" class="categoria-checkbox" value="${cat}"> ${cat}</label>`).join('');
            categoriasCheckboxes.querySelectorAll('.categoria-checkbox').forEach(cb => cb.onchange = atualizarTextoCategorias);
        }
    };

    const toggleMembroSearch = () => {
        const categoria = selectCategoria ? selectCategoria.value : '';
        const fundoVinculado = selectFundo ? selectFundo.value : '';
        const isContribuicao = categoria.includes('Dízimo') || categoria.includes('Oferta') || fundoVinculado !== '';
        if(grupoMembro) grupoMembro.classList.toggle('hidden', !isContribuicao);
    };

    // ==========================================
    // 8. MODAIS E GERAÇÃO DE RECIBOS
    // ==========================================
    
    // AQUI: Preenche o Recibo com os dados do Tenant salvo nas Configurações Globais
    const preencherRecibo = async (lancamento, membro) => {
        document.getElementById('recibo-nome-membro').textContent = membro ? membro.nome : 'Doador Avulso';
        document.getElementById('recibo-valor').textContent = formatarMoeda(lancamento.valor);
        document.getElementById('recibo-descricao').textContent = lancamento.descricao;
        document.getElementById('recibo-data').textContent = new Date(lancamento.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
        document.getElementById('recibo-categoria').textContent = lancamento.categoria;

        if (tenantInfo) {
            const elNomeIgreja = document.getElementById('recibo-nome-igreja');
            const elCnpjIgreja = document.getElementById('recibo-cnpj-igreja');
            const logoImg = document.getElementById('recibo-logo-igreja');
            const logoIcon = document.getElementById('recibo-logo-icone');

            if (elNomeIgreja) elNomeIgreja.textContent = tenantInfo.nomeIgreja || 'Nossa Igreja';
            if (elCnpjIgreja) elCnpjIgreja.textContent = tenantInfo.cnpj ? `CNPJ: ${tenantInfo.cnpj}` : '';
            
            if (tenantInfo.logoIgrejaUrl) {
                if(logoImg) { 
                    logoImg.crossOrigin = "anonymous";
                    logoImg.src = tenantInfo.logoIgrejaUrl; 
                    logoImg.style.display = 'block'; 
                }
                if(logoIcon) logoIcon.style.display = 'none';
            } else {
                if(logoImg) logoImg.style.display = 'none';
                if(logoIcon) logoIcon.style.display = 'block';
            }
        }
    };

    const gerarReciboPDF = async (lancamento) => {
        const membro = todosMembros.find(m => m._id === lancamento.membroId);
        await preencherRecibo(lancamento, membro);

        const { jsPDF } = window.jspdf;
        const reciboElement = document.getElementById('recibo-template');

        setTimeout(async () => {
            const canvas = await html2canvas(reciboElement, { scale: 2, useCORS: true, allowTaint: true });
            const imgData = canvas.toDataURL('image/png');

            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
            
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`Recibo_${lancamento.categoria}_${membro ? membro.nome.split(' ')[0] : 'Avulso'}.pdf`);
        }, 800);
    };

    const compartilharRecibo = async (lancamento) => {
        const membro = todosMembros.find(m => m._id === lancamento.membroId);
        await preencherRecibo(lancamento, membro);
        
        const reciboElement = document.getElementById('recibo-template');

        setTimeout(async () => {
            try {
                const canvas = await html2canvas(reciboElement, { scale: 2, useCORS: true, allowTaint: true });
                canvas.toBlob(async (blob) => {
                    const fileName = `Recibo_${membro ? membro.nome.split(' ')[0] : 'Avulso'}.png`;
                    const file = new File([blob], fileName, { type: 'image/png' });
                    const shareData = {
                        files: [file],
                        title: 'Recibo de Contribuição',
                        text: `Olá ${membro ? membro.nome : ''}, segue o seu recibo.`,
                    };

                    if (navigator.canShare && navigator.canShare(shareData)) {
                        await navigator.share(shareData);
                    } else {
                        alert('O compartilhamento não é suportado neste navegador. O recibo será baixado.');
                        const link = document.createElement('a');
                        link.href = URL.createObjectURL(blob);
                        link.download = fileName;
                        link.click();
                    }
                }, 'image/png');
            } catch (error) {
                console.error('Erro ao compartilhar:', error);
            }
        }, 800);
    };

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
            previewContainer.innerHTML = '<span>Nenhum comprovante anexado</span>';
        }

        const btnImprimir = document.getElementById('detalhes-btn-imprimir');
        const btnCompartilhar = document.getElementById('detalhes-btn-compartilhar');
        
        if (lancamento.tipo === 'entrada') {
            if(btnImprimir) {
                btnImprimir.classList.remove('hidden');
                btnImprimir.onclick = () => gerarReciboPDF(lancamento);
            }
            if(btnCompartilhar) {
                btnCompartilhar.classList.remove('hidden');
                btnCompartilhar.onclick = () => compartilharRecibo(lancamento);
            }
        } else {
            if(btnImprimir) btnImprimir.classList.add('hidden');
            if(btnCompartilhar) btnCompartilhar.classList.add('hidden');
        }

        modalDetalhes.style.display = 'flex';
    };

    const abrirModal = (lancamento = null, duplicar = false) => {
        if(formLancamento) formLancamento.reset();
        popularSelectFundos(); 
        lancamentoEmEdicaoId = null;
        if(membroIdHiddenInput) membroIdHiddenInput.value = '';
        if(buscaMembroModalInput) { buscaMembroModalInput.value = ''; buscaMembroModalInput.disabled = false; }
        if(clearMembroBtn) clearMembroBtn.classList.add('hidden');
        if(grupoMembro) grupoMembro.classList.add('hidden');
        const comprovanteAtualContainer = document.getElementById('comprovante-atual-container');
        const comprovanteAtualLink = document.getElementById('comprovante-atual-link');
        if(comprovanteAtualContainer) comprovanteAtualContainer.classList.add('hidden');
        if(comprovanteAtualLink) comprovanteAtualLink.href = '#';

        if (lancamento && !duplicar) { 
            document.getElementById('modal-titulo').textContent = 'Editar Lançamento';
            lancamentoEmEdicaoId = lancamento._id;
            if(selectTipo) selectTipo.value = lancamento.tipo;
            document.getElementById('data').value = lancamento.data.split('T')[0];
            if(inputValorLancamento) inputValorLancamento.value = "R$ " + (lancamento.valor || 0).toFixed(2).replace('.', ',');
            document.getElementById('descricao').value = lancamento.descricao;
            if(lancamento.fundoId && selectFundo) selectFundo.value = lancamento.fundoId;
            atualizarCategoriasModal(lancamento.tipo, lancamento.categoria);
            if (lancamento.membroId) {
                const membro = todosMembros.find(m => m._id === lancamento.membroId);
                if (membro && buscaMembroModalInput) {
                    buscaMembroModalInput.value = membro.nome;
                    if(membroIdHiddenInput) membroIdHiddenInput.value = membro._id;
                    buscaMembroModalInput.disabled = true;
                    if(clearMembroBtn) clearMembroBtn.classList.remove('hidden');
                }
            }
            if (lancamento.comprovanteUrl && comprovanteAtualContainer && comprovanteAtualLink) {
                comprovanteAtualContainer.classList.remove('hidden');
                comprovanteAtualLink.textContent = lancamento.comprovanteUrl.split('/').pop();
                comprovanteAtualLink.href = lancamento.comprovanteUrl;
            }
        } else if (lancamento && duplicar) { 
            document.getElementById('modal-titulo').textContent = 'Duplicar Lançamento';
            if(selectTipo) selectTipo.value = lancamento.tipo;
            document.getElementById('data').value = new Date().toISOString().split('T')[0];
            if(inputValorLancamento) inputValorLancamento.value = "R$ " + (lancamento.valor || 0).toFixed(2).replace('.', ',');
            document.getElementById('descricao').value = lancamento.descricao;
            if(lancamento.fundoId && selectFundo) selectFundo.value = lancamento.fundoId;
            atualizarCategoriasModal(lancamento.tipo, lancamento.categoria);
            if (lancamento.membroId) {
                 const membro = todosMembros.find(m => m._id === lancamento.membroId);
                if (membro && buscaMembroModalInput) {
                    buscaMembroModalInput.value = membro.nome;
                    if(membroIdHiddenInput) membroIdHiddenInput.value = membro._id;
                    buscaMembroModalInput.disabled = true;
                    if(clearMembroBtn) clearMembroBtn.classList.remove('hidden');
                }
            }
        } else { 
            document.getElementById('modal-titulo').textContent = 'Novo Lançamento';
            document.getElementById('data').value = new Date().toISOString().split('T')[0];
            atualizarCategoriasModal('entrada');
        }
        toggleMembroSearch();
        if(modalLancamento) modalLancamento.style.display = 'flex';
    };

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
                alert('Valor inválido.');
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
            if(index !== -1) todosLancamentos[index] = { ...todosLancamentos[index], ...dadosAtualizados };
            aplicarFiltros();
            carregarFundos(); 
        } catch (error) {
            celula.textContent = campo === 'valor' ? formatarMoeda(valorOriginal) : valorOriginal;
        }
    };

    const atualizarEstadoExclusaoLote = () => {
        if (lancamentosSelecionados.size > 0) {
            if(btnExcluirSelecionados) {
                btnExcluirSelecionados.classList.remove('hidden');
                btnExcluirSelecionados.textContent = `Excluir ${lancamentosSelecionados.size} Iten(s)`;
            }
        } else {
            if(btnExcluirSelecionados) btnExcluirSelecionados.classList.add('hidden');
            if(tabelaLancamentos) tabelaLancamentos.classList.remove('modo-selecao');
        }
    };

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

        if(toast) {
            document.getElementById('toast-mensagem').textContent = 'Lançamento excluído.';
            toast.classList.add('show');
        }

        exclusaoTimeout = setTimeout(() => {
            excluirLancamento(itemParaExcluir.lancamento._id, false);
            itemParaExcluir = null;
            if(toast) toast.classList.remove('show');
        }, 5000);
    };

    const excluirLancamento = async (id, recarregar = true) => {
        try {
            await window.api.delete(`/api/financeiro/lancamentos/${id}`);
            if (recarregar) { await carregarDados(); }
        } catch (error) {
            if (recarregar) await carregarDados();
        }
    };

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
        doc.text('Tesouraria - ' + (tenantInfo ? tenantInfo.nomeIgreja : 'Nossa Igreja'), 105, finalY + 17, { align: 'center' });
        doc.save(`Relatorio_Contribuicoes_${membro.nome.split(' ')[0]}_${anoCorrente}.pdf`);
    };

    const exibirHistoricoMembro = (membro) => {
        membroEmVisualizacaoId = membro._id;
        if(avisoInicial) avisoInicial.classList.add('hidden');
        if(historicoContainer) historicoContainer.classList.remove('hidden');
        
        const elNome = document.getElementById('historico-membro-nome');
        if(elNome) elNome.textContent = membro.nome;

        const contribuicoes = todosLancamentos.filter(l => l.membroId === membro._id && (l.categoria.includes('Dízimo') || l.categoria.includes('Oferta')));
        const corpoHistorico = document.getElementById('tabela-historico-corpo');
        
        if (corpoHistorico && contribuicoes.length > 0) {
            corpoHistorico.innerHTML = contribuicoes.map(c => `
                <tr>
                    <td>${new Date(c.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</td>
                    <td>${c.categoria}</td>
                    <td>${c.descricao}</td>
                    <td>${formatarMoeda(c.valor)}</td>
                </tr>
            `).join('');
            const avisoSemHist = document.getElementById('aviso-sem-historico');
            if(avisoSemHist) avisoSemHist.classList.add('hidden');
        } else if(corpoHistorico) {
            corpoHistorico.innerHTML = '';
            const avisoSemHist = document.getElementById('aviso-sem-historico');
            if(avisoSemHist) avisoSemHist.classList.remove('hidden');
        }

        const totalGeral = contribuicoes.reduce((acc, c) => acc + c.valor, 0);
        const elTotalHist = document.getElementById('total-geral-historico');
        if(elTotalHist) elTotalHist.textContent = formatarMoeda(totalGeral);

        const anoCorrente = new Date().getFullYear();
        const elAnoCorr = document.getElementById('ano-corrente-historico');
        if(elAnoCorr) elAnoCorr.textContent = anoCorrente;
        
        const totalAnual = contribuicoes
            .filter(c => new Date(c.data).getUTCFullYear() === anoCorrente)
            .reduce((acc, c) => acc + c.valor, 0);
        const elTotalAnual = document.getElementById('total-anual-membro');
        if(elTotalAnual) elTotalAnual.textContent = formatarMoeda(totalAnual);
        
        renderizarGraficoContribuicoes(contribuicoes);

        if(btnNovoDizimoMembro) {
            btnNovoDizimoMembro.onclick = () => {
                abrirModal();
                setTimeout(() => {
                    if(selectTipo) selectTipo.value = 'entrada';
                    atualizarCategoriasModal('entrada', 'Dízimo');
                    if(buscaMembroModalInput) {
                        buscaMembroModalInput.value = membro.nome;
                        buscaMembroModalInput.disabled = true;
                    }
                    if(membroIdHiddenInput) membroIdHiddenInput.value = membro._id;
                    if(clearMembroBtn) clearMembroBtn.classList.remove('hidden');
                }, 100);
            };
        }

        if(btnImprimirRelatorioMembro) {
            btnImprimirRelatorioMembro.onclick = () => imprimirRelatorioAnualMembro(membro, contribuicoes);
        }
    };

    // ==========================================
    // 10. CARREGAMENTO INICIAL
    // ==========================================
    const carregarDados = async () => {
        try {
            // Puxando a Identidade a partir do arquivo de configurações recém editado
            try {
                const resConfig = await window.api.get(`/api/configs?_t=${Date.now()}`);
                categoriasConfig = resConfig?.financeiro_categorias || { entradas: [], saidas: [] };
                tenantInfo = resConfig?.identidade || null; // <--- PUXA A IDENTIDADE SALVA
            } catch (err) { categoriasConfig = { entradas: [], saidas: [] }; }

            try {
                const resMembros = await window.api.get(`/api/membros?_t=${Date.now()}`);
                todosMembros = Array.isArray(resMembros) ? resMembros : [];
            } catch (err) { todosMembros = []; }

            try {
                const resLancamentosTodos = await window.api.get(`/api/financeiro/lancamentos?ano=todos&_t=${Date.now()}`);
                todosLancamentos = Array.isArray(resLancamentosTodos) ? resLancamentosTodos : [];
            } catch (err) { todosLancamentos = []; }

            await carregarFundos();

            calcularBalancoGeral(todosLancamentos);
            popularFiltros(todosLancamentos);
            await aplicarFiltros();

        } catch (error) {
            console.error("Erro no carregamento inicial da página:", error);
        }
    };

    // ==========================================
    // 11. EVENT LISTENERS
    // ==========================================
    if(formLancamento) {
        formLancamento.onsubmit = async (e) => {
            e.preventDefault();
            const comprovanteAtualLink = document.getElementById('comprovante-atual-link');
            let comprovanteUrl = comprovanteAtualLink ? comprovanteAtualLink.href : null;
            if(comprovanteUrl && comprovanteUrl.endsWith('#')) comprovanteUrl = null;
            if(comprovanteUrl) comprovanteUrl = new URL(comprovanteUrl).pathname;

            try {
                if (comprovanteInput && comprovanteInput.files[0]) {
                    const formData = new FormData();
                    formData.append('comprovante', comprovanteInput.files[0]);
                    const res = await window.api.post('/api/financeiro/upload-comprovante', formData);
                    comprovanteUrl = res.filePath;
                }
            } catch (error) {
                alert('Falha ao enviar o comprovante.');
                return;
            }

            const dados = {
                tipo: selectTipo ? selectTipo.value : '',
                data: document.getElementById('data').value,
                valor: parseMoedaToFloat(inputValorLancamento ? inputValorLancamento.value : '0'),
                categoria: selectCategoria ? selectCategoria.value : '',
                descricao: document.getElementById('descricao').value,
                membroId: membroIdHiddenInput && membroIdHiddenInput.value ? membroIdHiddenInput.value : null,
                fundoId: selectFundo && selectFundo.value ? selectFundo.value : null,
                comprovanteUrl: comprovanteUrl
            };

            try {
                if (lancamentoEmEdicaoId) await window.api.put(`/api/financeiro/lancamentos/${lancamentoEmEdicaoId}`, dados);
                else await window.api.post('/api/financeiro/lancamentos', dados);
                
                if(modalLancamento) modalLancamento.style.display = 'none';
                await carregarDados(); 
            } catch (error) { alert('Não foi possível salvar o lançamento.'); }
        };
    }

    if(tabelaCorpo) {
        tabelaCorpo.onclick = (e) => {
            const id = e.target.dataset.id;
            if (e.target.classList.contains('bxs-edit')) {
                const lancamento = todosLancamentos.find(l => l._id === id);
                abrirModal(lancamento);
            } else if (e.target.classList.contains('bxs-copy')) {
                const lancamento = todosLancamentos.find(l => l._id === id);
                abrirModal(lancamento, true);
            } else if (e.target.classList.contains('bxs-trash')) {
                iniciarExclusaoComDesfazer(id);
            } else if (!e.target.closest('.acoes-item') && !e.target.closest('a') && !e.target.closest('input')) {
                const tr = e.target.closest('tr');
                if (tr && tabelaLancamentos && tabelaLancamentos.classList.contains('modo-selecao')) {
                    const checkbox = tr.querySelector('.checkbox-lancamento');
                    if (checkbox && e.target.type !== 'checkbox') {
                        checkbox.checked = !checkbox.checked;
                        checkbox.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                } else if(tr) {
                    const lancamento = todosLancamentos.find(l => l._id === tr.dataset.id);
                    if(lancamento) abrirModalDetalhes(lancamento);
                }
            }
        };

        tabelaCorpo.onchange = (e) => {
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
        };

        tabelaCorpo.addEventListener('blur', (e) => {
            if (e.target.classList.contains('celula-editavel')) salvarEdicaoEmLinha(e);
        }, true);

        tabelaCorpo.oncontextmenu = (e) => {
            e.preventDefault();
            const tr = e.target.closest('tr');
            if (!tr || !tr.dataset.id) return;
            rightClickedRowId = tr.dataset.id;
            if(contextMenu) {
                contextMenu.style.display = 'block';
                contextMenu.style.left = `${e.pageX}px`;
                contextMenu.style.top = `${e.pageY}px`;
            }
        };
    }

    if(btnSelecionar) {
        btnSelecionar.onclick = () => {
            if (!rightClickedRowId) return;
            if (tabelaLancamentos) tabelaLancamentos.classList.add('modo-selecao');
            if (tabelaCorpo) {
                const checkbox = tabelaCorpo.querySelector(`.checkbox-lancamento[data-id="${rightClickedRowId}"]`);
                if (checkbox && !checkbox.checked) {
                    checkbox.checked = true;
                    checkbox.dispatchEvent(new Event('change', { bubbles: true }));
                }
            }
        };
    }

    if(btnEditarCtx) {
        btnEditarCtx.onclick = () => {
            if (!rightClickedRowId) return;
            const lancamento = todosLancamentos.find(l => l._id === rightClickedRowId);
            if(lancamento) abrirModal(lancamento);
        };
    }

    if(btnExcluirCtx) {
        btnExcluirCtx.onclick = () => {
            if (!rightClickedRowId) return;
            iniciarExclusaoComDesfazer(rightClickedRowId);
        };
    }

    if(btnCopiarCtx) {
        btnCopiarCtx.onclick = () => {
            if (!rightClickedRowId) return;
            const lancamento = todosLancamentos.find(l => l._id === rightClickedRowId);
            if (lancamento) {
                const texto = `Data: ${new Date(lancamento.data).toLocaleDateString('pt-BR')}\tValor: ${formatarMoeda(lancamento.valor)}\tCategoria: ${lancamento.categoria}\tDescrição: ${lancamento.descricao}`;
                navigator.clipboard.writeText(texto).then(() => alert('Dados copiados!'));
            }
        };
    }

    // BOTÃO DIREITO: Apenas para Entradas/Receitas
    if(btnImprimirCtx) {
        btnImprimirCtx.onclick = () => {
            if (!rightClickedRowId) return;
            const lancamento = todosLancamentos.find(l => l._id === rightClickedRowId);
            if (lancamento) {
                if(lancamento.tipo === 'entrada') {
                    gerarReciboPDF(lancamento);
                } else {
                    alert("A emissão de recibos está disponível apenas para entradas/receitas.");
                }
            }
        };
    }

    if(checkboxSelecionarTodos) {
        checkboxSelecionarTodos.onchange = (e) => {
            const isChecked = e.target.checked;
            if(!tabelaCorpo) return;
            tabelaCorpo.querySelectorAll('.checkbox-lancamento').forEach(checkbox => {
                const id = checkbox.dataset.id;
                const tr = checkbox.closest('tr');
                checkbox.checked = isChecked;
                if (isChecked) { lancamentosSelecionados.add(id); tr.classList.add('selecionada'); } 
                else { lancamentosSelecionados.delete(id); tr.classList.remove('selecionada'); }
            });
            atualizarEstadoExclusaoLote();
        };
    }

    if(btnExcluirSelecionados) {
        btnExcluirSelecionados.onclick = async () => {
            if (confirm(`Tem certeza que deseja excluir os ${lancamentosSelecionados.size} lançamentos selecionados?`)) {
                try {
                    await window.api.delete('/api/financeiro/lancamentos/lote', { ids: [...lancamentosSelecionados] });
                    lancamentosSelecionados.clear();
                    atualizarEstadoExclusaoLote();
                    await carregarDados();
                } catch (error) { alert('Não foi possível excluir.'); }
            }
        };
    }

    if(btnDesfazer) {
        btnDesfazer.onclick = () => {
            if (!itemParaExcluir) return;
            clearTimeout(exclusaoTimeout);
            if(toast) toast.classList.remove('show');
            todosLancamentos.splice(itemParaExcluir.index, 0, itemParaExcluir.lancamento);
            aplicarFiltros();
            itemParaExcluir = null;
            exclusaoTimeout = null;
        };
    }

    if(btnNovoLancamento) btnNovoLancamento.onclick = () => abrirModal();
    if(selectTipo) selectTipo.onchange = (e) => { atualizarCategoriasModal(e.target.value); toggleMembroSearch(); };
    if(selectCategoria) selectCategoria.onchange = toggleMembroSearch;
    if(selectFundo) selectFundo.onchange = toggleMembroSearch;
    if(btnNovaMeta) btnNovaMeta.onclick = () => abrirModalFundo();
    
    if(btnAplicarFiltros) {
        btnAplicarFiltros.onclick = (e) => {
            e.preventDefault();
            aplicarFiltros();
        };
    }

    // Modal Pesquisa de Membros
    if(buscaMembroModalInput) {
        buscaMembroModalInput.oninput = () => {
            const termo = buscaMembroModalInput.value.toLowerCase();
            if (termo.length < 2) {
                if(buscaMembroResultadosModal) buscaMembroResultadosModal.classList.remove('active');
                return;
            }
            const membrosFiltrados = todosMembros.filter(m => 
                m.nome.toLowerCase().includes(termo) || (m.cpf && m.cpf.replace(/\D/g, '').includes(termo))
            );
            if (membrosFiltrados.length > 0 && buscaMembroResultadosModal) {
                buscaMembroResultadosModal.innerHTML = membrosFiltrados.map(m => 
                    `<div class="resultado-item" data-id="${m._id}" data-nome="${m.nome}">${m.nome} - ${m.cpf || 'CPF não cadastrado'}</div>`
                ).join('');
                buscaMembroResultadosModal.classList.add('active');
            } else if (buscaMembroResultadosModal) {
                buscaMembroResultadosModal.innerHTML = '<div class="resultado-item-none">Nenhum membro encontrado</div>';
                buscaMembroResultadosModal.classList.add('active');
            }
        };
    }

    if(buscaMembroResultadosModal) {
        buscaMembroResultadosModal.onclick = (e) => {
            const item = e.target.closest('.resultado-item');
            if (item && buscaMembroModalInput && membroIdHiddenInput) {
                buscaMembroModalInput.value = item.dataset.nome;
                membroIdHiddenInput.value = item.dataset.id;
                buscaMembroResultadosModal.classList.remove('active');
                buscaMembroModalInput.disabled = true;
                if(clearMembroBtn) clearMembroBtn.classList.remove('hidden');
            }
        };
    }

    if(clearMembroBtn) {
        clearMembroBtn.onclick = () => {
            if(buscaMembroModalInput) { buscaMembroModalInput.value = ''; buscaMembroModalInput.disabled = false; buscaMembroModalInput.focus(); }
            if(membroIdHiddenInput) membroIdHiddenInput.value = '';
            clearMembroBtn.classList.add('hidden');
        };
    }

    if(buscaMembroInput) {
        buscaMembroInput.oninput = () => {
            const termo = buscaMembroInput.value.toLowerCase();
            if (termo.length < 2) {
                if(buscaResultados) buscaResultados.classList.remove('active');
                return;
            }
            const membrosFiltrados = todosMembros.filter(m => m.nome.toLowerCase().includes(termo));
            if (membrosFiltrados.length > 0 && buscaResultados) {
                buscaResultados.innerHTML = membrosFiltrados.map(m => `<div class="resultado-item" data-id="${m._id}">${m.nome}</div>`).join('');
                buscaResultados.classList.add('active');
            } else if(buscaResultados) {
                buscaResultados.classList.remove('active');
            }
        };
    }

    if(buscaResultados) {
        buscaResultados.onclick = (e) => {
            const item = e.target.closest('.resultado-item');
            if (item) {
                const membroId = e.target.dataset.id;
                const membro = todosMembros.find(m => m._id === membroId);
                exibirHistoricoMembro(membro);
                if(buscaMembroInput) buscaMembroInput.value = '';
                buscaResultados.classList.remove('active');
            }
        };
    }

    if(btnExportarPdf) {
        btnExportarPdf.onclick = async () => {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            const lancamentosFiltrados = await aplicarFiltros(true);
            const ano = filtroAno ? filtroAno.value : 'todos';
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

            // Somar apenas o que NÃO é Fundo
            const receitas = lancamentosFiltrados.filter(l => l.tipo === 'entrada' && !l.fundoId).reduce((acc, l) => acc + l.valor, 0);
            const despesas = lancamentosFiltrados.filter(l => l.tipo === 'saida' && !l.fundoId).reduce((acc, l) => acc + l.valor, 0);
            const balanco = receitas - despesas;
            const finalY = doc.lastAutoTable.finalY + 10;

            doc.setFontSize(12);
            doc.text('Resumo do Período (Caixa Geral)', 14, finalY);
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
        };
    }

    // START
    carregarDados();
};

document.addEventListener('DOMContentLoaded', iniciarFinanceiro);
document.body.addEventListener('htmx:afterSwap', iniciarFinanceiro);
if (document.readyState !== 'loading') iniciarFinanceiro();
