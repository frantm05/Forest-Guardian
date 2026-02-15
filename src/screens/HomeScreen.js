// src/screens/HomeScreen.js
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { SPACING, RADIUS, SHADOWS } from '../constants/theme';
import { ROUTES } from '../constants/routes';
import { getHistory } from '../services/storageServices';
import { useSettings } from '../context/SettingsContext';
import { t } from '../utils/i18n';

const HomeScreen = ({ navigation }) => {
  const { settings, colors } = useSettings();
  const lang = settings.language;
  const dark = settings.darkMode;

  const [totalScans, setTotalScans] = useState(0);
  const [issuesCount, setIssuesCount] = useState(0);
  const [lastScan, setLastScan] = useState(null);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      const loadStats = async () => {
        try {
          const history = await getHistory();
          if (isActive) {
            setTotalScans(history.length);
            const issues = history.filter(h => h.severity === 'high' || h.severity === 'medium');
            setIssuesCount(issues.length);
            setLastScan(history.length > 0 ? history[0] : null);
          }
        } catch (e) {
          console.error('Chyba při načítání statistik:', e);
        }
      };
      loadStats();
      return () => { isActive = false; };
    }, [])
  );

  const navigateToCamera = useCallback(() => {
    navigation.navigate(ROUTES.CAMERA);
  }, [navigation]);

  const initials = settings.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase();

  const getSeverityLabel = (severity) => {
    if (severity === 'high') return t(lang, 'highRisk');
    if (severity === 'medium') return t(lang, 'mediumRisk');
    return t(lang, 'lowRisk');
  };

  const bg = dark ? colors.background : '#F5F6F4';
  const cardBg = dark ? colors.surface : 'white';
  const textPrimary = colors.text.primary;
  const textSecondary = colors.text.secondary;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>  
      <StatusBar barStyle={dark ? 'light-content' : 'dark-content'} backgroundColor={bg} />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* HEADER */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.captionText, { color: textSecondary }]}>{t(lang, 'welcomeBack')}</Text>
            <Text style={[styles.h2Text, { color: textPrimary }]}>Forest Guardian</Text>
          </View>
          <TouchableOpacity 
            style={[styles.profileButton, { borderColor: cardBg }]}
            onPress={() => navigation.navigate(ROUTES.SETTINGS)}
          >
            {settings.avatarUri ? (
              <Image source={{ uri: settings.avatarUri }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: colors.primary }]}>
                <Text style={styles.avatarInitials}>{initials}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* HERO CARD */}
        <TouchableOpacity 
          activeOpacity={0.85}
          onPress={navigateToCamera}
          style={[styles.heroContainer, { backgroundColor: dark ? '#14532d' : '#166534' }]}
        >
          <View style={styles.heroBackground}>
            <View style={styles.heroImageWrapper}>
              <Image 
                source={{ uri: 'https://images.unsplash.com/photo-1585644013005-a8028ecd0bb6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmb3Jlc3QlMjBuYXR1cmUlMjBsYW5kc2NhcGUlMjBhZXJpYWx8ZW58MXx8fHwxNzcxMDk4MDI4fDA&ixlib=rb-4.1.0&q=80&w=1080' }}
                style={styles.heroImage}
              />
              <LinearGradient
                colors={[dark ? '#14532d' : '#166534', dark ? '#14532d' : '#166534', 'rgba(22, 101, 52, 0)']}
                locations={[0, 0.35, 1]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.heroGradient}
              />
            </View>
          </View>

          <View style={styles.heroContent}>
            <View>
              <Text style={styles.heroTitle}>{t(lang, 'newInspection')}</Text>
              <Text style={styles.heroSubtitle}>{t(lang, 'startDetection')}</Text>
            </View>
            
            <View style={[styles.heroBtn, { backgroundColor: cardBg }]}>
              <Ionicons name="camera-outline" size={20} color={colors.primary} />
              <Text style={[styles.heroBtnText, { color: colors.primary }]}>{t(lang, 'startCamera')}</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* STATUS SECTION */}
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionTitle, { color: textPrimary }]}>{t(lang, 'currentStatus')}</Text>
          <View style={styles.statsGrid}>
            
            <View style={[styles.statCard, { backgroundColor: cardBg }]}>
              <View style={[styles.statIconBadge, { backgroundColor: dark ? 'rgba(76, 175, 80, 0.2)' : 'rgba(76, 175, 80, 0.1)' }]}>
                <MaterialCommunityIcons name="leaf" size={24} color="#4CAF50" />
              </View>
              <View style={styles.statContent}>
                <Text style={[styles.statNumber, { color: textPrimary }]}>{totalScans}</Text>
                <Text style={[styles.statLabel, { color: textSecondary }]}>{t(lang, 'totalScans')}</Text>
              </View>
              <View style={[styles.statDecor, { backgroundColor: dark ? 'rgba(76, 175, 80, 0.15)' : 'rgba(76, 175, 80, 0.1)' }]} />
            </View>

            <View style={[styles.statCard, { backgroundColor: cardBg }]}>
              <View style={[styles.statIconBadge, { backgroundColor: dark ? 'rgba(255, 152, 0, 0.2)' : 'rgba(255, 152, 0, 0.1)' }]}>
                <Ionicons name="warning-outline" size={24} color="#FF9800" />
              </View>
              <View style={styles.statContent}>
                <Text style={[styles.statNumber, { color: textPrimary }]}>{issuesCount}</Text>
                <Text style={[styles.statLabel, { color: textSecondary }]}>{t(lang, 'issuesFound')}</Text>
              </View>
              <View style={[styles.statDecor, { backgroundColor: dark ? 'rgba(255, 152, 0, 0.15)' : 'rgba(255, 152, 0, 0.1)' }]} />
            </View>

          </View>
        </View>

        {/* LAST SCAN PREVIEW */}
        {lastScan && (
          <View style={styles.sectionContainer}>
            <Text style={[styles.sectionTitle, { color: textPrimary }]}>{t(lang, 'lastDetection')}</Text>
            <TouchableOpacity 
              style={[styles.lastScanCard, { backgroundColor: cardBg }]}
              activeOpacity={0.7}
              onPress={() => navigation.navigate(ROUTES.HISTORY)}
            >
              {lastScan.imageUri ? (
                <Image source={{ uri: lastScan.imageUri }} style={styles.lastScanImage} />
              ) : (
                <View style={[styles.lastScanImage, { justifyContent: 'center', alignItems: 'center', backgroundColor: dark ? colors.secondary : '#F4F4F5' }]}>
                  <Ionicons name="image-outline" size={20} color={colors.text.tertiary} />
                </View>
              )}
              <View style={styles.lastScanContent}>
                <Text style={[styles.lastScanTitle, { color: textPrimary }]} numberOfLines={1}>
                  {lastScan.label || t(lang, 'unknownFind')}
                </Text>
                <Text style={[styles.lastScanSub, { color: textSecondary }]}>
                  {getSeverityLabel(lastScan.severity)}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={textSecondary} />
            </TouchableOpacity>
          </View>
        )}

        {/* QUICK ACTIONS */}
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionTitle, { color: textPrimary }]}>{t(lang, 'quickActions')}</Text>
          <View style={styles.actionsList}>
            
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: cardBg }]}
              onPress={() => navigation.navigate(ROUTES.HISTORY)}
            >
              <View style={styles.actionLeft}>
                <View style={[styles.actionIconBox, { backgroundColor: dark ? 'rgba(37, 99, 235, 0.15)' : '#EFF6FF' }]}> 
                  <MaterialCommunityIcons name="clock-outline" size={24} color="#2563EB" /> 
                </View>
                <View>
                  <Text style={[styles.actionTitle, { color: textPrimary }]}>{t(lang, 'history')}</Text>
                  <Text style={[styles.actionSubtitle, { color: textSecondary }]}>{t(lang, 'showPastInspections')}</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: cardBg }]}
              onPress={() => navigation.navigate(ROUTES.SETTINGS)}
            >
              <View style={styles.actionLeft}>
                <View style={[styles.actionIconBox, { backgroundColor: dark ? 'rgba(147, 51, 234, 0.15)' : '#FAF5FF' }]}>
                  <Ionicons name="settings-outline" size={24} color="#9333EA" />
                </View>
                <View>
                  <Text style={[styles.actionTitle, { color: textPrimary }]}>{t(lang, 'settings')}</Text>
                  <Text style={[styles.actionSubtitle, { color: textSecondary }]}>{t(lang, 'appConfig')}</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={textSecondary} />
            </TouchableOpacity>

          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: SPACING.l, paddingBottom: 40 },

  captionText: { fontSize: 12 },
  h2Text: { fontSize: 24, fontWeight: '600', letterSpacing: -0.5 },
  
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: SPACING.l,
    paddingTop: SPACING.s 
  },
  profileButton: { 
    ...SHADOWS.sm, 
    borderRadius: RADIUS.full,
    borderWidth: 2,
  },
  avatar: { 
    width: 44, 
    height: 44, 
    borderRadius: RADIUS.full, 
  },
  avatarFallback: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },

  heroContainer: {
    height: 180,
    borderRadius: 24,
    marginBottom: SPACING.l,
    overflow: 'hidden',
    position: 'relative',
    ...SHADOWS.md,
  },
  heroBackground: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
  },
  heroImageWrapper: {
    flex: 1,
    position: 'relative',
  },
  heroImage: {
    position: 'absolute',
    right: 0,
    top: 0,
    width: '60%',
    height: '100%',
    opacity: 0.6,
    resizeMode: 'cover',
  },
  heroGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  heroContent: {
    flex: 1,
    padding: SPACING.l,
    justifyContent: 'space-between',
    zIndex: 10,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: 'white',
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  heroBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: RADIUS.m,
    gap: 8,
  },
  heroBtnText: {
    fontWeight: '600',
    fontSize: 14,
  },

  sectionContainer: {
    marginBottom: SPACING.l,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: SPACING.m,
  },

  statsGrid: {
    flexDirection: 'row',
    gap: SPACING.m,
  },
  statCard: {
    flex: 1,
    borderRadius: RADIUS.l,
    padding: SPACING.m,
    height: 140,
    justifyContent: 'space-between',
    position: 'relative',
    overflow: 'hidden',
    ...SHADOWS.sm,
  },
  statIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.s,
  },
  statContent: {
    zIndex: 1,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  statDecor: {
    position: 'absolute',
    top: -10,
    right: -10,
    width: 80,
    height: 80,
    borderRadius: 40,
  },

  lastScanCard: {
    flexDirection: 'row',
    padding: SPACING.m,
    borderRadius: RADIUS.l,
    alignItems: 'center',
    gap: SPACING.m,
    ...SHADOWS.sm,
  },
  lastScanImage: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.m,
    backgroundColor: '#F4F4F5',
  },
  lastScanContent: { flex: 1 },
  lastScanTitle: { fontSize: 16, fontWeight: '600' },
  lastScanSub: { fontSize: 12, marginTop: 2 },

  actionsList: {
    gap: SPACING.m,
  },
  actionButton: {
    padding: SPACING.m,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...SHADOWS.sm,
  },
  actionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.m,
  },
  actionIconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  actionSubtitle: {
    fontSize: 13,
  },
});

export default HomeScreen;