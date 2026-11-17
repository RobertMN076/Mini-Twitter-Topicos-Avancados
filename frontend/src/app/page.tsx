
"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";

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

const API = process.env.NEXT_PUBLIC_API_URL;
const MAX_IMAGEM = 5 * 1024 * 1024;


function ImagemPostagem({
  id,
  versao,
}: {
  id: string;
  versao: number;
}) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    let urlCriada: string | null = null;
    let ativo = true;

    setUrl(null);

    async function carregar() {
      const token = sessionStorage.getItem("token");
      if (!token) return;

      try {
        const resposta = await fetch(
          `${API}/api/postagens/${id}/imagem`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            signal: controller.signal,
          }
        );

        if (!resposta.ok) return;

        const blob = await resposta.blob();

        if (!ativo) return;

        urlCriada = URL.createObjectURL(blob);
        setUrl(urlCriada);
      } catch {
        
      }
    }

    carregar();

    return () => {
      ativo = false;
      controller.abort();

      if (urlCriada) {
        URL.revokeObjectURL(urlCriada);
      }
    };
  }, [id, versao]);

  if (!url) {
    return (
      <div className="mt-3 rounded-lg bg-zinc-900 p-5 text-sm text-zinc-500">
        Carregando imagem...
      </div>
    );
  }

  return (

    <img
      src={url}
      alt="Imagem da publicação"
      className="mt-3 max-h-[500px] w-full rounded-xl object-contain bg-zinc-900"
    />
  );
}

