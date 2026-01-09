document.addEventListener('DOMContentLoaded', () => {
    // --- LÓGICA DE IDENTIFICAÇÃO DO TENANT ---
    const urlParams = new URLSearchParams(window.location.search);
    const tenantId = urlParams.get('t');

    if (!tenantId) {
        document.body.innerHTML = '<div style="text-align:center; padding:50px;"><h1>Link Inválido</h1><p>O identificador da igreja não foi fornecido.</p></div>';
        return;
    }

    // Carregar dados da igreja (Nome e Logo)
    fetch(`${window.location.origin}/api/public-form/tenant/${tenantId}`)
        .then(res => {
            if (!res.ok) throw new Error('Igreja não encontrada');
            return res.json();
        })
        .then(data => {
            document.getElementById('header-church-name').textContent = data.name;
            if (data.logoUrl) {
                const logo = document.getElementById('header-church-logo');
                logo.src = data.logoUrl;
                logo.style.display = 'block';
            }
            // Opcional: Aplicar cores personalizadas
            if (data.aparencia) {
                document.documentElement.style.setProperty('--cor-primaria', data.aparencia.corPrimaria || '#001f5d');
                document.documentElement.style.setProperty('--cor-secundaria', data.aparencia.corSecundaria || '#0033a0');
            }
        })
        .catch(err => {
            console.error(err);
            document.body.innerHTML = '<div style="text-align:center; padding:50px;"><h1>Igreja não encontrada</h1><p>Verifique o link e tente novamente.</p></div>';
        });

    // Carregar Pequenos Grupos
    fetch(`${window.location.origin}/api/public-form/grupos/${tenantId}`)
        .then(res => res.json())
        .then(grupos => {
            const select = document.getElementById('grupoPequeno');
            select.innerHTML = '<option value="">Nenhum</option>';
            grupos.forEach(g => {
                select.innerHTML += `<option value="${g._id}">${g.nome}</option>`;
            });
            select.innerHTML += `<option value="outro">Outro</option>`;
        })
        .catch(err => console.error('Erro ao carregar grupos:', err));

    // --- VARIÁVEIS GLOBAIS ---
    let fotoBase64 = null;
    const form = document.getElementById('form-cadastro-publico');
    
    // --- NAVEGAÇÃO DO FORMULÁRIO (Igual ao interno) ---
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
        window.scrollTo(0, 0);
    };

    // Validação básica antes de avançar
    const validarEtapaAtual = () => {
        const currentStepEl = steps[currentStep];
        const inputsObrigatorios = currentStepEl.querySelectorAll('[required]');
        for (let input of inputsObrigatorios) {
            if (!input.value) {
                alert(`O campo "${input.previousElementSibling.textContent.replace('*', '').trim()}" é obrigatório.`);
                input.focus();
                return false;
            }
        }
        return true;
    };

    btnProximo.addEventListener('click', () => {
        if (validarEtapaAtual()) {
            if (currentStep < steps.length - 1) {
                currentStep++;
                updateFormSteps();
            }
        }
    });

    btnAnterior.addEventListener('click', () => {
        if (currentStep > 0) {
            currentStep--;
            updateFormSteps();
        }
    });

    // --- UPLOAD E CROP DE FOTO ---
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

    fotoUploadInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                imageToCrop.src = ev.target.result;
                modalCropper.style.display = 'flex';
                if (cropper) cropper.destroy();
                cropper = new Cropper(imageToCrop, { aspectRatio: 3/4, viewMode: 1 });
            };
            reader.readAsDataURL(file);
        }
    });

    btnCancelarCrop.addEventListener('click', () => modalCropper.style.display = 'none');

    btnCortar.addEventListener('click', () => {
        if (!cropper) return;
        const canvas = cropper.getCroppedCanvas({ width: 300, height: 400 });
        fotoBase64 = canvas.toDataURL('image/jpeg');
        fotoPreview.src = fotoBase64;
        fotoPreview.style.display = 'block';
        fotoPlaceholder.style.display = 'none';
        modalCropper.style.display = 'none';
    });

    // --- MÁSCARAS ---
    const applyMask = (input, maskFunction) => {
        input.addEventListener('input', (e) => { e.target.value = maskFunction(e.target.value); });
    };
    const maskCpf = (v) => v.replace(/\D/g, '').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2').substring(0, 14);
    const maskTelefone = (v) => {
        v = v.replace(/\D/g, '').substring(0, 11);
        if (v.length > 10) return v.replace(/^(\d{2})(\d{5})(\d{4}).*/, '($1) $2-$3');
        if (v.length > 5) return v.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, '($1) $2-$3');
        if (v.length > 2) return v.replace(/^(\d{2})(\d{0,5}).*/, '($1) $2');
        return v;
    };
    const maskCep = (v) => v.replace(/\D/g, '').replace(/(\d{5})(\d)/, '$1-$2').substring(0, 9);

    if(document.getElementById('cpf')) applyMask(document.getElementById('cpf'), maskCpf);
    if(document.getElementById('telefone')) applyMask(document.getElementById('telefone'), maskTelefone);
    if(document.getElementById('cep')) applyMask(document.getElementById('cep'), maskCep);

    // --- CEP AUTOMÁTICO ---
    const inputCep = document.getElementById('cep');
    if(inputCep) {
        inputCep.addEventListener('blur', async (e) => {
            const cep = e.target.value.replace(/\D/g, '');
            if (cep.length === 8) {
                try {
                    const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
                    const data = await res.json();
                    if (!data.erro) {
                        document.getElementById('endereco').value = data.logradouro;
                        document.getElementById('bairro').value = data.bairro;
                        document.getElementById('cidade').value = data.localidade;
                        document.getElementById('estado').value = data.uf;
                    }
                } catch (err) { console.error(err); }
            }
        });
    }

    // --- CAMPOS DINÂMICOS (Simples) ---
    const selectEstadoCivil = document.getElementById('estadoCivil');
    const containerDataCasamento = document.getElementById('containerDataCasamento');
    if(selectEstadoCivil) {
        selectEstadoCivil.addEventListener('change', () => {
            containerDataCasamento.classList.toggle('hidden', selectEstadoCivil.value !== 'casado');
        });
    }

    const selectVeioDeOutraIgreja = document.getElementById('veioDeOutraIgreja');
    if(selectVeioDeOutraIgreja) {
        selectVeioDeOutraIgreja.addEventListener('change', () => {
            document.getElementById('containerNomeOutraIgreja').classList.toggle('hidden', selectVeioDeOutraIgreja.value !== 'sim');
        });
    }
    
    // NOVO: Lógica para Liderança em Outra Igreja
    const selectLideranca = document.getElementById('liderancaOutraIgreja');
    if(selectLideranca) {
        selectLideranca.addEventListener('change', () => {
            document.getElementById('containerQualLideranca').classList.toggle('hidden', selectLideranca.value !== 'sim');
        });
    }

    const selectBatismoAguas = document.getElementById('batismoAguas');
    if(selectBatismoAguas) {
        selectBatismoAguas.addEventListener('change', () => {
            document.getElementById('containerDataBatismoAguas').classList.toggle('hidden', selectBatismoAguas.value !== 'sim');
        });
    }

    // NOVO: Lógica para Cargo Eclesiástico
    const selectGenero = document.getElementById('genero');
    const selectCargo = document.getElementById('cargoEclesiastico');
    const divCargos = document.getElementById('cargosEclesiasticos');

    const cargosMasculinos = [
        { value: 'membro', text: 'Membro' },
        { value: 'obreiro', text: 'Obreiro (Auxiliar)' },
        { value: 'diacono', text: 'Diácono' },
        { value: 'presbitero', text: 'Presbítero' },
        { value: 'evangelista', text: 'Evangelista' },
        { value: 'pastor', text: 'Pastor' },
        { value: 'pastor-presidente', text: 'Pastor Presidente' },
        { value: 'vice-presidente', text: 'Vice Presidente' },
        { value: 'musico', text: 'Músico' },
        { value: 'outro', text: 'Outro' }
    ];
    const cargosFemininos = [
        { value: 'membro', text: 'Membro' },
        { value: 'diaconisa', text: 'Diaconisa' },
        { value: 'missionaria', text: 'Missionária' },
        { value: 'regente', text: 'Regente' },
        { value: 'musicista', text: 'Musicista' },
        { value: 'pastora-presidente', text: 'Pastora Presidente' },
        { value: 'vice-presidente', text: 'Vice Presidente' },
        { value: 'outro', text: 'Outro' }
    ];

    function atualizarCargos(genero) {
        if (!selectCargo) return;
        selectCargo.innerHTML = '<option value="">Selecione um cargo</option>';
        let lista = [];
        
        if (genero === 'masculino') { 
            lista = cargosMasculinos; 
            divCargos.classList.remove('hidden'); 
        } else if (genero === 'feminino') { 
            lista = cargosFemininos; 
            divCargos.classList.remove('hidden'); 
        } else { 
            divCargos.classList.add('hidden'); 
        }
        
        lista.forEach(c => { 
            const opt = document.createElement('option'); 
            opt.value = c.value; 
            opt.textContent = c.text; 
            selectCargo.appendChild(opt); 
        });
    }

    if (selectCargo) {
        selectCargo.addEventListener('change', () => {
            document.getElementById('containerCargoOutro').classList.toggle('hidden', selectCargo.value !== 'outro');
        });
    }

    if (selectGenero) {
        selectGenero.addEventListener('change', () => atualizarCargos(selectGenero.value));
    }

    const selectGrupo = document.getElementById('grupoPequeno');
    if (selectGrupo) {
        selectGrupo.addEventListener('change', () => {
            document.getElementById('outroGrupoContainer').classList.toggle('hidden', selectGrupo.value !== 'outro');
        });
    }

    // --- CAMPOS DINÂMICOS (Ministério e Dons) ---
    const selectTemMinisterio = document.getElementById('temMinisterio');
    if(selectTemMinisterio) {
        selectTemMinisterio.addEventListener('change', () => {
            const isSim = selectTemMinisterio.value === 'sim';
            document.getElementById('ministerioArea').classList.toggle('hidden', !isSim);
            if (!isSim) {
                document.getElementById('ministerio').value = '';
                document.getElementById('nomeOutroMinisterio').value = '';
                document.getElementById('outroMinisterioContainer').classList.add('hidden');
            }
        });
    }

    const selectMinisterio = document.getElementById('ministerio');
    if(selectMinisterio) {
        selectMinisterio.addEventListener('change', () => {
            const isOutro = selectMinisterio.value === 'outro';
            document.getElementById('outroMinisterioContainer').classList.toggle('hidden', !isOutro);
            if (!isOutro) {
                document.getElementById('nomeOutroMinisterio').value = '';
            }
        });
    }

    const domOutroCheck = document.getElementById('domOutro');
    if(domOutroCheck) {
        domOutroCheck.addEventListener('change', () => {
            const isChecked = domOutroCheck.checked;
            document.getElementById('containerOutroDom').classList.toggle('hidden', !isChecked);
            if (!isChecked) {
                document.getElementById('especificarOutroDom').value = '';
            }
        });
    }

    // --- FILHOS ---
    let filhoCounter = 0;
    const btnAddFilho = document.getElementById('btn-add-filho');
    const listaFilhosContainer = document.getElementById('listaFilhos');
    
    btnAddFilho.addEventListener('click', () => {
        const filhoId = `filho_${filhoCounter++}`;
        const div = document.createElement('div');
        div.className = 'filho-item';
        div.style.marginBottom = '10px';
        div.style.padding = '10px';
        div.style.backgroundColor = '#f8f9fa';
        div.style.borderRadius = '5px';
        div.innerHTML = `
            <div style="display:flex; gap:10px;">
                <input type="text" data-name="nome" placeholder="Nome do filho" style="flex:2">
                <input type="date" data-name="dataNascimento" style="flex:1">
                <button type="button" class="btn-remover-filho" style="background:none; border:none; color:red; cursor:pointer;">&times;</button>
            </div>
        `;
        div.querySelector('.btn-remover-filho').addEventListener('click', () => div.remove());
        listaFilhosContainer.appendChild(div);
    });

    // --- ENVIO DO FORMULÁRIO ---
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Bloquear botão
        const submitBtn = document.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Enviando...';

        const formData = new FormData(form);
        
        // Adiciona Tenant ID
        formData.append('tenantId', tenantId);

        // Ajuste para campos "Outro"
        if (formData.get('cargoEclesiastico') === 'outro') {
            formData.set('cargoEclesiastico', document.getElementById('cargoOutro').value);
        }
        if (formData.get('grupoPequeno') === 'outro') {
            formData.set('grupoPequeno', document.getElementById('outroGrupo').value); // Backend espera string para outroGrupo? Model tem campo 'outroGrupo', mas 'grupoPequeno' é ObjectId.
            // Correção: O modelo tem 'grupoPequeno' (ObjectId) e 'outroGrupo' (String).
            // Se for 'outro', mandamos grupoPequeno como null (ou vazio) e preenchemos outroGrupo.
            formData.delete('grupoPequeno'); // Remove para não dar erro de Cast to ObjectId
            formData.set('outroGrupo', document.getElementById('outroGrupo').value);
        }
        if (formData.get('ministerio') === 'outro') {
            // Modelo tem 'ministerio' e 'nomeOutroMinisterio'.
            // Se for outro, mantemos 'ministerio'='outro' e preenchemos 'nomeOutroMinisterio'.
            // O código original do backend já deve lidar com isso ou esperamos que o frontend mande ambos.
            // O HTML já tem os inputs com os nomes certos (ministerio e nomeOutroMinisterio).
            // Nada a fazer aqui se o input tiver o name correto.
        }

        // Processa Filhos manualmente para JSON string
        const filhos = [];
        document.querySelectorAll('.filho-item').forEach(div => {
            const nome = div.querySelector('input[data-name="nome"]').value;
            const data = div.querySelector('input[data-name="dataNascimento"]').value;
            if (nome) filhos.push({ nome, dataNascimento: data });
        });
        formData.append('filhosJSON', JSON.stringify(filhos));

        // Processa Foto
        if (fotoBase64) {
            const res = await fetch(fotoBase64);
            const blob = await res.blob();
            formData.append('foto', blob, 'foto-perfil.jpg');
        }

        try {
            const response = await fetch(`${window.location.origin}/api/public-form/membros`, {
                method: 'POST',
                body: formData // Fetch gerencia o Content-Type para FormData automaticamente
            });

            const result = await response.json();

            if (response.ok) {
                document.getElementById('modal-sucesso').style.display = 'flex';
                form.reset();
            } else {
                alert('Erro ao enviar: ' + (result.message || 'Erro desconhecido'));
                submitBtn.disabled = false;
                submitBtn.textContent = 'Concluir Cadastro';
            }

        } catch (error) {
            console.error(error);
            alert('Erro de conexão. Tente novamente.');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Concluir Cadastro';
        }
    });
});
