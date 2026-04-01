import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, ViewStyle, ScrollView, Dimensions, Platform } from 'react-native';

const { width, height } = Dimensions.get('window');
const isTV = Platform.isTV;
import { LinearGradient } from 'expo-linear-gradient';

interface SkeletonProps {
    width?: number | string;
    height?: number | string;
    borderRadius?: number;
    style?: ViewStyle;
}

export const Skeleton: React.FC<SkeletonProps> = ({
    width = '100%',
    height = 20,
    borderRadius = 8,
    style
}) => {
    const shimmerAnimation = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const animation = Animated.loop(
            Animated.sequence([
                Animated.timing(shimmerAnimation, {
                    toValue: 1,
                    duration: 1200,
                    useNativeDriver: true,
                }),
                Animated.timing(shimmerAnimation, {
                    toValue: 0,
                    duration: 1200,
                    useNativeDriver: true,
                }),
            ])
        );
        animation.start();
        return () => animation.stop();
    }, []);

    const opacity = shimmerAnimation.interpolate({
        inputRange: [0, 1],
        outputRange: [0.15, 0.45],
    });

    return (
        <Animated.View
            style={[
                styles.skeleton,
                {
                    width: width as any,
                    height: height as any,
                    borderRadius,
                    opacity,
                },
                style,
            ]}
        />
    );
};


interface VideoCardSkeletonProps {
    width?: number | string;
}

export const VideoCardSkeleton: React.FC<VideoCardSkeletonProps> = ({ width = '100%' }) => {
    return (
        <View style={[styles.card, { width: width as any }]}>
            <Skeleton width="100%" height={120} borderRadius={20} />
            <View style={styles.cardInfo}>
                <Skeleton width="80%" height={14} borderRadius={4} />
                <Skeleton width="40%" height={11} borderRadius={4} style={{ marginTop: 8 }} />
            </View>
        </View>
    );
};

/* Single Movie card skeleton */
interface MovieCardSkeletonProps {
    width?: number | string;
}

export const MovieCardSkeleton: React.FC<MovieCardSkeletonProps> = ({ width = 120 }) => {
    return (
        <View style={[styles.movieCard, { width: width as any }]}>
            <Skeleton width="100%" height={180} borderRadius={12} />
            <Skeleton width="90%" height={12} borderRadius={4} style={{ marginTop: 8 }} />
            <Skeleton width="60%" height={10} borderRadius={4} style={{ marginTop: 4 }} />
        </View>
    );
};

interface ListItemSkeletonProps {
    showThumbnail?: boolean;
}

/* Single Video List */
export const ListItemSkeleton: React.FC<ListItemSkeletonProps> = ({ showThumbnail = true }) => {
    return (
        <View style={styles.listItem}>
            {showThumbnail && (
                <Skeleton width={120} height={70} borderRadius={12} />
            )}
            <View style={styles.listItemContent}>
                <Skeleton width="80%" height={16} borderRadius={4} />
                <Skeleton width="40%" height={12} borderRadius={4} style={{ marginTop: 8 }} />
            </View>
        </View>
    );
};

export const FolderSkeleton: React.FC = () => {
    return (
        <View style={styles.listItem}>
            <View style={styles.folderIconPlaceholder}>
                <Skeleton width={40} height={40} borderRadius={8} />
            </View>
            <View style={styles.listItemContent}>
                <Skeleton width="60%" height={17} borderRadius={4} />
                <Skeleton width="30%" height={13} borderRadius={4} style={{ marginTop: 6 }} />
            </View>
        </View>
    );
};

interface GridSkeletonProps {
    count?: number;
    columns?: number;
    itemWidth?: number | string;
    renderItem?: () => React.ReactNode;
}

export const GridSkeleton: React.FC<GridSkeletonProps> = ({
    count = 6,
    columns = 2,
    itemWidth = '48%',
    renderItem
}) => {
    return (
        <View style={styles.grid}>
            {Array.from({ length: count }).map((_, index) => (
                <View key={index} style={{ width: itemWidth as any, marginBottom: 16 }}>
                    {renderItem ? renderItem() : <VideoCardSkeleton width="100%" />}
                </View>
            ))}
        </View>
    );
};

interface HeroSkeletonProps { }

