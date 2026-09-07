import type { Metadata } from "next";
import { AuthSessionProvider } from "@/components/auth-session-provider";
import { defaultOgImage, siteDescription, siteName, siteUrl } from "@/lib/site-seo";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: siteUrl,
  applicationName: siteName,
  title: {
    default: "東京リーグ | 東京少年サッカー連盟",
    template: `%s | ${siteName}`,
  },
  description: siteDescription,
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 },
  },
  openGraph: {
    type: "website",
    locale: "ja_JP",
    siteName,
    title: "東京リーグ | 東京少年サッカー連盟",
    description: siteDescription,
    images: siteUrl ? [{ url: defaultOgImage, width: 1200, height: 630, alt: "東京リーグ" }] : undefined,
  },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "SportsOrganization",
    name: siteName,
    alternateName: "Tokyo Junior Soccer League",
    description: siteDescription,
    areaServed: { "@type": "AdministrativeArea", name: "東京都" },
    ...(siteUrl ? { url: siteUrl.toString(), logo: new URL("/site-assets/common/logo_head.svg", siteUrl).toString() } : {}),
  };

  return (
    <html lang="ja">
      <head>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema).replace(/</g, "\\u003c") }} />
      </head>
      <body>
        <AuthSessionProvider>{children}</AuthSessionProvider>
      </body>
    </html>
  );
}
