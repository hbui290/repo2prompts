import { SiteFooter, SiteNav } from "@/components/site-chrome";

export default function PrivacyPage() {
  return (
    <main>
      <SiteNav />
      <article className="legal-page">
        <p className="kicker">Privacy</p>
        <h1>Privacy Policy</h1>
        <p className="intro">
          Repo2Prompts processes public repository information that users submit
          and generated briefs created from that evidence.
        </p>

        <h2>Information processed</h2>
        <p>
          The app receives repository identifiers, optional focused questions,
          public GitHub metadata, selected public source files, and generated
          implementation briefs. If the database is configured, generated briefs
          and non-secret evidence counts may be stored for cache and library
          features.
        </p>

        <h2>Secrets and provider credentials</h2>
        <p>
          Model provider keys, GitHub tokens, and database service keys are
          server-side configuration values. They must not be exposed through
          browser-accessible environment variables.
        </p>

        <h2>Advertising and analytics</h2>
        <p>
          The current app does not embed an advertising or analytics provider by
          default. If advertising or analytics is enabled later, this policy must
          be updated with the provider, data collected, consent requirements, and
          opt-out instructions.
        </p>

        <h2>Retention</h2>
        <p>
          Cached briefs remain in the configured database until the operator
          deletes them. Server logs, if enabled by the hosting provider, are
          governed by that provider&apos;s retention settings.
        </p>
      </article>
      <SiteFooter />
    </main>
  );
}