export const HeroSkeleton: React.FC<HeroSkeletonProps> = () => {
    return (
        <View style={styles.hero}>
            <Skeleton width="100%" height={400} borderRadius={0} />
            <View style={styles.heroContent}>
                <Skeleton width="60%" height={32} borderRadius={8} />
                <Skeleton width="80%" height={16} borderRadius={4} style={{ marginTop: 12 }} />
                <Skeleton width="70%" height={16} borderRadius={4} style={{ marginTop: 8 }} />
                <View style={styles.heroButtons}>
                    <Skeleton width={120} height={44} borderRadius={22} />
                    <Skeleton width={120} height={44} borderRadius={22} style={{ marginLeft: 12 }} />
                </View>
            </View>
        </View>
    );
};

interface BrowserAddonSkeletonProps { }

export const BrowserAddonSkeleton: React.FC<BrowserAddonSkeletonProps> = () => {
    return (
        <View style={styles.addonCard}>
            <View style={styles.addonHeader}>
                <Skeleton width={48} height={48} borderRadius={24} />
                <View style={styles.addonHeaderText}>
                    <Skeleton width="70%" height={16} borderRadius={4} />
                    <Skeleton width="50%" height={12} borderRadius={4} style={{ marginTop: 6 }} />
                </View>
            </View>
            <Skeleton width="100%" height={14} borderRadius={4} style={{ marginTop: 12 }} />
            <Skeleton width="90%" height={14} borderRadius={4} style={{ marginTop: 6 }} />
            <Skeleton width="80%" height={14} borderRadius={4} style={{ marginTop: 6 }} />
            <View style={styles.addonFooter}>
                <Skeleton width={100} height={36} borderRadius={18} />
                <Skeleton width={60} height={20} borderRadius={10} />
            </View>
        </View>
    );
};

interface CinemaItemSkeletonProps { }

export const CinemaItemSkeleton: React.FC<CinemaItemSkeletonProps> = () => {
    return (
        <View style={styles.cinemaItem}>
            <Skeleton width={120} height={160} borderRadius={12} />
            <View style={styles.cinemaContent}>
                <Skeleton width="80%" height={18} borderRadius={4} />
                <Skeleton width="60%" height={14} borderRadius={4} style={{ marginTop: 8 }} />
                <Skeleton width="50%" height={12} borderRadius={4} style={{ marginTop: 6 }} />
                <View style={styles.cinemaMetadata}>
                    <Skeleton width={60} height={24} borderRadius={12} />
                    <Skeleton width={60} height={24} borderRadius={12} style={{ marginLeft: 8 }} />
                    <Skeleton width={60} height={24} borderRadius={12} style={{ marginLeft: 8 }} />
                </View>
            </View>
        </View>
    );
};

interface IptvPlaylistSkeletonProps { }

export const IptvPlaylistSkeleton: React.FC<IptvPlaylistSkeletonProps> = () => {
    return (
        <View style={styles.iptvCard}>
            <View style={styles.iptvIconContainer}>
                <Skeleton width={50} height={50} borderRadius={14} />
            </View>
            <View style={styles.iptvInfo}>
                <Skeleton width="70%" height={16} borderRadius={4} />
                <Skeleton width="50%" height={12} borderRadius={4} style={{ marginTop: 6 }} />
            </View>
            <Skeleton width={40} height={40} borderRadius={8} />
        </View>
    );
};

interface IptvChannelSkeletonProps {
    width?: number | string;
}

export const IptvChannelSkeleton: React.FC<IptvChannelSkeletonProps> = ({ width = '100%' }) => {
    return (
        <View style={[styles.iptvChannelCard, { width: width as any }]}>
            <Skeleton width="100%" height={180} borderRadius={12} />
            <View style={styles.iptvChannelInfo}>
                <Skeleton width="80%" height={14} borderRadius={4} />
                <Skeleton width="60%" height={12} borderRadius={4} style={{ marginTop: 6 }} />
            </View>
        </View>
    );
};

interface DownloadItemSkeletonProps { }

export const DownloadItemSkeleton: React.FC<DownloadItemSkeletonProps> = () => {
    return (
        <View style={styles.downloadCard}>
            <Skeleton width={100} height={70} borderRadius={14} />
            <View style={styles.downloadInfo}>
                <Skeleton width="70%" height={16} borderRadius={4} />
                <View style={styles.downloadMeta}>
                    <Skeleton width={60} height={12} borderRadius={4} />
                    <Skeleton width={60} height={12} borderRadius={4} style={{ marginLeft: 8 }} />
                </View>
            </View>
            <Skeleton width={44} height={44} borderRadius={22} />
        </View>
    );
};

interface StreamSourceSkeletonProps { }

