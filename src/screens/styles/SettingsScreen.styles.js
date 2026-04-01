/**
 * @file SettingsScreen.styles.js
 * @description Style definitions for the SettingsScreen component.
 */
import { StyleSheet } from 'react-native';
import { SPACING, RADIUS, SHADOWS } from '../../constants/theme';

export default StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingBottom: 40 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  headerTitle: { fontSize: 18, fontWeight: '600' },

  section: { marginTop: 24, paddingHorizontal: 24 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  sectionTitle: { fontSize: 16, fontWeight: '600' },

  card: { borderRadius: RADIUS.l, padding: 20, ...SHADOWS.sm },

  profileHeader: { alignItems: 'center', marginBottom: 20 },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarImage: { width: 80, height: 80, borderRadius: 40, marginBottom: 12 },
  avatarText: { color: 'white', fontSize: 28, fontWeight: 'bold' },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 10,
    right: -4,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  profileName: { fontSize: 18, fontWeight: 'bold' },
  profileEmail: { fontSize: 14 },
  changePhotoBtn: { marginTop: 8, paddingVertical: 4 },
  changePhotoText: { fontSize: 13, fontWeight: '600' },

  inputGroup: { marginBottom: 16 },
  label: { fontSize: 12, marginBottom: 6 },
  input: { borderRadius: RADIUS.m, padding: 12, fontSize: 14 },

  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    padding: 10,
  },
  logoutText: { color: '#ef4444', marginLeft: 8, fontWeight: '600' },

  settingRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  settingLabel: { fontSize: 14, fontWeight: '600' },
  settingSub: { fontSize: 12 },

  langSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.m,
    gap: 6,
  },
  langText: { fontSize: 14 },
  langDropdown: { borderRadius: RADIUS.m, padding: 4, marginTop: 8 },
  langOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: RADIUS.s,
  },
  langOptionText: { fontSize: 14 },

  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  separator: { height: 1, marginVertical: 12 },

  storageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressBarBg: { height: 8, borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 4 },
  storageHint: { fontSize: 11, marginTop: 6, textAlign: 'right' },
  storageDesc: { fontSize: 13, marginVertical: 16, lineHeight: 20 },

  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: RADIUS.m,
    borderWidth: 1,
  },
  clearBtnText: { color: '#ef4444', fontWeight: '600', marginLeft: 8 },

  aboutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  aboutLabel: { fontSize: 14 },
  aboutValue: { fontSize: 14, fontWeight: '500' },

  footer: { marginTop: 32, alignItems: 'center', paddingBottom: 20 },
  footerText: { fontSize: 12 },
});
