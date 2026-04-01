/**
 * @file CameraScreen.js
 * @description Camera screen with live preview, tree species selector, flash/facing
 *              toggles, gallery picker, and photo preview before segmentation.
 */
import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, TouchableWithoutFeedback,
  Modal, StatusBar, Alert, ScrollView, Image, ActivityIndicator,
  Animated, PanResponder,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

import { ROUTES } from '../constants/routes';
import { TREE_TYPES, detectWithTTA } from '../services/aiServices';
import { useSettings } from '../context/SettingsContext';
import { t } from '../utils/i18n';
import { getTreeDisplayLabel } from '../utils/formatters';
import styles, { SCREEN_WIDTH, CAMERA_HEIGHT } from './styles/CameraScreen.styles';

const MIN_CROP_SIZE = 80;
const clamp = (val, min, max) => Math.max(min, Math.min(max, val));

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
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState(null);

  // Tap-to-focus visual indicator
  const [focusPoint, setFocusPoint] = useState(null);
  const focusAnim = useRef(new Animated.Value(0)).current;

  // Modal animation
  const modalAnim = useRef(new Animated.Value(0)).current;

  // Crop state
  const [cropMode, setCropMode] = useState(false);
  const [cropRect, setCropRect] = useState({ x: 30, y: 30, w: SCREEN_WIDTH - 60, h: CAMERA_HEIGHT - 60 });
  const cropRectRef = useRef({ x: 30, y: 30, w: SCREEN_WIDTH - 60, h: CAMERA_HEIGHT - 60 });
  const cropStartRef = useRef({ x: 0, y: 0, w: 0, h: 0 });

  // Tree selector hint animation
  const hintAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(hintAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
        Animated.timing(hintAnim, { toValue: 0, duration: 1200, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  // ---- Crop PanResponders ----
  const computeCropRect = (corner, start, dx, dy) => {
    const cW = SCREEN_WIDTH;
    const cH = CAMERA_HEIGHT;
    const { x, y, w, h } = start;
    switch (corner) {
      case 'tl': {
        const nx = clamp(x + dx, 0, x + w - MIN_CROP_SIZE);
        const ny = clamp(y + dy, 0, y + h - MIN_CROP_SIZE);
        return { x: nx, y: ny, w: x + w - nx, h: y + h - ny };
      }
      case 'tr': {
        const nw = clamp(w + dx, MIN_CROP_SIZE, cW - x);
        const ny = clamp(y + dy, 0, y + h - MIN_CROP_SIZE);
        return { x, y: ny, w: nw, h: y + h - ny };
      }
      case 'bl': {
        const nx = clamp(x + dx, 0, x + w - MIN_CROP_SIZE);
        const nh = clamp(h + dy, MIN_CROP_SIZE, cH - y);
        return { x: nx, y, w: x + w - nx, h: nh };
      }
      case 'br': {
        const nw = clamp(w + dx, MIN_CROP_SIZE, cW - x);
        const nh = clamp(h + dy, MIN_CROP_SIZE, cH - y);
        return { x, y, w: nw, h: nh };
      }
      case 'move': {
        return { x: clamp(x + dx, 0, cW - w), y: clamp(y + dy, 0, cH - h), w, h };
      }
      default: return { x, y, w, h };
    }
  };

  const makeCropPR = (corner) => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: () => { cropStartRef.current = { ...cropRectRef.current }; },
    onPanResponderMove: (_, { dx, dy }) => {
      const r = computeCropRect(corner, cropStartRef.current, dx, dy);
      cropRectRef.current = r;
      setCropRect(r);
    },
  });

  const cropPRs = useRef({
    tl: makeCropPR('tl'), tr: makeCropPR('tr'),
    bl: makeCropPR('bl'), br: makeCropPR('br'),
    move: makeCropPR('move'),
  }).current;

  // ---- Camera controls ----
  const toggleFacing = () => {
    setFlash('off');
    setFacing(f => f === 'back' ? 'front' : 'back');
  };

  const handleTapToFocus = (evt) => {
    const { locationX, locationY } = evt.nativeEvent;
    setFocusPoint({ x: locationX, y: locationY });
    focusAnim.setValue(0);
    Animated.sequence([
      Animated.timing(focusAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(800),
      Animated.timing(focusAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => setFocusPoint(null));
  };

  // ---- Modal animation ----
  const openTreeModalAnimated = () => {
    setShowTreeModal(true);
    modalAnim.setValue(0);
    Animated.spring(modalAnim, { toValue: 1, useNativeDriver: true, tension: 65, friction: 10 }).start();
  };

  const closeTreeModalAnimated = () => {
    Animated.timing(modalAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
      setShowTreeModal(false);
    });
  };

  const takePicture = async () => {
    if (!cameraRef.current || isTakingPicture) return;
    try {
      setIsTakingPicture(true);
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.7 });
      if (photo?.uri) {
        setCapturedPhoto(photo);
      }
    } catch (e) {
      Alert.alert(t(lang, 'error'), t(lang, 'photoError'));
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

  const confirmAndSegment = async () => {
    setFlash('off');
    setIsAnalyzing(true);
    try {
      const result = await detectWithTTA(capturedPhoto.uri, selectedTree.id);
      if (!result) {
        Alert.alert(t(lang, 'error'), t(lang, 'analysisFailed'));
        setIsAnalyzing(false);
        return;
      }
      navigation.navigate(ROUTES.ANALYSIS, {
        imageUri: capturedPhoto.uri,
        treeType: selectedTree.id,
        result,
      });
      setCapturedPhoto(null);
    } catch (err) {
      Alert.alert(t(lang, 'error'), err?.message || t(lang, 'analysisFailed'));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const initCrop = () => {
    const r = { x: 30, y: 30, w: SCREEN_WIDTH - 60, h: CAMERA_HEIGHT - 60 };
    cropRectRef.current = r;
    setCropRect(r);
    setCropMode(true);
  };

  const applyCrop = async () => {
    if (!capturedPhoto) return;
    const { width: imgW, height: imgH } = capturedPhoto;
    const cW = SCREEN_WIDTH;
    const cH = CAMERA_HEIGHT;
    const imgAspect = imgW / imgH;
    const containerAspect = cW / cH;
    let scale, offX = 0, offY = 0;
    if (imgAspect > containerAspect) {
      scale = imgH / cH;
      offX = ((imgW / scale) - cW) / 2;
    } else {
      scale = imgW / cW;
      offY = ((imgH / scale) - cH) / 2;
    }
    const { x, y, w, h } = cropRectRef.current;
    const oX = clamp(Math.round((x + offX) * scale), 0, imgW - 1);
    const oY = clamp(Math.round((y + offY) * scale), 0, imgH - 1);
    const cropW = Math.min(Math.round(w * scale), imgW - oX);
    const cropH = Math.min(Math.round(h * scale), imgH - oY);
    try {
      const res = await manipulateAsync(
        capturedPhoto.uri,
        [{ crop: { originX: oX, originY: oY, width: cropW, height: cropH } }],
        { compress: 0.7, format: SaveFormat.JPEG }
      );
      setCapturedPhoto({ uri: res.uri, width: res.width, height: res.height });
      setCropMode(false);
    } catch (e) {
      Alert.alert(t(lang, 'error'), t(lang, 'photoError'));
    }
  };

  if (!permission) return <View style={styles.container} />;
  if (!permission.granted) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.text.primary }}>{t(lang, 'cameraAccessDesc')}</Text>
        <TouchableOpacity onPress={requestPermission} style={styles.permButton}>
          <Text style={{ color: 'white' }}>{t(lang, 'allowAccess')}</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // ==========================================
  // CROP MODE
  // ==========================================
  if (capturedPhoto && cropMode) {
    const { x, y, w, h } = cropRect;
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => setCropMode(false)} style={styles.iconButton}>
            <Ionicons name="close" size={28} color="white" />
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>{t(lang, 'cropPhoto') || 'Crop'}</Text>
          <TouchableOpacity onPress={applyCrop} style={styles.iconButton}>
            <Ionicons name="checkmark" size={28} color="#22C55E" />
          </TouchableOpacity>
        </View>
        <View style={styles.cameraWrapper}>
          <Image source={{ uri: capturedPhoto.uri }} style={styles.cameraView} resizeMode="cover" />
          <View style={[styles.cropMask, { top: 0, left: 0, right: 0, height: y }]} />
          <View style={[styles.cropMask, { top: y + h, left: 0, right: 0, bottom: 0 }]} />
          <View style={[styles.cropMask, { top: y, left: 0, width: x, height: h }]} />
          <View style={[styles.cropMask, { top: y, left: x + w, right: 0, height: h }]} />
          <View style={[styles.cropBorder, { left: x, top: y, width: w, height: h }]} pointerEvents="none" />
          <View style={[styles.cropGridH, { left: x, top: y + h / 3, width: w }]} pointerEvents="none" />
          <View style={[styles.cropGridH, { left: x, top: y + (2 * h) / 3, width: w }]} pointerEvents="none" />
          <View style={[styles.cropGridV, { left: x + w / 3, top: y, height: h }]} pointerEvents="none" />
          <View style={[styles.cropGridV, { left: x + (2 * w) / 3, top: y, height: h }]} pointerEvents="none" />
          <View
            style={{ position: 'absolute', left: x + 20, top: y + 20, width: Math.max(0, w - 40), height: Math.max(0, h - 40) }}
            {...cropPRs.move.panHandlers}
          />
          {[['tl', x - 15, y - 15], ['tr', x + w - 15, y - 15], ['bl', x - 15, y + h - 15], ['br', x + w - 15, y + h - 15]].map(([k, cx, cy]) => (
            <View key={k} style={[styles.cropHandle, { left: cx, top: cy }]} {...cropPRs[k].panHandlers} />
          ))}
        </View>
      </SafeAreaView>
    );
  }

  // ==========================================
  // PHOTO PREVIEW — confirm before segmentation
  // ==========================================
  if (capturedPhoto) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => setCapturedPhoto(null)} style={styles.iconButton}>
            <Ionicons name="arrow-back" size={28} color="white" />
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>{t(lang, 'photoPreview')}</Text>
          <TouchableOpacity onPress={initCrop} style={styles.iconButton}>
            <Ionicons name="crop" size={24} color="white" />
          </TouchableOpacity>
        </View>

        <View style={styles.cameraWrapper}>
          <Image 
            source={{ uri: capturedPhoto.uri }} 
            style={styles.cameraView} 
            resizeMode="cover" 
          />
        </View>

        <View style={styles.bottomBar}>
          <Text style={styles.instructionText}>
            {t(lang, 'photoPreviewHint')}
          </Text>
          <TouchableOpacity
            style={[styles.confirmBtn, isAnalyzing && { opacity: 0.5 }]}
            onPress={confirmAndSegment}
            disabled={isAnalyzing}
          >
            {isAnalyzing ? (
              <>
                <ActivityIndicator size="small" color="white" />
                <Text style={styles.confirmBtnText}>{t(lang, 'analyzing')}</Text>
              </>
            ) : (
              <>
                <Text style={styles.confirmBtnText}>{t(lang, 'startAnalysis')}</Text>
                <Ionicons name="sparkles" size={20} color="white" />
              </>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ==========================================
  // LIVE CAMERA
  // ==========================================
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
          <Ionicons name="close" size={28} color="white" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.treeSelector} onPress={openTreeModalAnimated}>
          <Ionicons name="leaf" size={14} color="#22C55E" style={{ marginRight: 6 }} />
          <Text style={styles.treeSelectorText}>{getTreeDisplayLabel(selectedTree, selectedTree.id, lang)}</Text>
          <Animated.View style={{ marginLeft: 6, transform: [{ translateY: hintAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 2] }) }] }}>
            <Ionicons name="chevron-down" size={16} color="white" />
          </Animated.View>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => { if (facing !== 'front') setFlash(f => f === 'off' ? 'on' : 'off'); }} style={styles.iconButton}>
          <Ionicons name={flash === 'on' ? "flash" : "flash-off"} size={24} color={flash === 'on' ? '#FBBF24' : 'white'} />
        </TouchableOpacity>
      </View>

      <TouchableWithoutFeedback onPress={handleTapToFocus}>
        <View style={styles.cameraWrapper}>
          <CameraView
            style={styles.cameraView}
            ref={cameraRef}
            facing={facing}
            {...(facing === 'back' ? { flash, enableTorch: flash === 'on' } : {})}
          />
          {focusPoint && (
            <Animated.View
              style={[styles.focusRing, {
                left: focusPoint.x - 30, top: focusPoint.y - 30,
                opacity: focusAnim,
                transform: [{ scale: focusAnim.interpolate({ inputRange: [0, 1], outputRange: [1.4, 1] }) }],
              }]}
            />
          )}
        </View>
      </TouchableWithoutFeedback>

      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.sideButton} onPress={pickFromGallery}>
           <Ionicons name="images-outline" size={28} color="white" />
        </TouchableOpacity>
        
        <TouchableOpacity onPress={takePicture} style={[styles.shutterOuter, isTakingPicture && { opacity: 0.5 }]} disabled={isTakingPicture}>
          <View style={styles.shutterInner} />
        </TouchableOpacity>
        
        <TouchableOpacity onPress={toggleFacing} style={styles.sideButton}>
          <Ionicons name="camera-reverse-outline" size={28} color="white" />
        </TouchableOpacity>
      </View>

      <Modal visible={showTreeModal} transparent animationType="none" onRequestClose={closeTreeModalAnimated}>
        <TouchableOpacity style={styles.modalBg} activeOpacity={1} onPress={closeTreeModalAnimated}>
          <Animated.View style={[
            styles.modalContent,
            {
              opacity: modalAnim,
              transform: [
                { scale: modalAnim.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) },
                { translateY: modalAnim.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) },
              ],
            },
          ]}>
            <Text style={styles.modalTitle}>{t(lang, 'selectTree')}</Text>

            <ScrollView>
              {TREE_TYPES.map(tree => (
                <TouchableOpacity key={tree.id} style={styles.treeOption} onPress={() => { setSelectedTree(tree); closeTreeModalAnimated(); }}>
                  <Text style={[styles.treeOptionText, selectedTree.id === tree.id && { color: '#22C55E', fontWeight: 'bold' }]}>
                    {getTreeDisplayLabel(tree, tree.id, lang)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Animated.View>
        </TouchableOpacity>
      </Modal>

    </SafeAreaView>
  );
};

export default CameraScreen;