export default function Home() {
  const router = useRouter();
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [postagens, setPostagens] = useState<Postagem[]>([]);


  const [texto, setTexto] = useState("");
  const [imagem, setImagem] = useState<File | null>(null);
  const [inputKey, setInputKey] = useState(0);


  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [textoEdicao, setTextoEdicao] = useState("");
  const [imagemEdicao, setImagemEdicao] = useState<File | null>(null);
  const [removerImagem, setRemoverImagem] = useState(false);
  const [versaoImagens, setVersaoImagens] = useState(0);

  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");

  useEffect(() => {
    const token = sessionStorage.getItem("token");

    if (!token) {
      router.replace("/login");
      return;
    }

    const controller = new AbortController();

    async function carregarDados() {
      try {
        const headers = {
          Authorization: `Bearer ${token}`,
        };

        const [resUsuario, resPostagens] = await Promise.all([
          fetch(`${API}/api/auth/me`, {
            headers,
            signal: controller.signal,
          }),
          fetch(`${API}/api/postagens`, {
            headers,
            signal: controller.signal,
          }),
        ]);

        if (
          resUsuario.status === 401 ||
          resPostagens.status === 401
        ) {
          sessionStorage.removeItem("token");
          router.replace("/login");
          return;
        }

        if (!resUsuario.ok || !resPostagens.ok) {
          throw new Error("Falha ao carregar o feed.");
        }

        const dadosUsuario: Usuario = await resUsuario.json();
        const dadosPostagens: Postagem[] = await resPostagens.json();

        if (!controller.signal.aborted) {
          setUsuario(dadosUsuario);
          setPostagens(dadosPostagens);
        }
      } catch {
        if (!controller.signal.aborted) {
          setErro("Não foi possível carregar o feed.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setCarregando(false);
        }
      }
    }

    carregarDados();

    return () => controller.abort();
  }, [router]);


  async function requisicao<T = unknown>(
    rota: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = sessionStorage.getItem("token");

    if (!token) {
      throw new Error("Faça login novamente.");
    }

    const resposta = await fetch(`${API}${rota}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    });

    if (resposta.status === 401) {
      sessionStorage.removeItem("token");
      setUsuario(null);
      throw new Error("Sessão expirada. Faça login novamente.");
    }

    const dados = resposta.status === 204
      ? null
      : await resposta.json().catch(() => null);

    if (!resposta.ok) {
      throw new Error(
        dados?.mensagem ||
        dados?.title ||
        `Erro na operação (${resposta.status}).`
      );
    }

    return dados as T;
  }

  function validarImagem(arquivo: File | null): boolean {
    if (!arquivo) return true;

    if (arquivo.size > MAX_IMAGEM) {
      setErro("A imagem não pode ultrapassar 5 MB.");
      return false;
    }

    if (
      !["image/jpeg", "image/png", "image/webp"]
        .includes(arquivo.type)
    ) {
      setErro("Selecione uma imagem JPG, PNG ou WebP.");
      return false;
    }

    return true;
  }

  async function atualizarFeed() {
    const dados = await requisicao<Postagem[]>("/api/postagens");
    setPostagens(dados);
    setVersaoImagens((v) => v + 1);
  }


  async function publicar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!texto.trim() && !imagem) return;
    if (!validarImagem(imagem)) return;

    setSalvando(true);
    setErro("");

    try {
      const form = new FormData();

      form.append("Texto", texto);

      if (imagem) {
        form.append("Imagem", imagem);
      }

      await requisicao("/api/postagens", {
        method: "POST",
        body: form,
      });

      setTexto("");
      setImagem(null);
      setInputKey((k) => k + 1);

      await atualizarFeed();
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Erro ao publicar."
      );
    } finally {
      setSalvando(false);
    }
  }


  function iniciarEdicao(postagem: Postagem) {
    setEditandoId(postagem.id);
    setTextoEdicao(postagem.texto);
    setImagemEdicao(null);
    setRemoverImagem(false);
    setErro("");
  }


  async function salvarEdicao(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!editandoId) return;
    if (!validarImagem(imagemEdicao)) return;

    setSalvando(true);
    setErro("");

    try {
      const form = new FormData();

      form.append("Texto", textoEdicao);
      form.append("RemoverImagem", String(removerImagem));

      if (imagemEdicao) {
        form.append("Imagem", imagemEdicao);
      }

      await requisicao(`/api/postagens/${editandoId}`, {
        method: "PUT",
        body: form,
      });

      setEditandoId(null);
      setImagemEdicao(null);
      setRemoverImagem(false);

      await atualizarFeed();
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Erro ao editar."
      );
    } finally {
      setSalvando(false);
    }
  }


  async function excluirPostagem(id: string) {
    if (!window.confirm("Deseja excluir esta postagem?")) {
      return;
    }

    setSalvando(true);
    setErro("");

    try {
      await requisicao(`/api/postagens/${id}`, {
        method: "DELETE",
      });

      await atualizarFeed();
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Erro ao excluir."
      );
    } finally {
      setSalvando(false);
    }
  }

  function sair() {
    sessionStorage.removeItem("token");
    setUsuario(null);
    setPostagens([]);
    setAviso("Você saiu da conta.");

    router.replace("/login")
  }

  function formatarData(data: string) {
    return new Date(data).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <main className="min-h-screen bg-zinc-950 p-5 text-white md:p-8">
      <div className="mx-auto max-w-2xl">
        <header className="mb-8 flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-sky-400 md:text-3xl">
            MiniTwitter
          </h1>

          {usuario && (
            <div className="flex items-center gap-3">
              <Link
                href="/perfil"
                className="rounded-lg bg-zinc-800 px-3 py-2 text-sm"
              >
                Meu Perfil
              </Link>

              <button
                onClick={sair}
                className="rounded-lg bg-red-500 px-3 py-2 text-sm"
              >
                Sair
              </button>
            </div>
          )}
        </header>

        {carregando ? (
          <p className="text-zinc-400">Carregando...</p>
        ) : !usuario ? (
          <section className="rounded-xl border border-zinc-800 p-6">
            <p className="mb-5 text-zinc-400">
              {aviso || "Entre na sua conta para acessar o feed."}
            </p>

            <Link
              href="/login"
              className="inline-block rounded-lg bg-sky-500 px-5 py-3 font-semibold"
            >
              Fazer login
            </Link>
          </section>
        ) : (
          <div className="space-y-6">

            <section className="rounded-xl border border-zinc-800 p-5">
              <h2 className="mb-2 text-xl font-semibold">
                Olá, {usuario.nome}!
              </h2>

              <p className="mb-5 text-sm text-zinc-400">
                @{usuario.userName}
              </p>

              <form onSubmit={publicar} className="space-y-3">
                <textarea
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  maxLength={280}
                  rows={4}
                  placeholder="O que está acontecendo?"
                  className="w-full resize-none rounded-lg border border-zinc-700 bg-zinc-900 p-4 outline-none focus:border-sky-500"
                />

                <label className="block text-sm text-zinc-300">
                  Adicionar imagem (opcional)
                </label>

                <input
                  key={inputKey}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(e) => {
                    setImagem(e.target.files?.[0] ?? null);
                    setErro("");
                  }}
                  className="w-full text-sm text-zinc-400 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-700 file:px-4 file:py-2 file:text-white"
                />

                {imagem && (
                  <p className="break-all text-xs text-sky-400">
                    Selecionada: {imagem.name}
                  </p>
                )}

                <div className="flex items-center justify-between">
                  <span className="text-sm text-zinc-400">
                    {texto.length}/280
                  </span>

                  <button
                    type="submit"
                    disabled={salvando || (!texto.trim() && !imagem)}
                    className="rounded-lg bg-sky-500 px-6 py-2 font-semibold hover:bg-sky-600 disabled:opacity-50"
                  >
                    {salvando ? "Aguarde..." : "Publicar"}
                  </button>
                </div>
              </form>
            </section>

            {erro && (
              <p className="rounded-lg bg-red-950 p-4 text-red-300">
                {erro}
              </p>
            )}

            {/* Feed */}
            <section>
              <h2 className="mb-4 text-xl font-semibold">
                Feed de publicações
              </h2>

              {postagens.length === 0 ? (
                <div className="rounded-xl border border-zinc-800 p-6 text-zinc-400">
                  Ainda não existem postagens.
                </div>
              ) : (
                <div className="space-y-4">
                  {postagens.map((postagem) => (
                    <article
                      key={postagem.id}
                      className="rounded-xl border border-zinc-800 p-5"
                    >
                      <div className="mb-4 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold">
                            {postagem.autorNome}
                          </p>

                          <p className="text-sm text-zinc-400">
                            @{postagem.autorUserName}
                          </p>

                          <p className="mt-1 text-xs text-zinc-500">
                            {formatarData(postagem.criadoEm)}
                          </p>
                        </div>

                        {postagem.autorId === usuario.id &&
                          editandoId !== postagem.id && (
                            <div className="flex gap-3 text-sm">
                              <button
                                onClick={() => iniciarEdicao(postagem)}
                                disabled={salvando}
                                className="text-sky-400 hover:underline"
                              >
                                Editar
                              </button>

                              <button
                                onClick={() => excluirPostagem(postagem.id)}
                                disabled={salvando}
                                className="text-red-400 hover:underline"
                              >
                                Excluir
                              </button>
                            </div>
                          )}
                      </div>

                      {editandoId === postagem.id ? (
                        <form
                          onSubmit={salvarEdicao}
                          className="space-y-3"
                        >
                          <textarea
                            value={textoEdicao}
                            onChange={(e) =>
                              setTextoEdicao(e.target.value)
                            }
                            maxLength={280}
                            rows={3}
                            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 p-3"
                          />

                          {postagem.temImagem && !removerImagem && (
                            <ImagemPostagem
                              id={postagem.id}
                              versao={versaoImagens}
                            />
                          )}

                          {postagem.temImagem && (
                            <label className="flex items-center gap-2 text-sm text-red-400">
                              <input
                                type="checkbox"
                                checked={removerImagem}
                                onChange={(e) => {
                                  setRemoverImagem(e.target.checked);
                                  if (e.target.checked) {
                                    setImagemEdicao(null);
                                  }
                                }}
                              />
                              Remover imagem atual
                            </label>
                          )}

                          <label className="block text-sm text-zinc-400">
                            Substituir ou adicionar imagem
                          </label>

                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            disabled={removerImagem}
                            onChange={(e) =>
                              setImagemEdicao(
                                e.target.files?.[0] ?? null
                              )
                            }
                            className="w-full text-sm text-zinc-400"
                          />

                          {imagemEdicao && !removerImagem && (
                            <p className="break-all text-xs text-sky-400">
                              Selecionada: {imagemEdicao.name}
                            </p>
                          )}

                          <div className="flex gap-3">
                            <button
                              type="submit"
                              disabled={salvando}
                              className="rounded-lg bg-sky-500 px-4 py-2 text-sm disabled:opacity-50"
                            >
                              Salvar
                            </button>

                            <button
                              type="button"
                              onClick={() => setEditandoId(null)}
                              className="rounded-lg bg-zinc-700 px-4 py-2 text-sm"
                            >
                              Cancelar
                            </button>
                          </div>
                        </form>
                      ) : (
                        <div>
                          {postagem.texto && (
                            <p className="whitespace-pre-wrap break-words text-zinc-200">
                              {postagem.texto}
                            </p>
                          )}

                          {postagem.temImagem && (
                            <ImagemPostagem
                              id={postagem.id}
                              versao={versaoImagens}
                            />
                          )}
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
