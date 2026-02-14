// src/screens/HomeScreen.js
import React from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING, RADIUS, TYPOGRAPHY, SHADOWS } from '../constants/theme';
import { ROUTES } from '../constants/routes';

const HomeScreen = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* HEADER SECTION */}
        <View style={styles.header}>
          <View>
            <Text style={TYPOGRAPHY.caption}>Vítejte zpět</Text>
            <Text style={TYPOGRAPHY.header}>Forest Guardian</Text>
          </View>
          <View style={styles.avatar}>
            <Text style={{fontSize: 24}}>👨‍💼</Text>
          </View>
        </View>

        {/* HERO CARD (CTA) */}
        <View style={styles.heroCard}>
          <View style={styles.heroContent}>
            <Text style={styles.heroTitle}>Nová inspekce</Text>
            <Text style={styles.heroText}>Spusťte AI analýzu pro detekci škůdců nebo požerků.</Text>
            <TouchableOpacity 
              style={styles.heroButton}
              onPress={() => navigation.navigate(ROUTES.CAMERA)}
            >
              <Text style={styles.heroBtnText}>Spustit Kameru</Text>
            </TouchableOpacity>
          </View>
          <Image 
            source={{uri: 'https://img.freepik.com/free-vector/forest-scene-with-various-forest-trees_1308-59155.jpg'}} 
            style={styles.heroImage} 
          />
        </View>

        {/* STATISTICS / STATUS */}
        <Text style={[TYPOGRAPHY.subHeader, { marginTop: SPACING.xl, marginBottom: SPACING.m }]}>
          Aktuální stav
        </Text>
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: '#E8F5E9' }]}>
            <Text style={[styles.statNumber, { color: COLORS.primary }]}>12</Text>
            <Text style={styles.statLabel}>Zdravých</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#FFF3E0' }]}>
            <Text style={[styles.statNumber, { color: COLORS.accent }]}>3</Text>
            <Text style={styles.statLabel}>Napadených</Text>
          </View>
        </View>

        {/* QUICK ACTIONS */}
        <Text style={[TYPOGRAPHY.subHeader, { marginTop: SPACING.xl, marginBottom: SPACING.m }]}>
          Rychlé akce
        </Text>
        <View style={styles.actionGrid}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate(ROUTES.HISTORY)}
          >
            <View style={[styles.iconBox, { backgroundColor: '#E3F2FD' }]}>
              <Text style={{fontSize: 24}}>📋</Text>
            </View>
            <Text style={styles.actionText}>Historie nálezů</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton}>
            <View style={[styles.iconBox, { backgroundColor: '#F3E5F5' }]}>
              <Text style={{fontSize: 24}}>⚙️</Text>
            </View>
            <Text style={styles.actionText}>Nastavení</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { padding: SPACING.m },
  
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.l },
  avatar: { width: 48, height: 48, backgroundColor: COLORS.surface, borderRadius: RADIUS.full, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#eee' },
  
  heroCard: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.l, overflow: 'hidden',
    height: 180, flexDirection: 'row', ...SHADOWS.medium
  },
  heroContent: { flex: 1, padding: SPACING.l, justifyContent: 'center' },
  heroTitle: { color: 'white', fontSize: 20, fontWeight: 'bold', marginBottom: SPACING.xs },
  heroText: { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginBottom: SPACING.m },
  heroButton: { backgroundColor: 'white', paddingVertical: 8, paddingHorizontal: 16, borderRadius: RADIUS.m, alignSelf: 'flex-start' },
  heroBtnText: { color: COLORS.primary, fontWeight: 'bold' },
  heroImage: { width: 100, height: '100%', opacity: 0.8 },
  
  statsRow: { flexDirection: 'row', gap: SPACING.m },
  statCard: { flex: 1, padding: SPACING.m, borderRadius: RADIUS.m, alignItems: 'center', ...SHADOWS.light },
  statNumber: { fontSize: 32, fontWeight: 'bold' },
  statLabel: { ...TYPOGRAPHY.caption, fontWeight: '600' },
  
  actionGrid: { flexDirection: 'row', gap: SPACING.m },
  actionButton: { flex: 1, backgroundColor: COLORS.surface, padding: SPACING.m, borderRadius: RADIUS.m, alignItems: 'center', ...SHADOWS.light },
  iconBox: { width: 50, height: 50, borderRadius: RADIUS.full, justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.s },
  actionText: { ...TYPOGRAPHY.body, fontWeight: '600', fontSize: 14 }
});

export default HomeScreen;