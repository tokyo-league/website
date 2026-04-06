"use client";

import { useEffect, useMemo, useState } from "react";

type NewsItem = {
  id: string;
  title: string;
  excerpt: string;
  body: string;
  publishedAtLabel: string;
  categoryName: string;
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
          <article key={item.id} className="list-row list-row--large">
            <p className="list-row__meta">
              <span>{item.publishedAtLabel}</span>
              <span>{item.categoryName}</span>
            </p>
            <h2>{item.title}</h2>
            <p>{item.excerpt}</p>
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
            <p className="list-row__meta">
              <span>{activeItem.publishedAtLabel}</span>
              <span>{activeItem.categoryName}</span>
            </p>
            <h2>{activeItem.title}</h2>
            <div className="news-modal__body">
              {activeItem.body.split(/\n{2,}/).map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
