import nodemailer from 'nodemailer';

const sendEmail = async (options) => {
    // 1. Criar um transportador (serviço de e-mail)
    const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        secure: false, // true para 465, false para outras portas
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });

    // 2. Definir as opções do e-mail
    const mailOptions = {
        from: process.env.EMAIL_FROM,
        to: options.email,
        subject: options.subject,
        html: options.message,
    };

    // 3. Enviar o e-mail
    await transporter.sendMail(mailOptions);
};

export default sendEmail;