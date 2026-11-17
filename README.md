# MiniTwitter — Web + Mobile

Projeto desenvolvido para a disciplina de **Tópicos Avançados**, com aplicações **web (Next.js)** e **mobile (React Native/Expo)** consumindo a **mesma API ASP.NET Core** e o **mesmo banco de dados SQL Server**.

A API e o banco rodam localmente no computador que atua como servidor de desenvolvimento. O celular acessa a API pelo **endereço IPv4 desse computador na rede local**; não é necessário hospedar o backend na nuvem.

## Tecnologias

| Camada | Tecnologias |
| --- | --- |
| Web | Next.js 16, React 19, TypeScript, Tailwind CSS |
| Mobile | React Native, Expo, Expo Router, TypeScript, Axios |
| Backend | ASP.NET Core (.NET 10), Entity Framework Core |
| Banco | Microsoft SQL Server |
| Autenticação | ASP.NET Core Identity + JWT Bearer |
| Imagens | Armazenadas no SQL Server, vinculadas às postagens |

## Funcionalidades

- Cadastro e login de usuários com autenticação JWT.
- Feed compartilhado entre web e mobile, com as **50 postagens mais recentes**.
- Criação de postagens com texto (até **280 caracteres**) e/ou imagem.
- Imagens em **JPG, PNG ou WebP**, até **5 MB** por arquivo (validadas pela API).
- Edição e exclusão das próprias postagens; adição, troca e remoção de imagens.
- Consulta e edição do próprio perfil (nome, nome de usuário e email).
- Alteração de senha e logout.
- Persistência da sessão no mobile com `expo-secure-store`.
- Atualização do feed ao retornar à aba e ao puxar a lista para baixo.

A autenticação é exigida para acessar postagens e imagens. O token JWT expira em **1 hora**. O backend verifica a identidade do autor antes de permitir edição ou exclusão de postagens.

## Estrutura de pastas

```text
MiniTwitter/
├── backend/
│   └── MiniTwitter.Api/      # API ASP.NET Core / Entity Framework
├── frontend/                  # Aplicação web Next.js
├── mobile/                    # Aplicativo React Native com Expo
└── README.md
```

> **Importante:** os comandos abaixo pressupõem que você esteja usando o terminal **PowerShell no Windows**, na raiz do projeto (`MiniTwitter`). Abra terminais separados para o backend, a web e o Expo.

## 1. Pré-requisitos

Instale no computador que executará o projeto:

- **.NET SDK 10** (`dotnet --version`).
- **Node.js** compatível com Next.js 16 (**20.9+**, preferencialmente uma versão LTS) e npm (`node -v`, `npm -v`).
- **SQL Server** instalado e em execução (Developer, Express ou outra edição compatível).
- Editor de código, como **VS Code** (recomendado).
- **Expo Go** no celular Android/iOS para executar o aplicativo durante o desenvolvimento.

O celular e o computador precisam conseguir se comunicar pela rede local. Para maior simplicidade, conecte ambos ao mesmo roteador, ainda que o computador use **cabo Ethernet** e o celular use **Wi-Fi**.

## 2. Configurar o banco e o backend em outro computador

### 2.1. Entrar na pasta da API

```powershell
cd backend\MiniTwitter.Api
```

Restaure as dependências:

```powershell
dotnet restore
```

### 2.2. Configurar a conexão com SQL Server

O projeto utiliza a conexão `ConnectionStrings:DefaultConnection`. Se o banco estiver no SQL Server local (instância padrão), configure-a por **User Secrets**:

```powershell
dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Server=localhost;Database=MiniTwitterDB;Trusted_Connection=True;TrustServerCertificate=True;"
```

Se estiver usando a instância **SQL Server Express**, o servidor pode ser `localhost\SQLEXPRESS`:

```powershell
dotnet user-secrets set "ConnectionStrings:DefaultConnection" 'Server=localhost\SQLEXPRESS;Database=MiniTwitterDB;Trusted_Connection=True;TrustServerCertificate=True;'
```

Ajuste o nome do servidor/instância conforme a instalação. Os exemplos usam **autenticação integrada do Windows**; o usuário atual precisa ter permissão para criar e acessar o banco.

> Caso exista `appsettings.Development.json` com outra conexão, o valor de User Secrets prevalece durante a execução em `Development`. Não coloque senhas de produção em arquivos versionados.

### 2.3. Configurar a chave JWT (**obrigatório em um PC novo**)

O backend **não inicia** sem `Jwt:Key`. Essa chave é armazenada localmente em User Secrets e **não é copiada ao clonar o repositório**.

Gere uma chave aleatória de 32 bytes e registre-a com PowerShell:

```powershell
$bytes = New-Object byte[] 32
$gerador = [System.Security.Cryptography.RandomNumberGenerator]::Create()
$gerador.GetBytes($bytes)
$gerador.Dispose()
$jwtKey = [Convert]::ToBase64String($bytes)
dotnet user-secrets set "Jwt:Key" "$jwtKey"
```

A chave deve permanecer privada. Se uma chave diferente for usada em outra instalação, tokens gerados com a chave antiga não serão válidos; faça login novamente.

