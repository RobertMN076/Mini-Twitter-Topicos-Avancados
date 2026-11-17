
import { useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { isAxiosError } from "axios";
import * as SecureStore from "expo-secure-store";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { File } from "expo-file-system";
import { Image } from "expo-image";

import { api } from "../../services/api";

const LIMITE_CARACTERES = 280;

export default function PublicarScreen() {
    const router = useRouter();

    const [texto, setTexto] = useState("");
    const [publicando, setPublicando] = useState(false);

    const [imagem, setImagem] = useState<string | null>(null);
    const [selecionando, setSelecionando] = useState(false);


    const caracteresRestantes = LIMITE_CARACTERES - texto.length;

    const podePublicar =
        (texto.trim().length > 0 || imagem !== null) &&
        !publicando &&
        !selecionando;


    async function selecionarImagem() {
        if (selecionando || publicando) return;

        setSelecionando(true);

        try {
            const resultado =
                await ImagePicker.launchImageLibraryAsync({
                    mediaTypes: ["images"],
                    allowsEditing: false,
                    quality: 1,
                });

            if (resultado.canceled || !resultado.assets.length) return;

            const foto = resultado.assets[0];


            const imagemConvertida =
                await ImageManipulator.manipulateAsync(
                    foto.uri,
                    foto.width > 1600
                        ? [{ resize: { width: 1600 } }]
                        : [],
                    {
                        compress: 0.8,
                        format: ImageManipulator.SaveFormat.JPEG,
                    }
                );

            const arquivo = new File(imagemConvertida.uri);

            if (arquivo.size === 0) {
                throw new Error("Não foi possível ler a imagem.");
            }

            if (arquivo.size > 5 * 1024 * 1024) {
                Alert.alert(
                    "Imagem muito grande",
                    "Selecione uma imagem de até 5 MB."
                );
                return;
            }

            setImagem(imagemConvertida.uri);
        } catch (error) {
            Alert.alert(
                "Erro",
                error instanceof Error
                    ? error.message
                    : "Não foi possível selecionar a imagem."
            );
        } finally {
            setSelecionando(false);
        }
    }

    async function publicar() {
        if (!podePublicar) return;

        setPublicando(true);

        try {
            const formData = new FormData();

            formData.append("Texto", texto.trim());

            if (imagem) {
                formData.append(
                    "Imagem",
                    {
                        uri: imagem,
                        name: "postagem.jpg",
                        type: "image/jpeg",
                    } as unknown as Blob
                );
            }

            await api.post("/api/postagens", formData, {
                headers: {
                    "Content-Type": undefined,
                },
            });

            setTexto("");
            setImagem(null);

            Alert.alert(
                "Publicado!",
                "Sua publicação foi criada com sucesso.",
                [
                    {
                        text: "Ver feed",
                        onPress: () => router.navigate("/feed"),
                    },
                ]
            );
        } catch (error) {
            if (
                isAxiosError(error) &&
                error.response?.status === 401
            ) {
                await SecureStore.deleteItemAsync(
                    "minitwitter_token"
                );

                Alert.alert(
                    "Sessão expirada",
                    "Entre novamente para continuar."
                );

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
                    : "Não foi possível criar a publicação.");

            Alert.alert("Erro", mensagem);
        } finally {
            setPublicando(false);
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
                    <View style={styles.header}>
                        <Text style={styles.eyebrow}>
                            COMPARTILHE COM A COMUNIDADE
                        </Text>

                        <Text style={styles.title}>
                            Nova publicação
                        </Text>

                        <Text style={styles.subtitle}>
                            O que você está pensando hoje?
                        </Text>
                    </View>

                    <View style={styles.card}>
                        <Text style={styles.label}>
                            Sua mensagem
                        </Text>

                        <TextInput
                            style={styles.textArea}
                            placeholder="Compartilhe uma ideia, novidade ou pensamento..."
                            placeholderTextColor="#71717a"
                            multiline
                            textAlignVertical="top"
                            maxLength={LIMITE_CARACTERES}
                            value={texto}
                            onChangeText={setTexto}
                            editable={!publicando && !selecionando}
                        />

                        {imagem && (
                            <View style={styles.previewContainer}>
                                <Image
                                    source={{ uri: imagem }}
                                    style={styles.previewImagem}
                                    contentFit="contain"
                                />

                                <Pressable
                                    onPress={() => setImagem(null)}
                                    disabled={publicando || selecionando}
                                    style={styles.removerImagem}
                                >
                                    <Text style={styles.removerImagemTexto}>
                                        Remover imagem
                                    </Text>
                                </Pressable>
                            </View>
                        )}

                        <Pressable
                            style={styles.selecionarImagem}
                            onPress={selecionarImagem}
                            disabled={publicando || selecionando}
                        >
                            <Text style={styles.selecionarImagemTexto}>
                                {selecionando
                                    ? "Preparando imagem..."
                                    : imagem
                                        ? "Trocar imagem"
                                        : "＋ Adicionar imagem"}
                            </Text>
                        </Pressable>

                        <View style={styles.counterContainer}>
                            <Text style={styles.counter}>
                                {caracteresRestantes} caracteres restantes
                            </Text>
                        </View>

                        <Pressable
                            style={[
                                styles.button,
                                !podePublicar && styles.buttonDisabled,
                            ]}
                            onPress={publicar}
                            disabled={!podePublicar}
                        >
                            {publicando ? (
                                <ActivityIndicator color="#ffffff" />
                            ) : (
                                <Text style={styles.buttonText}>
                                    Publicar agora →
                                </Text>
                            )}
                        </Pressable>
                    </View>

                    <Text style={styles.footer}>
                        Sua publicação ficará disponível para toda a
                        comunidade MiniTwitter.
                    </Text>
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
        padding: 20,
        paddingTop: 30,
    },
    header: {
        marginBottom: 30,
    },
    eyebrow: {
        color: "#38bdf8",
        fontSize: 12,
        fontWeight: "700",
        letterSpacing: 1.5,
        marginBottom: 12,
    },
    title: {
        color: "#ffffff",
        fontSize: 30,
        fontWeight: "800",
        marginBottom: 10,
    },
    subtitle: {
        color: "#a1a1aa",
        fontSize: 14,
    },
    card: {
        backgroundColor: "#18181b",
        borderWidth: 1,
        borderColor: "#27272a",
        borderRadius: 16,
        padding: 20,
    },
    label: {
        color: "#e4e4e7",
        fontSize: 15,
        fontWeight: "600",
        marginBottom: 14,
    },
    textArea: {
        backgroundColor: "#09090b",
        borderWidth: 1,
        borderColor: "#3f3f46",
        borderRadius: 12,
        padding: 16,
        minHeight: 170,
        color: "#ffffff",
        fontSize: 15,
        lineHeight: 23,
    },
    counterContainer: {
        alignItems: "flex-end",
        marginTop: 10,
        marginBottom: 22,
    },
    counter: {
        color: "#71717a",
        fontSize: 12,
    },
    button: {
        backgroundColor: "#0ea5e9",
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
    },
    buttonDisabled: {
        opacity: 0.45,
    },
    buttonText: {
        color: "#ffffff",
        fontSize: 15,
        fontWeight: "700",
    },
    footer: {
        color: "#71717a",
        fontSize: 12,
        textAlign: "center",
        marginTop: 24,
        lineHeight: 19,
    },
    previewContainer: {
        marginTop: 16,
        gap: 12,
    },
    previewImagem: {
        width: "100%",
        height: 220,
        backgroundColor: "#09090b",
        borderRadius: 12,
    },
    removerImagem: {
        alignSelf: "flex-end",
    },
    removerImagemTexto: {
        color: "#f87171",
        fontSize: 13,
        fontWeight: "600",
    },
    selecionarImagem: {
        marginTop: 16,
        paddingVertical: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#075985",
        backgroundColor: "#082f49",
        alignItems: "center",
    },
    selecionarImagemTexto: {
        color: "#38bdf8",
        fontWeight: "700",
        fontSize: 14,
    },
});
