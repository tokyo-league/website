import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { contactInfo } from "@/lib/site-data";

export default function ContactPage() {
  return (
    <>
      <SiteHeader />
      <main className="page-main">
        <section className="page-intro page-intro--compact">
          <div className="container narrow">
            <p className="section-kicker">Contact</p>
            <h1>お問い合わせ</h1>
            <p>運用負荷とスパム対策を考慮し、初期はメール案内を基本にする想定です。</p>
          </div>
        </section>

        <section className="section-block">
          <div className="container narrow">
            <article className="text-section">
              <h2>お問い合わせ先</h2>
              <p>{contactInfo.body}</p>
              <p className="contact-mail">{contactInfo.email}</p>
            </article>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
