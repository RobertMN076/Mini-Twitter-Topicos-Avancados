# MiniTwitter — Web e Mobile

Projeto com versões web e mobile que consomem a **mesma API** e compartilham os dados no **SQL Server**.

## Tecnologias

- **Web:** Next.js, React, TypeScript e Tailwind CSS.
- **Mobile:** React Native, Expo, Expo Router, TypeScript e Axios.
- **Backend:** ASP.NET Core (.NET 10), Entity Framework Core, ASP.NET Identity e JWT.
- **Banco de dados:** SQL Server.

## Como executar no celular

**Pré-requisitos:** Node.js, .NET SDK 10, SQL Server configurado com o banco do projeto, Expo Go no celular e a chave `Jwt:Key` configurada nos *User Secrets* do backend. O computador e o celular devem conseguir se comunicar pela **mesma rede local**. O computador pode usar **cabo Ethernet** e o celular **Wi-Fi** (2,4 ou 5 GHz).

### 1. Iniciar o backend

Na pasta `backend/MiniTwitter.Api`, execute:

```powershell
dotnet run --launch-profile http -- --urls http://0.0.0.0:5000
```

Isso permite que a API receba requisições de outros dispositivos da rede. **Mantenha o terminal aberto.**

### 2. Descobrir o IP do computador

No Windows, execute:

```powershell
ipconfig
```

Anote o **Endereço IPv4** do adaptador de rede em uso (Ethernet ou Wi-Fi), por exemplo `192.168.0.2`. Não utilize o IP de adaptadores virtuais, como VPN ou VirtualBox.

### 3. Configurar a URL no mobile

Crie ou atualize o arquivo `mobile/.env.local`:

```env
EXPO_PUBLIC_API_URL=http://192.168.0.2:5000
```

**Troque o IP do exemplo pelo IPv4 do seu computador.** Esse endereço pode mudar ao conectar o PC a outra rede.

### 4. Iniciar o Expo

Em outro terminal, na pasta `mobile`, execute:

```powershell
npm install
npx expo start --clear
```

Abra o **Expo Go** no celular e escaneie o QR Code exibido pelo Expo.

### 5. Confirmar a conexão

No navegador do celular, abra:

```text
http://192.168.0.2:5000/api/status
```

Use o mesmo IP configurado no `.env.local`. Se não abrir, confira se o backend está rodando, se a API está conectada ao SQL Server e se o **Firewall do Windows** permite acesso à porta `5000` na rede privada. Redes de convidados ou isolamento de dispositivos no roteador podem bloquear a comunicação.

> **Atenção:** `localhost` no celular aponta para o próprio celular, não para o PC. O Expo e o backend precisam continuar executando no computador durante os testes. Não publique o `.env.local` nem os *User Secrets* no Git.
