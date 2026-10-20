import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import HomeScreen from './src/screens/HomeScreen';
import RequestScreen from './src/screens/RequestScreen';
import MyTreesScreen from './src/screens/MyTreesScreen';

export default function App() {
  const [abaAtiva, setAbaAtiva] = useState('mapa');

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <StatusBar barStyle="light-content" backgroundColor="#166534" />

        {/* Topo do App */}
        <View style={styles.topBar}>
          <Text style={styles.topBarTitle}>🌳 Fortaleza Mais Verde</Text>
        </View>

        {/* Conteúdo Dinâmico das Telas */}
        <View style={styles.content}>
          {abaAtiva === 'mapa' && (
            <HomeScreen irParaSolicitacao={() => setAbaAtiva('solicitar')} />
          )}
          {abaAtiva === 'solicitar' && (
            <RequestScreen aoConcluir={() => setAbaAtiva('mapa')} />
          )}
          {abaAtiva === 'canteiro' && <MyTreesScreen />}
        </View>

        {/* Barra de Navegação Inferior */}
        <SafeAreaView edges={['bottom']} style={styles.bottomSafe}>
          <View style={styles.bottomNav}>
            <TouchableOpacity
              style={[styles.navItem, abaAtiva === 'mapa' && styles.navItemAtivo]}
              onPress={() => setAbaAtiva('mapa')}
            >
              <Text style={[styles.navText, abaAtiva === 'mapa' && styles.navTextAtivo]}>
                🗺️ Mapa & Calor
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.navItem, abaAtiva === 'solicitar' && styles.navItemAtivo]}
              onPress={() => setAbaAtiva('solicitar')}
            >
              <Text style={[styles.navText, abaAtiva === 'solicitar' && styles.navTextAtivo]}>
                🌱 Solicitar Muda
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.navItem, abaAtiva === 'canteiro' && styles.navItemAtivo]}
              onPress={() => setAbaAtiva('canteiro')}
            >
              <Text style={[styles.navText, abaAtiva === 'canteiro' && styles.navTextAtivo]}>
                🏅 Meu Canteiro
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#166534' },
  topBar: {
    backgroundColor: '#166534',
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  topBarTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
  content: { flex: 1, backgroundColor: '#F3F4F6' },
  bottomSafe: { backgroundColor: '#FFFFFF' },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderColor: '#E5E7EB',
    paddingVertical: 10,
  },
  navItem: { flex: 1, alignItems: 'center', paddingVertical: 6 },
  navItemAtivo: { borderBottomWidth: 3, borderColor: '#15803D' },
  navText: { fontSize: 13, color: '#6B7280', fontWeight: '600' },
  navTextAtivo: { color: '#15803D', fontWeight: 'bold' },
});