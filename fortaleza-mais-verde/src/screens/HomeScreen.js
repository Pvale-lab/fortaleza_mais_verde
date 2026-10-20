import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { supabase } from '../services/supabase';

const ILHAS_DE_CALOR = [
  { id: '1', bairro: 'Centro', lat: -3.7275, lng: -38.5277, raio: 1200, temp: '36.5°C' },
  { id: '2', bairro: 'Messejana', lat: -3.8315, lng: -38.4925, raio: 1500, temp: '35.8°C' },
  { id: '3', bairro: 'Aldeota / Comercial', lat: -3.7380, lng: -38.5050, raio: 1000, temp: '35.2°C' },
];

export default function HomeScreen({ irParaSolicitacao }) {
  const [arvores, setArvores] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [centroMapa, setCentroMapa] = useState({ lat: -3.7417, lng: -38.5369 });

  async function carregarDadosEMapa() {
    setCarregando(true);

    // 1. Tenta obter a localização atual do usuário para centralizar o mapa
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        let loc = await Location.getLastKnownPositionAsync({});
        if (!loc) {
          loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
        }
        if (loc) {
          setCentroMapa({ lat: loc.coords.latitude, lng: loc.coords.longitude });
        }
      }
    } catch (e) {
      console.log('Usando centro padrão de Fortaleza');
    }

    // 2. Busca as árvores cadastradas no Supabase
    const { data, error } = await supabase.from('solicitacoes_plantio').select('*');
    if (!error && data) {
      setArvores(data);
    }
    setCarregando(false);
  }

  useEffect(() => {
    carregarDadosEMapa();
  }, []);

  // Gera o HTML com Leaflet + OpenStreetMap (100% gratuito e sem tela preta)
  const gerarHtmlMapa = () => {
    const ilhasJson = JSON.stringify(ILHAS_DE_CALOR);
    const arvoresJson = JSON.stringify(arvores);

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
          body { margin: 0; padding: 0; }
          #map { width: 100vw; height: 100vh; }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          const map = L.map('map').setView([${centroMapa.lat}, ${centroMapa.lng}], 13);

          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap'
          }).addTo(map);

          // Desenha as Ilhas de Calor em vermelho
          const ilhas = ${ilhasJson};
          ilhas.forEach(z => {
            L.circle([z.lat, z.lng], {
              color: '#DC2626',
              fillColor: '#EF4444',
              fillOpacity: 0.35,
              radius: z.raio
            }).addTo(map).bindPopup('<b>🔥 Ilha de Calor: ' + z.bairro + '</b><br>Média: ' + z.temp);
          });

          // Ícone verde personalizado para as árvores
          const treeIcon = L.divIcon({
            html: '<div style="font-size: 24px;">🌳</div>',
            className: 'custom-tree',
            iconSize: [30, 30],
            iconAnchor: [15, 15]
          });

          // Adiciona cada muda solicitada no Supabase
          const arvores = ${arvoresJson};
          arvores.forEach(a => {
            if (a.latitude && a.longitude) {
              L.marker([a.latitude, a.longitude], { icon: treeIcon })
                .addTo(map)
                .bindPopup('<b>🌱 ' + a.especie_escolhida + '</b><br>Guardião: ' + a.nome_morador + '<br>Bairro: ' + a.bairro + '<br>Status: ' + a.status);
            }
          });
        </script>
      </body>
      </html>
    `;
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerBanner}>
        <Text style={styles.bannerTitle}>Mapa de Conforto Térmico e Plantio</Text>
        <Text style={styles.bannerSub}>
          🔴 Áreas de Ilha de Calor  |  🌳 {arvores.length} Mudas Solicitadas
        </Text>
      </View>

      {carregando ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#15803D" />
          <Text style={{ marginTop: 8 }}>Carregando mapa de Fortaleza...</Text>
        </View>
      ) : (
        <WebView
          originWhitelist={['*']}
          source={{ html: gerarHtmlMapa() }}
          style={styles.map}
        />
      )}

      <TouchableOpacity style={styles.fabReload} onPress={carregarDadosEMapa}>
        <Text style={styles.fabReloadText}>🔄 Atualizar</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.fabRequest} onPress={irParaSolicitacao}>
        <Text style={styles.fabRequestText}>+ Solicitar Árvore na Calçada</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerBanner: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
  },
  bannerTitle: { fontSize: 15, fontWeight: 'bold', color: '#166534' },
  bannerSub: { fontSize: 12, color: '#4B5563', marginTop: 2 },
  map: { flex: 1 },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  fabReload: {
    position: 'absolute',
    top: 75,
    right: 16,
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    elevation: 5,
  },
  fabReloadText: { fontSize: 12, fontWeight: 'bold', color: '#166534' },
  fabRequest: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: '#15803D',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 5,
  },
  fabRequestText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
});