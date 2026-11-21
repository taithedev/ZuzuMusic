"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Activity, ArrowDownToLine, ArrowRight, Check, ChevronDown, Disc3, ExternalLink,
  FolderHeart, Headphones, Heart, Home, Library, ListMusic, Menu, Music2, Pause,
  Play, Plus, Repeat, Repeat1, Search, Settings2, Shuffle, SkipBack, SkipForward,
  SlidersHorizontal, Sparkles, Trash2, UploadCloud, UserRound, Volume2, VolumeX, X,
} from "lucide-react";
import type { CloudTrack, LocalTrack, PlayerTrack, User } from "@/lib/types";
import { Artwork } from "@/components/Artwork";
import { AuthModal } from "@/components/AuthModal";
import { CreatorStudio } from "@/components/CreatorStudio";
import { getLocalBlob, importLocalFile, listLocalTracks, removeLocalTrack } from "@/lib/local-library";

type View = "home" | "discover" | "library" | "liked" | "spotify" | "studio" | "settings";
type Playlist = { id: string; name: string; trackIds: string[] };
type RepeatMode = "off" | "all" | "one";
const ACCENTS = ["#9b78ff", "#6ec7ff", "#ff759d", "#60dbc4", "#ffc270"];
const NAV: { key: View; label: string; Icon: typeof Home }[] = [
  { key: "home", label: "Home", Icon: Home },
  { key: "discover", label: "Discover", Icon: Sparkles },
  { key: "library", label: "Your Library", Icon: Library },
  { key: "liked", label: "Liked Songs", Icon: Heart },
  { key: "spotify", label: "Spotify", Icon: Disc3 },
  { key: "studio", label: "Creator Studio", Icon: UploadCloud },
];

const fromCloud = (track: CloudTrack): PlayerTrack => ({
  id: "creator-" + track.id, cloudId: track.id, source: "creator",
  title: track.title, artist: track.artist_name, duration: track.duration_seconds,
});
const fromLocal = (track: LocalTrack): PlayerTrack => ({
  id: track.id, source: "local", title: track.title, artist: track.artist,
  duration: track.duration, fileName: track.fileName,
});
const formatTime = (time: number) => Number.isFinite(time)
  ? Math.floor(time / 60) + ":" + String(Math.floor(time % 60)).padStart(2, "0") : "0:00";

