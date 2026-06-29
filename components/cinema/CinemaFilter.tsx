import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, Platform, Dimensions, FlatList } from 'react-native';
import { Colors } from '@/constants/Colors';
import { MaterialIcons } from '@expo/vector-icons';
import { getGenres, getLanguages, getCountries } from '@/services/tmdb';
import { TVFocusable } from '@/components/TVFocusable';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/hooks/useTheme';

export interface FilterState {
    genre: string;
    year: string;
    rating: string;
    language: string;
    sort_by: string;
    country: string;
}

const SORT_OPTIONS = [
    { label: 'Most Popular', value: 'popularity.desc' },
    { label: 'Least Popular', value: 'popularity.asc' },
    { label: 'Top Rated', value: 'vote_average.desc' },
    { label: 'Newest', value: 'primary_release_date.desc' },
    { label: 'Oldest', value: 'primary_release_date.asc' },
];

const RATINGS = [
    { label: 'Any Rating', value: '' },
    { label: '8+ Stars', value: '8' },
    { label: '7+ Stars', value: '7' },
    { label: '6+ Stars', value: '6' },
    { label: '5+ Stars', value: '5' },
];

const YEARS = [{ label: 'All Years', value: '' }];
for (let i = new Date().getFullYear(); i >= 1900; i--) {
    YEARS.push({ label: i.toString(), value: i.toString() });
}

interface FilterProps {
    visible: boolean;
    onClose: () => void;
    onApply: (filters: FilterState) => void;
    onReset: () => void;
    selectedFilters: FilterState;
    setSelectedFilters: React.Dispatch<React.SetStateAction<FilterState>>;
    type: 'movie' | 'tv';
}

