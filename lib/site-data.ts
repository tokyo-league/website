export const siteNav = [
  { label: "東京リーグについて", href: "/about" },
  { label: "試合情報", href: "/competitions" },
  { label: "ニュース", href: "/news" },
  { label: "参加チーム", href: "/teams" },
  { label: "資料ダウンロード", href: "/downloads" },
  { label: "お問い合わせ", href: "/contact" },
];

export const siteAssets = {
  logo: "/site-assets/common/logo_head.svg",
  heroResult: "/site-assets/results/Aリーグ-3.jpg",
  competitionHero: "/site-assets/teams/photos/池2全体.jpg",
  teamsHero: "/site-assets/mv/mv_team.jpg",
  featuredTeamPhoto: "/site-assets/teams/photos/17上段_旭フットボールクラブ.jpg",
  featuredTeamLogo: "/site-assets/teams/logos/17上段_旭フットボールクラブロゴ.png",
};

export const newsItems = [
  {
    date: "2026.03.21",
    category: "お知らせ",
    title: "春季大会の要項を公開しました",
    excerpt: "資料ダウンロードより最新版の要項PDFを確認できます。",
  },
  {
    date: "2026.03.18",
    category: "大会情報",
    title: "第103回東京リーグの組み合わせを掲載",
    excerpt: "大会詳細ページにリーグ別の導線を追加しました。",
  },
  {
    date: "2026.03.10",
    category: "募集",
    title: "新規参加チーム募集のお知らせ",
    excerpt: "問い合わせ窓口と募集条件を更新しています。",
  },
];

export const divisionCards = [
  { name: "Aリーグ", teams: "8チーム", updatedAt: "03.22" },
  { name: "Bリーグ", teams: "8チーム", updatedAt: "03.20" },
  { name: "Cリーグ", teams: "7チーム", updatedAt: "03.18" },
];

export const standings = [
  { rank: 1, name: "FC EAST", played: 5, points: 13, diff: "+8" },
  { rank: 2, name: "CITY CLUB", played: 5, points: 10, diff: "+3" },
  { rank: 3, name: "MINATO SC", played: 5, points: 8, diff: "+1" },
  { rank: 4, name: "SETAGAYA", played: 5, points: 6, diff: "-2" },
];

export const matchResults = [
  {
    date: "03.22",
    card: "FC EAST 2 - 1 CITY CLUB",
    venue: "江東競技場",
  },
  {
    date: "03.21",
    card: "MINATO SC 1 - 1 SETAGAYA",
    venue: "大井ふ頭",
  },
  {
    date: "03.15",
    card: "FC EAST 3 - 0 SETAGAYA",
    venue: "世田谷公園",
  },
  {
    date: "03.14",
    card: "CITY CLUB 2 - 2 MINATO SC",
    venue: "夢の島",
  },
];

export const adminStats = [
  { label: "下書きニュース", value: "3" },
  { label: "公開中大会", value: "2" },
  { label: "未更新リーグ", value: "4" },
];

export const aboutSections = [
  {
    title: "組織概要",
    body: "東京リーグは、東京少年サッカー連盟 東京リーグとして、加盟チームの継続的な競技機会と交流の場を支えるリーグ戦運営を行います。",
  },
  {
    title: "役員・理事会",
    body: "現行サイトの役員・理事会情報は固定ページとして掲載し、年度更新時に管理画面から差し替えられる形を想定しています。",
  },
  {
    title: "規約・規約細則",
    body: "本文をページへベタ書きせず、最新のPDFを資料ダウンロードから案内する運用を前提にします。",
  },
];

export const teams = [
  {
    name: "旭フットボールクラブ",
    area: "足立区",
    founded: "1981年",
    representative: "池端 健太郎",
    coach: "池端 健太郎",
    image: "/site-assets/teams/photos/17上段_旭フットボールクラブ.jpg",
    logo: "/site-assets/teams/logos/17上段_旭フットボールクラブロゴ.png",
  },
  {
    name: "池2フットボールクラブ",
    area: "大田区",
    founded: "1992年",
    representative: "新野 哲也",
    coach: "新野 哲也",
    image: "/site-assets/teams/photos/池2全体.jpg",
    logo: "/site-assets/common/logo_head.svg",
  },
  {
    name: "アミーゴフットボールクラブ",
    area: "板橋区",
    founded: "1972年",
    representative: "金沓 郁",
    coach: "金沓 郁",
    image: "/site-assets/teams/photos/33上段_アミーゴFCジュニア.jpg",
    logo: "/site-assets/teams/logos/33上段_アミーゴFCジュニアロゴ.png",
  },
];

export const downloadItems = [
  {
    category: "規約",
    title: "東京リーグ 規約",
    updatedAt: "2026.03.21",
    description: "最新の規約PDFを掲載します。",
  },
  {
    category: "規約",
    title: "東京リーグ 規約細則",
    updatedAt: "2026.03.21",
    description: "規約細則の最新版を掲載します。",
  },
  {
    category: "要項",
    title: "第103回東京リーグ 要項",
    updatedAt: "2026.03.21",
    description: "大会概要、参加要件、注意事項をまとめた資料です。",
  },
];

export const contactInfo = {
  email: "info@tokyo-league.jp",
  body: "新規参加、資料に関する問い合わせ、運営への連絡窓口をここに集約します。初期段階ではフォームではなくメール案内を基本とします。",
};
