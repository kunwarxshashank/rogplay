# RogPlay 🎬

RogPlay is a versatile, feature-rich media player and streaming application built with React Native and Expo. It supports advanced video playback, live streams (m3u8/HLS), background audio, and seamless integration with Stremio and other media URLs. With full support for both Android mobile and Android TV (Leanback Launcher), RogPlay delivers a premium entertainment experience across devices.

## ✨ Features

- **Advanced Video Playback:** Powered by `react-native-video` and `react-native-vlc-media-player`.
- **URL Handling & Deep Linking:** Handles `rogplay://`, `stremio://`, and generic HTTP/HTTPS video streams out-of-the-box.
- **Android TV Support:** Optimized for smart TVs with Leanback Launcher support and custom TV banners.
- **Background Audio:** Continue listening to your media even when the app is in the background.
- **Authentication:** Integrated Google Sign-In for quick and secure user authentication.
- **Push Notifications:** Powered by Firebase Cloud Messaging and Notifee.
- **High Performance:** Utilizes `react-native-mmkv` for blazing-fast storage and `@shopify/flash-list` for smooth, optimized list rendering.
- **Payment Integration:** In-app payments and subscriptions via Razorpay.
- **Analytics & Crash Reporting:** Firebase Analytics and Crashlytics integrated for monitoring app health.

## 🛠 Tech Stack

- **Framework:** [React Native](https://reactnative.dev/) (v0.81) / [Expo](https://expo.dev/) (SDK 54)
- **Routing:** [Expo Router](https://docs.expo.dev/router/introduction/) (v6)
- **State Management:** [Zustand](https://github.com/pmndrs/zustand)
- **Local Storage:** `react-native-mmkv`, `expo-secure-store`
- **Animations:** `react-native-reanimated`
- **Networking:** Axios, Socket.io
- **UI & Styling:** `@expo/vector-icons`, Custom Google Fonts (`Inter`, `Outfit`, `Playfair`)

## 🚀 Getting Started

### Prerequisites

Ensure you have the following installed:
- Node.js (v18 or higher)
- npm or yarn
- Expo CLI
- Android Studio / Xcode (for native builds)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/kunwarxshashank/rogplay.git
   cd rogplay/rogplayapp
   ```

2. Install dependencies:
   ```bash
   npm install
   ```
   *(Note: The `postinstall` script will automatically run `patch-package` to apply any custom module patches).*

3. Environment Variables:
   - Copy `.env.example` to `.env` and fill in your necessary keys (Firebase, Razorpay, etc.).

4. Start the development server:
   ```bash
   npm start
   ```

### Running on Device / Emulator

- **Android:** 
  ```bash
  npm run android
  ```
- **iOS:** 
  ```bash
  npm run ios
  ```
- **Web:** 
  ```bash
  npm run web
  ```

## 📦 Native Builds

Because this project uses custom native modules (like Firebase, Notifee, VLC player), you cannot use Expo Go. You must use an Expo Dev Client or build the app locally/via EAS.

**To build with EAS:**
```bash
eas build --profile development --platform android
```

## 🔐 Permissions

The app requests the following core permissions:
- Read/Write External Storage
- Media Access (Audio, Images, Video)
- Foreground Services (Media Playback, Data Sync)
- Notifications (Notifee & Firebase)
- Wake Lock (to prevent screen dimming during playback)

## 📄 License

*(Add your license information here)*
