const iniciarDashboard = () => {
    
    // --- FUNÇÕES AUXILIARES ---
    const formatarDataSimples = (dataStr) => new Date(dataStr).toLocaleDateString('pt-BR', { timeZone: 'UTC', day: '2-digit', month: '2-digit' });
    const formatarDinheiro = (valor) => (valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    // --- ESTADO LOCAL ---
    let chartFinanceiro = null;
    let chartFundoDetalhe = null;
    let dadosLancamentos = [];
    let todosMembros = [];
    let financeiroOculto = true;
    
    // Estado Eventos
    let todosEventosFuturos = [];
    let viewModeEventos = 'list'; 
    let eventoCarouselInterval = null;

    // --- RENDERIZAÇÃO DOS WIDGETS ---

    function renderizarBoasVindas() {
        const hoje = new Date();
        const dataFormatada = hoje.toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        document.getElementById('data-atual').textContent = dataFormatada.charAt(0).toUpperCase() + dataFormatada.slice(1);
    }
    
    function processarEventos(eventos) {
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);

        todosEventosFuturos = eventos
            .filter(e => new Date(e.dataFim) >= hoje)
            .sort((a, b) => new Date(a.dataInicio) - new Date(b.dataInicio));

        const mesAtual = hoje.getMonth();
        const anoAtual = hoje.getFullYear();
        
        // Verifica se há cartazes neste mês para definir o padrão
        const eventosComCartazMes = todosEventosFuturos.filter(e => {
            const d = new Date(e.dataInicio);
            return d.getMonth() === mesAtual && d.getFullYear() === anoAtual && e.cartazUrl;
        });

        if (eventosComCartazMes.length > 0) {
            viewModeEventos = 'carousel';
        } else {
            viewModeEventos = 'list';
        }

        atualizarViewEventos();
    }

    function atualizarViewEventos() {
        const container = document.getElementById('widget-eventos');
        const btnList = document.getElementById('btn-view-list');
        const btnCarousel = document.getElementById('btn-view-carousel');

        btnList.classList.toggle('active', viewModeEventos === 'list');
        btnCarousel.classList.toggle('active', viewModeEventos === 'carousel');

        if (eventoCarouselInterval) clearInterval(eventoCarouselInterval);

        if (viewModeEventos === 'list') {
            container.classList.remove('carousel-mode');
            container.classList.add('scrollable-content');
            
            const eventosExibir = todosEventosFuturos.slice(0, 8);
            if (eventosExibir.length === 0) {
                container.innerHTML = '<p class="sem-itens">Nenhum evento futuro cadastrado.</p>';
            } else {
                container.innerHTML = eventosExibir.map(e => `
                    <div class="lista-item">
                        <span class="item-principal">${e.nome}</span>
                        <span class="item-detalhe">${formatarDataSimples(e.dataInicio)}</span>
                    </div>
                `).join('');
            }
        } else {
            // MODO CARROSSEL DE CARTAZES
            container.classList.add('carousel-mode');
            container.classList.remove('scrollable-content');
            
            const hoje = new Date();
            const mesAtual = hoje.getMonth();
            const anoAtual = hoje.getFullYear();

            const eventosComCartaz = todosEventosFuturos.filter(e => {
                const d = new Date(e.dataInicio);
                return d.getMonth() === mesAtual && d.getFullYear() === anoAtual && e.cartazUrl;
            });

            if(eventosComCartaz.length === 0) {
                // CORREÇÃO DA COR DE FUNDO VAZIA
                container.innerHTML = '<div style="display:flex; justify-content:center; align-items:center; width:100%; height:100%;"><p class="sem-itens" style="color: #888; padding: 20px;">Nenhum cartaz para os eventos deste mês.</p></div>';
                return;
            }

            container.innerHTML = `
                <div class="eventos-carousel" id="eventos-carousel-wrapper">
                    <button class="ec-btn prev" id="btn-ec-prev"><i class='bx bx-chevron-left'></i></button>
                    <div class="ec-track" id="ec-track">
                        ${eventosComCartaz.map(e => `
                            <div class="ec-slide">
                                <img src="${e.cartazUrl}" alt="${e.nome}">
                                <div class="ec-slide-info">
                                    <h4>${e.nome}</h4>
                                    <p>${formatarDataSimples(e.dataInicio)}</p>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    <button class="ec-btn next" id="btn-ec-next"><i class='bx bx-chevron-right'></i></button>
                </div>
            `;

            const track = document.getElementById('ec-track');
            const slidesCount = eventosComCartaz.length;
            let currentSlide = 0;

            const updateSlide = () => {
                track.style.transform = `translateX(-${currentSlide * 100}%)`;
            };

            document.getElementById('btn-ec-next').addEventListener('click', () => {
                currentSlide = (currentSlide + 1) % slidesCount;
                updateSlide();
            });

            document.getElementById('btn-ec-prev').addEventListener('click', () => {
                currentSlide = (currentSlide - 1 + slidesCount) % slidesCount;
                updateSlide();
            });

            // Slide Automático
            if(slidesCount > 1) {
                eventoCarouselInterval = setInterval(() => {
                    currentSlide = (currentSlide + 1) % slidesCount;
                    updateSlide();
                }, 4000);

                // Pausa no Hover
                const wrapper = document.getElementById('eventos-carousel-wrapper');
                wrapper.addEventListener('mouseenter', () => clearInterval(eventoCarouselInterval));
                wrapper.addEventListener('mouseleave', () => {
                    eventoCarouselInterval = setInterval(() => {
                        currentSlide = (currentSlide + 1) % slidesCount;
                        updateSlide();
                    }, 4000);
                });
            } else {
                document.getElementById('btn-ec-next').style.display = 'none';
                document.getElementById('btn-ec-prev').style.display = 'none';
            }
        }
    }

    // Listener dos botões de View do Evento
    document.getElementById('btn-view-list').addEventListener('click', () => {
        viewModeEventos = 'list';
        atualizarViewEventos();
    });
    document.getElementById('btn-view-carousel').addEventListener('click', () => {
        viewModeEventos = 'carousel';
        atualizarViewEventos();
    });

    function renderizarAniversariantes(membros) {
        todosMembros = membros; 
        const container = document.getElementById('widget-aniversariantes');
        const hoje = new Date();
        const proximaSemana = new Date();
        proximaSemana.setDate(hoje.getDate() + 7);

        const aniversariantes = membros
            .filter(m => {
                if (!m.dataNascimento) return false;
                const niver = new Date(m.dataNascimento);
                const niverEsteAno = new Date(hoje.getFullYear(), niver.getMonth(), niver.getDate());
                return niverEsteAno >= hoje && niverEsteAno <= proximaSemana;
            })
            .sort((a,b) => new Date(a.dataNascimento) - new Date(b.dataNascimento))
            .slice(0, 5); 

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

        container.querySelectorAll('.btn-whatsapp').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const phone = btn.dataset.phone.replace(/\D/g, ''); 
                const message = encodeURIComponent(`Olá! A família Tabernáculo Celeste passa para desejar um feliz aniversário! Que Deus te abençoe grandemente. 🎉🎂`);
                const fullPhone = phone.length > 11 ? phone : `55${phone}`; 
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
        if (lancamentos) dadosLancamentos = lancamentos;
        const container = document.getElementById('widget-financeiro');
        const canvas = document.getElementById('grafico-resumo-financeiro');
        const btnToggle = document.getElementById('btn-toggle-financeiro');
        const iconToggle = btnToggle.querySelector('i');

        const hoje = new Date();
        const mesAtual = hoje.getMonth();
        const anoAtual = hoje.getFullYear();

        // No resumo geral, excluímos movimentações de fundos para refletir o caixa
        const lancamentosCaixa = dadosLancamentos.filter(l => !l.fundoId);

        const lancamentosDoMes = lancamentosCaixa.filter(l => {
            const dataLancamento = new Date(l.data);
            return dataLancamento.getMonth() === mesAtual && dataLancamento.getFullYear() === anoAtual;
        });
        
        if(lancamentosDoMes.length === 0){
            container.innerHTML = '<p class="sem-itens" style="text-align: center; margin-top: 50px;">Nenhuma movimentação financeira neste mês.</p>';
            return;
        }

        const totalEntradas = lancamentosDoMes.filter(l => l.tipo === 'entrada').reduce((acc, l) => acc + l.valor, 0);
        const totalSaidas = lancamentosDoMes.filter(l => l.tipo === 'saida').reduce((acc, l) => acc + l.valor, 0);

        if (chartFinanceiro) chartFinanceiro.destroy();

        if (financeiroOculto) iconToggle.className = 'bx bx-show';
        else iconToggle.className = 'bx bx-hide';

        const formatarValor = (valor) => financeiroOculto ? 'R$ ****' : formatarDinheiro(valor);

        chartFinanceiro = new Chart(canvas.getContext('2d'), {
            type: 'bar',
            data: {
                labels: ['Caixa Geral (Mês)'],
                datasets: [
                    { label: 'Entradas', data: [totalEntradas], backgroundColor: '#28a745', barPercentage: 0.5 },
                    { label: 'Saídas', data: [totalSaidas], backgroundColor: '#dc3545', barPercentage: 0.5 }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { 
                    legend: { position: 'bottom' },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) label += ': ';
                                if (context.parsed.y !== null) {
                                    label += formatarValor(context.parsed.y);
                                }
                                return label;
                            }
                        }
                    }
                },
                scales: { 
                    y: { 
                        beginAtZero: true, 
                        ticks: { callback: (value) => formatarValor(value) } 
                    } 
                }
            }
        });
    }

    // ============================================================
    // CARROSSEL DE FUNDOS E METAS
    // ============================================================

    const calcularRitmoFundo = (fundo) => {
        if (!fundo.prazo) return 'Prazo não definido';
        const prazoStr = typeof fundo.prazo === 'string' ? fundo.prazo.split('T')[0] : fundo.prazo;
        const prazo = new Date(prazoStr + 'T23:59:59'); 
        const hoje = new Date();
        const diasRestantes = Math.ceil((prazo - hoje) / (1000 * 60 * 60 * 24));
        const faltante = (fundo.meta || 0) - Math.max(fundo.arrecadado || 0, 0);
        
        if (faltante <= 0) return 'Meta atingida! Parabéns!';
        if (diasRestantes <= 0) return `Prazo encerrado. Faltou ${formatarDinheiro(faltante)}.`;
        
        let mesesRestantes = (prazo.getFullYear() - hoje.getFullYear()) * 12 + (prazo.getMonth() - hoje.getMonth());
        if (hoje.getDate() > prazo.getDate()) mesesRestantes--; 
        mesesRestantes = Math.max(mesesRestantes, 0); 

        if (mesesRestantes < 1) return `Faltam ${diasRestantes} dias. Falta ${formatarDinheiro(faltante)}.`;
        return `Faltam ${diasRestantes} dias. Aprox. ${formatarDinheiro(faltante / mesesRestantes)} / mês.`;
    };

    function renderizarFundosCarrossel(fundos) {
        const track = document.getElementById('widget-fundos-track');
        const dotsContainer = document.getElementById('carrossel-pontinhos-fundos');
        
        if (!fundos || fundos.length === 0) {
            track.innerHTML = '<p class="sem-itens" style="padding: 20px;">Nenhuma meta ou fundo ativo.</p>';
            if(dotsContainer) dotsContainer.innerHTML = '';
            document.getElementById('btn-prev-fundos').style.display = 'none';
            document.getElementById('btn-next-fundos').style.display = 'none';
            return;
        }

        track.innerHTML = '';
        if(dotsContainer) dotsContainer.innerHTML = '';
        
        if(fundos.length === 1) {
            document.getElementById('btn-prev-fundos').style.display = 'none';
            document.getElementById('btn-next-fundos').style.display = 'none';
        }

        fundos.forEach((fundo, index) => {
            const meta = fundo.meta || 1;
            const arrecadado = Math.max(fundo.arrecadado || 0, 0);
            const porcentagemNum = Math.min((arrecadado / meta) * 100, 100);
            const porcentagem = porcentagemNum.toFixed(1);
            
            const cardStatusClass = porcentagemNum >= 100 ? 'meta-concluida' : 'meta-andamento';
            const badgeClass = porcentagemNum >= 100 ? 'badge-concluido' : 'badge-andamento';
            const statusText = porcentagemNum >= 100 ? 'Concluído' : 'Em Andamento';
            const ritmoTexto = calcularRitmoFundo(fundo);

            // Cria o wrapper que garante os 100% de largura
            const wrapper = document.createElement('div');
            wrapper.className = 'card-fundo-wrapper';

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
                <div class="progresso-texto">
                    <span><strong>Arrecadado:</strong> ${formatarDinheiro(fundo.arrecadado)}</span>
                </div>
                <div class="progresso-porcentagem">${porcentagem}%</div>
            `;

            card.onclick = () => abrirDetalhesFundo(fundo);
            wrapper.appendChild(card);
            track.appendChild(wrapper);
            
            if(fundos.length > 1 && dotsContainer) {
                const dot = document.createElement('div');
                dot.className = `carrossel-dot ${index === 0 ? 'active' : ''}`;
                dotsContainer.appendChild(dot);
            }
        });

        if(fundos.length > 1 && dotsContainer) {
            track.addEventListener('scroll', () => {
                const cardWidth = track.clientWidth; 
                const scrollPos = track.scrollLeft;
                const activeIndex = Math.round(scrollPos / cardWidth);
                
                document.querySelectorAll('#carrossel-pontinhos-fundos .carrossel-dot').forEach((dot, idx) => {
                    dot.classList.toggle('active', idx === activeIndex);
                });
            });
        }
    }

    // Modal de Detalhes do Fundo
    const abrirDetalhesFundo = (fundo) => {
        const modalDetalhesFundo = document.getElementById('modal-detalhes-fundo');
        if(!modalDetalhesFundo) return;

        document.getElementById('fundo-titulo-detalhe').textContent = fundo.nome;
        document.getElementById('fundo-valor-arrecadado').textContent = formatarDinheiro(fundo.arrecadado);
        document.getElementById('fundo-valor-meta').textContent = formatarDinheiro(fundo.meta);
        const porcentagem = ((fundo.arrecadado / (fundo.meta || 1)) * 100).toFixed(1);
        document.getElementById('fundo-porcentagem').textContent = `${porcentagem}%`;

        const lancamentosDoFundo = dadosLancamentos.filter(l => l.fundoId === fundo._id);
        const tabela = document.getElementById('tabela-fundo-lancamentos');
        
        if(tabela) {
            if(lancamentosDoFundo.length > 0) {
                tabela.innerHTML = lancamentosDoFundo.map(l => {
                    const membroNome = l.membroId ? (todosMembros.find(m => m._id === l.membroId)?.nome || 'Anônimo') : 'Caixa Geral (Transferência)';
                    return `<tr>
                            <td style="padding: 10px;">${formatarDataSimples(l.data)}</td>
                            <td style="padding: 10px;">${membroNome}</td>
                            <td style="padding: 10px; color: ${l.tipo === 'entrada' ? '#28a745' : '#dc3545'}; font-weight: bold;">
                                ${l.tipo === 'entrada' ? '+' : '-'} ${formatarDinheiro(l.valor)}
                            </td>
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
        if (chartFundoDetalhe) chartFundoDetalhe.destroy();

        const ctx = canvas.getContext('2d');
        const dadosPorMes = Array(12).fill(0);
        
        lancamentos.forEach(l => {
            const mes = new Date(l.data).getUTCMonth();
            if(l.tipo === 'entrada') dadosPorMes[mes] += l.valor;
            else dadosPorMes[mes] -= l.valor; 
        });

        chartFundoDetalhe = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
                datasets: [{ label: 'Arrecadação Mensal', data: dadosPorMes, borderColor: '#28a745', backgroundColor: 'rgba(40, 167, 69, 0.2)', fill: true, tension: 0.3 }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    };

    // Controle de Fechamento do Modal Fundo
    document.addEventListener('click', (e) => {
        if (e.target.matches('.modal-overlay') || e.target.closest('[data-close-modal="fundo"]')) {
            const modalFundo = document.getElementById('modal-detalhes-fundo');
            if (modalFundo) modalFundo.style.display = 'none';
        }
    });

    // Ações das Setas do Carrossel (Pula exatamente a largura do container)
    const btnPrev = document.getElementById('btn-prev-fundos');
    const btnNext = document.getElementById('btn-next-fundos');
    if(btnPrev && btnNext) {
        btnPrev.addEventListener('click', () => {
            const track = document.getElementById('widget-fundos-track');
            track.scrollBy({ left: -(track.clientWidth), behavior: 'smooth' });
        });
        btnNext.addEventListener('click', () => {
            const track = document.getElementById('widget-fundos-track');
            track.scrollBy({ left: (track.clientWidth), behavior: 'smooth' });
        });
    }

    // --- EVENT LISTENERS GERAIS ---
    document.getElementById('btn-toggle-financeiro').addEventListener('click', () => {
        financeiroOculto = !financeiroOculto;
        renderizarResumoFinanceiro();
    });

    // --- INICIALIZAÇÃO E CARREGAMENTO DE DADOS ---
    async function carregarDashboard() {
        renderizarBoasVindas();
        try {
            const [membros, eventos, emprestimos, lancamentos, fundos] = await Promise.all([
                window.api.get('/api/membros'),
                window.api.get('/api/eventos'),
                window.api.get('/api/utensilios/emprestimos'),
                window.api.get('/api/financeiro/lancamentos'),
                window.api.get('/api/financeiro/fundos')
            ]);
            
            processarEventos(eventos);
            renderizarFundosCarrossel(fundos);
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
    document.getElementById('btn-add-evento').addEventListener('click', () => window.location.href = '../agenda/agenda.html');
    document.getElementById('btn-add-emprestimo').addEventListener('click', () => window.location.href = '../utensilios/utensilios.html');

    carregarDashboard();
};

document.addEventListener('DOMContentLoaded', iniciarDashboard);
document.body.addEventListener('htmx:afterSwap', iniciarDashboard);
if (document.readyState !== 'loading') iniciarDashboard();
