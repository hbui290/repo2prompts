import { HomeLanding } from "@/components/home-landing";
import { SiteFooter, SiteNav } from "@/components/site-chrome";

type HomePageProps = {
  searchParams: Promise<{ repository?: string; advanced?: string }>;
};

export default async function Home({ searchParams }: HomePageProps) {
  const params = await searchParams;

  return (
    <main>
      <SiteNav />
      <HomeLanding
        initialAdvanced={params.advanced === "1"}
        initialRepository={params.repository ?? ""}
      />
      <SiteFooter />
    </main>
  );
}
