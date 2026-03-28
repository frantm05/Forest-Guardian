// src/screens/AnalysisScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, Image, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { SPACING, RADIUS, SHADOWS } from '../constants/theme';
import { detectPestRegion, classifyPestRegion, TREE_TYPES } from '../services/aiServices';
import { saveRecord } from '../services/storageServices';
import { saveImageLocally } from '../services/fileServices';
import { formatConfidence } from '../utils/formatters';
import { useSettings } from '../context/SettingsContext';
import { t } from '../utils/i18n';

const OVERLAY_COLOR = 'rgba(34, 197, 94, 0.35)';
const OVERLAY_BORDER = '#22c55e';

const AnalysisScreen = ({ route, navigation }) => {
  const { settings, colors } = useSettings();
  const lang = settings.language;
  const dark = settings.darkMode;

  const { imageUri, treeType } = route.params || {};

  // Fáze pipeline: 'detecting' → 'confirm' → 'classifying' → 'result'
  const [phase, setPhase] = useState('detecting');
  const [detection, setDetection] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [imageSize, setImageSize] = useState(null);

  const treeObj = TREE_TYPES.find(tt => tt.id === treeType);
  const treeLabel = treeObj ? t(lang, treeObj.labelKey) : (treeType || t(lang, 'treeUnknown'));
  const normalizedSeverity = result?.severity === 'critical'
    ? 'high'
    : result?.severity === 'warning'
      ? 'medium'
      : result?.severity;

  // FÁZE 1: YOLO detekce
  useEffect(() => {
    if (!imageUri) {
      setError(t(lang, 'noImageError'));
      setPhase('result');
      return;
    }

    let cancelled = false;

    detectPestRegion(imageUri)
      .then(data => {
        if (cancelled) return;
        if (!data) {
          setError(t(lang, 'analysisFailed'));
          setPhase('result');
          return;
        }
        setDetection(data);
        if (data.detected) {
          // Ukážeme oblast a čekáme na potvrzení
          setPhase('confirm');
        } else {
          // Žádný požerek → rovnou výsledek
          setResult({
            type: 'segmentation',
            confidence: 1.0 - data.confidence,
            label: 'Zdravé dřevo / Neznámé',
            severity: 'info',
            recommendation: t(lang, 'noDetectionHint'),
            treeContext: treeType
          });
          setPhase('result');
        }
      })
      .catch(e => {
        if (cancelled) return;
        console.error('Chyba při detekci:', e);
        setError(t(lang, 'analysisFailed'));
        setPhase('result');
      });

    return () => { cancelled = true; };
  }, [imageUri]);

  // Spuštění klasifikace po potvrzení oblasti
  const runClassification = async () => {
    if (!detection?.region) return;
    setPhase('classifying');

    try {
      const data = await classifyPestRegion(imageUri, detection.region, treeType);
      if (!data || typeof data.confidence !== 'number') {
        setError(t(lang, 'analysisFailed'));
        setPhase('result');
        return;
      }
      setResult(data);
      setPhase('result');
    } catch (e) {
      console.error('Chyba při klasifikaci:', e);
      setError(t(lang, 'analysisFailed'));
      setPhase('result');
    }
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
      console.error('Chyba při ukládání záznamu:', e);
      Alert.alert(t(lang, 'error'), t(lang, 'saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const bg = colors.background;
  const cardBg = dark ? colors.surface : '#f9fafb';

  // ==========================================
  // LOADING – detekce nebo klasifikace
  // ==========================================
  if (phase === 'detecting' || phase === 'classifying') {
    const isDetecting = phase === 'detecting';
    return (
      <SafeAreaView style={[styles.loadingContainer, { backgroundColor: bg }]}>
        <StatusBar barStyle={dark ? 'light-content' : 'dark-content'} />
        <View style={styles.loadingAnimation}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
        <Text style={[styles.loadingText, { color: colors.text.primary }]}>
          {isDetecting ? t(lang, 'analyzing') : t(lang, 'classifying')}
        </Text>
        <Text style={[styles.loadingSub, { color: colors.text.secondary }]}>{t(lang, 'edgeAI')}</Text>
        <View style={styles.loadingSteps}>
          <View style={styles.loadingStep}>
            <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
            <Text style={[styles.loadingStepText, { color: colors.text.secondary }]}>{t(lang, 'preprocessing')}</Text>
          </View>
          <View style={styles.loadingStep}>
            {isDetecting ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
            )}
            <Text style={[styles.loadingStepText, { color: colors.text.secondary }]}>{t(lang, 'yoloDetection')}</Text>
          </View>
          {!isDetecting && (
            <View style={styles.loadingStep}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[styles.loadingStepText, { color: colors.text.secondary }]}>{t(lang, 'inference')}</Text>
            </View>
          )}
        </View>
      </SafeAreaView>
    );
  }

  // ==========================================
  // POTVRZENÍ DETEKCE – zobrazení bounding boxu
  // ==========================================
  if (phase === 'confirm' && detection?.region) {
    const region = detection.region;
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
        <StatusBar barStyle={dark ? 'light-content' : 'dark-content'} />
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

          {/* Obrázek s overlay bounding boxem */}
          <View style={styles.imageHeader}>
            <Image
              source={{ uri: imageUri }}
              style={styles.mainImage}
              onLayout={(e) => setImageSize({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}
            />
            {imageSize && (
              <View
                style={[
                  styles.regionOverlay,
                  {
                    left: region.relX * imageSize.width,
                    top: region.relY * imageSize.height,
                    width: region.relW * imageSize.width,
                    height: region.relH * imageSize.height,
                  },
                ]}
              />
            )}
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <View style={styles.badgeContainer}>
              <View style={[styles.badge, { backgroundColor: colors.primaryLight }]}>
                <Text style={styles.badgeText}>
                  {t(lang, 'yoloConfidence')}: {(detection.confidence * 100).toFixed(0)}%
                </Text>
              </View>
            </View>
          </View>

          <View style={[styles.content, { backgroundColor: bg }]}>
            <Text style={[styles.h2, { color: colors.text.primary }]}>{t(lang, 'regionDetected')}</Text>
            <Text style={[styles.latinName, { color: colors.text.secondary }]}>
              {t(lang, 'regionDetectedDesc')}
            </Text>

            <View style={[styles.alertCard, { borderColor: colors.primary, backgroundColor: cardBg }]}>
              <MaterialCommunityIcons name="crop" size={24} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.alertTitle, { color: colors.primary }]}>{t(lang, 'detectedArea')}</Text>
                <Text style={[styles.alertBody, { color: colors.text.secondary }]}>
                  {t(lang, 'detectedAreaHint')}
                </Text>
              </View>
            </View>

            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
                onPress={runClassification}
              >
                <Text style={styles.primaryBtnText}>{t(lang, 'confirmAndClassify')}</Text>
                <Ionicons name="sparkles" size={20} color="white" />
              </TouchableOpacity>

              <TouchableOpacity style={[styles.secondaryBtn, { borderColor: colors.border }]} onPress={() => navigation.goBack()}>
                <Text style={[styles.secondaryBtnText, { color: colors.text.primary }]}>{t(lang, 'retakePhoto')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ==========================================
  // CHYBOVÝ STAV
  // ==========================================
  if (error) {
    return (
      <SafeAreaView style={[styles.loadingContainer, { backgroundColor: bg }]}>
        <StatusBar barStyle={dark ? 'light-content' : 'dark-content'} />
        <Ionicons name="alert-circle-outline" size={64} color={colors.destructive || '#ef4444'} />
        <Text style={[styles.loadingText, { color: '#ef4444' }]}>{t(lang, 'analysisError')}</Text>
        <Text style={[styles.loadingSub, { color: colors.text.secondary }]}>{error}</Text>
        <TouchableOpacity style={[styles.primaryBtn, { marginTop: SPACING.l, width: 'auto', paddingHorizontal: SPACING.xl, backgroundColor: colors.primary }]} onPress={() => navigation.goBack()}>
          <Ionicons name="camera-outline" size={20} color="white" />
          <Text style={styles.primaryBtnText}>{t(lang, 'tryAgain')}</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // ==========================================
  // VÝSLEDEK KLASIFIKACE
  // ==========================================
  if (!result) return null;

  const isDanger = normalizedSeverity === 'high';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
      <StatusBar barStyle={dark ? 'light-content' : 'dark-content'} />
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        
        {/* IMAGE HEADER */}
        <View style={styles.imageHeader}>
          <Image
            source={{ uri: imageUri }}
            style={styles.mainImage}
            onLayout={(e) => setImageSize({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}
          />
          {detection?.region && imageSize && (
            <View
              style={[
                styles.regionOverlay,
                {
                  left: detection.region.relX * imageSize.width,
                  top: detection.region.relY * imageSize.height,
                  width: detection.region.relW * imageSize.width,
                  height: detection.region.relH * imageSize.height,
                },
              ]}
            />
          )}
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <View style={styles.badgeContainer}>
             <View style={[styles.badge, { backgroundColor: isDanger ? '#ef4444' : colors.primaryLight }]}>
               <Text style={styles.badgeText}>{formatConfidence(result.confidence)} {t(lang, 'match')}</Text>
             </View>
          </View>
        </View>

        {/* CONTENT */}
        <View style={[styles.content, { backgroundColor: bg }]}>
          <Text style={[styles.h2, { color: colors.text.primary }]}>{result.label}</Text>
          <Text style={[styles.latinName, { color: colors.text.secondary }]}>
            {result.treeContext === 'spruce' ? 'Ips typographus' : 
             result.treeContext === 'pine' ? 'Hylobius abietis' : t(lang, 'unknownAgent')}
          </Text>

          {/* STATUS CARD */}
          <View style={[styles.alertCard, { borderColor: isDanger ? '#ef4444' : colors.primary, backgroundColor: cardBg }]}>
            <MaterialCommunityIcons 
              name={isDanger ? "alert-circle" : "check-circle"} 
              size={24} 
              color={isDanger ? '#ef4444' : colors.primary} 
            />
            <View style={{ flex: 1 }}>
              <Text style={[styles.alertTitle, { color: isDanger ? '#ef4444' : colors.primary }]}>
                {isDanger ? t(lang, 'highRiskDetected') : t(lang, 'lowToMediumRisk')}
              </Text>
              <Text style={[styles.alertBody, { color: colors.text.secondary }]}>
                {result.recommendation}
              </Text>
            </View>
          </View>

          {/* DETAILS */}
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>{t(lang, 'detectionDetails')}</Text>
          <View style={styles.detailRow}>
            <View style={[styles.detailItem, { backgroundColor: dark ? colors.surface : colors.secondary }]}>
              <Text style={[styles.detailLabel, { color: colors.text.secondary }]}>{t(lang, 'detectionType')}</Text>
              <Text style={[styles.detailValue, { color: colors.text.primary }]}>{t(lang, 'segmentation')}</Text>
            </View>
            <View style={[styles.detailItem, { backgroundColor: dark ? colors.surface : colors.secondary }]}>
              <Text style={[styles.detailLabel, { color: colors.text.secondary }]}>{t(lang, 'treeSpecies')}</Text>
              <Text style={[styles.detailValue, { color: colors.text.primary }]}>{treeLabel}</Text>
            </View>
          </View>
          <View style={styles.detailRow}>
            <View style={[styles.detailItem, { backgroundColor: dark ? colors.surface : colors.secondary }]}>
              <Text style={[styles.detailLabel, { color: colors.text.secondary }]}>{t(lang, 'reliability')}</Text>
              <Text style={[styles.detailValue, { color: colors.text.primary }]}>{formatConfidence(result.confidence)}</Text>
            </View>
            <View style={[styles.detailItem, { backgroundColor: dark ? colors.surface : colors.secondary }]}>
              <Text style={[styles.detailLabel, { color: colors.text.secondary }]}>{t(lang, 'severityLabel')}</Text>
              <Text style={[styles.detailValue, {
                color: normalizedSeverity === 'high' ? '#ef4444' : 
                       normalizedSeverity === 'medium' ? '#eab308' : colors.primary
              }]}>
                {normalizedSeverity === 'high' ? t(lang, 'high') : normalizedSeverity === 'medium' ? t(lang, 'medium') : t(lang, 'low')}
              </Text>
            </View>
          </View>

          {/* ACTIONS */}
          <View style={styles.actions}>
            <TouchableOpacity 
              style={[styles.primaryBtn, { backgroundColor: colors.primary }, saving && { opacity: 0.6 }]} 
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <Text style={styles.primaryBtnText}>{t(lang, 'saveRecord')}</Text>
                  <Ionicons name="save-outline" size={20} color="white" />
                </>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.secondaryBtn, { borderColor: colors.border }]} onPress={() => navigation.goBack()}>
              <Text style={[styles.secondaryBtnText, { color: colors.text.primary }]}>{t(lang, 'newPhoto')}</Text>
            </TouchableOpacity>
          </View>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.xl },
  loadingText: { fontSize: 20, fontWeight: '600', marginTop: SPACING.m },
  loadingSub: { marginTop: SPACING.s, textAlign: 'center' },
  loadingAnimation: { marginBottom: SPACING.s },
  loadingSteps: { marginTop: SPACING.xl, gap: SPACING.m },
  loadingStep: { flexDirection: 'row', alignItems: 'center', gap: SPACING.s },
  loadingStepText: { fontSize: 14 },

  imageHeader: { height: 300, width: '100%', position: 'relative' },
  mainImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  backBtn: { position: 'absolute', top: 20, left: 20, width: 40, height: 40, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: RADIUS.full, justifyContent: 'center', alignItems: 'center' },
  badgeContainer: { position: 'absolute', bottom: 20, left: 20, flexDirection: 'row' },
  badge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.full },
  badgeText: { color: 'white', fontWeight: 'bold', fontSize: 12 },

  regionOverlay: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: OVERLAY_BORDER,
    backgroundColor: OVERLAY_COLOR,
    borderRadius: 4,
  },

  content: { padding: SPACING.l, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, marginTop: -20 },
  h2: { fontSize: 24, fontWeight: '600', letterSpacing: -0.5 },
  latinName: { fontSize: 16, lineHeight: 24, fontStyle: 'italic', marginBottom: SPACING.l },

  alertCard: { flexDirection: 'row', gap: 12, padding: SPACING.m, borderRadius: RADIUS.m, borderWidth: 1, marginBottom: SPACING.xl, alignItems: 'flex-start' },
  alertTitle: { fontWeight: '700', fontSize: 16, marginBottom: 6 },
  alertBody: { fontSize: 14, lineHeight: 20 },

  sectionTitle: { fontSize: 20, fontWeight: '600', marginBottom: SPACING.m },
  detailRow: { flexDirection: 'row', gap: SPACING.m, marginBottom: SPACING.m },
  detailItem: { flex: 1, padding: SPACING.m, borderRadius: RADIUS.m },
  detailLabel: { fontSize: 12, marginBottom: 4 },
  detailValue: { fontWeight: '600' },

  actions: { gap: SPACING.m, marginTop: SPACING.m },
  primaryBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: SPACING.m, borderRadius: RADIUS.m, gap: 8, ...SHADOWS.md },
  primaryBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  secondaryBtn: { justifyContent: 'center', alignItems: 'center', padding: SPACING.m, borderRadius: RADIUS.m, borderWidth: 1 },
  secondaryBtnText: { fontWeight: '600' },
});

export default AnalysisScreen;