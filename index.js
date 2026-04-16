// ─── Navigation toggle ────────────────────────────────────────────────────
// To switch to expo-router + NativeTabs:
//   1. Change package.json#main from "index.js" to "expo-router/entry"
//   2. Run: npx expo run:ios
// To revert: change package.json#main back to "index.js"
// ──────────────────────────────────────────────────────────────────────────
import { registerRootComponent } from "expo";
import App from "./App";
registerRootComponent(App);
