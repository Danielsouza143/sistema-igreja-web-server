import nodemailer from 'nodemailer';

const sendEmail = async (options) => {
    console.log('Attempting to send email...');
    console.log('Email Host:', process.env.EMAIL_HOST);
    console.log('Email Port:', process.env.EMAIL_PORT);
    console.log('Email Username:', process.env.EMAIL_USERNAME);
    // console.log('Email Password:', process.env.EMAIL_PASSWORD ? '********' : 'Not set'); // Avoid logging sensitive info

    // 1. Criar um "transporter" (serviço que vai enviar o e-mail, como Gmail, Mailtrap, etc)
    const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        secure: false, // true para 465, false para outras portas como 587 com STARTTLS
        auth: {
            user: process.env.EMAIL_USERNAME,
            pass: process.env.EMAIL_PASSWORD,
        },
        tls: {
            // Não rejeitar certificados autoassinados. Em produção, isso deve ser 'true' ou o certificado deve ser válido.
            rejectUnauthorized: false
        }
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
    try {
        await transporter.sendMail(mailOptions);
        console.log('Email sent successfully to:', options.email);
    } catch (error) {
        console.error('Error sending email:', error);
        throw new Error('Failed to send email.');
    }
};

export default sendEmail;

