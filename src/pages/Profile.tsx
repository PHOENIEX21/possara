import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Camera, MessageCircle, MoreHorizontal, Pencil, UserCheck, UserPlus } from "lucide-react";
import { useAuth } from "../store/auth";
import { useProfileById, useProfileByUsername, useOwnProfile, useUpdateOwnProfile } from "../hooks/useProfile";
import { useFollowCounts, useFollowStatus, useToggleFollow } from "../hooks/useFollow";
import { useOpportunityCategories } from "../components/CategoryChips";
import { useAvatarUpload } from "../hooks/useAvatarUpload";
import { useCoverUpload } from "../hooks/useCoverUpload";
import { useFeedPosts } from "../hooks/useFeedPosts";
import { PostCard } from "../components/PostCard";
import { ProfilePhotoViewer } from "../components/ProfilePhotoViewer";
import type { Profile as ProfileType } from "../types/database";

function FollowButton({ targetUserId }: { targetUserId: string }) {
  const { userId } = useAuth();
  const { data: isFollowing } = useFollowStatus(targetUserId);
  const toggle = useToggleFollow(targetUserId);

  if (!userId || userId === targetUserId) return null;

  return (
    <button
      type="button"
      onClick={() => toggle.mutate(!!isFollowing)}
      disabled={toggle.isPending}
      className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium ${
        isFollowing ? "border border-ink-faint/30 text-ink-light" : "bg-ink text-white"
      }`}
    >
      {isFollowing ? <UserCheck size={15} /> : <UserPlus size={15} />}
      {isFollowing ? "Following" : "Follow"}
    </button>
  );
}

function MessageButton({ targetUserId }: { targetUserId: string }) {
  const { userId } = useAuth();
  const navigate = useNavigate();

  if (!userId || userId === targetUserId) return null;

  return (
    <button
      type="button"
      onClick={() => navigate(`/messages/${targetUserId}`)}
      className="inline-flex items-center gap-1.5 rounded-full border border-ink-faint/30 px-4 py-1.5 text-sm font-medium"
    >
      <MessageCircle size={15} />
      Message
    </button>
  );
}

function ProfilePosts({ profileId }: { profileId: string }) {
  const { data: posts, isLoading, error } = useFeedPosts({ authorId: profileId });

  return (
    <section className="max-w-2xl">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Posts</h2>
        <span className="text-xs text-ink-faint">Latest activity</span>
      </div>
      <div className="space-y-3">
        {isLoading && <div className="feed-skeleton" />}
        {error && <p className="text-sm text-flag">Couldn&apos;t load posts.</p>}
        {!isLoading && !error && posts?.length === 0 && (
          <div className="rounded-2xl border border-paper-dim bg-white p-5 text-sm text-ink-light">No posts yet.</div>
        )}
        {posts?.map((post) => <PostCard key={post.id} post={post} />)}
      </div>
    </section>
  );
}

type ProfileViewProps = {
  profile: ProfileType;
  own?: boolean;
  onEdit?: () => void;
  onOwnCoverClick?: () => void;
  coverUploading?: boolean;
};

function ProfileView({
  profile,
  own = false,
  onEdit,
  onOwnCoverClick,
  coverUploading = false,
}: ProfileViewProps) {
  const { data: counts } = useFollowCounts(profile.id);
  const [photoOpen, setPhotoOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const name = profile.full_name ?? "Member";

  const avatarContent = profile.avatar_url ? (
    <img src={profile.avatar_url} alt="" className="relative z-20 h-20 w-20 rounded-full border-4 border-white bg-white object-cover shadow-lg" />
  ) : (
    <div className="relative z-20 flex h-20 w-20 items-center justify-center rounded-full border-4 border-white bg-trust-light text-2xl text-trust-dark shadow-lg">
      {name.charAt(0).toUpperCase()}
    </div>
  );

  return (
    <>
      <div className="max-w-2xl rounded-3xl border border-black/[.06] bg-white shadow-card">
        <div className="relative z-0 h-32 overflow-hidden rounded-t-3xl bg-gradient-to-br from-brand-light via-paper-dim to-trust-light sm:h-40">
          {profile.cover_url && <img src={profile.cover_url} alt="" className="h-full w-full object-cover" />}
        </div>

        <div className="relative z-10 px-5 pb-6">
          <div className="relative -mt-10 flex items-end justify-between gap-3">
            {profile.avatar_url ? (
              <button
                type="button"
                onClick={() => setPhotoOpen(true)}
                className="relative z-20 rounded-full bg-white transition hover:scale-[1.02]"
                aria-label={`View ${name} profile photo`}
                title="View profile photo"
              >
                {avatarContent}
              </button>
            ) : (
              avatarContent
            )}

            <div className="relative z-20 flex flex-wrap items-center justify-end gap-2">
              {own ? (
                <>
                  {onEdit && (
                    <button
                      type="button"
                      onClick={onEdit}
                      className="inline-flex items-center gap-1.5 rounded-full border border-ink-faint/30 bg-white px-4 py-2 text-sm font-medium shadow-sm"
                    >
                      <Pencil size={14} />
                      Edit profile
                    </button>
                  )}
                  {onOwnCoverClick && (
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setProfileMenuOpen((open) => !open)}
                        disabled={coverUploading}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-ink-faint/30 bg-white text-ink-light shadow-sm transition hover:bg-paper-dim disabled:opacity-60"
                        aria-label="Profile options"
                        aria-haspopup="menu"
                        aria-expanded={profileMenuOpen}
                        title="Profile options"
                      >
                        <MoreHorizontal size={18} />
                      </button>
                      {profileMenuOpen && (
                        <>
                          <button
                            type="button"
                            className="fixed inset-0 z-20 cursor-default bg-transparent"
                            aria-label="Close profile options"
                            onClick={() => setProfileMenuOpen(false)}
                          />
                          <div className="absolute right-0 top-11 z-30 w-48 overflow-hidden rounded-xl border border-paper-dim bg-white py-1 shadow-xl" role="menu">
                            <button
                              type="button"
                              role="menuitem"
                              onClick={() => {
                                setProfileMenuOpen(false);
                                onOwnCoverClick();
                              }}
                              className="flex w-full items-center px-3 py-2.5 text-left text-sm font-medium text-ink hover:bg-paper"
                            >
                              {coverUploading ? "Uploading…" : profile.cover_url ? "Change cover photo" : "Add cover photo"}
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <MessageButton targetUserId={profile.id} />
                  <FollowButton targetUserId={profile.id} />
                </>
              )}
            </div>
          </div>

          <h1 className="mt-3 text-2xl">{name}</h1>
          {profile.username && <p className="text-sm text-ink-faint">@{profile.username}</p>}
          {(profile.headline || profile.profession) && (
            <p className="mt-2 font-medium text-ink-light">{profile.headline || profile.profession}</p>
          )}
          <div className="mt-1 flex flex-wrap gap-x-3 text-sm text-ink-faint">
            {profile.workplace && <span>{profile.workplace}</span>}
            {profile.school && <span>{profile.school}</span>}
            {profile.location && <span>{profile.location}</span>}
            {profile.country && <span>{profile.country}</span>}
          </div>
          {counts && <p className="mt-2 text-sm text-ink-faint">{counts.followers} followers · {counts.following} following</p>}
          {profile.bio && <p className="mt-4 whitespace-pre-line text-[15px] leading-6 text-ink-light">{profile.bio}</p>}
          {profile.skills.length > 0 && (
            <div className="mt-5">
              <h2 className="text-sm font-medium">Skills</h2>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {profile.skills.map((skill) => (
                  <span key={skill} className="rounded-full bg-paper-dim px-2.5 py-1 text-xs text-ink-light">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {photoOpen && profile.avatar_url && (
        <ProfilePhotoViewer src={profile.avatar_url} name={name} onClose={() => setPhotoOpen(false)} />
      )}
    </>
  );
}

function EditOwnProfile({ onDone }: { onDone: () => void }) {
  const { data: profile } = useOwnProfile();
  const update = useUpdateOwnProfile();
  const avatarUpload = useAvatarUpload();
  const fileRef = useRef<HTMLInputElement>(null);
  const { data: categories } = useOpportunityCategories();
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [headline, setHeadline] = useState("");
  const [profession, setProfession] = useState("");
  const [workplace, setWorkplace] = useState("");
  const [school, setSchool] = useState("");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [country, setCountry] = useState("");
  const [skillsInput, setSkillsInput] = useState("");
  const [goals, setGoals] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [photoSuccess, setPhotoSuccess] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setFullName(profile.full_name ?? "");
    setUsername(profile.username ?? "");
    setHeadline(profile.headline ?? "");
    setProfession(profile.profession ?? "");
    setWorkplace(profile.workplace ?? "");
    setSchool(profile.school ?? "");
    setBio(profile.bio ?? "");
    setLocation(profile.location ?? "");
    setCountry(profile.country ?? "");
    setSkillsInput(profile.skills.join(", "));
    setGoals(profile.goal_categories);
  }, [profile]);

  async function uploadAvatar(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError(null);
    setPhotoSuccess(false);
    try {
      await avatarUpload.mutateAsync(file);
      setPhotoSuccess(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      event.target.value = "";
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const cleanUsername = username.trim().toLowerCase();
    if (cleanUsername && !/^[a-z0-9_]{3,24}$/.test(cleanUsername)) {
      setError("Username must be 3–24 lowercase letters, numbers or underscores.");
      return;
    }

    try {
      await update.mutateAsync({
        full_name: fullName.trim() || null,
        username: cleanUsername || null,
        headline: headline.trim() || null,
        profession: profession.trim() || null,
        workplace: workplace.trim() || null,
        school: school.trim() || null,
        bio: bio.trim() || null,
        location: location.trim() || null,
        country: country.trim() || null,
        skills: skillsInput.split(",").map((skill) => skill.trim()).filter(Boolean),
        goal_categories: goals,
      });
      onDone();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <form onSubmit={submit} className="max-w-2xl space-y-4 rounded-3xl bg-white p-5 shadow-card">
      <div className="flex items-center justify-between">
        <h1 className="text-xl">Edit profile</h1>
        <button type="button" onClick={onDone} className="text-sm text-ink-light">Cancel</button>
      </div>

      <div className="flex items-center gap-4 rounded-2xl bg-paper-dim p-3">
        {profile?.avatar_url ? (
          <img src={profile.avatar_url} alt="" className="h-16 w-16 rounded-full object-cover" />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-trust-light text-xl text-trust-dark">
            {(profile?.full_name ?? "?").charAt(0).toUpperCase()}
          </div>
        )}
        <div>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={avatarUpload.isPending}
            className="inline-flex items-center gap-2 rounded-full border border-ink-faint/30 bg-white px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            <Camera size={15} />
            {avatarUpload.isPending ? "Uploading…" : "Change profile photo"}
          </button>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadAvatar} className="hidden" />
          <p className="mt-1 text-xs text-ink-faint">JPG, PNG or WebP · max 8 MB</p>
        </div>
      </div>

      {photoSuccess && <p className="text-sm text-trust-dark">Profile photo updated.</p>}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm text-ink-light">Full name<input value={fullName} onChange={(e) => setFullName(e.target.value)} className="mt-1 w-full rounded-lg border border-ink-faint/30 px-3 py-2 text-ink outline-none focus:border-brand" /></label>
        <label className="text-sm text-ink-light">Username<input value={username} onChange={(e) => setUsername(e.target.value)} className="mt-1 w-full rounded-lg border border-ink-faint/30 px-3 py-2 text-ink outline-none focus:border-brand" /></label>
        <label className="text-sm text-ink-light">Headline<input value={headline} onChange={(e) => setHeadline(e.target.value)} className="mt-1 w-full rounded-lg border border-ink-faint/30 px-3 py-2 text-ink outline-none focus:border-brand" /></label>
        <label className="text-sm text-ink-light">Profession / field<input value={profession} onChange={(e) => setProfession(e.target.value)} placeholder="e.g. Mathematics Tutor" className="mt-1 w-full rounded-lg border border-ink-faint/30 px-3 py-2 text-ink outline-none focus:border-brand" /></label>
        <label className="text-sm text-ink-light">Workplace<input value={workplace} onChange={(e) => setWorkplace(e.target.value)} className="mt-1 w-full rounded-lg border border-ink-faint/30 px-3 py-2 text-ink outline-none focus:border-brand" /></label>
        <label className="text-sm text-ink-light">School<input value={school} onChange={(e) => setSchool(e.target.value)} className="mt-1 w-full rounded-lg border border-ink-faint/30 px-3 py-2 text-ink outline-none focus:border-brand" /></label>
        <label className="text-sm text-ink-light">Location<input value={location} onChange={(e) => setLocation(e.target.value)} className="mt-1 w-full rounded-lg border border-ink-faint/30 px-3 py-2 text-ink outline-none focus:border-brand" /></label>
        <label className="text-sm text-ink-light">Country<input value={country} onChange={(e) => setCountry(e.target.value)} className="mt-1 w-full rounded-lg border border-ink-faint/30 px-3 py-2 text-ink outline-none focus:border-brand" /></label>
      </div>

      <label className="block text-sm text-ink-light">
        About
        <textarea rows={4} value={bio} onChange={(e) => setBio(e.target.value)} className="mt-1 w-full rounded-lg border border-ink-faint/30 px-3 py-2 text-ink outline-none focus:border-brand" />
      </label>

      <label className="block text-sm text-ink-light">
        Skills — separated by commas
        <input value={skillsInput} onChange={(e) => setSkillsInput(e.target.value)} placeholder="e.g. Mathematics tutoring, Graphic design, React" className="mt-1 w-full rounded-lg border border-ink-faint/30 px-3 py-2 text-ink outline-none focus:border-brand" />
        <span className="mt-1 block text-xs text-ink-faint">POSSARA uses profession and skills to improve people and tutor recommendations.</span>
      </label>

      <div>
        <p className="text-sm text-ink-light">Opportunity interests</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {categories?.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => setGoals((current) => current.includes(category.slug) ? current.filter((value) => value !== category.slug) : [...current, category.slug])}
              className={`rounded-full border px-3 py-1.5 text-sm ${goals.includes(category.slug) ? "border-brand bg-brand-light text-brand-dark" : "border-ink-faint/30 text-ink-light"}`}
            >
              {category.name}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-flag">{error}</p>}
      <button disabled={update.isPending || avatarUpload.isPending} className="rounded-full bg-ink px-5 py-2 text-sm font-medium text-white disabled:opacity-50">
        {update.isPending ? "Saving…" : "Save profile"}
      </button>
    </form>
  );
}

export function Profile() {
  const { username, id } = useParams<{ username?: string; id?: string }>();
  const { userId } = useAuth();
  const { data: ownProfile, isLoading } = useOwnProfile();
  const coverUpload = useCoverUpload();
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [coverStatus, setCoverStatus] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  const isOwn = username === "me" || !!(id && id === userId) || !!(ownProfile?.username && username === ownProfile.username);

  async function changeOwnCover(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setCoverStatus(null);
    try {
      await coverUpload.mutateAsync(file);
      setCoverStatus("Cover photo updated.");
    } catch (err) {
      setCoverStatus((err as Error).message);
    } finally {
      event.target.value = "";
    }
  }

  if (isOwn) {
    if (!userId) return <p className="text-ink-light">Sign in to view your profile.</p>;
    if (isLoading || !ownProfile) return <p className="text-ink-light">Loading…</p>;
    if (editing) return <EditOwnProfile onDone={() => setEditing(false)} />;

    return (
      <div className="space-y-5">
        <ProfileView
          profile={ownProfile}
          own
          onEdit={() => setEditing(true)}
          onOwnCoverClick={() => coverInputRef.current?.click()}
          coverUploading={coverUpload.isPending}
        />
        <input ref={coverInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={changeOwnCover} className="hidden" />
        {coverStatus && <p className="text-sm text-ink-light">{coverStatus}</p>}
        <ProfilePosts profileId={ownProfile.id} />
        <Link to="/settings" className="inline-block text-sm text-brand-dark underline">Privacy, notifications & account settings</Link>
      </div>
    );
  }

  if (id) return <PublicProfileById id={id} />;
  if (username) return <PublicProfile username={username} />;
  return <p className="text-ink-light">No profile specified.</p>;
}

function PublicProfile({ username }: { username: string }) {
  const { data: profile, isLoading, error } = useProfileByUsername(username);
  if (isLoading) return <p className="text-ink-light">Loading…</p>;
  if (error || !profile) return <p className="text-flag">This profile couldn&apos;t be found.</p>;
  return <div className="space-y-5"><ProfileView profile={profile} /><ProfilePosts profileId={profile.id} /></div>;
}

function PublicProfileById({ id }: { id: string }) {
  const { data: profile, isLoading, error } = useProfileById(id);
  if (isLoading) return <p className="text-ink-light">Loading…</p>;
  if (error || !profile) return <p className="text-flag">This profile couldn&apos;t be found.</p>;
  return <div className="space-y-5"><ProfileView profile={profile} /><ProfilePosts profileId={profile.id} /></div>;
}
