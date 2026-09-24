<div align="center">
  <img src="https://rogplay.app/assets/tv/1.png" alt="RogPlay Main Image" width="100%" />

  <h1>RogPlay 🎬</h1>
  
  <p><b>A versatile, high-performance media player and streaming application built with React Native and Expo.</b></p>
  
  <p>
    <a href="https://reactnative.dev/"><img src="https://img.shields.io/badge/React_Native-0.81-blue.svg?style=flat-square&logo=react" alt="React Native" /></a>
    <a href="https://expo.dev/"><img src="https://img.shields.io/badge/Expo-SDK_54-black.svg?style=flat-square&logo=expo" alt="Expo" /></a>
  </p>
  <p>
    <img src="https://img.shields.io/badge/Available_for-Android-3DDC84?style=flat-square&logo=android&logoColor=white" alt="Available for Android" />
    <img src="https://img.shields.io/badge/Available_for-Android_TV-000000?style=flat-square&logo=android&logoColor=3DDC84" alt="Available for Android TV" />
  </p>
  <p>
    <a href="https://rogplay.app">
      <img src="https://img.shields.io/badge/Download-RogPlay.app-blue?style=for-the-badge" alt="Download RogPlay" />
    </a>
  </p>
</div>

---

## 🌟 Overview

**RogPlay** is the ultimate media consumption app, designed from the ground up for both **Android mobile** and **Android TV** (Leanback Launcher). Whether you're watching local files, playing direct URLs, or streaming via Stremio integrations, RogPlay delivers a premium, uninterrupted entertainment experience.

## ✨ Key Features

### 🎬 Streaming & Playback
- 🎥 **Advanced Video Playback:** Dual-engine support powered by `react-native-video` and `react-native-vlc-media-player` for maximum format compatibility.
- 📡 **IPTV & Network Streaming:** Full support for IPTV (M3U & XTREME API) and robust network streaming capabilities.
- 🎵 **Local Media & Music Player:** Play all your local video and audio files with a dedicated, feature-rich player.
- 🎧 **Background Audio:** Screen off? No problem. Continue listening to your media even when the app is in the background.

### 🔌 Addons & Integrations
- 🧩 **Extensive Addon Support:** Fully supports **Stremio** and **Nuvio** addons for an endless content library.
- ☁️ **Cloud Addon Sync:** Seamlessly sync your addons across all your devices via the cloud.
- 🚀 **Debrid Support:** Integrated Debrid support for buffer-free, high-speed streaming.
- 🔗 **Deep Linking & URL Handling:** Seamlessly opens `rogplay://`, `stremio://`, and generic HTTP/HTTPS streams right out of the box.

### 📺 Experience & Social
- 📺 **Native Android TV Support:** Fully optimized for smart TVs with custom TV banners and native Leanback Launcher support.
- 🍿 **WatchParty:** Sync up and watch movies or shows together with friends in real-time.
- 📉 **Watch Insights:** Track your viewing habits and get detailed insights into what you watch.
- ❤️ **Favourites & Video Downloader:** Save your favorite content for later, or download videos directly for offline viewing.
- 🩺 **Stream Health Engine:** Built-in engine to monitor and ensure optimal streaming quality.

### ⚙️ Core App Features
- ⚡ **Blazing Fast Performance:** Built using `react-native-mmkv` for ultra-fast local storage and `@shopify/flash-list` for buttery-smooth scrolling.
- 🔐 **Secure Authentication:** Integrated Google Sign-In for frictionless user onboarding.
- 🔔 **Push Notifications:** Stay updated with real-time alerts powered by Firebase Cloud Messaging and Notifee.
- 📊 **Monitoring & Stability:** Firebase Analytics and Crashlytics working silently to ensure optimal app health.

## 🛠 Tech Stack

- **Framework:** [React Native](https://reactnative.dev/) / [Expo](https://expo.dev/)
- **Routing:** [Expo Router](https://docs.expo.dev/router/introduction/)
- **State Management:** [Zustand](https://github.com/pmndrs/zustand)
- **Local Storage:** `react-native-mmkv`, `expo-secure-store`
- **Animations:** `react-native-reanimated`
- **Networking:** Axios, Socket.io
- **UI & Typography:** Custom Google Fonts (`Inter`, `Outfit`, `Playfair`) and `@expo/vector-icons`

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Expo CLI
- Android Studio / Xcode (for native builds)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/kunwarxshashank/rogplay.git
   cd rogplay
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```
   *(Note: The `postinstall` script automatically applies custom patches via `patch-package`).*

3. **Environment Setup:**
   Copy `.env.example` to `.env` and fill in your keys (Firebase, Razorpay, etc.).

4. **Start the development server:**
   ```bash
   npm start
   ```

### Running the App

```bash
# Android
npm run android

# iOS
npm run ios

# Web
npm run web
```

## 📦 Native Builds

Since RogPlay relies heavily on custom native modules (Firebase, VLC player, Notifee, etc.), **Expo Go is not supported**. You must use an Expo Dev Client or build locally/via EAS.

**To build with EAS (Android):**
```bash
eas build --profile development --platform android
```

## 🔐 Permissions

RogPlay requests core permissions to function at its best:
- **Storage:** Read/Write access for local media playback.
- **Media Access:** Access to Audio, Images, and Video.
- **Foreground Services:** Required for background media playback and data syncing.
- **Notifications:** For push notifications via Notifee & Firebase.
- **Wake Lock:** Prevents screen dimming during active playback.

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/kunwarxshashank/rogplay/issues).

## 📄 License

AH SHIT 
