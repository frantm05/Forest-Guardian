/**
 * @file LoadingScreen.styles.js
 * @description Style definitions for the LoadingScreen component.
 */
import { StyleSheet } from 'react-native';
import { SPACING } from '../../constants/theme';

export default StyleSheet.create({
  container: { flex: 1 },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },

  logoArea: { alignItems: 'center', marginBottom: 40 },
  ringWrapper: {
    width: 110,
    height: 110,
    justifyContent: 'center',
    alignItems: 'center',
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
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  appName: { fontSize: 26, fontWeight: '700', letterSpacing: -0.5 },

  statusText: { fontSize: 14, marginBottom: 24, textAlign: 'center' },

  progressTrack: {
    width: '75%',
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 2 },

  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: SPACING.l,
    paddingHorizontal: SPACING.m,
    paddingVertical: SPACING.s,
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
  },
  errorText: { color: '#EF4444', fontSize: 13, flex: 1 },

  footer: {
    position: 'absolute',
    bottom: SPACING.xl,
    fontSize: 12,
    textAlign: 'center',
  },
});
