document.addEventListener('DOMContentLoaded', () => {

    // --- ESTADO DA APLICAÇÃO ---
    let todosGrupos = [];
    let todosMembros = [];
    let grupoEmEdicaoId = null;

    // --- SELETORES DO DOM ---
    const viewPainel = document.getElementById('view-painel');
    const viewDetalhes = document.getElementById('view-detalhes-pg');
    const gridPequenosGrupos = document.getElementById('grid-pequenos-grupos');
    const modalPG = document.getElementById('modal-pg');
    const formPG = document.getElementById('form-pg');
    const modalPGTitulo = document.getElementById('modal-pg-titulo');
    const modalEncontro = document.getElementById('modal-encontro');
    const formEncontro = document.getElementById('form-encontro');
    const modalDetalhesEncontro = document.getElementById('modal-detalhes-encontro');


    // --- FUNÇÕES DE RENDERIZAÇÃO ---
    const renderizarGridGrupos = () => {
        gridPequenosGrupos.innerHTML = '';
        if (todosGrupos.length === 0) {
            gridPequenosGrupos.innerHTML = '<p class="mensagem-vazio">Nenhum pequeno grupo cadastrado ainda.</p>';
            return;
        }
        todosGrupos.forEach(grupo => {
            const card = document.createElement('div');
            card.className = 'card-pg';
            card.dataset.id = grupo._id;
            card.innerHTML = `
                <div class="card-pg-header">
                    <h3>${grupo.nome}</h3>
                    <p>Líder: ${grupo.lider?.nome || 'Não definido'}</p>
                </div>
                <div class="card-pg-body">
                    <p><i class='bx bxs-calendar'></i> ${grupo.diaSemana} às ${grupo.horario}</p>
                    <p><i class='bx bxs-map'></i> ${grupo.endereco?.bairro || 'Bairro não informado'}</p>
                </div>
                <div class="card-pg-footer">
                    <div class="pg-membros-count">
                        <i class='bx bxs-group'></i>
                        <span>${grupo.membros.length} Membros</span>
                    </div>
                </div>
            `;
            gridPequenosGrupos.appendChild(card);

            card.addEventListener('click', () => {
                mostrarDetalhesDoGrupo(grupo._id);
            });
        });
    };

    // --- LÓGICA DO MODAL ---
    const abrirModalPG = (grupo = null) => {
        formPG.reset();
        grupoEmEdicaoId = null;
        const selectLider = document.getElementById('pg-lider');
        const selectAnfitriao = document.getElementById('pg-anfitriao');
        
        selectLider.innerHTML = '<option value="">Selecione um líder</option>' + todosMembros.map(m => `<option value="${m._id}" data-foto="${m.foto || ''}">${m.nome}</option>`).join('');
        selectAnfitriao.innerHTML = '<option value="">Selecione um anfitrião</option>' + todosMembros.map(m => `<option value="${m._id}">${m.nome}</option>`).join('');

        if (grupo) {
            modalPGTitulo.textContent = 'Editar Pequeno Grupo';
            grupoEmEdicaoId = grupo._id;
            document.getElementById('pg-nome').value = grupo.nome;
            selectLider.value = grupo.lider._id;
            selectAnfitriao.value = grupo.anfitriao?._id || '';
            document.getElementById('pg-dia-semana').value = grupo.diaSemana;
            document.getElementById('pg-horario').value = grupo.horario;
            document.getElementById('pg-cep').value = grupo.endereco?.cep || '';
            document.getElementById('pg-logradouro').value = grupo.endereco?.logradouro || '';
            document.getElementById('pg-bairro').value = grupo.endereco?.bairro || '';
            document.getElementById('pg-cidade').value = grupo.endereco?.cidade || '';
        } else {
            modalPGTitulo.textContent = 'Novo Pequeno Grupo';
        }
        modalPG.classList.add('active');
    };

    const fecharModal = (modal) => modal.classList.remove('active');

    document.getElementById('btn-novo-pg').addEventListener('click', () => abrirModalPG());
    modalPG.querySelector('.modal-close').addEventListener('click', () => fecharModal(modalPG));
    modalPG.querySelector('[data-close]').addEventListener('click', () => fecharModal(modalPG));
    modalEncontro.querySelector('.modal-close').addEventListener('click', () => fecharModal(modalEncontro));
    modalEncontro.querySelector('[data-close]').addEventListener('click', () => fecharModal(modalEncontro));
    modalDetalhesEncontro.querySelector('.modal-close').addEventListener('click', () => fecharModal(modalDetalhesEncontro));




    // --- LÓGICA DO FORMULÁRIO ---
    formPG.addEventListener('submit', async (e) => {
        e.preventDefault();
        const dadosGrupo = {
            nome: document.getElementById('pg-nome').value,
            lider: document.getElementById('pg-lider').value,
            anfitriao: document.getElementById('pg-anfitriao').value,
            diaSemana: document.getElementById('pg-dia-semana').value,
            horario: document.getElementById('pg-horario').value,
            endereco: {
                cep: document.getElementById('pg-cep').value,
                logradouro: document.getElementById('pg-logradouro').value,
                bairro: document.getElementById('pg-bairro').value,
                cidade: document.getElementById('pg-cidade').value,
            }
        };

        try {
            const url = grupoEmEdicaoId ? `/api/pequenos-grupos/${grupoEmEdicaoId}` : `/api/pequenos-grupos`;
            await window.api.request(url, grupoEmEdicaoId ? 'PUT' : 'POST', dadosGrupo);
            
            fecharModal(modalPG);
            carregarDados(); // Recarrega tudo
            alert('Pequeno Grupo salvo com sucesso!');
        } catch (error) {
            console.error('Erro ao salvar PG:', error);
            alert('Não foi possível salvar o Pequeno Grupo.');
        }
    });

    // Busca de Endereço por CEP
    document.getElementById('pg-cep').addEventListener('blur', async (e) => {
        const cep = e.target.value.replace(/\D/g, '');
        if (cep.length === 8) {
            try {
                const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
                const data = await response.json();
                if (!data.erro) {
                    document.getElementById('pg-logradouro').value = data.logradouro;
                    document.getElementById('pg-bairro').value = data.bairro;
                    document.getElementById('pg-cidade').value = data.localidade;
                }
            } catch (error) {
                console.error('Erro ao buscar CEP:', error);
            }
        }
    });

    // --- CONTROLE DE ABAS ---
    document.querySelectorAll('.aba-link').forEach(aba => {
        aba.addEventListener('click', () => {
            document.querySelectorAll('.aba-link, .aba-conteudo').forEach(el => el.classList.remove('active'));
            aba.classList.add('active');
            document.getElementById(aba.dataset.aba).classList.add('active');
            if (aba.dataset.aba === 'analise-geral') {
                renderizarAnalises();
            }
        });
    });

    // --- LÓGICA DA VIEW DE DETALHES ---
    const mostrarDetalhesDoGrupo = async (id) => {
        viewPainel.style.display = 'none';
        viewDetalhes.innerHTML = '<p class="mensagem-carregando">Carregando detalhes do grupo...</p>';
        viewDetalhes.style.display = 'block';

        try {
            const grupo = await window.api.get(`/api/pequenos-grupos/${id}`);

            viewDetalhes.innerHTML = `
                <div class="detalhes-pg-header">
                    <div>
                        <button id="btn-voltar-painel" class="btn-voltar"><i class='bx bx-arrow-back'></i> Voltar ao Painel</button>
                        <h1>${grupo.nome}</h1>
                        <p>Liderado por: <strong>${grupo.lider.nome}</strong></p>
                    </div>
                    <div class="detalhes-pg-acoes">
                        <button id="btn-registrar-encontro" class="btn-principal"><i class='bx bx-calendar-plus'></i> Registrar Encontro</button>
                        <button id="btn-editar-pg" class="btn-secundario"><i class='bx bxs-edit'></i> Editar Grupo</button>
                        <button id="btn-excluir-pg" class="btn-perigo"><i class='bx bxs-trash'></i> Excluir</button>
                    </div>
                </div>

                <nav class="abas-navegacao">
                    <button class="aba-link-detalhe active" data-aba="info">Informações</button>
                    <button class="aba-link-detalhe" data-aba="membros">Membros (${grupo.membros.length})</button>
                    <button class="aba-link-detalhe" data-aba="encontros">Encontros (${grupo.encontros.length})</button>
                </nav>

                <div id="info" class="aba-conteudo-detalhe active">
                    <h4><i class='bx bxs-info-circle'></i> Detalhes do Grupo</h4>
                    <p><strong>Dia e Horário:</strong> ${grupo.diaSemana} às ${grupo.horario}</p>
                    <p><strong>Anfitrião:</strong> ${grupo.anfitriao?.nome || 'Não definido'}</p>
                    <p><strong>Endereço:</strong> ${grupo.endereco?.logradouro || 'Não definido'}, ${grupo.endereco?.bairro || ''}</p>
                </div>

                <div id="membros" class="aba-conteudo-detalhe">
                    <h4><i class='bx bxs-group'></i> Membros do Grupo</h4>
                    <div id="lista-membros-pg" class="lista-membros-pg"></div>
                    <div class="add-membro-form">
                        <select id="select-add-membro"></select>
                        <button id="btn-add-membro-pg" class="btn-principal btn-pequeno">Adicionar</button>
                    </div>
                </div>

                <div id="encontros" class="aba-conteudo-detalhe">
                    <h4><i class='bx bxs-calendar-check'></i> Histórico de Encontros</h4>
                    <div id="lista-encontros-pg"></div>
                </div>
            `;

            renderizarDetalhesAbas(grupo);

            // Event Listeners dos botões da view de detalhes
            document.getElementById('btn-voltar-painel').addEventListener('click', () => {
                viewDetalhes.style.display = 'none';
                viewPainel.style.display = 'block';
            });
            document.getElementById('btn-editar-pg').addEventListener('click', () => abrirModalPG(grupo));
            document.getElementById('btn-excluir-pg').addEventListener('click', () => excluirGrupo(grupo._id));
            document.getElementById('btn-registrar-encontro').addEventListener('click', () => abrirModalEncontro(grupo));

        } catch (error) {
            console.error('Erro ao mostrar detalhes:', error);
            viewDetalhes.innerHTML = '<p class="mensagem-vazio">Não foi possível carregar os detalhes do grupo.</p>';
        }
    };

    const renderizarDetalhesAbas = (grupo) => {
        // Abas
        document.querySelectorAll('.aba-link-detalhe').forEach(aba => {
            aba.addEventListener('click', () => {
                document.querySelectorAll('.aba-link-detalhe, .aba-conteudo-detalhe').forEach(el => el.classList.remove('active'));
                aba.classList.add('active');
                document.getElementById(aba.dataset.aba).classList.add('active');
            });
        });

        // Aba Membros
        const listaMembrosContainer = document.getElementById('lista-membros-pg');
        listaMembrosContainer.innerHTML = grupo.membros.map(m => `<div class="membro-item-pg">${m.nome}</div>`).join('') || '<p>Nenhum membro neste grupo.</p>';
        
        const selectAddMembro = document.getElementById('select-add-membro');
        const membrosForaDoGrupo = todosMembros.filter(m => !grupo.membros.some(gm => gm._id === m._id));
        selectAddMembro.innerHTML = '<option>Selecione um membro para adicionar</option>' + membrosForaDoGrupo.map(m => `<option value="${m._id}">${m.nome}</option>`).join('');

        document.getElementById('btn-add-membro-pg').addEventListener('click', async () => {
            const membroId = selectAddMembro.value;
            if (!membroId) return;
            
            const novosMembros = [...grupo.membros.map(m => m._id), membroId];
            try {
                await window.api.put(`/api/pequenos-grupos/${grupo._id}`, { membros: novosMembros });
                mostrarDetalhesDoGrupo(grupo._id); // Recarrega a view
            } catch (error) {
                alert('Erro ao adicionar membro.');
            }
        });

        // Aba Encontros
        const listaEncontrosContainer = document.getElementById('lista-encontros-pg');
        listaEncontrosContainer.innerHTML = grupo.encontros.sort((a,b) => new Date(b.data) - new Date(a.data)).map(e => `
            <div class="encontro-item" data-encontro-id="${e._id}" style="cursor: pointer;">
                <strong>${new Date(e.data).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</strong> - ${e.tema || 'Sem tema'} 
                <span>(${e.presentes.length} membros + ${e.visitantes} visitantes)</span>
            </div>
        `).join('') || '<p>Nenhum encontro registrado.</p>';

        listaEncontrosContainer.querySelectorAll('.encontro-item').forEach(item => {
            item.addEventListener('click', () => {
                const encontroId = item.dataset.encontroId;
                const encontro = grupo.encontros.find(e => e._id === encontroId);
                abrirModalDetalhesEncontro(encontro, grupo.membros);
            });
        });
    };

    const abrirModalDetalhesEncontro = (encontro, membrosDoGrupo) => {
        if (!encontro) return;
        document.getElementById('detalhes-encontro-titulo').textContent = `Encontro de ${new Date(encontro.data).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}`;
        
        const listaPresentes = document.getElementById('lista-detalhe-presentes');
        const listaAusentes = document.getElementById('lista-detalhe-ausentes');

        const presentesIds = new Set(encontro.presentes.map(p => p.toString()));
        
        const presentes = membrosDoGrupo.filter(m => presentesIds.has(m._id.toString()));
        const ausentes = membrosDoGrupo.filter(m => !presentesIds.has(m._id.toString()));

        listaPresentes.innerHTML = presentes.map(p => `<li>${p.nome}</li>`).join('') || '<li>Nenhum membro presente.</li>';
        listaAusentes.innerHTML = ausentes.map(a => `<li>${a.nome}</li>`).join('') || '<li>Todos os membros estavam presentes.</li>';

        modalDetalhesEncontro.classList.add('active');
    };

    const excluirGrupo = async (id) => {
        if (confirm('Tem certeza que deseja excluir este Pequeno Grupo? Esta ação não pode ser desfeita.')) {
            try {
                await window.api.delete(`/api/pequenos-grupos/${id}`);
                alert('Grupo excluído com sucesso.');
                viewDetalhes.style.display = 'none';
                viewPainel.style.display = 'block';
                carregarDados();
            } catch (error) {
                alert('Erro ao excluir o grupo.');
            }
        }
    };

    const abrirModalEncontro = (grupo) => {
        formEncontro.reset();
        document.getElementById('encontro-data').value = new Date().toISOString().split('T')[0];
        const listaPresenca = document.getElementById('lista-presenca-membros-pg');
        listaPresenca.innerHTML = grupo.membros.map(m => `
            <div class="item-presenca-pg">
                <input type="checkbox" id="presenca-pg-${m._id}" value="${m._id}">
                <label for="presenca-pg-${m._id}">${m.nome}</label>
            </div>
        `).join('');
        modalEncontro.classList.add('active');

        formEncontro.onsubmit = async (e) => {
            e.preventDefault();
            const dadosEncontro = {
                data: document.getElementById('encontro-data').value,
                tema: document.getElementById('encontro-tema').value,
                visitantes: document.getElementById('encontro-visitantes').value,
                presentes: Array.from(listaPresenca.querySelectorAll('input:checked')).map(input => input.value)
            };
            try {
                await window.api.post(`/api/pequenos-grupos/${grupo._id}/encontros`, dadosEncontro);
                fecharModal(modalEncontro);
                mostrarDetalhesDoGrupo(grupo._id);
            } catch (error) {
                alert('Erro ao registrar encontro.');
            }
        };
    };

    // --- LÓGICA DE ANÁLISE ---
    const renderizarAnalises = () => {
        document.getElementById('total-grupos').textContent = todosGrupos.length;
        const totalMembros = todosGrupos.reduce((sum, grupo) => sum + grupo.membros.length, 0);
        document.getElementById('total-membros-pg').textContent = totalMembros;

        // Lógica para Frequência Média (exemplo)
        let totalTaxasDePresenca = 0;
        let totalEncontros = 0;
        todosGrupos.forEach(g => {
            if (g.membros.length > 0) {
                g.encontros.forEach(e => {
                    const taxaPresenca = e.presentes.length / g.membros.length;
                    totalTaxasDePresenca += taxaPresenca;
                    totalEncontros++;
                });
            }
        });
        const freqMedia = totalEncontros > 0 ? (totalTaxasDePresenca / totalEncontros) * 100 : 0;
        document.getElementById('frequencia-media-pg').textContent = `${freqMedia.toFixed(0)}%`;

        // Gráfico de Crescimento
        const crescimentoPorMes = {};
        todosGrupos.forEach(g => {
            const mesAno = new Date(g.createdAt).toLocaleDateString('pt-BR', { year: '2-digit', month: 'short' });
            crescimentoPorMes[mesAno] = (crescimentoPorMes[mesAno] || 0) + 1;
        });
        criarGrafico('grafico-crescimento-pg', 'line', {
            labels: Object.keys(crescimentoPorMes),
            datasets: [{ label: 'Novos Grupos', data: Object.values(crescimentoPorMes), borderColor: '#8e44ad', tension: 0.1 }]
        });

        // Gráfico de Ranking
        const ranking = todosGrupos
            .map(g => ({ nome: g.nome, media: g.encontros.length > 0 ? g.encontros.reduce((s, e) => s + e.presentes.length, 0) / g.encontros.length : 0 }))
            .sort((a, b) => b.media - a.media)
            .slice(0, 5);
        criarGrafico('grafico-ranking-frequencia', 'bar', {
            labels: ranking.map(r => r.nome),
            datasets: [{ label: 'Média de Presentes por Encontro', data: ranking.map(r => r.media.toFixed(1)), backgroundColor: '#9b59b6' }]
        });
    };

    const criarGrafico = (id, tipo, dados, opcoes = {}) => {
        const ctx = document.getElementById(id).getContext('2d');
        new Chart(ctx, { type: tipo, data: dados, options: { responsive: true, maintainAspectRatio: false, ...opcoes } });
    };

    // --- CARREGAMENTO INICIAL ---
    const carregarDados = async () => {
        gridPequenosGrupos.innerHTML = '<p class="mensagem-carregando">Carregando grupos...</p>';
        try {
            const [resGrupos, resMembros] = await Promise.all([
                window.api.get('/api/pequenos-grupos'),
                window.api.get('/api/membros')
            ]);
            [todosGrupos, todosMembros] = [resGrupos, resMembros];

            renderizarGridGrupos();
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
            gridPequenosGrupos.innerHTML = '<p class="mensagem-vazio">Erro ao carregar os dados. Verifique a conexão.</p>';
        }
    };

    carregarDados();
});