export const StreamSourceSkeleton: React.FC<StreamSourceSkeletonProps> = () => {
    return (
        <View style={styles.streamCard}>
            <Skeleton width={52} height={52} borderRadius={26} />
            <View style={styles.streamInfo}>
                <Skeleton width="60%" height={16} borderRadius={4} />
                <Skeleton width="40%" height={12} borderRadius={4} style={{ marginTop: 8 }} />
            </View>
            <Skeleton width={40} height={24} borderRadius={6} />
        </View>
    );
};

interface EpisodeSkeletonProps { }

export const EpisodeSkeleton: React.FC<EpisodeSkeletonProps> = () => {
    return (
        <View style={styles.episodeCardSkeleton}>
            <Skeleton width={140} height={80} borderRadius={12} />
            <View style={styles.episodeInfoSkeleton}>
                <Skeleton width="80%" height={16} borderRadius={4} />
                <Skeleton width="95%" height={12} borderRadius={4} style={{ marginTop: 8 }} />
                <Skeleton width="90%" height={12} borderRadius={4} style={{ marginTop: 6 }} />
                <View style={styles.episodeMetaSkeleton}>
                    <Skeleton width={40} height={12} borderRadius={4} />
                    <Skeleton width={40} height={12} borderRadius={4} style={{ marginLeft: 12 }} />
                </View>
            </View>
        </View>
    );
};

interface DetailsSkeletonProps { }


export const DetailsSkeleton: React.FC<DetailsSkeletonProps> = () => {
    return (
        <ScrollView style={styles.detailsSkeleton} showsVerticalScrollIndicator={false}>
            <Skeleton width="100%" height={300} borderRadius={0} />
            <View style={styles.detailsContentSkeleton}>
                <View style={styles.detailsPosterSkeleton}>
                    <Skeleton width={120} height={180} borderRadius={12} />
                </View>
                <View style={{ alignItems: 'center' }}>
                    <Skeleton width="70%" height={28} borderRadius={8} style={{ marginTop: 16 }} />
                    <View style={styles.detailsMetaSkeleton}>
                        <Skeleton width={50} height={14} borderRadius={4} />
                        <Skeleton width={50} height={14} borderRadius={4} style={{ marginLeft: 16 }} />
                        <Skeleton width={50} height={14} borderRadius={4} style={{ marginLeft: 16 }} />
                    </View>
                    <View style={styles.detailsGenresSkeleton}>
                        <Skeleton width={80} height={30} borderRadius={15} />
                        <Skeleton width={80} height={30} borderRadius={15} style={{ marginLeft: 8 }} />
                        <Skeleton width={80} height={30} borderRadius={15} style={{ marginLeft: 8 }} />
                    </View>
                </View>
                <Skeleton width="100%" height={50} borderRadius={12} style={{ marginTop: 24 }} />
                <View style={{ marginTop: 32 }}>
                    <Skeleton width="100%" height={16} borderRadius={4} />
                    <Skeleton width="100%" height={16} borderRadius={4} style={{ marginTop: 8 }} />
                    <Skeleton width="80%" height={16} borderRadius={4} style={{ marginTop: 8 }} />
                </View>
                <View style={{ marginTop: 40 }}>
                    <Skeleton width="40%" height={20} borderRadius={4} />
                    <View style={{ flexDirection: 'row', marginTop: 16 }}>
                        <Skeleton width={100} height={150} borderRadius={12} />
                        <Skeleton width={100} height={150} borderRadius={12} style={{ marginLeft: 12 }} />
                        <Skeleton width={100} height={150} borderRadius={12} style={{ marginLeft: 12 }} />
                    </View>
                </View>
            </View>
        </ScrollView>
    );
};


