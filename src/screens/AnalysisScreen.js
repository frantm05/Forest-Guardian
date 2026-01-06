// src/screens/AnalysisScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, Image, StyleSheet, ScrollView } from 'react-native';
import ScreenWrapper from '../components/layout/ScreenWrapper';
import CustomButton from '../components/common/CustomButton';
import { COLORS, SPACING, TYPOGRAPHY, RADIUS } from '../constants/theme';
import { saveRecord } from '../services/storageServices';
import { ROUTES } from '../constants/routes';

/**
 * Obrazovka zobrazující výsledky detekce.
 * Přijímá imageUri přes route params.
 */
const AnalysisScreen = ({ route, navigation }) => {
    const { imageUri } = route.params || {};
    const [isAnalyzing, setIsAnalyzing] = useState(true);
    const [result, setResult] = useState(null);

    // Simulace AI analýzy po načtení obrazovky
    useEffect(() => {
        // Zde bude volání aiService.detect(imageUri)
        const timer = setTimeout(() => {
            setResult({
                label: 'Lýkožrout smrkový (Ips typographus)',
                confidence: 0.92,
                description: 'Byl detekován dospělý jedinec. Doporučuje se kontrola okolních stromů.',
                severity: 'high' // high, medium, low
            });
            setIsAnalyzing(false);
        }, 2000); // 2 sekundy simulace

        return () => clearTimeout(timer);
    }, []);

    const handleSaveAndExit = async () => {
        if (result) {
            // Uložíme výsledek do paměti telefonu
            await saveRecord({
                label: result.label,
                confidence: result.confidence,
                description: result.description,
                severity: result.severity,
                imageUri: imageUri // Můžeme uložit i cestu k fotce
            });
        }
        navigation.popToTop(); // Návrat na Home
    };

    return (
        <ScreenWrapper>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Zobrazení vyfoceného snímku */}
                <View style={styles.imageContainer}>
                    {imageUri ? (
                        <Image source={{ uri: imageUri }} style={styles.image} />
                    ) : (
                        <View style={[styles.image, { backgroundColor: '#ddd' }]} />
                    )}
                </View>

                <View style={styles.resultContainer}>
                    {isAnalyzing ? (
                        <View style={styles.loadingState}>
                            <Text style={styles.loadingText}>Probíhá analýza obrazu...</Text>
                            <Text style={TYPOGRAPHY.caption}>Používám Edge AI model</Text>
                        </View>
                    ) : (
                        <>
                            {/* Hlavička výsledku */}
                            <View style={styles.resultHeader}>
                                <Text style={styles.confidence}>
                                    Pravděpodobnost: {Math.round(result.confidence * 100)}%
                                </Text>
                                <Text style={[styles.pestName, result.severity === 'high' && { color: COLORS.status.error }]}>
                                    {result.label}
                                </Text>
                            </View>

                            {/* Detailní popis */}
                            <View style={styles.card}>
                                <Text style={styles.cardTitle}>Detaily nálezu</Text>
                                <Text style={styles.cardBody}>{result.description}</Text>
                            </View>

                            <View style={styles.actions}>
                                <CustomButton
                                    title="Uložit a Zpět"
                                    onPress={handleSaveAndExit}
                                />
                                <CustomButton
                                    title="Nová Fotografie"
                                    variant="outline"
                                    onPress={() => navigation.goBack()}
                                    style={{ marginTop: SPACING.m }}
                                />
                            </View>
                        </>
                    )}
                </View>
            </ScrollView>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    scrollContent: {
        flexGrow: 1,
    },
    imageContainer: {
        height: 300,
        width: '100%',
        borderRadius: RADIUS.m,
        overflow: 'hidden',
        marginBottom: SPACING.m,
        elevation: 4, // Android stín
        shadowColor: '#000', // iOS stín
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    image: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    resultContainer: {
        flex: 1,
    },
    loadingState: {
        alignItems: 'center',
        padding: SPACING.xl,
    },
    loadingText: {
        ...TYPOGRAPHY.subHeader,
        color: COLORS.primary,
        marginBottom: SPACING.s,
    },
    resultHeader: {
        marginBottom: SPACING.l,
        paddingBottom: SPACING.m,
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
    },
    pestName: {
        ...TYPOGRAPHY.header,
        color: COLORS.text.primary,
        marginTop: SPACING.xs,
    },
    confidence: {
        ...TYPOGRAPHY.caption,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    card: {
        backgroundColor: COLORS.surface,
        padding: SPACING.m,
        borderRadius: RADIUS.m,
        marginBottom: SPACING.xl,
        borderWidth: 1,
        borderColor: '#eee',
    },
    cardTitle: {
        ...TYPOGRAPHY.subHeader,
        marginBottom: SPACING.s,
    },
    cardBody: {
        ...TYPOGRAPHY.body,
        color: COLORS.text.secondary,
    },
    actions: {
        marginTop: 'auto', // Tlačítka dole
    }
});

export default AnalysisScreen;