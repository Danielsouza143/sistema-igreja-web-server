const iniciarAgenda = async () => {
    // --- Elementos da UI ---
    const tabButtons = document.querySelectorAll('.aba-link');
    const tabContents = document.querySelectorAll('.aba-conteudo');
    const calendarioEl = document.getElementById('calendario');
    const listaEventosContainer = document.getElementById('lista-eventos-container');
    const btnNovoEvento = document.getElementById('btn-novo-evento');
    const modal = document.getElementById('evento-modal');
    const closeModal = modal.querySelector('.modal-close');
    const form = document.getElementById('evento-form');

    // --- Modal de Detalhes ---
    const detalhesModal = document.getElementById('detalhes-evento-modal');
    const detalhesCloseBtn = document.getElementById('detalhes-modal-close');
    
    // --- Menu de Contexto ---
    const ctxMenu = document.getElementById('context-menu-agenda');
    let ctxEventId = null;
    let ctxEventDate = null;

    // --- Cropper ---
    const cartazInput = document.getElementById('evento-cartaz-input');
    const cropModal = document.getElementById('crop-modal');
    const imageToCrop = document.getElementById('crop-image-target');
    let cropper = null;
    let croppedBlob = null;

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
    configurarContexto();
    configurarCropper();

    // --- LÓGICA DE API E DADOS ---

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
        }
    }

    // --- CALENDÁRIO ---
    function inicializarCalendario() {
        calendar = new FullCalendar.Calendar(calendarioEl, {
            locale: 'pt-br', // 100% Traduzido
            initialView: 'dayGridMonth',
            contentHeight: 'auto',
            headerToolbar: {
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,listMonth'
            },
            buttonText: { today: 'Hoje', month: 'Mês', week: 'Semana', list: 'Lista' },
            dayMaxEventRows: 4, 
            events: formatarEventosParaCalendario(todosEventos),
            
            // Clique normal (abre detalhes)
            eventClick: (info) => abrirDetalhesEvento(info.event.id),
            
            // Clique num dia vazio (Criação de evento)
            dateClick: (info) => abrirModalParaCriacao(info.dateStr),
            
            // Clique DIREITO no evento (Menu de Contexto)
            eventDidMount: function(info) {
                info.el.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    ctxEventId = info.event.id;
                    ctxEventDate = info.event.start;
                    ctxMenu.style.display = 'block';
                    ctxMenu.style.left = e.pageX + 'px';
                    ctxMenu.style.top = e.pageY + 'px';
                });
            },
            
            // Estilização Premium
            eventContent: function(arg) {
                const evento = arg.event.extendedProps;
                const isProgramacao = evento.tipo === 'Programação';
                
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

    // --- FORMULÁRIO E SALVAMENTO ---
    function configurarFormulario() {
        document.getElementById('evento-tipo').addEventListener('change', (e) => {
            document.getElementById('financial-fields').style.display = e.target.value === 'Evento' ? 'block' : 'none';
        });

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

            const dataInicioBase = new Date(document.getElementById('evento-data-inicio').value);
            const dataFimBase = new Date(document.getElementById('evento-data-fim').value);
            
            // VERIFICAÇÃO CONTRA O "ESTICAMENTO" INVOLUNTÁRIO
            if (dataFimBase <= dataInicioBase) {
                return alert("A data de fim deve ser posterior à data de início.");
            }
            const horasDuracao = (dataFimBase - dataInicioBase) / (1000 * 60 * 60);
            if (horasDuracao > 24) {
                const confirmar = confirm(`Atenção! Este evento durará ${Math.round(horasDuracao)} horas. Ele aparecerá "esticado" por vários dias na visualização mensal do calendário. As datas estão corretas?`);
                if (!confirmar) return;
            }

            const dataInicioStr = dataInicioBase.toISOString();
            const dataFimStr = dataFimBase.toISOString();

            // Lógica sem recorrência
            if (id || !checkboxRepetir.checked) {
                const formData = new FormData();
                Object.keys(baseData).forEach(key => formData.append(key, baseData[key]));
                formData.append('dataInicio', dataInicioStr);
                formData.append('dataFim', dataFimStr);
                
                // Anexa o Blob da imagem cortada, se houver
                if (croppedBlob) {
                    formData.append('cartaz', croppedBlob, 'cartaz.jpg');
                }

                try {
                    if (id) await window.api.put(`/api/eventos/${id}`, formData);
                    else await window.api.post('/api/eventos', formData);
                } catch (error) {
                    return alert(`Erro ao salvar: ${error.message}`);
                }
            } else {
                // Lógica Lote (Recorrência)
                let finalCartazUrl = baseData.cartazUrl;
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
                const duracaoMs = dataFimBase - dataInicioBase;
                
                if (croppedBlob) {
                    const formData = new FormData();
                    Object.keys(baseData).forEach(key => formData.append(key, baseData[key]));
                    formData.append('dataInicio', dataInicioStr);
                    formData.append('dataFim', dataFimStr);
                    formData.append('recorrencia', 'Semanal');
                    formData.append('cartaz', croppedBlob, 'cartaz.jpg');
                    
                    try {
                        const res = await window.api.post('/api/eventos', formData);
                        if (res && res.cartazUrl) finalCartazUrl = res.cartazUrl;
                        currentInicio.setDate(currentInicio.getDate() + 7);
                    } catch (err) {
                        return alert('Erro ao criar o evento: ' + err.message);
                    }
                }

                const eventosParaCriar = [];
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
                        return alert(`Erro ao criar recorrências: ${error.message}`);
                    }
                }
            }

            modal.classList.remove('active');
            croppedBlob = null;
            await recarregarTudo();
        });
    }

    // --- LISTA DE EVENTOS E AÇÕES ---
    function renderizarLista() {
        listaEventosContainer.innerHTML = '';
        if (todosEventos.length === 0) {
            listaEventosContainer.innerHTML = '<p style="color: #666; text-align: center; width: 100%; grid-column: 1/-1;">Nenhum evento ou programação futuro.</p>';
            return;
        }

        todosEventos.forEach(evento => {
            const tipo = evento.tipo || 'Evento';
            const card = document.createElement('div');
            card.className = 'evento-card';
            
            let imgHTML = '';
            if (evento.cartazUrl) {
                imgHTML = `<img src="${evento.cartazUrl}" class="evento-card-cartaz" alt="Cartaz">`;
            } else {
                imgHTML = `<div class="evento-card-cartaz" style="display:flex; justify-content:center; align-items:center; background:#f8f9fa; color:#ccc;"><i class='bx bx-image' style="font-size: 3rem;"></i></div>`;
            }

            card.innerHTML = `
                <div class="evento-card-acoes">
                    <button class="btn-acao-sm btn-editar-list" data-id="${evento._id}" title="Editar"><i class='bx bxs-edit'></i></button>
                    <button class="btn-acao-sm btn-export-list" data-id="${evento._id}" title="Exportar para Calendário"><i class='bx bx-export'></i></button>
                    <button class="btn-acao-sm excluir btn-excluir-list" data-id="${evento._id}" title="Excluir"><i class='bx bx-trash'></i></button>
                </div>
                ${imgHTML}
                <div class="evento-card-body">
                    <h4>${evento.nome} <span class="badge ${tipo.toLowerCase()}" style="font-size: 0.7rem; float:right;">${tipo}</span></h4>
                    <p><i class='bx bx-calendar'></i> ${new Date(evento.dataInicio).toLocaleString('pt-BR', {dateStyle: 'short', timeStyle: 'short'})}</p>
                    <p><i class='bx bx-map'></i> ${evento.local}</p>
                </div>
            `;
            
            // Clicar no card inteiro abre os detalhes
            card.addEventListener('click', (e) => {
                if(!e.target.closest('.btn-acao-sm')) {
                    abrirDetalhesEvento(evento._id);
                }
            });

            // Botões de Ação na Lista
            card.querySelector('.btn-editar-list').addEventListener('click', (e) => {
                e.stopPropagation();
                abrirModalParaEdicao(evento._id);
            });
            card.querySelector('.btn-export-list').addEventListener('click', (e) => {
                e.stopPropagation();
                exportarEvento(evento._id);
            });
            card.querySelector('.btn-excluir-list').addEventListener('click', (e) => {
                e.stopPropagation();
                excluirEvento(evento._id);
            });

            listaEventosContainer.appendChild(card);
        });
    }

    // --- CROPPER (CORTE DE IMAGEM) ---
    function configurarCropper() {
        cartazInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (event) => {
                imageToCrop.src = event.target.result;
                cropModal.style.display = 'flex';
                if (cropper) cropper.destroy();
                cropper = new Cropper(imageToCrop, { viewMode: 1, background: false });
            };
            reader.readAsDataURL(file);
            cartazInput.value = ''; 
        });

        document.querySelectorAll('.btn-ratio').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.btn-ratio').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                const ratio = parseFloat(e.target.dataset.ratio);
                cropper.setAspectRatio(isNaN(ratio) ? NaN : ratio);
            });
        });

        document.getElementById('btn-cancel-crop').addEventListener('click', () => {
            cropModal.style.display = 'none';
            if (cropper) cropper.destroy();
            croppedBlob = null;
        });

        document.getElementById('btn-confirm-crop').addEventListener('click', () => {
            if (!cropper) return;
            cropper.getCroppedCanvas({ maxWidth: 1200, maxHeight: 1200 }).toBlob((blob) => {
                croppedBlob = blob;
                const cartazPreview = document.getElementById('cartaz-preview');
                const cartazPreviewWrapper = document.getElementById('cartaz-preview-wrapper');
                cartazPreview.src = URL.createObjectURL(blob);
                cartazPreviewWrapper.classList.remove('hidden');
                cropModal.style.display = 'none';
                cropper.destroy();
            }, 'image/jpeg', 0.85);
        });
        
        document.getElementById('btn-remover-cartaz').addEventListener('click', () => {
            croppedBlob = null;
            document.getElementById('evento-cartaz-url').value = '';
            document.getElementById('cartaz-preview-wrapper').classList.add('hidden');
        });
    }

    // --- MENU DE CONTEXTO E MODAL DE DETALHES ---
    function configurarContexto() {
        document.addEventListener('click', () => {
            if (ctxMenu) ctxMenu.style.display = 'none';
        });

        document.getElementById('ctx-ver-detalhes').addEventListener('click', () => abrirDetalhesEvento(ctxEventId));
        
        document.getElementById('ctx-ver-dia').addEventListener('click', () => {
            if (ctxEventDate) calendar.changeView('timeGridDay', ctxEventDate);
        });
        
        document.getElementById('ctx-editar').addEventListener('click', () => abrirModalParaEdicao(ctxEventId));
        document.getElementById('ctx-exportar').addEventListener('click', () => exportarEvento(ctxEventId));
        document.getElementById('ctx-excluir').addEventListener('click', () => excluirEvento(ctxEventId));
    }

    function abrirDetalhesEvento(id) {
        currentEventId = id;
        const evento = todosEventos.find(e => e._id === id);
        if (!evento) return;

        document.getElementById('detalhes-modal-title').textContent = evento.nome;
        const badge = document.getElementById('detalhes-tipo-badge');
        badge.textContent = evento.tipo;
        badge.style.backgroundColor = evento.tipo === 'Evento' ? '#fff0e6' : '#e9f5ff';
        badge.style.color = evento.tipo === 'Evento' ? '#e36e00' : '#007bff';

        document.getElementById('detalhes-categoria').textContent = evento.categoria;

        const cartazContainer = document.getElementById('detalhes-cartaz-container');
        const cartazImg = document.getElementById('detalhes-cartaz-img');
        const placeholder = document.getElementById('detalhes-placeholder');
        
        // Controle do fundo inteligente (Branco se não tiver cartaz)
        if (evento.cartazUrl) {
            cartazImg.src = evento.cartazUrl;
            cartazImg.style.display = 'block';
            placeholder.style.display = 'none';
            cartazContainer.classList.remove('fundo-branco');
        } else {
            cartazImg.style.display = 'none';
            placeholder.style.display = 'flex';
            cartazContainer.classList.add('fundo-branco');
        }

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

        document.getElementById('detalhes-descricao').textContent = evento.descricao || 'Nenhuma descrição fornecida.';

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

        document.getElementById('btn-editar-evento').addEventListener('click', () => {
            detalhesModal.classList.remove('active');
            abrirModalParaEdicao(currentEventId);
        });

        document.getElementById('btn-excluir-evento').addEventListener('click', () => excluirEvento(currentEventId));
        document.getElementById('btn-exportar-ics').addEventListener('click', () => exportarEvento(currentEventId));

        // Cartaz em tela cheia
        const cartazImg = document.getElementById('detalhes-cartaz-img');
        const fullscreenContainer = document.getElementById('fullscreen-container');
        const fullscreenImage = document.getElementById('fullscreen-image');
        
        cartazImg.addEventListener('click', () => {
            fullscreenImage.src = cartazImg.src;
            fullscreenContainer.classList.add('active');
        });

        const fecharFullscreen = () => fullscreenContainer.classList.remove('active');
        fullscreenContainer.addEventListener('click', fecharFullscreen);
        document.querySelector('.fullscreen-close').addEventListener('click', fecharFullscreen);
    }

    // --- FUNÇÕES DE ROTINA ---

    async function excluirEvento(id) {
        if (!id) return;
        const confirmou = confirm('Tem certeza que deseja excluir este evento? Esta ação não pode ser desfeita.');
        if (confirmou) {
            try {
                await window.api.delete(`/api/eventos/${id}`);
                detalhesModal.classList.remove('active');
                await recarregarTudo();
            } catch (error) {
                alert(`Erro ao excluir: ${error.message}`);
            }
        }
    }

    function exportarEvento(id) {
        if (!id) return;
        const evento = todosEventos.find(e => e._id === id);
        if (!evento) return;

        const toUtcString = (date) => new Date(date).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        
        const icsData = [
            'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//SistemaIgreja//Agenda//PT',
            'BEGIN:VEVENT', `UID:${evento._id}@sistemaigreja.com`, `DTSTAMP:${toUtcString(new Date())}`,
            `DTSTART:${toUtcString(evento.dataInicio)}`, `DTEND:${toUtcString(evento.dataFim)}`,
            `SUMMARY:${evento.nome}`, `DESCRIPTION:${evento.descricao || ''}`, `LOCATION:${evento.local || ''}`,
            'END:VEVENT', 'END:VCALENDAR'
        ].join('\r\n');

        const blob = new Blob([icsData], { type: 'text/calendar;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', `${evento.nome.replace(/[^a-z0-9]/gi, '_')}.ics`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    async function recarregarTudo() {
        await carregarDadosIniciais();
        calendar.removeAllEvents();
        calendar.addEventSource(formatarEventosParaCalendario(todosEventos));
        renderizarLista();
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
                if(targetId === 'view-calendario') calendar.render(); 
            });
        });
    }

    function configurarModal() {
        btnNovoEvento.addEventListener('click', () => abrirModalParaCriacao());
        closeModal.addEventListener('click', () => modal.classList.remove('active'));
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
        document.getElementById('modal-title').textContent = 'Novo Evento';
        document.getElementById('cartaz-preview-wrapper').classList.add('hidden');
        document.getElementById('financial-fields').style.display = 'none';
        document.getElementById('evento-tipo').value = 'Programação'; 
        croppedBlob = null;

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
        croppedBlob = null;
        document.getElementById('evento-id').value = evento._id;
        document.getElementById('modal-title').textContent = 'Editar Evento';
        document.getElementById('evento-tipo').value = evento.tipo || 'Evento';
        document.getElementById('evento-nome').value = evento.nome;
        document.getElementById('evento-categoria').value = evento.categoria;
        
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
        if (!items || items.length === 0) {
            selectEl.innerHTML = `<option value="">${emptyMessage}</option>`;
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

    function isColorLight(hexColor) {
        if (!hexColor || !hexColor.startsWith('#')) return false;
        const hex = hexColor.replace('#', '');
        if(hex.length !== 6) return false;
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        return (((r * 299) + (g * 587) + (b * 114)) / 1000) >= 150; 
    }
};

document.addEventListener('DOMContentLoaded', iniciarAgenda);
document.body.addEventListener('htmx:afterSwap', iniciarAgenda);
if (document.readyState !== 'loading') iniciarAgenda();
