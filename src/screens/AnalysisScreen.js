/**
 * @file AnalysisScreen.js
 * @description Displays AI analysis results — clean, modern layout with
 *              distinct flows for "no pest" (green) and "pest found" (red).
 */
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, Image, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, StatusBar, Modal, Animated,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SPACING } from '../constants/theme';
import { ROUTES } from '../constants/routes';
import { analyzeImage, TREE_TYPES } from '../services/aiServices';
import { saveRecord } from '../services/storageServices';
import { saveImageLocally } from '../services/fileServices';
import { useSettings } from '../context/SettingsContext';
import { t } from '../utils/i18n';
import { getTreeDisplayLabel } from '../utils/formatters';
import styles from './styles/AnalysisScreen.styles';

const AnalysisScreen = ({ route, navigation }) => {
  const { settings, colors } = useSettings();
  const insets = useSafeAreaInsets();
  const lang = settings.language;
  const dark = settings.darkMode;

  const { imageUri, treeType, result: precomputedResult } = route.params || {};

  const [phase, setPhase] = useState(precomputedResult ? 'result' : 'loading');
  const [result, setResult] = useState(precomputedResult || null);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [photoDetailVisible, setPhotoDetailVisible] = useState(false);
  const [maskDetailVisible, setMaskDetailVisible] = useState(false);

  // Photo detail animation
  const detailAnim = useRef(new Animated.Value(0)).current;
  const maskAnim = useRef(new Animated.Value(0)).current;

  const treeObj = TREE_TYPES.find(tt => tt.id === treeType);
  const treeLabel = getTreeDisplayLabel(treeObj, treeType, lang);
  const isInfo = result?.severity === 'info';
  const isCritical = result?.severity === 'critical';

  useEffect(() => {
    if (precomputedResult) return;
    if (!imageUri) {
      setError(t(lang, 'noImageError'));
      setPhase('result');
      return;
    }
    let cancelled = false;
    analyzeImage(imageUri, treeType)
      .then(data => {
        if (cancelled) return;
        if (!data || typeof data.confidence !== 'number') {
          setError(t(lang, 'analysisFailed'));
        } else {
          setResult(data);
        }
        setPhase('result');
      })
      .catch(() => {
        if (cancelled) return;
        setError(t(lang, 'analysisFailed'));
        setPhase('result');
      });
    return () => { cancelled = true; };
  }, [imageUri]);

  const openPhotoDetail = () => {
    setPhotoDetailVisible(true);
    detailAnim.setValue(0);
    Animated.spring(detailAnim, { toValue: 1, useNativeDriver: true, tension: 60, friction: 9 }).start();
  };

  const closePhotoDetail = () => {
    Animated.timing(detailAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
      setPhotoDetailVisible(false);
    });
  };

  const openMaskDetail = () => {
    setMaskDetailVisible(true);
    maskAnim.setValue(0);
    Animated.spring(maskAnim, { toValue: 1, useNativeDriver: true, tension: 60, friction: 9 }).start();
  };

  const closeMaskDetail = () => {
    Animated.timing(maskAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
      setMaskDetailVisible(false);
    });
  };

  const handleSave = async () => {
    if (!result || saving) return;
    try {
      setSaving(true);
      const savedUri = await saveImageLocally(imageUri);
      await saveRecord({ ...result, imageUri: savedUri, treeType });
      Alert.alert(t(lang, 'saved'), t(lang, 'recordSaved'), [
        { text: t(lang, 'ok'), onPress: () => navigation.popToTop() }
      ]);
    } catch (e) {
      Alert.alert(t(lang, 'error'), t(lang, 'saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const bg = colors.background;
  const cardBg = dark ? colors.surface : '#f9fafb';

  // ==========================================
  // LOADING
  // ==========================================
  if (phase === 'loading') {
    return (
      <SafeAreaView style={[styles.loadingContainer, { backgroundColor: bg }]}>
        <StatusBar barStyle={dark ? 'light-content' : 'dark-content'} translucent backgroundColor="transparent" />
        <View style={styles.loadingAnimation}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
        <Text style={[styles.loadingText, { color: colors.text.primary }]}>
          {t(lang, 'analyzing')}
        </Text>
        <Text style={[styles.loadingSub, { color: colors.text.secondary }]}>{t(lang, 'edgeAI')}</Text>
        <View style={styles.loadingSteps}>
          <View style={styles.loadingStep}>
            <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
            <Text style={[styles.loadingStepText, { color: colors.text.secondary }]}>{t(lang, 'preprocessing')}</Text>
          </View>
          <View style={styles.loadingStep}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[styles.loadingStepText, { color: colors.text.secondary }]}>{t(lang, 'inference')}</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ==========================================
  // ERROR
  // ==========================================
  if (error) {
    return (
      <SafeAreaView style={[styles.loadingContainer, { backgroundColor: bg }]}>
        <StatusBar barStyle={dark ? 'light-content' : 'dark-content'} translucent backgroundColor="transparent" />
        <Ionicons name="alert-circle-outline" size={64} color="#ef4444" />
        <Text style={[styles.loadingText, { color: '#ef4444', marginTop: SPACING.m }]}>{t(lang, 'analysisError')}</Text>
        <Text style={[styles.loadingSub, { color: colors.text.secondary }]}>{error}</Text>
        <TouchableOpacity
          style={[styles.primaryBtn, { marginTop: SPACING.l, paddingHorizontal: SPACING.xl, backgroundColor: colors.primary }]}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="camera-outline" size={20} color="white" />
          <Text style={styles.primaryBtnText}>{t(lang, 'tryAgain')}</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (!result) return null;

  // ==========================================
  // NO PEST FOUND — clean green confirmation
  // ==========================================
  if (isInfo) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
        <StatusBar barStyle={dark ? 'light-content' : 'dark-content'} translucent backgroundColor="transparent" />
        <View style={styles.infoContainer}>
          <View style={[styles.infoIconWrap, { backgroundColor: '#dcfce7' }]}>
            <Ionicons name="checkmark-circle" size={56} color="#22c55e" />
          </View>
          <Text style={[styles.infoTitle, { color: colors.text.primary }]}>
            {t(lang, 'noPestFound')}
          </Text>
          <Text style={[styles.infoSub, { color: colors.text.secondary }]}>
            {t(lang, 'noPestFoundDesc')}
          </Text>
          <View style={styles.infoButtons}>
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="camera-outline" size={20} color="white" />
              <Text style={styles.primaryBtnText}>{t(lang, 'newPhoto')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.secondaryBtn, { borderColor: colors.border }]}
              onPress={() => navigation.popToTop()}
            >
              <Ionicons name="home-outline" size={20} color={colors.text.primary} />
              <Text style={[styles.secondaryBtnText, { color: colors.text.primary }]}>{t(lang, 'goHome')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ==========================================
  // PEST FOUND — red alert with details
  // ==========================================
  const confPercent = Math.round((result.confidence || 0) * 100);
  const severityColor = isCritical ? '#ef4444' : '#f59e0b';
  const severityBg = isCritical ? '#fef2f2' : '#fffbeb';
  const severityDarkBg = isCritical ? '#451a1a' : '#452a1a';
  const severityLabel = isCritical
    ? (t(lang, 'criticalAlert') || 'Critical')
    : (t(lang, 'warningAlert') || 'Warning');

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]} edges={['bottom']}>
      <StatusBar barStyle={dark ? 'light-content' : 'dark-content'} translucent backgroundColor="transparent" />
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>

        {/* IMAGE HEADER — tappable for detail */}
        <TouchableOpacity activeOpacity={0.9} onPress={openPhotoDetail}>
          <View style={styles.imageHeader}>
            <Image source={{ uri: imageUri }} style={styles.mainImage} />
            <LinearGradient colors={['transparent', bg]} style={styles.imageGradient} />
            <TouchableOpacity style={[styles.backBtn, { top: insets.top + 8 }]} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            {result?.detections?.length > 0 && result.detections.some(d => d.maskUri) && (
              <TouchableOpacity style={[styles.maskBtn, { top: insets.top + 8 }]} onPress={openMaskDetail}>
                <Ionicons name="layers-outline" size={22} color="white" />
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>

        {/* CONTENT */}
        <View style={[styles.content, { backgroundColor: bg }]}>

          {/* Severity badge */}
          <View style={[styles.statusBadge, { backgroundColor: dark ? severityDarkBg : severityBg }]}>
            <Ionicons
              name={isCritical ? 'warning' : 'alert-circle'}
              size={16}
              color={severityColor}
            />
            <Text style={[styles.statusBadgeText, { color: severityColor }]}>
              {severityLabel}
            </Text>
          </View>

          {/* Title */}
          <View style={styles.titleBlock}>
            <Text style={[styles.h2, { color: colors.text.primary }]}>{result.label}</Text>
            <Text style={[styles.latinName, { color: colors.text.secondary }]}>
              {treeLabel}
            </Text>
          </View>

          {/* Confidence bar */}
          <View style={styles.confidenceRow}>
            <Text style={[styles.confidenceLabel, { color: colors.text.secondary }]}>
              {t(lang, 'yoloConfidence')}
            </Text>
            <Text style={[styles.confidenceValue, { color: severityColor }]}>
              {confPercent}%
            </Text>
          </View>
          <View style={[styles.confidenceBarBg, { backgroundColor: dark ? '#27272a' : '#f4f4f5' }]}>
            <View style={[styles.confidenceBarFill, { width: `${confPercent}%`, backgroundColor: severityColor }]} />
          </View>

          {/* Detection list */}
          {result.detections?.length > 0 && (
            <View style={[styles.detectionCard, { backgroundColor: cardBg }]}>
              <View style={styles.detectionCardHeader}>
                <Ionicons name="bug-outline" size={18} color={severityColor} />
                <Text style={[styles.detectionCardTitle, { color: colors.text.primary }]}>
                  {t(lang, 'detectionDetails')} ({result.detections.length})
                </Text>
              </View>
              {result.detections.map((det, i) => (
                <View
                  key={i}
                  style={[styles.detectionItem, { borderBottomColor: colors.border },
                    i === result.detections.length - 1 && { borderBottomWidth: 0 }]}
                >
                  <View style={styles.detectionItemLeft}>
                    <View style={[styles.detectionDot, { backgroundColor: severityColor }]} />
                    <Text style={[styles.detectionItemName, { color: colors.text.primary }]} numberOfLines={1}>
                      {det.className}
                    </Text>
                  </View>
                  <Text style={[styles.detectionItemConf, { color: severityColor }]}>
                    {Math.round(det.confidence * 100)}%
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* BOTTOM ACTIONS */}
      <View style={[styles.bottomBar, { backgroundColor: bg, borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: colors.primary }, saving && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <>
              <Ionicons name="save-outline" size={20} color="white" />
              <Text style={styles.primaryBtnText}>{t(lang, 'saveRecord')}</Text>
            </>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.secondaryBtn, { borderColor: colors.border }]}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="camera-outline" size={20} color={colors.text.primary} />
          <Text style={[styles.secondaryBtnText, { color: colors.text.primary }]}>{t(lang, 'newPhoto')}</Text>
        </TouchableOpacity>
      </View>

      {/* PHOTO DETAIL OVERLAY */}
      <Modal visible={photoDetailVisible} transparent animationType="none" onRequestClose={closePhotoDetail}>
        <Animated.View style={[styles.overlayBg, { opacity: detailAnim }]}>
          <TouchableOpacity style={[styles.overlayCloseBtn, { top: insets.top + 10 }]} onPress={closePhotoDetail}>
            <Ionicons name="close" size={24} color="white" />
          </TouchableOpacity>
          <Animated.Image
            source={{ uri: imageUri }}
            style={[styles.overlayImage, {
              transform: [
                { scale: detailAnim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) },
              ],
            }]}
            resizeMode="contain"
          />
        </Animated.View>
      </Modal>

      {/* MASK OVERLAY */}
      <Modal visible={maskDetailVisible} transparent animationType="none" onRequestClose={closeMaskDetail}>
        <Animated.View style={[styles.overlayBg, { opacity: maskAnim }]}>
          <TouchableOpacity style={[styles.overlayCloseBtn, { top: insets.top + 10 }]} onPress={closeMaskDetail}>
            <Ionicons name="close" size={24} color="white" />
          </TouchableOpacity>
          <Animated.View style={[styles.overlayImageWrap, {
            transform: [
              { scale: maskAnim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) },
            ],
          }]}>
            <Image source={{ uri: imageUri }} style={styles.overlayImageFill} resizeMode="contain" />
            {result?.detections?.map((det, i) => det.maskUri ? (
              <Image
                key={i}
                source={{ uri: det.maskUri }}
                style={styles.overlayMask}
                resizeMode="contain"
              />
            ) : null)}
          </Animated.View>
          <Text style={styles.overlayLabel}>{t(lang, 'segmentationMask')}</Text>
        </Animated.View>
      </Modal>
    </SafeAreaView>
  );
};

export default AnalysisScreen;
