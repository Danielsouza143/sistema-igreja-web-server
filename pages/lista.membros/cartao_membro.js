document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const membroId = urlParams.get('id');
    let currentMember = null;
    let allMembers = [];
    let presets = {};
    let customBackgrounds = [];
    // A identidade agora será carregada do localStorage, que é mantido atualizado pelo menu.js
    let churchIdentity = JSON.parse(localStorage.getItem('churchIdentity')) || { nomeIgreja: 'Igreja', logoUrl: '' };
    let cropper;
 
    const $ = (selector) => {
        const element = document.querySelector(selector);
        if (!element) {
            console.error(`Element with selector "${selector}" not found.`);
        }
        return element;
    };
    const $$ = (selector) => document.querySelectorAll(selector);

    // --- INITIALIZATION ---
    const init = async () => {
        loadPresets();
        loadCustomBackgrounds();
        attachEventListeners();
        
        // Configura texto padrão baseado no Tenant (Sede vs Filial)
        try {
            const tenant = await window.api.get('/api/tenants/me');
            const inputCongregacao = $('#congregacao-text');
            
            // Só define o padrão se o usuário não estiver carregando um preset salvo específico que sobrescreve isso
            // (A lógica de preset roda depois, então aqui definimos o 'default' do input)
            if (tenant) {
                // Verifica se é Sede (tenantType 'sede')
                if (tenant.tenantType === 'sede') {
                    inputCongregacao.value = 'CONGREGAÇÃO SEDE';
                } else {
                    // É filial, tenta pegar o nome do parentTenant
                    const nomeSede = tenant.parentTenant?.name || tenant.name || 'CONGREGAÇÃO';
                    inputCongregacao.value = nomeSede.toUpperCase();
                }
            }
        } catch (error) {
            console.warn('Não foi possível obter detalhes do tenant para texto padrão do cartão:', error);
        }

        if (membroId) {
          try {
            const membro = await window.api.get(`/api/membros/${membroId}`);
            currentMember = membro;
            populateCardViews(membro); // Renderiza o cartão com a identidade já carregada
            
            const lastPresetName = localStorage.getItem('card-last-preset');
            const presetToLoad = (lastPresetName && presets[lastPresetName]) ? presets[lastPresetName] : presets[Object.keys(presets)[0]] || {};
            applyPreset(presetToLoad);
            if (lastPresetName && presets[lastPresetName]) {
                $('#preset-load').value = lastPresetName;
            }
          } catch (error) {
              console.error('Erro ao carregar dados do membro:', error);
              showError('Erro ao carregar dados do membro.');
          }
        } else {
            showError('Nenhum membro selecionado. Volte para a lista e escolha um membro.');
        }
    };

    // --- ATUALIZAÇÃO DE IDENTIDADE EM TEMPO REAL ---
    window.addEventListener('storage', (event) => {
        if (event.key === 'churchIdentity') {
            console.log('Identidade da igreja atualizada em outra aba. Atualizando cartão...');
            churchIdentity = JSON.parse(event.newValue);
            if (currentMember) {
                populateCardViews(currentMember); // Redesenha o cartão com os novos dados
            }
        }
    });

    // --- CARD HTML GENERATION ---
    const createCardHTML = (membro, type, cardOptions) => {
        const fields = getMemberFields(membro);
        const photoUrl = membro.fotoUrl;
        const photoStyle = photoUrl ? `background-image: url(${photoUrl})` : '';
        const photoContent = !photoUrl ? `<i class='bx bxs-user'></i>` : '';
        const qrCodeId = `qr-code-${type}-${membro._id}`;
        const logoFinalUrl = churchIdentity.logoIgrejaUrl || '';
        const congregationText = cardOptions?.congregationText || 'CONGREGAÇÃO SEDE';
        const showCongregation = cardOptions?.congregationVisible !== false; // Default true
        const congregationStyle = showCongregation ? '' : 'display: none;';

        if (type === 'front') {
            return `
                <div class="card-bg-shapes">
                    <div class="shape1"></div>
                    <div class="shape2"></div>
                    <img src="${logoFinalUrl}" alt="Logo Watermark" class="watermark-logo">
                </div>
                <div class="card-header-new">
                    <img src="${logoFinalUrl}" alt="Logo" class="header-logo-new">
                    <div class="church-info-new">
                        <h3>${churchIdentity.nomeIgreja}</h3>
                        <p style="${congregationStyle}">${congregationText}</p>
                    </div>
                </div>
                <div class="card-body-new">
                    <div class="member-photo-new" style="${photoStyle}">${photoContent}</div>
                    <div class="member-details-new">
                        <h2 class="member-name-new">${fields['member-name']}</h2>
                        <p class="member-role-new">${fields['member-role']}</p>
                        <div class="member-info-grid-new">
                            <p><span>RG:</span> ${fields['member-rg']}</p>
                            <p><span>CPF:</span> ${fields['member-cpf']}</p>
                            <p><span>VALIDADE:</span> ${fields['card-validity']}</p>
                        </div>
                    </div>
                </div>
            `;
        }

        if (type === 'back') {
            return `
                <div class="card-back-top-bar"></div>
                <div class="card-body-back">
                    <div class="member-info-back">
                        <p><strong>Nascimento:</strong> <span>${fields['member-birthdate']}</span></p>
                        <p><strong>Estado Civil:</strong> <span>${fields['member-marital-status']}</span></p>
                        <p><strong>Batismo:</strong> <span>${fields['member-baptism-date']}</span></p>
                        <p><strong>Filiação:</strong> <span class="filiacao-text">${fields['member-parentage']}</span></p>
                    </div>
                    <div class="qr-code-container" id="${qrCodeId}"></div>
                </div>
                <div class="card-back-signatures">
                    <div class="signature-line"><span>Assinatura do Membro</span></div>
                    <div class="signature-line"><span>Assinatura do Pastor</span></div>
                </div>
                <div class="card-back-footer">
                    <p>Este cartão é pessoal, intransferível e propriedade da ${churchIdentity.nomeIgreja}.</p>
                </div>
            `;
        }
    };

    const getCardOptions = () => {
        const btnToggle = $('#btn-toggle-congregation');
        const isHidden = btnToggle && btnToggle.classList.contains('hidden-state');
        return {
            congregationText: $('#congregacao-text').value.trim(),
            congregationVisible: !isHidden
        };
    };

    // O resto do arquivo permanece o mesmo...
    // --- DATA POPULATION ---
    const populateCardViews = (membro) => {
        const cardOptions = getCardOptions();
        
        // 1. Gera o HTML do Cartão Físico (Front e Back) - Mantém lógica existente
        $('#card-front').innerHTML = createCardHTML(membro, 'front', cardOptions);
        $('#card-back').innerHTML = createCardHTML(membro, 'back', cardOptions);

        // 2. Gera o HTML do Cartão Virtual (Dinâmico para evitar erros de ID e manter consistência com public card)
        const fields = getMemberFields(membro);
        const logoFinalUrl = churchIdentity.logoIgrejaUrl || '';
        const congregationText = cardOptions?.congregationText || 'CONGREGAÇÃO SEDE';
        const showCongregation = cardOptions?.congregationVisible !== false;
        
        // Logo
        const logoHtml = logoFinalUrl 
            ? `<img src="${logoFinalUrl}" class="logo" alt="Logo">`
            : `<i class='bx bxs-church' style="font-size: 50px; margin-bottom: 10px;"></i>`;

        // Foto
        const photoUrl = membro.fotoUrl;
        const photoStyle = photoUrl ? `background-image: url('${photoUrl}')` : '';
        const photoIcon = !photoUrl ? `<i class='bx bxs-user'></i>` : '';

        // Template do Cartão Virtual (Idêntico ao card.js público)
        const virtualCardHTML = `
            <div class="virtual-card-header">
                ${logoHtml}
                <h3>${churchIdentity.nomeIgreja}</h3>
                ${showCongregation ? `<p style="font-size: 0.7rem; opacity: 0.8; margin-top: 2px;">${congregationText}</p>` : ''}
            </div>

            <div id="member-photo-virtual" style="${photoStyle}">
                ${photoIcon}
            </div>

            <h2 id="member-name-virtual">${fields['member-name']}</h2>
            <p id="member-role-virtual">${fields['member-role']}</p>

            <div class="virtual-card-info-grid">
                <p><span>RG</span><span>${fields['member-rg']}</span></p>
                <p><span>CPF</span><span>${fields['member-cpf']}</span></p>
                <p><span>Nascimento</span><span>${fields['member-birthdate']}</span></p>
                <p><span>Estado Civil</span><span>${fields['member-marital-status']}</span></p>
            </div>

            <div id="qr-code-virtual"></div>

            <div class="virtual-card-footer">
                <p>Validade: ${fields['card-validity']}</p>
            </div>
        `;

        // Injeta o HTML no container do cartão virtual
        const virtualCardContainer = $('#virtual-card');
        if (virtualCardContainer) {
            virtualCardContainer.innerHTML = virtualCardHTML;
        }

        // 3. Gera QR Codes
        // URL Pública para o QR Code (Token Seguro)
        const token = membro.cardToken; 
        const publicCardUrl = token 
            ? `${window.location.origin}/pages/public-card/card.html?token=${token}`
            : `${window.location.origin}/pages/public-card/card.html?error=missing_token`;

        console.log('[DEBUG] QR Code:', { nome: membro.nome, token, url: publicCardUrl });

        generateQRCode(publicCardUrl, $(`#qr-code-back-${membro._id}`));
        generateQRCode(publicCardUrl, $('#qr-code-virtual'));
    };
    
    const getMemberFields = (membro) => {
        const dataCadastro = new Date(membro.dataCadastro);
        const anoEmissao = dataCadastro.getFullYear();
        const validade = new Date(anoEmissao, 11, 31); // 31 de dezembro do ano de emissão

        return {
            'member-name': membro.nome,
            'member-role': capitalize(membro.cargoEclesiastico || 'Membro'),
            'member-rg': membro.rg || 'Não informado',
            'member-cpf': membro.cpf || 'Não informado',
            'card-validity': validade.toLocaleDateString('pt-BR', { timeZone: 'UTC' }),
            'member-birthdate': formatDate(membro.dataNascimento),
            'member-marital-status': capitalize(membro.estadoCivil),
            'member-baptism-date': formatDate(membro.dataBatismo),
            'member-parentage': membro.filiacao || 'Não informada',
        };
    };

    // --- EVENT LISTENERS ---
    const attachEventListeners = () => {
        $('#btn-back').addEventListener('click', () => history.back());
        
        // Toggle Congregation Text
        $('#btn-toggle-congregation').addEventListener('click', (e) => {
            const btn = e.currentTarget;
            btn.classList.toggle('hidden-state');
            const icon = btn.querySelector('i');
            if (btn.classList.contains('hidden-state')) {
                icon.className = 'bx bx-hide';
                btn.title = "Texto Oculto";
            } else {
                icon.className = 'bx bx-show';
                btn.title = "Texto Visível";
            }
            applyCustomization();
        });

        $('#view-physical').addEventListener('change', handleViewSwitch);
        $('#view-virtual').addEventListener('change', handleViewSwitch);
        $('#color-primary').addEventListener('input', applyCustomization);
        $('#color-secondary').addEventListener('input', applyCustomization);
        $('#color-text').addEventListener('input', applyCustomization);
        $('#congregacao-text').addEventListener('input', applyCustomization);
        $('#font-select').addEventListener('change', applyCustomization);
        $('#btn-add-background').addEventListener('click', () => $('#background-upload').click());
        $('#background-upload').addEventListener('change', handleBackgroundUpload);
        $('#btn-clear-gallery').addEventListener('click', clearCustomBackgrounds);
        $('#btn-cancelar-crop-bg').addEventListener('click', () => $('#modal-cropper-bg').style.display = 'none');
        $('#btn-cortar-bg').addEventListener('click', processCroppedImage);
        $('#background-gallery').addEventListener('click', handleGalleryClick);
        $('#btn-save-preset').addEventListener('click', savePreset);
        $('#preset-load').addEventListener('change', (e) => applyPreset(presets[e.target.value]));
        $('#btn-delete-preset').addEventListener('click', deletePreset);
        $('#btn-download').addEventListener('click', downloadCard);
        $('#btn-print').addEventListener('click', printSingleCard);
        $('#btn-print-multiple').addEventListener('click', openBatchPrintModal);
        $('#btn-cancel-batch-print').addEventListener('click', closeBatchPrintModal);
        $('#btn-confirm-batch-print').addEventListener('click', printMultipleCards);
        $('#member-search-input').addEventListener('input', renderMemberList);
    };

    // --- UI HANDLERS ---
    const handleViewSwitch = (e) => {
        const isVirtual = e.target.value === 'virtual';
        $('#physical-card-preview').classList.toggle('active', !isVirtual);
        $('#virtual-card-preview').classList.toggle('active', isVirtual);
    };

    const handleGalleryClick = (e) => {
        if (e.target.classList.contains('gallery-item')) {
            $$('.gallery-item').forEach(item => item.classList.remove('active'));
            e.target.classList.add('active');
            applyCustomization();
        }
    };

    const handleBackgroundUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            $('#image-to-crop-bg').src = ev.target.result;
            $('#modal-cropper-bg').style.display = 'flex';
            if (cropper) cropper.destroy();
            cropper = new Cropper($('#image-to-crop-bg'), { aspectRatio: 337.5 / 212.5, viewMode: 1 });
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    const processCroppedImage = () => {
        const base64String = cropper.getCroppedCanvas({ width: 800 }).toDataURL('image/jpeg');
        customBackgrounds.push(base64String);
        saveCustomBackgrounds();
        renderGallery();
        $('#modal-cropper-bg').style.display = 'none';
        const lastItem = $$('.gallery-item.custom-bg')[customBackgrounds.length - 1];
        if (lastItem) lastItem.click();
    };

    const renderGallery = () => {
        $$('.gallery-item.custom-bg').forEach(item => item.remove());
        const addButton = $('#btn-add-background');
        customBackgrounds.forEach(bg => {
            const item = document.createElement('div');
            item.className = 'gallery-item custom-bg';
            item.dataset.bg = `url(${bg})`;
            item.style.backgroundImage = `url(${bg})`;
            addButton.before(item);
        });
    };

    // --- CUSTOMIZATION & PRESETS ---
    const applyCustomization = () => {
        const btnToggle = $('#btn-toggle-congregation');
        const isHidden = btnToggle.classList.contains('hidden-state');

        const preset = {
            '--card-color-primary': $('#color-primary').value.trim(),
            '--card-color-secondary': $('#color-secondary').value.trim(),
            '--card-color-text': $('#color-text').value.trim(),
            '--card-background': $('.gallery-item.active')?.dataset.bg || 'var(--card-color-primary)',
            '--card-font-family': $('#font-select').value.trim(),
            'congregacao-text': $('#congregacao-text').value, // Removido .trim() para permitir espaços ao digitar
            'congregacao-visible': !isHidden
        };
        if ($('.gallery-item[data-bg="var(--card-color-primary)"]').classList.contains('active')) {
            preset['--card-background'] = $('#color-primary').value;
        }
        applyPreset(preset); // Chama para aplicar visualmente (embora redundante para cores, importante para consistência)
        if (currentMember) { // Re-render card on customization change
            populateCardViews(currentMember);
        }
        return preset;
    };

    const applyPreset = (preset) => {
        if (!preset) return;
        Object.keys(preset).forEach(key => {
            if (key.startsWith('--')) {
                document.documentElement.style.setProperty(key, preset[key]);
            }
        });
        $('#color-primary').value = preset['--card-color-primary'] || '#1a2a4c';
        $('#color-secondary').value = preset['--card-color-secondary'] || '#f0a500';
        $('#color-text').value = preset['--card-color-text'] || '#ffffff';
        $('#font-select').value = preset['--card-font-family'] || "'Poppins', sans-serif";
        $('#congregacao-text').value = preset['congregacao-text'] || 'CONGREGAÇÃO SEDE';
        
        // Restaura estado do botão de visibilidade
        const btnToggle = $('#btn-toggle-congregation');
        const shouldBeVisible = preset['congregacao-visible'] !== false; // Default true
        
        if (!shouldBeVisible) {
            btnToggle.classList.add('hidden-state');
            btnToggle.querySelector('i').className = 'bx bx-hide';
        } else {
            btnToggle.classList.remove('hidden-state');
            btnToggle.querySelector('i').className = 'bx bx-show';
        }

        $$('.gallery-item').forEach(item => {
            item.classList.toggle('active', item.dataset.bg === preset['--card-background']);
        });
        if (currentMember) { // Re-render card when preset is applied
            populateCardViews(currentMember);
        }
    };

    const savePreset = () => {
        const name = $('#preset-save-name').value.trim();
        if (!name) {
            alert('Por favor, insira um nome para o padrão.');
            return;
        }
        presets[name] = applyCustomization();
        localStorage.setItem('card-presets', JSON.stringify(presets));
        localStorage.setItem('card-last-preset', name);
        updatePresetList();
        $('#preset-load').value = name;
        $('#preset-save-name').value = '';
    };

    const loadPresets = () => {
        presets = JSON.parse(localStorage.getItem('card-presets')) || {};
        if(Object.keys(presets).length === 0) {
            presets['Padrão'] = { 
                '--card-color-primary': '#1a2a4c', 
                '--card-color-secondary': '#f0a500', 
                '--card-color-text': '#ffffff', 
                '--card-background': '#1a2a4c',
                '--card-font-family': "'Poppins', sans-serif",
                'congregacao-text': 'CONGREGAÇÃO SEDE',
            };
        }
        updatePresetList();
    };

    const loadCustomBackgrounds = () => {
        customBackgrounds = JSON.parse(localStorage.getItem('card-custom-bgs')) || [];
        renderGallery();
    };

    const saveCustomBackgrounds = () => {
        localStorage.setItem('card-custom-bgs', JSON.stringify(customBackgrounds));
    };

    const clearCustomBackgrounds = () => {
        if (confirm('Tem certeza que deseja remover todas as imagens de fundo personalizadas?')) {
            customBackgrounds = [];
            localStorage.removeItem('card-custom-bgs');
            renderGallery();
            $('.gallery-item[data-bg="var(--card-color-primary)"]').click();
        }
    };

    const deletePreset = () => {
        const name = $('#preset-load').value;
        if (name && presets[name]) {
            if (confirm(`Tem certeza que deseja excluir o padrão "${name}"?`)) {
                delete presets[name];
                localStorage.setItem('card-presets', JSON.stringify(presets));
                updatePresetList();
                if (localStorage.getItem('card-last-preset') === name) {
                    localStorage.removeItem('card-last-preset');
                }
                applyPreset(presets[Object.keys(presets)[0]] || {}); 
            }
        }
    };

    const updatePresetList = () => {
        const select = $('#preset-load');
        select.innerHTML = '';
        Object.keys(presets).sort().forEach(name => {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            select.appendChild(option);
        });
    };

    // --- ACTIONS (PRINT, DOWNLOAD) ---
    const downloadCard = () => {
        if (!currentMember) {
            alert("Nenhum membro carregado para baixar o cartão.");
            return;
        }
        const isVirtual = $('#view-virtual').checked;
        const element = isVirtual ? $('#virtual-card') : $('#physical-card-preview');
        const fileName = `cartao_${currentMember.nome.replace(/ /g, '_')}.png`;
        html2canvas(element, { scale: 2.5, backgroundColor: null, useCORS: true }).then(canvas => {
            const link = document.createElement('a');
            link.href = canvas.toDataURL('image/png');
            link.download = fileName;
            link.click();
        });
    };

    const printSingleCard = async () => {
        if (!currentMember) {
            alert("Nenhum membro carregado para imprimir o cartão.");
            return;
        }
        
        const cardOptions = getCardOptions();
        const printContent = `
            <div class="print-page">
                <div class="card physical-card">${createCardHTML(currentMember, 'front', cardOptions)}</div>
                <div class="card physical-card card-back-style">${createCardHTML(currentMember, 'back', cardOptions)}</div>
            </div>`;
        
        launchPrint(printContent, [currentMember]);
    };

    const openBatchPrintModal = async () => {
        try {
            allMembers = await window.api.get('/api/membros');
            renderMemberList();
            $('#print-modal-backdrop').style.display = 'flex';
        } catch (error) {
            console.error('Erro ao buscar membros:', error);
            alert('Não foi possível carregar a lista de membros.');
        }
    };

    const closeBatchPrintModal = () => {
        $('#print-modal-backdrop').style.display = 'none';
    };

    const renderMemberList = () => {
        const searchTerm = $('#member-search-input').value.toLowerCase();
        const list = $('#member-selection-list');
        list.innerHTML = '';
        allMembers
            .filter(m => m.nome.toLowerCase().includes(searchTerm))
            .forEach(membro => {
                list.innerHTML += `
                    <label class="member-select-item">
                        <input type="checkbox" data-id="${membro._id}">
                        <span>${membro.nome}</span>
                    </label>
                `;
            });
    };

    const printMultipleCards = async () => {
        const selectedIds = Array.from($$('input[data-id]:checked')).map(cb => cb.dataset.id);
        if (selectedIds.length === 0) {
            alert('Selecione ao menos um membro.');
            return;
        }
        
        // Mostra feedback de carregamento
        const btn = $('#btn-confirm-batch-print');
        const originalText = btn.textContent;
        btn.textContent = 'Preparando...';
        btn.disabled = true;

        try {
            // Busca dados completos (com token) para cada membro selecionado
            // Isso garante que o token seja gerado pelo backend se não existir
            const selectedMembers = await Promise.all(selectedIds.map(async (id) => {
                const memberInList = allMembers.find(m => m._id == id);
                if (memberInList && memberInList.cardToken) {
                    return memberInList;
                } else {
                    // Busca individual para forçar geração/recuperação do token
                    try {
                        return await window.api.get(`/api/membros/${id}`);
                    } catch (e) {
                        console.error(`Erro ao buscar detalhes do membro ${id}`, e);
                        return memberInList; // Retorna o que tem (sem token) como fallback
                    }
                }
            }));
            
            const validMembers = selectedMembers.filter(Boolean);
            const cardOptions = getCardOptions();
            let cardsHTML = '';
            
            validMembers.forEach(membro => {
                cardsHTML += `
                    <div class="print-page">
                        <div class="card physical-card">${createCardHTML(membro, 'front', cardOptions)}</div>
                        <div class="card physical-card card-back-style">${createCardHTML(membro, 'back', cardOptions)}</div>
                    </div>`;
            });
            
            launchPrint(cardsHTML, validMembers);

        } catch (error) {
            console.error('Erro na impressão em lote:', error);
            alert('Ocorreu um erro ao preparar a impressão.');
        } finally {
            btn.textContent = originalText;
            btn.disabled = false;
        }
    };

    // --- CENTRALIZED PRINT LAUNCHER ---
    const launchPrint = async (content, membersToPrint) => {
        const printWindow = window.open('', '', 'height=800,width=1200');
        printWindow.document.write(await getPrintableHTML(content));
        printWindow.document.close();

        printWindow.onload = () => {
            membersToPrint.forEach(member => {
                const token = member.cardToken; 
                const publicCardUrl = token 
                    ? `${window.location.origin}/pages/public-card/card.html?token=${token}`
                    : `${window.location.origin}/pages/public-card/card.html?error=missing_token_print`;
                    
                const container = printWindow.document.getElementById(`qr-code-back-${member._id}`);
                generateQRCode(publicCardUrl, container, printWindow);
            });
            
            setTimeout(() => {
                printWindow.print();
                printWindow.close();
            }, 500); 
        };
    };

    // --- HELPERS ---
    const fetchStyles = async () => {
        let allStyles = '';
        for (const stylesheet of document.styleSheets) {
            if (stylesheet.href && stylesheet.href.startsWith(window.location.origin)) {
                try {
                    const response = await fetch(stylesheet.href);
                    if (response.ok) {
                        allStyles += await response.text();
                    }
                } catch (error) {
                    console.warn('Não foi possível carregar o stylesheet:', stylesheet.href, error);
                }
            }
        }
        return allStyles;
    };

    const getPrintableHTML = async (content) => {
        const allCSS = await fetchStyles();
        const computedStyles = getComputedStyle(document.documentElement);
        const customProperties = [
            '--card-color-primary', '--card-color-secondary', '--card-color-text',
            '--card-font-family', '--card-background'
        ];
        let inlineStyles = ':root {';
        customProperties.forEach(prop => {
            inlineStyles += `${prop}: ${computedStyles.getPropertyValue(prop)};`;
        });
        inlineStyles += '}';

        const printLayoutStyles = `
            @page {
                size: A4;
                margin: 1cm;
            }
            body {
                margin: 0;
                padding: 0;
                width: 19cm;
                display: flex;
                flex-wrap: wrap;
                gap: 10px;
                align-content: flex-start;
            }
            .print-page {
                display: flex;
                gap: 5px;
                page-break-inside: avoid;
                margin-bottom: 10px;
            }
            .card.physical-card {
                transform: none !important;
                box-shadow: none !important;
                border: 1px dashed #ccc !important;
            }
        `;

        return `
            <html>
                <head>
                    <title>Imprimir Cartões</title>
                    <script src="https://cdn.jsdelivr.net/npm/qrcode-generator/qrcode.js"></script>
                    <style>
                        ${allCSS}
                        ${inlineStyles}
                        ${printLayoutStyles}
                    </style>
                </head>
                <body>${content}</body>
            </html>`;
    };
    
    const generateQRCode = (url, container, context = window) => {
        if (!container) return;
        container.innerHTML = '';
        try {
            const qr = context.qrcode(0, 'L');
            qr.addData(url);
            qr.make();
            container.innerHTML = qr.createImgTag(4, 4);
        } catch (e) {
            console.error('Erro ao gerar QR Code. Verifique se a biblioteca foi carregada.', e);
            container.innerHTML = 'Erro QR';
        }
    };

    const showError = (message) => {
        $('.main-content').innerHTML = `<div class="error-message"><h1><i class='bx bx-error-circle'></i> Erro</h1><p>${message}</p><button onclick="history.back()" class="btn btn-primary">Voltar</button></div>`;
    };

    const formatDate = (d) => d ? new Date(d).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '...';
    const capitalize = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : '...';

    init();
});
