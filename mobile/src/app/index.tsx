
import { useState, useEffect } from "react";
import { isAxiosError } from "axios";
import * as SecureStore from "expo-secure-store";
import { api } from "../services/api";
import { useRouter } from "expo-router";

import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function LoginScreen() {

  const router = useRouter();
  const [verificandoSessao, setVerificandoSessao] = useState(true);
  const [carregando, setCarregando] = useState(false);
  const [cadastro, setCadastro] = useState(false);

  const [nome, setNome] = useState("");
  const [nomeUsuario, setNomeUsuario] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");


  useEffect(() => {
    let ativo = true;

    async function verificarSessao() {
      try {
        const token = await SecureStore.getItemAsync(
          "minitwitter_token"
        );

        if (!ativo) return;

        if (token) {
          router.replace("/feed");
          return;
        }
      } catch (error) {
        console.error("Erro ao verificar sessão:", error);
      }

      if (ativo) {
        setVerificandoSessao(false);
      }
    }

    void verificarSessao();

    return () => {
      ativo = false;
    };
  }, [router]);


  function alternarModo(modo: boolean) {
    setCadastro(modo);
    setSenha("");
  }


  async function enviar() {
    if (carregando) return;

    const emailLimpo = email.trim();

    if (
      !emailLimpo ||
      !senha ||
      (cadastro && (!nome.trim() || !nomeUsuario.trim()))
    ) {
      Alert.alert("Atenção", "Preencha todos os campos.");
      return;
    }

    setCarregando(true);

    try {
      if (cadastro) {

        await api.post("/api/auth/cadastro", {
          nome: nome.trim(),
          nomeUsuario: nomeUsuario.trim(),
          email: emailLimpo,
          senha,
        });

        alternarModo(false);

        Alert.alert(
          "Cadastro realizado!",
          "Sua conta foi criada. Agora faça o login."
        );
      } else {

        const resposta = await api.post<{
          token: string;
        }>("/api/auth/login", {
          email: emailLimpo,
          senha,
        });

        const token = resposta.data.token;

        if (!token) {
          throw new Error("Token não recebido da API.");
        }


        await SecureStore.setItemAsync(
          "minitwitter_token",
          token
        );

        router.replace("/feed")
      }
    } catch (error) {
      if (isAxiosError(error)) {
        const dados = error.response?.data;

        const mensagem =
          dados?.mensagem ||
          dados?.erros?.join("\n") ||
          (dados?.errors
            ? Object.values(dados.errors as Record<string, string[]>)
              .flat()
              .join("\n")
            : undefined) ||
          (error.response
            ? "Não foi possível realizar a operação."
            : "Não foi possível conectar à API.");

        Alert.alert("Erro", mensagem);
      } else {
        Alert.alert(
          "Erro",
          error instanceof Error
            ? error.message
            : "Ocorreu um erro inesperado."
        );
      }
    } finally {
      setCarregando(false);
    }
  }


  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.formContainer}>

            <Text style={styles.logo}>
              MiniTwitter<Text style={styles.logoDot}>.</Text>
            </Text>

            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                Conecte-se. Compartilhe. Descubra.
              </Text>
            </View>


            <View style={styles.header}>
              <Text style={styles.eyebrow}>
                {cadastro
                  ? "JUNTE-SE À COMUNIDADE"
                  : "BEM-VINDO DE VOLTA"}
              </Text>

              <Text style={styles.title}>
                {cadastro
                  ? "Crie sua conta"
                  : "Entre na sua conta"}
              </Text>

              <Text style={styles.description}>
                {cadastro
                  ? "Preencha seus dados e comece a compartilhar."
                  : "Acesse seu perfil e descubra as novidades do feed."}
              </Text>
            </View>


            <View style={styles.tabs}>
              <Pressable
                style={[
                  styles.tab,
                  !cadastro && styles.tabActive,
                ]}
                onPress={() => alternarModo(false)}
              >
                <Text
                  style={[
                    styles.tabText,
                    !cadastro && styles.tabTextActive,
                  ]}
                >
                  Entrar
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.tab,
                  cadastro && styles.tabActive,
                ]}
                onPress={() => alternarModo(true)}
              >
                <Text
                  style={[
                    styles.tabText,
                    cadastro && styles.tabTextActive,
                  ]}
                >
                  Criar conta
                </Text>
              </Pressable>
            </View>


            <View style={styles.form}>
              {cadastro && (
                <>
                  <View style={styles.field}>
                    <Text style={styles.label}>
                      Nome completo
                    </Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Seu nome"
                      placeholderTextColor="#52525b"
                      value={nome}
                      onChangeText={setNome}
                      maxLength={100}
                    />
                  </View>

                  <View style={styles.field}>
                    <Text style={styles.label}>
                      Nome de usuário
                    </Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Ex: robertin"
                      placeholderTextColor="#52525b"
                      autoCapitalize="none"
                      value={nomeUsuario}
                      onChangeText={setNomeUsuario}
                      maxLength={30}
                    />
                  </View>
                </>
              )}

              <View style={styles.field}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={styles.input}
                  placeholder="seuemail@exemplo.com"
                  placeholderTextColor="#52525b"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  value={email}
                  onChangeText={setEmail}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Senha</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Digite sua senha"
                  placeholderTextColor="#52525b"
                  secureTextEntry
                  autoCapitalize="none"
                  value={senha}
                  onChangeText={setSenha}
                />

                {cadastro && (
                  <Text style={styles.hint}>
                    Mínimo de 8 caracteres, incluindo letra
                    minúscula e número.
                  </Text>
                )}
              </View>


              <Pressable
                style={({ pressed }) => [
                  styles.submitButton,
                  (pressed || carregando) && styles.buttonPressed,
                ]}
                onPress={enviar}
                disabled={carregando}
              >
                <Text style={styles.submitText}>
                  {carregando
                    ? "Aguarde..."
                    : cadastro
                      ? "Criar minha conta →"
                      : "Entrar no MiniTwitter →"}
                </Text>
              </Pressable>

            </View>

            <Text style={styles.footer}>
              Compartilhe o que pensa. Descubra o que acontece.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#09090b",
  },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 28,
    paddingVertical: 32,
  },
  formContainer: {
    width: "100%",
    maxWidth: 440,
    alignSelf: "center",
  },
  logo: {
    color: "#38bdf8",
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -1,
    marginBottom: 28,
  },
  logoDot: {
    color: "#ffffff",
  },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 24,
    backgroundColor: "#082f49",
    borderWidth: 1,
    borderColor: "#075985",
    marginBottom: 28,
  },
  badgeText: {
    color: "#7dd3fc",
    fontSize: 12,
    fontWeight: "500",
  },
  header: {
    marginBottom: 28,
  },
  eyebrow: {
    color: "#38bdf8",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 2,
    marginBottom: 12,
  },
  title: {
    color: "#ffffff",
    fontSize: 31,
    fontWeight: "800",
    letterSpacing: -0.8,
    marginBottom: 12,
  },
  description: {
    color: "#a1a1aa",
    fontSize: 14,
    lineHeight: 22,
  },
  tabs: {
    flexDirection: "row",
    backgroundColor: "#18181b",
    borderWidth: 1,
    borderColor: "#27272a",
    borderRadius: 12,
    padding: 4,
    marginBottom: 28,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 13,
    borderRadius: 9,
  },
  tabActive: {
    backgroundColor: "#0ea5e9",
  },
  tabText: {
    color: "#a1a1aa",
    fontSize: 14,
    fontWeight: "600",
  },
  tabTextActive: {
    color: "#ffffff",
  },
  form: {
    gap: 20,
  },
  field: {
    gap: 9,
  },
  label: {
    color: "#d4d4d8",
    fontSize: 14,
    fontWeight: "500",
  },
  input: {
    backgroundColor: "#18181b",
    borderWidth: 1,
    borderColor: "#3f3f46",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 15,
    fontSize: 14,
    color: "#ffffff",
  },
  hint: {
    color: "#71717a",
    fontSize: 12,
    lineHeight: 18,
  },
  submitButton: {
    backgroundColor: "#0ea5e9",
    borderRadius: 12,
    paddingVertical: 17,
    alignItems: "center",
    marginTop: 8,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  submitText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
  },
  footer: {
    color: "#71717a",
    textAlign: "center",
    fontSize: 12,
    marginTop: 40,
    lineHeight: 19,
  },
});
