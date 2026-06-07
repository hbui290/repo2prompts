import { SiteFooter, SiteNav } from "@/components/site-chrome";

export default function TermsPage() {
  return (
    <main>
      <SiteNav />
      <article className="legal-page">
        <p className="kicker">Terms</p>
        <h1>Terms of Use</h1>
        <p className="intro">
          Repo2Prompts generates implementation briefs from public repository
          evidence. Generated output is an aid for engineering review, not a
          guarantee of correctness.
        </p>

        <h2>Acceptable use</h2>
        <p>
          Use the app for public repositories that you are allowed to inspect.
          Do not use it to overload GitHub, model providers, hosting
          infrastructure, or the configured database.
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
          The app is provided as-is. Operators are responsible for configuring
          secrets, rate limits, retention, privacy notices, and legal compliance
          for their deployment.
        </p>
      </article>
      <SiteFooter />
    </main>
  );
}
