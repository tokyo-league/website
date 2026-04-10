"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { siteAssets, siteNav } from "@/lib/site-data";

export function SiteHeader() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="site-header">
      <div className="container site-header__inner">
        <Link href="/" className="site-header__logo" aria-label="TOKYO Junior Soccer League" onClick={() => setIsOpen(false)}>
          <Image
            src={siteAssets.logo}
            alt="TOKYO Junior Soccer League"
            width={52}
            height={52}
            priority
          />
          <span>TOKYO Junior Soccer League</span>
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
            <Link key={item.href} href={item.href} onClick={() => setIsOpen(false)}>
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
