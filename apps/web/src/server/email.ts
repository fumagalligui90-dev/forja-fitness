import { BRAND } from '@forja/core';
import nodemailer from 'nodemailer';
import type { Db } from '@/db/client';
import { devEmails } from '@/db/schema';

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
}
export type EmailSender = (msg: EmailMessage) => Promise<void>;

/**
 * SMTP_URL definido → envio real. Sem SMTP em dev → grava em `dev_emails`
 * (visível em /dev/emails). Sem SMTP em produção → erro explícito.
 */
export function createEmailSender(db: Db): EmailSender {
  const smtp = process.env.SMTP_URL;
  if (smtp) {
    const transport = nodemailer.createTransport(smtp);
    const from = process.env.EMAIL_FROM ?? `${BRAND.name} <nao-responda@localhost>`;
    return async (msg) => {
      await transport.sendMail({ from, ...msg });
    };
  }
  if (process.env.NODE_ENV === 'production') {
    return async () => {
      throw new Error('SMTP_URL não configurado: e-mails não podem ser enviados em produção.');
    };
  }
  return async (msg) => {
    await db.insert(devEmails).values(msg);
    console.info(`[email:dev] para ${msg.to} — "${msg.subject}" (veja /dev/emails)`);
  };
}

export const emailTemplates = {
  verify: (name: string, url: string): Omit<EmailMessage, 'to'> => ({
    subject: `Confirme seu e-mail — ${BRAND.name}`,
    text: `Olá, ${name}!\n\nConfirme seu e-mail para ativar sua conta:\n${url}\n\nSe você não criou uma conta, ignore esta mensagem.`,
  }),
  reset: (name: string, url: string): Omit<EmailMessage, 'to'> => ({
    subject: `Redefinição de senha — ${BRAND.name}`,
    text: `Olá, ${name}!\n\nRecebemos um pedido para redefinir sua senha. O link vale por 1 hora:\n${url}\n\nSe não foi você, ignore esta mensagem — sua senha continua a mesma.`,
  }),
};
