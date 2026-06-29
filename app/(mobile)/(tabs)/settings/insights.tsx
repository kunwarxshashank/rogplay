import React, { useRef, useEffect, useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated,
  Dimensions, Platform, Share, Image, FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, G, Path, Rect, Line, Text as SvgText } from 'react-native-svg';
import { useRouter } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { useAnalyticsStore, Achievement, MonthlySummary, GenreStat } from '@/store/analyticsStore';
import { TVFocusable } from '@/components/TVFocusable';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 40;
const GENRE_NODE_SIZE = 80;
const HOURS_TARGETS = { today: 8, week: 56, month: 240, year: 2920, lifetime: 10000 };
const DEVICE_ICONS: Record<string, string> = { 'Android TV': 'tv', 'Mobile': 'phone-android', 'Windows': 'laptop', 'Web': 'language' };

function formatDuration(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function daysEquivalent(hours: number): string {
  const days = Math.round(hours / 24);
  return `${days} days spent watching content`;
}

function AnimatedCounter({ value, suffix = '', duration = 1500, textStyle }: { value: number; suffix?: string; duration?: number; textStyle?: any }) {
  const animValue = useRef(new Animated.Value(0)).current;
  const displayValue = useRef('0');

  useEffect(() => {
    animValue.setValue(0);
    const toValue = value;
    Animated.timing(animValue, { toValue, duration, useNativeDriver: false }).start();
    const listener = animValue.addListener(({ value: v }) => {
      displayValue.current = Math.round(v).toLocaleString();
    });
    return () => animValue.removeListener(listener);
  }, [value, duration]);

  const animatedText = animValue.interpolate({
    inputRange: [0, value],
    outputRange: [0, value],
    extrapolate: 'clamp',
  });

  return (
    <Animated.Text style={[{ fontFamily: 'Outfit_700Bold', fontSize: 36, color: '#fff' }, textStyle]}>
      {animatedText.interpolate({
        inputRange: [0, value],
        outputRange: ['0', value.toLocaleString()],
        extrapolate: 'clamp',
      }) as any}
      {suffix}
    </Animated.Text>
  );
}

function CircularProgress({ value, max, size = 72, strokeWidth = 6, color, label, sublabel, hideValue }: {
  value: number; max: number; size?: number; strokeWidth?: number; color: string; label: string; sublabel?: string; hideValue?: boolean;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(value / max, 1);
  const animProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animProgress, { toValue: progress, duration: 1500, useNativeDriver: false }).start();
  }, [progress]);

  const strokeDashoffset = animProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, 0],
    extrapolate: 'clamp',
  });

  return (
    <View style={{ alignItems: 'center', width: size + 20 }}>
      <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
        <Svg width={size} height={size}>
          <Circle cx={size / 2} cy={size / 2} r={radius} stroke="rgba(255,255,255,0.08)" strokeWidth={strokeWidth} fill="none" />
          <AnimatedCircle
            cx={size / 2} cy={size / 2} r={radius}
            stroke={color} strokeWidth={strokeWidth} fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset as any}
            strokeLinecap="round"
            rotation="-90"
            origin={`${size / 2}, ${size / 2}`}
          />
        </Svg>
        <View style={{ position: 'absolute' }}>
          {!hideValue && (
            <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: size > 80 ? 16 : 13, color }}>{formatDuration(value)}</Text>
          )}
        </View>
      </View>
      <Text style={{ fontFamily: 'Outfit_600SemiBold', fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</Text>
      {sublabel && (
        <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 9, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>{sublabel}</Text>
      )}
    </View>
  );
}

function AnimatedCircle({ strokeDashoffset, ...props }: any) {
  const animValue = useRef(new Animated.Value(0)).current;
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const listener = animValue.addListener(({ value }) => setOffset(value));
    return () => animValue.removeListener(listener);
  }, []);

  useEffect(() => {
    Animated.timing(animValue, { toValue: strokeDashoffset, duration: 0, useNativeDriver: false }).start();
  }, [strokeDashoffset]);

  return <Circle {...props} strokeDashoffset={offset} />;
}

