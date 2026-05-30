import { Resend } from 'resend';

const resend = new Resend(import.meta.env.RESEND_API_KEY);

export const FROM   = import.meta.env.EMAIL_FROM || '"CPCC Catamarca" <onboarding@resend.dev>';
export const REPLY_TO = 'criminalisticacolegio@gmail.com';

// Wrapper con la misma interfaz que nodemailer para que email.js no cambie
export const transporter = {
  sendMail: async ({ from, replyTo, to, subject, html, attachments }) => {
    const payload = {
      from:    from || FROM,
      to:      Array.isArray(to) ? to : [to],
      subject,
      html,
    };

    if (replyTo)              payload.reply_to  = replyTo;
    if (attachments?.length)  payload.attachments = attachments.map(a => ({
      filename: a.filename,
      content:  a.content,
    }));

    const { data, error } = await resend.emails.send(payload);
    if (error) throw new Error(`[Resend] ${error.message}`);
    return data;
  },
};
