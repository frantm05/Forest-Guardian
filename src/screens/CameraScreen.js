// src/screens/CameraScreen.js
import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, StatusBar, Alert, ScrollView } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';

import { SPACING, RADIUS } from '../constants/theme';
import { ROUTES } from '../constants/routes';
import { TREE_TYPES, DETECTION_MODES } from '../services/aiServices';
import { useSettings } from '../context/SettingsContext';
import { t } from '../utils/i18n';

const CameraScreen = ({ navigation }) => {
  const { settings, colors } = useSettings();
  const lang = settings.language;

  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef(null);
  const [selectedTree, setSelectedTree] = useState(TREE_TYPES[0]);
  const [mode, setMode] = useState(DETECTION_MODES.OBJECT);
  const [flash, setFlash] = useState('off');
  const [facing, setFacing] = useState('back');
  const [showTreeModal, setShowTreeModal] = useState(false);
  const [isTakingPicture, setIsTakingPicture] = useState(false);

  const toggleFacing = () => {
    setFacing(f => f === 'back' ? 'front' : 'back');
    // Blesk funguje pouze na zadní kameře
    if (facing === 'back' && flash === 'on') {
      setFlash('off');
    }
  };

  if (!permission) return <View style={styles.container} />;
  if (!permission.granted) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: colors.background }]}>
        <Ionicons name="camera-outline" size={64} color={colors.text.secondary} style={{ marginBottom: SPACING.m }} />
        <Text style={{ fontSize: 20, fontWeight: '600', color: colors.text.primary, marginBottom: SPACING.s, textAlign: 'center' }}>{t(lang, 'cameraAccess')}</Text>
        <Text style={{ fontSize: 16, lineHeight: 24, color: colors.text.secondary, textAlign: 'center', marginBottom: SPACING.l, paddingHorizontal: SPACING.xl }}>
          {t(lang, 'cameraAccessDesc')}
        </Text>
        <TouchableOpacity onPress={requestPermission} style={[styles.permButton, { backgroundColor: colors.primary }]}>
          <Ionicons name="shield-checkmark-outline" size={18} color="white" style={{ marginRight: 8 }} />
          <Text style={{ color: 'white', fontWeight: '600', fontSize: 16 }}>{t(lang, 'allowAccess')}</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const takePicture = async () => {
    if (!cameraRef.current || isTakingPicture) return;
    try {
      setIsTakingPicture(true);
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.7 });
      if (photo?.uri) {
        navigation.navigate(ROUTES.ANALYSIS, { imageUri: photo.uri, mode, treeType: selectedTree.id });
      }
    } catch (e) {
      Alert.alert(t(lang, 'error'), t(lang, 'photoError'));
      console.error('Chyba při focení:', e);
    } finally {
      setIsTakingPicture(false);
    }
  };

  const pickFromGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.7,
        allowsEditing: false,
      });
      if (!result.canceled && result.assets?.[0]?.uri) {
        navigation.navigate(ROUTES.ANALYSIS, {
          imageUri: result.assets[0].uri,
          mode,
          treeType: selectedTree.id,
        });
      }
    } catch (e) {
      Alert.alert(t(lang, 'error'), t(lang, 'galleryError'));
      console.error('Chyba při výběru z galerie:', e);
    }
  };

  const treeDisplayName = t(lang, selectedTree.labelKey);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <CameraView style={styles.camera} ref={cameraRef} flash={flash} facing={facing} enableTorch={flash === 'on' && facing === 'back'}>
        <SafeAreaView style={styles.overlay}>
          
          {/* HEADER BAR */}
          <View style={styles.headerBar}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.glassCircle}>
              <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
              <Ionicons name="close" size={24} color="white" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.glassPill}
              onPress={() => setShowTreeModal(true)}
            >
              <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
              <Text style={{ fontSize: 16 }}>{selectedTree.icon}</Text>
              <Text style={styles.treeText}>{treeDisplayName}</Text>
              <Ionicons name="chevron-down" size={12} color="white" />
            </TouchableOpacity>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity onPress={toggleFacing} style={styles.glassCircle}>
                <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
                <Ionicons name="camera-reverse-outline" size={20} color="white" />
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => {
                  if (facing === 'front') return; // Blesk nefunguje na přední kameře
                  setFlash(f => f === 'off' ? 'on' : 'off');
                }} 
                style={[styles.glassCircle, facing === 'front' && { opacity: 0.4 }]}
              >
                <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
                <Ionicons name={flash === 'on' ? "flash" : "flash-off"} size={20} color={flash === 'on' ? '#FBBF24' : 'white'} />
              </TouchableOpacity>
            </View>
          </View>

          {/* FOCUS FRAME */}
          <View style={styles.focusContainer}>
            <View style={styles.frameBox}>
              <View style={[styles.corner, styles.tl]} />
              <View style={[styles.corner, styles.tr]} />
              <View style={[styles.corner, styles.bl]} />
              <View style={[styles.corner, styles.br]} />
            </View>
            <View style={styles.hintBadge}>
              <BlurView intensity={25} tint="dark" style={StyleSheet.absoluteFill} />
              <Text style={styles.hintText}>
                {mode === DETECTION_MODES.OBJECT ? t(lang, 'focusPest') : t(lang, 'focusDamage')}
              </Text>
            </View>
          </View>

          {/* BOTTOM CONTROLS */}
          <LinearGradient colors={['transparent', 'rgba(0,0,0,0.7)']} style={styles.bottomBar}>
            {/* Mode Switcher */}
            <View style={styles.modeSwitcher}>
              <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
              <TouchableOpacity 
                style={[styles.modeBtn, mode === DETECTION_MODES.OBJECT && { backgroundColor: colors.primary }]}
                onPress={() => setMode(DETECTION_MODES.OBJECT)}
              >
                <Text style={[styles.modeText, mode === DETECTION_MODES.OBJECT && styles.activeModeText]}>
                  {t(lang, 'pestMode')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modeBtn, mode === DETECTION_MODES.SEGMENTATION && { backgroundColor: colors.primary }]}
                onPress={() => setMode(DETECTION_MODES.SEGMENTATION)}
              >
                <Text style={[styles.modeText, mode === DETECTION_MODES.SEGMENTATION && styles.activeModeText]}>
                  {t(lang, 'damageMode')}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Shutter */}
            <View style={styles.shutterRow}>
              <View style={{ width: 40 }} /> 
              <TouchableOpacity 
                onPress={takePicture} 
                style={[styles.shutterOuter, isTakingPicture && { opacity: 0.5 }]}
                disabled={isTakingPicture}
                activeOpacity={0.7}
              >
                <View style={styles.shutterInner} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.glassCircle} onPress={pickFromGallery}>
                 <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
                 <Ionicons name="images-outline" size={24} color="white" />
              </TouchableOpacity>
            </View>
          </LinearGradient>

        </SafeAreaView>
      </CameraView>

      {/* TREE SELECTION MODAL */}
      <Modal visible={showTreeModal} transparent animationType="slide">
        <TouchableOpacity 
          style={styles.modalBg} 
          activeOpacity={1} 
          onPress={() => setShowTreeModal(false)}
        >
          <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
            <View style={[styles.modalContent, { backgroundColor: settings.darkMode ? 'rgba(24,24,27,0.97)' : 'rgba(255,255,255,0.97)' }]}>
              <View style={styles.modalHandle} />
              <Text style={[styles.modalTitle, { color: colors.text.primary }]}>{t(lang, 'selectTree')}</Text>
              <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
                {TREE_TYPES.map(tree => {
                  const isSelected = selectedTree.id === tree.id;
                  const treeName = t(lang, tree.labelKey);
                  const treeLatin = t(lang, tree.labelKey + 'Latin') !== (tree.labelKey + 'Latin') ? t(lang, tree.labelKey + 'Latin') : '';
                  return (
                    <TouchableOpacity 
                      key={tree.id} 
                      style={[
                        styles.treeOption, 
                        { borderBottomColor: settings.darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' },
                        isSelected && { backgroundColor: settings.darkMode ? 'rgba(34, 197, 94, 0.12)' : 'rgba(22, 101, 52, 0.08)' }
                      ]}
                      onPress={() => { setSelectedTree(tree); setShowTreeModal(false); }}
                    >
                      <View style={styles.treeOptionLeft}>
                        <Text style={{ fontSize: 24, marginRight: 12 }}>{tree.icon}</Text>
                        <View>
                          <Text style={[
                            styles.treeOptionText, 
                            { color: colors.text.primary },
                            isSelected && { color: colors.primary, fontWeight: '600' }
                          ]}>
                            {treeName}
                          </Text>
                          {treeLatin ? (
                            <Text style={[styles.treeLatinText, { color: colors.text.secondary }]}>{treeLatin}</Text>
                          ) : null}
                        </View>
                      </View>
                      {isSelected && (
                        <View style={[styles.checkBadge, { backgroundColor: colors.primary }]}>
                          <Ionicons name="checkmark" size={16} color="white" />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              <TouchableOpacity style={styles.closeModal} onPress={() => setShowTreeModal(false)}>
                <Text style={[styles.closeText, { color: colors.text.secondary }]}>{t(lang, 'cancel')}</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'black' },
  camera: { flex: 1 },
  overlay: { flex: 1, justifyContent: 'space-between' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  headerBar: { flexDirection: 'row', justifyContent: 'space-between', padding: SPACING.m, alignItems: 'center' },
  glassCircle: { width: 40, height: 40, borderRadius: RADIUS.full, justifyContent: 'center', alignItems: 'center', overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)', backgroundColor: 'rgba(255,255,255,0.08)' },
  glassPill: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 16, borderRadius: RADIUS.full, gap: 8, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)', backgroundColor: 'rgba(255,255,255,0.08)' },
  treeText: { color: 'white', fontWeight: '600', fontSize: 14 },

  focusContainer: { flex: 1, margin: 40, justifyContent: 'center', alignItems: 'center' },
  frameBox: { width: '100%', aspectRatio: 1, position: 'relative' },
  corner: { position: 'absolute', width: 24, height: 24, borderColor: 'white', borderWidth: 3 },
  tl: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
  tr: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
  bl: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
  br: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },
  hintBadge: { marginTop: SPACING.l, overflow: 'hidden', borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', backgroundColor: 'rgba(255,255,255,0.06)' },
  hintText: { color: 'rgba(255,255,255,0.9)', fontSize: 12, paddingVertical: 6, paddingHorizontal: 12 },

  bottomBar: { padding: SPACING.l, alignItems: 'center', gap: SPACING.l },
  modeSwitcher: { flexDirection: 'row', borderRadius: RADIUS.full, padding: 4, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)', backgroundColor: 'rgba(255,255,255,0.08)' },
  modeBtn: { paddingVertical: 6, paddingHorizontal: 16, borderRadius: RADIUS.full },
  modeText: { color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: '600' },
  activeModeText: { color: 'white' },

  shutterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' },
  shutterOuter: { width: 72, height: 72, borderRadius: RADIUS.full, borderWidth: 4, borderColor: 'white', justifyContent: 'center', alignItems: 'center' },
  shutterInner: { width: 56, height: 56, borderRadius: RADIUS.full, backgroundColor: 'white' },

  modalBg: { flex: 1, justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, padding: SPACING.l },
  modalHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(128,128,128,0.3)', alignSelf: 'center', marginBottom: SPACING.m },
  modalTitle: { fontSize: 20, fontWeight: '600', marginBottom: SPACING.m, textAlign: 'center' },
  treeOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: SPACING.m, paddingHorizontal: SPACING.s, borderBottomWidth: 1, borderRadius: RADIUS.m },
  treeOptionLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  treeOptionText: { fontSize: 16 },
  treeLatinText: { fontSize: 12, fontStyle: 'italic', marginTop: 2 },
  checkBadge: { width: 26, height: 26, borderRadius: RADIUS.full, justifyContent: 'center', alignItems: 'center' },
  closeModal: { marginTop: SPACING.l, alignItems: 'center', padding: SPACING.m },
  closeText: { fontWeight: '600' },
  permButton: { 
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14, 
    paddingHorizontal: 24, 
    borderRadius: RADIUS.m 
  },
});

export default CameraScreen;