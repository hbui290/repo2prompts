import { redirect } from "next/navigation";

type WorkbenchPageProps = {
  searchParams: Promise<{ repository?: string }>;
};

export default async function WorkbenchPage({ searchParams }: WorkbenchPageProps) {
  const params = await searchParams;
  const query = new URLSearchParams({ advanced: "1" });
  if (params.repository) query.set("repository", params.repository);
  redirect(`/?${query.toString()}`);
}
