// src/screens/CameraScreen.js
import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { COLORS, SPACING, RADIUS } from '../constants/theme';
import { ROUTES } from '../constants/routes';

const CameraScreen = ({ navigation }) => {
    const [permission, requestPermission] = useCameraPermissions();
    const [facing, setFacing] = useState('back');
    const cameraRef = useRef(null);

    // Request camera permissions on mount
    useEffect(() => {
        if (permission && !permission.granted && !permission.canAskAgain) {
            Alert.alert(
                'Oprávnění kamery',
                'Aplikace potřebuje přístup ke kameře pro pořízení fotografií škůdců.',
                [
                    { text: 'OK', onPress: () => navigation.goBack() }
                ]
            );
        }
    }, [permission]);

    const takePicture = async () => {
        if (cameraRef.current) {
            try {
                const photo = await cameraRef.current.takePictureAsync({
                    quality: 0.8,
                    base64: false,
                    exif: false,
                });
                
                // Navigate to Analysis screen with the captured image
                navigation.navigate(ROUTES.ANALYSIS, { imageUri: photo.uri });
            } catch (error) {
                console.error('Error taking picture:', error);
                Alert.alert('Chyba', 'Nepodařilo se pořídit fotografii.');
            }
        }
    };

    const toggleCameraFacing = () => {
        setFacing(current => (current === 'back' ? 'front' : 'back'));
    };

    // Handle permission states
    if (!permission) {
        // Camera permissions are still loading
        return (
            <View style={styles.centered}>
                <Text>Načítání...</Text>
            </View>
        );
    }

    if (!permission.granted) {
        // Camera permissions are not granted yet
        return (
            <View style={styles.centered}>
                <Text style={styles.permissionText}>
                    Potřebujeme přístup ke kameře pro pořízení fotografií.
                </Text>
                <TouchableOpacity
                    style={styles.permissionButton}
                    onPress={requestPermission}
                >
                    <Text style={styles.permissionButtonText}>Povolit kameru</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.permissionButton, styles.cancelButton]}
                    onPress={() => navigation.goBack()}
                >
                    <Text style={styles.permissionButtonText}>Zrušit</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Real Camera View */}
            <CameraView
                style={styles.camera}
                facing={facing}
                ref={cameraRef}
            >
                {/* Overlay controls */}
                <SafeAreaView style={styles.overlay}>
                    <View style={styles.topControls}>
                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={() => navigation.goBack()}
                        >
                            <Text style={styles.overlayText}>Zrušit</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.flipButton}
                            onPress={toggleCameraFacing}
                        >
                            <Text style={styles.overlayText}>🔄</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.bottomControls}>
                        <View style={styles.captureContainer}>
                            <TouchableOpacity
                                style={styles.captureButtonOuter}
                                onPress={takePicture}
                            >
                                <View style={styles.captureButtonInner} />
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.instructionText}>
                            Vycentrujte škůdce do záběru
                        </Text>
                    </View>
                </SafeAreaView>
            </CameraView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'black',
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.background,
        padding: SPACING.l,
    },
    camera: {
        flex: 1,
    },
    overlay: {
        flex: 1,
        justifyContent: 'space-between',
        padding: SPACING.m,
    },
    topControls: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    closeButton: {
        padding: SPACING.m,
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: RADIUS.m,
    },
    flipButton: {
        padding: SPACING.m,
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: RADIUS.m,
    },
    overlayText: {
        color: 'white',
        fontWeight: '600',
        fontSize: 16,
    },
    bottomControls: {
        alignItems: 'center',
        paddingBottom: SPACING.l,
    },
    captureContainer: {
        marginBottom: SPACING.m,
    },
    captureButtonOuter: {
        width: 80,
        height: 80,
        borderRadius: 40,
        borderWidth: 4,
        borderColor: 'white',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.2)',
    },
    captureButtonInner: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: 'white',
    },
    instructionText: {
        color: 'white',
        fontSize: 14,
        backgroundColor: 'rgba(0,0,0,0.5)',
        paddingHorizontal: SPACING.m,
        paddingVertical: SPACING.s,
        borderRadius: RADIUS.s,
    },
    permissionText: {
        fontSize: 16,
        textAlign: 'center',
        marginBottom: SPACING.xl,
        color: COLORS.text.primary,
    },
    permissionButton: {
        backgroundColor: COLORS.primary,
        paddingVertical: SPACING.m,
        paddingHorizontal: SPACING.xl,
        borderRadius: RADIUS.m,
        marginBottom: SPACING.m,
        minWidth: 200,
    },
    cancelButton: {
        backgroundColor: COLORS.text.secondary,
    },
    permissionButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'center',
    },
});

export default CameraScreen;