function WelcomeSection({ colors, data }: { colors: any; data: any }) {
  const hourOfDay = new Date().getHours();
  const greeting = hourOfDay < 12 ? 'Good Morning' : hourOfDay < 18 ? 'Good Afternoon' : 'Good Evening';
  const hours = data.totalWatchTimeMs / 3600000;
  const topGenre = data.genreStats?.length > 0
    ? [...data.genreStats].sort((a: GenreStat, b: GenreStat) => b.hoursWatched - a.hoursWatched)[0]
    : null;
  const nextAchievement = data.achievements?.find((a: Achievement) => !a.unlockedAt);
  const remainingHours = nextAchievement ? Math.max(0, nextAchievement.target - nextAchievement.progress) : 0;

  return (
    <View style={[styles.welcomeSection, { marginBottom: 24 }, colors.isAmoled ? { backgroundColor: '#000000' } : {}]}>
      {!colors.isAmoled && (
        <LinearGradient
          colors={[colors.primary + '40', colors.surface + 'CC', colors.background + 'F2']}
          locations={[0, 0.5, 1]}
          style={[StyleSheet.absoluteFill, { borderRadius: 24 }]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        />
      )}
      <View style={{ position: 'absolute', top: -60, right: -60, width: 200, height: 200, borderRadius: 100, backgroundColor: colors.primary + '20', transform: [{ scale: 2 }] }} />
      <View style={{ padding: 28 }}>
        <Text style={[styles.welcomeGreeting, { color: colors.textSecondary }]}>{greeting}</Text>
        <Text style={[styles.welcomeName, { color: colors.text }]}>{data.userName || 'Viewer'}</Text>
        {data.totalSessions > 0 ? (
          <>
            <View style={styles.statRow}>
              <MaterialIcons name="timer" size={16} color={colors.primary} />
              <Text style={[styles.welcomeStat, { color: colors.primary }]}>
                You've spent {formatDuration(hours)} exploring new worlds.
              </Text>
            </View>
            {topGenre && (
              <View style={styles.statRow}>
                <MaterialIcons name="trending-up" size={16} color={colors.accent || colors.primary} />
                <Text style={[styles.welcomeStat, { color: colors.accent || colors.primary }]}>
                  {topGenre.genre} is your most-watched genre with {topGenre.hoursWatched.toFixed(0)} hours.
                </Text>
              </View>
            )}
            {remainingHours > 0 && nextAchievement && (
              <View style={styles.statRow}>
                <MaterialIcons name="flag" size={16} color={colors.warning} />
                <Text style={[styles.welcomeStat, { color: colors.warning }]}>
                  {nextAchievement.progress}/{nextAchievement.target} toward "{nextAchievement.title}".
                </Text>
              </View>
            )}
          </>
        ) : (
          <View style={styles.statRow}>
            <MaterialIcons name="info" size={16} color={colors.textSecondary} />
            <Text style={[styles.welcomeStat, { color: colors.textSecondary }]}>
              Start watching content to see your insights here.
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

function ViewingHoursSection({ colors, data }: { colors: any; data: any }) {
  const lifetimeHours = data.totalWatchTimeMs / 3600000;
  const lifetimeDays = Math.floor(lifetimeHours / 24);
  const [, setAnimated] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setAnimated(s => s + 1), 50);
    setTimeout(() => clearInterval(interval), 1500);
    return () => clearInterval(interval);
  }, []);

  return (
    <View style={[styles.sectionCard, colors.isAmoled ? { backgroundColor: '#000000' } : {}]}>
      {!colors.isAmoled && <LinearGradient colors={[colors.card + 'CC', colors.surface + '88']} style={[StyleSheet.absoluteFill, { borderRadius: 20 }]} />}
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Your Viewing Hours</Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 4, gap: 16, paddingVertical: 8 }}>
        <CircularProgress value={data.hoursToday} max={HOURS_TARGETS.today} color={colors.primary} label="Today" />
        <CircularProgress value={data.hoursWeek} max={HOURS_TARGETS.week} color={colors.accent || colors.primary} label="This Week" />
        <CircularProgress value={data.hoursMonth} max={HOURS_TARGETS.month} color={colors.success} label="This Month" />
        <CircularProgress value={data.hoursYear} max={HOURS_TARGETS.year} color={colors.info} label="This Year" />
        <CircularProgress value={lifetimeHours} max={HOURS_TARGETS.lifetime} color={colors.warning} label="Lifetime" />
      </ScrollView>

      <View style={[styles.milestoneBox, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '30' }]}>
        <MaterialIcons name="emoji-events" size={24} color={colors.warning} />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={{ fontFamily: 'Outfit_600SemiBold', fontSize: 14, color: colors.text }}>Lifetime Achievement</Text>
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
            Equivalent to {daysEquivalent(lifetimeHours)} ({(lifetimeHours / 24 / 365).toFixed(1)} years of your life)
          </Text>
        </View>
      </View>
    </View>
  );
}

