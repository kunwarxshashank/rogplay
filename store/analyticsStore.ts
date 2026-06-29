import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { zustandStorage } from './mmkv';
import { useAuthStore } from './authStore';
import { getDetails } from '@/services/tmdb';
import { Platform } from 'react-native';

export interface ViewingSession {
  id: string;
  title: string;
  type: 'movie' | 'series' | 'channel' | 'iptv_category';
  genre: string;
  startTime: number;
  duration: number;
  device: string;
  posterUrl?: string;
  progress?: number;
  tmdbId?: string;
  contentType?: 'movie' | 'tv';
  bandwidthMB?: number;
}

export interface GenreStat {
  genre: string;
  hoursWatched: number;
  sessions: number;
  topTitles: string[];
  lastWatched: number;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt: number | null;
  progress: number;
  target: number;
  category: 'milestone' | 'genre' | 'habit' | 'social';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export interface MonthlySummary {
  month: string;
  year: number;
  hoursWatched: number;
  topGenre: string;
  topMovie: string;
  topShow: string;
  favoriteChannel: string;
  mostActiveDevice: string;
  biggestBinge: number;
  sessions: number;
  newDiscoveries: number;
}

export interface PersonalityProfile {
  type: string;
  title: string;
  description: string;
  emoji: string;
  traits: string[];
  color: string;
}

export interface AnalyticsState {
  userName: string;
  joinDate: number;

  sessions: ViewingSession[];

  totalWatchTimeMs: number;
  totalSessions: number;
  totalMoviesWatched: number;
  totalSeriesWatched: number;

  hoursToday: number;
  hoursWeek: number;
  hoursMonth: number;
  hoursYear: number;
  totalBandwidthMB: number;

  genreStats: GenreStat[];
  deviceSessions: Record<string, number>;

  habits: {
    averageSessionLength: number;
    longestSession: number;
    lateNightSessions: number;
    totalLateNight: number;
    weekendSessions: number;
    totalWeekend: number;
    activeDay: string;
    activeTime: string;
    weeklyPattern: number[];
    hourlyPattern: number[];
  };

  achievements: Achievement[];
  monthlySummaries: MonthlySummary[];
  discoveredGenres: string[];
  discoveredSeries: string[];
  totalNewSeries: number;
  totalMoviesCompleted: number;
  personality: PersonalityProfile | null;

  mostWatchedMovies: string[];
  mostWatchedSeries: string[];

