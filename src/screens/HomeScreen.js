// src/screens/HomeScreen.js
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { COLORS, SPACING, RADIUS, TYPOGRAPHY, SHADOWS } from '../constants/theme';
import { ROUTES } from '../constants/routes';

const HomeScreen = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* HEADER */}
        <View style={styles.header}>
          <View>
            <Text style={TYPOGRAPHY.caption}>Dobrý den, Matěji</Text>
            <Text style={TYPOGRAPHY.h2}>Forest Guardian</Text>
          </View>
          <TouchableOpacity style={styles.profileButton}>
            <Image 
              source={{ uri: 'https://ui-avatars.com/api/?name=Matej+Frantik&background=166534&color=fff' }} 
              style={styles.avatar} 
            />
          </TouchableOpacity>
        </View>

        {/* HERO CARD - Spuštění skenu */}
        <TouchableOpacity 
          activeOpacity={0.9}
          onPress={() => navigation.navigate(ROUTES.CAMERA)}
        >
          <LinearGradient
            colors={[COLORS.primary, COLORS.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroCard}
          >
            <View style={styles.heroContent}>
              <View style={styles.heroBadge}>
                <MaterialCommunityIcons name="scan-helper" size={16} color="white" />
                <Text style={styles.heroBadgeText}>AI Analýza</Text>
              </View>
              <Text style={styles.heroTitle}>Nová inspekce stromu</Text>
              <Text style={styles.heroSubtitle}>
                Identifikace škůdců a analýza požerků pomocí Edge AI.
              </Text>
              
              <View style={styles.ctaButton}>
                <Text style={styles.ctaText}>Spustit kameru</Text>
                <Ionicons name="arrow-forward" size={20} color={COLORS.primary} />
              </View>
            </View>
            
            {/* Dekorativní ikona na pozadí */}
            <MaterialCommunityIcons name="tree" size={180} color="rgba(255,255,255,0.1)" style={styles.heroDecor} />
          </LinearGradient>
        </TouchableOpacity>

        {/* STATISTIKY */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <View style={[styles.iconBox, { backgroundColor: '#dcfce7' }]}>
              <MaterialCommunityIcons name="check-circle" size={24} color={COLORS.primary} />
            </View>
            <Text style={styles.statNumber}>12</Text>
            <Text style={styles.statLabel}>Zdravé</Text>
          </View>
          
          <View style={styles.statCard}>
            <View style={[styles.iconBox, { backgroundColor: '#fee2e2' }]}>
              <MaterialCommunityIcons name="alert-circle" size={24} color={COLORS.destructive} />
            </View>
            <Text style={styles.statNumber}>3</Text>
            <Text style={styles.statLabel}>Napadené</Text>
          </View>

           <View style={styles.statCard}>
            <View style={[styles.iconBox, { backgroundColor: '#fef9c3' }]}>
              <MaterialCommunityIcons name="history" size={24} color={COLORS.accent} />
            </View>
            <Text style={styles.statNumber}>15</Text>
            <Text style={styles.statLabel}>Celkem</Text>
          </View>
        </View>

        {/* RECENT ACTIVITY */}
        <View style={styles.sectionHeader}>
          <Text style={TYPOGRAPHY.h3}>Nedávná aktivita</Text>
          <TouchableOpacity onPress={() => navigation.navigate(ROUTES.HISTORY)}>
            <Text style={styles.linkText}>Zobrazit vše</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.activityList}>
          {/* Mock položka 1 */}
          <View style={styles.activityItem}>
            <View style={styles.activityIcon}>
              <MaterialCommunityIcons name="bug" size={24} color={COLORS.destructive} />
            </View>
            <View style={styles.activityContent}>
              <Text style={styles.activityTitle}>Lýkožrout smrkový</Text>
              <Text style={styles.activitySub}>Smrk ztepilý • Objektová detekce</Text>
            </View>
            <Text style={styles.activityTime}>před 2h</Text>
          </View>

          {/* Mock položka 2 */}
          <View style={styles.activityItem}>
            <View style={[styles.activityIcon, { backgroundColor: '#dcfce7' }]}>
              <MaterialCommunityIcons name="tree" size={24} color={COLORS.primary} />
            </View>
            <View style={styles.activityContent}>
              <Text style={styles.activityTitle}>Zdravý jedinec</Text>
              <Text style={styles.activitySub}>Borovice lesní • Segmentace</Text>
            </View>
            <Text style={styles.activityTime}>Včera</Text>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' }, // Light gray bg like shadcn
  scrollContent: { padding: SPACING.l },
  
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.l },
  profileButton: { ...SHADOWS.sm, borderRadius: RADIUS.full },
  avatar: { width: 44, height: 44, borderRadius: RADIUS.full, borderWidth: 2, borderColor: 'white' },

  heroCard: {
    borderRadius: RADIUS.l,
    padding: SPACING.l,
    position: 'relative',
    overflow: 'hidden',
    height: 220,
    ...SHADOWS.lg,
  },
  heroContent: { zIndex: 1, height: '100%', justifyContent: 'space-between' },
  heroBadge: { 
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', 
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.full, alignSelf: 'flex-start', gap: 6 
  },
  heroBadgeText: { color: 'white', fontWeight: '600', fontSize: 12 },
  heroTitle: { color: 'white', fontSize: 24, fontWeight: '700', marginTop: SPACING.m },
  heroSubtitle: { color: 'rgba(255,255,255,0.9)', fontSize: 14, maxWidth: '80%' },
  heroDecor: { position: 'absolute', right: -40, bottom: -40, opacity: 0.15 },
  
  ctaButton: { 
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', 
    paddingHorizontal: SPACING.m, paddingVertical: 10, borderRadius: RADIUS.m, 
    alignSelf: 'flex-start', gap: 8, marginTop: SPACING.s
  },
  ctaText: { color: COLORS.primary, fontWeight: '700' },

  statsContainer: { flexDirection: 'row', gap: SPACING.m, marginTop: SPACING.l },
  statCard: { 
    flex: 1, backgroundColor: 'white', padding: SPACING.m, borderRadius: RADIUS.m, 
    borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', ...SHADOWS.sm 
  },
  iconBox: { width: 40, height: 40, borderRadius: RADIUS.full, justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.s },
  statNumber: { fontSize: 24, fontWeight: '700', color: COLORS.text.primary },
  statLabel: { fontSize: 12, color: COLORS.text.secondary },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: SPACING.xl, marginBottom: SPACING.m },
  linkText: { color: COLORS.primary, fontWeight: '600', fontSize: 14 },

  activityList: { gap: SPACING.m },
  activityItem: { 
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', 
    padding: SPACING.m, borderRadius: RADIUS.m, borderWidth: 1, borderColor: COLORS.border 
  },
  activityIcon: { 
    width: 48, height: 48, borderRadius: RADIUS.m, backgroundColor: '#fee2e2', 
    justifyContent: 'center', alignItems: 'center', marginRight: SPACING.m 
  },
  activityContent: { flex: 1 },
  activityTitle: { fontWeight: '600', color: COLORS.text.primary, fontSize: 16 },
  activitySub: { color: COLORS.text.secondary, fontSize: 12, marginTop: 2 },
  activityTime: { color: COLORS.text.secondary, fontSize: 12 },
});

export default HomeScreen;