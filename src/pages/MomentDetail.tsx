import { Link, useNavigate, useParams } from "react-router-dom";
import { useActiveStories } from "../hooks/useStories";
import { StoryViewer } from "../components/StoryViewer";

export function MomentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: groups, isLoading, error, refetch } = useActiveStories();
  const group = groups?.find(item => item.stories.some(moment => moment.id === id));
  if (isLoading) return <p role="status">Loading Moment…</p>;
  if (error) return <div role="alert">Could not load this Moment. <button onClick={() => void refetch()}>Retry</button></div>;
  if (!group) return <div className="rounded-2xl bg-white p-6"><h1 className="text-xl">This Moment is no longer available</h1><p className="mt-2 text-ink-light">It may have expired, been removed, or have a restricted audience.</p><Link to="/" className="mt-4 inline-block text-brand-dark underline">Back home</Link></div>;
  return <StoryViewer key={id} groups={[group]} initialAuthorId={group.authorId} initialMomentId={id} onClose={() => navigate("/notifications")} />;
}
