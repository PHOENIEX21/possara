import { Link } from "react-router-dom";

const MENTION_RE = /(@[A-Za-z0-9_]{3,24})/g;

export function MentionText({ text, className = "" }: { text: string; className?: string }) {
  const parts = text.split(MENTION_RE);
  return (
    <span className={className}>
      {parts.map((part, index) => {
        if (!part.startsWith("@") || !/^@[A-Za-z0-9_]{3,24}$/.test(part)) {
          return <span key={index}>{part}</span>;
        }
        const username = part.slice(1).toLowerCase();
        return (
          <Link
            key={index}
            to={`/profile/${username}`}
            className="font-semibold text-brand-dark hover:underline"
            onClick={(event) => event.stopPropagation()}
          >
            {part}
          </Link>
        );
      })}
    </span>
  );
}
