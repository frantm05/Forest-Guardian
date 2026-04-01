/**
 * @file CameraScreen.styles.js
 * @description Style definitions for the CameraScreen component.
 */
import { StyleSheet, Dimensions } from 'react-native';
import { SPACING, RADIUS } from '../../constants/theme';

export const SCREEN_WIDTH = Dimensions.get('window').width;
export const CAMERA_HEIGHT = SCREEN_WIDTH * (4 / 3);

export default StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  topBar: {
    height: 60,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  topBarTitle: { color: 'white', fontSize: 18, fontWeight: '600' },
  iconButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  treeSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  treeSelectorText: { color: 'white', fontSize: 14, fontWeight: '600' },

  cameraWrapper: {
    width: SCREEN_WIDTH,
    height: CAMERA_HEIGHT,
    backgroundColor: '#111',
    overflow: 'hidden',
  },
  cameraView: { flex: 1 },

  bottomBar: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  sideButton: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 25,
  },

  shutterOuter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shutterInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'white',
  },

  instructionText: {
    position: 'absolute',
    top: 20,
    width: '100%',
    textAlign: 'center',
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    lineHeight: 20,
  },
  confirmBtn: {
    flexDirection: 'row',
    backgroundColor: '#22C55E',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 30,
    alignItems: 'center',
    gap: 10,
    marginTop: 30,
  },
  confirmBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold' },

  permButton: {
    backgroundColor: '#22C55E',
    padding: 15,
    borderRadius: 8,
    marginTop: 20,
  },

  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#18181B',
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  treeOption: {
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#27272A',
  },
  treeOptionText: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
  },
  focusRing: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#FBBF24',
  },
  cropMask: {
    position: 'absolute',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  cropBorder: {
    position: 'absolute',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.9)',
  },
  cropGridH: {
    position: 'absolute',
    height: 0.5,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  cropGridV: {
    position: 'absolute',
    width: 0.5,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  cropHandle: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderWidth: 2,
    borderColor: 'white',
    zIndex: 10,
  },
});
