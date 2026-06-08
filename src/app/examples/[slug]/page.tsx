import { notFound } from "next/navigation";

import { ReportView } from "@/components/report-view";
import { SiteFooter, SiteNav } from "@/components/site-chrome";
import { exampleBySlug } from "@/domain/example-reports";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function ExampleDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const report = exampleBySlug(slug);
  if (!report) notFound();

  return (
    <main>
      <SiteNav />
      <ReportView brief={report} shareUrl={`/examples/${report.slug}`} />
      <SiteFooter />
    </main>
  );
}
