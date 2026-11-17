
"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type RespostaApi = {
  token?: string;
  mensagem?: string;
  erros?: string[];
  title?: string;
};

export default function LoginPage() {
  const router = useRouter();

  const [cadastro, setCadastro] = useState(false);
  const [nome, setNome] = useState("");
  const [nomeUsuario, setNomeUsuario] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");

  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setCadastro(params.get("modo") === "cadastro");
  }, []);

  function alternarModo(modo: boolean) {
    setCadastro(modo);
    setErro("");
    setMensagem("");
    setSenha("");
    window.history.replaceState(
      null,
      "",
      modo ? "/login?modo=cadastro" : "/login"
    );
  }

  async function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setErro("");
    setMensagem("");
    setCarregando(true);

    try {
      const rota = cadastro
        ? "/api/auth/cadastro"
        : "/api/auth/login";

      const corpo = cadastro
        ? { nome, nomeUsuario, email, senha }
        : { email, senha };

      const resposta = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}${rota}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(corpo),
        }
      );

      const dados: RespostaApi = await resposta.json();

      if (!resposta.ok) {
        throw new Error(
          dados.mensagem ||
          dados.erros?.join(" | ") ||
          dados.title ||
          "Não foi possível realizar a operação."
        );
      }

      if (cadastro) {
        alternarModo(false);
        setMensagem(
          "Conta criada com sucesso! Faça seu login."
        );
      } else {
        if (!dados.token) {
          throw new Error("Token não recebido da API.");
        }

        sessionStorage.setItem("token", dados.token);
        router.push("/");
      }
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Erro inesperado."
      );
    } finally {
      setCarregando(false);
    }
  }

  const inputClass =
    "w-full rounded-xl border border-zinc-700/70 bg-zinc-900 px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/10";

  return (
    <main className="flex min-h-screen bg-zinc-950 text-white">

      <aside className="relative hidden w-1/2 overflow-hidden border-r border-white/10 bg-gradient-to-br from-slate-900 via-sky-950 to-zinc-950 p-12 lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute -left-32 bottom-0 h-96 w-96 rounded-full bg-sky-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -right-32 top-20 h-96 w-96 rounded-full bg-blue-500/20 blur-3xl" />

        <Link
          href="/"
          className="relative z-10 text-3xl font-extrabold tracking-tight text-sky-400"
        >
          MiniTwitter<span className="text-white">.</span>
        </Link>

        <div className="relative z-10 max-w-lg">
          <span className="rounded-full border border-sky-400/30 bg-sky-400/10 px-4 py-2 text-sm text-sky-300">
            Conecte-se. Compartilhe. Descubra.
          </span>

          <h1 className="mt-8 text-5xl font-bold leading-tight tracking-tight xl:text-6xl">
            Toda grande conversa começa com uma
            <span className="text-sky-400"> ideia.</span>
          </h1>

          <p className="mt-6 text-lg leading-relaxed text-slate-300">
            Um espaço para compartilhar pensamentos,
            descobrir novas perspectivas e fazer parte
            da conversa.
          </p>

          <div className="mt-12 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-sky-500 font-bold">
                M
              </div>

              <div>
                <p className="font-semibold">Comunidade MiniTwitter</p>
                <p className="text-sm text-slate-400">
                  Seu espaço de expressão
                </p>
              </div>
            </div>

            <p className="mt-5 text-slate-300">
              &quot;Compartilhe o que pensa. Descubra
              o que acontece.&quot;
            </p>
          </div>
        </div>

        <p className="relative z-10 text-sm text-slate-400">
          MiniTwitter — React + ASP.NET Core
        </p>
      </aside>


      <section className="flex w-full items-center justify-center px-6 py-12 lg:w-1/2">
        <div className="w-full max-w-md">
          <Link
            href="/"
            className="mb-12 block text-2xl font-extrabold text-sky-400 lg:hidden"
          >
            MiniTwitter.
          </Link>

          <div className="mb-9">
            <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-sky-400">
              {cadastro ? "Junte-se à comunidade" : "Bem-vindo de volta"}
            </p>

            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
              {cadastro ? "Crie sua conta" : "Entre na sua conta"}
            </h2>

            <p className="mt-3 text-sm leading-relaxed text-zinc-400">
              {cadastro
                ? "Preencha seus dados e comece a compartilhar."
                : "Acesse seu perfil e descubra as novidades do feed."}
            </p>
          </div>


          <div className="mb-8 flex rounded-xl border border-zinc-800 bg-zinc-900 p-1">
            <button
              type="button"
              onClick={() => alternarModo(false)}
              className={`flex-1 rounded-lg py-3 text-sm font-semibold transition ${!cadastro
                  ? "bg-sky-500 text-white shadow-lg"
                  : "text-zinc-400 hover:text-white"
                }`}
            >
              Entrar
            </button>

            <button
              type="button"
              onClick={() => alternarModo(true)}
              className={`flex-1 rounded-lg py-3 text-sm font-semibold transition ${cadastro
                  ? "bg-sky-500 text-white shadow-lg"
                  : "text-zinc-400 hover:text-white"
                }`}
            >
              Criar conta
            </button>
          </div>

          <form onSubmit={enviar} className="space-y-5">
            {cadastro && (
              <>
                <div>
                  <label className="mb-2 block text-sm font-medium text-zinc-300">
                    Nome completo
                  </label>

                  <input
                    className={inputClass}
                    placeholder="Seu nome"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    maxLength={100}
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-zinc-300">
                    Nome de usuário
                  </label>

                  <input
                    className={inputClass}
                    placeholder="Ex: robertin"
                    value={nomeUsuario}
                    onChange={(e) => setNomeUsuario(e.target.value)}
                    minLength={3}
                    maxLength={30}
                    required
                  />
                </div>
              </>
            )}

            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-300">
                Email
              </label>

              <input
                type="email"
                className={inputClass}
                placeholder="seuemail@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-300">
                Senha
              </label>

              <input
                type="password"
                className={inputClass}
                placeholder="Digite sua senha"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                minLength={cadastro ? 8 : undefined}
                required
              />

              {cadastro && (
                <p className="mt-2 text-xs text-zinc-500">
                  Mínimo de 8 caracteres, incluindo letra
                  minúscula e número.
                </p>
              )}
            </div>

            {erro && (
              <div
                role="alert"
                className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400"
              >
                {erro}
              </div>
            )}

            {mensagem && (
              <div
                role="status"
                className="rounded-xl border border-green-500/20 bg-green-500/10 p-4 text-sm text-green-400"
              >
                {mensagem}
              </div>
            )}

            <button
              type="submit"
              disabled={carregando}
              className="w-full rounded-xl bg-sky-500 px-5 py-4 font-semibold text-white shadow-lg shadow-sky-500/10 transition hover:-translate-y-0.5 hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {carregando
                ? "Aguarde..."
                : cadastro
                  ? "Criar minha conta →"
                  : "Entrar no MiniTwitter →"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
