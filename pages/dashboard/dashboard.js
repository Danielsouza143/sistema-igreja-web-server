document.addEventListener('DOMContentLoaded', () => {
    
    // --- FUNÇÕES AUXILIARES ---
    const formatarDataSimples = (dataStr) => new Date(dataStr).toLocaleDateString('pt-BR', { timeZone: 'UTC', day: '2-digit', month: '2-digit' });
    const formatarDinheiro = (valor) => (valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    // --- RENDERIZAÇÃO DOS WIDGETS ---

    function renderizarBoasVindas() {
        const hoje = new Date();
        const dataFormatada = hoje.toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        document.getElementById('data-atual').textContent = dataFormatada.charAt(0).toUpperCase() + dataFormatada.slice(1);
    }
    
    function renderizarProximosEventos(eventos) {
        const container = document.getElementById('widget-eventos');
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);

        const proximos = eventos
            .filter(e => new Date(e.dataFim) >= hoje)
            .sort((a, b) => new Date(a.dataInicio) - new Date(b.dataInicio))
            .slice(0, 3); // Pega os 3 próximos

        if (proximos.length === 0) {
            container.innerHTML = '<p class="sem-itens">Nenhum evento futuro cadastrado.</p>';
            return;
        }

        container.innerHTML = proximos.map(e => `
            <div class="lista-item">
                <span class="item-principal">${e.nome}</span>
                <span class="item-detalhe">${formatarDataSimples(e.dataInicio)}</span>
            </div>
        `).join('');
    }

    function renderizarAniversariantes(membros) {
        const container = document.getElementById('widget-aniversariantes');
        const hoje = new Date();
        const proximaSemana = new Date();
        proximaSemana.setDate(hoje.getDate() + 7);

        const aniversariantes = membros
            .filter(m => {
                if (!m.dataNascimento) return false;
                const niver = new Date(m.dataNascimento);
                // Normaliza o ano para o ano corrente para comparação
                const niverEsteAno = new Date(hoje.getFullYear(), niver.getMonth(), niver.getDate());
                return niverEsteAno >= hoje && niverEsteAno <= proximaSemana;
            })
            .sort((a,b) => new Date(a.dataNascimento) - new Date(b.dataNascimento))
            .slice(0, 5); // Limita a 5 para não poluir

        if (aniversariantes.length === 0) {
            container.innerHTML = '<p class="sem-itens">Nenhum aniversário na próxima semana.</p>';
            return;
        }
        
        container.innerHTML = aniversariantes.map(m => {
            const whatsappBtn = m.telefone
                ? `<a href="#" class="btn-whatsapp" data-phone="${m.telefone}" title="Enviar parabéns no WhatsApp"><i class='bx bxl-whatsapp'></i></a>`
                : '';
            return `
                <div class="lista-item">
                    <div>
                        <span class="item-principal">${m.nome.split(' ')[0]} ${m.nome.split(' ').slice(-1)}</span>
                        <span class="item-detalhe">${formatarDataSimples(m.dataNascimento)}</span>
                    </div>
                    ${whatsappBtn}
                </div>
            `;
        }).join('');

        // Adiciona o evento de clique para os botões do WhatsApp
        container.querySelectorAll('.btn-whatsapp').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const phone = btn.dataset.phone.replace(/\D/g, ''); // Remove caracteres não numéricos
                const message = encodeURIComponent(`Olá! A família Tabernáculo Celeste passa para desejar um feliz aniversário! Que Deus te abençoe grandemente. 🎉🎂`);
                const fullPhone = phone.length > 11 ? phone : `55${phone}`; // Adiciona o código do Brasil se necessário
                window.open(`https://wa.me/${fullPhone}?text=${message}`, '_blank');
            });
        });
    }
    
    function renderizarEmprestimosAtrasados(emprestimos) {
        const container = document.getElementById('widget-atrasos');
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);

        const atrasados = emprestimos
            .filter(e => e.status === 'Emprestado' && new Date(e.dataDevolucaoPrevista) < hoje)
            .slice(0, 3);

        if (atrasados.length === 0) {
            container.innerHTML = '<p class="sem-itens">Nenhum item com devolução atrasada. Ótimo trabalho!</p>';
            return;
        }

        container.innerHTML = atrasados.map(e => {
             const diasAtraso = Math.floor((hoje - new Date(e.dataDevolucaoPrevista)) / (1000 * 60 * 60 * 24));
             return `
                <div class="lista-item">
                    <span class="item-principal">${e.itemId?.nome || 'Item desconhecido'}</span>
                    <span class="item-detalhe">${diasAtraso} dias de atraso</span>
                </div>
            `
        }).join('');
    }

    function renderizarResumoFinanceiro(lancamentos) {
        const container = document.getElementById('widget-financeiro');
        const canvas = document.getElementById('grafico-resumo-financeiro');
        const hoje = new Date();
        const mesAtual = hoje.getMonth();
        const anoAtual = hoje.getFullYear();

        const lancamentosDoMes = lancamentos.filter(l => {
            const dataLancamento = new Date(l.data);
            return dataLancamento.getMonth() === mesAtual && dataLancamento.getFullYear() === anoAtual;
        });
        
        if(lancamentosDoMes.length === 0){
            container.innerHTML = '<p class="sem-itens" style="text-align: center; margin-top: 50px;">Nenhuma movimentação financeira este mês.</p>';
            return;
        }

        const totalEntradas = lancamentosDoMes.filter(l => l.tipo === 'entrada').reduce((acc, l) => acc + l.valor, 0);
        const totalSaidas = lancamentosDoMes.filter(l => l.tipo === 'saida').reduce((acc, l) => acc + l.valor, 0);

        new Chart(canvas.getContext('2d'), {
            type: 'bar',
            data: {
                labels: ['Resumo do Mês'],
                datasets: [
                    { label: 'Entradas', data: [totalEntradas], backgroundColor: '#28a745', barPercentage: 0.5 },
                    { label: 'Saídas', data: [totalSaidas], backgroundColor: '#dc3545', barPercentage: 0.5 }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom' } },
                scales: { y: { beginAtZero: true, ticks: { callback: (value) => formatarDinheiro(value) } } }
            }
        });
    }

    // --- INICIALIZAÇÃO E CARREGAMENTO DE DADOS ---
    async function carregarDashboard() {
        renderizarBoasVindas();
        try {
            // CORREÇÃO: Usar window.api e corrigir endpoint de empréstimos
            const [membros, eventos, emprestimos, lancamentos] = await Promise.all([
                window.api.get('/api/membros'),
                window.api.get('/api/eventos'),
                window.api.get('/api/utensilios/emprestimos'),
                window.api.get('/api/financeiro/lancamentos')
            ]);
            
            // Agora renderiza cada widget com os dados carregados
            renderizarProximosEventos(eventos);
            renderizarAniversariantes(membros);
            renderizarEmprestimosAtrasados(emprestimos);
            renderizarResumoFinanceiro(lancamentos);

        } catch (error) {
            console.error(error);
            document.querySelector('.dashboard-grid').innerHTML = '<p style="color: red; text-align: center;">Não foi possível carregar os dados do painel. Verifique a conexão com o servidor.</p>';
        }
    }
    
    // --- EVENT LISTENERS PARA AÇÕES RÁPIDAS ---
    document.getElementById('btn-add-membro').addEventListener('click', () => window.location.href = '../cadastro.page/cadastro.html');
    document.getElementById('btn-add-lancamento').addEventListener('click', () => window.location.href = '../financeiro.page/financeiro.html');
    document.getElementById('btn-add-evento').addEventListener('click', () => window.location.href = '../eventos/eventos.html');
    document.getElementById('btn-add-emprestimo').addEventListener('click', () => window.location.href = '../utensilios/utensilios.html');
    document.getElementById('btn-registrar-presenca').addEventListener('click', () => window.location.href = '../lista.membros/lista.membros.html');

    // Inicia tudo
    carregarDashboard();
});