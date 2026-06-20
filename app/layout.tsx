import type { Metadata } from "next";
import { AuthSessionProvider } from "@/components/auth-session-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "東京リーグ | TOKYO Junior Soccer League",
    template: "%s | 東京リーグ",
  },
  description: "東京少年サッカー連盟 東京リーグの公式サイト。大会情報、試合結果、ニュース、参加チーム情報を掲載しています。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>
        <AuthSessionProvider>{children}</AuthSessionProvider>
      </body>
    </html>
  );
}
