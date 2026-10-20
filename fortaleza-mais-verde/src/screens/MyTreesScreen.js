import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  Alert,
  TextInput,
  Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../services/supabase';

export default function MyTreesScreen() {
  const [minhasMudas, setMinhasMudas] = useState([]);
  const [pontos, setPontos] = useState(120);
  const [sugestao, setSugestao] = useState('');
  const [regasHoje, setRegasHoje] = useState({}); // { [idMuda]: 'YYYY-MM-DD' }
  const [fotosEvolucao, setFotosEvolucao] = useState({}); // { [idMuda]: uri }

  const obterDataHoje = () => new Date().toISOString().split('T')[0];

  async function carregarDados() {
    // 1. Carrega XP, regas e fotos salvas localmente
    try {
      const xpSalvo = await AsyncStorage.getItem('@fortaleza_verde_xp');
      if (xpSalvo !== null) setPontos(Number(xpSalvo));

      const regasSalvas = await AsyncStorage.getItem('@fortaleza_verde_regas');
      if (regasSalvas) setRegasHoje(JSON.parse(regasSalvas));

      const fotosSalvas = await AsyncStorage.getItem('@fortaleza_verde_fotos');
      if (fotosSalvas) setFotosEvolucao(JSON.parse(fotosSalvas));
    } catch (e) {
      console.log('Erro ao ler dados locais', e);
    }

    // 2. Busca as mudas no Supabase
    const { data, error } = await supabase
      .from('solicitacoes_plantio')
      .select('*')
      .order('criado_em', { ascending: false });

    if (!error && data) {
      setMinhasMudas(data);
    }
  }

  useEffect(() => {
    carregarDados();
  }, []);

  async function adicionarPontos(valor) {
    const novoTotal = pontos + valor;
    setPontos(novoTotal);
    await AsyncStorage.setItem('@fortaleza_verde_xp', String(novoTotal));
  }

  // Regra: Apenas 1 rega por dia por árvore
  async function registrarRega(item) {
    const hoje = obterDataHoje();
    const jaRegouHoje =
      regasHoje[item.id] === hoje || item.ultima_rega === hoje;

    if (jaRegouHoje) {
      Alert.alert(
        'Muda já hidratada hoje! 💧',
        `Você já registrou a rega do seu ${item.especie_escolhida} hoje. Volte amanhã para ganhar mais +15 XP!`
      );
      return;
    }

    // Atualiza estado local e AsyncStorage
    const novasRegas = { ...regasHoje, [item.id]: hoje };
    setRegasHoje(novasRegas);
    await AsyncStorage.setItem('@fortaleza_verde_regas', JSON.stringify(novasRegas));

    // Atualiza também no Supabase (se a coluna existir)
    await supabase
      .from('solicitacoes_plantio')
      .update({ ultima_rega: hoje })
      .eq('id', item.id);

    await adicionarPontos(15);

    Alert.alert(
      '💧 Rega Diária Registrada!',
      `Você cuidou do seu ${item.especie_escolhida} hoje e ganhou +15 XP!`
    );
  }

  // Abre Câmera ou Galeria para registrar foto real de evolução da muda
  function abrirOpcoesFotoEvolucao(item) {
    Alert.alert(
      'Registrar Evolução da Muda 📸',
      'Como deseja enviar a foto de acompanhamento da sua árvore?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: '📷 Tirar Foto Agora',
          onPress: () => capturarImagemEvolucao(item, 'camera'),
        },
        {
          text: '🖼️ Escolher da Galeria',
          onPress: () => capturarImagemEvolucao(item, 'galeria'),
        },
      ]
    );
  }

  async function capturarImagemEvolucao(item, origem) {
    try {
      let result;

      if (origem === 'camera') {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (perm.status !== 'granted') {
          Alert.alert('Permissão necessária', 'Libere o acesso à câmera para tirar a foto.');
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          quality: 0.6,
        });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          quality: 0.6,
        });
      }

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri;

        // Salva no estado e AsyncStorage para exibir imediatamente no card
        const novasFotos = { ...fotosEvolucao, [item.id]: uri };
        setFotosEvolucao(novasFotos);
        await AsyncStorage.setItem('@fortaleza_verde_fotos', JSON.stringify(novasFotos));

        // Atualiza status e URL da foto no Supabase
        await supabase
          .from('solicitacoes_plantio')
          .update({
            foto_evolucao_url: uri,
            status: 'Em Crescimento 🌿',
          })
          .eq('id', item.id);

        // Atualiza lista local e dá +30 XP
        setMinhasMudas((prev) =>
          prev.map((m) =>
            m.id === item.id
              ? { ...m, status: 'Em Crescimento 🌿', foto_evolucao_url: uri }
              : m
          )
        );

        await adicionarPontos(30);

        Alert.alert(
          'Evolução Registrada! 🌳✨',
          `A foto do seu ${item.especie_escolhida} foi salva com sucesso! Você ganhou +30 XP!`
        );
      }
    } catch (error) {
      Alert.alert('Erro ao capturar foto', error.message);
    }
  }

  async function enviarFeedback() {
    if (!sugestao.trim()) {
      Alert.alert('Atenção', 'Escreva sua sugestão ou relato antes de enviar.');
      return;
    }
    setSugestao('');
    await adicionarPontos(20);
    Alert.alert(
      'Feedback Recebido! 💬',
      'Obrigado por colaborar com a melhoria da arborização em Fortaleza (+20 XP).'
    );
  }

  const hoje = obterDataHoje();

  return (
    <View style={styles.container}>
      {/* Painel de Gamificação */}
      <View style={styles.cardGamificacao}>
        <Text style={styles.badgeTitulo}>🏅 Guardião Ambiental de Fortaleza</Text>
        <Text style={styles.xpTexto}>{pontos} Pontos de Impacto Verde (XP)</Text>
        <Text style={styles.metaTexto}>
          Regue suas mudas 1x por dia (+15 XP) e registre fotos de crescimento (+30 XP)!
        </Text>
      </View>

      <Text style={styles.secaoTitulo}>Minhas Árvores e Evolução ({minhasMudas.length})</Text>

      <FlatList
        data={minhasMudas}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => {
          const jaRegouHoje =
            regasHoje[item.id] === hoje || item.ultima_rega === hoje;
          const fotoAtual = fotosEvolucao[item.id] || item.foto_evolucao_url;

          return (
            <View style={styles.cardMuda}>
              <View style={styles.rowHeader}>
                <Text style={styles.especieTitulo}>🌱 {item.especie_escolhida}</Text>
                <Text style={styles.statusBadge}>{item.status}</Text>
              </View>
              <Text style={styles.detalheTexto}>📍 {item.endereco} - {item.bairro}</Text>
              <Text style={styles.detalheTexto}>👤 Guardião: {item.nome_morador}</Text>

              {/* Exibe a foto de evolução se o morador já tiver registrado */}
              {fotoAtual ? (
                <View style={styles.containerFotoEvolucao}>
                  <Text style={styles.labelFotoEvolucao}>📸 Último registro de evolução:</Text>
                  <Image source={{ uri: fotoAtual }} style={styles.imagemEvolucao} />
                </View>
              ) : null}

              <View style={styles.acoesRow}>
                <TouchableOpacity
                  style={[styles.btnAcao, jaRegouHoje && styles.btnAcaoDesativado]}
                  onPress={() => registrarRega(item)}
                >
                  <Text
                    style={[
                      styles.btnAcaoTexto,
                      jaRegouHoje && styles.btnAcaoTextoDesativado,
                    ]}
                  >
                    {jaRegouHoje ? '✅ Regada Hoje' : '💧 Registrar Rega (+15 XP)'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.btnAcaoFoto}
                  onPress={() => abrirOpcoesFotoEvolucao(item)}
                >
                  <Text style={styles.btnAcaoFotoTexto}>
                    {fotoAtual ? '📸 Atualizar Foto' : '📸 Foto de Evolução'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
        ListFooterComponent={
          <View style={styles.boxFeedback}>
            <Text style={styles.secaoTitulo}>Opine e Sugira Melhorias</Text>
            <TextInput
              style={styles.inputFeedback}
              placeholder="Relate problemas na sua rua ou dê sugestões para o app..."
              value={sugestao}
              onChangeText={setSugestao}
              multiline
            />
            <TouchableOpacity style={styles.btnFeedback} onPress={enviarFeedback}>
              <Text style={styles.btnFeedbackTexto}>Enviar Sugestão Comunitária</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#F3F4F6' },
  cardGamificacao: {
    backgroundColor: '#166534',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  badgeTitulo: { color: '#FEF08A', fontSize: 16, fontWeight: 'bold' },
  xpTexto: { color: '#FFFFFF', fontSize: 22, fontWeight: 'bold', marginVertical: 4 },
  metaTexto: { color: '#DCFCE7', fontSize: 12 },
  secaoTitulo: { fontSize: 16, fontWeight: 'bold', color: '#1F2937', marginBottom: 10 },
  cardMuda: {
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 10,
    marginBottom: 12,
    elevation: 2,
  },
  rowHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  especieTitulo: { fontSize: 15, fontWeight: 'bold', color: '#15803D' },
  statusBadge: {
    backgroundColor: '#FEF9C3',
    color: '#854D0E',
    fontSize: 11,
    fontWeight: 'bold',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  detalheTexto: { fontSize: 13, color: '#4B5563', marginBottom: 2 },
  containerFotoEvolucao: { marginTop: 10, marginBottom: 4 },
  labelFotoEvolucao: { fontSize: 12, fontWeight: '600', color: '#166534', marginBottom: 6 },
  imagemEvolucao: { width: '100%', height: 150, borderRadius: 8 },
  acoesRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  btnAcao: {
    flex: 0.48,
    backgroundColor: '#E0F2FE',
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnAcaoDesativado: {
    backgroundColor: '#E5E7EB',
  },
  btnAcaoTexto: { color: '#0369A1', fontSize: 12, fontWeight: 'bold', textAlign: 'center' },
  btnAcaoTextoDesativado: { color: '#4B5563' },
  btnAcaoFoto: {
    flex: 0.48,
    backgroundColor: '#DCFCE7',
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnAcaoFotoTexto: { color: '#15803D', fontSize: 12, fontWeight: 'bold', textAlign: 'center' },
  boxFeedback: {
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 10,
    marginTop: 8,
    marginBottom: 24,
  },
  inputFeedback: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 10,
    minHeight: 60,
    textAlignVertical: 'top',
    marginBottom: 10,
  },
  btnFeedback: {
    backgroundColor: '#15803D',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnFeedbackTexto: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 14 },
});