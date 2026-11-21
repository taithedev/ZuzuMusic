import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ZuzuMusic — Your sound. Your space.",
  description: "A beautiful independent music player and creator platform. Import your music, discover new artists and publish original tracks.",
  applicationName: "ZuzuMusic",
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
