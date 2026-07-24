import nodemailer from "nodemailer";
import { getAppUrl } from "@/lib/supabase/env";
import type { InvitationAssignableRole } from "../types/invitation";
import {
  buildInvitationEmailHtml,
  buildInvitationEmailSubject,
  buildInvitationEmailText,
} from "./invitation-email-template";

type SendInvitationEmailInput = {
  to: string;
  organizationName: string;
  role: InvitationAssignableRole;
  rawToken: string;
  expiresAt: Date;
};

type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  user?: string;
  password?: string;
  from: string;
};

function getBooleanEnv(name: string, fallback: boolean) {
  const value = process.env[name];

  if (!value) {
    return fallback;
  }

  return value === "true" || value === "1";
}

function getSmtpConfig(): SmtpConfig {
  const host = process.env.SMTP_HOST ?? "127.0.0.1";
  const port = Number.parseInt(process.env.SMTP_PORT ?? "54325", 10);
  const secure = getBooleanEnv("SMTP_SECURE", false);
  const user = process.env.SMTP_USER || undefined;
  const password = process.env.SMTP_PASSWORD || undefined;
  const from =
    process.env.INVITATION_EMAIL_FROM ?? "CoreOps <no-reply@coreops.local>";

  if (!Number.isInteger(port) || port <= 0) {
    throw new Error("SMTP_PORT must be a valid port number.");
  }

  return { host, port, secure, user, password, from };
}

export function buildInvitationAcceptUrl(rawToken: string) {
  const url = new URL("/invitations/accept-link", getAppUrl());
  url.searchParams.set("token", rawToken);

  return url.toString();
}

export async function sendInvitationEmail({
  to,
  organizationName,
  role,
  rawToken,
  expiresAt,
}: SendInvitationEmailInput) {
  const config = getSmtpConfig();
  const acceptUrl = buildInvitationAcceptUrl(rawToken);
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth:
      config.user && config.password
        ? { user: config.user, pass: config.password }
        : undefined,
  });

  await transporter.sendMail({
    from: config.from,
    to,
    subject: buildInvitationEmailSubject(),
    text: buildInvitationEmailText({
      organizationName,
      role,
      acceptUrl,
      expiresAt,
    }),
    html: buildInvitationEmailHtml({
      organizationName,
      role,
      acceptUrl,
      expiresAt,
    }),
  });
}
