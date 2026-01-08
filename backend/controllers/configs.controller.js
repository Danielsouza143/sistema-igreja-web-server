import Tenant from '../models/tenant.model.js';
import Config from '../models/config.js';
import { s3Delete, getS3KeyFromUrl } from '../utils/s3-upload.js';

/**
 * Busca a configuração combinada para o tenant do usuário.
 * Mescla a configuração global com a configuração específica do tenant.
 */
export const getConfig = async (req, res, next) => {
    try {
        const tenantPromise = Tenant.findById(req.tenant.id).select('config name').lean();
        const globalConfigPromise = Config.findOne({ singleton: 'main' }).lean();

        const [tenant, globalConfig] = await Promise.all([tenantPromise, globalConfigPromise]);

        if (!tenant) {
            return res.status(404).json({ message: 'Tenant não encontrado.' });
        }

        // Define a aparência padrão para evitar erros se não estiver configurada
        const defaultConfig = {
            aparencia: { theme: 'light', corPrimaria: '#001f5d', corSecundaria: '#0033a0' },
            logoUrl: ''
        };

        // Mescla a configuração do tenant com o padrão
        const tenantConfig = { ...defaultConfig, ...(tenant.config || {}) };
        tenantConfig.aparencia = { ...defaultConfig.aparencia, ...(tenantConfig.aparencia || {}) };

        // Combina as configurações: começa com a global e sobrescreve com a do tenant.
        const finalConfig = { 
            ...(globalConfig || {}), 
            ...tenantConfig,
            identidade: {
                nomeIgreja: tenant.name,
                logoIgrejaUrl: tenantConfig.logoUrl
            },
            // CORREÇÃO: Lê do local correto (tenant.config.aparencia)
            aparencia: tenantConfig.aparencia
        };

        res.status(200).json(finalConfig);
    } catch (error) {
        next(error);
    }
};

/**
 * Atualiza as configurações do tenant.
 * Recebe um corpo como { "config.theme.primaryColor": "#valor" }
 */
export const updateConfig = async (req, res, next) => {
    try {
        const updateData = {};
        // Mapeia o corpo da requisição para o formato $set do MongoDB
        for (const key in req.body) {
            updateData[`config.${key}`] = req.body[key];
        }

        const tenant = await Tenant.findByIdAndUpdate(
            req.tenant.id,
            { $set: updateData },
            { new: true, runValidators: true }
        ).select('config name');

        if (!tenant) {
            return res.status(404).json({ message: 'Tenant não encontrado.' });
        }

        res.status(200).json(tenant.config);
    } catch (error) {
        next(error);
    }
};

/**
 * Lida com o upload do logo do tenant.
 */
export const uploadLogo = async (req, res, next) => {
    const { nomeIgreja } = req.body;
    
    try {
        const tenant = await Tenant.findById(req.tenant.id);
        if (!tenant) {
            return res.status(404).json({ message: 'Tenant não encontrado.' });
        }

        const oldLogoUrl = tenant.config.logoUrl;

        if (req.file) {
            if (oldLogoUrl) {
                const oldKey = getS3KeyFromUrl(oldLogoUrl);
                if (oldKey) await s3Delete(oldKey);
            }
            tenant.config.logoUrl = req.file.location;
        }

        if (nomeIgreja || nomeIgreja === '') {
            tenant.name = nomeIgreja;
        }

        await tenant.save();

        res.status(200).json({ 
            message: 'Identidade atualizada com sucesso!', 
            identidade: {
                nomeIgreja: tenant.name,
                logoIgrejaUrl: tenant.config.logoUrl
            }
        });
    } catch (error) {
        next(error);
    }
};


// As funções de export/import operavam no config global e não fazem sentido
// no contexto de um único tenant desta forma. Elas precisariam ser repensadas
// para um admin do sistema. Por enquanto, retornam um erro.

export const exportConfig = async (req, res, next) => {
    res.status(501).json({ message: 'Funcionalidade não implementada para tenants.' });
};

export const importConfig = async (req, res, next) => {
    res.status(501).json({ message: 'Funcionalidade não implementada para tenants.' });
};