export const TVDetailsSkeleton: React.FC = () => {
    return (
        <View style={styles.tvDetailsContainer}>
            <View style={styles.tvDetailsContent}>
                <View style={styles.tvDetailsTop}>
                    <Skeleton width={220} height={330} borderRadius={16} />
                    <View style={styles.tvDetailsInfo}>
                        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 15 }}>
                            <Skeleton width={80} height={24} borderRadius={12} />
                            <Skeleton width={80} height={24} borderRadius={12} />
                            <Skeleton width={80} height={24} borderRadius={12} />
                        </View>
                        <Skeleton width="70%" height={40} borderRadius={8} />
                        <View style={{ flexDirection: 'row', gap: 20, marginTop: 20 }}>
                            <Skeleton width={60} height={16} borderRadius={4} />
                            <Skeleton width={60} height={16} borderRadius={4} />
                            <Skeleton width={100} height={16} borderRadius={4} />
                        </View>
                        <View style={{ marginTop: 30 }}>
                            <Skeleton width="100%" height={15} borderRadius={4} />
                            <Skeleton width="100%" height={15} borderRadius={4} style={{ marginTop: 10 }} />
                            <Skeleton width="100%" height={15} borderRadius={4} style={{ marginTop: 10 }} />
                            <Skeleton width="80%" height={15} borderRadius={4} style={{ marginTop: 10 }} />
                        </View>
                        <View style={{ flexDirection: 'row', gap: 16, marginTop: 40 }}>
                            <Skeleton width={160} height={52} borderRadius={26} />
                            <Skeleton width={120} height={52} borderRadius={26} />
                        </View>
                    </View>
                </View>
                <View style={{ marginTop: 40 }}>
                    <Skeleton width={150} height={24} borderRadius={4} style={{ marginBottom: 20 }} />
                    <View style={{ flexDirection: 'row', gap: 16 }}>
                        <Skeleton width={240} height={150} borderRadius={14} />
                        <Skeleton width={240} height={150} borderRadius={14} />
                        <Skeleton width={240} height={150} borderRadius={14} />
                    </View>
                </View>
            </View>
        </View>
    );
};

export interface TrendingSliderSkeletonProps {
    fullScreen?: boolean;
}

