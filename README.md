# Rogplay - The Ultimate Streaming Ecosystem 🚀

Rogplay is a high-performance, cross-platform streaming platform designed for **Mobile**, **Android TV**, and **Web**. It brings together IPTV, Cinema (Movies/Series), and a powerful **Addon-based architecture** to provide a seamless entertainment experience.

---

## ✨ Key Features

### 🎬 **Cinema & Shows**
- **TMDB Integration**: Browse millions of movies and TV shows with rich metadata, posters, and cast info.
- **Watch History**: Synchronized "Continue Watching" across all your devices.
- **Multiple Sources**: Intelligent stream searching using advanced scrapers and providers.

### 📺 **IPTV & Live TV**
- **Full EPG Support**: Interactive electronic program guide with channel categorization.
- **M3U/M3U8 Support**: High-speed playlist parsing for thousands of live channels.
- **Optimized for TV**: Dedicated D-pad navigation and focus management for Android TV boxes.

### 🔌 **Modular Addon System**
- **Stremio Support**: Full compatibility with standard Stremio addons (Movies, IPTV, and specialized scrapers).
- **Addon Store**: Browse and install third-party addons directly within the app.

### 👥 **Watch Party**
- **Real-time Sync**: Watch movies with friends in perfect synchronization using Socket.io.
- **Global Playback**: Control playback (Play/Pause/Seek) for all participants simultaneously.

### 📥 **Smart Offline Mode**
- **Background Downloader**: Download your favorite content for offline viewing on mobile devices.
- **DRM Handling**: Secure stream management for high-quality content.

---

## 🎨 Design Aesthetic: "Obsidian Neon"
Rogplay features a premium, futuristic UI/UX known as **Obsidian Neon**.
- **Dark Mode First**: Optimized for OLED screens with a deep black (`#04070d`) foundation.
- **Vibrant Accents**: Neon Indigo (`#6366f1`) and Purple (`#8b5cf6`) highlights.
- **Glassmorphism**: Elegant translucent components with subtle blur effects.
- **Framer Motion**: Smooth, high-performance animations on the web platform.

---

## 📂 Project Structure

```bash
rogplaynew/
├── app/                  # Expo Router (Mobile & TV screens)
│   ├── (mobile)/         # Specialized UI for iOS/Android smartphones
│   └── (tv)/             # Specialized UI for 10-foot Android TV experience
├── Rogplayweb/           # Next.js Web Application
│   ├── components/       # Shared web components (layout, player, ui)
│   └── pages/            # Web routes (Cinema, IPTV, Addons, Settings)
├── backend/              # Node.js / Express Server
│   ├── models/           # MongoDB schemas (User, Subscription, Party)
│   └── watchparty.js     # WebSocket logic for watch parties
├── services/             # Core Business Logic
│   ├── tmdb.ts           # Movie/Show metadata fetching
│   ├── epgParser.ts      # Live TV guide parsing logic
│   └── downloader.ts     # Offline storage management
├── store/                # Zustand State Management
│   ├── authStore.ts      # User sessions & authentication
│   └── addonsStore.ts    # Installed addons & catalog management
└── constants/            # Global theme tokens, layout & API configs
```

---

## 🛠️ Tech Stack

- **Mobile/TV**: [React Native](https://reactnative.dev/) + [Expo](https://expo.dev/)
- **Web**: [Next.js](https://nextjs.org/) + [Tailwind CSS](https://tailwindcss.com/)
- **State Management**: [Zustand](https://github.com/pmndrs/zustand)
- **Backend**: [Node.js](https://nodejs.org/) + [Express](https://expressjs.com/) + [MongoDB](https://www.mongodb.com/)
- **Real-time**: [Socket.io](https://socket.io/)
- **Video Playback**: VLC Media Player (Native), React Native Video

---

## 🚀 How It Works

1.  **Selection**: A user selects a movie or live channel.
2.  **Addon Query**: Rogplay queries installed addons (Stremio/Local) to find available streaming links (streams).
3.  **Metadata Enrichment**: TMDB and EPG services fetch high-quality banners, ratings, and descriptions.
4.  **Playback**: The optimized player handles HLS/Dash/MP4 streams with support for external players like VLC or MX Player.
5.  **Sync**: If in a Watch Party, the backend ensures all clients stay within a <500ms sync threshold.

---

## ⚙️ Setup & Installation

### 1. Backend Setup
```bash
cd backend
npm install
# Create .env based on .env.example with your MongoDB
node app.js
```

### 2. Mobile/TV App
```bash
npm install
npx expo run:android  # For Android/TV
npx expo run:ios      # For iOS
```

### 3. Web Platform
```bash
cd Rogplayweb
npm install
npm run dev
```

---

## 🤝 Contributing
Built with ❤️ by the Rogplay team. For major changes, please open an issue first to discuss what you would like to change.
Feel free to contribute in any way you can.

---
*Developed by [kunwarxshashank](https://github.com/kunwarxshashank)*
