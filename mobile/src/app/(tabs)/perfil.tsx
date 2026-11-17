import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { isAxiosError } from "axios";
import * as SecureStore from "expo-secure-store";
import { api } from "../../services/api";

type Usuario = {
    id: string;
    nome: string;
    userName: string;
    email: string;
};

type ErroApi = {
    mensagem?: string;
    erros?: string[];
    errors?: Record<string, string[]>;
};

function mensagemDoErro(erro: unknown, padrao: string): string {
    if (!isAxiosError(erro)) return padrao;

    if (!erro.response) {
        return "Não foi possível conectar à API. Verifique a rede e o backend.";
    }

    const dados = erro.response.data as ErroApi | undefined;
    if (dados?.mensagem) return dados.mensagem;
    if (Array.isArray(dados?.erros) && dados.erros.length) {
        return dados.erros.join("\n");
    }
    if (dados?.errors) {
        const mensagens = Object.values(dados.errors).flat();
        if (mensagens.length) return mensagens.join("\n");
    }
    return padrao;
}

export default function PerfilScreen() {
    const router = useRouter();
    const [usuario, setUsuario] = useState<Usuario | null>(null);
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState("");
    const [salvandoPerfil, setSalvandoPerfil] = useState(false);
    const [alterandoSenha, setAlterandoSenha] = useState(false);

    const [nome, setNome] = useState("");
    const [nomeUsuario, setNomeUsuario] = useState("");
    const [email, setEmail] = useState("");
    const [senhaAtual, setSenhaAtual] = useState("");
    const [novaSenha, setNovaSenha] = useState("");
    const [confirmarSenha, setConfirmarSenha] = useState("");

    const ocupado = salvandoPerfil || alterandoSenha;

    const aplicarUsuario = useCallback((dados: Usuario) => {
        setUsuario(dados);
        setNome(dados.nome);
        setNomeUsuario(dados.userName);
        setEmail(dados.email);
    }, []);

    const encerrarSessao = useCallback(async () => {
        await SecureStore.deleteItemAsync("minitwitter_token");
        router.replace("/");
    }, [router]);

    const tratarErro = useCallback(
        async (error: unknown, padrao: string) => {
            if (isAxiosError(error) && error.response?.status === 401) {
                try {
                    await encerrarSessao();
                } catch {
                    Alert.alert("Erro", "Não foi possível limpar a sessão.");
                }
                return;
            }
            Alert.alert("Erro", mensagemDoErro(error, padrao));
        },
        [encerrarSessao]
    );

    useFocusEffect(
        useCallback(() => {
            let ativo = true;

            async function carregarPerfil() {
                setCarregando(true);
                setErro("");
                try {
                    const resposta = await api.get<Usuario>("/api/auth/me");
                    if (ativo) aplicarUsuario(resposta.data);
                } catch (error) {
                    if (isAxiosError(error) && error.response?.status === 401) {
                        if (ativo) await encerrarSessao();
                        return;
                    }
                    if (ativo) setErro(mensagemDoErro(error, "Não foi possível carregar seu perfil."));
                } finally {
                    if (ativo) setCarregando(false);
                }
            }

            void carregarPerfil();
            return () => {
                ativo = false;
            };
        }, [aplicarUsuario, encerrarSessao])
    );

    async function salvarPerfil() {
        if (ocupado || !usuario) return;

        const nomeLimpo = nome.trim();
        const usuarioLimpo = nomeUsuario.trim();
        const emailLimpo = email.trim();

        if (nomeLimpo.length < 2 || nomeLimpo.length > 100) {
            Alert.alert("Atenção", "O nome deve ter entre 2 e 100 caracteres.");
            return;
        }
        if (usuarioLimpo.length < 3 || usuarioLimpo.length > 30) {
            Alert.alert("Atenção", "O nome de usuário deve ter entre 3 e 30 caracteres.");
            return;
        }
        if (emailLimpo.length > 256 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLimpo)) {
            Alert.alert("Atenção", "Informe um email válido.");
            return;
        }

        setSalvandoPerfil(true);
        try {
            await api.put("/api/usuarios/me", {
                nome: nomeLimpo,
                nomeUsuario: usuarioLimpo,
                email: emailLimpo,
            });
            const resposta = await api.get<Usuario>("/api/auth/me");
            aplicarUsuario(resposta.data);
            Alert.alert("Sucesso", "Perfil atualizado com sucesso!");
        } catch (error) {
            await tratarErro(error, "Não foi possível atualizar o perfil.");
        } finally {
            setSalvandoPerfil(false);
        }
    }

    async function salvarSenha() {
        if (ocupado) return;
        if (!senhaAtual || !novaSenha || !confirmarSenha) {
            Alert.alert("Atenção", "Preencha os três campos de senha.");
            return;
        }
        if (novaSenha.length < 8 || !/[a-z]/.test(novaSenha) || !/[0-9]/.test(novaSenha)) {
            Alert.alert("Atenção", "A nova senha deve ter pelo menos 8 caracteres, uma letra minúscula e um número.");
            return;
        }
        if (novaSenha !== confirmarSenha) {
            Alert.alert("Atenção", "A confirmação não corresponde à nova senha.");
            return;
        }

        setAlterandoSenha(true);
        try {
            await api.put("/api/usuarios/me/senha", {
                senhaAtual,
                novaSenha,
            });

            setSenhaAtual("");
            setNovaSenha("");
            setConfirmarSenha("");

            await SecureStore.deleteItemAsync("minitwitter_token");
            Alert.alert(
                "Senha alterada",
                "Entre novamente com sua nova senha.",
                [{ text: "Ir para o login", onPress: () => router.replace("/") }]
            );
        } catch (error) {
            await tratarErro(error, "Não foi possível alterar a senha.");
        } finally {
            setAlterandoSenha(false);
        }
    }

    function sairDaConta() {
        if (ocupado) return;
        Alert.alert("Sair da conta", "Deseja realmente encerrar sua sessão?", [
            { text: "Cancelar", style: "cancel" },
            {
                text: "Sair",
                style: "destructive",
                onPress: () => {
                    void encerrarSessao().catch(() =>
                        Alert.alert("Erro", "Não foi possível encerrar a sessão.")
                    );
                },
            },
        ]);
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
                    <Text style={styles.eyebrow}>MINHA CONTA</Text>
                    <Text style={styles.title}>Meu perfil</Text>
                    <Text style={styles.subtitle}>
                        Atualize suas informações e proteja sua conta.
                    </Text>

                    {carregando ? (
                        <ActivityIndicator size="large" color="#38bdf8" style={styles.loading} />
                    ) : erro ? (
                        <View style={styles.detailsCard}>
                            <Text style={styles.error}>{erro}</Text>
                            <Text style={styles.hint}>Volte a esta aba para tentar novamente.</Text>
                        </View>
                    ) : usuario ? (
                        <>
                            <View style={styles.profileCard}>
                                <View style={styles.avatar}>
                                    <Text style={styles.avatarText}>
                                        {usuario.nome.charAt(0).toUpperCase() || "?"}
                                    </Text>
                                </View>
                                <Text style={styles.name}>{usuario.nome}</Text>
                                <Text style={styles.username}>@{usuario.userName}</Text>
                            </View>

                            <View style={styles.detailsCard}>
                                <Text style={styles.sectionTitle}>Editar informações</Text>

                                <View style={styles.field}>
                                    <Text style={styles.label}>Nome completo</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={nome}
                                        onChangeText={setNome}
                                        maxLength={100}
                                        editable={!ocupado}
                                        placeholder="Seu nome"
                                        placeholderTextColor="#71717a"
                                    />
                                </View>

                                <View style={styles.field}>
                                    <Text style={styles.label}>Nome de usuário</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={nomeUsuario}
                                        onChangeText={setNomeUsuario}
                                        maxLength={30}
                                        autoCapitalize="none"
                                        autoCorrect={false}
                                        editable={!ocupado}
                                        placeholder="Seu usuário"
                                        placeholderTextColor="#71717a"
                                    />
                                </View>

                                <View style={styles.field}>
                                    <Text style={styles.label}>Email</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={email}
                                        onChangeText={setEmail}
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                        autoCorrect={false}
                                        maxLength={256}
                                        editable={!ocupado}
                                        placeholder="Seu email"
                                        placeholderTextColor="#71717a"
                                    />
                                </View>

                                <Pressable
                                    style={[styles.primaryButton, ocupado && styles.disabledButton]}
                                    disabled={ocupado}
                                    onPress={() => void salvarPerfil()}
                                >
                                    {salvandoPerfil ? (
                                        <ActivityIndicator color="#ffffff" />
                                    ) : (
                                        <Text style={styles.primaryButtonText}>Salvar alterações</Text>
                                    )}
                                </Pressable>
                            </View>

                            <View style={styles.detailsCard}>
                                <Text style={styles.sectionTitle}>Alterar senha</Text>
                                <Text style={styles.hint}>
                                    Ao trocar a senha, você precisará entrar novamente.
                                </Text>

                                <View style={styles.field}>
                                    <Text style={styles.label}>Senha atual</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={senhaAtual}
                                        onChangeText={setSenhaAtual}
                                        secureTextEntry
                                        autoCapitalize="none"
                                        editable={!ocupado}
                                        placeholder="Digite a senha atual"
                                        placeholderTextColor="#71717a"
                                    />
                                </View>

                                <View style={styles.field}>
                                    <Text style={styles.label}>Nova senha</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={novaSenha}
                                        onChangeText={setNovaSenha}
                                        secureTextEntry
                                        autoCapitalize="none"
                                        editable={!ocupado}
                                        placeholder="Mínimo de 8 caracteres"
                                        placeholderTextColor="#71717a"
                                    />
                                </View>

                                <View style={styles.field}>
                                    <Text style={styles.label}>Confirmar nova senha</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={confirmarSenha}
                                        onChangeText={setConfirmarSenha}
                                        secureTextEntry
                                        autoCapitalize="none"
                                        editable={!ocupado}
                                        placeholder="Digite a nova senha novamente"
                                        placeholderTextColor="#71717a"
                                    />
                                </View>

                                <Pressable
                                    style={[styles.secondaryButton, ocupado && styles.disabledButton]}
                                    disabled={ocupado}
                                    onPress={() => void salvarSenha()}
                                >
                                    {alterandoSenha ? (
                                        <ActivityIndicator color="#38bdf8" />
                                    ) : (
                                        <Text style={styles.secondaryButtonText}>Atualizar senha</Text>
                                    )}
                                </Pressable>
                            </View>

                            <Pressable
                                style={[styles.logoutButton, ocupado && styles.disabledButton]}
                                disabled={ocupado}
                                onPress={sairDaConta}
                            >
                                <Text style={styles.logoutText}>Sair da conta</Text>
                            </Pressable>
                        </>
                    ) : null}
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#09090b" },
    content: { padding: 20, paddingTop: 30, paddingBottom: 50 },
    eyebrow: {
        color: "#38bdf8", fontSize: 12, fontWeight: "700", letterSpacing: 1.5,
        marginBottom: 10,
    },
    title: { color: "#ffffff", fontSize: 30, fontWeight: "800", marginBottom: 8 },
    subtitle: { color: "#a1a1aa", fontSize: 14, marginBottom: 30, lineHeight: 21 },
    loading: { marginTop: 50 },
    error: { color: "#fca5a5", fontSize: 14 },
    profileCard: {
        backgroundColor: "#18181b", borderWidth: 1, borderColor: "#27272a",
        borderRadius: 16, padding: 26, alignItems: "center", marginBottom: 20,
    },
    avatar: {
        width: 80, height: 80, borderRadius: 40, backgroundColor: "#082f49",
        borderWidth: 1, borderColor: "#075985", alignItems: "center",
        justifyContent: "center", marginBottom: 16,
    },
    avatarText: { color: "#38bdf8", fontSize: 34, fontWeight: "800" },
    name: { color: "#ffffff", fontSize: 22, fontWeight: "700" },
    username: { color: "#a1a1aa", fontSize: 14, marginTop: 5 },
    detailsCard: {
        backgroundColor: "#18181b", borderWidth: 1, borderColor: "#27272a",
        borderRadius: 16, padding: 22, marginBottom: 20, gap: 16,
    },
    sectionTitle: { color: "#ffffff", fontSize: 17, fontWeight: "700" },
    field: { gap: 7 },
    label: { color: "#a1a1aa", fontSize: 13, fontWeight: "600" },
    input: {
        backgroundColor: "#09090b", borderWidth: 1, borderColor: "#3f3f46",
        borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13,
        color: "#ffffff", fontSize: 15,
    },
    hint: { color: "#71717a", fontSize: 12, lineHeight: 18 },
    primaryButton: {
        backgroundColor: "#0ea5e9", paddingVertical: 16, borderRadius: 12,
        alignItems: "center", marginTop: 4,
    },
    primaryButtonText: { color: "#ffffff", fontWeight: "700", fontSize: 15 },
    secondaryButton: {
        backgroundColor: "#082f49", borderWidth: 1, borderColor: "#075985",
        paddingVertical: 15, borderRadius: 12, alignItems: "center", marginTop: 4,
    },
    secondaryButtonText: { color: "#38bdf8", fontWeight: "700", fontSize: 15 },
    disabledButton: { opacity: 0.5 },
    logoutButton: {
        backgroundColor: "#450a0a", borderWidth: 1, borderColor: "#7f1d1d",
        borderRadius: 12, paddingVertical: 16, alignItems: "center",
    },
    logoutText: { color: "#fca5a5", fontSize: 15, fontWeight: "700" },
});
