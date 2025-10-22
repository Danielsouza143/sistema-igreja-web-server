import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import multer from 'multer';
import multerS3 from 'multer-s3';
import dotenv from 'dotenv';

dotenv.config();

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const s3Upload = (folder, isPublic = true) => multer({
  storage: multerS3({
    s3: s3,
    bucket: process.env.AWS_BUCKET_NAME,
    metadata: function (req, file, cb) {
      cb(null, { fieldName: file.fieldname });
    },
    key: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, `${folder}/${file.fieldname}-${uniqueSuffix}-${file.originalname}`);
    },
    ...(isPublic && { ACL: 'public-read' }), // Adiciona ACL apenas se isPublic for true
  }),
});

const getS3KeyFromUrl = (url) => {
  try {
    const urlObj = new URL(url);
    // A chave S3 é o pathname sem a barra inicial
    return urlObj.pathname.substring(1);
  } catch (error) {
    console.error("Erro ao extrair chave S3 da URL:", error);
    return null;
  }
};

const getSignedUrlForObject = async (key, expiresIn = 3600) => { // expiresIn em segundos, padrão 1 hora
  if (!key) {
    console.warn("Tentativa de gerar URL pré-assinada com chave S3 vazia.");
    return null;
  }
  try {
    const command = new GetObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
    });
    const signedUrl = await getSignedUrl(s3, command, { expiresIn });
    return signedUrl;
  } catch (error) {
    console.error(`Erro ao gerar URL pré-assinada para ${key}:`, error);
    throw error;
  }
};

const s3Delete = async (key) => {
  if (!key) {
    console.warn("Tentativa de excluir objeto S3 com chave vazia.");
    return;
  }
  const params = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: key,
  };

  try {
    await s3.send(new DeleteObjectCommand(params));
    console.log(`Objeto ${key} excluído com sucesso do S3.`);
  } catch (error) {
    console.error(`Erro ao excluir objeto ${key} do S3:`, error);
    throw error;
  }
};

export { s3Upload, s3Delete, s3, getS3KeyFromUrl, getSignedUrlForObject };
