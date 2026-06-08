export function BrandMark() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <svg viewBox="0 0 44 44" role="img">
        <path className="brand-repo-link" d="M12 12v20M12 22h8" />
        <circle className="brand-node" cx="12" cy="12" r="3.5" />
        <circle className="brand-node" cx="12" cy="22" r="3.5" />
        <circle className="brand-node" cx="12" cy="32" r="3.5" />
        <path className="brand-beam" d="M20 22h8" />
        <path className="brand-prompt" d="M29 14h5c2 0 3 1 3 3v10c0 2-1 3-3 3h-5" />
        <path className="brand-cursor" d="M28 18l5 4-5 4" />
      </svg>
    </span>
  );
}
