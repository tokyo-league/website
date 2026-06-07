import { AdminLayoutShell } from "@/components/admin-layout-shell";
import { requireOwner } from "@/lib/admin-access";
import { prisma } from "@/lib/prisma";
import { isE2ETestMode } from "@/lib/test-mode";

type AuditItem = {
  id: string;
  kind: string;
  action: "作成" | "更新";
  title: string;
  actorName: string;
  actorEmail: string;
  occurredAt: Date;
  detail: string;
};

const jstDateTime = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function AdminAuditPage() {
  const scope = await requireOwner();
  const auditItems = await getAuditItems();

  return (
    <AdminLayoutShell currentPath="/admin/audit" title="更新履歴" kicker="Audit" scope={scope}>
      <article className="admin-card">
        <div className="card__header">
          <div>
            <p className="section-kicker">Recent Changes</p>
            <h3>直近50件の更新</h3>
          </div>
        </div>
        {auditItems.length > 0 ? (
          <div className="admin-table">
            <div className="admin-table__row admin-table__row--head admin-table__row--audit">
              <span>日時</span>
              <span>対象</span>
              <span>内容</span>
              <span>担当者</span>
            </div>
            {auditItems.map((item) => (
              <div key={item.id} className="admin-table__row admin-table__row--audit">
                <time dateTime={item.occurredAt.toISOString()}>{jstDateTime.format(item.occurredAt)}</time>
                <div className="admin-audit-target">
                  <strong>{item.kind}</strong>
                  <span>{item.action}</span>
                </div>
                <div className="admin-audit-detail">
                  <strong>{item.title}</strong>
                  <span>{item.detail}</span>
                </div>
                <div className="admin-audit-actor">
                  <strong>{item.actorName}</strong>
                  <span>{item.actorEmail}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="admin-muted">更新履歴として表示できるデータはまだありません。</p>
        )}
      </article>
    </AdminLayoutShell>
  );
}

async function getAuditItems() {
  if (isE2ETestMode()) {
    return [
      createAuditItem({
        sourceId: "e2e-news",
        kind: "ニュース",
        action: "更新",
        title: "E2Eニュース",
        actor: { name: "E2E Owner", email: "e2e@example.com" },
        occurredAt: new Date("2026-06-07T09:00:00+09:00"),
        detail: "公開",
      }),
      createAuditItem({
        sourceId: "e2e-match",
        kind: "試合",
        action: "作成",
        title: "E2E FC vs Sample FC",
        actor: { name: "E2E Owner", email: "e2e@example.com" },
        occurredAt: new Date("2026-06-07T08:30:00+09:00"),
        detail: "第103回 東京リーグ / Aリーグ",
      }),
    ];
  }

  const [newsPosts, competitions, matches, downloads, pages, contactSettings] = await Promise.all([
    prisma.newsPost.findMany({
      take: 30,
      include: {
        category: true,
        createdBy: true,
        updatedBy: true,
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.competition.findMany({
      take: 30,
      include: {
        season: true,
        createdBy: true,
        updatedBy: true,
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.match.findMany({
      take: 30,
      include: {
        division: {
          include: {
            competition: true,
          },
        },
        homeTeam: true,
        awayTeam: true,
        createdBy: true,
        updatedBy: true,
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.download.findMany({
      take: 30,
      include: {
        createdBy: true,
        updatedBy: true,
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.page.findMany({
      take: 20,
      include: {
        updatedBy: true,
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.contactSetting.findMany({
      take: 20,
      include: {
        updatedBy: true,
      },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  const items: AuditItem[] = [
    ...newsPosts.flatMap((post) => [
      createAuditItem({
        sourceId: post.id,
        kind: "ニュース",
        action: "更新",
        title: post.title,
        actor: post.updatedBy,
        occurredAt: post.updatedAt,
        detail: post.category?.name ?? statusLabel[post.status],
      }),
      createAuditItem({
        sourceId: post.id,
        kind: "ニュース",
        action: "作成",
        title: post.title,
        actor: post.createdBy,
        occurredAt: post.createdAt,
        detail: post.category?.name ?? statusLabel[post.status],
      }),
    ]),
    ...competitions.flatMap((competition) => [
      createAuditItem({
        sourceId: competition.id,
        kind: "大会",
        action: "更新",
        title: competition.name,
        actor: competition.updatedBy,
        occurredAt: competition.updatedAt,
        detail: `${competition.season.label} / ${competitionStatusLabel[competition.status]}`,
      }),
      createAuditItem({
        sourceId: competition.id,
        kind: "大会",
        action: "作成",
        title: competition.name,
        actor: competition.createdBy,
        occurredAt: competition.createdAt,
        detail: `${competition.season.label} / ${competitionStatusLabel[competition.status]}`,
      }),
    ]),
    ...matches.flatMap((match) => [
      createAuditItem({
        sourceId: match.id,
        kind: "試合",
        action: "更新",
        title: `${match.homeTeam.name} vs ${match.awayTeam.name}`,
        actor: match.updatedBy,
        occurredAt: match.updatedAt,
        detail: `${match.division.competition.name} / ${match.division.name}`,
      }),
      createAuditItem({
        sourceId: match.id,
        kind: "試合",
        action: "作成",
        title: `${match.homeTeam.name} vs ${match.awayTeam.name}`,
        actor: match.createdBy,
        occurredAt: match.createdAt,
        detail: `${match.division.competition.name} / ${match.division.name}`,
      }),
    ]),
    ...downloads.flatMap((download) => [
      createAuditItem({
        sourceId: download.id,
        kind: "資料",
        action: "更新",
        title: download.title,
        actor: download.updatedBy,
        occurredAt: download.updatedAt,
        detail: `${downloadCategoryLabel[download.category]} / ${statusLabel[download.status]}`,
      }),
      createAuditItem({
        sourceId: download.id,
        kind: "資料",
        action: "作成",
        title: download.title,
        actor: download.createdBy,
        occurredAt: download.createdAt,
        detail: `${downloadCategoryLabel[download.category]} / ${statusLabel[download.status]}`,
      }),
    ]),
    ...pages.map((page) =>
      createAuditItem({
        sourceId: page.id,
        kind: "固定ページ",
        action: "更新",
        title: page.title,
        actor: page.updatedBy,
        occurredAt: page.updatedAt,
        detail: page.slug,
      }),
    ),
    ...contactSettings.map((setting) =>
      createAuditItem({
        sourceId: setting.id,
        kind: "問い合わせ",
        action: "更新",
        title: "問い合わせ設定",
        actor: setting.updatedBy,
        occurredAt: setting.updatedAt,
        detail: setting.email ?? "メール未設定",
      }),
    ),
  ];

  return items.sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime()).slice(0, 50);
}

function createAuditItem({
  sourceId,
  kind,
  action,
  title,
  actor,
  occurredAt,
  detail,
}: {
  sourceId: string;
  kind: string;
  action: AuditItem["action"];
  title: string;
  actor: { name: string; email: string };
  occurredAt: Date;
  detail: string;
}): AuditItem {
  return {
    id: `${kind}-${action}-${sourceId}-${occurredAt.getTime()}`,
    kind,
    action,
    title,
    actorName: actor.name,
    actorEmail: actor.email,
    occurredAt,
    detail,
  };
}

const statusLabel = {
  DRAFT: "下書き",
  PUBLISHED: "公開",
  ARCHIVED: "アーカイブ",
} as const;

const competitionStatusLabel = {
  DRAFT: "下書き",
  PUBLISHED: "公開",
  CLOSED: "終了",
} as const;

const downloadCategoryLabel = {
  REGULATION: "規約",
  GUIDELINE: "ガイドライン",
  DOCUMENT: "資料",
  OTHER: "その他",
} as const;
