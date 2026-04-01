/**
 * @file HistoryScreen.js
 * @description Browse, search, and filter past detection records grouped by day
 *              with severity indicators, confidence badges, and date-based filtering.
 */
import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, SectionList, TouchableOpacity, TextInput,
  Image, Alert, ActivityIndicator, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { SPACING } from '../constants/theme';
import { ROUTES } from '../constants/routes';
import { getHistory, deleteRecord, clearHistory } from '../services/storageServices';
import { deleteImage, clearAllImages } from '../services/fileServices';
import { formatDate, groupByDay } from '../utils/formatters';
import { useSettings } from '../context/SettingsContext';
import { t } from '../utils/i18n';
import styles from './styles/HistoryScreen.styles';

// Date filter helpers
const isToday = (d) => {
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
};
const isThisWeek = (d) => {
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1));
  startOfWeek.setHours(0, 0, 0, 0);
  return d >= startOfWeek;
};
const isThisMonth = (d) => {
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
};

const HistoryScreen = ({ navigation }) => {
  const { settings, colors } = useSettings();
  const lang = settings.language;
  const dark = settings.darkMode;

  const [dateFilter, setDateFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const bg = dark ? colors.background : '#F5F6F4';
  const cardBg = dark ? colors.surface : 'white';
  const inputBg = dark ? colors.secondary : '#F4F4F5';

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      const loadHistory = async () => {
        setLoading(true);
        try {
          const history = await getHistory();
          if (isActive) setItems(history);
        } catch (e) {
          console.error('Failed to load history:', e);
        } finally {
          if (isActive) setLoading(false);
        }
      };
      loadHistory();
      return () => { isActive = false; };
    }, [])
  );

  // Filter + search → grouped sections
  const sections = useMemo(() => {
    const filtered = items.filter(item => {
      // Date filter
      if (dateFilter !== 'all') {
        if (!item.date) return false;
        const d = new Date(item.date);
        if (dateFilter === 'today' && !isToday(d)) return false;
        if (dateFilter === 'week' && !isThisWeek(d)) return false;
        if (dateFilter === 'month' && !isThisMonth(d)) return false;
      }
      // Text search
      if (search) {
        const q = search.toLowerCase();
        const matchLabel = item.label?.toLowerCase().includes(q);
        const matchTitle = item.title?.toLowerCase().includes(q);
        const matchDate = item.date ? formatDate(item.date).toLowerCase().includes(q) : false;
        if (!matchLabel && !matchTitle && !matchDate) return false;
      }
      return true;
    });

    return groupByDay(filtered, lang);
  }, [items, dateFilter, search, lang]);

  const totalCount = useMemo(() => sections.reduce((sum, s) => sum + s.data.length, 0), [sections]);

  const handleDelete = (item) => {
    Alert.alert(t(lang, 'deleteRecord'), t(lang, 'deleteRecordConfirm'), [
      { text: t(lang, 'cancel'), style: 'cancel' },
      {
        text: t(lang, 'delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            if (item.imageUri) await deleteImage(item.imageUri);
            await deleteRecord(item.id);
            setItems(prev => prev.filter(i => i.id !== item.id));
          } catch (e) {
            console.error('Failed to delete record:', e);
          }
        }
      }
    ]);
  };

  const handleClearAll = () => {
    if (items.length === 0) return;
    Alert.alert(t(lang, 'deleteAll'), t(lang, 'deleteAllConfirm'), [
      { text: t(lang, 'cancel'), style: 'cancel' },
      {
        text: t(lang, 'deleteAll'),
        style: 'destructive',
        onPress: async () => {
          try {
            await clearAllImages();
            await clearHistory();
            setItems([]);
          } catch (e) {
            console.error('Failed to clear history:', e);
          }
        }
      }
    ]);
  };

  const getSeverityColor = (item) => {
    if (item.severity === 'critical') return '#ef4444';
    if (item.severity === 'warning') return '#f59e0b';
    return '#22c55e';
  };

  const renderSectionHeader = ({ section }) => (
    <View style={[styles.sectionHeader, { backgroundColor: bg }]}>
      <Text style={[styles.sectionTitle, { color: colors.text.secondary }]}>
        {section.title}
      </Text>
      <Text style={[styles.sectionCount, { color: colors.text.tertiary }]}>
        {section.data.length}
      </Text>
    </View>
  );

  const renderItem = ({ item }) => {
    const isInfo = item.severity === 'info';
    const sevColor = getSeverityColor(item);
    const confPercent = item.confidence ? Math.round(item.confidence * 100) : null;
    const detCount = item.detections?.length || 0;
    const date = item.date ? formatDate(item.date) : '';
    const imageSource = item.imageUri ? { uri: item.imageUri } : null;

    // Short title: for info show translated "no pest", for pests show just severity label
    const rawTitle = item.label || item.title || t(lang, 'unknownFind');
    const title = rawTitle === 'noPestFound' ? t(lang, 'noPestFound') : rawTitle;

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: cardBg }]}
        activeOpacity={0.7}
        onPress={() => navigation.navigate(ROUTES.ANALYSIS, {
          imageUri: item.imageUri,
          treeType: item.treeContext || item.treeType || 'unknown',
          result: item,
        })}
      >
        {/* Severity stripe */}
        <View style={[styles.severityStripe, { backgroundColor: sevColor }]} />

        {imageSource ? (
          <Image source={imageSource} style={[styles.cardImage, { backgroundColor: inputBg }]} />
        ) : (
          <View style={[styles.cardImage, styles.cardImagePlaceholder, { backgroundColor: inputBg }]}>
            <Ionicons name="image-outline" size={22} color={colors.text.tertiary} />
          </View>
        )}

        <View style={styles.cardContent}>
          <View style={styles.cardTopRow}>
            <Text style={[styles.cardTitle, { color: colors.text.primary }]} numberOfLines={1}>
              {title}
            </Text>
            {confPercent !== null && !isInfo && (
              <View style={[styles.confBadge, { backgroundColor: sevColor + '18' }]}>
                <Text style={[styles.confBadgeText, { color: sevColor }]}>{confPercent}%</Text>
              </View>
            )}
          </View>
          <View style={styles.cardBottomRow}>
            <Text style={[styles.cardDate, { color: colors.text.tertiary }]}>{date}</Text>
            {detCount > 1 && (
              <View style={styles.detCountWrap}>
                <Ionicons name="layers-outline" size={12} color={colors.text.tertiary} />
                <Text style={[styles.detCountText, { color: colors.text.tertiary }]}>{detCount}</Text>
              </View>
            )}
          </View>
        </View>

        <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="trash-outline" size={18} color={colors.text.tertiary} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const dateFilters = [
    { key: 'all', label: t(lang, 'all') },
    { key: 'today', label: t(lang, 'filterToday') },
    { key: 'week', label: t(lang, 'filterWeek') },
    { key: 'month', label: t(lang, 'filterMonth') },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
      <StatusBar barStyle={dark ? 'light-content' : 'dark-content'} translucent backgroundColor="transparent" />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: cardBg, borderBottomColor: dark ? colors.border : '#e4e4e7' }]}>
        <View style={styles.headerTop}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backButton, { backgroundColor: inputBg }]}>
              <Ionicons name="arrow-back" size={22} color={colors.text.primary} />
            </TouchableOpacity>
            <View>
              <Text style={[styles.headerTitle, { color: colors.text.primary }]}>{t(lang, 'history')}</Text>
              <Text style={[styles.headerSubtitle, { color: colors.text.tertiary }]}>
                {items.length} {t(lang, 'recordCount')}
              </Text>
            </View>
          </View>
          <TouchableOpacity style={[styles.iconBtn, { backgroundColor: inputBg }]} onPress={handleClearAll}>
            <Ionicons name="trash-outline" size={18} color={colors.text.secondary} />
          </TouchableOpacity>
        </View>

        <View style={[styles.searchContainer, { backgroundColor: inputBg }]}>
          <Ionicons name="search-outline" size={16} color={colors.text.tertiary} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: colors.text.primary }]}
            placeholder={t(lang, 'searchPlaceholder')}
            value={search}
            onChangeText={setSearch}
            placeholderTextColor={colors.text.tertiary}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color={colors.text.tertiary} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.filterRow}>
          {dateFilters.map((f) => (
            <TouchableOpacity
              key={f.key}
              onPress={() => setDateFilter(f.key)}
              style={[
                styles.filterChip,
                dateFilter === f.key
                  ? { backgroundColor: dark ? colors.primary : '#1E3D28', borderColor: dark ? colors.primary : '#1E3D28' }
                  : { backgroundColor: inputBg, borderColor: inputBg }
              ]}
            >
              <Text style={[
                styles.filterText,
                dateFilter === f.key ? { color: 'white' } : { color: colors.text.secondary }
              ]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {loading ? (
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ color: colors.text.secondary, marginTop: SPACING.m }}>{t(lang, 'loadingHistory')}</Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          extraData={dateFilter + search}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="leaf-outline" size={48} color={colors.text.tertiary} style={{ marginBottom: SPACING.m }} />
              <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>{t(lang, 'noRecords')}</Text>
              <Text style={[styles.emptySub, { color: colors.text.secondary }]}>
                {search || dateFilter !== 'all' ? t(lang, 'noSearchResults') : t(lang, 'startScanning')}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

export default HistoryScreen;