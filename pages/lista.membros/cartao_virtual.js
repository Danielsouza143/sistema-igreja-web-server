document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const membroId = urlParams.get('id');

    const cardEl = document.getElementById('virtual-card');
    const errorEl = document.getElementById('error-message');

    const showError = (message) => {
        cardEl.style.display = 'none';
        errorEl.textContent = message;
        errorEl.style.display = 'block';
    };

    if (!membroId) {
        showError('ID do membro não fornecido. O link pode estar quebrado.');
        return;
    }

    const loadCardData = async () => {
        try {
            // CORREÇÃO: A rota de configs é protegida. Usaremos a rota pública de setup-status que também tem o nome.
            // Ou, melhor ainda, vamos buscar as configs pelo menu.js que já faz isso.
            // A forma mais simples é buscar as configs aqui, mas a rota precisa ser pública ou usar um token.
            // Por simplicidade, vamos assumir que o menu.js já carregou o nome.
            // Se não, a melhor prática seria ter uma rota pública para configs básicas.
            // Vamos usar a rota de setup que é pública.
            const status = await window.api.get('/api/auth/setup-status');
            if (status.churchName) {
                document.getElementById('nome-igreja').textContent = status.churchName;
            }

            // Busca os dados públicos do membro
            const membro = await window.api.get(`/api/public/membro/${membroId}`);

            // Popula o cartão
            document.title = `Cartão Virtual - ${membro.nome}`;
            document.getElementById('member-name').textContent = membro.nome;
            document.getElementById('member-role').textContent = membro.cargoEclesiastico ? membro.cargoEclesiastico.charAt(0).toUpperCase() + membro.cargoEclesiastico.slice(1) : 'Membro';
            
            const dataMembro = membro.dataCadastro || membro.dataConversao;
            document.getElementById('member-since').textContent = dataMembro ? new Date(dataMembro).toLocaleDateString('pt-BR') : 'Não informado';

            const photoEl = document.getElementById('member-photo');
            if (membro.foto) {
                photoEl.style.backgroundImage = `url(${window.api.getImageUrl(membro.foto)})`;
                photoEl.innerHTML = ''; // Remove o ícone
            }

            // Gera o QR Code que aponta para a própria página
            generateQRCode(window.location.href, document.getElementById('qr-code'));

        } catch (error) {
            console.error('Erro ao carregar dados:', error);
            showError(error.message || 'Não foi possível carregar os dados do membro.');
        }
    };

    const generateQRCode = (url, container) => {
        if (!container) return;
        container.innerHTML = '';
        try {
            const qr = qrcode(0, 'L');
            qr.addData(url);
            qr.make();
            container.innerHTML = qr.createImgTag(4, 4);
        } catch (e) {
            console.error('Erro ao gerar QR Code:', e);
            container.innerHTML = 'Erro QR';
        }
    };

    loadCardData();
});