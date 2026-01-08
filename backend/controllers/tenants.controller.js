import Tenant from '../models/tenant.model.js';

/**
 * Atualiza as informações do tenant durante o processo de onboarding.
 * Apenas admins de sedes podem acessar esta função.
 */
export const completeOnboarding = async (req, res, next) => {
    try {
        const { id: tenantId } = req.tenant; // Injetado pelo middleware 'protect'
        const { name, cnpj, address, primaryColor, secondaryColor, timezone, currency } = req.body;

        // Validação básica dos dados recebidos
        if (!name || !address || !primaryColor || !secondaryColor) {
            return res.status(400).json({ message: 'Nome, endereço e cores do tema são obrigatórios.' });
        }

        const tenant = await Tenant.findById(tenantId);

        if (!tenant) {
            return res.status(404).json({ message: 'Tenant não encontrado.' });
        }

        // Atualiza os dados do tenant
        tenant.name = name;
        tenant.cnpj = cnpj || tenant.cnpj;
        tenant.address = address;
        
        // Atualiza o objeto de configuração
        tenant.config.theme = {
            primaryColor,
            secondaryColor
        };

        if (req.file) {
            tenant.config.logoUrl = req.file.location;
        }

        tenant.config.timezone = timezone || tenant.config.timezone;
        tenant.config.currency = currency || tenant.config.currency;
        
        // Marca o onboarding como concluído
        tenant.config.completedOnboard = true;

        await tenant.save();

        res.status(200).json({ 
            message: 'Onboarding concluído com sucesso!',
            tenant: tenant 
        });

    } catch (error) {
        next(error);
    }
};

/**
 * Obtém o status atual do tenant, usado para verificar se o onboarding foi concluído.
 */
export const getTenantStatus = async (req, res, next) => {
    try {
        const { id: tenantId } = req.tenant;
        
        const tenant = await Tenant.findById(tenantId).select('config.completedOnboard name');

        if (!tenant) {
            return res.status(404).json({ message: 'Tenant não encontrado.' });
        }

        res.status(200).json({
            completedOnboard: tenant.config.completedOnboard,
            tenantName: tenant.name
        });

    } catch (error) {
        next(error);
    }
};
export const getMyTenant = async (req, res, next) => {
    try {
        const { id: tenantId } = req.tenant;
        const tenant = await Tenant.findById(tenantId);

        if (!tenant) {
            return res.status(404).json({ message: 'Tenant não encontrado.' });
        }

        res.status(200).json(tenant);
    } catch (error) {
        next(error);
    }
};