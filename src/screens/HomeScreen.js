/**
 * @file HomeScreen.js
 * @description Main dashboard screen displaying scan statistics, last detection,
 *              and navigation shortcuts to Camera, History, and Settings.
 */
import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { ROUTES } from '../constants/routes';
import { getHistory } from '../services/storageServices';
import { useSettings } from '../context/SettingsContext';
import { t } from '../utils/i18n';
import { getInitials } from '../utils/formatters';
import styles from './styles/HomeScreen.styles';

const HomeScreen = ({ navigation }) => {
  const { settings, colors } = useSettings();
  const lang = settings.language;
  const dark = settings.darkMode;

  const [totalScans, setTotalScans] = useState(0);
  const [lastScan, setLastScan] = useState(null);


  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      const loadStats = async () => {
        try {
          const history = await getHistory();
          if (isActive) {
            setTotalScans(history.length);
            setLastScan(history.length > 0 ? history[0] : null);
          }
        } catch (e) {
          console.error('Failed to load stats:', e);
        }
      };
      loadStats();
      return () => { isActive = false; };
    }, [])
  );

  const navigateToCamera = useCallback(() => {
    navigation.navigate(ROUTES.CAMERA);
  }, [navigation]);

  const initials = getInitials(settings.name);

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

        {/* STATUS & LAST DETECTION — side by side */}
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

            {lastScan ? (
              <TouchableOpacity 
                style={[styles.statCard, styles.lastDetectionCard, { backgroundColor: cardBg }]}
                activeOpacity={0.7}
                onPress={() => navigation.navigate(ROUTES.HISTORY)}
              >
                <View style={[styles.statIconBadge, { backgroundColor: dark ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.1)' }]}>
                  {lastScan.imageUri ? (
                    <Image source={{ uri: lastScan.imageUri }} style={styles.lastDetectionThumb} />
                  ) : (
                    <Ionicons name="bug-outline" size={24} color="#ef4444" />
                  )}
                </View>
                <View style={styles.statContent}>
                  <Text style={[styles.lastDetectionLabel, { color: textPrimary }]} numberOfLines={2}>
                    {lastScan.label || t(lang, 'unknownFind')}
                  </Text>
                  <Text style={[styles.statLabel, { color: textSecondary }]}>{t(lang, 'lastDetection')}</Text>
                </View>
                <View style={[styles.statDecor, { backgroundColor: dark ? 'rgba(239, 68, 68, 0.12)' : 'rgba(239, 68, 68, 0.08)' }]} />
              </TouchableOpacity>
            ) : (
              <View style={[styles.statCard, { backgroundColor: cardBg, justifyContent: 'center', alignItems: 'center' }]}>
                <Ionicons name="leaf-outline" size={32} color={textSecondary} />
                <Text style={[styles.statLabel, { color: textSecondary, marginTop: 8, textAlign: 'center' }]}>{t(lang, 'lastDetection')}</Text>
              </View>
            )}

          </View>
        </View>

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

export default HomeScreen;