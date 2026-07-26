import Link from "next/link";
import { getLeagueRegulationsHref, importantTeamInformation } from "@/lib/team-important-information";

export async function TeamImportantInformation({ compact = false }: { compact?: boolean }) {
  const leagueRegulationsHref = await getLeagueRegulationsHref();

  return (
    <div className={`team-important-information${compact ? " team-important-information--compact" : ""}`}>
      {importantTeamInformation.map((item) => {
        const href = item.id === "league-regulations" ? leagueRegulationsHref : item.href;

        return (
          <Link key={item.id} href={href} className="team-important-information__item">
            <p className="team-important-information__meta">
              <span>{item.label}</span>
              <span>{item.type === "download" ? "資料を見る" : "内容を見る"}</span>
            </p>
            <h3>{item.title}</h3>
            <p>{item.description}</p>
            <span className="team-important-information__link" aria-hidden="true">→</span>
          </Link>
        );
      })}
    </div>
  );
}
