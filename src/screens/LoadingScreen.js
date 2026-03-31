// src/screens/LoadingScreen.js
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, StatusBar, Easing } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

import { SPACING } from '../constants/theme';
import { ROUTES } from '../constants/routes';
import { initModelsWithProgress, areModelsLoaded } from '../services/aiServices';
import { useSettings } from '../context/SettingsContext';
import { t } from '../utils/i18n';

const LoadingScreen = ({ navigation }) => {
  const { settings, colors } = useSettings();
  const lang = settings.language;
  const dark = settings.darkMode;

  const [statusText, setStatusText] = useState(t(lang, 'loadingModels'));
  const [error, setError] = useState(null);

  const fadeIn = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.6)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const ringRotation = useRef(new Animated.Value(0)).current;
  const statusFade = useRef(new Animated.Value(1)).current;
  const dotAnim = useRef(new Animated.Value(0)).current;

  // Entrance
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.spring(logoScale, { toValue: 1, friction: 7, tension: 60, useNativeDriver: true }),
    ]).start();
  }, []);

  // Spinner ring rotation
  useEffect(() => {
    const spin = Animated.loop(
      Animated.timing(ringRotation, {
        toValue: 1,
        duration: 1800,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    spin.start();
    return () => spin.stop();
  }, []);

  // Pulsing dots
  useEffect(() => {
    const dots = Animated.loop(
      Animated.sequence([
        Animated.timing(dotAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(dotAnim, { toValue: 0.3, duration: 600, useNativeDriver: true }),
      ])
    );
    dots.start();
    return () => dots.stop();
  }, []);

  // Crossfade status text
  const updateStatus = (text) => {
    Animated.timing(statusFade, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
      setStatusText(text);
      Animated.timing(statusFade, { toValue: 1, duration: 250, useNativeDriver: true }).start();
    });
  };

  // Load models
  useEffect(() => {
    if (areModelsLoaded()) {
      navigation.replace(ROUTES.HOME);
      return;
    }

    let mounted = true;

    const loadModels = async () => {
      try {
        await initModelsWithProgress(({ step, total, modelName, status }) => {
          if (!mounted) return;

          if (status === 'loading') {
            updateStatus(modelName);
          }

          if (status === 'done') {
            Animated.timing(progressAnim, {
              toValue: step / total,
              duration: 500,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: false,
            }).start();
          }
        });

        if (!mounted) return;

        // Finish animation
        Animated.timing(progressAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: false,
        }).start();
        updateStatus(t(lang, 'loadingReady'));

        setTimeout(() => {
          if (mounted) navigation.replace(ROUTES.HOME);
        }, 600);
      } catch (err) {
        if (mounted) setError(err?.message || t(lang, 'analysisFailed'));
      }
    };

    loadModels();
    return () => { mounted = false; };
  }, []);

  const bg = dark ? '#050A05' : '#F5F6F4';
  const accent = dark ? '#4ADE80' : '#166534';
  const trackBg = dark ? '#1A2E1A' : '#E8F5E9';
  const ringSpin = ringRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });
  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
      <StatusBar barStyle={dark ? 'light-content' : 'dark-content'} backgroundColor={bg} />

      <Animated.View style={[styles.content, { opacity: fadeIn }]}>
        {/* Logo with spinner ring */}
        <Animated.View style={[styles.logoArea, { transform: [{ scale: logoScale }] }]}>
          <View style={styles.ringWrapper}>
            <Animated.View style={[styles.spinnerRing, { borderColor: accent, transform: [{ rotate: ringSpin }] }]} />
            <View style={[styles.logoCircle, { backgroundColor: accent }]}>
              <MaterialCommunityIcons name="pine-tree" size={44} color="white" />
            </View>
          </View>

          <Text style={[styles.appName, { color: colors.text.primary }]}>Forest Guardian</Text>
        </Animated.View>

        {/* Status text */}
        <Animated.Text style={[styles.statusText, { color: colors.text.secondary, opacity: statusFade }]}>
          {statusText}
        </Animated.Text>

        {/* Progress bar */}
        <View style={[styles.progressTrack, { backgroundColor: trackBg }]}>
          <Animated.View style={[styles.progressFill, { width: progressWidth, backgroundColor: accent }]} />
        </View>

        {/* Error */}
        {error && (
          <View style={styles.errorRow}>
            <Ionicons name="alert-circle" size={18} color="#EF4444" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Footer */}
        <Animated.Text style={[styles.footer, { color: colors.text.tertiary || colors.text.secondary, opacity: dotAnim }]}>
          {t(lang, 'loadingFooter')}
        </Animated.Text>
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },

  logoArea: { alignItems: 'center', marginBottom: 40 },
  ringWrapper: {
    width: 110, height: 110,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: SPACING.m,
  },
  spinnerRing: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 55,
    borderWidth: 3,
    borderColor: '#4ADE80',
    borderTopColor: 'transparent',
  },
  logoCircle: {
    width: 88, height: 88, borderRadius: 44,
    justifyContent: 'center', alignItems: 'center',
  },
  appName: { fontSize: 26, fontWeight: '700', letterSpacing: -0.5 },

  statusText: { fontSize: 14, marginBottom: 24, textAlign: 'center' },

  progressTrack: {
    width: '75%', height: 4, borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 2 },

  errorRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginTop: SPACING.l, paddingHorizontal: SPACING.m,
    paddingVertical: SPACING.s, backgroundColor: '#FEF2F2',
    borderRadius: 12,
  },
  errorText: { color: '#EF4444', fontSize: 13, flex: 1 },

  footer: { position: 'absolute', bottom: SPACING.xl, fontSize: 12, textAlign: 'center' },
});

export default LoadingScreen;
