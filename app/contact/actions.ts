"use server";

import { headers } from "next/headers";
import { parseContactSubmission, sendContactEmail, verifyTurnstileToken } from "@/lib/contact";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, contactRouteRateLimit, getRateLimitKey } from "@/lib/rate-limit";

export type ContactActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

export async function submitContact(
  _previousState: ContactActionState,
  formData: FormData,
): Promise<ContactActionState> {
  const requestHeaders = await headers();
  const remoteIp = getClientIp(requestHeaders);
  const rateLimit = checkRateLimit(getRateLimitKey("contact", remoteIp), contactRouteRateLimit);

  if (!rateLimit.allowed) {
    return {
      status: "error",
      message: "短時間に送信できる回数を超えました。10分ほど時間をおいて再度お試しください。",
    };
  }

  const parsed = parseContactSubmission(formData);

  if (!parsed.ok) {
    return { status: "error", message: parsed.message };
  }

  const turnstileToken = String(formData.get("cf-turnstile-response") ?? "");
  const verified = await verifyTurnstileToken(turnstileToken, remoteIp);

  if (!verified) {
    return {
      status: "error",
      message: "ロボットでないことを確認できませんでした。チェックをやり直してください。",
    };
  }

  try {
    const contacts = await prisma.user.findMany({
      where: { role: "CONTACT", isActive: true },
      select: { email: true },
      orderBy: { createdAt: "asc" },
    });
    const recipients = [...new Set(contacts.map((contact) => contact.email))];

    if (recipients.length === 0) {
      return {
        status: "error",
        message: "現在、お問い合わせを受け付けられません。時間をおいて再度お試しください。",
      };
    }

    const sent = await sendContactEmail(parsed.value, recipients);

    if (!sent) {
      return {
        status: "error",
        message: "送信に失敗しました。時間をおいて再度お試しください。",
      };
    }

    return {
      status: "success",
      message: "お問い合わせを送信しました。担当者からのご連絡をお待ちください。",
    };
  } catch (error) {
    console.error("Contact submission failed", error instanceof Error ? error.message : "unknown error");
    return {
      status: "error",
      message: "送信に失敗しました。時間をおいて再度お試しください。",
    };
  }
}

function getClientIp(requestHeaders: Headers) {
  const forwardedFor = requestHeaders.get("x-forwarded-for");
  return forwardedFor?.split(",")[0]?.trim() || requestHeaders.get("x-real-ip") || "unknown";
}