### 2.4. Criar as tabelas com Entity Framework Core

Se o comando `dotnet ef` ainda não estiver instalado:

```powershell
dotnet tool install --global dotnet-ef --version 10.0.0
```

Aplique a migration existente:

```powershell
dotnet ef database update
```

Isso cria/atualiza a estrutura do banco `MiniTwitterDB`. **As migrations não transferem os dados de outro PC**: para preservar usuários e postagens existentes, é necessário fazer backup e restauração do banco SQL Server, em vez de começar com um banco vazio.

### 2.5. Iniciar o backend para aceitar requisições do celular

Execute **exatamente este comando** dentro de `backend\MiniTwitter.Api`:

```powershell
dotnet run --launch-profile http -- --urls http://0.0.0.0:5000
```

- `--launch-profile http` mantém o ambiente **Development**, que carrega os **User Secrets**.
- `--urls http://0.0.0.0:5000` faz a API escutar na **porta 5000 em todas as interfaces IPv4** do computador.
- `0.0.0.0` é um endereço usado para *escutar* conexões. **Não deve ser digitado no navegador do celular.**
- **Mantenha o terminal da API aberto** enquanto estiver usando a web e o mobile.

**Não use `--no-launch-profile`** nesse comando: sem a configuração do ambiente `Development`, os User Secrets podem não ser carregados, resultando no erro `Configure Jwt:Key nos User Secrets`.

Teste no navegador do próprio computador:

```text
http://localhost:5000/api/status
```

Com a API e o SQL Server ativos, a resposta esperada é:

```json
{"mensagem":"API e SQL Server conectados!"}
```

## 3. Descobrir o IP do computador e conectar o celular

### 3.1. Identificar o IPv4 do PC

No PowerShell ou CMD do computador onde o backend está rodando:

```powershell
ipconfig
```

No adaptador realmente conectado (por exemplo, **Ethernet**), procure **Endereço IPv4**. Exemplo:

```text
Endereço IPv4 . . . : 192.168.0.2
Máscara de Sub-rede: 255.255.255.0
Gateway Padrão  . .: 192.168.0.1
```

**Exemplo apenas:** substitua `192.168.0.2` pelo IP obtido no computador que está executando o backend. Não utilize endereços de adaptadores virtuais, VPN ou interfaces desconectadas.

### 3.2. Confirmar que celular e PC conseguem se comunicar

- O PC **pode estar por cabo Ethernet** e o celular por **Wi-Fi**.
- Wi-Fi **2,4 GHz** e **5 GHz** normalmente compartilham a mesma rede; o cabo Ethernet **não usa frequência Wi-Fi**.
- O essencial é que haja conectividade entre os dispositivos, sem isolamento de clientes ou rede de convidados.
- No caso comum de máscara `255.255.255.0`, IPs como `192.168.0.2` (PC) e `192.168.0.4` (celular) estão na mesma sub-rede.
- Se o IP do PC mudar, será necessário atualizar a configuração do mobile. Para evitar mudanças frequentes, configure uma **reserva de DHCP** no roteador.

No **navegador do celular**, abra (trocando o IP pelo valor real):

```text
http://192.168.0.2:5000/api/status
```

Se aparecer a mensagem de conexão com SQL Server, o celular já consegue acessar a API. Faça esse teste **antes** de iniciar o Expo.

### 3.3. Firewall do Windows

Se `/api/status` funcionar no PC, mas não no celular, verifique se o Firewall do Windows bloqueia a **porta TCP 5000**. Em uma rede privada e confiável, você pode criar uma regra de entrada pelo PowerShell **como administrador**:

```powershell
New-NetFirewallRule -DisplayName "MiniTwitter API TCP 5000" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 5000 -Profile Private
```

Crie a regra somente se necessário. **Não abra essa porta no roteador para a internet**; a configuração foi pensada para desenvolvimento em rede local.

## 4. Executar a aplicação web (Next.js)

Em um **segundo terminal**, partindo da raiz `MiniTwitter`:

```powershell
cd frontend
npm install
```

Crie ou edite o arquivo **`frontend/.env.local`**:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

Isso funciona quando **navegador web e API estão no mesmo computador**. Execute:

```powershell
npm run dev
```

Abra no navegador:

```text
http://localhost:3000
```

A página inicial direciona ao fluxo de autenticação. O frontend utiliza a mesma API e o mesmo SQL Server do mobile.

> **Atenção ao CORS:** atualmente o backend permite a origem web `http://localhost:3000` em `Program.cs`. Se o site for aberto por outro endereço ou computador (por exemplo, `http://192.168.0.2:3000`), será necessário adicionar essa origem exata à política CORS do backend e, se necessário, disponibilizar o servidor Next.js na rede. **CORS é uma regra do navegador; não é a causa de falhas de acesso ao backend pelo app React Native.**

## 5. Executar o aplicativo mobile (Expo)

Em um **terceiro terminal**, partindo da raiz `MiniTwitter`:

```powershell
cd mobile
npm install
```

Crie ou edite **`mobile/.env.local`**, usando o IPv4 **atual do PC que hospeda a API**:

