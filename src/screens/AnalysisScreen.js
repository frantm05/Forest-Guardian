// src/screens/AnalysisScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, Image, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, TYPOGRAPHY, SHADOWS } from '../constants/theme';
import { analyzeImage } from '../services/aiServices';
import { saveRecord } from '../services/storageServices';

const AnalysisScreen = ({ route, navigation }) => {
  const { imageUri, mode, treeType } = route.params || {};
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulace analýzy
    analyzeImage(imageUri, mode, treeType).then(data => {
      setResult(data);
      setLoading(false);
    });
  }, []);

  const handleSave = async () => {
    if (result) {
      await saveRecord({ ...result, imageUri, date: new Date().toISOString() });
      navigation.popToTop();
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Analyzuji snímek...</Text>
        <Text style={styles.loadingSub}>Edge AI zpracovává data lokálně</Text>
      </View>
    );
  }

  const isDanger = result?.severity === 'high';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{paddingBottom: 40}}>
        
        {/* IMAGE HEADER */}
        <View style={styles.imageHeader}>
          <Image source={{ uri: imageUri }} style={styles.mainImage} />
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <View style={styles.badgeContainer}>
             <View style={[styles.badge, { backgroundColor: isDanger ? COLORS.destructive : COLORS.primaryLight }]}>
               <Text style={styles.badgeText}>{Math.round(result.confidence * 100)}% Shoda</Text>
             </View>
          </View>
        </View>

        {/* CONTENT */}
        <View style={styles.content}>
          <Text style={TYPOGRAPHY.h2}>{result.label}</Text>
          <Text style={styles.latinName}>{result.treeContext === 'spruce' ? 'Ips typographus' : 'Neznámý původce'}</Text>

          {/* STATUS CARD */}
          <View style={[styles.alertCard, { borderColor: isDanger ? COLORS.destructive : COLORS.primary }]}>
            <MaterialCommunityIcons 
              name={isDanger ? "alert-circle" : "check-circle"} 
              size={24} 
              color={isDanger ? COLORS.destructive : COLORS.primary} 
            />
            <View style={{flex: 1}}>
              <Text style={[styles.alertTitle, { color: isDanger ? COLORS.destructive : COLORS.primary }]}>
                {isDanger ? "Detekováno vysoké riziko" : "Nízké riziko"}
              </Text>
              <Text style={styles.alertBody}>
                {result.recommendation}
              </Text>
            </View>
          </View>

          {/* DETAILS */}
          <Text style={styles.sectionTitle}>Detaily detekce</Text>
          <View style={styles.detailRow}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Typ detekce</Text>
              <Text style={styles.detailValue}>{mode === 'object_detection' ? 'Objektová' : 'Segmentace'}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Strom</Text>
              <Text style={styles.detailValue}>{treeType}</Text>
            </View>
          </View>

          {/* ACTIONS */}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.primaryBtn} onPress={handleSave}>
              <Text style={styles.primaryBtnText}>Uložit záznam</Text>
              <Ionicons name="save-outline" size={20} color="white" />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.secondaryBtn} onPress={() => navigation.goBack()}>
              <Text style={styles.secondaryBtnText}>Nová fotografie</Text>
            </TouchableOpacity>
          </View>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { ...TYPOGRAPHY.h3, marginTop: SPACING.m, color: COLORS.text.primary },
  loadingSub: { color: COLORS.text.secondary, marginTop: SPACING.s },

  imageHeader: { height: 300, width: '100%', position: 'relative' },
  mainImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  backBtn: { position: 'absolute', top: 20, left: 20, width: 40, height: 40, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: RADIUS.full, justifyContent: 'center', alignItems: 'center' },
  badgeContainer: { position: 'absolute', bottom: 20, left: 20, flexDirection: 'row' },
  badge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.full },
  badgeText: { color: 'white', fontWeight: 'bold', fontSize: 12 },

  content: { padding: SPACING.l, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, marginTop: -20, backgroundColor: COLORS.background },
  latinName: { ...TYPOGRAPHY.body, fontStyle: 'italic', marginBottom: SPACING.l },

  alertCard: { flexDirection: 'row', gap: 12, padding: SPACING.m, borderRadius: RADIUS.m, backgroundColor: '#f9fafb', borderWidth: 1, marginBottom: SPACING.xl },
  alertTitle: { fontWeight: '700', fontSize: 16, marginBottom: 4 },
  alertBody: { fontSize: 14, color: COLORS.text.secondary, lineHeight: 20 },

  sectionTitle: { ...TYPOGRAPHY.h3, marginBottom: SPACING.m },
  detailRow: { flexDirection: 'row', gap: SPACING.m, marginBottom: SPACING.xl },
  detailItem: { flex: 1, padding: SPACING.m, backgroundColor: COLORS.secondary, borderRadius: RADIUS.m },
  detailLabel: { fontSize: 12, color: COLORS.text.secondary, marginBottom: 4 },
  detailValue: { fontWeight: '600', color: COLORS.text.primary },

  actions: { gap: SPACING.m },
  primaryBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.primary, padding: SPACING.m, borderRadius: RADIUS.m, gap: 8, ...SHADOWS.md },
  primaryBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  secondaryBtn: { justifyContent: 'center', alignItems: 'center', padding: SPACING.m, borderRadius: RADIUS.m, borderWidth: 1, borderColor: COLORS.border },
  secondaryBtnText: { color: COLORS.text.primary, fontWeight: '600' }
});

export default AnalysisScreen;