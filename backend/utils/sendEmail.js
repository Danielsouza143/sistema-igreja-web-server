import nodemailer from 'nodemailer';

const sendEmail = async (options) => {
    // 1. Criar um "transporter" (serviço que vai enviar o e-mail, como Gmail, Mailtrap, etc)
    const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        auth: {
            user: process.env.EMAIL_USERNAME,
            pass: process.env.EMAIL_PASSWORD,
        },
    });

    // 2. Definir as opções do e-mail
    const mailOptions = {
        from: 'Sistema Igreja <contato@igreja.com>',
        to: options.email,
        subject: options.subject,
        text: options.message,
        // html: para usar um template HTML
    };

    // 3. Enviar o e-mail
    await transporter.sendMail(mailOptions);
};

export default sendEmail;

