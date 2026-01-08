document.addEventListener('DOMContentLoaded', () => {
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
        
        const summaryDiv = document.getElementById('summary-content');
        summaryDiv.innerHTML = `
            <h3>Dados da Igreja</h3>
            <p><strong>Nome:</strong> ${data.name}</p>
            <p><strong>CNPJ:</strong> ${data.cnpj || 'Não informado'}</p>
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

            if (payload && (payload.role === 'admin' || payload.tenantType === 'filial')) {
                window.location.href = '/pages/dashboard/dashboard.html';
            } else if (payload && payload.tenantType === 'sede') {
                window.location.href = '/pages/sede-panel/sede.html';
            } else {
                // Fallback to login if token is weird
                window.location.href = '/login.html'; 
            }

        } catch (error) {
            errorMessage.textContent = error.message || 'Ocorreu um erro ao salvar as configurações.';
            submitBtn.disabled = false;
            submitBtn.textContent = 'Finalizar Configuração';
        }
    });

    // Inicializa no primeiro passo
    showStep(1);
});
