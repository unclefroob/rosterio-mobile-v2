# App Assets

These files are required before building for App Store:

| File | Size | Notes |
|------|------|-------|
| `icon.png` | 1024×1024px | App icon. No transparency. Used for iOS App Store and home screen. |
| `splash.png` | 1284×2778px (or similar) | Splash screen image. `backgroundColor: "#FFFFFF"` in app.json. |
| `adaptive-icon.png` | 1024×1024px | Android adaptive icon foreground. |

The EAS build will fail with "Unable to resolve asset" if these files are missing.
