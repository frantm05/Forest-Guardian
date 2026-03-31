// src/screens/SegmentationScreen.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image, StatusBar,
  ActivityIndicator, Alert, Dimensions, PanResponder,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Polyline as SvgPolyline } from 'react-native-svg';

import { SPACING, RADIUS, SHADOWS } from '../constants/theme';
import { ROUTES } from '../constants/routes';
import {
  polygonToMask, refineMaskWithSAM, composeMasks,
  maskToOverlayUri, classifyWithMask, samEncode, getActiveMode,
  detectPests,
} from '../services/aiServices';
import { useSettings } from '../context/SettingsContext';
import { t } from '../utils/i18n';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IMAGE_HEIGHT = SCREEN_WIDTH * (4 / 3);
const MASK_SIZE = 256;
const MIN_DRAW_DIST_SQ = 64; // min 8 px between tracked points

const SegmentationScreen = ({ route, navigation }) => {
  const { settings, colors } = useSettings();
  const lang = settings.language;
  const dark = settings.darkMode;

  const { imageUri, treeType } = route.params || {};

  // Phases: 'interactive' → 'classifying'
  const [phase, setPhase] = useState('interactive');
  const [lassos, setLassos] = useState([]);           // completed [{vertices, label, maskData}]
  const [currentPath, setCurrentPath] = useState([]);  // in-progress drawing [{x,y,screenX,screenY}]
  const [maskOverlayUri, setMaskOverlayUri] = useState(null);
  const [composedMask, setComposedMask] = useState(null);
  const [drawMode, setDrawMode] = useState(1); // 1 = include, 0 = exclude
  const [isRefining, setIsRefining] = useState(false);
  const [error, setError] = useState(null);

  // SAM background encoding state
  const [samReady, setSamReady] = useState(false);
  const embeddingsRef = useRef(null);

  // Refs for access inside PanResponder closures
  const currentPathRef = useRef([]);
  const drawModeRef = useRef(1);
  const lassosRef = useRef([]);

  useEffect(() => { drawModeRef.current = drawMode; }, [drawMode]);
  useEffect(() => { lassosRef.current = lassos; }, [lassos]);

  // Start SAM encoding in background on mount (non-blocking)
  useEffect(() => {
    if (!imageUri) return;
    const mode = getActiveMode();
    if (!mode) return; // no SAM model available

    let cancelled = false;
    (async () => {
      try {
        console.warn('[Hybrid] Starting SAM encode in background...');
        const emb = await samEncode(imageUri);
        if (cancelled) return;
        embeddingsRef.current = emb;
        setSamReady(true);
        console.warn('[Hybrid] SAM encoding done, refinement available');
      } catch (err) {
        console.warn('[Hybrid] SAM encode failed (lasso-only mode):', err?.message);
      }
    })();
    return () => { cancelled = true; };
  }, [imageUri]);

  // Recompose overlay from all completed lassos
  const recomposeMasks = useCallback((allLassos) => {
    if (allLassos.length === 0) {
      setComposedMask(null);
      setMaskOverlayUri(null);
      return;
    }
    const masks = allLassos.map(l => ({ maskData: l.maskData, label: l.label }));
    const combined = composeMasks(masks);
    if (combined) {
      setComposedMask({ maskData: combined, maskSize: MASK_SIZE });
      setMaskOverlayUri(maskToOverlayUri(combined, MASK_SIZE));
    } else {
      setComposedMask(null);
      setMaskOverlayUri(null);
    }
  }, []);

  // Close current drawing → polygon mask → optional SAM refinement → append
  const finalizeLasso = useCallback(async () => {
    const path = currentPathRef.current;
    currentPathRef.current = [];
    setCurrentPath([]);

    if (path.length < 10) return; // too few points for a meaningful shape

    const vertices = path.map(p => ({ x: p.x, y: p.y }));
    let maskData = polygonToMask(vertices, MASK_SIZE);

    // Show polygon immediately
    const label = drawModeRef.current;
    const polyLasso = { vertices: path, label, maskData };
    const tempLassos = [...lassosRef.current, polyLasso];
    setLassos(tempLassos);
    recomposeMasks(tempLassos);

    // If SAM is ready, refine in background and update
    if (embeddingsRef.current) {
      setIsRefining(true);
      try {
        const refined = await refineMaskWithSAM(embeddingsRef.current, maskData, vertices, MASK_SIZE);
        const refinedLasso = { vertices: path, label, maskData: refined };
        // Replace last lasso with refined version
        const currentLassos = lassosRef.current;
        const updated = [...currentLassos.slice(0, -1), refinedLasso];
        setLassos(updated);
        recomposeMasks(updated);
      } catch (err) {
        console.warn('[Hybrid] Refinement failed:', err?.message);
        // polygon-only mask remains
      } finally {
        setIsRefining(false);
      }
    }
  }, [recomposeMasks]);

  const finalizeLassoRef = useRef(finalizeLasso);
  useEffect(() => { finalizeLassoRef.current = finalizeLasso; }, [finalizeLasso]);

  // Freehand drawing via PanResponder
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        const pt = {
          x: locationX / SCREEN_WIDTH,
          y: locationY / IMAGE_HEIGHT,
          screenX: locationX,
          screenY: locationY,
        };
        currentPathRef.current = [pt];
        setCurrentPath([pt]);
      },
      onPanResponderMove: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        const path = currentPathRef.current;
        if (!path.length) return;
        const last = path[path.length - 1];
        const dx = locationX - last.screenX;
        const dy = locationY - last.screenY;
        if (dx * dx + dy * dy < MIN_DRAW_DIST_SQ) return;
        const pt = {
          x: locationX / SCREEN_WIDTH,
          y: locationY / IMAGE_HEIGHT,
          screenX: locationX,
          screenY: locationY,
        };
        const updated = [...path, pt];
        currentPathRef.current = updated;
        setCurrentPath(updated);
      },
      onPanResponderRelease: () => {
        finalizeLassoRef.current();
      },
    })
  ).current;

  const undoLasso = () => {
    const updated = lassos.slice(0, -1);
    setLassos(updated);
    recomposeMasks(updated);
  };

  const clearAll = () => {
    setLassos([]);
    setComposedMask(null);
    setMaskOverlayUri(null);
  };

  const confirmSegmentation = async () => {
    if (!composedMask) {
      Alert.alert(t(lang, 'segHintTitle'), t(lang, 'segHintBody'));
      return;
    }

    setPhase('classifying');
    try {
      const result = await classifyWithMask(
        imageUri,
        composedMask.maskData,
        composedMask.maskSize,
        treeType
      );

      if (!result) {
        setError(t(lang, 'analysisFailed'));
        setPhase('interactive');
        return;
      }

      navigation.replace(ROUTES.ANALYSIS, {
        imageUri,
        treeType,
        result,
      });
    } catch (err) {
      console.error('Classification error:', err);
      setError(err?.message || t(lang, 'analysisFailed'));
      setPhase('interactive');
    }
  };

  // Auto-detect: let YOLOv8-seg find pest damage without manual lasso
  const autoDetect = async () => {
    setPhase('classifying');
    try {
      const result = await detectPests(imageUri, treeType);
      if (!result) {
        setError(t(lang, 'analysisFailed'));
        setPhase('interactive');
        return;
      }
      navigation.replace(ROUTES.ANALYSIS, { imageUri, treeType, result });
    } catch (err) {
      console.error('Auto-detect error:', err);
      setError(err?.message || t(lang, 'analysisFailed'));
      setPhase('interactive');
    }
  };

  // ==========================================
  // CLASSIFYING PHASE
  // ==========================================
  if (phase === 'classifying') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: dark ? colors.background : '#F5F6F4' }]}>
        <StatusBar barStyle={dark ? 'light-content' : 'dark-content'} />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.centerTitle, { color: colors.text.primary }]}>
            {t(lang, 'classifying')}
          </Text>
          <Text style={[styles.centerSubtitle, { color: colors.text.secondary }]}>
            {t(lang, 'edgeAI')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ==========================================
  // INTERACTIVE PHASE – user draws lasso
  // ==========================================
  const pathString = currentPath.length > 1
    ? currentPath.map(p => `${p.screenX},${p.screenY}`).join(' ')
    : '';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: '#000' }]}>
      <StatusBar barStyle="light-content" />

      {/* TOP BAR */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
          <Ionicons name="arrow-back" size={26} color="white" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>{t(lang, 'segTitle')}</Text>
        <View style={{ width: 44 }} />
      </View>

      {/* IMAGE + MASK OVERLAY + LASSO DRAWING */}
      <View style={styles.imageWrapper} {...panResponder.panHandlers}>
        <Image source={{ uri: imageUri }} style={styles.imageView} resizeMode="cover" />

        {/* Combined mask overlay */}
        {maskOverlayUri && (
          <Image
            source={{ uri: maskOverlayUri }}
            style={[styles.maskOverlay, { opacity: 0.45 }]}
            resizeMode="stretch"
          />
        )}

        {/* In-progress drawing line */}
        {currentPath.length > 1 && (
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <Svg height="100%" width="100%">
              <SvgPolyline
                points={pathString}
                fill="none"
                stroke={drawMode === 1 ? 'rgba(34, 197, 94, 0.9)' : 'rgba(239, 68, 68, 0.9)'}
                strokeWidth={3}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </View>
        )}

        {/* SAM status badge */}
        <View style={styles.samBadge}>
          {isRefining ? (
            <>
              <ActivityIndicator size="small" color="#4ADE80" />
              <Text style={styles.samBadgeText}>{t(lang, 'segRefining')}</Text>
            </>
          ) : samReady ? (
            <>
              <Ionicons name="sparkles" size={14} color="#4ADE80" />
              <Text style={[styles.samBadgeText, { color: '#4ADE80' }]}>SAM</Text>
            </>
          ) : (
            <>
              <ActivityIndicator size="small" color="rgba(255,255,255,0.5)" />
              <Text style={styles.samBadgeText}>{t(lang, 'segSamLoading')}</Text>
            </>
          )}
        </View>
      </View>

      {/* BOTTOM CONTROLS */}
      <View style={styles.bottomPanel}>
        {/* Draw mode toggle */}
        <View style={styles.modeRow}>
          <TouchableOpacity
            style={[
              styles.modeButton,
              drawMode === 1 && styles.modeButtonActive,
              drawMode === 1 && { backgroundColor: '#14532D' },
            ]}
            onPress={() => setDrawMode(1)}
          >
            <Ionicons name="add-circle" size={20} color={drawMode === 1 ? '#4ADE80' : '#888'} />
            <Text style={[styles.modeButtonText, drawMode === 1 && { color: '#4ADE80' }]}>
              {t(lang, 'segInclude')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.modeButton,
              drawMode === 0 && styles.modeButtonActive,
              drawMode === 0 && { backgroundColor: '#450A0A' },
            ]}
            onPress={() => setDrawMode(0)}
          >
            <Ionicons name="remove-circle" size={20} color={drawMode === 0 ? '#F87171' : '#888'} />
            <Text style={[styles.modeButtonText, drawMode === 0 && { color: '#F87171' }]}>
              {t(lang, 'segExclude')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Instruction text */}
        <Text style={styles.instructionText}>
          {lassos.length === 0
            ? t(lang, 'segTapInstruction')
            : t(lang, 'segRefineInstruction')
          }
        </Text>

        {error && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={20} color="#EF4444" />
            <Text style={styles.errorBoxText}>{error}</Text>
          </View>
        )}

        {/* Action row */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionBtn, (!lassos.length || isRefining) && { opacity: 0.3 }]}
            onPress={undoLasso}
            disabled={!lassos.length || isRefining}
          >
            <Ionicons name="arrow-undo" size={22} color="white" />
            <Text style={styles.actionBtnText}>{t(lang, 'segUndo')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, (!lassos.length || isRefining) && { opacity: 0.3 }]}
            onPress={clearAll}
            disabled={!lassos.length || isRefining}
          >
            <Ionicons name="trash-outline" size={22} color="white" />
            <Text style={styles.actionBtnText}>{t(lang, 'segClear')}</Text>
          </TouchableOpacity>
        </View>

        {/* Confirm button (lasso path) */}
        <TouchableOpacity
          style={[
            styles.confirmBtn,
            (!composedMask || isRefining) && { opacity: 0.5 },
          ]}
          onPress={confirmSegmentation}
          disabled={!composedMask || isRefining}
        >
          <Text style={styles.confirmBtnText}>{t(lang, 'segConfirm')}</Text>
          <Ionicons name="sparkles" size={20} color="white" />
        </TouchableOpacity>

        {/* Auto-detect button: skip lasso, let YOLO find damage */}
        <TouchableOpacity
          style={[styles.autoDetectBtn, isRefining && { opacity: 0.5 }]}
          onPress={autoDetect}
          disabled={isRefining}
        >
          <Ionicons name="scan-outline" size={20} color="white" />
          <Text style={styles.autoDetectBtnText}>Automatická detekce</Text>
        </TouchableOpacity>

        {/* Lasso counter */}
        {lassos.length > 0 && (
          <Text style={styles.lassoCounter}>
            {lassos.filter(l => l.label === 1).length} {t(lang, 'segPositive')} · {lassos.filter(l => l.label === 0).length} {t(lang, 'segNegative')}
          </Text>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },

  // Classifying phase
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.xl },
  centerTitle: { fontSize: 20, fontWeight: '600', marginTop: SPACING.m },
  centerSubtitle: { fontSize: 14, marginTop: SPACING.s, textAlign: 'center', lineHeight: 20 },

  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: SPACING.s,
    paddingHorizontal: SPACING.m, paddingVertical: SPACING.s,
    backgroundColor: 'rgba(239,68,68,0.15)', borderRadius: RADIUS.m,
  },
  errorBoxText: { color: '#F87171', fontSize: 13, flex: 1 },

  // Interactive phase
  topBar: {
    height: 56, flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 16,
  },
  topBarTitle: { color: 'white', fontSize: 17, fontWeight: '600' },
  iconButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },

  imageWrapper: {
    width: SCREEN_WIDTH, height: IMAGE_HEIGHT,
    backgroundColor: '#111', overflow: 'hidden', position: 'relative',
  },
  imageView: { flex: 1 },
  maskOverlay: {
    ...StyleSheet.absoluteFillObject,
  },

  samBadge: {
    position: 'absolute', top: 10, right: 10,
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 14,
  },
  samBadgeText: { color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: '600' },

  // Bottom panel
  bottomPanel: {
    flex: 1, padding: SPACING.m, justifyContent: 'center', alignItems: 'center',
  },

  modeRow: { flexDirection: 'row', gap: SPACING.s, marginBottom: SPACING.m },
  modeButton: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.08)',
  },
  modeButtonActive: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  modeButtonText: { color: '#888', fontSize: 13, fontWeight: '600' },

  instructionText: {
    color: 'rgba(255,255,255,0.6)', fontSize: 13, textAlign: 'center',
    marginBottom: SPACING.m, lineHeight: 18,
  },

  actionRow: { flexDirection: 'row', gap: SPACING.m, marginBottom: SPACING.m },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 20,
  },
  actionBtnText: { color: 'white', fontSize: 13 },

  confirmBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#22C55E', paddingHorizontal: 32, paddingVertical: 14,
    borderRadius: 30, ...SHADOWS.md,
  },
  confirmBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold' },

  autoDetectBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#2563EB', paddingHorizontal: 24, paddingVertical: 12,
    borderRadius: 30, marginTop: SPACING.s, ...SHADOWS.md,
  },
  autoDetectBtnText: { color: 'white', fontSize: 14, fontWeight: '600' },

  lassoCounter: {
    color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: SPACING.s,
  },
});

export default SegmentationScreen;