function GenreGalaxySection({ colors, data }: { colors: any; data: any }) {
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const sortedGenres = (data.genreStats || []).sort((a: GenreStat, b: GenreStat) => b.hoursWatched - a.hoursWatched);
  const maxHours = Math.max(...sortedGenres.map((g: GenreStat) => g.hoursWatched), 1);
  const selectedData = selectedGenre ? sortedGenres.find((g: GenreStat) => g.genre === selectedGenre) : null;

  return (
    <View style={[styles.sectionCard, colors.isAmoled ? { backgroundColor: '#000000' } : {}]}>
      {!colors.isAmoled && <LinearGradient colors={[colors.card + 'CC', colors.surface + '88']} style={[StyleSheet.absoluteFill, { borderRadius: 20 }]} />}
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Genre Galaxy</Text>
      <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>Tap a genre to explore your viewing habits</Text>
      {sortedGenres.length === 0 ? (
        <View style={{ paddingVertical: 24, alignItems: 'center' }}>
          <MaterialIcons name="stars" size={40} color={colors.textMuted} />
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: colors.textMuted, marginTop: 8, textAlign: 'center' }}>
            No genre data yet. Watch TMDB content to see your genre galaxy.
          </Text>
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 16, gap: 14 }}>
          {sortedGenres.map((genre: GenreStat) => {
            const scale = 0.5 + (genre.hoursWatched / maxHours) * 0.5;
            const isSelected = selectedGenre === genre.genre;
            return (
              <TouchableOpacity key={genre.genre} onPress={() => setSelectedGenre(isSelected ? null : genre.genre)} activeOpacity={0.7}>
                <View style={{ alignItems: 'center', width: 90 }}>
                  <View style={[styles.genreNode, {
                    width: GENRE_NODE_SIZE * scale + 20,
                    height: GENRE_NODE_SIZE * scale + 20,
                    borderRadius: (GENRE_NODE_SIZE * scale + 20) / 2,
                    backgroundColor: isSelected ? colors.primary + '30' : colors.card + 'AA',
                    borderColor: isSelected ? colors.primary : colors.primary + '30',
                    borderWidth: isSelected ? 2 : 1,
                  }]}>
                    <Text style={{ fontSize: 24 * scale + 4 }}>{getGenreEmoji(genre.genre)}</Text>
                  </View>
                  <Text style={{
                    fontFamily: 'Outfit_600SemiBold', fontSize: 11, color: isSelected ? colors.primary : colors.textSecondary,
                    marginTop: 6, textAlign: 'center',
                  }}>{genre.genre}</Text>
                  <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 9, color: colors.textMuted, marginTop: 1 }}>
                    {genre.hoursWatched.toFixed(0)}h
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
      {selectedData && (
        <View style={[styles.genreDetail, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '20' }]}>
          <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 16, color: colors.primary }}>{selectedData.genre}</Text>
          <View style={{ flexDirection: 'row', gap: 20, marginTop: 8 }}>
            <View>
              <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: colors.textMuted }}>Hours Watched</Text>
              <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 18, color: colors.text }}>{selectedData.hoursWatched.toFixed(1)}h</Text>
            </View>
            <View>
              <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: colors.textMuted }}>Sessions</Text>
              <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 18, color: colors.text }}>{selectedData.sessions}</Text>
            </View>
          </View>
          {selectedData.topTitles.length > 0 && (
            <View style={{ marginTop: 8 }}>
              <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: colors.textMuted }}>Top Titles</Text>
              {selectedData.topTitles.map((t: string, i: number) => (
                <Text key={i} style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: colors.textSecondary, marginTop: 2 }}>{i + 1}. {t}</Text>
              ))}
            </View>
          )}
          <View style={{ marginTop: 10 }}>
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: colors.textMuted, marginBottom: 4 }}>6-Month Trend</Text>
            <Svg width={CARD_WIDTH - 80} height={40}>
              {selectedData.trend.map((v: number, i: number) => (
                <Rect key={i} x={i * ((CARD_WIDTH - 80) / selectedData.trend.length)} y={40 - (v / 100) * 35}
                  width={(CARD_WIDTH - 80) / selectedData.trend.length - 4} height={(v / 100) * 35}
                  fill={colors.primary} rx={2} opacity={0.6 + (v / 100) * 0.4}
                />
              ))}
            </Svg>
          </View>
        </View>
      )}
    </View>
  );
}

function getGenreEmoji(genre: string): string {
  const map: Record<string, string> = {
    'Sci-Fi': '🚀', 'Action': '💥', 'Drama': '🎭', 'Anime': '🗾', 'Sports': '🏆',
    'Comedy': '😂', 'Horror': '👻', 'Documentary': '📚', 'Thriller': '🔪',
    'Romance': '💕', 'Fantasy': '🐉', 'Mystery': '🔍',
  };
  return map[genre] || '🎬';
}

