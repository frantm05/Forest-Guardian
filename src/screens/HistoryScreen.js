// src/screens/HistoryScreen.js
import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native'; // Důležité pro reload dat při návratu
import ScreenWrapper from '../components/layout/ScreenWrapper';
import { getHistory, clearHistory } from '../services/storageServices';
import { COLORS, SPACING, RADIUS, TYPOGRAPHY } from '../constants/theme';
import { formatDate, formatConfidence } from '../utils/formatters';

/**
 * Obrazovka se seznamem minulých detekcí.
 */
const HistoryScreen = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  // Načíst data vždy, když uživatel přijde na obrazovku
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    setLoading(true);
    const data = await getHistory();
    setHistory(data);
    setLoading(false);
  };

  const handleDeleteAll = async () => {
    await clearHistory();
    loadData();
  };

  // Komponenta pro jednu položku v seznamu
  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.date}>{formatDate(item.date)}</Text>
        <View style={[
          styles.badge, 
          { backgroundColor: item.severity === 'high' ? COLORS.status.error : COLORS.status.success }
        ]}>
          <Text style={styles.badgeText}>{formatConfidence(item.confidence)}</Text>
        </View>
      </View>
      
      <Text style={styles.title}>{item.label}</Text>
      <Text numberOfLines={2} style={styles.description}>
        {item.description}
      </Text>
    </View>
  );

  return (
    <ScreenWrapper>
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>Nalezené záznamy</Text>
        {history.length > 0 && (
          <TouchableOpacity onPress={handleDeleteAll}>
            <Text style={styles.deleteLink}>Smazat vše</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={history}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadData} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📭</Text>
            <Text style={styles.emptyText}>Zatím zde nejsou žádné záznamy.</Text>
            <Text style={styles.emptySubtext}>Proveďte svou první analýzu v lese.</Text>
          </View>
        }
      />
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.m,
    marginTop: SPACING.s,
  },
  headerTitle: {
    ...TYPOGRAPHY.subHeader,
    color: COLORS.text.primary,
  },
  deleteLink: {
    ...TYPOGRAPHY.caption,
    color: COLORS.status.error,
    fontWeight: 'bold',
  },
  listContent: {
    paddingBottom: SPACING.xl,
  },
  card: {
    backgroundColor: COLORS.surface,
    padding: SPACING.m,
    borderRadius: RADIUS.m,
    marginBottom: SPACING.m,
    // Stíny pro kartu
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
  },
  date: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.secondary,
  },
  badge: {
    paddingHorizontal: SPACING.s,
    paddingVertical: 2,
    borderRadius: RADIUS.s,
  },
  badgeText: {
    color: COLORS.text.inverse,
    fontSize: 12,
    fontWeight: 'bold',
  },
  title: {
    ...TYPOGRAPHY.body,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  description: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.secondary,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.xxl * 2,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: SPACING.m,
  },
  emptyText: {
    ...TYPOGRAPHY.subHeader,
    color: COLORS.text.secondary,
  },
  emptySubtext: {
    ...TYPOGRAPHY.caption,
    marginTop: SPACING.s,
    textAlign: 'center',
  }
});

export default HistoryScreen;