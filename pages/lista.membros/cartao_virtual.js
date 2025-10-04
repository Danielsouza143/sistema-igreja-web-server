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
            // Carrega as configurações globais primeiro para obter o nome e logo da igreja
            const configs = await window.api.get('/api/configs');
            const identidade = configs.identidade || {};
            document.getElementById('nome-igreja').textContent = identidade.nomeIgreja || 'Igreja';
            if (identidade.logoIgrejaUrl) {
                document.getElementById('logo-igreja').src = window.api.getImageUrl(identidade.logoIgrejaUrl);
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