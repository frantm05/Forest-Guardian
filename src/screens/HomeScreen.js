// src/screens/HomeScreen.js
import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import ScreenWrapper from '../components/layout/ScreenWrapper';
import CustomButton from '../components/common/CustomButton';
import { COLORS, SPACING, TYPOGRAPHY } from '../constants/theme';
import { ROUTES } from '../constants/routes';

/**
 * Úvodní obrazovka (Dashboard).
 */
const HomeScreen = ({ navigation }) => {

    const handleStartAnalysis = () => {
        navigation.navigate(ROUTES.CAMERA);
    };

    const handleOpenHistory = () => {
        navigation.navigate(ROUTES.HISTORY);
    };

    return (
        <ScreenWrapper>
            <View style={styles.container}>
                {/* Sekce s uvítáním a logem */}
                <View style={styles.headerSection}>
                    <View style={styles.logoPlaceholder}>
                        {/* Zde by bylo logo aplikace */}
                        <Text style={{ fontSize: 40 }}>🌲</Text>
                    </View>
                    <Text style={styles.title}>Forest Guardian</Text>
                    <Text style={styles.subtitle}>
                        Inteligentní detekce lesních škůdců
                    </Text>
                </View>

                {/* Sekce s akcemi */}
                <View style={styles.actionSection}>
                    <CustomButton
                        title="Nová Analýza"
                        onPress={handleStartAnalysis}
                        style={styles.buttonSpacing}
                    />

                    <CustomButton
                        title="Historie Nálezů"
                        onPress={handleOpenHistory}
                        variant="secondary"
                        style={styles.buttonSpacing}
                    />

                    <CustomButton
                        title="O Aplikaci"
                        variant="outline"
                        onPress={() => { }} // TODO: Modal s informacemi
                    />
                </View>

                <Text style={styles.footerText}>
                    Verze 1.0.0 • Bakalářská práce 2025
                </Text>
            </View>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'space-between',
    },
    headerSection: {
        alignItems: 'center',
        marginTop: SPACING.xxl,
    },
    logoPlaceholder: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: COLORS.secondary,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: SPACING.m,
    },
    title: {
        ...TYPOGRAPHY.header,
        color: COLORS.primary,
        textAlign: 'center',
    },
    subtitle: {
        ...TYPOGRAPHY.body,
        color: COLORS.text.secondary,
        textAlign: 'center',
        marginTop: SPACING.s,
        paddingHorizontal: SPACING.l,
    },
    actionSection: {
        width: '100%',
        paddingBottom: SPACING.xl,
    },
    buttonSpacing: {
        marginBottom: SPACING.m,
    },
    footerText: {
        ...TYPOGRAPHY.caption,
        textAlign: 'center',
        marginBottom: SPACING.m,
    }
});

export default HomeScreen;