function MostWatchedSection({ colors, data }: { colors: any; data: any }) {
  const topMovies = data.genreStats.flatMap((g: GenreStat) => g.topTitles).slice(0, 8);
  const uniqueMovies = [...new Set(topMovies)] as string[];

  return (
    <View style={[styles.sectionCard, colors.isAmoled ? { backgroundColor: '#000000' } : {}]}>
      {!colors.isAmoled && <LinearGradient colors={[colors.card + 'CC', colors.surface + '88']} style={[StyleSheet.absoluteFill, { borderRadius: 20 }]} />}
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Most Watched Content</Text>
      <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>Your favorite titles across all genres</Text>

      <Text style={{ fontFamily: 'Outfit_600SemiBold', fontSize: 13, color: colors.textSecondary, marginTop: 16, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        Top Titles
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {uniqueMovies.slice(0, 12).map((title, i) => (
          <View key={i} style={[styles.posterChip, { backgroundColor: colors.primary + '12', borderColor: colors.primary + '20' }]}>
            <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 11, color: colors.text }}>{title}</Text>
          </View>
        ))}
      </View>

      <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
        <View style={[styles.posterCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <MaterialIcons name="movie" size={28} color={colors.primary} />
          <Text style={[styles.posterCardLabel, { color: colors.text }]}>Movies</Text>
          <Text style={[styles.posterCardValue, { color: colors.primary }]}>{data.totalMoviesWatched}</Text>
        </View>
        <View style={[styles.posterCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <MaterialIcons name="tv" size={28} color={colors.accent || colors.primary} />
          <Text style={[styles.posterCardLabel, { color: colors.text }]}>Series</Text>
          <Text style={[styles.posterCardValue, { color: colors.accent || colors.primary }]}>{data.totalSeriesWatched}</Text>
        </View>
        <View style={[styles.posterCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <MaterialIcons name="play-circle" size={28} color={colors.success} />
          <Text style={[styles.posterCardLabel, { color: colors.text }]}>Sessions</Text>
          <Text style={[styles.posterCardValue, { color: colors.success }]}>{data.totalSessions}</Text>
        </View>
      </View>
    </View>
  );
}

function PersonalitySection({ colors, data }: { colors: any; data: any }) {
  const p = data.personality || { title: 'The Curious Viewer', description: 'Start watching to discover your viewing personality!', emoji: '🎬', traits: ['Curious', 'Explorer', 'Fresh'], color: colors.primary };
  const animScale = useRef(new Animated.Value(0.8)).current;
  const animOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(animScale, { toValue: 1, friction: 6, useNativeDriver: true }),
      Animated.timing(animOpacity, { toValue: 1, duration: 800, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <View style={[styles.sectionCard, colors.isAmoled ? { backgroundColor: '#000000' } : {}]}>
      {!colors.isAmoled && (
        <LinearGradient
          colors={[p.color + '25', colors.card + 'CC', colors.surface + '88']}
          style={[StyleSheet.absoluteFill, { borderRadius: 20 }]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        />
      )}
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Your Viewing Personality</Text>
      <Animated.View style={{ alignItems: 'center', paddingVertical: 20, transform: [{ scale: animScale }], opacity: animOpacity }}>
        <View style={[styles.personalityEmoji, { backgroundColor: p.color + '20', borderColor: p.color + '40' }]}>
          <Text style={{ fontSize: 48 }}>{p.emoji}</Text>
        </View>
        <Text style={[styles.personalityTitle, { color: colors.text }]}>{p.title}</Text>
        <Text style={[styles.personalityDesc, { color: colors.textSecondary }]}>{p.description}</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
          {p.traits.map((trait: string, i: number) => (
            <View key={i} style={[styles.traitBadge, { backgroundColor: p.color + '20', borderColor: p.color + '30' }]}>
              <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 11, color: p.color }}>{trait}</Text>
            </View>
          ))}
        </View>
      </Animated.View>
    </View>
  );
}

function BandwidthInsightsSection({ colors, data }: { colors: any; data: any }) {
  const totalGB = data.totalBandwidthMB / 1024;
  const comparisons = [
    { label: 'Stream Interstellar', count: Math.floor(totalGB / 38.6), unit: 'times' },
    { label: 'Download songs', count: Math.floor(totalGB * 1024 / 5), unit: 'songs' },
    { label: 'Browse the web', count: Math.floor(totalGB * 1024 / 150), unit: 'hours' },
  ];

  return (
    <View style={[styles.sectionCard, colors.isAmoled ? { backgroundColor: '#000000' } : {}]}>
      {!colors.isAmoled && <LinearGradient colors={[colors.card + 'CC', colors.surface + '88']} style={[StyleSheet.absoluteFill, { borderRadius: 20 }]} />}
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Bandwidth Insights</Text>

      <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
        <View style={[styles.bandwidthCard, { backgroundColor: colors.primary + '12', borderColor: colors.primary + '20' }]}>
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: colors.textMuted }}>Total Data</Text>
          <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 22, color: colors.primary }}>{totalGB.toFixed(1)}</Text>
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: colors.textSecondary }}>GB</Text>
        </View>
        <View style={[styles.bandwidthCard, { backgroundColor: colors.info + '12', borderColor: colors.info + '20' }]}>
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: colors.textMuted }}>Per Session</Text>
          <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 22, color: colors.info }}>
            {data.totalSessions > 0 ? (totalGB / data.totalSessions).toFixed(2) : '0'}
          </Text>
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: colors.textSecondary }}>GB</Text>
        </View>
        <View style={[styles.bandwidthCard, { backgroundColor: colors.warning + '12', borderColor: colors.warning + '20' }]}>
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: colors.textMuted }}>Monthly Avg</Text>
          <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 22, color: colors.warning }}>
            {data.monthlySummaries.length > 0 ? (totalGB / data.monthlySummaries.length).toFixed(1) : '0'}
          </Text>
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: colors.textSecondary }}>GB</Text>
        </View>
      </View>

      <Text style={{ fontFamily: 'Outfit_600SemiBold', fontSize: 14, color: colors.text, marginTop: 20, marginBottom: 10 }}>
        Fun Comparisons
      </Text>
      {comparisons.map((c, i) => (
        <View key={i} style={[styles.comparisonItem, { backgroundColor: colors.card + '99', borderColor: colors.border }]}>
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: colors.textSecondary }}>
            Enough data to stream <Text style={{ fontFamily: 'Outfit_700Bold', color: colors.primary }}>{c.label}</Text>
          </Text>
          <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 18, color: colors.text, marginTop: 4 }}>
            {c.count.toLocaleString()} {c.unit}
          </Text>
        </View>
      ))}
    </View>
  );
}

