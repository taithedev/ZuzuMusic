"use client";
import { useState } from "react";
import { X, LoaderCircle, LockKeyhole, UserRound } from "lucide-react";
import type { User } from "@/lib/types";

export function AuthModal({ onClose, onAuth }: {
  onClose: () => void;
  onAuth: (user: User) => void;
}) {
  const [mode, setMode] = useState<"login" | "register">("register");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [age, setAge] = useState(false);
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setWorking(true);
    try {
      const response = await fetch("/api/auth/" + mode, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, ageConfirmed: age }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not sign in.");
      onAuth(data.user);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally { setWorking(false); }
  }

  return <div className="modal-overlay" onMouseDown={onClose}>
    <div className="modal auth-modal" onMouseDown={(e) => e.stopPropagation()}>
      <button className="icon-button modal-close" onClick={onClose} aria-label="Close"><X size={18} /></button>
      <div className="modal-emblem"><UserRound size={26} /></div>
      <div className="eyebrow">YOUR SOUND. YOUR SPACE.</div>
      <h2>{mode === "register" ? "Join ZuzuMusic" : "Welcome back"}</h2>
      <p className="muted">Your account unlocks Creator Studio and music releases.</p>
      <form onSubmit={submit} className="stack-form">
        <label>Username<input required minLength={3} maxLength={24} autoComplete="username"
          placeholder="your_username" value={username} onChange={(e) => setUsername(e.target.value)} /></label>
        <label>Password<input required type="password" minLength={12} maxLength={200}
          autoComplete={mode === "register" ? "new-password" : "current-password"}
          placeholder="At least 12 characters" value={password}
          onChange={(e) => setPassword(e.target.value)} /></label>
        {mode === "register" && <label className="check-line">
          <input type="checkbox" checked={age} onChange={(e) => setAge(e.target.checked)} required />
          I confirm I am 13 or older.
        </label>}
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="primary-button full" disabled={working}>
          {working ? <LoaderCircle className="spin" size={17} /> : <LockKeyhole size={17} />}
          {mode === "register" ? "Create account" : "Sign in"}
        </button>
      </form>
      <button className="text-button center" onClick={() => { setMode(mode === "register" ? "login" : "register"); setError(""); }}>
        {mode === "register" ? "Already have an account? Sign in" : "New to ZuzuMusic? Create an account"}
      </button>
      <p className="fine-print">Account recovery and other launch safeguards are being built; do not use a password reused elsewhere.</p>
    </div>
  </div>;
}
