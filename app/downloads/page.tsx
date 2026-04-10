import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { resolveAssetUrl } from "@/lib/asset-url";
import { formatDownloadCategory } from "@/lib/downloads";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function DownloadsPage() {
  const downloads = await prisma.download
    .findMany({
      where: { status: "PUBLISHED" },
      include: { asset: true },
      orderBy: [{ sortOrder: "asc" }, { publishedAt: "desc" }, { createdAt: "desc" }],
    })
    .catch(() => []);

  const items = await Promise.all(
    downloads.map(async (item) => ({
      id: item.id,
      title: item.title,
      category: formatDownloadCategory(item.category),
      description: item.description,
      updatedAt: formatDate(item.publishedAt ?? item.updatedAt),
      href: await resolveAssetUrl(item.asset.storageKey),
      fileName: item.asset.originalFilename,
    })),
  );

  return (
    <>
      <SiteHeader />
      <main className="page-main">
        <section className="page-intro page-intro--compact">
          <div className="container narrow">
            <p className="section-kicker">Downloads</p>
            <h1>資料ダウンロード</h1>
            <p>規約、要項、注意事項など、公開資料をまとめて確認できるページです。</p>
          </div>
        </section>

        <section className="section-block">
          <div className="container narrow">
            <div className="list-stack">
              {items.length > 0 ? (
                items.map((item) => (
                  <article key={item.id} className="list-row list-row--large">
                    <p className="list-row__meta">
                      <span>{item.category}</span>
                      <span>{item.updatedAt}</span>
                    </p>
                    <h2>{item.title}</h2>
                    {item.description ? <p>{item.description}</p> : null}
                    {item.href ? (
                      <div className="page-intro__actions">
                        <a
                          href={item.href}
                          target="_blank"
                          rel="noreferrer"
                          className="button"
                          download={item.fileName ?? undefined}
                        >
                          資料をダウンロード
                        </a>
                      </div>
                    ) : null}
                  </article>
                ))
              ) : (
                <article className="list-row list-row--large">
                  <h2>公開資料は準備中です</h2>
                  <p>公開設定された資料が表示されます。</p>
                </article>
              )}
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}