  logSession: (session: Omit<ViewingSession, 'id'>) => void;
  resetAnalytics: () => void;
  refreshUserName: () => void;
}

const GENRE_EMOJI_MAP: Record<string, { emoji: string; personality: PersonalityProfile }> = {
  'Action': { emoji: '💥', personality: { type: 'warrior', title: 'The Action Hero', description: 'High-octane thrills and explosive entertainment define your watchlist.', emoji: '💥', traits: ['Energetic', 'Bold', 'Intense'], color: '#ef4444' } },
  'Adventure': { emoji: '🏔️', personality: { type: 'adventurer', title: 'The Adventurer', description: 'You seek thrills and exploration in every story you watch.', emoji: '🏔️', traits: ['Daring', 'Curious', 'Explorer'], color: '#f97316' } },
  'Animation': { emoji: '🎨', personality: { type: 'animator', title: 'The Animation Fan', description: 'You appreciate the artistry and creativity of animated worlds.', emoji: '🎨', traits: ['Creative', 'Nostalgic', 'Imaginative'], color: '#06b6d4' } },
  'Comedy': { emoji: '😂', personality: { type: 'comedian', title: 'The Comedy Seeker', description: 'Laughter is your medicine and you know where to find the best jokes.', emoji: '😂', traits: ['Fun-loving', 'Optimistic', 'Social'], color: '#f97316' } },
  'Crime': { emoji: '🔫', personality: { type: 'detective', title: 'The Crime Solver', description: 'You love unraveling mysteries and tracking down the truth.', emoji: '🔫', traits: ['Observant', 'Logical', 'Sharp'], color: '#6b7280' } },
  'Documentary': { emoji: '📚', personality: { type: 'documentarian', title: 'The Documentary Expert', description: 'Knowledge is power and you consume it voraciously through real stories.', emoji: '📚', traits: ['Intellectual', 'Inquisitive', 'Worldly'], color: '#3b82f6' } },
  'Drama': { emoji: '🎭', personality: { type: 'storyteller', title: 'The Drama Connoisseur', description: 'You appreciate deep narratives and complex character arcs.', emoji: '🎭', traits: ['Thoughtful', 'Empathetic', 'Reflective'], color: '#f59e0b' } },
  'Family': { emoji: '👨‍👩‍👧‍👦', personality: { type: 'family', title: 'The Family Viewer', description: 'You cherish stories that bring loved ones together.', emoji: '👨‍👩‍👧‍👦', traits: ['Warm', 'Caring', 'Together'], color: '#ec4899' } },
  'Fantasy': { emoji: '🐉', personality: { type: 'dreamer', title: 'The Fantasy Dreamer', description: 'Magic, dragons, and impossible worlds are your escape from reality.', emoji: '🐉', traits: ['Imaginative', 'Adventurous', 'Hopeful'], color: '#06b6d4' } },
  'History': { emoji: '📜', personality: { type: 'historian', title: 'The History Buff', description: 'You learn from the past through compelling historical narratives.', emoji: '📜', traits: ['Wise', 'Reflective', 'Learned'], color: '#92400e' } },
  'Horror': { emoji: '👻', personality: { type: 'horror_fan', title: 'The Horror Enthusiast', description: 'You brave the darkest corners of cinema and sleep with one eye open.', emoji: '👻', traits: ['Brave', 'Adrenaline-seeking', 'Nights'], color: '#dc2626' } },
  'Music': { emoji: '🎵', personality: { type: 'music_lover', title: 'The Music Lover', description: 'You feel every beat and melody in the stories you watch.', emoji: '🎵', traits: ['Passionate', 'Rhythmic', 'Emotional'], color: '#f472b6' } },
  'Mystery': { emoji: '🔍', personality: { type: 'sleuth', title: 'The Mystery Solver', description: 'Every clue matters as you piece together the puzzle before the credits roll.', emoji: '🔍', traits: ['Observant', 'Logical', 'Curious'], color: '#6b7280' } },
  'Romance': { emoji: '💕', personality: { type: 'romantic', title: 'The Hopeless Romantic', description: 'You believe in love stories and the power of emotional connection.', emoji: '💕', traits: ['Sentimental', 'Warm', 'Idealistic'], color: '#f472b6' } },
  'Science Fiction': { emoji: '🚀', personality: { type: 'explorer', title: 'The Sci-Fi Explorer', description: 'You traverse the cosmos through every episode and film. The future is now.', emoji: '🚀', traits: ['Curious', 'Visionary', 'Analytical'], color: '#8b5cf6' } },
  'Sci-Fi': { emoji: '🚀', personality: { type: 'explorer', title: 'The Sci-Fi Explorer', description: 'You traverse the cosmos through every episode and film. The future is now.', emoji: '🚀', traits: ['Curious', 'Visionary', 'Analytical'], color: '#8b5cf6' } },
  'Thriller': { emoji: '🔪', personality: { type: 'suspense_lover', title: 'The Suspense Junkie', description: 'Edge-of-your-seat tension is your preferred state of being.', emoji: '🔪', traits: ['Alert', 'Patient', 'Perceptive'], color: '#9333ea' } },
  'War': { emoji: '⚔️', personality: { type: 'strategist', title: 'The War Strategist', description: 'You are drawn to tales of courage, sacrifice, and strategy.', emoji: '⚔️', traits: ['Brave', 'Strategic', 'Resilient'], color: '#92400e' } },
  'Western': { emoji: '🤠', personality: { type: 'cowboy', title: 'The Western Wanderer', description: 'The wild frontier calls to you through classic tales of the West.', emoji: '🤠', traits: ['Independent', 'Rugged', 'Free'], color: '#b45309' } },
};

const DEFAULT_PERSONALITY: PersonalityProfile = {
  type: 'viewer', title: 'The Curious Viewer', description: 'You are exploring the world of streaming, discovering new content every day.', emoji: '🎬', traits: ['Curious', 'Explorer', 'Fresh'], color: '#6366f1',
};

function getDevice(): string {
  if (Platform.isTV) return 'Android TV';
  if (Platform.OS === 'android' || Platform.OS === 'ios') return 'Mobile';
  if (Platform.OS === 'windows') return 'Windows';
  if (Platform.OS === 'web') return 'Web';
  return 'Mobile';
}

function msToHours(ms: number): number {
  return Math.round((ms / 3600000) * 100) / 100;
}

function msToMinutes(ms: number): number {
  return ms / 60000;
}

function computeDerivedStats(sessions: ViewingSession[]) {
  const now = Date.now();
  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const weekStart = new Date(dayStart);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const monthStart = new Date(dayStart.getFullYear(), dayStart.getMonth(), 1);
  const yearStart = new Date(dayStart.getFullYear(), 0, 1);

  let hoursToday = 0, hoursWeek = 0, hoursMonth = 0, hoursYear = 0;
  let totalMovies = 0, totalSeries = 0, totalBandwidthMB = 0;
  let longestSession = 0, sessionLengths: number[] = [];
  let lateNightCount = 0, weekendCount = 0;
  let weeklyPattern = [0, 0, 0, 0, 0, 0, 0];
  let hourlyPattern = new Array(24).fill(0);
  let totalWatchTimeMs = 0;

  const genreMap = new Map<string, { hours: number; sessions: number; titles: Set<string>; lastWatched: number }>();
  const deviceMap = new Map<string, number>();
  const uniqueSeriesSet = new Set<string>();
  const uniqueGenresSet = new Set<string>();
  const moviesCompleted = new Set<string>();
  const seriesSeen = new Set<string>();
  const movieTitleMap = new Map<string, number>();
  const seriesTitleMap = new Map<string, number>();

  for (const s of sessions) {
    const hours = s.duration / 60;
    const startDate = new Date(s.startTime);
    const startDay = startDate.getDay();

    totalWatchTimeMs += s.duration * 60000;
    totalBandwidthMB += s.bandwidthMB || (s.duration * 25);

    if (s.startTime >= dayStart.getTime()) hoursToday += hours;
    if (s.startTime >= weekStart.getTime()) hoursWeek += hours;
    if (s.startTime >= monthStart.getTime()) hoursMonth += hours;
    if (s.startTime >= yearStart.getTime()) hoursYear += hours;

    if (s.type === 'movie') totalMovies++;
    if (s.type === 'series') totalSeries++;

    if (s.duration > longestSession) longestSession = s.duration;
    sessionLengths.push(s.duration);

    const hourOfDay = startDate.getHours();
    hourlyPattern[hourOfDay] = (hourlyPattern[hourOfDay] || 0) + 1;
    weeklyPattern[startDay] = (weeklyPattern[startDay] || 0) + 1;

    if (hourOfDay >= 22 || hourOfDay <= 4) lateNightCount++;
    if (startDay === 0 || startDay === 6) weekendCount++;

    if (s.genre) {
      uniqueGenresSet.add(s.genre);
      const existing = genreMap.get(s.genre) || { hours: 0, sessions: 0, titles: new Set(), lastWatched: 0 };
      existing.hours += hours;
      existing.sessions += 1;
      existing.titles.add(s.title);
      existing.lastWatched = Math.max(existing.lastWatched, s.startTime);
      genreMap.set(s.genre, existing);
    }

    deviceMap.set(s.device, (deviceMap.get(s.device) || 0) + 1);

    if (s.type === 'series') {
      uniqueSeriesSet.add(s.title);
      seriesTitleMap.set(s.title, (seriesTitleMap.get(s.title) || 0) + 1);
    }
    if (s.type === 'movie') {
      movieTitleMap.set(s.title, (movieTitleMap.get(s.title) || 0) + 1);
      if (s.progress && s.progress >= 0.9) moviesCompleted.add(s.title);
    }
    if (s.type === 'series' && s.progress && s.progress >= 0.9) {
      seriesSeen.add(s.title);
    }
  }

  const avgSession = sessionLengths.length > 0
    ? sessionLengths.reduce((a, b) => a + b, 0) / sessionLengths.length : 0;

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const maxDay = weeklyPattern.indexOf(Math.max(...weeklyPattern));
  const timeSlots = ['Late Night', 'Morning', 'Afternoon', 'Evening'];
  const hourlySums = [
    hourlyPattern.slice(0, 6).reduce((a, b) => a + b, 0),
    hourlyPattern.slice(6, 12).reduce((a, b) => a + b, 0),
    hourlyPattern.slice(12, 18).reduce((a, b) => a + b, 0),
    hourlyPattern.slice(18, 24).reduce((a, b) => a + b, 0),
  ];
  const maxTimeIndex = hourlySums.indexOf(Math.max(...hourlySums));

  const genreStats: GenreStat[] = Array.from(genreMap.entries())
    .map(([genre, data]) => ({
      genre,
      hoursWatched: Math.round(data.hours * 100) / 100,
      sessions: data.sessions,
      topTitles: Array.from(data.titles).slice(0, 5),
      lastWatched: data.lastWatched,
    }))
    .sort((a, b) => b.hoursWatched - a.hoursWatched);

  const sortedMovies = Array.from(movieTitleMap.entries()).sort((a, b) => b[1] - a[1]);
  const sortedSeries = Array.from(seriesTitleMap.entries()).sort((a, b) => b[1] - a[1]);

  const deviceEntries = Array.from(deviceMap.entries());
  const totalDeviceSessions = deviceEntries.reduce((a, b) => a + b[1], 0) || 1;
  const deviceSessions: Record<string, number> = {};
  for (const [d, count] of deviceEntries) {
    deviceSessions[d] = Math.round((count / totalDeviceSessions) * 100);
  }

  const totalHours = msToHours(totalWatchTimeMs);

  const achievements = computeAchievements({
    totalMovies, totalSeries, totalHours, totalSessions: sessions.length,
    sessions, genreStats, lateNightCount, weekendCount, uniqueGenres: uniqueGenresSet.size,
    moviesCompleted: moviesCompleted.size,
  });

  const monthlySummaries = computeMonthlySummaries(sessions, deviceSessions);

  const topGenre = genreStats[0]?.genre || null;
  const personality = topGenre && GENRE_EMOJI_MAP[topGenre]
    ? GENRE_EMOJI_MAP[topGenre].personality
    : sessions.length > 0 ? DEFAULT_PERSONALITY : null;

  return {
    totalWatchTimeMs,
    totalSessions: sessions.length,
    totalMoviesWatched: totalMovies,
    totalSeriesWatched: totalSeries,
    hoursToday: Math.round(hoursToday * 100) / 100,
    hoursWeek: Math.round(hoursWeek * 100) / 100,
    hoursMonth: Math.round(hoursMonth * 100) / 100,
    hoursYear: Math.round(hoursYear * 100) / 100,
    totalBandwidthMB: Math.round(totalBandwidthMB * 100) / 100,
    genreStats,
    deviceSessions,
    habits: {
      averageSessionLength: Math.round(avgSession),
      longestSession: Math.round(longestSession),
      lateNightSessions: lateNightCount,
      totalLateNight: sessions.length > 0 ? Math.round((lateNightCount / sessions.length) * 100) : 0,
      weekendSessions: weekendCount,
      totalWeekend: sessions.length > 0 ? Math.round((weekendCount / sessions.length) * 100) : 0,
      activeDay: dayNames[maxDay] || 'N/A',
      activeTime: timeSlots[maxTimeIndex] || 'N/A',
      weeklyPattern,
      hourlyPattern,
    },
    achievements,
    monthlySummaries,
    discoveredGenres: Array.from(uniqueGenresSet),
    discoveredSeries: Array.from(uniqueSeriesSet),
    totalNewSeries: uniqueSeriesSet.size,
    totalMoviesCompleted: moviesCompleted.size,
    personality,
    mostWatchedMovies: sortedMovies.slice(0, 10).map(([t]) => t),
    mostWatchedSeries: sortedSeries.slice(0, 10).map(([t]) => t),
  };
}

function computeAchievements(data: {
  totalMovies: number; totalSeries: number; totalHours: number; totalSessions: number;
  sessions: ViewingSession[]; genreStats: GenreStat[]; lateNightCount: number;
  weekendCount: number; uniqueGenres: number; moviesCompleted: number;
}): Achievement[] {
  const now = Date.now();
  const all: Achievement[] = [];

  all.push({ id: 'first_movie', title: 'First Movie', description: 'Watch your first movie', icon: '🎬', unlockedAt: data.totalMovies >= 1 ? now : null, progress: Math.min(data.totalMovies, 1), target: 1, category: 'milestone', rarity: 'common' });
  all.push({ id: 'movie_10', title: 'Movie Collector', description: 'Watch 10 movies', icon: '📀', unlockedAt: data.totalMovies >= 10 ? now : null, progress: data.totalMovies, target: 10, category: 'milestone', rarity: 'rare' });
  all.push({ id: 'movie_50', title: 'Cinema Lover', description: 'Watch 50 movies', icon: '🎥', unlockedAt: data.totalMovies >= 50 ? now : null, progress: data.totalMovies, target: 50, category: 'milestone', rarity: 'epic' });
  all.push({ id: 'movie_100', title: 'Cinema Master', description: 'Watch 100 movies', icon: '🏅', unlockedAt: data.totalMovies >= 100 ? now : null, progress: data.totalMovies, target: 100, category: 'milestone', rarity: 'legendary' });
  all.push({ id: 'hours_10', title: 'Getting Started', description: 'Stream 10 hours', icon: '⏱️', unlockedAt: data.totalHours >= 10 ? now : null, progress: Math.round(data.totalHours), target: 10, category: 'milestone', rarity: 'common' });
  all.push({ id: 'hours_100', title: 'Century Club', description: 'Stream 100 hours', icon: '⚡', unlockedAt: data.totalHours >= 100 ? now : null, progress: Math.round(data.totalHours), target: 100, category: 'milestone', rarity: 'rare' });
  all.push({ id: 'hours_500', title: 'Power User', description: 'Stream 500 hours', icon: '🔥', unlockedAt: data.totalHours >= 500 ? now : null, progress: Math.round(data.totalHours), target: 500, category: 'milestone', rarity: 'epic' });
  all.push({ id: 'hours_1000', title: 'Streaming Legend', description: 'Stream 1000 hours', icon: '👑', unlockedAt: data.totalHours >= 1000 ? now : null, progress: Math.round(data.totalHours), target: 1000, category: 'milestone', rarity: 'legendary' });
  all.push({ id: 'session_10', title: 'Regular Viewer', description: 'Complete 10 sessions', icon: '📺', unlockedAt: data.totalSessions >= 10 ? now : null, progress: data.totalSessions, target: 10, category: 'milestone', rarity: 'common' });
  all.push({ id: 'session_100', title: 'Frequent Flyer', description: 'Complete 100 sessions', icon: '✈️', unlockedAt: data.totalSessions >= 100 ? now : null, progress: data.totalSessions, target: 100, category: 'milestone', rarity: 'rare' });
  all.push({ id: 'session_500', title: 'Super Viewer', description: 'Complete 500 sessions', icon: '🏆', unlockedAt: data.totalSessions >= 500 ? now : null, progress: data.totalSessions, target: 500, category: 'milestone', rarity: 'epic' });
  all.push({ id: 'explorer', title: 'Content Explorer', description: 'Explore 5 genres', icon: '🧭', unlockedAt: data.uniqueGenres >= 5 ? now : null, progress: data.uniqueGenres, target: 5, category: 'milestone', rarity: 'rare' });
  all.push({ id: 'night_owl', title: 'Night Owl', description: 'Watch late night 10 times', icon: '🦉', unlockedAt: data.lateNightCount >= 10 ? now : null, progress: data.lateNightCount, target: 10, category: 'habit', rarity: 'rare' });
  all.push({ id: 'weekend_warrior', title: 'Weekend Warrior', description: 'Watch on weekends 10 times', icon: '🎯', unlockedAt: data.weekendCount >= 10 ? now : null, progress: data.weekendCount, target: 10, category: 'habit', rarity: 'rare' });
  all.push({ id: 'completionist', title: 'Completionist', description: 'Finish 5 movies to completion', icon: '✅', unlockedAt: data.moviesCompleted >= 5 ? now : null, progress: data.moviesCompleted, target: 5, category: 'milestone', rarity: 'rare' });

  for (const g of data.genreStats.slice(0, 3)) {
    const info = GENRE_EMOJI_MAP[g.genre];
    if (!info) continue;
    all.push({
      id: `genre_${g.genre.toLowerCase().replace(/\s+/g, '_')}`,
      title: `${g.genre} Fan`,
      description: `Watch 5 hours of ${g.genre}`,
      icon: info.emoji,
      unlockedAt: g.hoursWatched >= 5 ? now : null,
      progress: Math.min(g.hoursWatched, 5),
      target: 5,
      category: 'genre',
      rarity: g.hoursWatched >= 20 ? 'epic' : g.hoursWatched >= 10 ? 'rare' : 'common',
    });
  }

  return all;
}

function computeMonthlySummaries(sessions: ViewingSession[], deviceSessions: Record<string, number>): MonthlySummary[] {
  const monthMap = new Map<string, { sessions: ViewingSession[]; movies: Set<string>; series: Set<string>; channels: Set<string> }>();

  for (const s of sessions) {
    const d = new Date(s.startTime);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!monthMap.has(key)) monthMap.set(key, { sessions: [], movies: new Set(), series: new Set(), channels: new Set() });
    const data = monthMap.get(key)!;
    data.sessions.push(s);
    if (s.type === 'movie') data.movies.add(s.title);
    if (s.type === 'series') data.series.add(s.title);
    if (s.type === 'channel') data.channels.add(s.title);
  }

