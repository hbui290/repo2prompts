function inlineCode(text: string) {
  const parts = text.split(/(`[^`]+`)/u);
  return parts.map((part, index) =>
    part.startsWith("`") && part.endsWith("`") ? (
      <code key={`${part}-${index}`}>{part.slice(1, -1)}</code>
    ) : (
      part
    ),
  );
}

export function MarkdownBrief({ markdown }: { markdown: string }) {
  const lines = markdown.split(/\r?\n/u);
  const blocks: React.ReactNode[] = [];
  let list: string[] = [];

  function flushList() {
    if (!list.length) return;
    const items = list;
    list = [];
    blocks.push(
      <ul key={`list-${blocks.length}`}>
        {items.map((item) => <li key={item}>{inlineCode(item)}</li>)}
      </ul>,
    );
  }

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed) {
      flushList();
      return;
    }
    if (trimmed.startsWith("- ")) {
      list.push(trimmed.slice(2));
      return;
    }
    flushList();
    if (trimmed.startsWith("# ")) {
      blocks.push(<h2 key={index}>{inlineCode(trimmed.slice(2))}</h2>);
    } else if (trimmed.startsWith("## ")) {
      blocks.push(<h3 key={index}>{inlineCode(trimmed.slice(3))}</h3>);
    } else {
      blocks.push(<p key={index}>{inlineCode(trimmed)}</p>);
    }
  });
  flushList();

  return <div className="markdown-brief">{blocks}</div>;
}
