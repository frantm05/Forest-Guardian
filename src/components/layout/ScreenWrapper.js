// src/components/layout/ScreenWrapper.js
import React from 'react';
import { View, StyleSheet, SafeAreaView, StatusBar, Platform } from 'react-native';
import { COLORS, SPACING } from '../../constants/theme';

/**
 * Obalová komponenta pro každou obrazovku (Screen).
 * Řeší SafeAreaView, StatusBar a globální padding.
 * * @param {object} props
 * @param {React.ReactNode} props.children - Obsah obrazovky
 * @param {boolean} [props.withPadding=true] - Zda aplikovat horizontální padding
 * @param {string} [props.backgroundColor] - Custom barva pozadí
 */
const ScreenWrapper = ({
    children,
    withPadding = true,
    backgroundColor = COLORS.background
}) => {
    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor }]}>
            <StatusBar
                barStyle="dark-content"
                backgroundColor={backgroundColor}
            />
            <View style={[
                styles.content,
                withPadding && styles.padding
            ]}>
                {children}
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        // Android SafeArea fix (StatusBar height)
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    },
    content: {
        flex: 1,
    },
    padding: {
        paddingHorizontal: SPACING.m,
        paddingVertical: SPACING.s,
    }
});

export default ScreenWrapper;