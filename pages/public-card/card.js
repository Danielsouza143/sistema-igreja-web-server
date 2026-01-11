document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const container = document.getElementById('card-container');
    const loader = document.getElementById('loader');
    const errorMsg = document.getElementById('error-msg');
    const actions = document.getElementById('actions');

    // URLs base da API (Tenta detectar ambiente)
    const API_BASE_URL = window.location.hostname === 'localhost' 
        ? 'http://localhost:8080/api' 
        : '/api'; // Em produção (Render), usa caminho relativo ou o domínio configurado

    if (!token) {
        showError('Token de identificação não encontrado.');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/public/member-card/${token}`);
        
        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.message || 'Erro ao carregar cartão.');
        }

        const data = await response.json();
        renderCard(data);
        
    } catch (error) {
        console.error(error);
        showError(error.message);
    }

    function showError(msg) {
        loader.style.display = 'none';
        errorMsg.textContent = msg;
        errorMsg.style.display = 'block';
    }

    function renderCard(membro) {
        // Configura cores do tema
        const corPrimaria = membro.igreja.corPrimaria || '#1a2a4c';
        const corSecundaria = membro.igreja.corSecundaria || '#f0a500';
        
        // Aplica variáveis CSS dinamicamente ao container
        container.style.setProperty('--card-bg', corPrimaria);
        container.style.setProperty('--card-text', '#ffffff'); // Texto branco padrão para fundo escuro

        // Formatação de datas
        const formatDate = (dateStr) => {
            if (!dateStr) return '---';
            const date = new Date(dateStr);
            return date.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
        };

        // Validade (Ex: 31/Dez do ano de cadastro ou atual)
        const anoEmissao = membro.dataCadastro ? new Date(membro.dataCadastro).getFullYear() : new Date().getFullYear();
        const validade = `31/12/${anoEmissao}`;

        // HTML do Cartão
        const logoHtml = membro.igreja.logoUrl 
            ? `<img src="${membro.igreja.logoUrl}" class="logo" alt="Logo">`
            : `<i class='bx bxs-church' style="font-size: 50px; margin-bottom: 10px;"></i>`;

        const fotoStyle = membro.fotoUrl ? `background-image: url('${membro.fotoUrl}')` : '';
        const fotoIcon = !membro.fotoUrl ? `<i class='bx bxs-user'></i>` : '';

        container.innerHTML = `
            <div class="virtual-card">
                <div class="virtual-card-header">
                    ${logoHtml}
                    <h3>${membro.igreja.nome}</h3>
                </div>

                <div class="status-badge">Membro Ativo</div>

                <div class="member-photo-container" style="${fotoStyle}">
                    ${fotoIcon}
                </div>

                <h2 class="member-name">${membro.nome}</h2>
                <p class="member-role">${membro.cargo}</p>

                <div class="info-grid">
                    <div class="info-item">
                        <p>Membro Desde</p>
                        <span>${formatDate(membro.dataCadastro)}</span>
                    </div>
                    <div class="info-item">
                        <p>Nascimento</p>
                        <span>${formatDate(membro.dataNascimento)}</span>
                    </div>
                    <div class="info-item">
                        <p>Estado Civil</p>
                        <span>${membro.estadoCivil || '---'}</span>
                    </div>
                    <div class="info-item">
                        <p>Validade</p>
                        <span>${validade}</span>
                    </div>
                </div>

                <div class="card-footer">
                    <p>Documento de identificação eclesiástica.</p>
                </div>
            </div>
        `;

        loader.style.display = 'none';
        container.style.display = 'block';
        actions.style.display = 'flex';
    }
});