function WatchingHabitsSection({ colors, data }: { colors: any; data: any }) {
  const h = data.habits;
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const maxWeek = Math.max(...h.weeklyPattern, 1);

  return (
    <View style={[styles.sectionCard, colors.isAmoled ? { backgroundColor: '#000000' } : {}]}>
      {!colors.isAmoled && <LinearGradient colors={[colors.card + 'CC', colors.surface + '88']} style={[StyleSheet.absoluteFill, { borderRadius: 20 }]} />}
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Watching Habits</Text>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
        <View style={[styles.habitCard, { backgroundColor: colors.primary + '12' }]}>
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 10, color: colors.textMuted }}>MOST ACTIVE DAY</Text>
          <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 16, color: colors.primary }}>{h.mostActiveDay}</Text>
        </View>
        <View style={[styles.habitCard, { backgroundColor: colors.accent + '12' }]}>
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 10, color: colors.textMuted }}>PRIME TIME</Text>
          <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 16, color: colors.accent || colors.primary }}>{h.mostActiveTime}</Text>
        </View>
        <View style={[styles.habitCard, { backgroundColor: colors.success + '12' }]}>
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 10, color: colors.textMuted }}>AVG SESSION</Text>
          <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 16, color: colors.success }}>{h.averageSessionLength}m</Text>
        </View>
        <View style={[styles.habitCard, { backgroundColor: colors.warning + '12' }]}>
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 10, color: colors.textMuted }}>LONGEST SESSION</Text>
          <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 16, color: colors.warning }}>{Math.round(h.longestSession / 60)}h</Text>
        </View>
        <View style={[styles.habitCard, { backgroundColor: colors.info + '12' }]}>
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 10, color: colors.textMuted }}>LATE NIGHT</Text>
          <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 16, color: colors.info }}>{h.totalLateNight}%</Text>
        </View>
        <View style={[styles.habitCard, { backgroundColor: colors.purple + '12' || colors.primary + '12' }]}>
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 10, color: colors.textMuted }}>WEEKEND</Text>
          <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 16, color: colors.accent || colors.primary }}>{h.totalWeekend}%</Text>
        </View>
      </View>

      <View style={{ marginTop: 20 }}>
        <Text style={{ fontFamily: 'Outfit_600SemiBold', fontSize: 13, color: colors.textSecondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Weekly Activity
        </Text>
        <View style={{ flexDirection: 'row', height: 80, alignItems: 'flex-end', gap: 2 }}>
          {h.weeklyPattern.map((v: number, i: number) => (
            <View key={i} style={{ flex: 1, alignItems: 'center' }}>
              <AnimatedBarChart value={v} max={maxWeek} color={colors.primary} height={60} />
              <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 8, color: colors.textMuted, marginTop: 4 }}>{days[i]}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={{ marginTop: 20 }}>
        <Text style={{ fontFamily: 'Outfit_600SemiBold', fontSize: 13, color: colors.textSecondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          24-Hour Activity
        </Text>
        <Svg width={CARD_WIDTH - 40} height={50}>
          {h.hourlyPattern.map((v: number, i: number) => (
            <Rect key={i} x={(i / 24) * (CARD_WIDTH - 40)} y={50 - (v / 100) * 45}
              width={(CARD_WIDTH - 40) / 24 - 1} height={(v / 100) * 45}
              fill={i >= 20 || i <= 4 ? colors.info : colors.primary} rx={1} opacity={0.5 + (v / 100) * 0.5}
            />
          ))}
        </Svg>
      </View>
    </View>
  );
}

function AnimatedBarChart({ value, max, color, height }: { value: number; max: number; color: string; height: number }) {
  const animHeight = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animHeight, { toValue: (value / max) * height, duration: 800, useNativeDriver: false }).start();
  }, [value]);

  return (
    <Animated.View style={{
      width: '100%', height: animHeight, backgroundColor: color, borderRadius: 4, opacity: 0.5 + (value / max) * 0.5,
      minHeight: 4,
    }} />
  );
}

