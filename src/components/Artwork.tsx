"use client";
import { Disc3 } from "lucide-react";
export function Artwork({ seed, size = "card" }: { seed: string; size?: "card" | "row" | "player" | "hero" }) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  const hues = [250, 294, 200, 330, 173, 24];
  const hue = hues[Math.abs(hash) % hues.length];
  return <div aria-hidden className={"artwork artwork-" + size} style={{
    background: "radial-gradient(circle at 30% 22%, hsla(" + hue + ",95%,69%,.66), transparent 44%), linear-gradient(145deg,hsl(" + hue + " 40% 31%), #101019 88%)",
  }}><div className="art-ring art-ring-one" /><div className="art-ring art-ring-two" /><Disc3 className="art-disc" strokeWidth={1.2} /></div>;
}
