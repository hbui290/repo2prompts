import { BriefWorkbench } from "@/components/brief-workbench";
import { SiteFooter, SiteNav } from "@/components/site-chrome";

export default function Home() {
  return (
    <main>
      <SiteNav />
      <BriefWorkbench />
      <SiteFooter />
    </main>
  );
}
