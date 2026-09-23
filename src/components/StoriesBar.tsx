import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Plus } from "lucide-react";
import { useActiveStories, type AuthorWithStories } from "../hooks/useStories";
import { useAuth } from "../store/auth";
import { StoryViewer } from "./StoryViewer";
import { BACKGROUNDS } from "../lib/momentStyles";

export function StoriesBar({organizationId,canCreate=true}:{organizationId?:string;canCreate?:boolean}) {
  const location = useLocation();
  const { userId } = useAuth();
  const { data: allGroups } = useActiveStories();
  const groups=organizationId?allGroups?.filter(group=>group.organization?.id===organizationId):allGroups;
  const [viewingGroup, setViewingGroup] = useState<AuthorWithStories | null>(null);
  const otherGroups = groups?.filter((group) => group.authorId !== userId) ?? [];
  const myGroup = groups?.find((group) => group.authorId === userId);
  return <div>
    <div className="moment-story-rail story-card-rail">
      {canCreate&&<Link to="/create/moment" state={{ organizationId, returnTo: location.pathname + location.search }} className="story-preview-card story-create-card" aria-label="Create a new Moment">
        <span className="story-create-art"><Plus size={32} /></span><span className="story-preview-name">Add story</span>
      </Link>}
      {[...(myGroup ? [myGroup] : []), ...otherGroups].map((group) => {
        const preview = group.stories[0];
        if (!preview) return null;
        const name = group.authorId === userId ? "Your story" : group.author?.full_name || "Member";
        return <button key={group.authorId} type="button" onClick={() => setViewingGroup(group)} className={"story-preview-card " + (BACKGROUNDS[preview.background_style] || BACKGROUNDS.midnight)} aria-label={"View " + name}>
          {preview.media_url ? <img className="story-preview-image" src={preview.media_url} alt="" loading="lazy" /> : <span className="story-preview-text">{preview.text_body || preview.caption || "Moment"}</span>}
          <span className="story-preview-shade" />
          <span className="story-preview-avatar">{group.author?.avatar_url ? <img src={group.author.avatar_url} alt="" /> : name.charAt(0)}</span>
          <span className="story-preview-name" title={name}>{name}</span>
        </button>;
      })}
    </div>
    {viewingGroup && <StoryViewer groups={[...(myGroup ? [myGroup] : []), ...otherGroups].filter((group) => group.stories.length > 0)} initialAuthorId={viewingGroup.authorId} onClose={() => setViewingGroup(null)} />}
  </div>;
}
