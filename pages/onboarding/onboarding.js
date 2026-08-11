document.addEventListener('DOMContentLoaded', () => {
    
    // Função local para decodificar JWT sem bibliotecas extras
    const decodeJwt = (token) => {
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            return JSON.parse(jsonPayload);
        } catch (e) {
            console.error("Erro ao decodificar o JWT:", e);
            return null;
        }
    };
    
    const form = document.getElementById('onboarding-form');
    const nextBtn = document.getElementById('nextBtn');
    const prevBtn = document.getElementById('prevBtn');
    const submitBtn = document.getElementById('submitBtn');
    const errorMessage = document.getElementById('error-message');
    const logoInput = document.getElementById('logo');
    const logoPreview = document.getElementById('logo-preview');
    
    // --- LÓGICA DE MÁSCARA DINÂMICA DE DOCUMENTO ---
    const tipoDocSelect = document.getElementById('tipoDocumento');
    const docInput = document.getElementById('cnpj');
    const labelDoc = document.getElementById('labelDocumento');

    const applyMask = (value, type) => {
        value = value.replace(/\D/g, ""); 
        
        if (type === 'CPF') {
            value = value.substring(0, 11);
            value = value.replace(/(\d{3})(\d)/, "$1.$2");
            value = value.replace(/(\d{3})(\d)/, "$1.$2");
            value = value.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
        } else {
            value = value.substring(0, 14);
            value = value.replace(/^(\d{2})(\d)/, "$1.$2");
            value = value.replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3");
            value = value.replace(/\.(\d{3})(\d)/, ".$1/$2");
            value = value.replace(/(\d{4})(\d)/, "$1-$2");
        }
        return value;
    };

    if (tipoDocSelect && docInput && labelDoc) {
        tipoDocSelect.addEventListener('change', (e) => {
            const tipo = e.target.value;
            docInput.value = ''; 
            
            if (tipo === 'CPF') {
                labelDoc.textContent = 'CPF';
                docInput.placeholder = '000.000.000-00';
            } else {
                labelDoc.textContent = 'CNPJ';
                docInput.placeholder = '00.000.000/0000-00';
            }
        });

        docInput.addEventListener('input', (e) => {
            const tipo = tipoDocSelect.value;
            e.target.value = applyMask(e.target.value, tipo);
        });
    }
    
    // --- CONTROLE DE ETAPAS (STEPS) ---
    const steps = [...document.querySelectorAll('.form-step')];
    const stepperItems = [...document.querySelectorAll('.stepper .step')];
    
    let currentStep = 1;
    const TOTAL_STEPS = steps.length;

    const updateButtons = () => {
        prevBtn.style.display = currentStep > 1 ? 'inline-block' : 'none';
        nextBtn.style.display = currentStep < TOTAL_STEPS ? 'inline-block' : 'none';
        submitBtn.style.display = currentStep === TOTAL_STEPS ? 'inline-block' : 'none';
    };

    const showStep = (stepNumber) => {
        steps.forEach(step => step.classList.toggle('active', parseInt(step.dataset.step) === stepNumber));
        stepperItems.forEach(step => step.classList.toggle('active', parseInt(step.dataset.step) === stepNumber));
        currentStep = stepNumber;
        updateButtons();
    };

    const validateStep = (stepNumber) => {
        const activeStep = steps.find(step => parseInt(step.dataset.step) === stepNumber);
        const inputs = [...activeStep.querySelectorAll('input[required]')];
        for (const input of inputs) {
            if (!input.value.trim()) {
                errorMessage.textContent = `O campo "${input.previousElementSibling.textContent}" é obrigatório.`;
                input.focus();
                return false;
            }
        }
        errorMessage.textContent = '';
        return true;
    };
    
    const populateSummary = () => {
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        
        const tipoDoc = data.tipoDocumento === 'CPF' ? 'CPF' : 'CNPJ';
        
        const summaryDiv = document.getElementById('summary-content');
        summaryDiv.innerHTML = `
            <h3>Dados da Igreja</h3>
            <p><strong>Nome:</strong> ${data.name}</p>
            <p><strong>${tipoDoc}:</strong> ${data.cnpj || 'Não informado'}</p>
            <p><strong>Endereço:</strong> ${data.address}</p>
            
            <h3>Aparência</h3>
            <p><strong>Cor Primária:</strong> ${data.primaryColor}</p>
            <p><strong>Cor Secundária:</strong> ${data.secondaryColor}</p>
            <p><strong>Logo:</strong> ${data.logo.name || 'Não informada'}</p>

            <h3>Configurações</h3>
            <p><strong>Fuso Horário:</strong> ${data.timezone}</p>
            <p><strong>Moeda:</strong> ${data.currency}</p>
        `;
    };

    nextBtn.addEventListener('click', () => {
        if (validateStep(currentStep) && currentStep < TOTAL_STEPS) {
            if (currentStep + 1 === TOTAL_STEPS) {
                populateSummary();
            }
            showStep(currentStep + 1);
        }
    });

    prevBtn.addEventListener('click', () => {
        if (currentStep > 1) {
            showStep(currentStep - 1);
        }
    });

    logoInput.addEventListener('change', () => {
        const file = logoInput.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                logoPreview.src = e.target.result;
                logoPreview.style.display = 'block';
            };
            reader.readAsDataURL(file);
        }
    });

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (!validateStep(currentStep)) return;

        const formData = new FormData(form);
        
        try {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Salvando...';

            await window.api.patch('/api/tenants/onboarding', formData);
            
            const token = localStorage.getItem('userToken');
            const payload = decodeJwt(token);

            // CORREÇÃO CRÍTICA DO REDIRECIONAMENTO DE SEDE E FILIAL
            if (payload && payload.tenantType === 'sede') {
                window.location.href = '/pages/sede-panel/sede.html';
            } else if (payload && payload.tenantType === 'filial') {
                window.location.href = '/pages/dashboard/dashboard.html';
            } else {
                window.location.href = '/pages/dashboard/dashboard.html'; 
            }

        } catch (error) {
            errorMessage.textContent = error.message || 'Ocorreu um erro ao salvar as configurações. Verifique o servidor.';
            submitBtn.disabled = false;
            submitBtn.textContent = 'Finalizar Configuração';
        }
    });

    showStep(1);
});
