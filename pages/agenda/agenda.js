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

    // --- Elementos do Modal de Detalhes Premium ---
    const detalhesModal = document.getElementById('detalhes-evento-modal');
    const detalhesCloseBtn = document.getElementById('detalhes-modal-close');
    const btnEditarEvento = document.getElementById('btn-editar-evento');
    const btnExcluirEvento = document.getElementById('btn-excluir-evento');
    const btnExportarIcs = document.getElementById('btn-exportar-ics');
    let currentEventId = null; 

    // --- Estado da Aplicação ---
    let calendar;
    let todosEventos = [];
    let todosMembros = []; 

    // --- INICIALIZAÇÃO ---
    await carregarDadosIniciais();
    inicializarCalendario();
    renderizarLista();
    configurarAbas();
    configurarModal();
    configurarFormulario();
    configurarDetalhesModal();

    // --- FUNÇÕES DE LÓGICA ---

    async function carregarDadosIniciais() {
        const selectResponsaveis = document.getElementById('evento-responsavel');
        const selectCategorias = document.getElementById('evento-categoria');

        try {
            const [eventosData, membrosData, configs] = await Promise.all([
                window.api.get('/api/eventos'),
                window.api.get('/api/membros'),
                window.api.get('/api/eventos/configs')
            ]);

            todosEventos = eventosData;
            todosMembros = membrosData; 

            popularSelect(selectResponsaveis, todosMembros, 'nome', '_id', 'Nenhum membro encontrado');
            popularSelect(selectCategorias, configs.eventos_categorias.map(c => ({ name: c })), 'name', 'name', 'Nenhuma categoria');

        } catch (error) {
            console.error('Erro ao carregar dados:', error);
            alert('Não foi possível carregar os dados. Verifique a conexão.');
        }
    }

    function inicializarCalendario() {
        // Inicializa o FullCalendar com o idioma Português ativado pelo script externo
        calendar = new FullCalendar.Calendar(calendarioEl, {
            locale: 'pt-br',
            initialView: 'dayGridMonth',
            contentHeight: 'auto', // Ajusta a altura automaticamente ao container
            headerToolbar: {
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,listMonth' // Usando lista mensal (melhor que semanal)
            },
            buttonText: { 
                today: 'Hoje', 
                month: 'Mês', 
                week: 'Semana', 
                list: 'Lista' 
            },
            dayMaxEventRows: 4, // Mostra até 4 eventos antes de "Ver Mais"
            events: formatarEventosParaCalendario(todosEventos),
            eventClick: (info) => abrirDetalhesEvento(info.event.id),
            dateClick: (info) => abrirModalParaCriacao(info.dateStr),
            
            // CUSTOMIZAÇÃO PREMIUM DOS EVENTOS NO CALENDÁRIO
            eventContent: function(arg) {
                const evento = arg.event.extendedProps;
                const isProgramacao = evento.tipo === 'Programação';
                
                // Formata a hora sem os segundos
                const dataObj = arg.event.start;
                const startTime = dataObj ? dataObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';
                
                let thumbHtml = '';
                if (evento.cartazUrl) {
                    thumbHtml = `<img src="${evento.cartazUrl}" class="custom-event-thumb" alt="Thumb">`;
                }

                return {
                    html: `
                        <div class="custom-event-chip" style="background-color: ${arg.event.backgroundColor}; color: ${arg.event.textColor};">
                            ${thumbHtml}
                            <div class="custom-event-info">
                                <span class="custom-event-title">${arg.event.title}</span>
                                ${startTime ? `<span class="custom-event-time">${startTime}</span>` : ''}
                            </div>
                        </div>
                    `
                };
            }
        });
        calendar.render();
    }

    function configurarFormulario() {
        // Mostra/Esconde campos financeiros
        document.getElementById('evento-tipo').addEventListener('change', (e) => {
            const financialFields = document.getElementById('financial-fields');
            financialFields.style.display = e.target.value === 'Evento' ? 'block' : 'none';
        });

        // Lógica de Recorrência
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

            const dataInicioStr = document.getElementById('evento-data-inicio').value;
            const dataFimStr = document.getElementById('evento-data-fim').value;
            
            let finalCartazUrl = baseData.cartazUrl;

            // Se for edição ou criação simples (SEM recorrência)
            if (id || !checkboxRepetir.checked) {
                const formData = new FormData();
                Object.keys(baseData).forEach(key => formData.append(key, baseData[key]));
                formData.append('dataInicio', dataInicioStr);
                formData.append('dataFim', dataFimStr);
                if(checkboxRepetir.checked) formData.append('recorrencia', 'Semanal'); 
                
                if (cartazInput.files[0]) {
                    formData.append('cartaz', cartazInput.files[0]);
                }

                try {
                    if (id) await window.api.put(`/api/eventos/${id}`, formData);
                    else await window.api.post('/api/eventos', formData);
                } catch (error) {
                    alert(`Erro ao salvar: ${error.message}`);
                    return;
                }
            } else {
                // Criação em Lote (Recorrência)
                const eventosParaCriar = [];
                const dataInicioBase = new Date(dataInicioStr);
                const dataFimBase = new Date(dataFimStr);
                const duracaoMs = dataFimBase - dataInicioBase;

                let dataLimite = new Date();
                const periodo = selectPeriodo.value;
                if (periodo === 'mes') {
                    dataLimite = new Date(dataInicioBase.getFullYear(), dataInicioBase.getMonth() + 1, 0); 
                } else if (periodo === 'ano') {
                    dataLimite = new Date(dataInicioBase.getFullYear(), 11, 31); 
                } else if (periodo === 'personalizado') {
                    const limiteInput = document.getElementById('evento-data-limite').value;
                    if (!limiteInput) return alert('Selecione uma data limite.');
                    dataLimite = new Date(limiteInput);
                    dataLimite.setHours(23, 59, 59);
                }

                let currentInicio = new Date(dataInicioBase);
                
                if (cartazInput.files[0]) {
                    const formData = new FormData();
                    Object.keys(baseData).forEach(key => formData.append(key, baseData[key]));
                    formData.append('dataInicio', dataInicioStr);
                    formData.append('dataFim', dataFimStr);
                    formData.append('recorrencia', 'Semanal');
                    formData.append('cartaz', cartazInput.files[0]);
                    
                    try {
                        const res = await window.api.post('/api/eventos', formData);
                        if (res && res.cartazUrl) finalCartazUrl = res.cartazUrl;
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
                        cartazUrl: finalCartazUrl, 
                        financeiro: JSON.parse(baseData.financeiro), 
                        dataInicio: currentInicio.toISOString(),
                        dataFim: currentFim.toISOString(),
                        recorrencia: 'Semanal'
                    });
                    currentInicio.setDate(currentInicio.getDate() + 7);
                }

                if (eventosParaCriar.length > 0) {
                    try {
                        await window.api.post('/api/eventos/lote', eventosParaCriar);
                    } catch (error) {
                        alert(`Erro ao criar recorrências: ${error.message}`);
                        return;
                    }
                }
            }

            modal.classList.remove('active');
            
            // Recarrega tudo e atualiza o calendário e a lista
            await carregarDadosIniciais();
            calendar.removeAllEvents();
            calendar.addEventSource(formatarEventosParaCalendario(todosEventos));
            renderizarLista();
        });
    }

    function renderizarLista() {
        listaEventosContainer.innerHTML = '';
        if (todosEventos.length === 0) {
            listaEventosContainer.innerHTML = '<p style="color: #666; text-align: center; width: 100%; grid-column: 1/-1;">Nenhum evento ou programação futuro.</p>';
            return;
        }

        // Renderiza a lista exibindo o cartaz (se houver)
        todosEventos.forEach(evento => {
            const tipo = evento.tipo || 'Evento';
            const card = document.createElement('div');
            card.className = 'evento-card';
            
            let imgHTML = '';
            if (evento.cartazUrl) {
                imgHTML = `<img src="${evento.cartazUrl}" class="evento-card-cartaz" alt="Cartaz">`;
            } else {
                imgHTML = `<div class="evento-card-cartaz" style="display:flex; justify-content:center; align-items:center; color:#ccc;"><i class='bx bx-image' style="font-size: 3rem;"></i></div>`;
            }

            card.innerHTML = `
                ${imgHTML}
                <div class="evento-card-body">
                    <h4>${evento.nome} <span class="badge ${tipo.toLowerCase()}" style="font-size: 0.7rem; float:right;">${tipo}</span></h4>
                    <p><i class='bx bx-calendar'></i> ${new Date(evento.dataInicio).toLocaleString('pt-BR', {dateStyle: 'short', timeStyle: 'short'})}</p>
                    <p><i class='bx bx-map'></i> ${evento.local}</p>
                </div>
                <div class="evento-card-footer">
                    <button class="btn btn-principal btn-editar" data-id="${evento._id}" style="width: 100%;">Detalhes</button>
                </div>
            `;
            listaEventosContainer.appendChild(card);
        });

        document.querySelectorAll('.btn-editar').forEach(btn => {
            btn.addEventListener('click', (e) => abrirDetalhesEvento(e.currentTarget.dataset.id));
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
                if(targetId === 'view-calendario') calendar.render(); // Redesenha o calendário se estava oculto
            });
        });
    }

    function configurarModal() {
        btnNovoEvento.addEventListener('click', () => abrirModalParaCriacao());
        closeModal.addEventListener('click', () => modal.classList.remove('active'));
        cancelModal.addEventListener('click', () => modal.classList.remove('active'));
        window.addEventListener('click', (e) => {
            if (e.target === modal) modal.classList.remove('active');
            if (e.target.matches('.modal-overlay#detalhes-evento-modal')) {
                document.getElementById('detalhes-evento-modal').classList.remove('active');
            }
        });
    }

    function abrirModalParaCriacao(dateStr = null) {
        form.reset();
        document.getElementById('evento-id').value = '';
        document.getElementById('modal-title').textContent = 'Nova Programação / Evento';
        document.getElementById('cartaz-preview-wrapper').classList.add('hidden');
        document.getElementById('financial-fields').style.display = 'none';
        document.getElementById('evento-tipo').value = 'Programação'; 

        if (dateStr) {
            document.getElementById('evento-data-inicio').value = `${dateStr}T19:00`;
            document.getElementById('evento-data-fim').value = `${dateStr}T21:00`;
        }
        modal.classList.add('active');
    }

    function abrirModalParaEdicao(id) {
        const evento = todosEventos.find(e => e._id === id);
        if (!evento) return;

        form.reset(); 
        document.getElementById('evento-id').value = evento._id;
        document.getElementById('modal-title').textContent = 'Editar Programação / Evento';
        document.getElementById('evento-tipo').value = evento.tipo || 'Evento';
        document.getElementById('evento-nome').value = evento.nome;
        document.getElementById('evento-categoria').value = evento.categoria;
        
        // Esconde opções de repetir ao editar
        document.getElementById('evento-repetir').checked = false;
        document.getElementById('recurrence-options').style.display = 'none';

        document.getElementById('evento-data-inicio').value = new Date(evento.dataInicio).toISOString().substring(0, 16);
        document.getElementById('evento-data-fim').value = new Date(evento.dataFim).toISOString().substring(0, 16);
        document.getElementById('evento-local').value = evento.local;
        document.getElementById('evento-responsavel').value = evento.responsavelId;
        document.getElementById('evento-descricao').value = evento.descricao || '';
        document.getElementById('evento-cor').value = evento.cor || (evento.tipo === 'Evento' ? '#e36e00' : '#0033a0');

        const cartazUrlInput = document.getElementById('evento-cartaz-url');
        const cartazPreviewWrapper = document.getElementById('cartaz-preview-wrapper');
        const cartazPreview = document.getElementById('cartaz-preview');
        
        cartazUrlInput.value = evento.cartazUrl || '';
        if (evento.cartazUrl) {
            cartazPreview.src = evento.cartazUrl;
            cartazPreviewWrapper.classList.remove('hidden');
        } else {
            cartazPreviewWrapper.classList.add('hidden');
        }

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
            const corPadrao = tipo === 'Programação' ? '#0033a0' : '#e36e00';
            const corEvento = evento.cor || corPadrao;
            const corTexto = isColorLight(corEvento) ? '#212529' : '#ffffff';

            return {
                id: evento._id,
                title: evento.nome,
                start: evento.dataInicio,
                end: evento.dataFim,
                backgroundColor: corEvento,
                textColor: corTexto,
                extendedProps: evento
            }
        });
    }

    function isColorLight(hexColor) {
        if (!hexColor || !hexColor.startsWith('#')) return false;
        const hex = hexColor.replace('#', '');
        if(hex.length !== 6) return false;
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
        return yiq >= 150; 
    }

    // --- FUNÇÕES DO NOVO MODAL DE DETALHES ---

    function abrirDetalhesEvento(id) {
        currentEventId = id;
        const evento = todosEventos.find(e => e._id === id);
        if (!evento) return;

        // Título e Badge
        document.getElementById('detalhes-modal-title').textContent = evento.nome;
        const badge = document.getElementById('detalhes-tipo-badge');
        badge.textContent = evento.tipo;
        badge.style.backgroundColor = evento.tipo === 'Evento' ? '#fff0e6' : '#e9f5ff';
        badge.style.color = evento.tipo === 'Evento' ? '#e36e00' : '#007bff';

        document.getElementById('detalhes-categoria').textContent = evento.categoria;

        // Cartaz
        const cartazImg = document.getElementById('detalhes-cartaz-img');
        const placeholder = document.getElementById('detalhes-placeholder');
        if (evento.cartazUrl) {
            cartazImg.src = evento.cartazUrl;
            cartazImg.style.display = 'block';
            placeholder.style.display = 'none';
        } else {
            cartazImg.style.display = 'none';
            placeholder.style.display = 'flex';
        }

        // Infos
        const dataInicio = new Date(evento.dataInicio);
        const dataFim = new Date(evento.dataFim);
        document.getElementById('detalhes-data').textContent = `${dataInicio.toLocaleDateString('pt-BR')} das ${dataInicio.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} às ${dataFim.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
        document.getElementById('detalhes-local').textContent = evento.local;
        
        const responsavel = todosMembros.find(m => m._id === evento.responsavelId);
        const responsavelEl = document.getElementById('detalhes-responsavel');
        if (responsavel) {
            responsavelEl.innerHTML = `<a href="/pages/lista.membros/detalhes_membro.html?id=${responsavel._id}" target="_blank">${responsavel.nome}</a>`;
        } else {
            responsavelEl.textContent = 'Não informado';
        }

        document.getElementById('detalhes-descricao').textContent = evento.descricao || 'Nenhuma descrição detalhada fornecida.';

        // Recorrência
        const recorrenciaP = document.getElementById('detalhes-recorrencia-wrapper');
        if (evento.recorrencia) {
            document.getElementById('detalhes-recorrencia').textContent = evento.recorrencia;
            recorrenciaP.style.display = 'flex';
        } else {
            recorrenciaP.style.display = 'none';
        }

        // Financeiro
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

        btnEditarEvento.addEventListener('click', () => {
            detalhesModal.classList.remove('active');
            abrirModalParaEdicao(currentEventId);
        });

        btnExcluirEvento.addEventListener('click', async () => {
            if (!currentEventId) return;
            const confirmou = confirm('Tem certeza que deseja excluir este evento?');
            if (confirmou) {
                try {
                    await window.api.delete(`/api/eventos/${currentEventId}`);
                    detalhesModal.classList.remove('active');
                    
                    // RECARREGA TUDO PARA REFLETIR A EXCLUSÃO
                    await carregarDadosIniciais();
                    calendar.removeAllEvents();
                    calendar.addEventSource(formatarEventosParaCalendario(todosEventos));
                    renderizarLista();
                    
                } catch (error) {
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

        // Cartaz em tela cheia
        const cartazImg = document.getElementById('detalhes-cartaz-img');
        const fullscreenContainer = document.getElementById('fullscreen-container');
        const fullscreenImage = document.getElementById('fullscreen-image');
        const fullscreenClose = document.querySelector('.fullscreen-close');

        cartazImg.addEventListener('click', () => {
            fullscreenImage.src = cartazImg.src;
            fullscreenContainer.classList.add('active');
        });

        const fecharFullscreen = () => { fullscreenContainer.classList.remove('active'); };
        fullscreenContainer.addEventListener('click', fecharFullscreen);
        fullscreenClose.addEventListener('click', fecharFullscreen);
    }

    function gerarIcs(evento) {
        const toUtcString = (date) => {
            return new Date(date).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        };

        return [
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
    }
};

document.addEventListener('DOMContentLoaded', iniciarAgenda);
document.body.addEventListener('htmx:afterSwap', iniciarAgenda);
if (document.readyState !== 'loading') iniciarAgenda();
