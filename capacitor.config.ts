import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "lol.zuzify.zuzumusic",
  appName: "ZuzuMusic",
  webDir: "dist-native",
  ios: { contentInset: "automatic", scheme: "capacitor" },
};
export default config;
