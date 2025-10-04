document.addEventListener('DOMContentLoaded', () => {
    
    const graficos = {};
    let todosOsMembros = [];
    const CORES_BASE = ['#0033a0', '#ff8800', '#28a745', '#0056b3', '#ffcd56', '#4bc0c0', '#6c757d'];

    // --- Seletores dos Filtros ---
    const filtroGenero = document.getElementById('filtro-genero-analise');
    const filtroFaixaEtaria = document.getElementById('filtro-faixa-etaria-analise');
    const filtroEstadoCivil = document.getElementById('filtro-estado-civil-analise');
    const btnLimparFiltros = document.getElementById('btn-limpar-filtros');

    const geradorDeCor = (function() {
        let matizAtual = 0;
        const incrementoDourado = 0.618033988749895;
        return () => {
            matizAtual = (matizAtual + incrementoDourado) % 1;
            const matizGraus = Math.floor(matizAtual * 360);
            return `hsl(${matizGraus}, 85%, 45%)`;
        };
    })();

    function prepararCanvasWrapper(idCanvas) {
        const canvas = document.getElementById(idCanvas);
        if (canvas && !canvas.parentElement.classList.contains('chart-canvas-container')) {
            const wrapper = document.createElement('div');
            wrapper.className = 'chart-canvas-container';
            canvas.parentNode.insertBefore(wrapper, canvas);
            wrapper.appendChild(canvas);
        }
    }

    function capitalizar(str) {
        if (!str || typeof str !== 'string') return '';
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    }
    
    function calcularIdade(dataNascimento) {
        if (!dataNascimento) return null;
        const hoje = new Date();
        const nascimento = new Date(dataNascimento);
        let idade = hoje.getFullYear() - nascimento.getFullYear();
        const mes = hoje.getMonth() - nascimento.getMonth();
        if (mes < 0 || (mes === 0 && hoje.getDate() < nascimento.getDate())) {
            idade--;
        }
        return idade;
    }

    function mostrarModalAniversariantes() {
        const modalExistente = document.getElementById('modal-aniversariantes');
        if (modalExistente) modalExistente.remove();
        const overlay = document.createElement('div');
        overlay.id = 'modal-aniversariantes';
        overlay.className = 'modal-overlay';
        const modal = document.createElement('div');
        modal.className = 'modal-content';
        modal.innerHTML = `
            <button class="modal-close">&times;</button>
            <div id="view-lista-aniversariantes">
                <h2>Aniversariantes do Ano</h2>
                <div class="lista-aniversariantes"></div>
            </div>
            <div id="view-detalhe-membro" style="display:none;"></div>
        `;
        const viewLista = modal.querySelector('#view-lista-aniversariantes');
        const viewDetalhe = modal.querySelector('#view-detalhe-membro');
        const listaContainer = modal.querySelector('.lista-aniversariantes');
        const aniversariantesOrdenados = todosOsMembros
            .filter(m => m.dataNascimento)
            .map(m => {
                const niver = new Date(m.dataNascimento);
                return { id: m._id, nome: m.nome, data: new Date(new Date().getFullYear(), niver.getMonth(), niver.getDate()), dataStr: `${String(niver.getDate()).padStart(2, '0')}/${String(niver.getMonth() + 1).padStart(2, '0')}` };
            }).sort((a, b) => a.data - b.data);
        if (aniversariantesOrdenados.length > 0) {
            aniversariantesOrdenados.forEach(aniversariante => {
                const item = document.createElement('div');
                item.className = 'aniversariante-item';
                item.dataset.id = aniversariante.id;
                item.innerHTML = `<strong>${aniversariante.nome}</strong> - ${aniversariante.dataStr}`;
                listaContainer.appendChild(item);
            });
        } else {
            listaContainer.innerHTML = '<p>Nenhum membro com data de nascimento cadastrada.</p>';
        }
        listaContainer.addEventListener('click', (e) => {
            const item = e.target.closest('.aniversariante-item');
            if (item) {
                const membroId = item.dataset.id;
                mostrarDetalheDoMembroNoModal(membroId, viewLista, viewDetalhe);
            }
        });
        const fecharModal = () => overlay.remove();
        overlay.addEventListener('click', (e) => { if (e.target === overlay) fecharModal(); });
        modal.querySelector('.modal-close').addEventListener('click', fecharModal);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
    }

    async function mostrarDetalheDoMembroNoModal(membroId, viewLista, viewDetalhe) {
        viewLista.style.display = 'none';
        viewDetalhe.style.display = 'block';
        viewDetalhe.innerHTML = '<p class="carregando-detalhe">Carregando dados do membro...</p>';
        try {
            const membro = await window.api.get(`/api/membros/${membroId}`);
            const detalhesHTML = `
                <button class="btn-voltar-lista">&larr; Voltar à Lista</button>
                <div class="membro-header-modal">
                    ${membro.foto ? `<img src="${window.API_BASE_URL}/${membro.foto}" alt="Foto de ${membro.nome}" class="detalhe-foto-modal">` : '<div class="detalhe-foto-placeholder-modal"><i class="bx bx-user-circle"></i></div>'}
                    <div class="membro-titulo-info-modal">
                        <h2>${membro.nome}</h2>
                        <p><strong>Cargo:</strong> ${capitalizar(membro.cargoEclesiastico) || 'Não definido'}</p>
                    </div>
                </div>
                <div class="membro-dados-modal">
                    <h3>Dados Pessoais</h3>
                    <p><strong>CPF:</strong> ${membro.cpf || 'Não informado'}</p>
                    <p><strong>Telefone:</strong> ${membro.telefone || 'Não informado'}</p>
                    <p><strong>Idade:</strong> ${calcularIdade(membro.dataNascimento) || 'Não informada'} anos</p>
                </div>
                ${membro.temMinisterio === 'sim' ? `<div class="membro-dados-modal">
                    <h3>Dados Ministeriais</h3>
                    <p><strong>Ministério:</strong> ${membro.ministerio === 'outro' ? membro.nomeOutroMinisterio : capitalizar(membro.ministerio)}</p>
                    <p><strong>Função:</strong> ${capitalizar(membro.cargoMinisterio) || 'Não informado'}</p>
                </div>` : ''}
            `;
            viewDetalhe.innerHTML = detalhesHTML;
            viewDetalhe.querySelector('.btn-voltar-lista').addEventListener('click', () => {
                viewDetalhe.style.display = 'none';
                viewLista.style.display = 'block';
            });
        } catch (error) {
            viewDetalhe.innerHTML = `<p>Erro ao carregar os dados. Tente novamente.</p><button class="btn-voltar-lista">&larr; Voltar à Lista</button>`;
            viewDetalhe.querySelector('.btn-voltar-lista').addEventListener('click', () => {
                viewDetalhe.style.display = 'none';
                viewLista.style.display = 'block';
            });
        }
    }
    
    function injetarCSSModal() {
        if (document.getElementById('modal-styles')) return;
        const css = `
            .modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.6); display: flex; justify-content: center; align-items: center; z-index: 1000; }
            .modal-content { background-color: #fff; padding: 25px; border-radius: 8px; width: 90%; max-width: 550px; max-height: 80vh; overflow-y: auto; position: relative; box-shadow: 0 5px 15px rgba(0,0,0,0.3); }
            .modal-close { position: absolute; top: 10px; right: 15px; font-size: 1.8rem; color: #aaa; background: none; border: none; cursor: pointer; }
            .modal-content h2 { margin-top: 0; color: var(--cor-primaria, #001f5d); }
            .aniversariante-item { display: block; padding: 10px 5px; border-bottom: 1px solid #eee; cursor: pointer; transition: background-color 0.2s; }
            .aniversariante-item:hover { background-color: #f4f7f9; }
            .aniversariante-item:last-child { border-bottom: none; }
            .carregando-detalhe { text-align: center; padding: 40px; color: #888; }
            .btn-voltar-lista { background: none; border: 1px solid #ccc; color: #555; padding: 8px 12px; border-radius: 5px; cursor: pointer; margin-bottom: 20px; }
            .membro-header-modal { display: flex; align-items: center; gap: 20px; padding-bottom: 15px; border-bottom: 1px solid #eee; }
            .detalhe-foto-modal { width: 100px; height: 100px; object-fit: cover; border-radius: 50%; border: 4px solid var(--cor-secundaria, #0033a0); }
            .detalhe-foto-placeholder-modal { font-size: 80px; color:#999; }
            .membro-dados-modal { margin-top: 15px; }
            .membro-dados-modal h3 { font-size: 1.2rem; color: var(--cor-secundaria, #0033a0); border-left: 3px solid var(--cor-secundaria, #0033a0); padding-left: 8px; margin-bottom: 10px; }
            .membro-dados-modal p { margin: 5px 0; }
        `;
        const style = document.createElement('style');
        style.id = 'modal-styles';
        style.type = 'text/css';
        style.appendChild(document.createTextNode(css));
        document.head.appendChild(style);
    }

    function atualizarResumo(membros) {
        document.getElementById('total-membros').textContent = membros.length;
        const idades = membros.map(m => calcularIdade(m.dataNascimento)).filter(idade => idade !== null);
        if (idades.length > 0) {
            const somaIdades = idades.reduce((acc, idade) => acc + idade, 0);
            const mediaIdade = Math.round(somaIdades / idades.length);
            document.getElementById('media-idade').textContent = `${mediaIdade} anos`;
        } else {
            document.getElementById('media-idade').textContent = 'N/A';
        }
        const ministerios = new Set(membros.filter(m => m.temMinisterio === 'sim' && (m.ministerio || m.nomeOutroMinisterio)).map(m => m.ministerio === 'outro' ? m.nomeOutroMinisterio : m.ministerio));
        document.getElementById('total-ministerios').textContent = ministerios.size;
        const hoje = new Date();
        const proximosAniversarios = membros.filter(m => m.dataNascimento).map(m => {
            const niver = new Date(m.dataNascimento);
            let diasAteNiver = (new Date(hoje.getFullYear(), niver.getMonth(), niver.getDate()) - hoje) / (1000 * 60 * 60 * 24);
            if (diasAteNiver < -1) diasAteNiver += 365.25;
            return { nome: m.nome.split(' ')[0], data: `${String(niver.getDate()).padStart(2, '0')}/${String(niver.getMonth() + 1).padStart(2, '0')}`, dias: diasAteNiver };
        }).sort((a, b) => a.dias - b.dias);
        if (proximosAniversarios.length > 0) {
            const proximo = proximosAniversarios[0];
            document.getElementById('proximo-aniversariante').innerHTML = `${proximo.nome} <span style="font-size: 0.8em;">(${proximo.data})</span>`;
        } else {
            document.getElementById('proximo-aniversariante').textContent = '--';
        }
    }
    
    function criarGrafico(idCanvas, tipo, dados, opcoes) {
        const ctx = document.getElementById(idCanvas).getContext('2d');
        if (graficos[idCanvas]) {
            graficos[idCanvas].destroy();
        }
        graficos[idCanvas] = new Chart(ctx, { type: tipo, data: dados, options: opcoes });
    }

    function criarGraficoGenero(membros) {
        const contagem = { masculino: 0, feminino: 0, nao_informado: 0 };
        membros.forEach(m => {
            if (m.genero === 'masculino') contagem.masculino++;
            else if (m.genero === 'feminino') contagem.feminino++;
            else contagem.nao_informado++;
        });
        criarGrafico('grafico-genero', 'doughnut', {
            labels: ['Masculino', 'Feminino', 'Não Informado'],
            datasets: [{
                data: [contagem.masculino, contagem.feminino, contagem.nao_informado],
                backgroundColor: [CORES_BASE[0], CORES_BASE[1], CORES_BASE[6]],
                borderColor: '#fff',
                borderWidth: 2
            }]
        }, {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'top' } }
        });
    }

    function criarGraficoFaixaEtaria(membros) {
        const faixas = { 'Crianças (0-11)': 0, 'Adolescentes (12-17)': 0, 'Jovens (18-29)': 0, 'Adultos (30-59)': 0, 'Idosos (60+)': 0 };
        membros.forEach(m => {
            const idade = calcularIdade(m.dataNascimento);
            if (idade !== null) {
                if (idade <= 11) faixas['Crianças (0-11)']++;
                else if (idade <= 17) faixas['Adolescentes (12-17)']++;
                else if (idade <= 29) faixas['Jovens (18-29)']++;
                else if (idade <= 59) faixas['Adultos (30-59)']++;
                else faixas['Idosos (60+)']++;
            }
        });
        criarGrafico('grafico-faixa-etaria', 'bar', {
            labels: Object.keys(faixas),
            datasets: [{
                label: 'Nº de Membros',
                data: Object.values(faixas),
                backgroundColor: CORES_BASE[2]
            }]
        }, {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } }
        });
    }

    function criarGraficoCargos(membros) {
        const contagem = {};
        membros.forEach(m => {
            const cargo = m.cargoEclesiastico;
            if (!cargo || cargo === 'membro') {
                contagem['Membro Comum'] = (contagem['Membro Comum'] || 0) + 1;
            } else {
                const cargoCapitalizado = capitalizar(cargo);
                contagem[cargoCapitalizado] = (contagem[cargoCapitalizado] || 0) + 1;
            }
        });

        criarGrafico('grafico-cargos', 'bar', {
            labels: Object.keys(contagem),
            datasets: [{
                label: 'Nº de Membros',
                data: Object.values(contagem),
                backgroundColor: CORES_BASE[3]
            }]
        }, {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            layout: { padding: { left: 20 } },
            plugins: { legend: { display: false } }
        });
    }

    function criarGraficoEstadoCivil(membros) {
        const contagem = {};
        membros.forEach(m => {
            const estado = m.estadoCivil ? capitalizar(m.estadoCivil) : 'Não Informado';
            contagem[estado] = (contagem[estado] || 0) + 1;
        });

        criarGrafico('grafico-estado-civil', 'pie', {
            labels: Object.keys(contagem),
            datasets: [{
                label: 'Estado Civil',
                data: Object.values(contagem),
                backgroundColor: [CORES_BASE[0], CORES_BASE[1], CORES_BASE[2], CORES_BASE[3], CORES_BASE[6]],
                borderColor: '#fff',
                borderWidth: 2
            }]
        }, {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'top' } }
        });
    }

    function criarGraficoAniversariantesPorMes(membros) {
        const contagemPorMes = Array(12).fill(0);
        membros.forEach(m => {
            if (m.dataNascimento) {
                const mes = new Date(m.dataNascimento).getMonth(); // 0 = Janeiro, 11 = Dezembro
                contagemPorMes[mes]++;
            }
        });

        const labels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

        criarGrafico('grafico-aniversariantes-mes', 'bar', {
            labels: labels,
            datasets: [{
                label: 'Nº de Aniversariantes',
                data: contagemPorMes,
                backgroundColor: CORES_BASE[5]
            }]
        }, {
            responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }
        });
    }

    function criarGraficoMinisterios(membros) {
        const contagem = {};
        membros.filter(m => m.temMinisterio === 'sim').forEach(m => {
            const nomeMinisterio = m.ministerio === 'outro' ? m.nomeOutroMinisterio : m.ministerio;
            if (nomeMinisterio) {
                const ministerioCapitalizado = capitalizar(nomeMinisterio);
                contagem[ministerioCapitalizado] = (contagem[ministerioCapitalizado] || 0) + 1;
            }
        });
        const labels = Object.keys(contagem);
        const data = Object.values(contagem);
        const coresDoGrafico = [];
        for (let i = 0; i < labels.length; i++) {
            if (i < CORES_BASE.length) {
                coresDoGrafico.push(CORES_BASE[i]);
            } else {
                coresDoGrafico.push(geradorDeCor());
            }
        }
        criarGrafico('grafico-ministerios', 'polarArea', {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: coresDoGrafico
            }]
        }, {
            responsive: true,
            maintainAspectRatio: false
        });
    }
    
    function criarGraficoCrescimento(membros) {
        const cadastrosPorMes = {};
        membros.forEach(m => {
            if (m.dataCadastro) {
                const data = new Date(m.dataCadastro);
                const mesAno = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`;
                cadastrosPorMes[mesAno] = (cadastrosPorMes[mesAno] || 0) + 1;
            }
        });

        const labelsOrdenados = Object.keys(cadastrosPorMes).sort();
        
        if (labelsOrdenados.length < 2) {
            const container = document.getElementById('grafico-crescimento').parentElement;
            container.innerHTML = `<div class="mensagem-grafico-vazio">
                É necessário ter membros cadastrados em pelo menos 2 meses diferentes para exibir o gráfico de crescimento.
            </div>`;
            return;
        }
        
        let totalAcumulado = 0;
        const dadosAcumulados = labelsOrdenados.map(mes => {
            totalAcumulado += cadastrosPorMes[mes];
            return totalAcumulado;
        });
        
        const labelsFormatados = labelsOrdenados.map(mesAno => {
            const [ano, mes] = mesAno.split('-');
            const nomeMes = new Date(ano, mes - 1).toLocaleString('pt-BR', { month: 'short' });
            return `${capitalizar(nomeMes)}/${ano.slice(2)}`;
        });

        criarGrafico('grafico-crescimento', 'line', {
            labels: labelsFormatados,
            datasets: [{
                label: 'Total de Membros',
                data: dadosAcumulados,
                borderColor: CORES_BASE[4],
                backgroundColor: 'rgba(255, 205, 86, 0.2)',
                fill: true,
                tension: 0.3
            }]
        }, {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } }
        });
    }

    async function criarGraficoFrequenciaPorPerfil() {
        try {
            // Busca presenças de membros e visitantes
            const [presencasMembros, presencasVisitantes] = await Promise.all([
                window.api.get('/api/presencas-membros'),
                window.api.get('/api/presencas')
            ]);

            const totalCultos = new Set([...presencasMembros.map(p => p.data), ...presencasVisitantes.map(p => p.data)]).size;

            if (totalCultos === 0) {
                document.getElementById('grafico-frequencia-perfil').parentElement.innerHTML = '<div class="mensagem-grafico-vazio">Sem dados de presença para análise.</div>';
                return;
            }

            const calcularMediaMembros = (presencas) => {
                const total = presencas.reduce((sum, p) => sum + p.membros.length, 0);
                return total / totalCultos;
            };

            const mediaMembros = calcularMediaMembros(presencasMembros);
            
            const calcularMediaVisitantes = (presencas) => {
                const total = presencas.reduce((sum, p) => sum + p.visitantes.length, 0);
                return total / totalCultos;
            };
            const mediaVisitantes = calcularMediaVisitantes(presencasVisitantes);

            criarGrafico('grafico-frequencia-perfil', 'bar', {
                labels: ['Membros', 'Visitantes'],
                datasets: [{
                    label: 'Média de Frequência por Culto',
                    data: [mediaMembros.toFixed(1), mediaVisitantes.toFixed(1)],
                    backgroundColor: [CORES_BASE[0], CORES_BASE[1]],
                }]
            }, {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true, title: { display: true, text: 'Pessoas por Culto' } } }
            });

        } catch (error) {
            console.error("Erro ao criar gráfico de frequência:", error);
            document.getElementById('grafico-frequencia-perfil').parentElement.innerHTML = '<div class="mensagem-grafico-vazio">Erro ao carregar dados de frequência.</div>';
        }
    }

    function atualizarDashboard(membros) {
        atualizarResumo(membros);
        criarGraficoGenero(membros);
        criarGraficoFaixaEtaria(membros);
        criarGraficoCargos(membros);
        criarGraficoAniversariantesPorMes(membros);
        criarGraficoEstadoCivil(membros); // Adicionada a chamada para o novo gráfico
        criarGraficoMinisterios(membros);
        criarGraficoCrescimento(membros);
        criarGraficoFrequenciaPorPerfil();
    }

    function adicionarEventosAosCards() {
        document.getElementById('card-total-membros').addEventListener('click', () => { document.getElementById('grafico-genero').scrollIntoView({ behavior: 'smooth', block: 'center' }); });
        document.getElementById('card-media-idade').addEventListener('click', () => { document.getElementById('grafico-faixa-etaria').scrollIntoView({ behavior: 'smooth', block: 'center' }); });
        document.getElementById('card-total-ministerios').addEventListener('click', () => { document.getElementById('grafico-ministerios').scrollIntoView({ behavior: 'smooth', block: 'center' }); });
        document.getElementById('card-proximo-aniversariante').addEventListener('click', () => { mostrarModalAniversariantes(); });
    }

    // --- LÓGICA DE FILTRAGEM ---
    function aplicarFiltrosEAtualizar() {
        const genero = filtroGenero.value;
        const faixaEtaria = filtroFaixaEtaria.value;
        const estadoCivil = filtroEstadoCivil.value;

        let membrosFiltrados = todosOsMembros;

        if (genero) {
            membrosFiltrados = membrosFiltrados.filter(m => m.genero === genero);
        }

        if (estadoCivil) {
            membrosFiltrados = membrosFiltrados.filter(m => m.estadoCivil === estadoCivil);
        }

        if (faixaEtaria) {
            const [min, max] = faixaEtaria.split('-').map(Number);
            membrosFiltrados = membrosFiltrados.filter(m => {
                const idade = calcularIdade(m.dataNascimento);
                if (idade === null) return false;
                if (faixaEtaria === '60+') return idade >= 60;
                return idade >= min && idade <= max;
            });
        }

        atualizarDashboard(membrosFiltrados);
    }

    function limparFiltros() {
        filtroGenero.value = '';
        filtroFaixaEtaria.value = '';
        filtroEstadoCivil.value = '';
        aplicarFiltrosEAtualizar();
    }

    function adicionarEventListenersFiltros() {
        filtroGenero.addEventListener('change', aplicarFiltrosEAtualizar);
        filtroFaixaEtaria.addEventListener('change', aplicarFiltrosEAtualizar);
        filtroEstadoCivil.addEventListener('change', aplicarFiltrosEAtualizar);
        btnLimparFiltros.addEventListener('click', limparFiltros);
    }

    async function iniciar() {
        injetarCSSModal();
        prepararCanvasWrapper('grafico-genero');
        prepararCanvasWrapper('grafico-faixa-etaria');
        prepararCanvasWrapper('grafico-cargos');
        prepararCanvasWrapper('grafico-aniversariantes-mes');
        prepararCanvasWrapper('grafico-estado-civil'); // Adicionado
        prepararCanvasWrapper('grafico-ministerios');
        prepararCanvasWrapper('grafico-frequencia-perfil');
        try {
            todosOsMembros = await window.api.get('/api/membros');
            if (todosOsMembros.length === 0) {
                document.querySelector('.dashboard-resumo').innerHTML = '<p>Nenhum membro cadastrado para análise.</p>';
                return;
            }
            atualizarDashboard(todosOsMembros);
            adicionarEventosAosCards();
            adicionarEventListenersFiltros(); // Adiciona os listeners para os filtros
        } catch (error) {
            console.error('Falha ao carregar e processar dados:', error);
            document.querySelector('.conteudo').innerHTML = '<h1>Erro ao carregar dados. Verifique a conexão com o servidor.</h1>';
        }
    }
    
    iniciar();
});