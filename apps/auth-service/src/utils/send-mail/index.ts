import nodemailer from "nodemailer";
import ejs from "ejs";
import dotenv from "dotenv";
import path from "path";

dotenv.config();


const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587,
    service: process.env.SMTP_SERVICE,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

export async function renderEmailTemplate(templateName: string, data: Record<string, any>): Promise<string> {
    const templatePath = path.join(
        process.cwd(),
        "apps",
        "auth-service",
        "src",
        "utils",
        "email-templates",
        `${templateName}.ejs`
    );

    return ejs.renderFile(templatePath, data)
}

export async function sendEmail(to: string, subject: string, templateName: string, data: Record<string, any>) {
    try {
        const html = await renderEmailTemplate(templateName, data);
        await transporter.sendMail({
            from: `<${process.env.SMTP_USER}>`,
            to,
            subject,
            html
        })
        return true;
    } catch (err) {
        console.log("Error sending email", err);
        return false;
    }
}