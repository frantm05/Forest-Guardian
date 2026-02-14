// src/screens/CameraScreen.js
import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, StatusBar } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
//import { BlurView } from 'expo-blur'; // Pro "glassmorphism" efekt (volitelné, fallback je barva)

import { COLORS, SPACING, RADIUS, TYPOGRAPHY } from '../constants/theme';
import { ROUTES } from '../constants/routes';
import { TREE_TYPES, DETECTION_MODES } from '../services/aiServices';

const CameraScreen = ({ navigation }) => {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef(null);
  const [selectedTree, setSelectedTree] = useState(TREE_TYPES[0]);
  const [mode, setMode] = useState(DETECTION_MODES.OBJECT);
  const [flash, setFlash] = useState('off');
  const [showTreeModal, setShowTreeModal] = useState(false);

  if (!permission) return <View />;
  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={TYPOGRAPHY.body}>Potřebujeme přístup ke kameře.</Text>
        <TouchableOpacity onPress={requestPermission} style={styles.permButton}>
          <Text style={{color: 'white'}}>Povolit</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const takePicture = async () => {
    if (cameraRef.current) {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.7 });
      navigation.navigate(ROUTES.ANALYSIS, { imageUri: photo.uri, mode, treeType: selectedTree.id });
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <CameraView style={styles.camera} ref={cameraRef} flash={flash}>
        <SafeAreaView style={styles.overlay}>
          
          {/* HEADER BAR */}
          <View style={styles.headerBar}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
              <Ionicons name="close" size={24} color="white" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.treeSelector}
              onPress={() => setShowTreeModal(true)}
            >
              <MaterialCommunityIcons name="tree-outline" size={16} color="white" />
              <Text style={styles.treeText}>{selectedTree.label.split('(')[0]}</Text>
              <Ionicons name="chevron-down" size={12} color="white" />
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setFlash(f => f === 'off' ? 'on' : 'off')} style={styles.iconBtn}>
              <Ionicons name={flash === 'on' ? "flash" : "flash-off"} size={20} color="white" />
            </TouchableOpacity>
          </View>

          {/* FOCUS FRAME */}
          <View style={styles.focusContainer}>
            <View style={[styles.corner, styles.tl]} />
            <View style={[styles.corner, styles.tr]} />
            <View style={[styles.corner, styles.bl]} />
            <View style={[styles.corner, styles.br]} />
            <Text style={styles.hintText}>
              {mode === DETECTION_MODES.OBJECT ? "Zaměřte celého škůdce" : "Zaměřte detail požerku"}
            </Text>
          </View>

          {/* BOTTOM CONTROLS */}
          <View style={styles.bottomBar}>
            {/* Mode Switcher */}
            <View style={styles.modeSwitcher}>
              <TouchableOpacity 
                style={[styles.modeBtn, mode === DETECTION_MODES.OBJECT && styles.activeMode]}
                onPress={() => setMode(DETECTION_MODES.OBJECT)}
              >
                <Text style={[styles.modeText, mode === DETECTION_MODES.OBJECT && styles.activeModeText]}>Škůdce</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modeBtn, mode === DETECTION_MODES.SEGMENTATION && styles.activeMode]}
                onPress={() => setMode(DETECTION_MODES.SEGMENTATION)}
              >
                <Text style={[styles.modeText, mode === DETECTION_MODES.SEGMENTATION && styles.activeModeText]}>Požerek</Text>
              </TouchableOpacity>
            </View>

            {/* Shutter */}
            <View style={styles.shutterRow}>
              <View style={{width: 40}} /> 
              <TouchableOpacity onPress={takePicture} style={styles.shutterOuter}>
                <View style={styles.shutterInner} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.galleryBtn}>
                 <Ionicons name="images-outline" size={24} color="white" />
              </TouchableOpacity>
            </View>
          </View>

        </SafeAreaView>
      </CameraView>

      {/* TREE SELECTION MODAL */}
      <Modal visible={showTreeModal} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Vyberte dřevinu</Text>
            {TREE_TYPES.map(tree => (
              <TouchableOpacity 
                key={tree.id} 
                style={[styles.treeOption, selectedTree.id === tree.id && styles.selectedOption]}
                onPress={() => { setSelectedTree(tree); setShowTreeModal(false); }}
              >
                <Text style={[styles.treeOptionText, selectedTree.id === tree.id && {color: COLORS.primary}]}>
                  {tree.label}
                </Text>
                {selectedTree.id === tree.id && <Ionicons name="checkmark" size={20} color={COLORS.primary} />}
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.closeModal} onPress={() => setShowTreeModal(false)}>
              <Text style={styles.closeText}>Zrušit</Text>
            </TouchableOpacity>
          </View>
        </View>
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
  iconBtn: { width: 40, height: 40, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: RADIUS.full, justifyContent: 'center', alignItems: 'center' },
  treeSelector: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)', paddingVertical: 8, paddingHorizontal: 16, borderRadius: RADIUS.full, gap: 8 },
  treeText: { color: 'white', fontWeight: '600', fontSize: 14 },

  focusContainer: { flex: 1, margin: 40, justifyContent: 'center', alignItems: 'center' },
  corner: { position: 'absolute', width: 20, height: 20, borderColor: 'white', borderWidth: 3 },
  tl: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
  tr: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
  bl: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
  br: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },
  hintText: { color: 'rgba(255,255,255,0.8)', marginTop: 260, fontSize: 12, backgroundColor: 'rgba(0,0,0,0.5)', padding: 4, borderRadius: 4 },

  bottomBar: { padding: SPACING.l, alignItems: 'center', gap: SPACING.l, backgroundColor: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)' },
  modeSwitcher: { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: RADIUS.full, padding: 4 },
  modeBtn: { paddingVertical: 6, paddingHorizontal: 16, borderRadius: RADIUS.full },
  activeMode: { backgroundColor: COLORS.primary },
  modeText: { color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: '600' },
  activeModeText: { color: 'white' },

  shutterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' },
  shutterOuter: { width: 72, height: 72, borderRadius: RADIUS.full, borderWidth: 4, borderColor: 'white', justifyContent: 'center', alignItems: 'center' },
  shutterInner: { width: 56, height: 56, borderRadius: RADIUS.full, backgroundColor: 'white' },
  galleryBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },

  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: 'white', borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, padding: SPACING.l },
  modalTitle: { ...TYPOGRAPHY.h3, marginBottom: SPACING.m, textAlign: 'center' },
  treeOption: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: SPACING.m, borderBottomWidth: 1, borderColor: COLORS.border },
  treeOptionText: { fontSize: 16, color: COLORS.text.primary },
  selectedOption: { backgroundColor: '#f0fdf4' },
  closeModal: { marginTop: SPACING.l, alignItems: 'center', padding: SPACING.m },
  closeText: { color: COLORS.text.secondary, fontWeight: '600' },
  permButton: { marginTop: 20, backgroundColor: COLORS.primary, padding: 10, borderRadius: 8 }
});

export default CameraScreen;