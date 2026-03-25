// src/screens/CameraScreen.js
import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, StatusBar, Alert, ScrollView, Image, Dimensions } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

import { SPACING, RADIUS } from '../constants/theme';
import { ROUTES } from '../constants/routes';
import { TREE_TYPES } from '../services/aiServices';
import { useSettings } from '../context/SettingsContext';
import { t } from '../utils/i18n';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const CameraScreen = ({ navigation }) => {
  const { settings, colors } = useSettings();
  const lang = settings.language;

  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef(null);
  const [selectedTree, setSelectedTree] = useState(TREE_TYPES[0]);
  const [flash, setFlash] = useState('off');
  const [facing, setFacing] = useState('back');
  const [showTreeModal, setShowTreeModal] = useState(false);
  const [isTakingPicture, setIsTakingPicture] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [previewLayout, setPreviewLayout] = useState(null);
  const [focusLayout, setFocusLayout] = useState(null);
  const [frameLayout, setFrameLayout] = useState(null);

  const toggleFacing = () => {
    setFacing(f => f === 'back' ? 'front' : 'back');
    if (facing === 'back' && flash === 'on') setFlash('off');
  };

  const cropPhotoToIndicatorSquare = async (photo) => {
    if (!photo?.uri || !photo?.width || !photo?.height || !previewLayout || !focusLayout || !frameLayout) {
      return photo;
    }

    const frameXInPreview = focusLayout.x + frameLayout.x;
    const frameYInPreview = focusLayout.y + frameLayout.y;
    const frameWidthInPreview = frameLayout.width;
    const frameHeightInPreview = frameLayout.height;

    const scale = Math.max(
      previewLayout.width / photo.width,
      previewLayout.height / photo.height
    );

    const displayedWidth = photo.width * scale;
    const displayedHeight = photo.height * scale;
    const offsetX = (previewLayout.width - displayedWidth) / 2;
    const offsetY = (previewLayout.height - displayedHeight) / 2;

    let cropX = (frameXInPreview - offsetX) / scale;
    let cropY = (frameYInPreview - offsetY) / scale;
    let cropWidth = frameWidthInPreview / scale;
    let cropHeight = frameHeightInPreview / scale;

    const side = Math.max(1, Math.round(Math.min(cropWidth, cropHeight)));
    cropX += (cropWidth - side) / 2;
    cropY += (cropHeight - side) / 2;

    const maxX = Math.max(0, photo.width - side);
    const maxY = Math.max(0, photo.height - side);
    cropX = Math.max(0, Math.min(cropX, maxX));
    cropY = Math.max(0, Math.min(cropY, maxY));

    return manipulateAsync(
      photo.uri,
      [{ crop: { originX: Math.round(cropX), originY: Math.round(cropY), width: side, height: side } }],
      { format: SaveFormat.JPEG, compress: 0.9 }
    );
  };

  const takePicture = async () => {
    if (!cameraRef.current || isTakingPicture) return;
    try {
      setIsTakingPicture(true);
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.7 });
      
      if (photo?.uri) {
        const squaredPhoto = await cropPhotoToIndicatorSquare(photo);
        setCapturedPhoto(squaredPhoto);
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
      });
      if (!result.canceled && result.assets?.[0]?.uri) {
        setCapturedPhoto(result.assets[0]);
      }
    } catch (e) {
      Alert.alert(t(lang, 'error'), t(lang, 'galleryError'));
    }
  };

  if (!permission) return <View style={styles.container} />;
  if (!permission.granted) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: colors.background }]}>
        <Ionicons name="camera-outline" size={64} color={colors.text.secondary} style={{ marginBottom: SPACING.m }} />
        <Text style={{ fontSize: 20, fontWeight: '600', color: colors.text.primary, marginBottom: SPACING.s, textAlign: 'center' }}>{t(lang, 'cameraAccess')}</Text>
        <TouchableOpacity onPress={requestPermission} style={[styles.permButton, { backgroundColor: colors.primary }]}>
          <Text style={{ color: 'white', fontWeight: '600', fontSize: 16 }}>{t(lang, 'allowAccess')}</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const treeDisplayName = t(lang, selectedTree.labelKey) !== selectedTree.labelKey ? t(lang, selectedTree.labelKey) : selectedTree.label;

  // NÁHLED PO VYFOCENÍ
  if (capturedPhoto) {
    return (
      <View style={styles.container}>
        <StatusBar hidden />
        <View style={{ flex: 1, backgroundColor: 'black' }}>
          <Image source={{ uri: capturedPhoto.uri }} style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT }} resizeMode="cover" />
        </View>

        <SafeAreaView style={styles.previewTopBar}>
          <TouchableOpacity onPress={() => setCapturedPhoto(null)} style={styles.glassCircle}>
            <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
            <Ionicons name="trash-outline" size={20} color="white" />
          </TouchableOpacity>
        </SafeAreaView>

        <SafeAreaView style={styles.previewBottomBar}>
          <TouchableOpacity style={styles.confirmBtn} onPress={() => {
            navigation.navigate(ROUTES.ANALYSIS, { 
              imageUri: capturedPhoto.uri, 
              treeType: selectedTree.id 
            });
            setCapturedPhoto(null);
          }}>
            <Text style={styles.confirmBtnText}>Spustit AI Analýzu</Text>
            <Ionicons name="sparkles" size={20} color="white" />
          </TouchableOpacity>
        </SafeAreaView>
      </View>
    );
  }

  // ŽIVÁ KAMERA
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <CameraView style={styles.camera} ref={cameraRef} flash={flash} facing={facing} enableTorch={flash === 'on' && facing === 'back'}>
        <SafeAreaView style={styles.overlay} onLayout={(e) => setPreviewLayout(e.nativeEvent.layout)}>
          
          <View style={styles.headerBar}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.glassCircle}>
              <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
              <Ionicons name="close" size={24} color="white" />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.glassPill} onPress={() => setShowTreeModal(true)}>
              <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
              <Text style={{ fontSize: 16 }}>🌲</Text>
              <Text style={styles.treeText}>{treeDisplayName}</Text>
              <Ionicons name="chevron-down" size={12} color="white" />
            </TouchableOpacity>

            <TouchableOpacity onPress={() => { if (facing !== 'front') setFlash(f => f === 'off' ? 'on' : 'off'); }} style={[styles.glassCircle, facing === 'front' && { opacity: 0.4 }]}>
              <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
              <Ionicons name={flash === 'on' ? "flash" : "flash-off"} size={20} color={flash === 'on' ? '#FBBF24' : 'white'} />
            </TouchableOpacity>
          </View>

          <View style={styles.focusContainer} onLayout={(e) => setFocusLayout(e.nativeEvent.layout)}>
            <View style={styles.frameBox} onLayout={(e) => setFrameLayout(e.nativeEvent.layout)}>
              <View style={[styles.corner, styles.tl]} />
              <View style={[styles.corner, styles.tr]} />
              <View style={[styles.corner, styles.bl]} />
              <View style={[styles.corner, styles.br]} />
            </View>
            <View style={styles.hintBadge}>
              <BlurView intensity={25} tint="dark" style={StyleSheet.absoluteFill} />
              <Text style={styles.hintText}>Zaměřte detail požerku do středu</Text>
            </View>
          </View>

          <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={styles.bottomBar}>
            <View style={styles.shutterRow}>
              <TouchableOpacity onPress={toggleFacing} style={styles.glassCircle}>
                <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
                <Ionicons name="camera-reverse-outline" size={22} color="white" />
              </TouchableOpacity>
              
              <TouchableOpacity onPress={takePicture} style={[styles.shutterOuter, isTakingPicture && { opacity: 0.5 }]} disabled={isTakingPicture}>
                <View style={styles.shutterInner} />
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.glassCircle} onPress={pickFromGallery}>
                 <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
                 <Ionicons name="images-outline" size={22} color="white" />
              </TouchableOpacity>
            </View>
          </LinearGradient>

        </SafeAreaView>
      </CameraView>

      {/* VÝBĚR STROMU */}
      <Modal visible={showTreeModal} transparent animationType="slide">
        <TouchableOpacity style={styles.modalBg} activeOpacity={1} onPress={() => setShowTreeModal(false)}>
          <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
            <View style={[styles.modalContent, { backgroundColor: settings.darkMode ? 'rgba(24,24,27,0.97)' : 'rgba(255,255,255,0.97)' }]}>
              <View style={styles.modalHandle} />
              <Text style={[styles.modalTitle, { color: colors.text.primary }]}>{t(lang, 'selectTree')}</Text>
              <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
                {TREE_TYPES.map(tree => {
                  const isSelected = selectedTree.id === tree.id;
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
                      <Text style={[styles.treeOptionText, { color: colors.text.primary }, isSelected && { color: colors.primary, fontWeight: '600' }]}>
                        {t(lang, tree.labelKey) !== tree.labelKey ? t(lang, tree.labelKey) : tree.label}
                      </Text>
                      {isSelected && <Ionicons name="checkmark" size={20} color={colors.primary} />}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
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
  hintText: { color: 'rgba(255,255,255,0.9)', fontSize: 13, fontWeight: '500', paddingVertical: 8, paddingHorizontal: 16 },

  bottomBar: { padding: SPACING.xl, paddingBottom: SPACING.xxl, alignItems: 'center' },
  shutterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' },
  shutterOuter: { width: 72, height: 72, borderRadius: RADIUS.full, borderWidth: 4, borderColor: 'white', justifyContent: 'center', alignItems: 'center' },
  shutterInner: { width: 56, height: 56, borderRadius: RADIUS.full, backgroundColor: 'white' },

  previewTopBar: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', padding: SPACING.m },
  previewBottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: SPACING.l, paddingBottom: SPACING.xl, alignItems: 'center' },
  confirmBtn: { flexDirection: 'row', backgroundColor: '#2F5D3A', paddingVertical: 16, paddingHorizontal: 32, borderRadius: RADIUS.full, alignItems: 'center', gap: 12 },
  confirmBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold' },

  modalBg: { flex: 1, justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, padding: SPACING.l, paddingBottom: 40 },
  modalHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(128,128,128,0.3)', alignSelf: 'center', marginBottom: SPACING.m },
  modalTitle: { fontSize: 20, fontWeight: '600', marginBottom: SPACING.m, textAlign: 'center' },
  treeOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: SPACING.m, paddingHorizontal: SPACING.s, borderBottomWidth: 1 },
  treeOptionText: { fontSize: 16 },
});

export default CameraScreen;