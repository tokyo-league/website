import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { PublicHome } from "@/components/public-home";

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <PublicHome />
      <SiteFooter />
    </>
  );
}
