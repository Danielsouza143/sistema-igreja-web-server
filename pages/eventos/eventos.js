document.addEventListener('DOMContentLoaded', () => {
    // --- ESTADO GLOBAL ---
    let eventos = [];
    let membros = [];
    let configsGerais = { eventos_categorias: [] };
    let eventoAtivoId = null;
    let eventoEmEdicaoId = null;
    let filtroAtivo = 'todos';

    // --- SELETORES DO DOM ---
    const painelView = document.getElementById('painel-view');
    const detalhesView = document.getElementById('detalhes-evento-view');
    const eventosGrid = document.getElementById('eventos-grid');
    const filtrosContainer = document.querySelector('.filtros-eventos');
    const formNovoEvento = document.getElementById('form-novo-evento');
    const formTransacao = document.getElementById('form-transacao');
    const formTarefa = document.getElementById('form-tarefa');
    const modais = {
        novoEvento: document.getElementById('modal-novo-evento'),
        transacao: document.getElementById('modal-transacao'),
        tarefa: document.getElementById('modal-tarefa')
    };

    // --- FUNÇÕES AUXILIARES ---
    const formatarData = (dataStr) => new Date(dataStr).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
    const formatarDinheiro = (valor) => (valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const fecharModais = () => {
    Object.values(modais).forEach(m => m.style.display = 'none');
};


    // --- LÓGICA DE NAVEGAÇÃO ---
    const mostrarPainel = () => {
        painelView.style.display = 'block';
        detalhesView.style.display = 'none';
        eventoAtivoId = null;
        renderizarPainelEventos();
    };
    const mostrarDetalhes = (eventoId) => {
        eventoAtivoId = eventoId;
        painelView.style.display = 'none';
        detalhesView.style.display = 'block';
        renderizarPaginaDetalhes();
    };

    // --- RENDERIZAÇÃO DO PAINEL PRINCIPAL ---
    const determinarStatus = (evento) => {
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        const dataInicio = new Date(evento.dataInicio);
        const dataFim = new Date(evento.dataFim);
        if (hoje > dataFim) return 'concluido';
        if (hoje >= dataInicio && hoje <= dataFim) return 'andamento';
        return 'proximo';
    };
    const statusInfo = { 'proximo': { texto: 'Próximo', classe: 'status-proximo' }, 'andamento': { texto: 'Em Andamento', classe: 'status-andamento' }, 'concluido': { texto: 'Concluído', classe: 'status-concluido' } };
    
    const renderizarPainelEventos = () => {
        eventosGrid.innerHTML = '';
        const eventosFiltrados = eventos.filter(evento => {
            if (filtroAtivo === 'todos') return true;
            const status = determinarStatus(evento);
            return (filtroAtivo === 'proximos' && status === 'proximo') || (filtroAtivo === 'andamento' && status === 'andamento') || (filtroAtivo === 'concluidos' && status === 'concluido');
        });
        if (eventosFiltrados.length === 0) {
            eventosGrid.innerHTML = `<h3 style="grid-column: 1 / -1; text-align: center; color: #888;">Nenhum evento para o filtro "${filtroAtivo}".</h3>`;
            return;
        }
        eventosFiltrados.forEach(evento => {
            const statusKey = determinarStatus(evento);
            const status = statusInfo[statusKey];
            let progressoHtml = '';
            if (evento.financeiro.envolveFundos) {
                const arrecadado = evento.financeiro.entradas.reduce((acc, curr) => acc + curr.valor, 0);
                const meta = evento.financeiro.meta || 1;
                const percentual = Math.min((arrecadado / meta) * 100, 100).toFixed(0);
                progressoHtml = `<div class="progresso-financeiro"><div class="progresso-texto"><span>${formatarDinheiro(arrecadado)} / ${formatarDinheiro(meta)}</span><span>${percentual}%</span></div><div class="progresso-barra-fundo"><div class="progresso-barra" style="width: ${percentual}%;"></div></div></div>`;
            }
            const card = document.createElement('div');
            card.className = 'evento-card';
            card.dataset.id = evento._id;
            card.innerHTML = `<div class="card-header"><h3>${evento.nome}</h3><span class="status-badge ${status.classe}">${status.texto}</span></div><div class="card-body"><p class="card-categoria">${evento.categoria}</p><p class="card-datas"><i class='bx bx-calendar'></i> ${formatarData(evento.dataInicio)} - ${formatarData(evento.dataFim)}</p>${progressoHtml}</div>`;
            card.addEventListener('click', () => mostrarDetalhes(evento._id));
            eventosGrid.appendChild(card);
        });
    };
    
    // --- RENDERIZAÇÃO DA PÁGINA DE DETALHES ---
    const renderizarPaginaDetalhes = () => {
        const evento = eventos.find(e => e._id === eventoAtivoId);
        if (!evento) {
            alert('Evento não encontrado!');
            mostrarPainel();
            return;
        }
        document.getElementById('detalhes-evento-nome').textContent = evento.nome;
        renderizarAbaResumo(evento);
        renderizarAbaFinanceiro(evento);
        renderizarAbaTarefas(evento);
        detalhesView.querySelectorAll('.aba-link').forEach(item => item.classList.remove('active'));
        detalhesView.querySelectorAll('.aba-conteudo').forEach(item => item.classList.remove('active'));
        detalhesView.querySelector('.aba-link[data-aba="resumo"]').classList.add('active');
        detalhesView.querySelector('#aba-resumo').classList.add('active');
    };

    const renderizarAbaResumo = (evento) => {
        const responsavel = membros.find(m => m._id === evento.responsavelId);
        document.getElementById('detalhes-datas').textContent = `${formatarData(evento.dataInicio)} até ${formatarData(evento.dataFim)}`;
        document.getElementById('detalhes-local').textContent = evento.local;
        document.getElementById('detalhes-responsavel').textContent = responsavel ? responsavel.nome : 'Não definido';
        document.getElementById('detalhes-descricao').textContent = evento.descricao || 'Nenhuma descrição.';
        let progressoFinanceiroHTML = '<p>Este evento não possui controle financeiro.</p>';
        if (evento.financeiro.envolveFundos) {
            const arrecadado = evento.financeiro.entradas.reduce((acc, curr) => acc + curr.valor, 0);
            const meta = evento.financeiro.meta || 1;
            const percentual = Math.min((arrecadado / meta) * 100, 100).toFixed(0);
            progressoFinanceiroHTML = `<div class="progresso-financeiro"><label>Progresso da Meta Financeira</label><div class="progresso-texto"><span>${formatarDinheiro(arrecadado)} / ${formatarDinheiro(meta)}</span><span>${percentual}%</span></div><div class="progresso-barra-fundo"><div class="progresso-barra" style="width: ${percentual}%;"></div></div></div>`;
        }
        document.getElementById('detalhes-progresso-financeiro').innerHTML = progressoFinanceiroHTML;
        const totalTarefas = evento.tarefas.length;
        const tarefasConcluidas = evento.tarefas.filter(t => t.concluida).length;
        const percentualTarefas = totalTarefas > 0 ? ((tarefasConcluidas / totalTarefas) * 100).toFixed(0) : 0;
        document.getElementById('detalhes-progresso-tarefas').innerHTML = `<div class="progresso-financeiro"><label>Progresso das Tarefas</label><div class="progresso-texto"><span>${tarefasConcluidas} de ${totalTarefas} concluídas</span><span>${percentualTarefas}%</span></div><div class="progresso-barra-fundo"><div class="progresso-barra" style="width: ${percentualTarefas}%; background-color: var(--cor-secundaria);"></div></div></div>`;
    };

    const renderizarAbaFinanceiro = (evento) => {
        const arrecadado = evento.financeiro.entradas.reduce((acc, curr) => acc + curr.valor, 0);
        const despesas = evento.financeiro.saidas.reduce((acc, curr) => acc + curr.valor, 0);
        document.getElementById('financeiro-arrecadado').textContent = formatarDinheiro(arrecadado);
        document.getElementById('financeiro-despesas').textContent = formatarDinheiro(despesas);
        document.getElementById('financeiro-saldo').textContent = formatarDinheiro(arrecadado - despesas);
        const tabelaEntradas = document.getElementById('tabela-entradas');
        tabelaEntradas.innerHTML = '';
        evento.financeiro.entradas.forEach(t => { tabelaEntradas.innerHTML += `<tr><td>${t.descricao}</td><td>${formatarDinheiro(t.valor)}</td><td>${formatarData(t.data)}</td><td class="acoes-item"><i class='bx bxs-trash' data-id="${t._id}" data-tipo="entradas"></i></td></tr>`; });
        const tabelaSaidas = document.getElementById('tabela-saidas');
        tabelaSaidas.innerHTML = '';
        evento.financeiro.saidas.forEach(t => { tabelaSaidas.innerHTML += `<tr><td>${t.descricao}</td><td>${formatarDinheiro(t.valor)}</td><td>${formatarData(t.data)}</td><td class="acoes-item"><i class='bx bxs-trash' data-id="${t._id}" data-tipo="saidas"></i></td></tr>`; });
    };

    const renderizarAbaTarefas = (evento) => {
        const tabelaTarefas = document.getElementById('tabela-tarefas');
        tabelaTarefas.innerHTML = '';
        evento.tarefas.forEach(t => {
            const responsavel = membros.find(m => m._id === t.responsavelId);
            const tr = document.createElement('tr');
            tr.className = t.concluida ? 'tarefa-concluida' : '';
            tr.innerHTML = `<td><i class='bx ${t.concluida ? 'bxs-check-square' : 'bx-square'}' data-id="${t._id}"></i></td><td>${t.descricao}</td><td>${responsavel ? responsavel.nome : 'N/A'}</td><td>${t.prazo ? formatarData(t.prazo) : 'Sem prazo'}</td><td class="acoes-item"><i class='bx bxs-trash' data-id="${t._id}"></i></td>`;
            tabelaTarefas.appendChild(tr);
        });
    };

    // --- MANIPULAÇÃO DE DADOS COM API ---
    const abrirModalEvento = (evento = null) => {
        formNovoEvento.reset();
        document.getElementById('evento-categoria').innerHTML = configsGerais.eventos_categorias.map(c => `<option value="${c}">${c}</option>`).join('');
        document.getElementById('evento-responsavel').innerHTML = membros.map(m => `<option value="${m._id}">${m.nome}</option>`).join('');
        if (evento) {
            eventoEmEdicaoId = evento._id;
            document.getElementById('modal-evento-titulo').textContent = 'Editar Evento';
            document.getElementById('evento-nome').value = evento.nome; document.getElementById('evento-categoria').value = evento.categoria; document.getElementById('evento-data-inicio').value = new Date(evento.dataInicio).toISOString().split('T')[0]; document.getElementById('evento-data-fim').value = new Date(evento.dataFim).toISOString().split('T')[0]; document.getElementById('evento-local').value = evento.local; document.getElementById('evento-responsavel').value = evento.responsavelId; document.getElementById('evento-descricao').value = evento.descricao;
            const checkFundos = document.getElementById('envolve-fundos'); const camposFinanceiros = document.getElementById('campos-financeiros'); checkFundos.checked = evento.financeiro.envolveFundos;
            if (checkFundos.checked) { camposFinanceiros.style.display = 'block'; document.getElementById('meta-arrecadacao').value = evento.financeiro.meta; document.getElementById('custo-estimado').value = evento.financeiro.custoEstimado; } else { camposFinanceiros.style.display = 'none'; }
        } else {
            eventoEmEdicaoId = null;
            document.getElementById('modal-evento-titulo').textContent = 'Cadastrar Novo Evento';
            document.getElementById('campos-financeiros').style.display = 'none';
        }
        modais.novoEvento.style.display = 'flex';
    };

    const salvarEvento = async (e) => {
        e.preventDefault();
        const dadosEvento = { nome: document.getElementById('evento-nome').value, categoria: document.getElementById('evento-categoria').value, dataInicio: document.getElementById('evento-data-inicio').value, dataFim: document.getElementById('evento-data-fim').value, local: document.getElementById('evento-local').value, responsavelId: document.getElementById('evento-responsavel').value, descricao: document.getElementById('evento-descricao').value, financeiro: { envolveFundos: document.getElementById('envolve-fundos').checked, meta: parseFloat(document.getElementById('meta-arrecadacao').value) || 0, custoEstimado: parseFloat(document.getElementById('custo-estimado').value) || 0 } };
        const metodo = eventoEmEdicaoId ? 'PUT' : 'POST';
        const url = eventoEmEdicaoId ? `/api/eventos/${eventoEmEdicaoId}` : `/api/eventos`;
        try {
            const response = await window.api.request(url, metodo, dadosEvento);
            await carregarDadosIniciais();
            fecharModais();
            const eventoSalvo = await response.json();
            mostrarDetalhes(eventoSalvo._id);
            eventoEmEdicaoId = null;
        } catch (error) { console.error(error); alert('Falha ao salvar evento.'); }
    };
    
    const salvarTransacao = async (e) => {
        e.preventDefault();
        const dados = { tipo: document.getElementById('transacao-tipo').value, descricao: document.getElementById('transacao-descricao').value, valor: parseFloat(document.getElementById('transacao-valor').value), data: document.getElementById('transacao-data').value };
        try {
            const eventoAtualizado = await window.api.post(`/api/eventos/${eventoAtivoId}/transacoes`, dados);
            const index = eventos.findIndex(ev => ev._id === eventoAtivoId);
            if (index !== -1) eventos[index] = eventoAtualizado;
            renderizarPaginaDetalhes();
            fecharModais();
        } catch (error) { console.error(error); alert('Falha ao salvar transação.'); }
    };

    const salvarTarefa = async (e) => {
        e.preventDefault();
        const dados = { descricao: document.getElementById('tarefa-descricao').value, responsavelId: document.getElementById('tarefa-responsavel').value, prazo: document.getElementById('tarefa-prazo').value };
        try {
            const eventoAtualizado = await window.api.post(`/api/eventos/${eventoAtivoId}/tarefas`, dados);
            const index = eventos.findIndex(ev => ev._id === eventoAtivoId);
            if (index !== -1) eventos[index] = eventoAtualizado;
            renderizarPaginaDetalhes();
            fecharModais();
        } catch (error) { console.error(error); alert('Falha ao salvar tarefa.'); }
    };

    // --- INICIALIZAÇÃO E EVENT LISTENERS ---
    async function carregarDadosIniciais() {
        try {
            const [eventosRes, membrosRes, configsRes] = await Promise.all([
                window.api.get('/api/eventos'),
                window.api.get('/api/membros'),
                window.api.get('/api/eventos/configs')
            ]);
            [eventos, membros, configsGerais] = [eventosRes, membrosRes, configsRes];
            mostrarPainel();
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
            document.querySelector('.conteudo').innerHTML = '<h1>Erro de conexão com o servidor. Verifique se ele está rodando.</h1>';
        }
    }
    
    function setupEventListeners() {
        detalhesView.addEventListener('click', async (e) => {
            const evento = eventos.find(ev => ev._id === eventoAtivoId);
            if (!evento) return;
            if (e.target.matches('.bx-square, .bxs-check-square')) {
                const tarefaId = e.target.dataset.id;
                const tarefa = evento.tarefas.find(t => t._id === tarefaId);
                if(tarefa) {
                    const novoStatus = { concluida: !tarefa.concluida };
                    const eventoAtualizado = await window.api.put(`/api/eventos/${eventoAtivoId}/tarefas/${tarefaId}`, novoStatus);
                    eventos[eventos.findIndex(ev => ev._id === eventoAtivoId)] = eventoAtualizado;
                    renderizarPaginaDetalhes();
                }
            }
            if (e.target.matches('.bxs-trash')) {
                if (!confirm('Tem certeza que deseja excluir este item?')) return;
                const id = e.target.dataset.id;
                const tipo = e.target.dataset.tipo;
                let url = tipo 
                    ? `/api/eventos/${eventoAtivoId}/transacoes/${id}`
                    : `/api/eventos/${eventoAtivoId}/tarefas/${id}`;
                const eventoAtualizado = await window.api.delete(url);
                eventos[eventos.findIndex(ev => ev._id === eventoAtivoId)] = eventoAtualizado;
                renderizarPaginaDetalhes();
            }
        });
        document.getElementById('btn-novo-evento').addEventListener('click', () => abrirModalEvento(null));
        document.getElementById('btn-editar-evento').addEventListener('click', () => { const evento = eventos.find(e => e._id === eventoAtivoId); abrirModalEvento(evento); });
        document.getElementById('btn-voltar-painel').addEventListener('click', mostrarPainel);
        formNovoEvento.addEventListener('submit', salvarEvento);
        filtrosContainer.addEventListener('click', (e) => { if (e.target.classList.contains('filtro-btn')) { filtrosContainer.querySelector('.active').classList.remove('active'); e.target.classList.add('active'); filtroAtivo = e.target.dataset.filtro; renderizarPainelEventos(); } });
        document.querySelectorAll('[data-close]').forEach(btn =>
    btn.addEventListener('click', fecharModais)
);

        document.getElementById('envolve-fundos').addEventListener('change', (e) => { document.getElementById('campos-financeiros').style.display = e.target.checked ? 'block' : 'none'; });
        detalhesView.querySelectorAll('.aba-link').forEach(aba => { aba.addEventListener('click', () => { detalhesView.querySelectorAll('.aba-link').forEach(item => item.classList.remove('active')); detalhesView.querySelectorAll('.aba-conteudo').forEach(item => item.classList.remove('active')); aba.classList.add('active'); detalhesView.querySelector(`#aba-${aba.dataset.aba}`).classList.add('active'); }); });
        document.getElementById('btn-nova-entrada').addEventListener('click', () => { formTransacao.reset(); document.getElementById('modal-transacao-titulo').textContent = 'Adicionar Entrada'; document.getElementById('transacao-tipo').value = 'entradas'; document.getElementById('transacao-data').valueAsDate = new Date(); modais.transacao.style.display = 'flex'; });
        document.getElementById('btn-nova-saida').addEventListener('click', () => { formTransacao.reset(); document.getElementById('modal-transacao-titulo').textContent = 'Adicionar Despesa'; document.getElementById('transacao-tipo').value = 'saidas'; document.getElementById('transacao-data').valueAsDate = new Date(); modais.transacao.style.display = 'flex'; });
        document.getElementById('btn-nova-tarefa').addEventListener('click', () => { formTarefa.reset(); document.getElementById('tarefa-responsavel').innerHTML = membros.map(m => `<option value="${m._id}">${m.nome}</option>`).join(''); modais.tarefa.style.display = 'flex'; });
        formTransacao.addEventListener('submit', salvarTransacao);
        formTarefa.addEventListener('submit', salvarTarefa);
    }

    setupEventListeners();
    carregarDadosIniciais();
});