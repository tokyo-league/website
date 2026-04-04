import Image from "next/image";
import Link from "next/link";
import { siteAssets, siteNav } from "@/lib/site-data";

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="container site-header__inner">
        <Link href="/" className="site-header__logo" aria-label="TOKYO Junior Soccer League">
          <Image
            src={siteAssets.logo}
            alt="TOKYO Junior Soccer League"
            width={182}
            height={53}
            priority
          />
        </Link>
        <nav className="site-header__nav" aria-label="グローバルナビゲーション">
          {siteNav.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
