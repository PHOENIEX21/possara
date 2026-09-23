import { useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { PostEditor, type PostComposerProps } from "../components/PostComposer";
import { MomentComposer } from "../components/MomentComposer";
import { useAuth } from "../store/auth";

export function CreateContent({ kind }: { kind: "post" | "moment" }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { userId, loading } = useAuth();
  const state = location.state as { returnTo?: string; organizationId?: string; composer?: PostComposerProps } | null;
  const returnTo = state?.returnTo?.startsWith("/") && !state.returnTo.startsWith("//") ? state.returnTo : "/";
  const title = kind === "moment" ? "Create a Moment" : "Create a post";
  const leave = () => navigate(returnTo);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = `${title} · POSSARA`;
    return () => { document.title = previousTitle; };
  }, [title]);

  return <main className="creation-page">
    <div className="creation-page-content">
      <header className="creation-page-header">
        <button type="button" onClick={leave} aria-label="Back to previous page"><ArrowLeft size={22} /></button>
        <h1>{title}</h1>
      </header>
      {loading ? <p role="status" className="p-4 text-ink-light">Loading…</p> : !userId ? <div className="rounded-2xl bg-white p-6 text-center">
        <p className="mb-4">Sign in to {kind === "moment" ? "share a Moment" : "write a post"}.</p>
        <Link to="/signin" className="inline-flex rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white">Sign in</Link>
      </div> : kind === "moment" ? <MomentComposer organizationId={state?.organizationId} onCancel={leave} onPublished={() => navigate(returnTo, { replace: true })} /> :
        <PostEditor {...(state?.composer ?? { showHomeTopicPicker: true })} onCancel={leave} onPublished={() => navigate(returnTo, { replace: true })} />}
    </div>
  </main>;
}
