import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../services/supabase';

const ESPECIES_RECOMENDADAS = [
  { nome: 'Ipê-amarelo (Nativa)', info: 'Porte médio, raízes profundas, ideal para calçadas.' },
  { nome: 'Carnaúba (Nativa)', info: 'Alta resistência ao calor e seca, não interfere na fiação.' },
  { nome: 'Pata-de-vaca', info: 'Porte pequeno (até 6m), ótima sob fiação elétrica.' },
  { nome: 'Oiti', info: 'Copa fechada com excelente sombra térmica, não quebra calçadas.' },
];

export default function RequestScreen({ aoConcluir }) {
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [bairro, setBairro] = useState('');
  const [endereco, setEndereco] = useState('');
  const [especie, setEspecie] = useState(ESPECIES_RECOMENDADAS[0].nome);
  const [coords, setCoords] = useState({ latitude: -3.7417, longitude: -38.5369 });
  const [gpsCapturado, setGpsCapturado] = useState(false);
  const [buscandoGps, setBuscandoGps] = useState(false);
  const [fotoUri, setFotoUri] = useState(null);
  const [enviando, setEnviando] = useState(false);

  async function capturarGPS() {
    try {
      setBuscandoGps(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setBuscandoGps(false);
        Alert.alert('Permissão negada', 'Ative a permissão de localização nas configurações do celular.');
        return;
      }

      // Tenta pegar a posição atual com precisão balanceada (funciona em ambientes internos)
      let loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      // Fallback para última posição conhecida se necessário
      if (!loc) {
        loc = await Location.getLastKnownPositionAsync({});
      }

      if (loc) {
        const { latitude, longitude } = loc.coords;
        setCoords({ latitude, longitude });
        setGpsCapturado(true);

        // Preenche automaticamente Bairro e Rua se disponível
        const enderecos = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (enderecos && enderecos.length > 0) {
          const item = enderecos[0];
          if (item.district || item.subregion) {
            setBairro(item.district || item.subregion);
          }
          if (item.street) {
            const num = item.streetNumber ? `, ${item.streetNumber}` : '';
            setEndereco(`${item.street}${num}`);
          }
        }

        Alert.alert(
          'GPS Capturado! 📍',
          `Coordenadas gravadas:\nLat: ${latitude.toFixed(5)}\nLng: ${longitude.toFixed(5)}`
        );
      }
    } catch (error) {
      Alert.alert(
        'Atenção no GPS',
        'Verifique se a "Localização" do seu celular está ativada na barra superior do Android.'
      );
    } finally {
      setBuscandoGps(false);
    }
  }

  async function escolherFoto() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], // Atualizado para o novo padrão do Expo SDK 57 (sem warning)
      allowsEditing: true,
      quality: 0.6,
    });

    if (!result.canceled) {
      setFotoUri(result.assets[0].uri);
    }
  }

  async function salvarSolicitacao() {
    if (!nome || !bairro || !endereco) {
      Alert.alert('Campos obrigatórios', 'Preencha seu nome, bairro e endereço.');
      return;
    }

    setEnviando(true);
    const { error } = await supabase.from('solicitacoes_plantio').insert([
      {
        nome_morador: nome,
        telefone,
        bairro,
        endereco,
        latitude: coords.latitude,
        longitude: coords.longitude,
        especie_escolhida: especie,
        foto_calcada_url: fotoUri || 'Sem foto anexada',
        status: 'Em Análise',
        compromisso_regar: true,
      },
    ]);
    setEnviando(false);

    if (error) {
      Alert.alert('Erro ao salvar', error.message);
    } else {
      Alert.alert(
        'Solicitação Enviada! 🌱',
        'Seu pedido foi registrado no mapa de Fortaleza. Você ganhou +50 pontos de Guardião Verde!',
        [{ text: 'Ver no Mapa', onPress: aoConcluir }]
      );
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.titulo}>Solicitar Plantio na Calçada</Text>
      <Text style={styles.descricao}>
        Preencha os dados para receber uma muda adequada ao espaço da sua rua.
      </Text>

      <Text style={styles.label}>Seu Nome *</Text>
      <TextInput
        style={styles.input}
        placeholder="Ex: Maria das Graças"
        value={nome}
        onChangeText={setNome}
      />

      <Text style={styles.label}>Telefone / WhatsApp</Text>
      <TextInput
        style={styles.input}
        placeholder="Ex: (85) 99999-9999"
        keyboardType="phone-pad"
        value={telefone}
        onChangeText={setTelefone}
      />

      <Text style={styles.label}>Bairro em Fortaleza *</Text>
      <TextInput
        style={styles.input}
        placeholder="Ex: Messejana, Benfica, Aldeota..."
        value={bairro}
        onChangeText={setBairro}
      />

      <Text style={styles.label}>Endereço e Número da Calçada *</Text>
      <TextInput
        style={styles.input}
        placeholder="Ex: Rua Padre Cícero, 450"
        value={endereco}
        onChangeText={setEndereco}
      />

      <View style={styles.rowButtons}>
        <TouchableOpacity
          style={styles.btnSecundario}
          onPress={capturarGPS}
          disabled={buscandoGps}
        >
          {buscandoGps ? (
            <ActivityIndicator size="small" color="#166534" />
          ) : (
            <Text style={styles.btnSecundarioTexto}>
              {gpsCapturado ? '✅ GPS Gravado' : '📍 Capturar GPS Atual'}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.btnSecundario} onPress={escolherFoto}>
          <Text style={styles.btnSecundarioTexto}>
            {fotoUri ? '✅ Foto Anexada' : '📷 Foto da Calçada'}
          </Text>
        </TouchableOpacity>
      </View>

      {gpsCapturado && (
        <Text style={styles.coordsInfo}>
          📌 Coordenadas ativas: {coords.latitude.toFixed(4)}, {coords.longitude.toFixed(4)}
        </Text>
      )}

      {fotoUri && <Image source={{ uri: fotoUri }} style={styles.previewFoto} />}

      <Text style={styles.label}>Escolha a Espécie Recomendada:</Text>
      {ESPECIES_RECOMENDADAS.map((item) => (
        <TouchableOpacity
          key={item.nome}
          style={[
            styles.cardEspecie,
            especie === item.nome && styles.cardEspecieSelecionada,
          ]}
          onPress={() => setEspecie(item.nome)}
        >
          <Text style={styles.nomeEspecie}>{item.nome}</Text>
          <Text style={styles.infoEspecie}>{item.info}</Text>
        </TouchableOpacity>
      ))}

      <TouchableOpacity
        style={styles.btnEnviar}
        onPress={salvarSolicitacao}
        disabled={enviando}
      >
        {enviando ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <Text style={styles.btnEnviarTexto}>Confirmar Solicitação e Adotar Muda</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: '#F9FAFB' },
  titulo: { fontSize: 20, fontWeight: 'bold', color: '#166534', marginBottom: 4 },
  descricao: { fontSize: 13, color: '#4B5563', marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 10 },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
  },
  rowButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
  btnSecundario: {
    flex: 0.48,
    backgroundColor: '#DCFCE7',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  btnSecundarioTexto: { color: '#166534', fontWeight: 'bold', fontSize: 13 },
  coordsInfo: { fontSize: 12, color: '#15803D', marginTop: 8, fontWeight: '600' },
  previewFoto: { width: '100%', height: 160, borderRadius: 8, marginTop: 12 },
  cardEspecie: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  cardEspecieSelecionada: {
    borderColor: '#15803D',
    borderWidth: 2,
    backgroundColor: '#F0FDF4',
  },
  nomeEspecie: { fontWeight: 'bold', fontSize: 15, color: '#1F2937' },
  infoEspecie: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  btnEnviar: {
    backgroundColor: '#15803D',
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  btnEnviarTexto: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
});