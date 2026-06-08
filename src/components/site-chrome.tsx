import Link from "next/link";
import { BrandMark } from "./brand-mark";

export function SiteNav() {
  return (
    <nav>
      <Link href="/" className="wordmark">
        <BrandMark />
        Repo2Prompts
      </Link>
      <div className="nav-links">
        <Link href="/">Home</Link>
        <Link href="/library">Reports</Link>
      </div>
    </nav>
  );
}

export function SiteFooter() {
  return (
    <footer>
      <span>
        Repo2Prompts turns public repositories into evidence-backed reports for
        coding agents. Verify generated conclusions against source evidence.
      </span>
      <span className="footer-links">
        <Link href="/">Home</Link>
        <Link href="/library">Reports</Link>
        <Link href="/status">Status</Link>
        <Link href="/privacy">Privacy</Link>
        <Link href="/terms">Terms</Link>
      </span>
    </footer>
  );
}