export const TrendingSliderSkeleton: React.FC<TrendingSliderSkeletonProps> = ({ fullScreen = false }) => {
    const itemWidth = fullScreen && isTV ? width * 0.5 : (isTV ? width * 0.6 : width * 0.85);
    const itemHeight = fullScreen && isTV ? height * 0.45 : 220;
    const itemMargin = isTV ? (fullScreen ? 20 : 10) : 10;
    const snapInterval = itemWidth + itemMargin * 2;
    const spacerWidth = (width - snapInterval) / 2;

    const renderSkeletonItem = (w: number, h: number, m: number, op: number = 1, showContent: boolean = true) => (
        <View style={{ width: w, height: h, marginHorizontal: m, opacity: op, borderRadius: 10, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.05)' }}>
            <Skeleton width="100%" height="100%" borderRadius={10} />
            {showContent && (
                <View style={{ position: 'absolute', bottom: isTV ? 30 : 20, left: isTV ? 30 : 20, right: isTV ? 30 : 20, gap: 8 }}>
                    {!isTV && <Skeleton width={60} height={16} borderRadius={4} />}
                    <Skeleton width="70%" height={isTV ? 28 : 20} borderRadius={6} />
                    <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                        <Skeleton width={40} height={12} borderRadius={4} />
                        <Skeleton width={40} height={12} borderRadius={4} />
                        <Skeleton width={60} height={12} borderRadius={4} />
                    </View>
                </View>
            )}
        </View>
    );

    return (
        <View style={[{ marginBottom: 32, marginTop: 10 }, fullScreen && isTV && { marginTop: 40, marginBottom: 20 }]}>
            <View style={[{ flexDirection: 'row', alignItems: 'center' }, fullScreen && isTV && { paddingHorizontal: 40 }]}>
                {fullScreen && isTV ? (
                    <>
                        {renderSkeletonItem(width * 0.5, height * 0.45, 10, 1)}
                        {renderSkeletonItem(width * 0.22, height * 0.45, 10, 0.7)}
                        {renderSkeletonItem(width * 0.22, height * 0.45, 10, 0.5)}
                    </>
                ) : (
                    <>
                        {/* Left Spacer for non-fullscreen */}
                        <View style={{ width: spacerWidth }} />

                        {/* Main Item */}
                        {renderSkeletonItem(itemWidth, itemHeight, itemMargin, 1)}

                        {/* Right Item for peek effect */}
                        {renderSkeletonItem(itemWidth, itemHeight, itemMargin, 0.4, false)}
                    </>
                )}
            </View>
        </View>
    );
};


export const TVEpisodeSkeleton: React.FC = () => {
    return (
        <View style={styles.tvEpisodeCard}>
            <Skeleton width={200} height={112} borderRadius={0} />
            <View style={{ flex: 1, padding: 16 }}>
                <Skeleton width="40%" height={20} borderRadius={4} />
                <Skeleton width="90%" height={14} borderRadius={4} style={{ marginTop: 12 }} />
                <Skeleton width="80%" height={14} borderRadius={4} style={{ marginTop: 8 }} />
            </View>
        </View>
    );
};

export const TVServerSelectionSkeleton: React.FC = () => {
    return (
        <View style={styles.tvServerGrid}>
            {Array.from({ length: 12 }).map((_, index) => (
                <View key={index} style={styles.tvServerCardSkeleton}>
                    <Skeleton width={60} height={60} borderRadius={30} />
                    <View style={{ flex: 1, marginLeft: 20 }}>
                        <Skeleton width="60%" height={18} borderRadius={4} />
                        <Skeleton width="90%" height={14} borderRadius={4} style={{ marginTop: 10 }} />
                    </View>
                </View>
            ))}
        </View>
    );
};

const styles = StyleSheet.create({
    skeleton: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    card: {
        backgroundColor: '#1a1a1a',
        borderRadius: 20,
        overflow: 'hidden',
        marginBottom: 16,
    },
    cardInfo: {
        padding: 12,
    },
    movieCard: {
        marginRight: 12,
    },
    listItem: {
        flexDirection: 'row',
        padding: 16,
        alignItems: 'center',
    },
    listItemContent: {
        flex: 1,
        marginLeft: 16,
        justifyContent: 'center',
    },
    folderIconPlaceholder: {
        width: 60,
        height: 60,
        justifyContent: 'center',
        alignItems: 'center',
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        padding: 16,
    },
    hero: {
        position: 'relative',
        marginBottom: 24,
    },
    heroContent: {
        position: 'absolute',
        bottom: 40,
        left: 20,
        right: 20,
    },
    heroButtons: {
        flexDirection: 'row',
        marginTop: 20,
    },
    addonCard: {
        backgroundColor: '#1a1a1a',
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#2a2a2a',
    },
    addonHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    addonHeaderText: {
        flex: 1,
        marginLeft: 12,
    },
    addonFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 16,
    },
    cinemaItem: {
        flexDirection: 'row',
        backgroundColor: '#1a1a1a',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#2a2a2a',
    },
    cinemaContent: {
        flex: 1,
        marginLeft: 16,
        justifyContent: 'center',
    },
    cinemaMetadata: {
        flexDirection: 'row',
        marginTop: 12,
    },
    iptvCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1a1a1a',
        borderRadius: 16,
        padding: 12,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#2a2a2a',
    },
    iptvIconContainer: {
        marginRight: 14,
    },
    iptvInfo: {
        flex: 1,
    },
    iptvChannelCard: {
        backgroundColor: '#1a1a1a',
        borderRadius: 12,
        overflow: 'hidden',
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#2a2a2a',
    },
    iptvChannelInfo: {
        padding: 12,
    },
    downloadCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        backgroundColor: '#1a1a1a',
        borderRadius: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#2a2a2a',
    },
    downloadInfo: {
        flex: 1,
        marginLeft: 14,
    },
    downloadMeta: {
        flexDirection: 'row',
        marginTop: 6,
    },
    streamCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        backgroundColor: '#1a1a1a',
        borderRadius: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#2a2a2a',
    },
    streamInfo: {
        flex: 1,
        marginLeft: 16,
    },
    episodeCardSkeleton: {
        flexDirection: 'row',
        backgroundColor: '#1a1a1a',
        borderRadius: 12,
        marginBottom: 16,
        padding: 0,
        overflow: 'hidden',
    },
    episodeInfoSkeleton: {
        flex: 1,
        padding: 12,
    },
    episodeMetaSkeleton: {
        flexDirection: 'row',
        marginTop: 10,
    },
    detailsSkeleton: {
        flex: 1,
        backgroundColor: '#0f172a',
    },
    detailsContentSkeleton: {
        padding: 16,
    },
    detailsPosterSkeleton: {
        marginTop: -60,
        alignItems: 'center',
    },
    detailsMetaSkeleton: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 12,
    },
    detailsGenresSkeleton: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 20,
    },
    tvServerGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    tvServerCardSkeleton: {
        width: '48%',
        height: 100,
        backgroundColor: 'rgba(255,255,255,0.05)',
        margin: '1%',
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    tvDetailsContainer: {
        flex: 1,
        backgroundColor: '#0f172a',
    },
    tvDetailsContent: {
        flex: 1,
        paddingTop: 40,
        paddingLeft: 50,
        paddingRight: 40,
    },
    tvDetailsTop: {
        flexDirection: 'row',
        flex: 1,
    },
    tvDetailsInfo: {
        flex: 1,
        marginLeft: 36,
        justifyContent: 'center',
        maxWidth: 650,
    },
    tvEpisodeCard: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255,255,255,0.05)',
        marginBottom: 20,
        borderRadius: 12,
        overflow: 'hidden',
    }
});
