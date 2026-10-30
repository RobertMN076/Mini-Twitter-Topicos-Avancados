
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
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

      const dados = await resposta.json();

      if (!resposta.ok) {
        throw new Error(
          dados.mensagem ||
          dados.erros?.join(" | ") ||
          "Erro na autenticação."
        );
      }

      if (cadastro) {
        setCadastro(false);
        setSenha("");
        setMensagem("Cadastro realizado! Faça seu login.");
      } else {
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

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 p-6 text-white">
      <div className="w-full max-w-md rounded-2xl border border-zinc-800 p-8">
        <h1 className="mb-2 text-center text-3xl font-bold text-sky-400">
          MiniTwitter
        </h1>

        <p className="mb-8 text-center text-zinc-400">
          {cadastro ? "Crie sua conta" : "Entre na sua conta"}
        </p>

        <form onSubmit={enviar} className="space-y-4">
          {cadastro && (
            <>
              <input
                className="w-full rounded-lg bg-zinc-800 p-3"
                placeholder="Nome completo"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
                maxLength={100}
              />

              <input
                className="w-full rounded-lg bg-zinc-800 p-3"
                placeholder="Nome de usuário"
                value={nomeUsuario}
                onChange={(e) => setNomeUsuario(e.target.value)}
                required
                minLength={3}
                maxLength={30}
              />
            </>
          )}

          <input
            type="email"
            className="w-full rounded-lg bg-zinc-800 p-3"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <input
            type="password"
            className="w-full rounded-lg bg-zinc-800 p-3"
            placeholder="Senha"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required
            minLength={cadastro ? 8 : undefined}
          />

          {erro && (
            <p className="text-sm text-red-400">{erro}</p>
          )}

          {mensagem && (
            <p className="text-sm text-green-400">
              {mensagem}
            </p>
          )}

          <button
            type="submit"
            disabled={carregando}
            className="w-full rounded-lg bg-sky-500 p-3 font-semibold text-white hover:bg-sky-600 disabled:opacity-50"
          >
            {carregando
              ? "Aguarde..."
              : cadastro
                ? "Criar conta"
                : "Entrar"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            setCadastro(!cadastro);
            setErro("");
            setMensagem("");
          }}
          className="mt-6 w-full text-sm text-sky-400"
        >
          {cadastro
            ? "Já tem conta? Fazer login"
            : "Não tem conta? Cadastre-se"}
        </button>
      </div>
    </main>
  );
}