export default function MusicApp() {
  const [view, setView] = useState<View>("home");
  const [mobileNav, setMobileNav] = useState(false);
  const [local, setLocal] = useState<LocalTrack[]>([]);
  const [catalog, setCatalog] = useState<CloudTrack[]>([]);
  const [catalogError, setCatalogError] = useState("");
  const [search, setSearch] = useState("");
  const [spotifySearch, setSpotifySearch] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [admin, setAdmin] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [likes, setLikes] = useState<string[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState<string | null>(null);
  const [persistReady, setPersistReady] = useState(false);
  const [accent, setAccent] = useState(ACCENTS[0]);
  const [current, setCurrent] = useState<PlayerTrack | null>(null);
  const [queue, setQueue] = useState<PlayerTrack[]>([]);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [length, setLength] = useState(0);
  const [volume, setVolume] = useState(0.78);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<RepeatMode>("off");
  const [speed, setSpeed] = useState(1);
  const [bass, setBass] = useState(0);
  const [treble, setTreble] = useState(0);
  const [showQueue, setShowQueue] = useState(false);
  const [notice, setNotice] = useState("");
  const audioRef = useRef<HTMLAudioElement>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const eqRef = useRef<{ context: AudioContext; low: BiquadFilterNode; high: BiquadFilterNode } | null>(null);

  const refreshCatalog = useCallback(async () => {
    try {
      const response = await fetch("/api/tracks", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Catalog offline.");
      setCatalog(data.tracks);
      setCatalogError("");
    } catch (err) {
      setCatalogError(err instanceof Error ? err.message : "Catalog offline.");
    }
  }, []);

  const refreshAccount = useCallback(async () => {
    try {
      const response = await fetch("/api/me", { cache: "no-store" });
      const data = await response.json();
      setUser(data.user || null);
      setAdmin(Boolean(data.admin));
    } catch { setUser(null); setAdmin(false); }
  }, []);

  useEffect(() => {
    void listLocalTracks().then(setLocal).catch(() => setNotice("Local storage is not available in this browser."));
    void refreshCatalog();
    void refreshAccount();
    try {
      setLikes(JSON.parse(localStorage.getItem("zm-likes") || "[]"));
      setPlaylists(JSON.parse(localStorage.getItem("zm-playlists") || "[]"));
      const storedAccent = localStorage.getItem("zm-accent");
      if (storedAccent && ACCENTS.includes(storedAccent)) setAccent(storedAccent);
    } catch {}
    setPersistReady(true);
  }, [refreshCatalog, refreshAccount]);

  useEffect(() => {
    if (!persistReady) return;
    localStorage.setItem("zm-likes", JSON.stringify(likes));
    localStorage.setItem("zm-playlists", JSON.stringify(playlists));
    localStorage.setItem("zm-accent", accent);
    document.documentElement.style.setProperty("--accent", accent);
  }, [likes, playlists, accent, persistReady]);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) { audio.volume = volume; audio.playbackRate = speed; }
  }, [volume, speed]);

  useEffect(() => {
    if (eqRef.current) {
      eqRef.current.low.gain.value = bass;
      eqRef.current.high.gain.value = treble;
    }
  }, [bass, treble]);

  const localTracks = local.map(fromLocal);
  const cloudTracks = catalog.map(fromCloud);
  const allTracks = [...cloudTracks, ...localTracks];
  const matched = (track: PlayerTrack) => (track.title + " " + track.artist).toLowerCase().includes(search.toLowerCase().trim());
  const searched = allTracks.filter(matched);
  const likedTracks = searched.filter((track) => likes.includes(track.id));
  const activePlaylist = playlists.find((p) => p.id === selectedPlaylist);
  const visibleTracks = view === "liked" ? likedTracks :
    view === "library" && activePlaylist ? searched.filter((t) => activePlaylist.trackIds.includes(t.id)) :
    view === "library" ? searched.filter((t) => t.source === "local") :
    view === "discover" ? cloudTracks.filter(matched) : searched;

  useEffect(() => {
    if (!current) return;
    const audio = audioRef.current;
    if (!audio) return;
    let cancelled = false;
    let objectUrl = "";
    setPosition(0); setLength(current.duration || 0);
    async function load() {
      let src = "";
      if (current?.source === "local") {
        const blob = await getLocalBlob(current.id);
        if (!blob) throw new Error("Local file not found.");
        objectUrl = URL.createObjectURL(blob);
        src = objectUrl;
      } else {
        const response = await fetch("/api/tracks/" + current?.cloudId + "/stream");
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Could not load stream.");
        src = data.url;
      }
      if (cancelled || !audio) return;
      audio.src = src;
      audio.load();
      try { await audio.play(); setPlaying(true); }
      catch { setPlaying(false); }
    }
    void load().catch((error) => { if (!cancelled) setNotice(error instanceof Error ? error.message : "Playback unavailable."); });
    return () => {
      cancelled = true;
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [current?.id]);

  function ensureEQ() {
    if (eqRef.current || !audioRef.current) return;
    try {
      const context = new AudioContext();
      const source = context.createMediaElementSource(audioRef.current);
      const low = context.createBiquadFilter();
      low.type = "lowshelf"; low.frequency.value = 190; low.gain.value = bass;
      const high = context.createBiquadFilter();
      high.type = "highshelf"; high.frequency.value = 3600; high.gain.value = treble;
      source.connect(low).connect(high).connect(context.destination);
      eqRef.current = { context, low, high };
      void context.resume();
    } catch { setNotice("Equalizer is unavailable on this device."); }
  }

  function playTrack(track: PlayerTrack, selection = visibleTracks) {
    if (track.id === current?.id) {
      togglePlay();
    } else {
      setQueue(selection.length ? selection : [track]);
      setCurrent(track);
    }
    setShowQueue(false);
  }

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;
    if (!current) {
      const first = visibleTracks[0] || allTracks[0];
      if (first) playTrack(first, visibleTracks);
      else setNotice("Import some music or discover a creator release first.");
    } else if (audio.paused) {
      void audio.play().then(() => setPlaying(true)).catch(() => setNotice("Could not resume audio."));
      if (eqRef.current) void eqRef.current.context.resume();
    } else { audio.pause(); setPlaying(false); }
  }

  function move(direction: number, fromEnded = false) {
    if (!current || !audioRef.current) return;
    if (fromEnded && repeat === "one") {
      audioRef.current.currentTime = 0;
      void audioRef.current.play();
      return;
    }
    const tracks = queue.length ? queue : allTracks;
    if (!tracks.length) return;
    const index = tracks.findIndex((t) => t.id === current.id);
    let next = shuffle ? Math.floor(Math.random() * tracks.length) :
      (index + direction + tracks.length) % tracks.length;
    if (fromEnded && repeat === "off" && !shuffle && index === tracks.length - 1) {
      setPlaying(false);
      return;
    }
    if (shuffle && tracks.length > 1 && next === index) next = (next + 1) % tracks.length;
    setCurrent(tracks[next]);
  }

  function toggleLike(id: string) {
    setLikes((items) => items.includes(id) ? items.filter((x) => x !== id) : [...items, id]);
  }

  async function importFiles(files: FileList | null) {
    if (!files?.length) return;
    let imported = 0;
    for (const file of Array.from(files)) {
      try { await importLocalFile(file); imported++; }
      catch (err) { setNotice(err instanceof Error ? err.message : "Import failed."); }
    }
    setLocal(await listLocalTracks());
    if (importRef.current) importRef.current.value = "";
    if (imported) { setNotice(imported + " track(s) saved locally on this device."); setView("library"); setSelectedPlaylist(null); }
  }

  function createPlaylist() {
    const name = window.prompt("Playlist name (max 60 characters)");
    if (!name?.trim()) return;
    const playlist: Playlist = { id: crypto.randomUUID(), name: name.trim().slice(0, 60), trackIds: [] };
    setPlaylists((items) => [playlist, ...items]); setSelectedPlaylist(playlist.id); setView("library");
  }

  function addToPlaylist(track: PlayerTrack) {
    if (!playlists.length) {
      setNotice("Create a playlist in Your Library first.");
      return;
    }
    const name = window.prompt("Add to playlist. Enter the exact playlist name:\n" + playlists.map((p) => p.name).join("\n"));
    if (!name) return;
    const found = playlists.find((p) => p.name.toLowerCase() === name.toLowerCase());
    if (!found) return setNotice("Playlist not found.");
    setPlaylists((items) => items.map((p) => p.id !== found.id ? p :
      { ...p, trackIds: Array.from(new Set([...p.trackIds, track.id])) }));
    setNotice("Added to " + found.name);
  }

  async function deleteLocal(track: PlayerTrack) {
    if (track.source !== "local" || !window.confirm("Remove this audio file from ZuzuMusic on this device?")) return;
    await removeLocalTrack(track.id);
    setLocal(await listLocalTracks());
    if (current?.id === track.id) { audioRef.current?.pause(); setCurrent(null); setPlaying(false); }
  }

  function navigate(next: View) {
    setView(next); setMobileNav(false); setSearch("");
    if (next !== "library") setSelectedPlaylist(null);
  }

  function renderRows(tracks: PlayerTrack[], empty: string) {
    return tracks.length ? <div className="tracks">
      {tracks.map((track, i) => <div className={"track-row " + (current?.id === track.id ? "track-active" : "")} key={track.id}>
        <button className="track-main" onClick={() => playTrack(track, tracks)}>
          <span className="track-index">{current?.id === track.id && playing ? <Activity size={18} /> : String(i + 1).padStart(2, "0")}</span>
          <Artwork seed={track.id} size="row" />
          <span className="track-info"><strong>{track.title}</strong><small>{track.artist}</small></span>
        </button>
        <span className="track-source">{track.source === "local" ? "LOCAL" : "ZUZUMUSIC"}</span>
        <button className={"icon-button " + (likes.includes(track.id) ? "liked" : "")}
          title="Like" aria-label={"Like " + track.title} onClick={() => toggleLike(track.id)}><Heart size={17} fill={likes.includes(track.id) ? "currentColor" : "none"} /></button>
        <button className="icon-button" title="Add to playlist" aria-label={"Add " + track.title + " to playlist"} onClick={() => addToPlaylist(track)}><Plus size={18} /></button>
        <span className="track-time">{formatTime(track.duration || 0)}</span>
        {view === "library" && track.source === "local" && <button className="icon-button danger-text" aria-label="Remove local file" onClick={() => void deleteLocal(track)}><Trash2 size={16} /></button>}
      </div>)}
    </div> : <div className="empty-state"><div className="empty-icon"><Music2 size={33} /></div><h3>Nothing here yet</h3><p>{empty}</p>
      <button className="secondary-button" onClick={() => importRef.current?.click()}><Plus size={16} /> Import your music</button></div>;
  }

  return <div className="app-shell">
    <audio ref={audioRef} crossOrigin="anonymous" preload="metadata"
      onTimeUpdate={(e) => setPosition(e.currentTarget.currentTime)}
      onDurationChange={(e) => setLength(Number.isFinite(e.currentTarget.duration) ? e.currentTarget.duration : 0)}
      onEnded={() => move(1, true)} onPause={() => setPlaying(false)} onPlay={() => setPlaying(true)} />
    <input ref={importRef} type="file" multiple accept="audio/*,.flac,.mp3,.wav,.ogg,.m4a"
      hidden onChange={(e) => void importFiles(e.target.files)} />
    <aside className={"sidebar " + (mobileNav ? "sidebar-open" : "")}>
      <div className="sidebar-top"><div className="brand"><div className="brand-icon"><Activity size={22} strokeWidth={3} /></div>
        <span>Zuzu<span>Music</span></span></div>
        <button className="icon-button mobile-only" onClick={() => setMobileNav(false)} aria-label="Close menu"><X size={19} /></button></div>
      <div className="nav-section-label">MENU</div>
      <nav className="nav-links" aria-label="Main menu">
        {NAV.map(({ key, label, Icon }) => <button key={key} onClick={() => navigate(key)}
          className={"nav-link " + (view === key ? "nav-selected" : "")}><Icon size={19} /><span>{label}</span>
          {key === "liked" && likes.length > 0 && <small>{likes.length}</small>}</button>)}
      </nav>
      <div className="sidebar-rule" />
      <div className="nav-section-label playlist-label">YOUR PLAYLISTS <button className="icon-button" onClick={createPlaylist} title="New playlist"><Plus size={17} /></button></div>
      <div className="playlist-links">{playlists.map((p) => <button key={p.id}
        className={"playlist-link " + (view === "library" && selectedPlaylist === p.id ? "playlist-selected" : "")}
        onClick={() => { setSelectedPlaylist(p.id); setView("library"); setMobileNav(false); }}><span className="playlist-emoji">♫</span>{p.name}</button>)}
        {playlists.length === 0 && <div className="playlist-hint">Create your first mix.</div>}</div>
      <div className="sidebar-footer">
        <div className="sidebar-pro"><div className="pro-stars"><Sparkles size={19} /></div>
          <strong>Made for music lovers.</strong><span>Unlimited local listening. Your music, your rules.</span>
          <button onClick={() => importRef.current?.click()}>Import tracks <ArrowRight size={15} /></button></div>
        <button className={"nav-link " + (view === "settings" ? "nav-selected" : "")} onClick={() => navigate("settings")}><Settings2 size={19} /> Settings</button>
      </div>
    </aside>
    {mobileNav && <div className="mobile-shade" onClick={() => setMobileNav(false)} />}
    <div className="main-column">
      <header className="topbar">
        <button className="icon-button mobile-only" onClick={() => setMobileNav(true)} aria-label="Open menu"><Menu size={22} /></button>
        <div className="topbar-search"><Search size={18} /><input aria-label="Search music" placeholder="Search your music..."
          value={search} onChange={(e) => setSearch(e.target.value)} onFocus={() => { if (view === "spotify") setView("discover"); }} />
          <kbd>SEARCH</kbd></div>
        <div className="top-actions"><button className="top-import" onClick={() => importRef.current?.click()}><ArrowDownToLine size={17} /> Import Music</button>
          {user ? <button className="user-chip" onClick={() => navigate("studio")}><span className="avatar">{user.username.slice(0,1).toUpperCase()}</span><strong>{user.username}</strong><ChevronDown size={15} /></button> :
          <button className="user-chip" onClick={() => setAuthOpen(true)}><span className="avatar"><UserRound size={17} /></span><strong>Sign in</strong></button>}</div>
      </header>
      <main className="content">
        {view === "home" && <>
          <section className="hero">
            <div className="hero-copy"><span className="hero-eyebrow"><span className="glow-dot" /> YOUR MUSIC. REIMAGINED.</span>
              <h1>Your sound.<br /><em>Your universe.</em></h1>
              <p>Discover emerging creators, play your local collection, and make every listening session yours.</p>
              <div className="hero-buttons"><button className="primary-button" onClick={() => navigate("discover")}><Play size={16} fill="currentColor" /> Discover music</button>
                <button className="ghost-button" onClick={() => importRef.current?.click()}><Plus size={18} /> Import files</button></div></div>
            <div className="hero-visual"><div className="hero-halo" /><Artwork seed="zuzumusic-hero" size="hero" /><div className="floating-note note-one">♫</div><div className="floating-note note-two">♪</div></div>
          </section>
          <div className="stat-strip"><div><Sparkles size={17} /><strong>Creator-first</strong><span>Independent artists</span></div>
            <div><Headphones size={17} /><strong>Premium feel</strong><span>Zero subscription</span></div>
            <div><SlidersHorizontal size={17} /><strong>Make it yours</strong><span>Audio controls and themes</span></div></div>
          <section className="content-section">
            <div className="section-heading"><div><span className="eyebrow">MADE FOR YOU</span><h2>Jump back in<span className="period">.</span></h2></div>
              <button className="section-link" onClick={() => navigate("library")}>Your Library <ArrowRight size={16} /></button></div>
            <div className="quick-grid"><button className="quick-card" onClick={() => navigate("liked")}><div className="quick-art heart-art"><Heart size={27} fill="white" /></div><strong>Liked Songs</strong><ArrowRight size={17} /></button>
              <button className="quick-card" onClick={() => { setSelectedPlaylist(null); navigate("library"); }}><div className="quick-art"><FolderHeart size={27} /></div><strong>Local Library</strong><ArrowRight size={17} /></button>
              <button className="quick-card" onClick={() => navigate("studio")}><div className="quick-art creator-art"><UploadCloud size={27} /></div><strong>Creator Studio</strong><ArrowRight size={17} /></button></div>
          </section>
          <section className="content-section">
            <div className="section-heading"><div><span className="eyebrow">FRESH SOUNDS</span><h2>From the community<span className="period">.</span></h2></div>
              <button className="section-link" onClick={() => navigate("discover")}>Explore all <ArrowRight size={16} /></button></div>
            {cloudTracks.length ? <div className="album-grid">{cloudTracks.slice(0, 6).map((t) => <button key={t.id} className="album-card" onClick={() => playTrack(t, cloudTracks)}>
              <Artwork seed={t.id} /><strong>{t.title}</strong><span>{t.artist}</span><div className="album-play"><Play size={19} fill="currentColor" /></div></button>)}</div> :
            <div className="empty-banner"><div className="empty-banner-icon"><Disc3 size={23} /></div><div><strong>The next big track starts here.</strong>
              <span>{catalogError || "Approved creator releases will appear here."}</span></div><button onClick={() => navigate("studio")}>Upload a song <ArrowRight size={16} /></button></div>}
          </section>
          {localTracks.length > 0 && <section className="content-section"><div className="section-heading"><div><span className="eyebrow">ON THIS DEVICE</span><h2>Your collection<span className="period">.</span></h2></div></div>{renderRows(localTracks.slice(0, 6), "")}</section>}
        </>}
        {view === "discover" && <><div className="page-heading"><span className="eyebrow">EXPLORE THE UNDERGROUND</span>
          <h1>Discover<span className="period">.</span></h1><p>Fresh, independently released music from ZuzuMusic creators.</p></div>
          <div className="filter-chips"><span className="active-chip">All releases</span><span>Independent artists</span><span>Original music</span></div>
          {catalogError && <div className="inline-notice">{catalogError}</div>}
          {renderRows(cloudTracks.filter(matched), "There are no approved releases yet. Be the first to create one.")}</>}
        {view === "liked" && <><div className="page-heading"><span className="eyebrow">THE SOUNDTRACK TO YOUR LIFE</span>
          <h1>Liked Songs<span className="period">.</span></h1><p>{likes.length} saved favorites on this device.</p></div>
          {renderRows(likedTracks, "Hit the heart on any track to save it here.")}</>}
        {view === "library" && <><div className="page-heading"><span className="eyebrow">ALL YOUR FAVORITES IN ONE PLACE</span>
          <h1>{activePlaylist?.name || "Your Library"}<span className="period">.</span></h1>
          <p>{activePlaylist ? activePlaylist.trackIds.length + " saved songs" : localTracks.length + " imported files on this device"}</p></div>
          <div className="library-actions"><button className="primary-button" onClick={() => importRef.current?.click()}><Plus size={17} /> Add music</button>
            <button className="secondary-button" onClick={createPlaylist}><ListMusic size={17} /> New playlist</button>
            {activePlaylist && <button className="secondary-button" onClick={() => { setSelectedPlaylist(null); }}>All local tracks</button>}
            {activePlaylist && <button className="secondary-button danger-text" onClick={() => {
              if (window.confirm("Delete playlist? Your music files stay safe.")) {
                setPlaylists((p) => p.filter((x) => x.id !== activePlaylist.id)); setSelectedPlaylist(null);
              }
            }}><Trash2 size={16} /> Delete playlist</button>}</div>
          {!activePlaylist && playlists.length > 0 && <div className="playlist-card-grid">{playlists.map((p) =>
            <button className="playlist-card" key={p.id} onClick={() => setSelectedPlaylist(p.id)}>
              <div className="playlist-card-art"><ListMusic size={31} /></div><strong>{p.name}</strong><span>{p.trackIds.length} songs</span></button>)}</div>}
          {renderRows(visibleTracks, activePlaylist ? "Add songs using the + beside a track." : "Import MP3, FLAC, WAV or other audio files to listen offline.")}</>}
        {view === "spotify" && <><div className="page-heading"><span className="eyebrow">CONNECTED EXPERIENCES</span>
          <h1>Spotify<span className="period">.</span></h1><p>Explore music on Spotify, without mixing audio services or copying tracks.</p></div>
          <section className="spotify-panel panel"><div className="spotify-mark"><Disc3 size={38} /></div><span className="eyebrow">OPEN IN SPOTIFY</span>
            <h2>All the music you know.</h2><p>Spotify music opens in Spotify itself. ZuzuMusic&apos;s independent songs and local player stay separate.</p>
            <form onSubmit={(e) => { e.preventDefault(); window.open("https://open.spotify.com/search/" + encodeURIComponent(spotifySearch.trim()), "_blank", "noopener,noreferrer"); }} className="spotify-form">
              <Search size={19} /><input value={spotifySearch} onChange={(e) => setSpotifySearch(e.target.value)} placeholder="Search Spotify for an artist or track" />
              <button type="submit">Search <ExternalLink size={15} /></button></form>
            <a className="secondary-button" href="https://open.spotify.com/" target="_blank" rel="noopener noreferrer">Open Spotify <ExternalLink size={16} /></a>
            <p className="tiny muted">Spotify&apos;s terms restrict combining its streams with third-party catalogs and require separate authorization for protected integrations. This is not a Spotify mod or a Premium bypass.</p>
          </section></>}
        {view === "studio" && <CreatorStudio user={user} admin={admin} onRequireAuth={() => setAuthOpen(true)} onPublished={() => void refreshCatalog()} />}
        {view === "settings" && <><div className="page-heading"><span className="eyebrow">TUNE THE EXPERIENCE</span>
          <h1>Settings<span className="period">.</span></h1><p>Make ZuzuMusic yours, down to the last detail.</p></div>
          <div className="settings-grid">
            <section className="panel settings-panel"><div className="section-heading"><h2>Appearance</h2><Sparkles size={19} /></div>
              <strong>Accent color</strong><p className="muted">Personalize the glow.</p>
              <div className="accent-options">{ACCENTS.map((color) => <button key={color} aria-label={"Select accent " + color}
                className={"accent-dot " + (accent === color ? "accent-current" : "")} style={{ background: color }}
                onClick={() => setAccent(color)}>{accent === color && <Check size={17} />}</button>)}</div></section>
            <section className="panel settings-panel"><div className="section-heading"><h2>Audio lab</h2><SlidersHorizontal size={19} /></div>
              <p className="muted">Real audio filters. Works on supported local and creator streams.</p>
              <label className="slider-label">Bass <strong>{bass > 0 ? "+" : ""}{bass} dB</strong></label>
              <input type="range" min={-12} max={12} value={bass} onPointerDown={ensureEQ} onChange={(e) => { ensureEQ(); setBass(Number(e.target.value)); }} />
              <label className="slider-label">Treble <strong>{treble > 0 ? "+" : ""}{treble} dB</strong></label>
              <input type="range" min={-12} max={12} value={treble} onPointerDown={ensureEQ} onChange={(e) => { ensureEQ(); setTreble(Number(e.target.value)); }} />
              <label className="slider-label">Playback speed</label>
              <div className="speed-row">{[0.75, 1, 1.25, 1.5].map((n) => <button className={"speed-chip " + (speed === n ? "speed-selected" : "")}
                key={n} onClick={() => setSpeed(n)}>{n}x</button>)}</div></section>
            <section className="panel settings-panel"><div className="section-heading"><h2>Your account</h2><UserRound size={19} /></div>
              <p className="muted">{user ? "Signed in as @" + user.username : "Not signed in."}</p>
              {user ? <button className="secondary-button" onClick={async () => {
                await fetch("/api/auth/logout", { method: "POST" }); setUser(null); setAdmin(false);
                setNotice("Signed out.");
              }}>Sign out</button> : <button className="primary-button" onClick={() => setAuthOpen(true)}>Sign in</button>}</section>
            <section className="panel settings-panel"><div className="section-heading"><h2>Storage and privacy</h2><Library size={19} /></div>
              <p className="muted">Imported audio and likes are stored in this browser only, not uploaded to ZuzuMusic servers. Creator releases are uploaded only when submitted.</p>
              <strong>{local.length} local tracks</strong></section>
          </div></>}
      </main>
    </div>
    <aside className={"queue-panel " + (showQueue ? "queue-visible" : "")}>
      <div className="section-heading"><h2>Up next</h2><button className="icon-button" onClick={() => setShowQueue(false)}><X size={18} /></button></div>
      {queue.length ? queue.map((track) => <button className={"queue-entry " + (current?.id === track.id ? "queue-current" : "")}
        key={track.id} onClick={() => { setCurrent(track); setShowQueue(false); }}><Artwork seed={track.id} size="row" /><span><strong>{track.title}</strong><small>{track.artist}</small></span></button>) :
        <p className="muted">Play some tracks to start a queue.</p>}
    </aside>
    <div className="player"><div className="player-track">
      {current ? <><Artwork seed={current.id} size="player" /><div className="player-info"><strong>{current.title}</strong><span>{current.artist}</span></div>
        <button className={"icon-button player-like " + (likes.includes(current.id) ? "liked" : "")} onClick={() => toggleLike(current.id)}
          aria-label="Like playing song"><Heart size={18} fill={likes.includes(current.id) ? "currentColor" : "none"} /></button></> :
        <><div className="player-placeholder"><Music2 size={22} /></div><div className="player-info"><strong>Nothing playing</strong><span>Pick a track to get started</span></div></>}
      </div><div className="player-center"><div className="player-controls">
        <button className={"icon-button player-small " + (shuffle ? "control-on" : "")} onClick={() => setShuffle(!shuffle)} title="Shuffle"><Shuffle size={17} /></button>
        <button className="icon-button" onClick={() => move(-1)} aria-label="Previous track"><SkipBack fill="currentColor" size={20} /></button>
        <button className="play-circle" onClick={togglePlay} aria-label={playing ? "Pause" : "Play"}>{playing ? <Pause size={21} fill="currentColor" /> : <Play size={21} fill="currentColor" />}</button>
        <button className="icon-button" onClick={() => move(1)} aria-label="Next track"><SkipForward fill="currentColor" size={20} /></button>
        <button className={"icon-button player-small " + (repeat !== "off" ? "control-on" : "")} onClick={() => setRepeat(repeat === "off" ? "all" : repeat === "all" ? "one" : "off")} title={"Repeat " + repeat}>
          {repeat === "one" ? <Repeat1 size={17} /> : <Repeat size={17} />}</button>
      </div><div className="progress-line"><span>{formatTime(position)}</span><input aria-label="Seek" type="range" min="0" max={Math.max(length, 1)}
        step=".1" value={Math.min(position, Math.max(length, 1))}
        onChange={(e) => { if (audioRef.current && length > 0) audioRef.current.currentTime = Number(e.target.value); }}
        style={{ "--progress": ((position / Math.max(length, 1)) * 100) + "%" } as React.CSSProperties} />
        <span>{formatTime(length)}</span></div></div>
      <div className="player-extras"><button className={"icon-button " + (showQueue ? "control-on" : "")} onClick={() => setShowQueue(!showQueue)} title="Queue"><ListMusic size={20} /></button>
        <button className="icon-button" onClick={() => navigate("settings")} title="Equalizer"><SlidersHorizontal size={19} /></button>
        <button className="icon-button" onClick={() => setVolume(volume === 0 ? 0.78 : 0)} aria-label="Mute">
          {volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}</button>
        <input aria-label="Volume" type="range" min="0" max="1" step=".01" value={volume} onChange={(e) => setVolume(Number(e.target.value))}
          style={{ "--progress": (volume * 100) + "%" } as React.CSSProperties} /></div>
    </div>
    {notice && <div className="toast" role="status" onClick={() => setNotice("")}>{notice}<button onClick={() => setNotice("")} aria-label="Dismiss"><X size={15} /></button></div>}
    {authOpen && <AuthModal onClose={() => setAuthOpen(false)} onAuth={(data) => {
      setUser(data); void refreshAccount(); void refreshCatalog();
    }} />}
  </div>;
}
