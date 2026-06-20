"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { siteAssets, siteNav } from "@/lib/site-data";

export function SiteHeader() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isOpen) return;

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }

    document.body.classList.add("has-open-menu");
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.classList.remove("has-open-menu");
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);

  return (
    <header className="site-header">
      <div className="container site-header__inner">
        <Link href="/" className="site-header__logo" aria-label="東京リーグ トップページ" onClick={() => setIsOpen(false)}>
          <Image
            src={siteAssets.logo}
            alt="TOKYO Junior Soccer League"
            width={52}
            height={52}
            priority
          />
          <span className="site-header__logo-copy">TOKYO<br />LEAGUE</span>
        </Link>
        <button
          type="button"
          className={`site-header__menu-button ${isOpen ? "is-open" : ""}`}
          aria-expanded={isOpen}
          aria-controls="site-header-nav"
          aria-label={isOpen ? "メニューを閉じる" : "メニューを開く"}
          onClick={() => setIsOpen((value) => !value)}
        >
          <span />
          <span />
          <span />
        </button>
        <nav
          id="site-header-nav"
          className={`site-header__nav ${isOpen ? "is-open" : ""}`}
          aria-label="グローバルナビゲーション"
        >
          {siteNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={pathname === item.href ? "is-current" : undefined}
              onClick={() => setIsOpen(false)}
            >
              {item.label}
            </Link>
          ))}
          <Link href="/competitions" className="site-header__result-link" onClick={() => setIsOpen(false)}>
            試合結果 <span aria-hidden="true">↗</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