function AchievementsSection({ colors, data }: { colors: any; data: any }) {
  const achievements = data.achievements as Achievement[];
  const unlocked = achievements.filter(a => a.unlockedAt !== null);
  const locked = achievements.filter(a => a.unlockedAt === null);

  return (
    <View style={[styles.sectionCard, colors.isAmoled ? { backgroundColor: '#000000' } : {}]}>
      {!colors.isAmoled && <LinearGradient colors={[colors.card + 'CC', colors.surface + '88']} style={[StyleSheet.absoluteFill, { borderRadius: 20 }]} />}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Achievements</Text>
        <View style={[styles.achievementCount, { backgroundColor: colors.primary + '20' }]}>
          <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 12, color: colors.primary }}>{unlocked.length}/{achievements.length}</Text>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 12, gap: 12 }}>
        {unlocked.map((a) => (
          <View key={a.id} style={[styles.achievementBadge, { backgroundColor: getRarityColor(a.rarity) + '20', borderColor: getRarityColor(a.rarity) + '40' }]}>
            <View style={[styles.achievementIcon, { backgroundColor: getRarityColor(a.rarity) + '30' }]}>
              <Text style={{ fontSize: 28 }}>{a.icon}</Text>
            </View>
            <Text style={{ fontFamily: 'Outfit_600SemiBold', fontSize: 11, color: colors.text, marginTop: 6, textAlign: 'center' }}>
              {a.title}
            </Text>
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 8, color: colors.textMuted, textAlign: 'center', marginTop: 2 }}>
              {a.description}
            </Text>
            {a.rarity !== 'common' && (
              <View style={[styles.rarityBadge, { backgroundColor: getRarityColor(a.rarity) }]}>
                <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 7, color: '#fff', textTransform: 'uppercase' }}>{a.rarity}</Text>
              </View>
            )}
          </View>
        ))}
        {locked.slice(0, 3).map((a) => (
          <View key={a.id} style={[styles.achievementBadge, { backgroundColor: colors.card, borderColor: colors.border, opacity: 0.5 }]}>
            <View style={[styles.achievementIcon, { backgroundColor: colors.cardOverlay }]}>
              <MaterialIcons name="lock" size={24} color={colors.textMuted} />
            </View>
            <Text style={{ fontFamily: 'Outfit_600SemiBold', fontSize: 11, color: colors.textMuted, marginTop: 6, textAlign: 'center' }}>
              {a.title}
            </Text>
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 8, color: colors.textMuted, textAlign: 'center', marginTop: 2 }}>
              {a.progress}/{a.target}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function getRarityColor(rarity: string): string {
  const map: Record<string, string> = { common: '#94a3b8', rare: '#3b82f6', epic: '#8b5cf6', legendary: '#f59e0b' };
  return map[rarity] || '#94a3b8';
}

function MonthlyWrappedSection({ colors, data }: { colors: any; data: any }) {
  const summaries = data.monthlySummaries as MonthlySummary[];
  if (!summaries?.length) return null;
  const latest = summaries[summaries.length - 1];

  return (
    <View style={[styles.sectionCard, colors.isAmoled ? { backgroundColor: '#000000' } : {}]}>
      {!colors.isAmoled && (
        <LinearGradient
          colors={[colors.warning + '20', colors.card + 'CC', colors.surface + '88']}
          style={[StyleSheet.absoluteFill, { borderRadius: 20 }]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        />
      )}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Your Month on Rogplay</Text>
        <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 16, color: colors.warning }}>{latest.month} {latest.year}</Text>
      </View>

      <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
        <View style={[styles.wrappedCard, { backgroundColor: colors.warning + '12', borderColor: colors.warning + '20' }]}>
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 10, color: colors.textMuted }}>Hours</Text>
          <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 24, color: colors.warning }}>{latest.hoursWatched}</Text>
        </View>
        <View style={[styles.wrappedCard, { backgroundColor: colors.primary + '12', borderColor: colors.primary + '20' }]}>
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 10, color: colors.textMuted }}>Sessions</Text>
          <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 24, color: colors.primary }}>{latest.sessions}</Text>
        </View>
        <View style={[styles.wrappedCard, { backgroundColor: colors.success + '12', borderColor: colors.success + '20' }]}>
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 10, color: colors.textMuted }}>Discoveries</Text>
          <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 24, color: colors.success }}>{latest.newDiscoveries}</Text>
        </View>
      </View>

      <View style={{ marginTop: 12, gap: 6 }}>
        <StatRow label="Top Genre" value={latest.topGenre} color={colors.primary} colors={colors} />
        <StatRow label="Top Movie" value={latest.topMovie} color={colors.accent || colors.primary} colors={colors} />
        <StatRow label="Top Show" value={latest.topShow} color={colors.success} colors={colors} />
        <StatRow label="Favorite Channel" value={latest.favoriteChannel} color={colors.warning} colors={colors} />
        <StatRow label="Biggest Binge" value={`${latest.biggestBinge}h`} color={colors.info} colors={colors} />
      </View>
    </View>
  );
}

