const iniciarAgenda = async () => {
    // --- Elementos da UI ---
    const tabButtons = document.querySelectorAll('.aba-link');
    const tabContents = document.querySelectorAll('.aba-conteudo');
    const calendarioEl = document.getElementById('calendario');
    const listaEventosContainer = document.getElementById('lista-eventos-container');
    const btnNovoEvento = document.getElementById('btn-novo-evento');
    const modal = document.getElementById('evento-modal');
    const closeModal = modal.querySelector('.modal-close');
    const cancelModal = modal.querySelector('.modal-cancel');
    const form = document.getElementById('evento-form');
    const btnZoomIn = document.getElementById('btn-zoom-in');
    const btnZoomOut = document.getElementById('btn-zoom-out');

    // --- Elementos do Modal de Detalhes ---
    const detalhesModal = document.getElementById('detalhes-evento-modal');
    const detalhesCloseBtn = document.getElementById('detalhes-modal-close');
    const detalhesFecharBtn = document.getElementById('btn-fechar-detalhes');
    const btnEditarEvento = document.getElementById('btn-editar-evento');
    const btnExcluirEvento = document.getElementById('btn-excluir-evento');
    const btnExportarIcs = document.getElementById('btn-exportar-ics');
    const btnLembrete = document.getElementById('btn-lembrete'); // NOVO
    let currentEventId = null; // Guarda o ID do evento atualmente em visualização


    // --- Estado da Aplicação ---
    let calendar;
    let todosEventos = [];
    let todosMembros = []; // NOVO: Para guardar os membros
    const calendarAspectRatio = {
        steps: [1.35, 1.5, 1.8, 2.2, 2.5], // De mais alto para mais baixo
        current: 2, // Começa no meio (1.8)
    };

    // --- INICIALIZAÇÃO ---
    await carregarDadosIniciais();
    inicializarCalendario();
    renderizarLista();
    configurarAbas();
    configurarModal();
    configurarFormulario();
    configurarZoomCalendario();

    // Chamar a configuração do novo modal na inicialização
    configurarDetalhesModal();

    // --- FUNÇÕES DE LÓGICA ---

    async function carregarDadosIniciais() {
        const selectResponsaveis = document.getElementById('evento-responsavel');
        const selectCategorias = document.getElementById('evento-categoria');

        try {
            // CORREÇÃO: Usar o window.api para as chamadas de API
            const [eventosData, membrosData, configs] = await Promise.all([
                window.api.get('/api/eventos'),
                window.api.get('/api/membros'),
                window.api.get('/api/eventos/configs')
            ]);

            todosEventos = eventosData;
            todosMembros = membrosData; // Armazena os membros

            popularSelect(selectResponsaveis, todosMembros, 'nome', '_id', 'Nenhum membro encontrado');
            popularSelect(selectCategorias, configs.eventos_categorias.map(c => ({ name: c })), 'name', 'name', 'Nenhuma categoria encontrada');

        } catch (error) {
            console.error('Erro ao carregar dados iniciais:', error);
            alert(error.message || 'Não foi possível carregar os dados da página.');
            selectResponsaveis.innerHTML = `<option value="">Falha ao carregar</option>`;
            selectCategorias.innerHTML = `<option value="">Falha ao carregar</option>`;
            selectResponsaveis.disabled = true;
            selectCategorias.disabled = true;
        }
    }

    function inicializarCalendario() {
        calendar = new FullCalendar.Calendar(calendarioEl, {
            aspectRatio: calendarAspectRatio.steps[calendarAspectRatio.current],
            initialView: 'dayGridMonth',
            headerToolbar: {
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,listWeek'
            },
            locale: 'pt-br',
            buttonText: { today: 'Hoje', month: 'Mês', week: 'Semana', list: 'Lista' },
            dayMaxEventRows: true, // NOVO: Permite que o dia cresça para mostrar todos os eventos
            events: formatarEventosParaCalendario(todosEventos),
            eventClick: (info) => abrirDetalhesEvento(info.event.id),
            dateClick: (info) => abrirModalParaCriacao(info.dateStr),
            // NOVO: Hook para customizar a aparência do evento
            eventContent: function(arg) {
                const evento = arg.event.extendedProps;
                const isProgramacao = evento.tipo === 'Programação';
                const startTime = new Date(arg.event.start).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                let cartazHtml = '';

                if (evento.cartazUrl) {
                    cartazHtml = `<img src="${evento.cartazUrl}" class="fc-custom-preview-thumb" alt="Cartaz">`;
                }

                return {
                    html: `
                        <div class="fc-custom-preview-wrapper">
                            <span class="fc-custom-preview-type-badge ${isProgramacao ? 'programacao' : 'evento'}"></span>
                            ${cartazHtml}
                            <div class="fc-custom-preview-content">
                                <span class="fc-custom-preview-time">${startTime}</span>
                                <span class="fc-custom-preview-title">${arg.event.title}</span>
                            </div>
                        </div>
                    `
                };
            }
        });
        calendar.render();
    }

    function configurarZoomCalendario() {
        // CORREÇÃO: Lógica do zoom invertida
        btnZoomIn.addEventListener('click', () => { // Zoom In (+) torna o calendário mais ALTO
            if (calendarAspectRatio.current > 0) {
                calendarAspectRatio.current--;
                calendar.setOption('aspectRatio', calendarAspectRatio.steps[calendarAspectRatio.current]);
            }
        });
        btnZoomOut.addEventListener('click', () => { // Zoom Out (-) torna o calendário mais BAIXO
            if (calendarAspectRatio.current < calendarAspectRatio.steps.length - 1) {
                calendarAspectRatio.current++;
                calendar.setOption('aspectRatio', calendarAspectRatio.steps[calendarAspectRatio.current]);
            }
        });
    }

    function configurarFormulario() {
        // NOVO: Mostrar/esconder campos financeiros com base no tipo
        document.getElementById('evento-tipo').addEventListener('change', (e) => {
            const financialFields = document.getElementById('financial-fields');
            if (e.target.value === 'Evento') {
                financialFields.style.display = 'block';
            } else {
                financialFields.style.display = 'none';
            }
        });

        // NOVO: Lógica de Recorrência UI
        const checkboxRepetir = document.getElementById('evento-repetir');
        const recurrenceOptions = document.getElementById('recurrence-options');
        const selectPeriodo = document.getElementById('evento-periodo');
        const containerDataLimite = document.getElementById('container-data-limite');

        checkboxRepetir.addEventListener('change', (e) => {
            recurrenceOptions.style.display = e.target.checked ? 'block' : 'none';
        });

        selectPeriodo.addEventListener('change', (e) => {
            containerDataLimite.style.display = e.target.value === 'personalizado' ? 'block' : 'none';
        });

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('evento-id').value;
            const cartazInput = document.getElementById('evento-cartaz-input');
            
            // Dados Básicos
            const baseData = {
                tipo: document.getElementById('evento-tipo').value,
                nome: document.getElementById('evento-nome').value,
                categoria: document.getElementById('evento-categoria').value,
                local: document.getElementById('evento-local').value,
                responsavelId: document.getElementById('evento-responsavel').value,
                descricao: document.getElementById('evento-descricao').value,
                cor: document.getElementById('evento-cor').value,
                cartazUrl: document.getElementById('evento-cartaz-url').value,
                financeiro: JSON.stringify({
                    envolveFundos: document.getElementById('evento-envolve-fundos').checked,
                    meta: parseFloat(document.getElementById('evento-meta').value) || 0,
                    custoEstimado: parseFloat(document.getElementById('evento-custo').value) || 0,
                })
            };

            // Dados de Data/Hora (Strings ISO para cálculo)
            const dataInicioStr = document.getElementById('evento-data-inicio').value;
            const dataFimStr = document.getElementById('evento-data-fim').value;
            
            // Se tiver imagem nova, faz upload primeiro (para usar URL em todos)
            // OBS: Para simplicidade, se for lote com imagem, idealmente faria upload separado.
            // Aqui, vamos manter a lógica: se for lote, NÃO suportaremos upload de cartaz NOVO por enquanto,
            // ou teríamos que fazer upload manual antes. Para evitar complexidade extrema agora,
            // vamos alertar se tentar lote + imagem nova, ou simplesmente ignorar a imagem nova no lote secundário.
            // MELHOR: Se for lote, fazemos um upload fake/independente antes?
            // Vamos usar a lógica padrão: Se for UM evento, usa FormData normal.
            // Se for LOTE, precisamos da URL da imagem já pronta.
            
            let finalCartazUrl = baseData.cartazUrl;

            // Se for edição ou criação simples (SEM recorrência)
            if (id || !checkboxRepetir.checked) {
                const formData = new FormData();
                Object.keys(baseData).forEach(key => formData.append(key, baseData[key]));
                formData.append('dataInicio', dataInicioStr);
                formData.append('dataFim', dataFimStr);
                // Campo legado para manter compatibilidade com visualização, se quiser
                if(checkboxRepetir.checked) formData.append('recorrencia', 'Semanal'); 
                
                if (cartazInput.files[0]) {
                    formData.append('cartaz', cartazInput.files[0]);
                }

                try {
                    if (id) {
                        await window.api.put(`/api/eventos/${id}`, formData);
                    } else {
                        await window.api.post('/api/eventos', formData);
                    }
                } catch (error) {
                    console.error('Erro ao salvar evento:', error);
                    alert(`Erro ao salvar: ${error.message}`);
                    return;
                }
            } else {
                // --- LÓGICA DE CRIAÇÃO EM LOTE (RECORRÊNCIA) ---
                
                // 1. Upload da imagem se houver (precisamos da URL para replicar)
                if (cartazInput.files[0]) {
                    // Como a API de eventos espera criar o evento JUNTO com o upload,
                    // vamos criar o PRIMEIRO evento via FormData normalmente, e os outros via JSON.
                    // Isso é mais seguro.
                }

                const eventosParaCriar = [];
                const dataInicioBase = new Date(dataInicioStr);
                const dataFimBase = new Date(dataFimStr);
                const duracaoMs = dataFimBase - dataInicioBase;

                // Define a data limite
                let dataLimite = new Date();
                const periodo = selectPeriodo.value;
                if (periodo === 'mes') {
                    dataLimite = new Date(dataInicioBase.getFullYear(), dataInicioBase.getMonth() + 1, 0); // Fim do mês da data inicial
                } else if (periodo === 'ano') {
                    dataLimite = new Date(dataInicioBase.getFullYear(), 11, 31); // Fim do ano
                } else if (periodo === 'personalizado') {
                    const limiteInput = document.getElementById('evento-data-limite').value;
                    if (!limiteInput) {
                        alert('Por favor, selecione uma data limite para a repetição.');
                        return;
                    }
                    dataLimite = new Date(limiteInput);
                    // Ajusta para o final do dia para garantir inclusão
                    dataLimite.setHours(23, 59, 59);
                }

                // Loop para gerar datas (Semanal)
                let currentInicio = new Date(dataInicioBase);
                
                // Adiciona o primeiro evento (que será enviado separadamente se tiver foto, ou no lote)
                // Se tiver foto nova, criamos o primeiro via POST normal para obter a URL e depois os outros.
                // Se não tiver foto nova, vai tudo no lote.
                
                let primeiroEventoComFoto = null;
                if (cartazInput.files[0]) {
                    // Marca para criar o primeiro separado
                    const formData = new FormData();
                    Object.keys(baseData).forEach(key => formData.append(key, baseData[key]));
                    formData.append('dataInicio', dataInicioStr);
                    formData.append('dataFim', dataFimStr);
                    formData.append('recorrencia', 'Semanal');
                    formData.append('cartaz', cartazInput.files[0]);
                    
                    try {
                        const res = await window.api.post('/api/eventos', formData);
                        // Atualiza a URL do cartaz para os próximos
                        if (res && res.cartazUrl) finalCartazUrl = res.cartazUrl;
                        
                        // Avança uma semana para não duplicar o primeiro
                        currentInicio.setDate(currentInicio.getDate() + 7);
                    } catch (err) {
                        alert('Erro ao criar o evento inicial da série: ' + err.message);
                        return;
                    }
                }

                while (currentInicio <= dataLimite) {
                    const currentFim = new Date(currentInicio.getTime() + duracaoMs);
                    
                    eventosParaCriar.push({
                        ...baseData,
                        cartazUrl: finalCartazUrl, // Usa a URL (existente ou do upload recém feito)
                        financeiro: JSON.parse(baseData.financeiro), // Precisa ser obj, não string
                        dataInicio: currentInicio.toISOString(),
                        dataFim: currentFim.toISOString(),
                        recorrencia: 'Semanal',
                        tenantId: undefined // Será posto pelo backend
                    });

                    // Avança 7 dias
                    currentInicio.setDate(currentInicio.getDate() + 7);
                }

                if (eventosParaCriar.length > 0) {
                    try {
                        await window.api.post('/api/eventos/lote', eventosParaCriar);
                    } catch (error) {
                        console.error('Erro ao criar lote:', error);
                        alert(`Erro ao criar recorrências: ${error.message}`);
                        return;
                    }
                }
            }

            modal.classList.remove('active');
            await carregarDadosIniciais();
            calendar.removeAllEvents();
            calendar.addEventSource(formatarEventosParaCalendario(todosEventos));
            renderizarLista();
        });
    }

    // --- Funções de UI (sem alterações, exceto renderizarLista) ---

    function renderizarLista() {
        listaEventosContainer.innerHTML = '';
        if (todosEventos.length === 0) {
            listaEventosContainer.innerHTML = '<p>Nenhum evento ou programação encontrado.</p>';
            return;
        }
        todosEventos.forEach(evento => {
            const tipo = evento.tipo || 'Evento'; // CORREÇÃO: Garante que tipo nunca seja undefined
            const card = document.createElement('div');
            card.className = 'evento-card';
            card.innerHTML = `
                <div class="card-header"><h4>${evento.nome} <span class="badge ${tipo.toLowerCase()}">${tipo}</span></h4></div>
                <div class="card-body">
                    <p><i class='bx bx-calendar'></i> ${new Date(evento.dataInicio).toLocaleString('pt-BR', {dateStyle: 'short', timeStyle: 'short'})}</p>
                    <p><i class='bx bx-map'></i> ${evento.local}</p>
                    ${evento.recorrencia ? `<p><i class='bx bx-sync'></i> ${evento.recorrencia}</p>` : ''}
                </div>
                <div class="card-footer"><button class="btn btn-principal btn-editar" data-id="${evento._id}">Ver Detalhes</button></div>
            `;
            listaEventosContainer.appendChild(card);
        });
        document.querySelectorAll('.btn-editar').forEach(btn => {
            btn.addEventListener('click', (e) => abrirModalParaEdicao(e.currentTarget.dataset.id));
        });
    }

    function configurarAbas() {
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                tabButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                const targetId = `view-${button.id.split('-')[1]}`;
                tabContents.forEach(content => {
                    content.classList.remove('active');
                    if (content.id === targetId) content.classList.add('active');
                });
            });
        });
    }

    function configurarModal() {
        btnNovoEvento.addEventListener('click', () => abrirModalParaCriacao());
        closeModal.addEventListener('click', () => modal.classList.remove('active'));
        cancelModal.addEventListener('click', () => modal.classList.remove('active'));
        window.addEventListener('click', (e) => {
            if (e.target === modal) modal.classList.remove('active');
        });
    }

        function abrirModalParaCriacao(dateStr = null) {

            form.reset();

            document.getElementById('evento-id').value = '';

            document.getElementById('modal-title').textContent = 'Nova Programação / Evento';

            document.getElementById('cartaz-preview').style.display = 'none';

            // NOVO: Esconder campos financeiros por padrão

            document.getElementById('financial-fields').style.display = 'none';

            document.getElementById('evento-tipo').value = 'Programação'; // Padrão para Programação

    

            if (dateStr) {

                document.getElementById('evento-data-inicio').value = `${dateStr}T19:00`;

                document.getElementById('evento-data-fim').value = `${dateStr}T21:00`;

            }

            modal.classList.add('active');

        }

    

        function abrirModalParaEdicao(id) {

            const evento = todosEventos.find(e => e._id === id);

            if (!evento) return;

    

            form.reset(); // Limpa o formulário antes de preencher

            document.getElementById('evento-id').value = evento._id;

            document.getElementById('modal-title').textContent = 'Editar Programação / Evento';

            document.getElementById('evento-tipo').value = evento.tipo || 'Evento';

            document.getElementById('evento-nome').value = evento.nome;

            document.getElementById('evento-categoria').value = evento.categoria;

            document.getElementById('evento-recorrencia').value = evento.recorrencia || '';

            document.getElementById('evento-data-inicio').value = new Date(evento.dataInicio).toISOString().substring(0, 16);

            document.getElementById('evento-data-fim').value = new Date(evento.dataFim).toISOString().substring(0, 16);

            document.getElementById('evento-local').value = evento.local;

                        document.getElementById('evento-responsavel').value = evento.responsavelId;

                        document.getElementById('evento-descricao').value = evento.descricao || '';

                        document.getElementById('evento-cor').value = evento.cor || (evento.tipo === 'Evento' ? '#e36e00' : '#3a86ff'); // NOVO

                        

            

            const cartazUrlInput = document.getElementById('evento-cartaz-url');

            const cartazPreview = document.getElementById('cartaz-preview');

            cartazUrlInput.value = evento.cartazUrl || '';

            if (evento.cartazUrl) {

                cartazPreview.src = evento.cartazUrl;

                cartazPreview.style.display = 'block';

            } else {

                cartazPreview.style.display = 'none';

            }

    

            // NOVO: Lógica para campos financeiros

            const financialFields = document.getElementById('financial-fields');

            if (evento.tipo === 'Evento') {

                financialFields.style.display = 'block';

                if (evento.financeiro) {

                    document.getElementById('evento-envolve-fundos').checked = evento.financeiro.envolveFundos;

                    document.getElementById('evento-meta').value = evento.financeiro.meta || 0;

                    document.getElementById('evento-custo').value = evento.financeiro.custoEstimado || 0;

                }

            } else {

                financialFields.style.display = 'none';

            }

    

            modal.classList.add('active');

        }

    function popularSelect(selectEl, items, textProp, valueProp, emptyMessage) {
        selectEl.innerHTML = '';
        selectEl.disabled = false;
        if (!items || items.length === 0) {
            selectEl.innerHTML = `<option value="">${emptyMessage}</option>`;
            selectEl.disabled = true;
            return;
        }
        selectEl.innerHTML = '<option value="">Selecione...</option>';
        items.forEach(item => {
            const option = document.createElement('option');
            option.textContent = item[textProp];
            option.value = item[valueProp];
            selectEl.appendChild(option);
        });
    }

    function formatarEventosParaCalendario(eventos) {
        return eventos.map(evento => {
            const tipo = evento.tipo || 'Evento';
            const corPadrao = tipo === 'Programação' ? '#3a86ff' : '#e36e00';
            const corEvento = evento.cor || corPadrao;

            // Lógica para garantir bom contraste no texto do evento
            const corTexto = isColorLight(corEvento) ? '#212529' : '#ffffff';

            return {
                id: evento._id,
                title: evento.nome,
                start: evento.dataInicio,
                end: evento.dataFim,
                color: corEvento,
                borderColor: corEvento, // Borda da mesma cor
                textColor: corTexto, // Define a cor do texto
                extendedProps: evento
            }
        });
    }

    // --- FUNÇÃO UTILITÁRIA PARA CONTRASTE DE COR ---
    function isColorLight(hexColor) {
        if (!hexColor.startsWith('#')) return true; // Retorna true se não for um hex

        const hex = hexColor.replace('#', '');
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        // Fórmula de luminosidade YIQ
        const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
        return yiq >= 150; // Cores com luminosidade >= 150 são consideradas claras
    }

    // --- FUNÇÕES DO MODAL DE DETALHES ---

    function abrirDetalhesEvento(id) {
        currentEventId = id;
        const evento = todosEventos.find(e => e._id === id);
        if (!evento) return;

        // Preenche o título e o cartaz
        document.getElementById('detalhes-modal-title').textContent = evento.nome;
        const cartazImg = document.getElementById('detalhes-cartaz-img');
        const cartazContainer = document.getElementById('detalhes-cartaz-container');
        if (evento.cartazUrl) {
            cartazImg.src = evento.cartazUrl;
            cartazContainer.style.display = 'block';
        } else {
            cartazContainer.style.display = 'none';
        }

        // Preenche as informações
        const dataInicio = new Date(evento.dataInicio);
        const dataFim = new Date(evento.dataFim);
        const formatoData = { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' };
        document.getElementById('detalhes-data').textContent = `${dataInicio.toLocaleDateString('pt-BR', formatoData)} - ${dataFim.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
        document.getElementById('detalhes-local').textContent = evento.local;
        
        // Busca e exibe o nome do responsável
        const responsavel = todosMembros.find(m => m._id === evento.responsavelId);
        const responsavelEl = document.getElementById('detalhes-responsavel');
        if (responsavel) {
            responsavelEl.innerHTML = `<a href="/pages/lista.membros/detalhes_membro.html?id=${responsavel._id}" target="_blank">${responsavel.nome}</a>`;
        } else {
            responsavelEl.textContent = 'Não informado';
        }

        document.getElementById('detalhes-categoria').textContent = evento.categoria;
        document.getElementById('detalhes-descricao').textContent = evento.descricao || 'Nenhuma descrição fornecida.';

        // Recorrência
        const recorrenciaP = document.getElementById('detalhes-recorrencia-p');
        if (evento.recorrencia) {
            document.getElementById('detalhes-recorrencia').textContent = evento.recorrencia;
            recorrenciaP.style.display = 'block';
        } else {
            recorrenciaP.style.display = 'none';
        }

        // Detalhes Financeiros
        const financeiroContainer = document.getElementById('detalhes-financeiro-container');
        if (evento.tipo === 'Evento' && evento.financeiro && evento.financeiro.envolveFundos) {
            document.getElementById('detalhes-meta').textContent = `R$ ${evento.financeiro.meta.toFixed(2)}`;
            document.getElementById('detalhes-custo').textContent = `R$ ${evento.financeiro.custoEstimado.toFixed(2)}`;
            financeiroContainer.style.display = 'block';
        } else {
            financeiroContainer.style.display = 'none';
        }

        detalhesModal.classList.add('active');
    }

    function configurarDetalhesModal() {
        detalhesCloseBtn.addEventListener('click', () => detalhesModal.classList.remove('active'));
        detalhesFecharBtn.addEventListener('click', () => detalhesModal.classList.remove('active'));

        btnEditarEvento.addEventListener('click', () => {
            detalhesModal.classList.remove('active');
            abrirModalParaEdicao(currentEventId);
        });

        btnExcluirEvento.addEventListener('click', async () => {
            if (!currentEventId) return;

            const confirmou = confirm('Tem certeza que deseja excluir este evento? Esta ação não pode ser desfeita.');
            if (confirmou) {
                try {
                    await window.api.delete(`/api/eventos/${currentEventId}`);
                    detalhesModal.classList.remove('active');
                    await carregarDadosIniciais(); // Recarrega tudo
                    calendar.removeAllEvents();
                    calendar.addEventSource(formatarEventosParaCalendario(todosEventos));
                    renderizarLista();
                } catch (error) {
                    console.error('Erro ao excluir evento:', error);
                    alert(`Não foi possível excluir o evento. ${error.message}`);
                }
            }
        });

        btnExportarIcs.addEventListener('click', () => {
            if (!currentEventId) return;
            const evento = todosEventos.find(e => e._id === currentEventId);
            if (!evento) return;

            const icsContent = gerarIcs(evento);
            const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
            const url = URL.createObjectURL(blob);

            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${evento.nome.replace(/[^a-z0-9]/gi, '_')}.ics`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });

        btnLembrete.addEventListener('click', () => {
            if (!currentEventId) return;
            if (window.criarLembreteEvento) {
                window.criarLembreteEvento(currentEventId);
            } else {
                alert('O sistema de notificações não está pronto.');
            }
        });

        // NOVO E MELHORADO: Lógica para cartaz em tela cheia
        const cartazImg = document.getElementById('detalhes-cartaz-img');
        const fullscreenContainer = document.getElementById('fullscreen-container');
        const fullscreenImage = document.getElementById('fullscreen-image');
        const fullscreenClose = document.querySelector('.fullscreen-close');

        cartazImg.addEventListener('click', () => {
            if (!cartazImg.src || cartazImg.src.endsWith('placeholder-image.png')) return;
            fullscreenImage.src = cartazImg.src;
            fullscreenContainer.classList.add('active');
        });

        const fecharFullscreen = () => {
            fullscreenContainer.classList.remove('active');
        };

        fullscreenContainer.addEventListener('click', fecharFullscreen);
        fullscreenClose.addEventListener('click', fecharFullscreen);
    }

    function gerarIcs(evento) {
        // Formata a data para o padrão UTC (YYYYMMDDTHHMMSSZ)
        const toUtcString = (date) => {
            return new Date(date).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        };

        const icsData = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//SistemaIgreja//Agenda//PT',
            'BEGIN:VEVENT',
            `UID:${evento._id}@sistemaigreja.com`,
            `DTSTAMP:${toUtcString(new Date())}`,
            `DTSTART:${toUtcString(evento.dataInicio)}`,
            `DTEND:${toUtcString(evento.dataFim)}`,
            `SUMMARY:${evento.nome}`,
            `DESCRIPTION:${evento.descricao || ''}`,
            `LOCATION:${evento.local || ''}`,
            'END:VEVENT',
            'END:VCALENDAR'
        ].join('\r\n');

        return icsData;
    }

    // Chamar a configuração do novo modal na inicialização
    configurarDetalhesModal();

};

document.addEventListener('DOMContentLoaded', iniciarAgenda);
document.body.addEventListener('htmx:afterSwap', iniciarAgenda);
if (document.readyState !== 'loading') iniciarAgenda();