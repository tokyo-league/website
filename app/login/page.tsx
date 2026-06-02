import { auth } from "@/auth";
import { GoogleSignIn } from "@/components/google-sign-in";

const hasGoogleCredentials =
  Boolean(process.env.AUTH_GOOGLE_ID) && Boolean(process.env.AUTH_GOOGLE_SECRET);

export default async function LoginPage() {
  const session = await auth();

  return (
    <main className="login-shell">
      <section className="login-card">
        <p className="section-kicker">Admin Sign In</p>
        <h1>管理画面ログイン</h1>
        <p>
          Googleアカウントでログインし、`admins` テーブルに有効登録されたメールアドレスのみ管理画面へ入れる構成です。
        </p>
        <div className="login-actions">
          {session?.user ? (
            <a href="/admin" className="button">
              管理画面へ進む
            </a>
          ) : (
            <GoogleSignIn enabled={hasGoogleCredentials} />
          )}
        </div>
        <div className="login-note">
          <strong>設定メモ</strong>
          <p>
            `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `DATABASE_URL`
            を設定した上で、有効な管理者メールアドレスを `admins` テーブルへ登録してください。
          </p>
        </div>
      </section>
    </main>
  );
}