function StatRow({ label, value, color, colors }: { label: string; value: string; color: string; colors: any }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.border + '40' }}>
      <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: colors.textSecondary }}>{label}</Text>
      <Text style={{ fontFamily: 'Outfit_600SemiBold', fontSize: 14, color }}>{value}</Text>
    </View>
  );
}

function DiscoveryInsightsSection({ colors, data }: { colors: any; data: any }) {
  const facts: string[] = [];
  if (data.totalSessions > 0) {
    facts.push(`You've explored ${data.discoveredGenres.length} different genres`);
    if (data.habits.activeDay !== 'N/A') facts.push(`Your most active day is ${data.habits.activeDay}`);
    if (data.habits.activeTime !== 'N/A') facts.push(`You prefer watching during ${data.habits.activeTime}`);
    if (data.habits.lateNightSessions > 0) facts.push(`${data.habits.lateNightSessions} sessions were late-night watches`);
    if (data.totalNewSeries > 0) facts.push(`You discovered ${data.totalNewSeries} new series`);
    if (data.habits.longestSession > 0) facts.push(`Your longest session was ${Math.round(data.habits.longestSession)} minutes`);
  }

  return (
    <View style={[styles.sectionCard, colors.isAmoled ? { backgroundColor: '#000000' } : {}]}>
      {!colors.isAmoled && <LinearGradient colors={[colors.success + '15', colors.card + 'CC', colors.surface + '88']} style={[StyleSheet.absoluteFill, { borderRadius: 20 }]} />}
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Discovery Insights</Text>
      <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>Fun facts about your viewing journey</Text>
      <View style={{ marginTop: 12, gap: 8 }}>
        {facts.length > 0 ? facts.map((fact: string, i: number) => (
          <View key={i} style={[styles.factItem, { backgroundColor: colors.card + '99', borderColor: colors.border }]}>
            <View style={[styles.factDot, { backgroundColor: i % 2 === 0 ? colors.primary : colors.success }]} />
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: colors.text, flex: 1, marginLeft: 12 }}>{fact}</Text>
          </View>
        )) : (
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: colors.textSecondary, textAlign: 'center', marginTop: 8 }}>
            Start watching to discover insights about your habits.
          </Text>
        )}
      </View>
    </View>
  );
}

