import React from "react";
import {
    TouchableOpacity,
    Text,
    ActivityIndicator,
    StyleSheet,
} from "react-native";
import { COLORS, SPACING, RADIUS, TYPOGRAPHY } from "../../constants/theme";

/**
 * Znovupoužitelná komponenta tlačítka.
 * * @param {object} props
 * @param {string} props.title - Text tlačítka
 * @param {function} props.onPress - Funkce volaná při stisku
 * @param {'primary' | 'secondary' | 'outline'} [props.variant='primary'] - Vizuální styl
 * @param {boolean} [props.isLoading=false] - Zobrazit načítání místo textu
 * @param {boolean} [props.disabled=false] - Deaktivovat interakci
 * @param {object} [props.style] - Dodatečné styly pro kontejner
 */
const CustomButton = ({
    title,
    onPress,
    variant = "primary",
    isLoading = false,
    disabled = false,
    style,
}) => {
    // Dynamické určení stylů na základě varianty
    const getBackgroundColor = () => {
        if (disabled) return COLORS.text.secondary;
        if (variant === "outline") return "transparent";
        return variant === "secondary" ? COLORS.secondary : COLORS.primary;
    };

    const getTextColor = () => {
        if (variant === "outline")
            return disabled ? COLORS.text.secondary : COLORS.primary;
        return COLORS.text.inverse;
    };

    return (
        <TouchableOpacity
            onPress={onPress}
            disabled={disabled || isLoading}
            activeOpacity={0.8}
            style={[
                styles.container,
                { backgroundColor: getBackgroundColor() },
                variant === "outline" && styles.outlineBorder,
                style,
            ]}
        >
            {isLoading ? (
                <ActivityIndicator color={getTextColor()} />
            ) : (
                <Text style={[styles.text, { color: getTextColor() }]}>{title}</Text>
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingVertical: SPACING.m,
        paddingHorizontal: SPACING.l,
        borderRadius: RADIUS.m,
        alignItems: "center",
        justifyContent: "center",
        minHeight: 56, // Dostatečná velikost pro prst v terénu
        width: "100%",
    },
    outlineBorder: {
        borderWidth: 2,
        borderColor: COLORS.primary,
    },
    text: {
        ...TYPOGRAPHY.body,
        fontWeight: "600",
        textTransform: "uppercase",
        letterSpacing: 1,
    },
});

export default CustomButton;
