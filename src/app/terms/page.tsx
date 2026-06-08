import { SiteFooter, SiteNav } from "@/components/site-chrome";

export default function TermsPage() {
  return (
    <main>
      <SiteNav />
      <article className="legal-page">
        <p className="kicker">Terms</p>
        <h1>Terms of Use</h1>
        <p className="intro">
          Repo2Prompts generates evidence-backed implementation reports from
          public repository evidence. Generated output is an aid for engineering
          review, not a guarantee of correctness.
        </p>

        <h2>Acceptable use</h2>
        <p>
          Use the app for public repositories that you are allowed to inspect.
          Do not use it to overload GitHub, model providers, hosting
          infrastructure, or the configured database.
        </p>

        <h2>Public report links</h2>
        <p>
          If the operator enables a database-backed library, generated reports may
          be available through shareable links. Do not submit repositories or
          focused questions that you do not want reflected in generated report
          metadata.
        </p>

        <h2>Generated output</h2>
        <p>
          Briefs can contain mistakes or unsupported inferences. Verify generated
          conclusions against source code, project documentation, and applicable
          licenses before relying on them.
        </p>

        <h2>Third-party services</h2>
        <p>
          The app may use GitHub, an OpenAI-compatible model provider, Supabase,
          and a hosting provider. Their terms and rate limits also apply.
        </p>

        <h2>No warranty</h2>
        <p>
          The app is provided as-is. Each deployment is responsible for its
          secrets, rate limits, retention settings, privacy notices, and legal
          compliance.
        </p>
      </article>
      <SiteFooter />
    </main>
  );
}