export default function MediaInsightsDashboard() {
  const { colors: currentColors } = useTheme();
  const router = useRouter();
  const data = useAnalyticsStore();
  const scrollY = useRef(new Animated.Value(0)).current;

  const handleShare = useCallback(async () => {
    const totalHours = data.totalWatchTimeMs / 3600000;
    try {
      await Share.share({
        message: `🎬 I've spent ${formatDuration(totalHours)} watching on Rogplay!${data.personality ? ` I'm a ${data.personality.title}!` : ''} Check out your own stats at Rogplay.`,
      });
    } catch { }
  }, [data]);

  const handleRefresh = useCallback(() => {
    useAnalyticsStore.getState().refreshUserName();
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: currentColors.background }]}>
      {currentColors.isAmoled ? (
        <View style={StyleSheet.absoluteFill} />
      ) : (
        <LinearGradient
          colors={[currentColors.primary + '20', currentColors.background + 'F8', currentColors.background]}
          locations={[0, 0.2, 1]}
          style={StyleSheet.absoluteFill}
        />
      )}
      <SafeAreaView style={{ flex: 1 }}>
        <View style={[styles.header, { borderBottomColor: currentColors.border + '40' }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <MaterialIcons name="arrow-back" size={24} color={currentColors.text} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={[styles.headerTitle, { color: currentColors.text }]}>Media Insights</Text>
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: currentColors.textSecondary, marginTop: 1 }}>
              Your personal streaming journey
            </Text>
          </View>
          <TouchableOpacity onPress={handleRefresh} style={[styles.headerAction, { backgroundColor: currentColors.card + 'AA' }]}>
            <MaterialIcons name="refresh" size={20} color={currentColors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleShare} style={[styles.headerAction, { backgroundColor: currentColors.card + 'AA' }]}>
            <MaterialIcons name="share" size={20} color={currentColors.primary} />
          </TouchableOpacity>
        </View>

        <Animated.ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }}
          onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
          scrollEventThrottle={16}
        >
          <WelcomeSection colors={currentColors} data={data} />
          <ViewingHoursSection colors={currentColors} data={data} />
          <AchievementsSection colors={currentColors} data={data} />
          <GenreGalaxySection colors={currentColors} data={data} />
          <MostWatchedSection colors={currentColors} data={data} />
          <PersonalitySection colors={currentColors} data={data} />
          <BandwidthInsightsSection colors={currentColors} data={data} />
          <WatchingHabitsSection colors={currentColors} data={data} />
          <MonthlyWrappedSection colors={currentColors} data={data} />
          <DiscoveryInsightsSection colors={currentColors} data={data} />
        </Animated.ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
    paddingVertical: 12, borderBottomWidth: 1, gap: 12,
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontFamily: 'Outfit_700Bold', fontSize: 20 },
  headerAction: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  welcomeSection: { borderRadius: 24, overflow: 'hidden', minHeight: 220 },
  welcomeGreeting: { fontFamily: 'Inter_400Regular', fontSize: 14, letterSpacing: 0.5 },
  welcomeName: { fontFamily: 'Outfit_700Bold', fontSize: 32, marginTop: 4, marginBottom: 16 },
  statRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 8 },
  welcomeStat: { fontFamily: 'Inter_400Regular', fontSize: 13, flex: 1 },
  refreshBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, borderWidth: 1, marginTop: 16, alignSelf: 'flex-start' },
  refreshBtnText: { fontFamily: 'Outfit_600SemiBold', fontSize: 13 },
  sectionCard: {
    borderRadius: 20, padding: 20, marginBottom: 16, overflow: 'hidden',
    ...Platform.select({ android: { elevation: 4 } }),
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8,
  },
  sectionTitle: { fontFamily: 'Outfit_700Bold', fontSize: 20 },
  sectionSubtitle: { fontFamily: 'Inter_400Regular', fontSize: 12, marginTop: 4 },
  milestoneBox: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, borderWidth: 1, marginTop: 16 },

  genreNode: { justifyContent: 'center', alignItems: 'center' },
  genreDetail: { padding: 16, borderRadius: 16, borderWidth: 1, marginTop: 8 },
  posterChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  posterCard: { flex: 1, padding: 16, borderRadius: 16, borderWidth: 1, alignItems: 'center', gap: 8 },
  posterCardLabel: { fontFamily: 'Inter_400Regular', fontSize: 11 },
  posterCardValue: { fontFamily: 'Outfit_700Bold', fontSize: 24 },
  personalityEmoji: { width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center', borderWidth: 2, marginBottom: 16 },
  personalityTitle: { fontFamily: 'Outfit_700Bold', fontSize: 24, textAlign: 'center', marginBottom: 8 },
  personalityDesc: { fontFamily: 'Inter_400Regular', fontSize: 14, textAlign: 'center', lineHeight: 20, paddingHorizontal: 20 },
  traitBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  bandwidthCard: { flex: 1, padding: 12, borderRadius: 16, borderWidth: 1, alignItems: 'center' },
  comparisonItem: { padding: 14, borderRadius: 14, borderWidth: 1 },
  habitCard: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, minWidth: '30%', flexGrow: 1 },
  achievementBadge: { width: 130, padding: 12, borderRadius: 16, borderWidth: 1, alignItems: 'center' },
  achievementIcon: { width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center' },
  rarityBadge: { position: 'absolute', top: -4, right: -4, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  achievementCount: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  wrappedCard: { flex: 1, padding: 12, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  factItem: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 14, borderWidth: 1 },
  factDot: { width: 6, height: 6, borderRadius: 3 },

});
