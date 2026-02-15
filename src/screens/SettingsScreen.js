// src/screens/SettingsScreen.js
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, TextInput, Alert, Image, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { SPACING, RADIUS, SHADOWS } from '../constants/theme';
import { clearHistory } from '../services/storageServices';
import { clearAllImages, getStorageUsedMB, saveImageLocally } from '../services/fileServices';
import { useSettings } from '../context/SettingsContext';
import { t } from '../utils/i18n';

const SettingsScreen = ({ navigation }) => {
  const { settings, updateSettings, languages, currentLanguage, colors } = useSettings();
  const lang = settings.language;
  const dark = settings.darkMode;

  const [showLangDropdown, setShowLangDropdown] = useState(false);
  const [storageUsed, setStorageUsed] = useState(0);
  const [nameLocal, setNameLocal] = useState(settings.name);
  const [emailLocal, setEmailLocal] = useState(settings.email);

  const storageTotal = 500;
  const storagePercent = storageTotal > 0 ? Math.min((storageUsed / storageTotal) * 100, 100) : 0;

  const bg = dark ? colors.background : '#F5F6F4';
  const cardBg = dark ? colors.surface : 'white';
  const inputBg = dark ? colors.secondary : '#F4F4F5';

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      setNameLocal(settings.name);
      setEmailLocal(settings.email);
      const loadStorageInfo = async () => {
        try {
          const used = await getStorageUsedMB();
          if (isActive) setStorageUsed(used);
        } catch (e) {
          console.error('Chyba při načítání info o úložišti:', e);
        }
      };
      loadStorageInfo();
      return () => { isActive = false; };
    }, [settings.name, settings.email])
  );

  const handleNameBlur = () => {
    if (nameLocal.trim() && nameLocal !== settings.name) {
      updateSettings({ name: nameLocal.trim() });
    }
  };

  const handleEmailBlur = () => {
    if (emailLocal.trim() && emailLocal !== settings.email) {
      updateSettings({ email: emailLocal.trim() });
    }
  };

  const handlePickAvatar = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });
      if (!result.canceled && result.assets?.[0]?.uri) {
        const savedUri = await saveImageLocally(result.assets[0].uri);
        updateSettings({ avatarUri: savedUri });
      }
    } catch (e) {
      console.error('Chyba při výběru avataru:', e);
      Alert.alert(t(lang, 'error'), t(lang, 'galleryError'));
    }
  };

  const handleClearData = () => {
    Alert.alert(
      t(lang, 'clearDataConfirm'),
      t(lang, 'clearDataDesc'),
      [
        { text: t(lang, 'cancel'), style: 'cancel' },
        {
          text: t(lang, 'delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await clearAllImages();
              await clearHistory();
              setStorageUsed(0);
              Alert.alert(t(lang, 'done'), t(lang, 'allDataCleared'));
            } catch (e) {
              console.error('Chyba při mazání dat:', e);
              Alert.alert(t(lang, 'error'), t(lang, 'couldNotClearData'));
            }
          },
        },
      ]
    );
  };

  const initials = settings.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
      <StatusBar barStyle={dark ? 'light-content' : 'dark-content'} />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: bg }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backButton, { backgroundColor: cardBg }]}>
            <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text.primary }]}>{t(lang, 'settings')}</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* User Profile Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="person-outline" size={20} color={colors.text.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>{t(lang, 'account')}</Text>
          </View>

          <View style={[styles.card, { backgroundColor: cardBg }]}>
            <View style={styles.profileHeader}>
              <TouchableOpacity onPress={handlePickAvatar} activeOpacity={0.7}>
                {settings.avatarUri ? (
                  <Image source={{ uri: settings.avatarUri }} style={styles.avatarImage} />
                ) : (
                  <View style={[styles.avatarContainer, { backgroundColor: colors.primary }]}>
                    <Text style={styles.avatarText}>{initials}</Text>
                  </View>
                )}
                <View style={[styles.avatarEditBadge, { backgroundColor: colors.primary }]}>
                  <Ionicons name="camera" size={14} color="white" />
                </View>
              </TouchableOpacity>
              <Text style={[styles.profileName, { color: colors.text.primary }]}>{settings.name}</Text>
              <Text style={[styles.profileEmail, { color: colors.text.secondary }]}>{settings.email}</Text>
              <TouchableOpacity onPress={handlePickAvatar} style={styles.changePhotoBtn}>
                <Text style={[styles.changePhotoText, { color: colors.primary }]}>{t(lang, 'changePhoto')}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text.secondary }]}>{t(lang, 'nameLabel')}</Text>
              <TextInput
                style={[styles.input, { backgroundColor: inputBg, color: colors.text.primary }]}
                value={nameLocal}
                onChangeText={setNameLocal}
                onBlur={handleNameBlur}
                returnKeyType="done"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text.secondary }]}>{t(lang, 'emailLabel')}</Text>
              <TextInput
                style={[styles.input, { backgroundColor: inputBg, color: colors.text.primary }]}
                value={emailLocal}
                onChangeText={setEmailLocal}
                onBlur={handleEmailBlur}
                keyboardType="email-address"
                autoCapitalize="none"
                returnKeyType="done"
              />
            </View>

            <TouchableOpacity style={styles.logoutButton}>
              <Ionicons name="log-out-outline" size={18} color="#ef4444" />
              <Text style={styles.logoutText}>{t(lang, 'logout')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* App Settings */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="globe-outline" size={20} color={colors.text.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>{t(lang, 'app')}</Text>
          </View>

          <View style={[styles.card, { backgroundColor: cardBg }]}>
            <View style={styles.settingRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.settingLabel, { color: colors.text.primary }]}>{t(lang, 'language')}</Text>
                <Text style={[styles.settingSub, { color: colors.text.secondary }]}>{t(lang, 'chooseLanguage')}</Text>
              </View>
              <TouchableOpacity
                style={[styles.langSelector, { backgroundColor: inputBg }]}
                onPress={() => setShowLangDropdown(!showLangDropdown)}
              >
                <Text style={{ fontSize: 16, marginRight: 4 }}>{currentLanguage.flag}</Text>
                <Text style={[styles.langText, { color: colors.text.primary }]}>{currentLanguage.label}</Text>
                <Ionicons name={showLangDropdown ? 'chevron-up' : 'chevron-down'} size={16} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>

            {showLangDropdown && (
              <View style={[styles.langDropdown, { backgroundColor: dark ? colors.secondary : '#FAFAFA' }]}>
                {languages.map((lng) => (
                  <TouchableOpacity
                    key={lng.code}
                    style={[
                      styles.langOption, 
                      settings.language === lng.code && { backgroundColor: dark ? 'rgba(34,197,94,0.12)' : '#F0FDF4' }
                    ]}
                    onPress={() => {
                      updateSettings({ language: lng.code });
                      setShowLangDropdown(false);
                    }}
                  >
                    <Text style={{ fontSize: 18, marginRight: 8 }}>{lng.flag}</Text>
                    <Text style={[
                      styles.langOptionText,
                      { color: colors.text.primary },
                      settings.language === lng.code && { color: colors.primary, fontWeight: '600' },
                    ]}>
                      {lng.label}
                    </Text>
                    {settings.language === lng.code && (
                      <Ionicons name="checkmark" size={16} color={colors.primary} style={{ marginLeft: 'auto' }} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <View style={[styles.separator, { backgroundColor: dark ? colors.border : '#E4E4E7' }]} />

            <View style={styles.settingRow}>
              <View style={[styles.iconCircle, { backgroundColor: dark ? 'rgba(147,51,234,0.15)' : '#FAF5FF' }]}>
                <Ionicons name="moon-outline" size={20} color="#9333EA" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.settingLabel, { color: colors.text.primary }]}>{t(lang, 'darkMode')}</Text>
                <Text style={[styles.settingSub, { color: colors.text.secondary }]}>{t(lang, 'changeAppearance')}</Text>
              </View>
              <Switch
                value={settings.darkMode}
                onValueChange={(val) => updateSettings({ darkMode: val })}
                trackColor={{ false: '#e4e4e7', true: colors.primary }}
                thumbColor={settings.darkMode ? 'white' : '#f4f3f4'}
              />
            </View>
          </View>
        </View>

        {/* Data */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="database-outline" size={20} color={colors.text.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>{t(lang, 'dataStorage')}</Text>
          </View>

          <View style={[styles.card, { backgroundColor: cardBg }]}>
            <View style={styles.storageHeader}>
              <Text style={[styles.settingLabel, { color: colors.text.primary }]}>{t(lang, 'usedStorage')}</Text>
              <Text style={[styles.settingSub, { color: colors.text.secondary }]}>
                {storageUsed} MB / {storageTotal} MB
              </Text>
            </View>

            <View style={[styles.progressBarBg, { backgroundColor: dark ? colors.border : '#E4E4E7' }]}>
              <View style={[styles.progressBarFill, { width: `${storagePercent}%`, backgroundColor: colors.primary }]} />
            </View>
            <Text style={[styles.storageHint, { color: colors.text.secondary }]}>
              {storageTotal - storageUsed} MB {t(lang, 'available')}
            </Text>

            <Text style={[styles.storageDesc, { color: colors.text.secondary }]}>{t(lang, 'storageDesc')}</Text>

            <TouchableOpacity style={[styles.clearBtn, { borderColor: dark ? 'rgba(239,68,68,0.3)' : '#FECACA', backgroundColor: dark ? 'rgba(239,68,68,0.1)' : '#FEF2F2' }]} onPress={handleClearData}>
              <Ionicons name="trash-outline" size={18} color="#ef4444" />
              <Text style={styles.clearBtnText}>{t(lang, 'clearLocalData')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* About */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="information-circle-outline" size={20} color={colors.text.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>{t(lang, 'aboutApp')}</Text>
          </View>

          <View style={[styles.card, { backgroundColor: cardBg }]}>
            <View style={[styles.aboutRow, { borderBottomColor: dark ? colors.border : '#F4F4F5' }]}>
              <Text style={[styles.aboutLabel, { color: colors.text.secondary }]}>{t(lang, 'version')}</Text>
              <Text style={[styles.aboutValue, { color: colors.text.primary }]}>1.0.0 (Beta)</Text>
            </View>
            <View style={[styles.aboutRow, { borderBottomColor: dark ? colors.border : '#F4F4F5' }]}>
              <Text style={[styles.aboutLabel, { color: colors.text.secondary }]}>{t(lang, 'aiModel')}</Text>
              <Text style={[styles.aboutValue, { color: colors.text.primary }]}>Unknown</Text>
            </View>
            <View style={[styles.aboutRow, { borderBottomWidth: 0 }]}>
              <Text style={[styles.aboutLabel, { color: colors.text.secondary }]}>{t(lang, 'author')}</Text>
              <Text style={[styles.aboutValue, { color: colors.text.primary }]}>Matěj Frantík</Text>
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.text.secondary }]}>Forest Guardian v1.0.0 (Beta)</Text>
          <Text style={[styles.footerText, { color: colors.text.secondary }]}>Bakalářská práce 2026 • Edge AI Detection</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
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
    width: 40, height: 40, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center',
    ...SHADOWS.sm,
  },
  headerTitle: { fontSize: 18, fontWeight: '600' },
  section: { marginTop: 24, paddingHorizontal: 24 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '600' },
  card: { borderRadius: RADIUS.l, padding: 20, ...SHADOWS.sm },
  profileHeader: { alignItems: 'center', marginBottom: 20 },
  avatarContainer: {
    width: 80, height: 80, borderRadius: 40,
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  avatarImage: { width: 80, height: 80, borderRadius: 40, marginBottom: 12 },
  avatarText: { color: 'white', fontSize: 28, fontWeight: 'bold' },
  avatarEditBadge: {
    position: 'absolute', bottom: 10, right: -4,
    width: 28, height: 28, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: 'white',
  },
  profileName: { fontSize: 18, fontWeight: 'bold' },
  profileEmail: { fontSize: 14 },
  changePhotoBtn: { marginTop: 8, paddingVertical: 4 },
  changePhotoText: { fontSize: 13, fontWeight: '600' },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 12, marginBottom: 6 },
  input: { borderRadius: RADIUS.m, padding: 12, fontSize: 14 },
  logoutButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginTop: 8, padding: 10,
  },
  logoutText: { color: '#ef4444', marginLeft: 8, fontWeight: '600' },
  settingRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  settingLabel: { fontSize: 14, fontWeight: '600' },
  settingSub: { fontSize: 12 },
  langSelector: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: RADIUS.m, gap: 6,
  },
  langText: { fontSize: 14 },
  langDropdown: { borderRadius: RADIUS.m, padding: 4, marginTop: 8 },
  langOption: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: RADIUS.s },
  langOptionText: { fontSize: 14 },
  iconCircle: {
    width: 36, height: 36, borderRadius: 18,
    justifyContent: 'center', alignItems: 'center',
  },
  separator: { height: 1, marginVertical: 12 },
  storageHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  progressBarBg: { height: 8, borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 4 },
  storageHint: { fontSize: 11, marginTop: 6, textAlign: 'right' },
  storageDesc: { fontSize: 13, marginVertical: 16, lineHeight: 20 },
  clearBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    padding: 12, borderRadius: RADIUS.m, borderWidth: 1,
  },
  clearBtnText: { color: '#ef4444', fontWeight: '600', marginLeft: 8 },
  aboutRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 12, borderBottomWidth: 1,
  },
  aboutLabel: { fontSize: 14 },
  aboutValue: { fontSize: 14, fontWeight: '500' },
  footer: { marginTop: 32, alignItems: 'center', paddingBottom: 20 },
  footerText: { fontSize: 12 },
});

export default SettingsScreen;