```env
EXPO_PUBLIC_API_URL=http://192.168.0.2:5000
```

**Não use `localhost` nessa configuração se estiver testando num celular físico:** no celular, `localhost` aponta para o próprio aparelho, não para o computador.

Inicie o Expo:

```powershell
npx expo start
```

Abra o **Expo Go** no celular e leia o QR Code exibido no terminal. O Expo costuma atualizar a tela automaticamente quando os arquivos são salvos (**Fast Refresh**).

Se alterar o `.env.local` e o endereço antigo continuar em uso, reinicie o Metro:

```powershell
npx expo start --clear
```

`EXPO_PUBLIC_API_URL` é uma configuração pública do aplicativo; **nunca coloque nela senhas ou chaves secretas**.

## 6. Ordem correta de execução

Em cada sessão de desenvolvimento, use esta sequência:

1. Ligue o **SQL Server** e confirme que o banco `MiniTwitterDB` está acessível.
2. No terminal do **backend**, execute `dotnet run --launch-profile http -- --urls http://0.0.0.0:5000`.
3. Descubra o **IPv4 atual** do PC (`ipconfig`) e teste `http://IP_DO_PC:5000/api/status` no celular.
4. Confira `frontend/.env.local` e `mobile/.env.local`.
5. No terminal **web**, execute `npm run dev`.
6. No terminal **mobile**, execute `npx expo start` e abra no Expo Go.
7. Entre com a **mesma conta** na web e no mobile; as postagens e o perfil são compartilhados.

## 7. Rotas principais da API

| Método | Rota | Finalidade |
| --- | --- | --- |
| `GET` | `/api/status` | Verificar API e banco |
| `POST` | `/api/auth/cadastro` | Cadastrar usuário |
| `POST` | `/api/auth/login` | Fazer login e receber JWT |
| `GET` | `/api/auth/me` | Consultar usuário autenticado |
| `GET` | `/api/postagens` | Listar últimas 50 postagens |
| `GET` | `/api/postagens/{id}/imagem` | Buscar imagem de uma postagem |
| `POST` | `/api/postagens` | Criar postagem |
| `PUT` | `/api/postagens/{id}` | Editar postagem própria |
| `DELETE` | `/api/postagens/{id}` | Excluir postagem própria |
| `PUT` | `/api/usuarios/me` | Atualizar perfil |
| `PUT` | `/api/usuarios/me/senha` | Alterar senha |
| `DELETE` | `/api/usuarios/me` | Excluir a própria conta (API/web) |

As rotas de postagens e informações do usuário exigem `Authorization: Bearer <token>`; login e cadastro são públicos. Criação/edição de postagens usam `multipart/form-data` para o texto e a imagem.

## 8. Solução de problemas

| Sintoma | O que verificar |
| --- | --- |
| `Configure Jwt:Key nos User Secrets` | Criar a chave no PC atual e executar com `--launch-profile http`. |
| `/api/status` retorna `503` | SQL Server parado, nome da instância ou connection string incorretos. |
| Funciona no PC, mas não no celular | IP do PC, backend usando `0.0.0.0:5000`, firewall, mesma rede e isolamento no roteador. |
| `Network Error` no Expo | Valor atual de `EXPO_PUBLIC_API_URL`, API ligada e teste de `/api/status` pelo celular. |
| `401 Unauthorized` | JWT ausente, expirado (1 hora) ou invalidado; faça login novamente. |
| CORS no navegador | Origem web não incluída em `WithOrigins` no `Program.cs`. |
| Imagem não carrega | Confirmar JWT válido e testar a API; imagens são solicitadas com autenticação. |
| Expo mostra `No apps connected` | Reabrir o Expo Go, escanear o QR Code e confirmar a conectividade com o Metro. |
| Banco aparece vazio em outro PC | Migrations criam tabelas, **não importam dados**; restaurar backup do banco anterior. |

## 9. Observações de segurança e limitações

- A comunicação `http://IP:5000` é adequada **somente para desenvolvimento em uma rede local confiável**. Não publique essa porta diretamente na internet. Para uso externo ou distribuição pública, é necessário hospedar a API em um servidor acessível e configurar **HTTPS**.
- A instalação com SQL Server em outro PC gera um **novo banco local**, a menos que o banco existente seja restaurado ou a API continue apontando para o mesmo servidor SQL Server.
- A chave JWT e as connection strings com credenciais devem ficar fora do Git. `User Secrets` é adequado para desenvolvimento, não um gerenciador de segredos de produção.
- Os avisos de dependências vulneráveis que porventura apareçam no `dotnet restore` devem ser revisados e corrigidos antes de qualquer implantação pública.
- O aplicativo utiliza o backend que estiver configurado em `EXPO_PUBLIC_API_URL`. **Web e mobile compartilham os dados somente quando apontam para a mesma API/banco.**

---

**Resumo da conexão local:** o SQL Server e a API rodam no PC; a web utiliza `http://localhost:5000`; o celular utiliza `http://IP_DO_PC:5000`. O PC pode estar conectado por cabo e o celular por Wi-Fi, desde que ambos tenham conectividade na mesma rede local.
