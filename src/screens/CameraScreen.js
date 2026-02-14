// src/screens/CameraScreen.js
import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, FlatList, Image } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera'; // POZOR: Expo SDK 51 používá CameraView
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING, RADIUS, TYPOGRAPHY, SHADOWS } from '../constants/theme';
import { ROUTES } from '../constants/routes';
import { TREE_TYPES, DETECTION_MODES } from '../services/aiServices';
import ScreenWrapper from '../components/layout/ScreenWrapper';

// Ikonky (můžeš použít @expo/vector-icons, zde text pro jednoduchost)
const Icons = {
  Flip: '🔄',
  Flash: '⚡',
  Close: '✕',
  Bug: '🐞',
  Pattern: '〰️',
  Tree: '🌲'
};

const CameraScreen = ({ navigation }) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraRef, setCameraRef] = useState(null);
  const [selectedTree, setSelectedTree] = useState(TREE_TYPES[0]);
  const [mode, setMode] = useState(DETECTION_MODES.OBJECT);
  const [isTreeModalVisible, setTreeModalVisible] = useState(false);
  const [flash, setFlash] = useState('off');

  if (!permission) return <View />;
  if (!permission.granted) {
    return (
      <ScreenWrapper>
        <View style={styles.permissionContainer}>
          <Text style={TYPOGRAPHY.subHeader}>Potřebujeme přístup ke kameře</Text>
          <Text style={styles.permissionText}>Pro analýzu škůdců je nutné pořídit snímek.</Text>
          <TouchableOpacity style={styles.btnPrimary} onPress={requestPermission}>
            <Text style={styles.btnText}>Povolit Kameru</Text>
          </TouchableOpacity>
        </View>
      </ScreenWrapper>
    );
  }

  const takePicture = async () => {
    if (cameraRef) {
      try {
        const photo = await cameraRef.takePictureAsync({ quality: 0.7 });
        navigation.navigate(ROUTES.ANALYSIS, { 
          imageUri: photo.uri,
          mode: mode,
          treeType: selectedTree.id
        });
      } catch (error) {
        console.log(error);
      }
    }
  };

  // Komponenta pro výběr stromu (Modal)
  const renderTreeModal = () => (
    <Modal visible={isTreeModalVisible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Vyberte druh dřeviny</Text>
          <FlatList 
            data={TREE_TYPES}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity 
                style={[styles.treeItem, selectedTree.id === item.id && styles.treeItemActive]}
                onPress={() => {
                  setSelectedTree(item);
                  setTreeModalVisible(false);
                }}
              >
                <Text style={styles.treeEmoji}>🌲</Text>
                <Text style={[styles.treeLabel, selectedTree.id === item.id && {color: COLORS.primary}]}>
                  {item.label}
                </Text>
                {selectedTree.id === item.id && <Text style={{color: COLORS.primary}}>✓</Text>}
              </TouchableOpacity>
            )}
          />
          <TouchableOpacity 
            style={styles.modalCloseBtn}
            onPress={() => setTreeModalVisible(false)}
          >
            <Text style={styles.btnTextSecondary}>Zavřít</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <CameraView 
        style={styles.camera} 
        facing="back"
        flash={flash}
        ref={(ref) => setCameraRef(ref)}
      >
        <SafeAreaView style={styles.uiContainer}>
          
          {/* TOP BAR: Zavřít a Blesk */}
          <View style={styles.topBar}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
              <Text style={styles.iconText}>{Icons.Close}</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => setFlash(f => f === 'off' ? 'on' : 'off')} 
              style={[styles.iconButton, flash === 'on' && styles.activeIcon]}
            >
              <Text style={styles.iconText}>{Icons.Flash}</Text>
            </TouchableOpacity>
          </View>

          {/* MIDDLE: Indikátor stromu */}
          <TouchableOpacity style={styles.treeSelector} onPress={() => setTreeModalVisible(true)}>
            <Text style={styles.treeSelectorIcon}>{Icons.Tree}</Text>
            <View>
              <Text style={styles.treeSelectorLabel}>Analyzovaná dřevina</Text>
              <Text style={styles.treeSelectorValue}>{selectedTree.label.split('(')[0].trim()}</Text>
            </View>
            <Text style={styles.chevron}>▼</Text>
          </TouchableOpacity>

          {/* BOTTOM: Ovládání */}
          <View style={styles.bottomControls}>
            
            {/* Přepínač módů */}
            <View style={styles.modeSwitch}>
              <TouchableOpacity 
                style={[styles.modeBtn, mode === DETECTION_MODES.OBJECT && styles.modeBtnActive]}
                onPress={() => setMode(DETECTION_MODES.OBJECT)}
              >
                <Text style={styles.modeIcon}>{Icons.Bug}</Text>
                <Text style={[styles.modeText, mode === DETECTION_MODES.OBJECT && styles.modeTextActive]}>
                  Škůdce
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modeBtn, mode === DETECTION_MODES.SEGMENTATION && styles.modeBtnActive]}
                onPress={() => setMode(DETECTION_MODES.SEGMENTATION)}
              >
                <Text style={styles.modeIcon}>{Icons.Pattern}</Text>
                <Text style={[styles.modeText, mode === DETECTION_MODES.SEGMENTATION && styles.modeTextActive]}>
                  Požerek
                </Text>
              </TouchableOpacity>
            </View>

            {/* Spoušť */}
            <TouchableOpacity onPress={takePicture} style={styles.captureBtnOuter}>
              <View style={styles.captureBtnInner} />
            </TouchableOpacity>

          </View>
        </SafeAreaView>
      </CameraView>
      {renderTreeModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'black' },
  camera: { flex: 1 },
  uiContainer: { flex: 1, justifyContent: 'space-between', padding: SPACING.m },
  
  topBar: { flexDirection: 'row', justifyContent: 'space-between', marginTop: SPACING.s },
  iconButton: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center'
  },
  iconText: { fontSize: 20, color: 'white' },
  activeIcon: { backgroundColor: COLORS.accent },
  
  treeSelector: {
    alignSelf: 'center', flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)', padding: SPACING.s, borderRadius: RADIUS.l,
    marginTop: SPACING.l
  },
  treeSelectorIcon: { fontSize: 24, marginRight: SPACING.s },
  treeSelectorLabel: { color: '#ccc', fontSize: 10, textTransform: 'uppercase' },
  treeSelectorValue: { color: 'white', fontWeight: 'bold' },
  chevron: { color: 'white', marginLeft: SPACING.s, fontSize: 12 },

  bottomControls: { alignItems: 'center', paddingBottom: SPACING.l },
  
  modeSwitch: {
    flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.5)', 
    borderRadius: RADIUS.full, padding: 4, marginBottom: SPACING.xl
  },
  modeBtn: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 16,
    borderRadius: RADIUS.full
  },
  modeBtnActive: { backgroundColor: COLORS.surface },
  modeIcon: { marginRight: 6, fontSize: 16 },
  modeText: { color: '#ccc', fontWeight: '600' },
  modeTextActive: { color: COLORS.text.primary },

  captureBtnOuter: {
    width: 80, height: 80, borderRadius: 40, borderWidth: 4, borderColor: 'white',
    justifyContent: 'center', alignItems: 'center', ...SHADOWS.medium
  },
  captureBtnInner: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: 'white'
  },
  
  // Modal styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.surface, borderTopLeftRadius: RADIUS.l, borderTopRightRadius: RADIUS.l, padding: SPACING.l },
  modalTitle: { ...TYPOGRAPHY.subHeader, marginBottom: SPACING.m, textAlign: 'center' },
  treeItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.m, borderBottomWidth: 1, borderBottomColor: '#eee' },
  treeItemActive: { backgroundColor: COLORS.surfaceVariant },
  treeEmoji: { fontSize: 24, marginRight: SPACING.m },
  treeLabel: { ...TYPOGRAPHY.body, flex: 1 },
  modalCloseBtn: { marginTop: SPACING.l, alignItems: 'center', padding: SPACING.m },
  btnTextSecondary: { color: COLORS.text.secondary, fontWeight: 'bold' },
  
  permissionContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.xl },
  permissionText: { ...TYPOGRAPHY.body, textAlign: 'center', marginVertical: SPACING.m },
  btnPrimary: { backgroundColor: COLORS.primary, paddingVertical: SPACING.m, paddingHorizontal: SPACING.xl, borderRadius: RADIUS.m },
  btnText: { color: 'white', fontWeight: 'bold' }
});

export default CameraScreen;