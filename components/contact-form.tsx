"use client";

import Script from "next/script";
import { useActionState, useEffect, useRef } from "react";
import { submitContact, type ContactActionState } from "@/app/contact/actions";
import { contactTypes } from "@/lib/contact-types";

const initialState: ContactActionState = { status: "idle", message: "" };

declare global {
  interface Window {
    turnstile?: { reset: () => void };
  }
}

export function ContactForm({ siteKey }: { siteKey: string }) {
  const [state, action, pending] = useActionState(submitContact, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
    }
    if (state.status !== "idle") {
      window.turnstile?.reset();
    }
  }, [state]);

  return (
    <>
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="afterInteractive" />
      <form ref={formRef} action={action} className="contact-form">
        <div className="contact-form__field contact-form__field--full">
          <label htmlFor="contact-type">お問い合わせの種類</label>
          <select id="contact-type" name="type" defaultValue="" required>
            <option value="" disabled>選択してください</option>
            {Object.entries(contactTypes).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        <div className="contact-form__field contact-form__field--full">
          <label htmlFor="contact-message">お問い合わせ内容</label>
          <textarea id="contact-message" name="message" rows={9} maxLength={3000} required />
          <span>3,000文字以内で入力してください。</span>
        </div>

        <div className="contact-form__field">
          <label htmlFor="contact-name">お名前</label>
          <input id="contact-name" name="name" type="text" autoComplete="name" maxLength={80} required />
        </div>

        <div className="contact-form__field">
          <label htmlFor="contact-email">連絡先メールアドレス</label>
          <input id="contact-email" name="email" type="email" autoComplete="email" maxLength={255} required />
        </div>

        <div className="contact-form__honeypot" aria-hidden="true">
          <label htmlFor="contact-website">ウェブサイト</label>
          <input id="contact-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
        </div>

        <label className="contact-form__confirm">
          <input name="confirmed" type="checkbox" required />
          <span>上記の内容で送信してよろしければチェックしてください。</span>
        </label>

        <div className="contact-form__verification">
          {siteKey ? (
            <div className="cf-turnstile" data-sitekey={siteKey} data-language="ja" data-theme="light" />
          ) : (
            <p>現在、本人確認機能を準備中です。</p>
          )}
        </div>

        {state.status !== "idle" ? (
          <div className={`contact-form__notice contact-form__notice--${state.status}`} role="status" aria-live="polite">
            {state.message}
          </div>
        ) : null}

        <button type="submit" className="button contact-form__submit" disabled={pending || !siteKey}>
          {pending ? "送信中..." : "お問い合わせを送信"}
        </button>
      </form>
    </>
  );
}