function CinemaFilter({ visible, onClose, onApply, onReset, selectedFilters, setSelectedFilters, type }: FilterProps) {
    const { colors: currentColors, theme } = useTheme();

    const [genres, setGenres] = useState<{ label: string, value: string }[]>([]);
    const [languages, setLanguages] = useState<{ label: string, value: string }[]>([]);
    const [countries, setCountries] = useState<{ label: string, value: string }[]>([]);

    const [pickerVisible, setPickerVisible] = useState(false);
    const [activePicker, setActivePicker] = useState<{ title: string, key: keyof FilterState, options: { label: string, value: string }[] } | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [genreList, langList, countryList] = await Promise.all([
                    getGenres(type),
                    getLanguages(),
                    getCountries()
                ]);

                setGenres([{ label: 'All Genres', value: '' }, ...genreList.map((g: any) => ({ label: g.name, value: g.id.toString() }))]);
                setLanguages([{ label: 'All Languages', value: '' }, ...langList.map((l: any) => ({ label: l.english_name, value: l.iso_639_1 }))]);
                setCountries([{ label: 'All Countries', value: '' }, ...countryList.map((c: any) => ({ label: c.english_name, value: c.iso_3166_1 }))]);
            } catch (error) {
                console.error('Error fetching filter data:', error);
            }
        };
        fetchData();
    }, [type]);

    const openPicker = (title: string, key: keyof FilterState, options: { label: string, value: string }[]) => {
        setActivePicker({ title, key, options });
        setPickerVisible(true);
    };

    const handleSelectOption = (value: string) => {
        if (activePicker) {
            setSelectedFilters(prev => ({ ...prev, [activePicker.key]: value }));
        }
        setPickerVisible(false);
    };

    const handleApply = () => {
        onApply(selectedFilters);
        onClose();
    };

    const Dropdown = ({ title, value, options, pickerKey }: { title: string, value: string, options: { label: string, value: string }[], pickerKey: keyof FilterState }) => {
        // Find the selected option by comparing string values
        const selectedOption = options.find(o => String(o.value) === String(value));

        // Check if this filter is currently active (not default)
        const isDefault = value === '' || (pickerKey === 'sort_by' && value === 'popularity.desc');
        const hasSelection = !isDefault;

        // Determine the label to display
        let displayLabel = '';

        if (selectedOption) {
            displayLabel = selectedOption.label;
        } else if (value === '') {
            if (title === 'GENRE') displayLabel = 'All Genres';
            else if (title === 'YEAR') displayLabel = 'All Years';
            else if (title === 'RATING') displayLabel = 'Any Rating';
            else if (title === 'LANGUAGE') displayLabel = 'All Languages';
            else if (title === 'COUNTRY') displayLabel = 'All Countries';
            else if (title === 'SORT BY') displayLabel = 'Most Popular';
            else displayLabel = 'All';
        } else {
            displayLabel = value;
        }

        return (
            <View style={styles.dropdownWrapper}>
                <Text style={[styles.label, { color: currentColors.textSecondary, opacity: hasSelection ? 1 : 0.6 }]}>
                    {title}
                </Text>
                <TVFocusable
                    style={[
                        styles.dropdown,
                        {
                            backgroundColor: currentColors.card,
                            borderColor: hasSelection ? currentColors.primary : currentColors.border,
                            borderWidth: hasSelection ? 1.5 : 1
                        }
                    ]}
                    onPress={() => openPicker(title, pickerKey, options)}
                >
                    <View style={styles.dropdownInner}>
                        <Text
                            style={[
                                styles.dropdownText,
                                { color: hasSelection ? currentColors.primary : currentColors.text }
                            ]}
                            numberOfLines={1}
                        >
                            {displayLabel}
                        </Text>
                        <MaterialIcons
                            name={hasSelection ? "check-circle" : "keyboard-arrow-down"}
                            size={16}
                            color={hasSelection ? currentColors.primary : currentColors.textSecondary}
                        />
                    </View>
                </TVFocusable>
            </View>
        );
    };

    if (!visible) return null;

    return (
        <View style={[styles.container, { backgroundColor: currentColors.background, borderColor: currentColors.border }]}>
            <View style={styles.grid}>
                <Dropdown title="GENRE" value={selectedFilters.genre} options={genres} pickerKey="genre" />
                <Dropdown title="YEAR" value={selectedFilters.year} options={YEARS} pickerKey="year" />
                <Dropdown title="RATING" value={selectedFilters.rating} options={RATINGS} pickerKey="rating" />
                <Dropdown title="LANGUAGE" value={selectedFilters.language} options={languages} pickerKey="language" />
                <Dropdown title="SORT BY" value={selectedFilters.sort_by} options={SORT_OPTIONS} pickerKey="sort_by" />
                <Dropdown title="COUNTRY" value={selectedFilters.country} options={countries} pickerKey="country" />
            </View>

            <View style={styles.footer}>
                <TouchableOpacity
                    style={[styles.applyBtn]}
                    onPress={handleApply}
                >
                    <LinearGradient
                        colors={[currentColors.primary, currentColors.primary + 'CC']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.applyGradient}
                    >
                        <Text style={styles.applyBtnText}>Apply Filters</Text>
                    </LinearGradient>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.resetBtn, { borderColor: currentColors.border, borderWidth: 1 }]}
                    onPress={() => {
                        setSelectedFilters({
                            genre: '',
                            year: '',
                            rating: '',
                            language: '',
                            sort_by: 'popularity.desc',
                            country: '',
                        });
                        onReset();
                    }}
                >
                    <Text style={[styles.resetBtnText, { color: currentColors.text }]}>Reset Filters</Text>
                </TouchableOpacity>
            </View>

            <Modal
                visible={pickerVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setPickerVisible(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setPickerVisible(false)}
                >
                    {currentColors.isAmoled ? <View style={StyleSheet.absoluteFill} /> : <BlurView intensity={theme === 'light' ? 10 : 30} tint={theme === 'light' ? 'light' : 'dark'} style={StyleSheet.absoluteFill} />}
                    <View style={[styles.pickerContainer, { backgroundColor: currentColors.card, borderColor: currentColors.border }]}>
                        <Text style={[styles.pickerTitle, { color: currentColors.text }]}>{activePicker?.title}</Text>
                        <FlatList
                            data={activePicker?.options || []}
                            keyExtractor={item => item.value}
                            renderItem={({ item }) => (
                                <TVFocusable
                                    style={[
                                        styles.optionItem,
                                        String(selectedFilters[activePicker!.key]) === String(item.value) && { backgroundColor: currentColors.primary + '20' }
                                    ]}
                                    onPress={() => handleSelectOption(item.value)}
                                >
                                    <View style={styles.optionInner}>
                                        <Text style={[
                                            styles.optionText,
                                            { color: String(selectedFilters[activePicker!.key]) === String(item.value) ? currentColors.primary : currentColors.text }
                                        ]}>
                                            {item.label}
                                        </Text>
                                        {String(selectedFilters[activePicker!.key]) === String(item.value) && (
                                            <MaterialIcons name="check" size={20} color={currentColors.primary} />
                                        )}
                                    </View>
                                </TVFocusable>
                            )}
                            style={styles.pickerList}
                        />
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
    container: {
        borderRadius: 24,
        padding: 12,
        marginBottom: 20,
        borderWidth: 1,
        marginHorizontal: 16,
        overflow: 'hidden',
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    dropdownWrapper: {
        width: width > 600 ? '31%' : '48%',
        marginBottom: 8,
    },
    label: {
        fontSize: 9,
        fontWeight: '800',
        marginBottom: 4,
        letterSpacing: 1,
        opacity: 0.6,
        textTransform: 'uppercase',
    },
    dropdown: {
        height: 38,
        borderRadius: 10,
        borderWidth: 1,
    },
    dropdownInner: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 10,
    },
    dropdownText: {
        fontSize: 12,
        fontWeight: '600',
        flex: 1,
    },
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
        gap: 8,
    },
    applyBtn: {
        flex: 1,
        height: 40,
        borderRadius: 10,
        overflow: 'hidden',
    },
    applyGradient: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    applyBtnText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '700',
    },
    resetBtn: {
        flex: 1,
        height: 40,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    resetBtnText: {
        fontSize: 14,
        fontWeight: '700',
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        backgroundColor: 'rgba(0,0,0,0.9)',
    },
    pickerContainer: {
        width: '100%',
        maxWidth: 340,
        maxHeight: '50%',
        borderRadius: 28,
        padding: 20,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
    },
    pickerTitle: {
        fontSize: 16,
        fontWeight: '800',
        marginBottom: 16,
        textAlign: 'center',
        letterSpacing: 1,
    },
    pickerList: {},
    optionItem: {
        borderRadius: 14,
        marginBottom: 4,
    },
    optionInner: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 16,
    },
    optionText: {
        fontSize: 14,
        fontWeight: '500',
    },
});

export default React.memo(CinemaFilter);
