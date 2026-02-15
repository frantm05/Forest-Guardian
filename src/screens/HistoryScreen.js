// src/screens/HistoryScreen.js
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Image, Alert, ActivityIndicator, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { SPACING, RADIUS, SHADOWS } from '../constants/theme';
import { ROUTES } from '../constants/routes';
import { getHistory, deleteRecord, clearHistory } from '../services/storageServices';
import { deleteImage, clearAllImages } from '../services/fileServices';
import { formatDate, formatConfidence } from '../utils/formatters';
import { useSettings } from '../context/SettingsContext';
import { t } from '../utils/i18n';

const HistoryScreen = ({ navigation }) => {
  const { settings, colors } = useSettings();
  const lang = settings.language;
  const dark = settings.darkMode;

  const [filter, setFilter] = useState('all');
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
          console.error('Chyba při načítání historie:', e);
        } finally {
          if (isActive) setLoading(false);
        }
      };
      loadHistory();
      return () => { isActive = false; };
    }, [])
  );

  const filteredItems = items.filter(item => {
    const matchesFilter = filter === 'all' || 
      (filter === 'object' && item.type === 'detection') ||
      (filter === 'segmentation' && item.type === 'segmentation');
    const searchLower = search.toLowerCase();
    const matchesSearch = !search || 
      item.label?.toLowerCase().includes(searchLower) || 
      item.title?.toLowerCase().includes(searchLower) ||
      item.subtitle?.toLowerCase().includes(searchLower);
    return matchesFilter && matchesSearch;
  });

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
            console.error('Chyba při mazání:', e);
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
            console.error('Chyba:', e);
          }
        } 
      }
    ]);
  };

  const getSeverityColor = (severity) => {
    if (severity === 'high') return '#ef4444';
    if (severity === 'medium') return '#eab308';
    return colors.primary;
  };

  const getSeverityBg = (severity) => {
    if (severity === 'high') return dark ? 'rgba(239,68,68,0.15)' : '#FEF2F2';
    if (severity === 'medium') return dark ? 'rgba(234,179,8,0.15)' : '#FFFBEB';
    return dark ? 'rgba(34,197,94,0.15)' : '#F0FDF4';
  };

  const renderItem = ({ item }) => {
    const title = item.label || item.title || t(lang, 'unknownFind');
    const confidence = item.confidence || 0;
    const severity = item.severity || 'low';
    const date = item.date ? formatDate(item.date) : '';
    const imageSource = item.imageUri ? { uri: item.imageUri } : null;

    return (
      <View style={{ marginBottom: 12 }}>
        <TouchableOpacity 
          style={[styles.card, { backgroundColor: cardBg }]}
          activeOpacity={0.7}
          onPress={() => navigation.navigate(ROUTES.ANALYSIS, { 
            imageUri: item.imageUri, 
            mode: item.mode || (item.type === 'detection' ? 'object_detection' : 'segmentation'),
            treeType: item.treeContext || item.treeType || 'unknown',
          })}
        >
          {imageSource ? (
            <Image source={imageSource} style={[styles.cardImage, { backgroundColor: inputBg }]} />
          ) : (
            <View style={[styles.cardImage, styles.cardImagePlaceholder, { backgroundColor: inputBg }]}>
              <Ionicons name="image-outline" size={24} color={colors.text.tertiary} />
            </View>
          )}
          
          <View style={styles.cardContent}>
            <Text style={[styles.cardTitle, { color: colors.text.primary }]} numberOfLines={1}>{title}</Text>
            <Text style={[styles.cardDate, { color: colors.text.secondary }]}>{date}</Text>
            
            <View style={styles.badges}>
              <View style={[styles.badge, { backgroundColor: getSeverityBg(severity) }]}>
                <Text style={[styles.badgeText, { color: getSeverityColor(severity) }]}>
                  {formatConfidence(confidence)} {t(lang, 'match')}
                </Text>
              </View>
              <View style={[styles.badge, { backgroundColor: getSeverityBg(severity) }]}>
                <Text style={[styles.badgeText, { color: getSeverityColor(severity) }]}>
                  {severity === 'high' ? t(lang, 'critical') : severity === 'medium' ? t(lang, 'warning') : t(lang, 'ok')}
                </Text>
              </View>
            </View>
          </View>
          
          <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item)}>
            <Ionicons name="trash-outline" size={20} color={colors.text.secondary} />
          </TouchableOpacity>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
      <StatusBar barStyle={dark ? 'light-content' : 'dark-content'} />
      {/* Header */}
      <View style={[styles.header, { backgroundColor: cardBg, borderBottomColor: dark ? colors.border : '#F4F4F5' }]}>
        <View style={styles.headerTop}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backButton, { backgroundColor: inputBg }]}>
              <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.text.primary }]}>{t(lang, 'history')}</Text>
          </View>
          <TouchableOpacity style={[styles.iconBtn, { backgroundColor: inputBg }]} onPress={handleClearAll}>
            <Ionicons name="trash-outline" size={20} color={colors.text.secondary} />
          </TouchableOpacity>
        </View>

        <View style={[styles.searchContainer, { backgroundColor: inputBg }]}>
          <Ionicons name="search-outline" size={18} color={colors.text.secondary} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: colors.text.primary }]}
            placeholder={t(lang, 'searchPlaceholder')}
            value={search}
            onChangeText={setSearch}
            placeholderTextColor={colors.text.secondary}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={colors.text.secondary} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.filterRow}>
          {['all', 'object', 'segmentation'].map((f) => (
            <TouchableOpacity
              key={f}
              onPress={() => setFilter(f)}
              style={[
                styles.filterChip,
                filter === f 
                  ? { backgroundColor: dark ? colors.primary : '#1E3D28', borderColor: dark ? colors.primary : '#1E3D28' } 
                  : { backgroundColor: inputBg, borderColor: inputBg }
              ]}
            >
              <Text style={[
                styles.filterText,
                filter === f ? { color: 'white' } : { color: colors.text.secondary }
              ]}>
                {f === 'object' ? t(lang, 'pests') : f === 'segmentation' ? t(lang, 'damage') : t(lang, 'all')}
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
        <FlatList
          data={filteredItems}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="leaf-outline" size={48} color={colors.text.secondary} style={{ marginBottom: SPACING.m }} />
              <Text style={{ fontSize: 20, fontWeight: '600', color: colors.text.primary, marginBottom: SPACING.s }}>{t(lang, 'noRecords')}</Text>
              <Text style={{ color: colors.text.secondary, textAlign: 'center' }}>
                {search ? t(lang, 'noSearchResults') : t(lang, 'startScanning')}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 24, paddingBottom: 16, paddingTop: 16, borderBottomWidth: 1 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  headerTitle: { fontSize: 20, fontWeight: 'bold' },
  backButton: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  iconBtn: { padding: 8, borderRadius: 20 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', borderRadius: RADIUS.m, paddingHorizontal: 12, marginBottom: 16 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 14 },
  filterRow: { flexDirection: 'row', gap: 8 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: RADIUS.full, borderWidth: 1 },
  filterText: { fontSize: 12, fontWeight: '500' },
  listContent: { padding: 16, paddingBottom: 40, flexGrow: 1 },
  card: { flexDirection: 'row', padding: 12, borderRadius: RADIUS.l, ...SHADOWS.sm, alignItems: 'center', gap: 12 },
  cardImage: { width: 64, height: 64, borderRadius: RADIUS.m },
  cardImagePlaceholder: { justifyContent: 'center', alignItems: 'center' },
  cardContent: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '600', marginRight: 8 },
  cardDate: { fontSize: 11, marginBottom: 6 },
  badges: { flexDirection: 'row', gap: 6 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  badgeText: { fontSize: 10, fontWeight: '600' },
  deleteBtn: { padding: 8 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 80, paddingHorizontal: SPACING.xl },
});

export default HistoryScreen;