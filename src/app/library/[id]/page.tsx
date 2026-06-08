import { notFound } from "next/navigation";

import { ReportView } from "@/components/report-view";
import { SiteFooter, SiteNav } from "@/components/site-chrome";
import { readStoredBriefById } from "@/integrations/brief-store";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function LibraryDetailPage({ params }: PageProps) {
  const { id } = await params;
  const brief = await readStoredBriefById(id);
  if (!brief) notFound();

  return (
    <main>
      <SiteNav />
      <ReportView brief={brief} />
      <SiteFooter />
    </main>
  );
}
