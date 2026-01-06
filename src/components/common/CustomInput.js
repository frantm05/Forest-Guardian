// src/components/common/CustomInput.js
import React from 'react';
import { View, TextInput, Text, StyleSheet } from 'react-native';
import { COLORS, SPACING, RADIUS, TYPOGRAPHY } from '../../constants/theme';

/**
 * Textové vstupní pole s labelem a chybovým stavem.
 * * @param {object} props
 * @param {string} props.label - Nadpis nad inputem
 * @param {string} [props.error] - Chybová hláška (pokud existuje, input zčervená)
 * @param {string} props.value - Hodnota inputu
 * @param {function} props.onChangeText - Callback při změně textu
 * @param {string} [props.placeholder] - Placeholder text
 * @param {object} [props.containerStyle] - Styl obalového View
 * @param {..object} props.rest - Ostatní props pro TextInput (keyboardType, secureTextEntry...)
 */
const CustomInput = ({
    label,
    error,
    value,
    onChangeText,
    placeholder,
    containerStyle,
    ...rest
}) => {
    return (
        <View style={[styles.container, containerStyle]}>
            {label && <Text style={styles.label}>{label}</Text>}

            <TextInput
                style={[
                    styles.input,
                    error && styles.inputError
                ]}
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                placeholderTextColor={COLORS.text.secondary}
                cursorColor={COLORS.primary}
                {...rest}
            />

            {error && <Text style={styles.errorText}>{error}</Text>}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: SPACING.m,
        width: '100%',
    },
    label: {
        ...TYPOGRAPHY.caption,
        fontWeight: '600',
        marginBottom: SPACING.xs,
        color: COLORS.text.primary,
    },
    input: {
        borderWidth: 1,
        borderColor: '#E0E0E0',
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.m,
        padding: SPACING.m,
        ...TYPOGRAPHY.body,
        color: COLORS.text.primary,
    },
    inputError: {
        borderColor: COLORS.status.error,
    },
    errorText: {
        ...TYPOGRAPHY.caption,
        color: COLORS.status.error,
        marginTop: SPACING.xs,
    }
});

export default CustomInput;