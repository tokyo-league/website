import Link from "next/link";
import { AdminLayoutShell } from "@/components/admin-layout-shell";
import { requireOwner } from "@/lib/admin-access";
import { prisma } from "@/lib/prisma";

export default async function AdminCompetitionListPage() {
  const scope = await requireOwner();
  const competitions = await prisma.competition.findMany({
    include: {
      season: true,
      _count: {
        select: {
          divisions: true,
          files: true,
          newsPosts: true,
        },
      },
    },
    orderBy: [{ season: { year: "desc" } }, { sortOrder: "asc" }, { createdAt: "asc" }],
  });

  return (
    <AdminLayoutShell currentPath="/admin/competitions" title="大会一覧" kicker="Competition" scope={scope}>
      <article className="admin-card">
        <div className="card__header">
          <div>
            <p className="section-kicker">All competitions</p>
            <h3>登録済み大会一覧</h3>
          </div>
          <Link href="/admin/competitions" className="button button--ghost">
            大会管理へ戻る
          </Link>
        </div>
        <div className="admin-table">
          <div className="admin-table__row admin-table__row--head admin-table__row--five">
            <span>年度</span>
            <span>大会名</span>
            <span>種別</span>
            <span>状態</span>
            <span>編集</span>
          </div>
          {competitions.length > 0 ? (
            competitions.map((competition) => (
              <Link
                key={competition.id}
                href={`/admin/competitions/${competition.id}`}
                className="admin-table__row admin-table__row--five admin-table__row--link"
              >
                <strong>{competition.season.label}</strong>
                <span>{competition.name}</span>
                <span>{competitionTypeLabel[competition.competitionType]}</span>
                <span>{competitionStatusLabel[competition.status]}</span>
                <span>
                  リーグ {competition._count.divisions}件 / 編集
                </span>
              </Link>
            ))
          ) : (
            <div className="admin-empty-state">
              <p>まだ大会は登録されていません。</p>
            </div>
          )}
        </div>
      </article>
    </AdminLayoutShell>
  );
}

const competitionTypeLabel = {
  LEAGUE: "東京リーグ向け",
  CUP: "5年生FES 山藤杯向け",
  OTHER: "その他",
} as const;

const competitionStatusLabel = {
  DRAFT: "下書き",
  PUBLISHED: "公開",
  CLOSED: "終了",
} as const;
