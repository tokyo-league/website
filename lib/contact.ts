import { isValidEmail, normalizeEmail, sanitizeMultilineText, sanitizePlainText } from "@/lib/security";
import { contactTypes, type ContactType } from "@/lib/contact-types";

export type ContactSubmission = {
  type: ContactType;
  message: string;
  name: string;
  email: string;
};

export function parseContactSubmission(formData: FormData):
  | { ok: true; value: ContactSubmission }
  | { ok: false; message: string } {
  const type = sanitizePlainText(String(formData.get("type") ?? ""), 40) as ContactType;
  const message = sanitizeMultilineText(String(formData.get("message") ?? ""), 3000);
  const name = sanitizePlainText(String(formData.get("name") ?? ""), 80);
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const confirmed = formData.get("confirmed") === "on";
  const website = sanitizePlainText(String(formData.get("website") ?? ""), 200);

  if (website) {
    return { ok: false, message: "送信内容を確認できませんでした。時間をおいて再度お試しください。" };
  }

  if (!(type in contactTypes)) {
    return { ok: false, message: "お問い合わせの種類を選択してください。" };
  }

  if (!message) {
    return { ok: false, message: "お問い合わせ内容を入力してください。" };
  }

  if (!name) {
    return { ok: false, message: "お名前を入力してください。" };
  }

  if (!isValidEmail(email)) {
    return { ok: false, message: "連絡先メールアドレスを確認してください。" };
  }

  if (!confirmed) {
    return { ok: false, message: "送信内容を確認し、確認欄にチェックしてください。" };
  }

  return { ok: true, value: { type, message, name, email } };
}

export async function verifyTurnstileToken(token: string, remoteIp: string) {
  const secret = getTurnstileSecret();

  if (!token || token.length > 2048 || !secret) {
    return false;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);

  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        secret,
        response: token,
        remoteip: remoteIp === "unknown" ? undefined : remoteIp,
        idempotency_key: crypto.randomUUID(),
      }),
      signal: controller.signal,
      cache: "no-store",
    });
    const result = (await response.json()) as { success?: boolean };
    return response.ok && result.success === true;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

export async function sendContactEmail(submission: ContactSubmission, recipients: string[]) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.CONTACT_FROM_EMAIL;

  if (!apiKey || !from || recipients.length === 0) {
    return false;
  }

  const receivedAt = new Intl.DateTimeFormat("ja-JP", {
    dateStyle: "long",
    timeStyle: "medium",
    timeZone: "Asia/Tokyo",
  }).format(new Date());

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": crypto.randomUUID(),
    },
    body: JSON.stringify({
      from,
      to: recipients,
      reply_to: submission.email,
      subject: `【東京リーグ】${contactTypes[submission.type]}`,
      text: [
        "東京リーグ公式サイトからお問い合わせが届きました。",
        "",
        `受信日時: ${receivedAt}（日本時間）`,
        `種類: ${contactTypes[submission.type]}`,
        `お名前: ${submission.name}`,
        `連絡先メールアドレス: ${submission.email}`,
        "",
        "お問い合わせ内容:",
        submission.message,
      ].join("\n"),
    }),
    cache: "no-store",
  });

  return response.ok;
}

export function getTurnstileSiteKey() {
  return process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ??
    (process.env.NODE_ENV === "production" ? "" : "1x00000000000000000000AA");
}

function getTurnstileSecret() {
  return process.env.TURNSTILE_SECRET_KEY ??
    (process.env.NODE_ENV === "production" ? "" : "1x0000000000000000000000000000000AA");
}
