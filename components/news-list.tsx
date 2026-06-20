import Image from "next/image";
import Link from "next/link";
import { normalizeNewsText } from "@/lib/news-text";
import type { PublicNewsItem } from "@/lib/public-news";

export function NewsList({ items }: { items: PublicNewsItem[] }) {
  return (
    <div className="list-stack">
      {items.map((item) => (
        <article key={item.id} className="list-row list-row--large news-list-item">
          {item.imageUrl ? (
            <div className="news-list-item__image">
              <Image src={item.imageUrl} alt="" fill sizes="(max-width: 960px) 100vw, 720px" />
            </div>
          ) : null}
          <p className="list-row__meta">
            <span>{item.publishedAtLabel}</span>
            <span>{item.categoryName}</span>
          </p>
          <h2>{item.title}</h2>
          <p>{normalizeNewsText(item.excerpt)}</p>
          <Link href={`/news/${item.slug}`} className="news-detail-link">
            <span>詳細を見る</span>
            <span aria-hidden="true">→</span>
          </Link>
        </article>
      ))}
    </div>
  );
}
