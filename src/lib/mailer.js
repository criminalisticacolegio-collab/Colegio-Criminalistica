import nodemailer from 'nodemailer';

const gmailUser = import.meta.env.GMAIL_USER || 'criminalisticacolegio@gmail.com';
const gmailPass = import.meta.env.GMAIL_APP_PASSWORD;

export const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: gmailUser,
    pass: gmailPass,
  },
});

export const FROM = `"CPCC Catamarca" <${gmailUser}>`;
export const REPLY_TO = gmailUser;
