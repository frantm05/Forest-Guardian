/**
 * @file HistoryScreen.styles.js
 * @description Style definitions for the HistoryScreen component.
 */
import { StyleSheet } from 'react-native';
import { SPACING, RADIUS, SHADOWS } from '../../constants/theme';

export default StyleSheet.create({
  container: { flex: 1 },

  header: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    paddingTop: 12,
    borderBottomWidth: 1,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: { fontSize: 20, fontWeight: '700' },
  headerSubtitle: { fontSize: 12, marginTop: 1 },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconBtn: { padding: 8, borderRadius: 20 },

  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.m,
    paddingHorizontal: 12,
    marginBottom: 12,
    height: 40,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14, paddingVertical: 0 },

  filterRow: { flexDirection: 'row', gap: 8 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  filterText: { fontSize: 12, fontWeight: '500' },

  listContent: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 40, flexGrow: 1 },

  sectionHeader: {
    paddingTop: 16,
    paddingBottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  sectionCount: { fontSize: 12, fontWeight: '500' },

  card: {
    flexDirection: 'row',
    borderRadius: RADIUS.l,
    ...SHADOWS.sm,
    alignItems: 'center',
    overflow: 'hidden',
    marginBottom: 10,
  },
  severityStripe: {
    width: 4,
    alignSelf: 'stretch',
  },
  cardImage: {
    width: 56,
    height: 56,
    borderRadius: RADIUS.m,
    marginLeft: 10,
    marginVertical: 10,
  },
  cardImagePlaceholder: { justifyContent: 'center', alignItems: 'center' },
  cardContent: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  cardTitle: { fontSize: 14, fontWeight: '600', flex: 1, marginRight: 8 },
  confBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: RADIUS.s,
  },
  confBadgeText: { fontSize: 11, fontWeight: '700' },
  cardBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cardDate: { fontSize: 11 },
  detCountWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  detCountText: { fontSize: 11 },

  deleteBtn: { padding: 12 },

  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 80,
    paddingHorizontal: SPACING.xl,
  },
  emptyTitle: { fontSize: 18, fontWeight: '600', marginBottom: SPACING.s },
  emptySub: { textAlign: 'center', lineHeight: 20 },
});
