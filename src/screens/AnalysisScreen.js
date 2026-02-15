// src/screens/AnalysisScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, Image, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { SPACING, RADIUS, SHADOWS } from '../constants/theme';
import { analyzeImage, DETECTION_MODES, TREE_TYPES } from '../services/aiServices';
import { saveRecord } from '../services/storageServices';
import { saveImageLocally } from '../services/fileServices';
import { formatConfidence } from '../utils/formatters';
import { useSettings } from '../context/SettingsContext';
import { t } from '../utils/i18n';

const AnalysisScreen = ({ route, navigation }) => {
  const { settings, colors } = useSettings();
  const lang = settings.language;
  const dark = settings.darkMode;

  const { imageUri, mode, treeType } = route.params || {};
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const treeObj = TREE_TYPES.find(tt => tt.id === treeType);
  const treeLabel = treeObj ? t(lang, treeObj.labelKey) : (treeType || t(lang, 'treeUnknown'));

  useEffect(() => {
    if (!imageUri) {
      setError(t(lang, 'noImageError'));
      setLoading(false);
      return;
    }

    let cancelled = false;

    analyzeImage(imageUri, mode, treeType)
      .then(data => {
        if (!cancelled) {
          setResult(data);
          setLoading(false);
        }
      })
      .catch(e => {
        if (!cancelled) {
          console.error('Chyba při analýze:', e);
          setError(t(lang, 'analysisFailed'));
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [imageUri, mode, treeType]);

  const handleSave = async () => {
    if (!result || saving) return;
    try {
      setSaving(true);
      const savedUri = await saveImageLocally(imageUri);
      await saveRecord({ ...result, imageUri: savedUri, mode, treeType });
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

  const bg = dark ? colors.background : colors.background;
  const cardBg = dark ? colors.surface : '#f9fafb';

  if (loading) {
    return (
      <SafeAreaView style={[styles.loadingContainer, { backgroundColor: bg }]}>
        <StatusBar barStyle={dark ? 'light-content' : 'dark-content'} />
        <View style={styles.loadingAnimation}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
        <Text style={[styles.loadingText, { color: colors.text.primary }]}>{t(lang, 'analyzing')}</Text>
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

  const isDanger = result?.severity === 'high';
  const modeLabel = mode === DETECTION_MODES.OBJECT ? t(lang, 'objectDetection') : t(lang, 'segmentation');

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
      <StatusBar barStyle={dark ? 'light-content' : 'dark-content'} />
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        
        {/* IMAGE HEADER */}
        <View style={styles.imageHeader}>
          <Image source={{ uri: imageUri }} style={styles.mainImage} />
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
              <Text style={[styles.detailValue, { color: colors.text.primary }]}>{modeLabel}</Text>
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
                color: result.severity === 'high' ? '#ef4444' : 
                       result.severity === 'medium' ? '#eab308' : colors.primary
              }]}>
                {result.severity === 'high' ? t(lang, 'high') : result.severity === 'medium' ? t(lang, 'medium') : t(lang, 'low')}
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

  content: { padding: SPACING.l, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, marginTop: -20 },
  h2: { fontSize: 24, fontWeight: '600', letterSpacing: -0.5 },
  latinName: { fontSize: 16, lineHeight: 24, fontStyle: 'italic', marginBottom: SPACING.l },

  alertCard: { flexDirection: 'row', gap: 12, padding: SPACING.m, borderRadius: RADIUS.m, borderWidth: 1, marginBottom: SPACING.xl },
  alertTitle: { fontWeight: '700', fontSize: 16, marginBottom: -40 },

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