  const sortedKeys = Array.from(monthMap.keys()).sort();
  const summaries: MonthlySummary[] = [];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  for (const key of sortedKeys) {
    const data = monthMap.get(key)!;
    const [yearStr, monthStr] = key.split('-');
    const year = parseInt(yearStr);
    const monthIdx = parseInt(monthStr) - 1;

    const genreCount = new Map<string, number>();
    let topMovie = '', topShow = '', topChannel = '', maxBinge = 0, totalHours = 0;
    const movieCount = new Map<string, number>();
    const seriesCount = new Map<string, number>();

    for (const s of data.sessions) {
      const h = s.duration / 60;
      totalHours += h;
      if (s.duration > maxBinge) maxBinge = s.duration;
      if (s.genre) genreCount.set(s.genre, (genreCount.get(s.genre) || 0) + h);
      if (s.type === 'movie') movieCount.set(s.title, (movieCount.get(s.title) || 0) + 1);
      if (s.type === 'series') seriesCount.set(s.title, (seriesCount.get(s.title) || 0) + 1);
      if (s.type === 'channel') { if (s.title) topChannel = s.title; }
    }

    const topGenre = Array.from(genreCount.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';
    topMovie = Array.from(movieCount.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';
    topShow = Array.from(seriesCount.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

    const topDevice = Object.entries(deviceSessions).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

    summaries.push({
      month: monthNames[monthIdx] || 'N/A',
      year,
      hoursWatched: Math.round(totalHours),
      topGenre,
      topMovie,
      topShow,
      favoriteChannel: topChannel || 'N/A',
      mostActiveDevice: topDevice,
      biggestBinge: Math.round(maxBinge),
      sessions: data.sessions.length,
      newDiscoveries: data.movies.size + data.series.size,
    });
  }

  return summaries.reverse();
}

function enrichSessionGenres(session: ViewingSession): void {
  if (!session.tmdbId || !session.contentType || session.genre) return;
  getDetails(session.contentType, session.tmdbId).then(details => {
    if (details?.genres?.length > 0) {
      const genreName = details.genres[0].name;
      const state = useAnalyticsStore.getState();
      const updatedSessions = state.sessions.map(s =>
        s.id === session.id ? { ...s, genre: genreName } : s
      );
      useAnalyticsStore.setState({ sessions: updatedSessions });
    }
  }).catch(() => { });
}

const initialHabits = {
  averageSessionLength: 0,
  longestSession: 0,
  lateNightSessions: 0,
  totalLateNight: 0,
  weekendSessions: 0,
  totalWeekend: 0,
  activeDay: 'N/A',
  activeTime: 'N/A',
  weeklyPattern: [0, 0, 0, 0, 0, 0, 0],
  hourlyPattern: new Array(24).fill(0),
};

export const useAnalyticsStore = create<AnalyticsState>()(
  persist(
    (set, get) => ({
      userName: '',
      joinDate: Date.now(),

      sessions: [],

      totalWatchTimeMs: 0,
      totalSessions: 0,
      totalMoviesWatched: 0,
      totalSeriesWatched: 0,

      hoursToday: 0,
      hoursWeek: 0,
      hoursMonth: 0,
      hoursYear: 0,
      totalBandwidthMB: 0,

      genreStats: [],
      deviceSessions: {},
      habits: { ...initialHabits },
      achievements: [],
      monthlySummaries: [],
      discoveredGenres: [],
      discoveredSeries: [],
      totalNewSeries: 0,
      totalMoviesCompleted: 0,
      personality: null,
      mostWatchedMovies: [],
      mostWatchedSeries: [],

      logSession: (session) => {
        const state = get();
        const fullSession: ViewingSession = {
          ...session,
          id: `s_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          device: session.device || getDevice(),
          bandwidthMB: session.bandwidthMB || (session.duration * 0.015),
        };

        const updatedSessions = [...state.sessions, fullSession].slice(-500);

        const derived = computeDerivedStats(updatedSessions);

        set({
          sessions: updatedSessions,
          ...derived,
        });

        if (fullSession.tmdbId && fullSession.contentType && !fullSession.genre) {
          enrichSessionGenres(fullSession);
        }
      },

      resetAnalytics: () => {
        set({
          sessions: [],
          totalWatchTimeMs: 0, totalSessions: 0, totalMoviesWatched: 0, totalSeriesWatched: 0,
          hoursToday: 0, hoursWeek: 0, hoursMonth: 0, hoursYear: 0, totalBandwidthMB: 0,
          genreStats: [], deviceSessions: {}, habits: { ...initialHabits },
          achievements: [], monthlySummaries: [], discoveredGenres: [], discoveredSeries: [],
          totalNewSeries: 0, totalMoviesCompleted: 0, personality: null,
        });
      },

      refreshUserName: () => {
        const name = useAuthStore.getState()?.user?.name || '';
        if (name) set({ userName: name });
      },
    }),
    {
      name: 'analytics-storage',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        userName: state.userName,
        joinDate: state.joinDate,
        sessions: state.sessions,
        totalWatchTimeMs: state.totalWatchTimeMs,
        totalSessions: state.totalSessions,
        totalMoviesWatched: state.totalMoviesWatched,
        totalSeriesWatched: state.totalSeriesWatched,
        hoursToday: state.hoursToday,
        hoursWeek: state.hoursWeek,
        hoursMonth: state.hoursMonth,
        hoursYear: state.hoursYear,
        totalBandwidthMB: state.totalBandwidthMB,
        genreStats: state.genreStats,
        deviceSessions: state.deviceSessions,
        habits: state.habits,
        achievements: state.achievements,
        monthlySummaries: state.monthlySummaries,
        discoveredGenres: state.discoveredGenres,
        discoveredSeries: state.discoveredSeries,
        totalNewSeries: state.totalNewSeries,
        totalMoviesCompleted: state.totalMoviesCompleted,
        personality: state.personality,
        mostWatchedMovies: state.mostWatchedMovies,
        mostWatchedSeries: state.mostWatchedSeries,
      }),
    }
  )
);
