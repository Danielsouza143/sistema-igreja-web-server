import Config from '../models/config.js';
import mongoose from 'mongoose';
import { s3Delete, getS3KeyFromUrl } from '../utils/s3-upload.js';

/**
 * Busca a configuração única do sistema.
 */
export const getConfig = async (req, res, next) => {
    try {
        let config = await Config.findOne({ singleton: 'main' });
        if (!config) {
            config = new Config();
            await config.save();
        }
        res.status(200).json(config);
    } catch (error) {
        next(error);
    }
};

/**
 * Atualiza uma ou mais configurações de forma atômica.
 * Recebe um corpo como { "chave.aninhada": "valor" }
 */
export const updateConfig = async (req, res, next) => {
    try {
        const updatedConfig = await Config.findOneAndUpdate(
            { singleton: 'main' },
            { $set: req.body },
            { new: true, upsert: true, runValidators: true }
        );
        res.status(200).json(updatedConfig);
    } catch (error) {
        next(error);
    }
};

/**
 * Lida com o upload do logo e a atualização do nome da igreja.
 */
export const uploadLogo = async (req, res, next) => {
    const { nomeIgreja } = req.body;
    const updateData = {};

    try {
        const currentConfig = await Config.findOne({ singleton: 'main' });
        const oldLogoUrl = currentConfig?.identidade?.logoIgrejaUrl;

        if (req.file) {
            // Se houver um logo antigo e um novo foi enviado, exclua o antigo do S3
            if (oldLogoUrl) {
                const oldKey = getS3KeyFromUrl(oldLogoUrl);
                if (oldKey) {
                    await s3Delete(oldKey);
                }
            }
            // Usa a URL do S3 fornecida pelo multer-s3
            updateData['identidade.logoIgrejaUrl'] = req.file.location;
        }
        if (nomeIgreja || nomeIgreja === '') { // Permite definir um nome vazio
            updateData['identidade.nomeIgreja'] = nomeIgreja;
        }

        // Só atualiza se houver dados para mudar
        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ message: 'Nenhum dado para atualizar.' });
        }

        const updatedConfig = await Config.findOneAndUpdate(
            { singleton: 'main' },
            { $set: updateData },
            { new: true, upsert: true }
        );

        res.status(200).json({ 
            message: 'Identidade atualizada com sucesso!', 
            identidade: updatedConfig.identidade 
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Exporta todas as configurações como um arquivo JSON.
 */
export const exportConfig = async (req, res, next) => {
    try {
        const config = await Config.findOne({ singleton: 'main' }).lean();
        if (!config) {
            return res.status(404).json({ message: "Nenhuma configuração para exportar." });
        }
        res.setHeader('Content-Disposition', 'attachment; filename=config-backup.json');
        res.setHeader('Content-Type', 'application/json');
        res.status(200).send(JSON.stringify(config, null, 4));
    } catch (error) {
        next(error);
    }
};

/**
 * Importa configurações de um arquivo JSON.
 * ATENÇÃO: Isso sobrescreve as configurações existentes.
 */
export const importConfig = async (req, res, next) => {
    const { _id, singleton, ...importData } = req.body;

    if (!importData) {
        return res.status(400).json({ message: "Nenhum dado de configuração fornecido." });
    }

    try {
        // Encontra o config existente e o substitui pelos dados importados,
        // mantendo o _id e o singleton originais.
        const updatedConfig = await Config.findOneAndUpdate(
            { singleton: 'main' },
            { ...importData, singleton: 'main' }, // Garante que o singleton seja mantido
            { new: true, upsert: true, runValidators: true }
        );
        res.status(200).json({ message: "Configurações importadas com sucesso!", config: updatedConfig });
    } catch (error) {
        next(error);
    }
};