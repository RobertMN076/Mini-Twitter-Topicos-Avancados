import { useCallback, useState } from "react";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { File } from "expo-file-system";
import { ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { isAxiosError } from "axios";

import { api } from "../../services/api";

type Usuario = {
  id: string;
  nome: string;
  email: string;
  userName: string;
};

type Postagem = {
  id: string;
  texto: string;
  criadoEm: string;
  autorId: string;
  autorNome: string;
  autorUserName: string | null;
  temImagem: boolean;
};

function formatarData(valor: string) {
  const data = new Date(valor);

  if (Number.isNaN(data.getTime())) return "";

  return data.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function FeedScreen() {
  const router = useRouter();

  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [postagens, setPostagens] = useState<Postagem[]>([]);
  const [token, setToken] = useState<string | null>(null);

  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [erro, setErro] = useState("");


  const [postagemEditando, setPostagemEditando] = useState<Postagem | null>(null);
  const [textoEdicao, setTextoEdicao] = useState("");
  const [removerImagemEdicao, setRemoverImagemEdicao] = useState(false);
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);
  const [excluindoId, setExcluindoId] = useState<string | null>(null);
  const [novaImagemEdicao, setNovaImagemEdicao] = useState<string | null>(null);
  const [selecionandoImagemEdicao, setSelecionandoImagemEdicao] = useState(false);

  const [versoesImagem, setVersoesImagem] = useState<Record<string, number>>({});

  const carregarDados = useCallback(async () => {
    try {
      const tokenSalvo = await SecureStore.getItemAsync("minitwitter_token");

      if (!tokenSalvo) {
        router.replace("/");
        return;
      }

      const [resUsuario, resPostagens] = await Promise.all([
        api.get<Usuario>("/api/auth/me"),
        api.get<Postagem[]>("/api/postagens"),
      ]);

      setToken(tokenSalvo);
      setUsuario(resUsuario.data);
      setPostagens(resPostagens.data);
      setErro("");
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 401) {
        await SecureStore.deleteItemAsync("minitwitter_token");
        router.replace("/");
        return;
      }

      console.error("Erro ao carregar o feed:", error);
      setErro("Não foi possível carregar as publicações.");
    } finally {
      setCarregando(false);
      setAtualizando(false);
    }
  }, [router]);


  useFocusEffect(
    useCallback(() => {
      void carregarDados();
    }, [carregarDados])
  );

  function atualizarFeed() {
    setAtualizando(true);
    void carregarDados();
  }

  async function tratarErroOperacao(error: unknown) {
    if (isAxiosError(error) && error.response?.status === 401) {
      await SecureStore.deleteItemAsync("minitwitter_token");
      router.replace("/");
      return;
    }

    const dados = isAxiosError(error) ? error.response?.data : undefined;
    const erros = dados?.erros ?? (dados?.errors
      ? Object.values(dados.errors as Record<string, string[]>).flat()
      : undefined);
    const mensagem = dados?.mensagem ??
      (Array.isArray(erros) && erros.length ? erros.join("\n") : undefined) ??
      (isAxiosError(error) && !error.response
        ? "Não foi possível conectar à API."
        : "Não foi possível realizar a operação.");

    Alert.alert("Erro", mensagem);
  }

  function abrirEdicao(postagem: Postagem) {
    setPostagemEditando(postagem);
    setTextoEdicao(postagem.texto);
    setRemoverImagemEdicao(false);
    setNovaImagemEdicao(null);
  }

  async function selecionarImagemEdicao() {
    if (salvandoEdicao || selecionandoImagemEdicao) return;
    setSelecionandoImagemEdicao(true);

    try {
      const resultado = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: false,
        quality: 1,
      });
      if (resultado.canceled || !resultado.assets.length) return;

      const foto = resultado.assets[0];
      const convertida = await ImageManipulator.manipulateAsync(
        foto.uri,
        foto.width > 1600 ? [{ resize: { width: 1600 } }] : [],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
      );

      const arquivo = new File(convertida.uri);
      if (arquivo.size === 0) {
        throw new Error("Não foi possível ler a imagem selecionada.");
      }
      if (arquivo.size > 5 * 1024 * 1024) {
        Alert.alert("Imagem muito grande", "Selecione uma imagem de até 5 MB.");
        return;
      }

      setNovaImagemEdicao(convertida.uri);
      setRemoverImagemEdicao(false);
    } catch (error) {
      Alert.alert(
        "Erro na imagem",
        error instanceof Error ? error.message : "Não foi possível selecionar a imagem."
      );
    } finally {
      setSelecionandoImagemEdicao(false);
    }
  }

  async function salvarEdicao() {
    if (!postagemEditando || salvandoEdicao || selecionandoImagemEdicao) return;

    const novoTexto = textoEdicao.trim();
    const manterImagem = postagemEditando.temImagem && !removerImagemEdicao;
    const temImagemFinal = novaImagemEdicao !== null || manterImagem;

    if (!novoTexto && !temImagemFinal) {
      Alert.alert("Atenção", "A postagem precisa ter texto ou imagem.");
      return;
    }

    const idEditado = postagemEditando.id;
    setSalvandoEdicao(true);

    try {
      const formData = new FormData();
      formData.append("Texto", novoTexto);

      if (novaImagemEdicao) {

        formData.append("RemoverImagem", "false");
        formData.append(
          "Imagem",
          {
            uri: novaImagemEdicao,
            name: "postagem.jpg",
            type: "image/jpeg",
          } as unknown as Blob
        );
      } else {
        formData.append("RemoverImagem", removerImagemEdicao ? "true" : "false");
      }

      await api.put(`/api/postagens/${idEditado}`, formData, {
        headers: { "Content-Type": undefined },
      });

      setPostagens((anteriores) =>
        anteriores.map((postagem) =>
          postagem.id === idEditado
            ? { ...postagem, texto: novoTexto, temImagem: temImagemFinal }
            : postagem
        )
      );

      if (novaImagemEdicao || removerImagemEdicao) {
        setVersoesImagem((anteriores) => ({
          ...anteriores,
          [idEditado]: (anteriores[idEditado] ?? 0) + 1,
        }));
      }

      setPostagemEditando(null);
      setNovaImagemEdicao(null);
      setRemoverImagemEdicao(false);
    } catch (error) {
      await tratarErroOperacao(error);
    } finally {
      setSalvandoEdicao(false);
    }
  }

  async function excluirPostagem(id: string) {
    if (excluindoId) return;

    setExcluindoId(id);

    try {
      await api.delete(`/api/postagens/${id}`);
      setPostagens((anteriores) =>
        anteriores.filter((postagem) => postagem.id !== id)
      );
    } catch (error) {
      await tratarErroOperacao(error);
    } finally {
      setExcluindoId(null);
    }
  }

  function confirmarExclusao(id: string) {
    Alert.alert("Excluir publicação", "Essa ação não poderá ser desfeita.", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Excluir",
        style: "destructive",
        onPress: () => void excluirPostagem(id),
      },
    ]);
  }

  function renderizarPostagem({ item }: { item: Postagem }) {
    const postagemPropria =
      usuario?.id.toLowerCase() === item.autorId.toLowerCase();

    return (
      <View style={styles.postCard}>
        <View style={styles.autorContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {item.autorNome.charAt(0).toUpperCase() || "?"}
            </Text>
          </View>

          <View style={styles.autorInfo}>
            <Text style={styles.autorNome}>{item.autorNome}</Text>
            <Text style={styles.usuarioNome}>
              @{item.autorUserName ?? "usuario"}
            </Text>
            <Text style={styles.data}>{formatarData(item.criadoEm)}</Text>
          </View>
        </View>

        {!!item.texto && <Text style={styles.postTexto}>{item.texto}</Text>}

        {item.temImagem && token && (
          <Image
            source={{
              uri: `${api.defaults.baseURL}/api/postagens/${item.id}/imagem?v=${versoesImagem[item.id] ?? 0}`,
              headers: { Authorization: `Bearer ${token}` },
            }}
            style={styles.postImagem}
            contentFit="contain"
            cachePolicy="none"
            onError={(evento) => {
              console.log(`Erro ao carregar imagem ${item.id}:`, evento.error);
            }}
          />
        )}

        {postagemPropria && (
          <View style={styles.acoesPost}>
            <Pressable
              style={styles.botaoAcao}
              onPress={() => abrirEdicao(item)}
              disabled={excluindoId === item.id}
            >
              <Text style={styles.textoEditar}>Editar</Text>
            </Pressable>

            <Pressable
              style={styles.botaoAcao}
              onPress={() => confirmarExclusao(item.id)}
              disabled={excluindoId === item.id}
            >
              <Text style={styles.textoExcluir}>
                {excluindoId === item.id ? "Excluindo..." : "Excluir"}
              </Text>
            </Pressable>
          </View>
        )}
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logo}>
          MiniTwitter<Text style={styles.logoDot}>.</Text>
        </Text>
        <Text style={styles.headerSubtitle}>Sua comunidade</Text>
      </View>

      {carregando ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#0ea5e9" />
          <Text style={styles.mensagem}>Carregando publicações...</Text>
        </View>
      ) : (
        <FlatList
          data={postagens}
          keyExtractor={(item) => item.id}
          renderItem={renderizarPostagem}
          contentContainerStyle={styles.lista}
          refreshControl={
            <RefreshControl
              refreshing={atualizando}
              onRefresh={atualizarFeed}
              tintColor="#38bdf8"
              colors={["#0ea5e9"]}
            />
          }
          ListHeaderComponent={
            <View style={styles.welcome}>
              <Text style={styles.welcomeTitle}>
                Olá, {usuario?.nome ?? "usuário"}! 👋
              </Text>
              <Text style={styles.welcomeSubtitle}>
                Veja o que está acontecendo na comunidade.
              </Text>
              <Text style={styles.sectionTitle}>Feed de publicações</Text>

              {!!erro && (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{erro}</Text>
                  <Pressable onPress={atualizarFeed}>
                    <Text style={styles.retryText}>Tentar novamente</Text>
                  </Pressable>
                </View>
              )}
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <Text style={styles.mensagem}>
                {erro
                  ? "Não foi possível exibir o feed."
                  : "Ainda não existem publicações para mostrar."}
              </Text>
            </View>
          }
        />
      )}


      <Modal
        visible={postagemEditando !== null}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!salvandoEdicao) setPostagemEditando(null);
        }}
      >
        <KeyboardAvoidingView
          style={styles.modalFundo}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.modalScroll}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.modalCard}>
              <Text style={styles.modalTitulo}>Editar publicação</Text>

              <TextInput
                style={styles.modalInput}
                multiline
                textAlignVertical="top"
                maxLength={280}
                value={textoEdicao}
                onChangeText={setTextoEdicao}
                editable={!salvandoEdicao}
                placeholder="Edite sua publicação..."
                placeholderTextColor="#71717a"
              />

              <Text style={styles.contadorEdicao}>
                {textoEdicao.length}/280 caracteres
              </Text>

              {novaImagemEdicao ? (
                <Image
                  source={{ uri: novaImagemEdicao }}
                  style={styles.previewEdicao}
                  contentFit="contain"
                />
              ) : postagemEditando?.temImagem && !removerImagemEdicao && token ? (
                <Image
                  source={{
                    uri: `${api.defaults.baseURL}/api/postagens/${postagemEditando.id}/imagem?v=${versoesImagem[postagemEditando.id] ?? 0}`,
                    headers: { Authorization: `Bearer ${token}` },
                  }}
                  style={styles.previewEdicao}
                  contentFit="contain"
                  cachePolicy="none"
                />
              ) : (
                <Text style={styles.semImagem}>Nenhuma imagem selecionada.</Text>
              )}

              <Pressable
                style={styles.botaoImagemEdicao}
                onPress={() => void selecionarImagemEdicao()}
                disabled={salvandoEdicao || selecionandoImagemEdicao}
              >
                <Text style={styles.textoBotaoImagemEdicao}>
                  {selecionandoImagemEdicao
                    ? "Preparando imagem..."
                    : novaImagemEdicao || postagemEditando?.temImagem
                      ? "Escolher outra imagem"
                      : "Adicionar imagem"}
                </Text>
              </Pressable>

              {(novaImagemEdicao ||
                (postagemEditando?.temImagem && !removerImagemEdicao)) && (
                <Pressable
                  disabled={salvandoEdicao || selecionandoImagemEdicao}
                  onPress={() => {
                    setNovaImagemEdicao(null);
                    setRemoverImagemEdicao(true);
                  }}
                >
                  <Text style={styles.removerImagemEdicao}>Remover imagem</Text>
                </Pressable>
              )}

              {postagemEditando?.temImagem && removerImagemEdicao && !novaImagemEdicao && (
                <Pressable
                  disabled={salvandoEdicao || selecionandoImagemEdicao}
                  onPress={() => setRemoverImagemEdicao(false)}
                >
                  <Text style={styles.restaurarImagemEdicao}>
                    Manter imagem original
                  </Text>
                </Pressable>
              )}

              <View style={styles.modalBotoes}>
                <Pressable
                  style={styles.cancelarEdicao}
                  onPress={() => setPostagemEditando(null)}
                  disabled={salvandoEdicao || selecionandoImagemEdicao}
                >
                  <Text style={styles.cancelarTexto}>Cancelar</Text>
                </Pressable>

                <Pressable
                  style={styles.salvarEdicao}
                  onPress={() => void salvarEdicao()}
                  disabled={salvandoEdicao || selecionandoImagemEdicao}
                >
                  <Text style={styles.salvarTexto}>
                    {salvandoEdicao ? "Salvando..." : "Salvar"}
                  </Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#09090b",
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#27272a",
  },
  logo: {
    color: "#38bdf8",
    fontSize: 25,
    fontWeight: "800",
    letterSpacing: -1,
  },
  logoDot: {
    color: "#ffffff",
  },
  headerSubtitle: {
    color: "#71717a",
    fontSize: 12,
    marginTop: 4,
  },
  lista: {
    padding: 16,
    paddingBottom: 40,
    flexGrow: 1,
  },
  welcome: {
    marginBottom: 12,
  },
  welcomeTitle: {
    color: "#ffffff",
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 8,
  },
  welcomeSubtitle: {
    color: "#a1a1aa",
    fontSize: 14,
    marginBottom: 28,
  },
  sectionTitle: {
    color: "#ffffff",
    fontSize: 19,
    fontWeight: "700",
    marginBottom: 12,
  },
  postCard: {
    backgroundColor: "#18181b",
    borderWidth: 1,
    borderColor: "#27272a",
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
  },
  autorContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#082f49",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#075985",
  },
  avatarText: {
    color: "#38bdf8",
    fontSize: 19,
    fontWeight: "700",
  },
  autorInfo: {
    flex: 1,
  },
  autorNome: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
  },
  usuarioNome: {
    color: "#a1a1aa",
    fontSize: 13,
    marginTop: 2,
  },
  data: {
    color: "#71717a",
    fontSize: 11,
    marginTop: 4,
  },
  postTexto: {
    color: "#e4e4e7",
    fontSize: 15,
    lineHeight: 23,
  },
  postImagem: {
    width: "100%",
    height: 240,
    borderRadius: 12,
    backgroundColor: "#09090b",
    marginTop: 14,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  mensagem: {
    color: "#a1a1aa",
    fontSize: 14,
    textAlign: "center",
  },
  emptyCard: {
    borderWidth: 1,
    borderColor: "#27272a",
    borderRadius: 14,
    padding: 24,
  },
  errorBox: {
    backgroundColor: "#450a0a",
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    gap: 10,
  },
  errorText: {
    color: "#fca5a5",
    fontSize: 13,
  },
  retryText: {
    color: "#38bdf8",
    fontWeight: "700",
  },
  acoesPost: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 20,
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#27272a",
  },
  botaoAcao: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  textoEditar: {
    color: "#38bdf8",
    fontSize: 13,
    fontWeight: "600",
  },
  textoExcluir: {
    color: "#f87171",
    fontSize: 13,
    fontWeight: "600",
  },
  modalFundo: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
  },
  modalScroll: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    backgroundColor: "#18181b",
    borderWidth: 1,
    borderColor: "#3f3f46",
    borderRadius: 18,
    padding: 22,
    gap: 16,
  },
  modalTitulo: {
    color: "#ffffff",
    fontSize: 21,
    fontWeight: "800",
  },
  modalInput: {
    backgroundColor: "#09090b",
    color: "#ffffff",
    borderWidth: 1,
    borderColor: "#3f3f46",
    borderRadius: 12,
    minHeight: 130,
    padding: 14,
    fontSize: 15,
  },
  contadorEdicao: {
    color: "#71717a",
    fontSize: 12,
    textAlign: "right",
  },
  removerImagemEdicao: {
    color: "#f87171",
    fontWeight: "600",
    fontSize: 13,
  },
  previewEdicao: {
    width: "100%",
    height: 210,
    borderRadius: 12,
    backgroundColor: "#09090b",
  },
  semImagem: {
    color: "#71717a",
    fontSize: 13,
  },
  botaoImagemEdicao: {
    backgroundColor: "#082f49",
    borderWidth: 1,
    borderColor: "#075985",
    borderRadius: 12,
    alignItems: "center",
    paddingVertical: 13,
  },
  textoBotaoImagemEdicao: {
    color: "#38bdf8",
    fontWeight: "700",
  },
  restaurarImagemEdicao: {
    color: "#38bdf8",
    fontSize: 13,
    fontWeight: "600",
  },
  modalBotoes: {
    flexDirection: "row",
    gap: 12,
  },
  cancelarEdicao: {
    flex: 1,
    backgroundColor: "#27272a",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  cancelarTexto: {
    color: "#e4e4e7",
    fontWeight: "700",
  },
  salvarEdicao: {
    flex: 1,
    backgroundColor: "#0ea5e9",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  salvarTexto: {
    color: "#ffffff",
    fontWeight: "700",
  },
});
