"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { normalizeNewsBody, normalizeNewsText } from "@/lib/news-text";

type NewsItem = {
  id: string;
  title: string;
  excerpt: string;
  body: string;
  publishedAtLabel: string;
  categoryName: string;
  imageUrl?: string | null;
};

export function NewsModalList({ items }: { items: NewsItem[] }) {
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    if (!openId) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpenId(null);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [openId]);

  const activeItem = useMemo(() => items.find((item) => item.id === openId) ?? null, [items, openId]);

  return (
    <>
      <div className="list-stack">
        {items.map((item) => (
          <article key={item.id} className="list-row list-row--large news-list-item">
            {item.imageUrl ? (
              <div className="news-list-item__image">
                <Image src={item.imageUrl} alt={item.title} fill sizes="(max-width: 960px) 100vw, 720px" />
              </div>
            ) : null}
            <p className="list-row__meta">
              <span>{item.publishedAtLabel}</span>
              <span>{item.categoryName}</span>
            </p>
            <h2>{item.title}</h2>
            <p>{renderTextWithLinks(normalizeNewsText(item.excerpt))}</p>
            <button type="button" className="button button--ghost news-modal-trigger" onClick={() => setOpenId(item.id)}>
              詳細を見る
            </button>
          </article>
        ))}
      </div>

      {activeItem ? (
        <div className="result-lightbox" role="dialog" aria-modal="true" aria-label={activeItem.title} onClick={() => setOpenId(null)}>
          <button type="button" className="result-lightbox__close" onClick={() => setOpenId(null)} aria-label="閉じる">
            閉じる
          </button>
          <div className="news-modal" onClick={(event) => event.stopPropagation()}>
            {activeItem.imageUrl ? (
              <div className="news-modal__image">
                <Image src={activeItem.imageUrl} alt={activeItem.title} fill sizes="(max-width: 960px) 100vw, 760px" />
              </div>
            ) : null}
            <p className="list-row__meta">
              <span>{activeItem.publishedAtLabel}</span>
              <span>{activeItem.categoryName}</span>
            </p>
            <h2>{activeItem.title}</h2>
            <div className="news-modal__body">
              {normalizeNewsBody(activeItem.body)
                .split(/\n{2,}/)
                .filter(Boolean)
                .map((paragraph) => (
                <p key={paragraph}>{renderTextWithLinks(paragraph)}</p>
                ))}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

const URL_PATTERN = /(https?:\/\/[^\s<>"']+)/g;

function renderTextWithLinks(text: string) {
  const matches = [...text.matchAll(URL_PATTERN)];

  if (matches.length === 0) {
    return text;
  }

  const nodes: ReactNode[] = [];
  let cursor = 0;

  matches.forEach((match, index) => {
    const url = match[0];
    const start = match.index ?? 0;

    if (cursor < start) {
      nodes.push(text.slice(cursor, start));
    }

    nodes.push(
      <a
        key={`${url}-${index}`}
        href={url}
        target="_blank"
        rel="noreferrer noopener"
        className="news-inline-link"
      >
        {url}
      </a>,
    );

    cursor = start + url.length;
  });

  if (cursor < text.length) {
    nodes.push(text.slice(cursor));
  }

  return nodes;
}
