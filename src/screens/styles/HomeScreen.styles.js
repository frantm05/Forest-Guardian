/**
 * @file HomeScreen.styles.js
 * @description Style definitions for the HomeScreen component.
 */
import { StyleSheet } from 'react-native';
import { SPACING, RADIUS, SHADOWS } from '../../constants/theme';

export default StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: SPACING.l, paddingBottom: 40 },

  captionText: { fontSize: 12 },
  h2Text: { fontSize: 24, fontWeight: '600', letterSpacing: -0.5 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.l,
    paddingTop: SPACING.s,
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

  lastDetectionCard: {
    justifyContent: 'space-between',
  },
  lastDetectionThumb: {
    width: 40,
    height: 40,
    borderRadius: 12,
  },
  lastDetectionLabel: {
    fontSize: 14,
    fontWeight: '600',
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
