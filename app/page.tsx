import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { PublicHome } from "@/components/public-home";
import { createPageMetadata, siteDescription } from "@/lib/site-seo";

export const dynamic = "force-dynamic";
export const metadata = createPageMetadata({
  title: "東京少年サッカー連盟 東京リーグ",
  description: siteDescription,
  path: "/",
  keywords: ["大会結果", "試合情報", "参加チーム"],
});

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <PublicHome />
      <SiteFooter />
    </>
  );
}
