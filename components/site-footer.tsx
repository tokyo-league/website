import Link from "next/link";

const footerLinks = [
  { href: "/about", label: "東京リーグについて" },
  { href: "/downloads", label: "資料ダウンロード" },
  { href: "/contact", label: "お問い合わせ" },
];

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container site-footer__inner">
        <div>
          <p className="section-kicker">TOKYO Junior Soccer League</p>
        </div>
        <div className="site-footer__links">
          {footerLinks.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  );
}
