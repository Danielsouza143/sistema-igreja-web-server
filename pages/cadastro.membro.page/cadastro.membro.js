document.addEventListener('DOMContentLoaded', () => {
    // --- SELETORES E VARIÁVEIS GLOBAIS ---
    const form = document.getElementById('form-cadastro-membro');
    const tituloPagina = document.querySelector('.title-page');
    const urlParams = new URLSearchParams(window.location.search);
    const membroId = urlParams.get("id");
    let fotoBase64 = null;
    let fotoExistenteUrl = null;

    // --- LÓGICA DE NAVEGAÇÃO PASSO A PASSO ---
    const steps = document.querySelectorAll('.form-step');
    const progressSteps = document.querySelectorAll('.progress-step');
    const btnProximo = document.getElementById('btn-proximo');
    const btnAnterior = document.getElementById('btn-anterior');
    const btnSalvar = document.querySelector('.btn-enviar');
    let currentStep = 0;

    const updateFormSteps = () => {
        steps.forEach((step, index) => {
            step.classList.toggle('active', index === currentStep);
        });

        progressSteps.forEach((step, index) => {
            if (index < currentStep) {
                step.classList.add('completed');
                step.classList.remove('active');
            } else if (index === currentStep) {
                step.classList.add('active');
                step.classList.remove('completed');
            } else {
                step.classList.remove('active', 'completed');
            }
        });

        btnAnterior.style.display = currentStep > 0 ? 'inline-block' : 'none';
        btnProximo.style.display = currentStep < steps.length - 1 ? 'inline-block' : 'none';
        btnSalvar.style.display = currentStep === steps.length - 1 ? 'inline-block' : 'none';
    };

    btnProximo.addEventListener('click', () => {
        if (currentStep < steps.length - 1) {
            currentStep++;
            updateFormSteps();
        }
    });

    btnAnterior.addEventListener('click', () => {
        if (currentStep > 0) {
            currentStep--;
            updateFormSteps();
        }
    });

    // --- LÓGICA DE FOTO E CÂMERA ---
    const btnEscolherArquivo = document.getElementById('btn-escolher-arquivo');
    const fotoUploadInput = document.getElementById('foto-upload');
    const fotoPreview = document.getElementById('foto-preview');
    const fotoPlaceholder = document.getElementById('foto-placeholder');
    const modalCropper = document.getElementById('modal-cropper');
    const imageToCrop = document.getElementById('image-to-crop');
    const btnCancelarCrop = document.getElementById('btn-cancelar-crop');
    const btnCortar = document.getElementById('btn-cortar');
    let cropper;

    btnEscolherArquivo.addEventListener('click', () => fotoUploadInput.click());
    fotoUploadInput.addEventListener('change', (e) => { const file = e.target.files[0]; if (file) { const reader = new FileReader(); reader.onload = (ev) => { imageToCrop.src = ev.target.result; modalCropper.style.display = 'flex'; if (cropper) cropper.destroy(); cropper = new Cropper(imageToCrop, { aspectRatio: 3/4, viewMode: 1 }); }; reader.readAsDataURL(file); } });
    btnCancelarCrop.addEventListener('click', () => modalCropper.style.display = 'none');
    btnCortar.addEventListener('click', () => { const canvas = cropper.getCroppedCanvas({ width: 300, height: 400 }); fotoBase64 = canvas.toDataURL('image/jpeg'); fotoPreview.src = fotoBase64; fotoPreview.style.display = 'block'; fotoPlaceholder.style.display = 'none'; modalCropper.style.display = 'none'; });

    const btnAbrirCamera = document.getElementById('btn-abrir-camera');
    const modalCamera = document.getElementById('modal-camera');
    const cameraFeed = document.getElementById('camera-feed');
    const btnFecharCamera = document.getElementById('btn-fechar-camera');
    const btnCapturar = document.getElementById('btn-capturar');
    let stream;
    btnAbrirCamera.addEventListener('click', async () => { try { stream = await navigator.mediaDevices.getUserMedia({ video: true }); cameraFeed.srcObject = stream; modalCamera.style.display = 'flex'; } catch (err) { alert('Erro ao acessar a câmera: ' + err.message); } });
    const fecharCamera = () => { stream?.getTracks().forEach(track => track.stop()); modalCamera.style.display = 'none'; };
    btnFecharCamera.addEventListener('click', fecharCamera);
    btnCapturar.addEventListener('click', () => { const canvas = document.createElement('canvas'); canvas.width = cameraFeed.videoWidth; canvas.height = cameraFeed.videoHeight; canvas.getContext('2d').drawImage(cameraFeed, 0, 0, canvas.width, canvas.height); fotoBase64 = canvas.toDataURL('image/jpeg'); fotoPreview.src = fotoBase64; fotoPreview.style.display = 'block'; fotoPlaceholder.style.display = 'none'; fecharCamera(); });

    // --- LÓGICA DE CAMPOS DINÂMICOS ---
    const selectGenero = document.getElementById('genero');
    const selectCargo = document.getElementById('cargoEclesiastico');
    const divCargos = document.getElementById('cargosEclesiasticos');
    const selectGrupo = document.getElementById('grupoPequeno');
    const divOutroGrupo = document.getElementById('outroGrupoContainer');
    const selectTemMinisterio = document.getElementById('temMinisterio');
    const divMinisterioArea = document.getElementById('ministerioArea');
    const selectMinisterio = document.getElementById('ministerio');
    const selectEstadoCivil = document.getElementById('estadoCivil');
    const containerDataCasamento = document.getElementById('containerDataCasamento');
    const containerDataDivorcio = document.getElementById('containerDataDivorcio');
    const containerDataViuvez = document.getElementById('containerDataViuvez');
    const selectVeioDeOutraIgreja = document.getElementById('veioDeOutraIgreja');
    const containerNomeOutraIgreja = document.getElementById('containerNomeOutraIgreja');
    const selectBatismoAguas = document.getElementById('batismoAguas');
    const containerDataBatismoAguas = document.getElementById('containerDataBatismoAguas');
    const selectBatismoEspiritoSanto = document.getElementById('batismoEspiritoSanto');
    const containerDataBatismoEspiritoSanto = document.getElementById('containerDataBatismoEspiritoSanto');
    const selectLideranca = document.getElementById('liderancaOutraIgreja');
    const containerQualLideranca = document.getElementById('containerQualLideranca');
    const domLouvorCheck = document.getElementById('domLouvor');
    const containerLouvor = document.getElementById('containerLouvor');
    const domOutroCheck = document.getElementById('domOutro');
    const containerOutroDom = document.getElementById('containerOutroDom');
    const btnAddFilho = document.getElementById('btn-add-filho');
    const listaFilhosContainer = document.getElementById('listaFilhos');
    const inputCep = document.getElementById('cep');
    const inputCpf = document.getElementById('cpf');
    const inputTelefone = document.getElementById('telefone');
    let filhoCounter = 0;

    const cargosMasculinos = [{ value: 'membro', text: 'Membro' }, { value: 'obreiro', text: 'Obreiro (Auxiliar)' }, { value: 'diacono', text: 'Diácono' }, { value: 'presbitero', text: 'Presbítero' }, { value: 'evangelista', text: 'Evangelista' }, { value: 'pastor', text: 'Pastor' }, { value: 'pastor-presidente', text: 'Pastor Presidente' }, { value: 'vice-presidente', text: 'Vice Presidente' }, { value: 'musico', text: 'Músico' }, { value: 'outro', text: 'Outro' }];
    const cargosFemininos = [{ value: 'membro', text: 'Membro' }, { value: 'diaconisa', text: 'Diaconisa' }, { value: 'missionaria', text: 'Missionária' }, { value: 'regente', text: 'Regente' }, { value: 'musicista', text: 'Musicista' }, { value: 'pastora-presidente', text: 'Pastora Presidente' }, { value: 'vice-presidente', text: 'Vice Presidente' }, { value: 'outro', text: 'Outro' }];
    
    function atualizarCargos(genero, cargoSelecionado = null) {
        selectCargo.innerHTML = '<option value="">Selecione um cargo</option>';
        let lista = [];
        if (genero === 'masculino') { lista = cargosMasculinos; divCargos.classList.remove('hidden'); }
        else if (genero === 'feminino') { lista = cargosFemininos; divCargos.classList.remove('hidden'); }
        else { divCargos.classList.add('hidden'); }
        lista.forEach(c => { const opt = document.createElement('option'); opt.value = c.value; opt.textContent = c.text; selectCargo.appendChild(opt); });
        if (cargoSelecionado) { selectCargo.value = cargoSelecionado; }
    }
    selectGenero.addEventListener('change', () => atualizarCargos(selectGenero.value));
    selectGrupo.addEventListener('change', () => divOutroGrupo.classList.toggle('hidden', selectGrupo.value !== 'outro'));
    selectTemMinisterio.addEventListener('change', () => { divMinisterioArea.classList.toggle('hidden', selectTemMinisterio.value !== 'sim'); });
    selectMinisterio.addEventListener('change', () => { document.getElementById('outroMinisterioContainer').classList.toggle('hidden', selectMinisterio.value !== 'outro'); });
    selectEstadoCivil.addEventListener('change', () => {
        const valor = selectEstadoCivil.value;
        containerDataCasamento.classList.toggle('hidden', valor !== 'casado');
        containerDataDivorcio.classList.toggle('hidden', valor !== 'divorciado');
        containerDataViuvez.classList.toggle('hidden', valor !== 'viuvo');
        document.getElementById('containerConjugeMembro').classList.toggle('hidden', valor !== 'casado');
        document.getElementById('nomeConjuge').closest('.form-group').classList.toggle('hidden', valor !== 'casado');
    });
    selectVeioDeOutraIgreja.addEventListener('change', () => containerNomeOutraIgreja.classList.toggle('hidden', selectVeioDeOutraIgreja.value !== 'sim'));
    selectBatismoAguas.addEventListener('change', () => containerDataBatismoAguas.classList.toggle('hidden', selectBatismoAguas.value !== 'sim'));
    selectBatismoEspiritoSanto.addEventListener('change', () => containerDataBatismoEspiritoSanto.classList.toggle('hidden', selectBatismoEspiritoSanto.value !== 'sim'));
    selectLideranca.addEventListener('change', () => containerQualLideranca.classList.toggle('hidden', selectLideranca.value !== 'sim'));
    domLouvorCheck.addEventListener('change', () => containerLouvor.classList.toggle('hidden', !domLouvorCheck.checked));
    domOutroCheck.addEventListener('change', () => containerOutroDom.classList.toggle('hidden', !domOutroCheck.checked));

    const adicionarFilho = (filho = { nome: '', dataNascimento: '' }) => {
        const filhoId = `filho_${filhoCounter++}`;
        const div = document.createElement('div');
        div.className = 'filho-item';
        div.id = filhoId;
        div.innerHTML = `
            <input type="text" name="filhos[${filhoId}][nome]" placeholder="Nome completo do filho" value="${filho.nome || ''}">
            <input type="date" name="filhos[${filhoId}][dataNascimento]" value="${filho.dataNascimento ? filho.dataNascimento.substr(0, 10) : ''}">
            <button type="button" class="btn-remover-filho">&times;</button>
        `;
        div.querySelector('.btn-remover-filho').addEventListener('click', () => div.remove());
        listaFilhosContainer.appendChild(div);
    };
    btnAddFilho.addEventListener('click', () => adicionarFilho());

    // --- LÓGICA DE MÁSCARAS DE INPUT ---
    const applyMask = (input, maskFunction) => {
        input.addEventListener('input', (e) => {
            e.target.value = maskFunction(e.target.value);
        });
    };

    const maskCpf = (value) => {
        return value
            .replace(/\D/g, '') // Remove tudo que não é dígito
            .replace(/(\d{3})(\d)/, '$1.$2') // Coloca ponto após o 3º dígito
            .replace(/(\d{3})(\d)/, '$1.$2') // Coloca ponto após o 6º dígito
            .replace(/(\d{3})(\d{1,2})$/, '$1-$2') // Coloca hífen antes dos 2 últimos dígitos
            .substring(0, 14); // Limita o tamanho
    };

    const maskTelefone = (value) => {
        value = value.replace(/\D/g, '');
        value = value.substring(0, 11); // Limita a 11 dígitos (DDD + 9 dígitos)
        if (value.length > 10) {
            value = value.replace(/^(\d{2})(\d{5})(\d{4}).*/, '($1) $2-$3');
        } else if (value.length > 5) {
            value = value.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, '($1) $2-$3');
        } else if (value.length > 2) {
            value = value.replace(/^(\d{2})(\d{0,5}).*/, '($1) $2');
        }
        return value;
    };

    applyMask(inputCpf, maskCpf);
    applyMask(inputTelefone, maskTelefone);

    // --- LÓGICA DE VALIDAÇÃO DE CPF EM TEMPO REAL ---
    const validarCpf = async () => {
        const cpf = inputCpf.value.replace(/\D/g, '');
        const feedbackEl = document.getElementById('cpf-feedback');

        if (cpf.length !== 11) {
            if (feedbackEl) feedbackEl.remove();
            return;
        }

        // Cria ou obtém o elemento de feedback
        let feedback = feedbackEl;
        if (!feedback) {
            feedback = document.createElement('div');
            feedback.id = 'cpf-feedback';
            inputCpf.parentNode.appendChild(feedback);
        }
        feedback.textContent = 'Verificando...';
        feedback.className = 'feedback-checking';

        try {
            // Adiciona o ID do membro a ser excluído da verificação, caso seja uma edição
            const url = `/api/membros/check-cpf/${cpf}${membroId ? `?excludeId=${membroId}` : ''}`;
            const response = await window.api.get(url);
            if (response.exists) {
                feedback.textContent = 'Este CPF já está cadastrado!';
                feedback.className = 'feedback-error';
            } else {
                feedback.textContent = 'CPF disponível!';
                feedback.className = 'feedback-success';
            }
        } catch (error) { feedback.textContent = 'Erro ao verificar CPF.'; feedback.className = 'feedback-error'; }
    };
    inputCpf.addEventListener('blur', validarCpf);

    // --- LÓGICA DE BUSCA DE ENDEREÇO POR CEP ---
    inputCep.addEventListener('blur', async (e) => {
        const cep = e.target.value.replace(/\D/g, '');
        if (cep.length === 8) {
            try {
                const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
                const data = await response.json();
                if (!data.erro) {
                    document.getElementById('endereco').value = data.logradouro;
                    document.getElementById('bairro').value = data.bairro;
                    document.getElementById('cidade').value = data.localidade;
                    document.getElementById('estado').value = data.uf;
                } else {
                    alert('CEP não encontrado.');
                }
            } catch (error) {
                console.error('Erro ao buscar CEP:', error);
            }
        }
    });

    // --- FUNÇÃO DE UPLOAD DE FOTO ---
    const uploadFoto = async () => {
        if (!fotoBase64) {
            return fotoExistenteUrl || null;
        }

        const res = await fetch(fotoBase64);
        const blob = await res.blob();
        const file = new File([blob], 'profile.jpg', { type: 'image/jpeg' });

        const fotoFormData = new FormData();
        fotoFormData.append('foto', file);

        const response = await window.api.post('/api/membros/upload-foto', fotoFormData);
        return response.filePath;
    };

    // --- FUNÇÃO DE SALVAR ---
    const salvarMembro = async (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        const dados = {};
        const filhos = [];
        const dons = [];
        for (const [key, value] of formData.entries()) {
            if (key.startsWith('filhos[')) {
                const [_, id, field] = key.match(/filhos\[(.*?)\]\[(.*?)\]/);
                let filho = filhos.find(f => f.id === id);
                if (!filho) { filho = { id }; filhos.push(filho); }
                filho[field] = value;
            } else if (key === 'dons') {
                dons.push(value);
            } else if ((key === 'grupoPequeno' || key === 'conjugeId') && value === '') {
                dados[key] = null;
            } else {
                if (key === 'buscaConjuge' && value === '') continue;
                dados[key] = value;
            }
        }
        dados.filhos = filhos.map(({id, ...rest}) => rest).filter(f => f.nome);
        dados.dons = dons;
        
        try {
            if (fotoBase64) {
                dados.foto = await uploadFoto();
            } else {
                dados.foto = fotoExistenteUrl;
            }

            if (membroId) {
                await window.api.put(`/api/membros/${membroId}`, dados);
            } else {
                await window.api.post('/api/membros', dados);
            }
            alert(`Membro ${membroId ? 'atualizado' : 'cadastrado'} com sucesso!`);
            window.location.href = '/pages/lista.membros/lista.membros.html';
        } catch (error) { console.error('Erro ao salvar:', error); alert(`Falha ao salvar: ${error.message}`); }
    };

    // --- INICIALIZAÇÃO DA PÁGINA ---
    const carregarPequenosGrupos = async (grupoSelecionado = null) => {
        const selectGrupo = document.getElementById('grupoPequeno');
        try {            
            const grupos = await window.api.get('/api/pequenos-grupos');
            selectGrupo.innerHTML = '<option value="">Nenhum</option>';
            grupos.forEach(grupo => {
                const option = document.createElement('option');
                option.value = grupo._id;
                option.textContent = grupo.nome;
                selectGrupo.appendChild(option);
            });
            if (grupoSelecionado) selectGrupo.value = grupoSelecionado;
        } catch (error) { console.error('Erro ao carregar pequenos grupos:', error); selectGrupo.innerHTML = '<option value="">Não foi possível carregar os grupos</option>'; }
    };

    const preencherFormulario = async (membro) => {
        Object.keys(membro).forEach(key => {
            const campo = document.getElementById(key);
            if (campo && key !== 'grupoPequeno') {
                if (campo.type === 'date' && membro[key]) {
                    campo.value = membro[key].substr(0, 10);
                } else if (campo.type === 'radio' || campo.type === 'checkbox') {
                    // Lógica para radio/checkbox se necessário
                } else {
                    campo.value = membro[key] || '';
                }
            }
        });

        await carregarPequenosGrupos(membro.grupoPequeno);
        atualizarCargos(membro.genero, membro.cargoEclesiastico);

        if (membro.temMinisterio === 'sim') {
            selectTemMinisterio.value = 'sim';
            divMinisterioArea.classList.remove('hidden');
            selectMinisterio.value = membro.ministerio || '';
            if (membro.ministerio === 'outro') {
                document.getElementById('outroMinisterioContainer').classList.remove('hidden');
                document.getElementById('nomeOutroMinisterio').value = membro.nomeOutroMinisterio || '';
            }
            document.getElementById('cargoMinisterio').value = membro.cargoMinisterio || '';
        }

        if (membro.estadoCivil) {
            selectEstadoCivil.value = membro.estadoCivil;
            selectEstadoCivil.dispatchEvent(new Event('change')); // Dispara o evento para mostrar/ocultar campos
        }

        if (membro.filhos && membro.filhos.length > 0) {
            membro.filhos.forEach(adicionarFilho);
        }

        if (membro.veioDeOutraIgreja === 'sim') {
            selectVeioDeOutraIgreja.value = 'sim';
            containerNomeOutraIgreja.classList.remove('hidden');
        }

        if (membro.batismoAguas === 'sim') {
            selectBatismoAguas.value = 'sim';
            containerDataBatismoAguas.classList.remove('hidden');
        }

        if (membro.batismoEspiritoSanto === 'sim') {
            selectBatismoEspiritoSanto.value = 'sim';
            containerDataBatismoEspiritoSanto.classList.remove('hidden');
        }

        if (membro.liderancaOutraIgreja === 'sim') {
            selectLideranca.value = 'sim';
            containerQualLideranca.classList.remove('hidden');
        }

        if (membro.dons && Array.isArray(membro.dons)) {
            membro.dons.forEach(dom => {
                const check = document.querySelector(`input[name="dons"][value="${dom}"]`);
                if (check) {
                    check.checked = true;
                    check.dispatchEvent(new Event('change')); // Dispara evento para mostrar campos específicos
                }
            });
        }

        if (membro.autorizaComunicados) {
            document.querySelector(`input[name="autorizaComunicados"][value="${membro.autorizaComunicados}"]`).checked = true;
        }
        if (membro.autorizaImagem) {
            document.querySelector(`input[name="autorizaImagem"][value="${membro.autorizaImagem}"]`).checked = true;
        }

        if (membro.foto) {
            fotoExistenteUrl = membro.foto;
            fotoPreview.src = window.api.getImageUrl(membro.foto); // Usa a função global
            fotoPreview.style.display = "block";
            fotoPlaceholder.style.display = "none";
        }
    };

    const inicializarPagina = async () => {
        await carregarPequenosGrupos();

        if (membroId) {
            tituloPagina.textContent = 'Editar Membro';
            btnSalvar.textContent = "Salvar Alterações";
            try {
                const membro = await window.api.get(`/api/membros/${membroId}`);
                preencherFormulario(membro);
            } catch (error) {
                console.error('Erro ao carregar membro:', error);
                alert('Não foi possível carregar os dados do membro.');
            }
        } else {
            tituloPagina.textContent = 'Cadastrar Novo Membro';
        }
        
        form.addEventListener('submit', salvarMembro);
        document.getElementById('btn-voltar').addEventListener('click', () => window.history.back());
        updateFormSteps(); // Inicia a visualização do formulário
    };

    inicializarPagina();
});