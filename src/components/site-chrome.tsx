import Link from "next/link";

export function SiteNav() {
  return (
    <nav>
      <Link href="/" className="wordmark">
        Repo2Prompts
      </Link>
      <div className="nav-links">
        <Link href="/library">Library</Link>
        <Link href="/privacy">Privacy</Link>
        <Link href="/terms">Terms</Link>
        <a href="/api/status">Service status</a>
      </div>
    </nav>
  );
}

export function SiteFooter() {
  return (
    <footer>
      <span>
        Self-hosted repository analysis. Generated conclusions should be verified
        against source evidence.
      </span>
      <span className="footer-links">
        <Link href="/privacy">Privacy</Link>
        <Link href="/terms">Terms</Link>
      </span>
    </footer>
  );
}

