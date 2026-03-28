// src/screens/CameraScreen.js
import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, StatusBar, Alert, ScrollView, Image, Dimensions, PanResponder } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import Svg, { Path } from 'react-native-svg';

import { SPACING, RADIUS } from '../constants/theme';
import { ROUTES } from '../constants/routes';
import { TREE_TYPES } from '../services/aiServices';
import { useSettings } from '../context/SettingsContext';
import { t } from '../utils/i18n';

const SCREEN_WIDTH = Dimensions.get('window').width;
// Klasický poměr stran kamery 4:3
const CAMERA_HEIGHT = SCREEN_WIDTH * (4 / 3); 

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
  
  // Stavy pro kreslení zakroužkování
  const [currentPath, setCurrentPath] = useState([]);
  const [boundingBox, setBoundingBox] = useState(null);

  // --- LOGIKA KRESLENÍ (PAN RESPONDER) ---
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        // Uživatel se dotkl obrazovky, začínáme novou čáru a mažeme starý box
        const { locationX, locationY } = evt.nativeEvent;
        setCurrentPath([{ x: locationX, y: locationY }]);
        setBoundingBox(null);
      },
      onPanResponderMove: (evt) => {
        // Uživatel táhne prstem
        const { locationX, locationY } = evt.nativeEvent;
        setCurrentPath(prev => [...prev, { x: locationX, y: locationY }]);
      },
      onPanResponderRelease: () => {
        // Uživatel pustil prst, vypočítáme Bounding Box (Nejmenší a největší X, Y)
        setCurrentPath(prev => {
          if (prev.length > 2) {
            const xs = prev.map(p => p.x);
            const ys = prev.map(p => p.y);
            const minX = Math.min(...xs);
            const maxX = Math.max(...xs);
            const minY = Math.min(...ys);
            const maxY = Math.max(...ys);
            
            setBoundingBox({
              minX, minY, maxX, maxY,
              width: maxX - minX,
              height: maxY - minY,
              // Procentuální uložení pro AI
              percentMinX: minX / SCREEN_WIDTH,
              percentMinY: minY / CAMERA_HEIGHT,
              percentMaxX: maxX / SCREEN_WIDTH,
              percentMaxY: maxY / CAMERA_HEIGHT,
            });
          }
          // Čáru necháme na displeji, aby uživatel viděl, co zakroužkoval
          return prev; 
        });
      }
    })
  ).current;

  // Generování SVG Path stringu z pole bodů
  const pathData = currentPath.length > 0 
    ? `M ${currentPath[0].x} ${currentPath[0].y} ` + currentPath.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ')
    : '';

  // --- FUNKCE KAMERY ---
  const toggleFacing = () => {
    setFacing(f => f === 'back' ? 'front' : 'back');
    if (facing === 'back' && flash === 'on') setFlash('off');
  };

  const takePicture = async () => {
    if (!cameraRef.current || isTakingPicture) return;
    try {
      setIsTakingPicture(true);
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.7 });
      if (photo?.uri) {
        setCapturedPhoto(photo);
        setCurrentPath([]);
        setBoundingBox(null);
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
        setCurrentPath([]);
        setBoundingBox(null);
      }
    } catch (e) {
      Alert.alert(t(lang, 'error'), t(lang, 'galleryError'));
    }
  };

  const confirmAnalysis = () => {
    if (!boundingBox) {
      Alert.alert("Nápověda", "Prosím, zakroužkujte prstem požerek na fotografii, aby ho AI mohla vyříznout.");
      return;
    }
    
    // Posíláme do AnalysisScreen fotku i přesné procentuální souřadnice boxu
    navigation.navigate(ROUTES.ANALYSIS, { 
      imageUri: capturedPhoto.uri, 
      treeType: selectedTree.id,
      samBox: boundingBox
    });
    setCapturedPhoto(null);
  };


  if (!permission) return <View style={styles.container} />;
  if (!permission.granted) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: 'white' }}>Potřebujeme přístup ke kameře</Text>
        <TouchableOpacity onPress={requestPermission} style={styles.permButton}>
          <Text style={{ color: 'white' }}>Povolit</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // ==========================================
  // NÁHLED PO VYFOCENÍ (Režim zakroužkování)
  // ==========================================
  if (capturedPhoto) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        
        {/* HORNÍ PRUH */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => setCapturedPhoto(null)} style={styles.iconButton}>
            <Ionicons name="arrow-back" size={28} color="white" />
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>Označte požerek</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* PROSTOR PRO FOTKU 4:3 A KRESLENÍ */}
        <View style={styles.cameraWrapper} {...panResponder.panHandlers}>
          <Image 
            source={{ uri: capturedPhoto.uri }} 
            style={styles.cameraView} 
            resizeMode="cover" 
          />
          
          {/* Překryvná vrstva pro kreslení SVG */}
          <View style={StyleSheet.absoluteFill}>
            <Svg height="100%" width="100%">
              {pathData ? (
                <Path d={pathData} fill="none" stroke="#EF4444" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
              ) : null}
              {/* Volitelně vykreslíme i ten vypočítaný box pro debug/efekt */}
              {boundingBox && (
                <View style={{
                  position: 'absolute',
                  left: boundingBox.minX,
                  top: boundingBox.minY,
                  width: boundingBox.width,
                  height: boundingBox.height,
                  borderWidth: 2,
                  borderColor: 'rgba(239, 68, 68, 0.4)',
                  borderStyle: 'dashed',
                  backgroundColor: 'rgba(239, 68, 68, 0.1)'
                }} />
              )}
            </Svg>
          </View>
        </View>

        {/* SPODNÍ PRUH S TLAČÍTKEM */}
        <View style={styles.bottomBar}>
          <Text style={styles.instructionText}>
            Zakroužkujte nebo přeškrtněte poškozenou část kůry prstem.
          </Text>
          <TouchableOpacity 
            style={[styles.confirmBtn, !boundingBox && { opacity: 0.5 }]} 
            onPress={confirmAnalysis}
          >
            <Text style={styles.confirmBtnText}>Potvrdit a analyzovat</Text>
            <Ionicons name="sparkles" size={20} color="white" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ==========================================
  // ŽIVÁ KAMERA (Klasický nativní vzhled)
  // ==========================================
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* HORNÍ PRUH (Nastavení) */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
          <Ionicons name="close" size={28} color="white" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.treeSelector} onPress={() => setShowTreeModal(true)}>
          <Text style={styles.treeSelectorText}>{selectedTree.label}</Text>
          <Ionicons name="chevron-down" size={16} color="white" style={{ marginLeft: 4 }} />
        </TouchableOpacity>

        <TouchableOpacity onPress={() => { if (facing !== 'front') setFlash(f => f === 'off' ? 'on' : 'off'); }} style={styles.iconButton}>
          <Ionicons name={flash === 'on' ? "flash" : "flash-off"} size={24} color={flash === 'on' ? '#FBBF24' : 'white'} />
        </TouchableOpacity>
      </View>

      {/* PROSTOR PRO KAMERU 4:3 */}
      <View style={styles.cameraWrapper}>
        <CameraView style={styles.cameraView} ref={cameraRef} flash={flash} facing={facing} enableTorch={flash === 'on' && facing === 'back'} />
      </View>

      {/* SPODNÍ PRUH (Spoušť a galerie) */}
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

      {/* MODAL PRO VÝBĚR STROMU (Zjednodušený) */}
      <Modal visible={showTreeModal} transparent animationType="fade">
        <TouchableOpacity style={styles.modalBg} activeOpacity={1} onPress={() => setShowTreeModal(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Vyberte druh dřeviny</Text>
            <ScrollView>
              {TREE_TYPES.map(tree => (
                <TouchableOpacity key={tree.id} style={styles.treeOption} onPress={() => { setSelectedTree(tree); setShowTreeModal(false); }}>
                  <Text style={[styles.treeOptionText, selectedTree.id === tree.id && { color: '#22C55E', fontWeight: 'bold' }]}>
                    {tree.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  // Nový layout
  topBar: { height: 60, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16 },
  topBarTitle: { color: 'white', fontSize: 18, fontWeight: '600' },
  iconButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  treeSelector: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  treeSelectorText: { color: 'white', fontSize: 14, fontWeight: '600' },

  cameraWrapper: { width: SCREEN_WIDTH, height: CAMERA_HEIGHT, backgroundColor: '#111', overflow: 'hidden' },
  cameraView: { flex: 1 },

  bottomBar: { flex: 1, flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'center', paddingHorizontal: 20 },
  sideButton: { width: 50, height: 50, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 25 },
  
  shutterOuter: { width: 80, height: 80, borderRadius: 40, borderWidth: 4, borderColor: 'white', justifyContent: 'center', alignItems: 'center' },
  shutterInner: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'white' },

  instructionText: { position: 'absolute', top: 20, width: '100%', textAlign: 'center', color: 'rgba(255,255,255,0.7)', fontSize: 14 },
  confirmBtn: { flexDirection: 'row', backgroundColor: '#22C55E', paddingVertical: 16, paddingHorizontal: 32, borderRadius: 30, alignItems: 'center', gap: 10, marginTop: 30 },
  confirmBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold' },

  permButton: { backgroundColor: '#22C55E', padding: 15, borderRadius: 8, marginTop: 20 },

  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#18181B', borderRadius: 16, padding: 20 },
  modalTitle: { color: 'white', fontSize: 18, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
  treeOption: { paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#27272A' },
  treeOptionText: { color: 'white', fontSize: 16, textAlign: 'center' }
});

export default CameraScreen;