/**
 * @file AnalysisScreen.styles.js
 * @description Style definitions for the AnalysisScreen component.
 */
import { StyleSheet, Dimensions } from 'react-native';
import { SPACING, RADIUS, SHADOWS } from '../../constants/theme';

const SCREEN_WIDTH = Dimensions.get('window').width;

export default StyleSheet.create({
  container: { flex: 1 },

  /* ── Loading state ─────────────────────────────── */
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  loadingAnimation: {
    marginBottom: SPACING.l,
  },
  loadingText: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: SPACING.s,
  },
  loadingSub: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: SPACING.l,
  },
  loadingSteps: {
    marginTop: SPACING.l,
    gap: SPACING.m,
  },
  loadingStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.s,
  },
  loadingStepText: {
    fontSize: 14,
  },

  /* ── Image header ──────────────────────────────── */
  imageHeader: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH * 0.75,
    position: 'relative',
  },
  mainImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imageGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
  },
  backBtn: {
    position: 'absolute',
    top: SPACING.m,
    left: SPACING.m,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* ── Content ───────────────────────────────────── */
  content: {
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    marginTop: -SPACING.xl,
    paddingTop: SPACING.xl,
    paddingHorizontal: SPACING.l,
    paddingBottom: SPACING.m,
  },

  /* ── Status badge ──────────────────────────────── */
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    gap: 6,
    marginBottom: SPACING.m,
  },
  statusBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  /* ── Title block ───────────────────────────────── */
  titleBlock: {
    marginBottom: SPACING.m,
  },
  h2: {
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginBottom: SPACING.xs,
  },
  latinName: {
    fontSize: 15,
    fontStyle: 'italic',
    marginBottom: SPACING.xs,
  },

  /* ── Confidence bar ────────────────────────────── */
  confidenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  confidenceLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  confidenceValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  confidenceBarBg: {
    height: 6,
    borderRadius: 3,
    marginBottom: SPACING.l,
    overflow: 'hidden',
  },
  confidenceBarFill: {
    height: '100%',
    borderRadius: 3,
  },

  /* ── Detection card ────────────────────────────── */
  detectionCard: {
    borderRadius: RADIUS.l,
    padding: SPACING.m,
    marginBottom: SPACING.m,
    ...SHADOWS.sm,
  },
  detectionCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.s,
    marginBottom: SPACING.s,
  },
  detectionCardTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  detectionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  detectionItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.s,
    flex: 1,
  },
  detectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  detectionItemName: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  detectionItemConf: {
    fontSize: 14,
    fontWeight: '700',
    minWidth: 42,
    textAlign: 'right',
  },

  /* ── Info (no pest) state ──────────────────────── */
  infoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  infoIconWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.l,
  },
  infoTitle: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: SPACING.s,
  },
  infoSub: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: SPACING.xl,
  },
  infoButtons: {
    width: '100%',
    gap: 14,
  },

  /* ── Photo detail overlay ──────────────────────── */
  overlayBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayCloseBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  overlayImage: {
    width: SCREEN_WIDTH - 40,
    height: SCREEN_WIDTH - 40,
    borderRadius: RADIUS.l,
  },

  /* ── Bottom action bar ─────────────────────────── */
  bottomBar: {
    flexDirection: 'column',
    paddingHorizontal: SPACING.l,
    paddingTop: SPACING.m,
    paddingBottom: SPACING.l,
    gap: 14,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: RADIUS.m,
    gap: SPACING.s,
  },
  primaryBtnText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: RADIUS.m,
    borderWidth: 1,
    gap: SPACING.s,
  },
  secondaryBtnText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
