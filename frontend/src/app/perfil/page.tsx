
"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Usuario = {
  id: string;
  nome: string;
  userName: string;
  email: string;
};

type RespostaApi = {
  mensagem?: string;
  erros?: string[];
};

export default function PerfilPage() {
  const router = useRouter();

  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);

  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [senhaExcluir, setSenhaExcluir] = useState("");

  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  useEffect(() => {
    const token = sessionStorage.getItem("token");

    if (!token) {
      router.replace("/login");
      return;
    }

    const controller = new AbortController();

    async function carregarPerfil() {
      try {
        const resposta = await fetch(`${apiUrl}/api/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          signal: controller.signal,
        });

        if (resposta.status === 401) {
          sessionStorage.removeItem("token");
          router.replace("/login");
          return;
        }

        if (!resposta.ok) {
          throw new Error("Erro ao carregar perfil.");
        }

        const dados: Usuario = await resposta.json();

        if (!controller.signal.aborted) {
          setUsuario(dados);
        }
      } catch {
        if (!controller.signal.aborted) {
          setErro("Não foi possível carregar o perfil.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setCarregando(false);
        }
      }
    }

    carregarPerfil();

    return () => controller.abort();
  }, [router, apiUrl]);

  async function requisicao(
    rota: string,
    metodo: "PUT" | "DELETE",
    corpo: object
  ) {
    const token = sessionStorage.getItem("token");

    if (!token) {
      throw new Error("Faça login novamente.");
    }

    const resposta = await fetch(`${apiUrl}${rota}`, {
      method: metodo,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(corpo),
    });

    const dados: RespostaApi = await resposta.json().catch(() => ({}));

    if (!resposta.ok) {
      throw new Error(
        dados.mensagem ||
        dados.erros?.join(" | ") ||
        "Não foi possível realizar a operação."
      );
    }

    return dados;
  }

  async function salvarPerfil(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!usuario) return;

    setEnviando(true);
    setErro("");
    setSucesso("");

    try {
      await requisicao("/api/usuarios/me", "PUT", {
        nome: usuario.nome,
        nomeUsuario: usuario.userName,
        email: usuario.email,
      });

      setSucesso("Perfil atualizado com sucesso!");
    } catch (error) {
      setErro(
        error instanceof Error ? error.message : "Erro inesperado."
      );
    } finally {
      setEnviando(false);
    }
  }

  async function alterarSenha(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setEnviando(true);
    setErro("");
    setSucesso("");

    try {
      await requisicao("/api/usuarios/me/senha", "PUT", {
        senhaAtual,
        novaSenha,
      });

      sessionStorage.removeItem("token");
      alert("Senha alterada! Faça login novamente.");
      router.replace("/login");
    } catch (error) {
      setErro(
        error instanceof Error ? error.message : "Erro inesperado."
      );
    } finally {
      setEnviando(false);
    }
  }

  async function excluirConta(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const confirmado = window.confirm(
      "Tem certeza? Sua conta e postagens serão excluídas permanentemente."
    );

    if (!confirmado) return;

    setEnviando(true);
    setErro("");
    setSucesso("");

    try {
      await requisicao("/api/usuarios/me", "DELETE", {
        senha: senhaExcluir,
      });

      sessionStorage.removeItem("token");
      alert("Conta excluída com sucesso.");
      router.replace("/login");
    } catch (error) {
      setErro(
        error instanceof Error ? error.message : "Erro inesperado."
      );
    } finally {
      setEnviando(false);
    }
  }

  if (carregando) {
    return (
      <main className="min-h-screen bg-zinc-950 p-10 text-white">
        Carregando perfil...
      </main>
    );
  }

  if (!usuario) {
    return (
      <main className="min-h-screen bg-zinc-950 p-10 text-white">
        {erro || "Redirecionando para login..."}
      </main>
    );
  }

  const inputClass =
    "w-full rounded-lg border border-zinc-700 bg-zinc-800 p-3 text-white";

  return (
    <main className="min-h-screen bg-zinc-950 p-6 text-white">
      <div className="mx-auto max-w-2xl space-y-6">
        <header className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-sky-400">
            Meu Perfil
          </h1>

          <Link href="/" className="text-sky-400 hover:underline">
            Voltar ao feed
          </Link>
        </header>

        {erro && (
          <p className="rounded-lg bg-red-950 p-3 text-red-300">
            {erro}
          </p>
        )}

        {sucesso && (
          <p className="rounded-lg bg-green-950 p-3 text-green-300">
            {sucesso}
          </p>
        )}

        <section className="rounded-xl border border-zinc-800 p-6">
          <h2 className="mb-5 text-xl font-semibold">
            Editar informações
          </h2>

          <form onSubmit={salvarPerfil} className="space-y-4">
            <label className="block space-y-2">
              <span>Nome</span>
              <input
                className={inputClass}
                value={usuario.nome}
                minLength={2}
                maxLength={100}
                required
                onChange={(e) =>
                  setUsuario({ ...usuario, nome: e.target.value })
                }
              />
            </label>

            <label className="block space-y-2">
              <span>Nome de usuário</span>
              <input
                className={inputClass}
                value={usuario.userName}
                minLength={3}
                maxLength={30}
                required
                onChange={(e) =>
                  setUsuario({ ...usuario, userName: e.target.value })
                }
              />
            </label>

            <label className="block space-y-2">
              <span>Email</span>
              <input
                type="email"
                className={inputClass}
                value={usuario.email}
                required
                onChange={(e) =>
                  setUsuario({ ...usuario, email: e.target.value })
                }
              />
            </label>

            <button
              disabled={enviando}
              className="rounded-lg bg-sky-500 px-5 py-3 font-semibold hover:bg-sky-600 disabled:opacity-50"
            >
              Salvar alterações
            </button>
          </form>
        </section>

        <section className="rounded-xl border border-zinc-800 p-6">
          <h2 className="mb-5 text-xl font-semibold">
            Alterar senha
          </h2>

          <form onSubmit={alterarSenha} className="space-y-4">
            <input
              type="password"
              placeholder="Senha atual"
              className={inputClass}
              value={senhaAtual}
              onChange={(e) => setSenhaAtual(e.target.value)}
              required
            />

            <input
              type="password"
              placeholder="Nova senha"
              className={inputClass}
              value={novaSenha}
              onChange={(e) => setNovaSenha(e.target.value)}
              minLength={8}
              required
            />

            <button
              disabled={enviando}
              className="rounded-lg bg-zinc-700 px-5 py-3 font-semibold hover:bg-zinc-600 disabled:opacity-50"
            >
              Alterar senha
            </button>
          </form>
        </section>

        <section className="rounded-xl border border-red-900 p-6">
          <h2 className="mb-3 text-xl font-semibold text-red-400">
            Excluir conta
          </h2>

          <p className="mb-5 text-sm text-zinc-400">
            Esta ação é permanente. Informe sua senha para confirmar.
          </p>

          <form onSubmit={excluirConta} className="space-y-4">
            <input
              type="password"
              placeholder="Confirme sua senha"
              className={inputClass}
              value={senhaExcluir}
              onChange={(e) => setSenhaExcluir(e.target.value)}
              required
            />

            <button
              disabled={enviando}
              className="rounded-lg bg-red-600 px-5 py-3 font-semibold hover:bg-red-700 disabled:opacity-50"
            >
              Excluir minha conta
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
