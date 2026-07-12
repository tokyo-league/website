import Link from "next/link";
import Image from "next/image";
import { siteAssets } from "@/lib/site-data";
import { getHomeMessages } from "@/lib/home-messages";

const footerLinks = [
  { href: "/about", label: "東京リーグについて" },
  { href: "/downloads", label: "資料ダウンロード" },
  { href: "/contact", label: "お問い合わせ" },
];

export async function SiteFooter() {
  const { mainMessage } = await getHomeMessages();

  return (
    <footer className="site-footer">
      <div className="container site-footer__inner">
        <div className="site-footer__brand">
          <Image src={siteAssets.logo} alt="東京リーグ" width={72} height={72} />
          <div>
            <p className="section-kicker">TOKYO Junior Soccer League</p>
            <strong>{mainMessage}</strong>
          </div>
        </div>
        <div className="site-footer__links">
          {footerLinks.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
        </div>
      </div>
      <div className="container site-footer__bottom">
        <span>EST. 1982 / TOKYO</span>
        <span>© TOKYO Junior Soccer League</span>
      </div>
    </footer>
  );
}
