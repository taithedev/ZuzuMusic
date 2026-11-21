"use client";
import { useEffect, useState } from "react";
import { ArrowUpRight, Check, CircleHelp, CloudUpload, LoaderCircle, RefreshCw, ShieldCheck, UploadCloud, X } from "lucide-react";
import type { CloudTrack, User } from "@/lib/types";
import { Artwork } from "./Artwork";

async function api(path: string, method = "GET", body?: object) {
  const response = await fetch(path, {
    method, headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Request failed.");
  return data;
}

export function CreatorStudio({ user, admin, onRequireAuth, onPublished }: {
  user: User | null; admin: boolean; onRequireAuth: () => void; onPublished: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [rights, setRights] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [myTracks, setMyTracks] = useState<CloudTrack[]>([]);
  const [pending, setPending] = useState<CloudTrack[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function refresh() {
    if (!user) return;
    try {
      const own = await api("/api/tracks?mine=1");
      setMyTracks(own.tracks);
      if (admin) setPending((await api("/api/admin/tracks")).tracks);
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to load uploads."); }
  }
  useEffect(() => { if (user) void refresh(); }, [user?.id, admin]);

  async function publish(event: React.FormEvent) {
    event.preventDefault();
    if (!user) return onRequireAuth();
    if (!file) return setError("Choose an audio file first.");
    setUploading(true); setError(""); setMessage("");
    try {
      let mime = file.type;
      if (!mime && /\.mp3$/i.test(file.name)) mime = "audio/mpeg";
      if (!mime && /\.flac$/i.test(file.name)) mime = "audio/flac";
      const init = await api("/api/uploads/init", "POST", {
        title: title.trim(), mimeType: mime, fileSize: file.size, rightsConfirmed: rights,
      });
      const upload = await fetch(init.uploadUrl, {
        method: "PUT", headers: { "Content-Type": mime }, body: file,
      });
      if (!upload.ok) throw new Error("Storage rejected the upload. Check R2 bucket CORS permissions.");
      await api("/api/uploads/complete", "POST", { trackId: init.trackId });
      setMessage("Submitted for review. Only approved songs appear in Discover.");
      setFile(null); setTitle(""); setRights(false);
      await refresh();
      onPublished();
    } catch (err) { setError(err instanceof Error ? err.message : "Upload failed."); }
    finally { setUploading(false); }
  }

  async function review(trackId: string, status: "approved" | "rejected") {
    try {
      setError("");
      await api("/api/admin/tracks", "PATCH", { trackId, status });
      await refresh(); onPublished();
    } catch (err) { setError(err instanceof Error ? err.message : "Review failed."); }
  }

  return <div className="studio-page">
    <div className="page-heading"><span className="eyebrow">FOR THE NEXT GENERATION OF ARTISTS</span>
      <h1>Creator Studio<span className="period">.</span></h1>
      <p>Release original music. Build your audience. Own your sound.</p>
    </div>
    {!user ? <section className="creator-gate panel">
      <div className="feature-icon"><CloudUpload size={27} /></div>
      <h2>Become a creator</h2><p>Sign in or create a ZuzuMusic account to upload your tracks.</p>
      <button className="primary-button" onClick={onRequireAuth}>Get started <ArrowUpRight size={17} /></button>
    </section> : <>
      <div className="studio-grid">
        <section className="panel studio-upload">
          <div className="section-heading"><div><span className="eyebrow">NEW RELEASE</span><h2>Upload a track</h2></div><UploadCloud size={23} className="muted" /></div>
          <form className="stack-form" onSubmit={publish}>
            <label className="dropzone"><CloudUpload size={32} /><strong>{file ? file.name : "Select an audio file"}</strong>
              <span>MP3, WAV, FLAC, OGG, M4A · Up to 25 MB</span>
              <input type="file" accept=".mp3,.wav,.flac,.ogg,.m4a,audio/*" onChange={(e) => {
                const selected = e.target.files?.[0] || null;
                setFile(selected);
                if (selected) setTitle(selected.name.replace(/\.[^.]+$/, ""));
              }} />
            </label>
            <label>Track title<input required maxLength={120} value={title} placeholder="Your track name"
              onChange={(e) => setTitle(e.target.value)} /></label>
            <label>Artist<input value={user.display_name} disabled /></label>
            <label className="check-line"><input type="checkbox" required checked={rights}
              onChange={(e) => setRights(e.target.checked)} />
              I own or have licenses for all rights needed to distribute this music.</label>
            <p className="tiny muted">Submissions are private until approved. If you are under 18, involve a parent or guardian in publication decisions.</p>
            <button className="primary-button full" disabled={uploading || !file || !rights || !title.trim()}>
              {uploading ? <LoaderCircle size={18} className="spin" /> : <CloudUpload size={18} />}
              {uploading ? "Uploading..." : "Submit for review"}
            </button>
          </form>
        </section>
        <section className="panel studio-uploads">
          <div className="section-heading"><div><span className="eyebrow">YOUR MUSIC</span><h2>Releases</h2></div>
            <button className="icon-button" aria-label="Refresh releases" onClick={() => void refresh()}><RefreshCw size={17} /></button></div>
          {myTracks.length === 0 ? <div className="empty-small"><DiscPlaceholder />Your tracks will appear here.</div> :
            <div className="release-list">{myTracks.map((track) => <div className="release-row" key={track.id}>
              <Artwork seed={track.id} size="row" /><div className="release-meta"><strong>{track.title}</strong>
                <span>{new Date(track.created_at).toLocaleDateString()}</span></div>
              <span className={"status status-" + track.status}>{track.status}</span>
            </div>)}</div>}
          <div className="notice"><CircleHelp size={16} />Public streaming requires creator approvals and properly configured storage.</div>
        </section>
      </div>
      {admin && <section className="panel moderation-panel">
        <div className="section-heading"><div><span className="eyebrow">ADMIN ONLY</span><h2>Review submissions</h2></div><ShieldCheck size={21} /></div>
        {pending.length === 0 ? <p className="muted">No pending submissions.</p> :
          pending.map((track) => <div className="release-row" key={track.id}>
            <Artwork seed={track.id} size="row" /><div className="release-meta">
              <strong>{track.title}</strong><span>by @{track.creator_username}</span></div>
            <button className="small-action" onClick={() => void review(track.id, "approved")}><Check size={16} /> Approve</button>
            <button className="small-action danger" onClick={() => void review(track.id, "rejected")}><X size={16} /> Reject</button>
          </div>)}
      </section>}
    </>}
    {message && <div className="toast success" role="status">{message}</div>}
    {error && <div className="toast error" role="alert">{error}</div>}
  </div>;
}
function DiscPlaceholder() { return <div className="empty-glyph">♫</div>; }
