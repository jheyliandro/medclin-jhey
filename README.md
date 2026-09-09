# MedClinic API - Parte 1

# Aluno: Jheyliandro Fontoura

API REST para gerenciamento de clínica médica — **Etapa 1: Autenticação e Autorização**.

> Desenvolvida com Node.js, TypeScript, Express.js, TypeORM e PostgreSQL como base de
> acesso do sistema: cadastro de usuários, autenticação via JWT e controle de permissões (RBAC).

---

## Tecnologias

| Tecnologia | Versão | Papel |
|---|---|---|
| Node.js | ≥ 18 | Runtime |
| TypeScript | ^5.4 | Linguagem (obrigatório) |
| Express.js | ^4.19 | Framework HTTP |
| TypeORM | ^0.3 | ORM / mapeamento objeto-relacional |
| PostgreSQL | ≥ 14 | Banco de dados relacional |
| bcryptjs | ^2.4 | Hash de senhas |
| jsonwebtoken | ^9.0 | Emissão e validação de tokens JWT |
| dotenv | ^16 | Variáveis de ambiente |

---

## Pré-requisitos

- Node.js ≥ 18 instalado
- npm ≥ 9 instalado
- PostgreSQL ≥ 14 em execução local (porta padrão `5432`)
- Banco de dados `medclin_db` criado:

```sql
CREATE DATABASE medclin_db;
```

---

## Configuração do ambiente

1. Copie o arquivo de exemplo de variáveis de ambiente:

```bash
cp .env.example .env
```

2. Edite o `.env` com suas credenciais:

```env
# Servidor
PORT=3000

# Banco de dados PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASS=sua_senha_aqui
DB_NAME=medclin_db

# JWT
JWT_SECRET=sua_chave_secreta_forte_aqui
JWT_EXPIRES_IN=1d
```

O TypeORM usa `synchronize: true` em desenvolvimento, portanto a tabela `users` é criada
automaticamente na primeira execução.

---

## Instalação e execução

```bash
# Instalar dependências
npm install

# Rodar em modo desenvolvimento (hot-reload)
npm run dev

# Compilar para produção
npm run build

# Executar build de produção
npm start
```

A API ficará disponível em `http://localhost:3000/api`.

---

## Arquitetura do projeto

A aplicação segue arquitetura **MVC em camadas**, com separação clara de responsabilidades:

```
src/
├── @types/express/       # Extensão da interface Request do Express (req.user)
├── controllers/          # Recebem requisições HTTP, delegam ao service, devolvem resposta
├── database/             # Configuração do DataSource (TypeORM)
├── dtos/                 # Interfaces de entrada e saída de dados (sem password)
├── entities/             # Entidades do TypeORM (@Entity, @Column, etc.)
├── middlewares/          # authenticate (JWT), authorize (RBAC), errorHandler
├── repositories/         # Acesso ao banco de dados via TypeORM
├── routes/               # Definição dos endpoints e aplicação dos middlewares
├── services/             # Regras de negócio (validações, hash, JWT)
├── utils/                # AppError, funções de hash (bcrypt) e JWT
└── server.ts             # Bootstrap: Express + TypeORM + rotas + error handler
```

**Fluxo de uma requisição:**

```
Client → Routes → Middlewares → Controller → Service → Repository → PostgreSQL
                                                                   ↑
                                                             (TypeORM)
```

---

## Perfis de acesso (RBAC)

| Perfil | Valor no banco | Descrição |
|---|---|---|
| Administrador | `admin` | Acesso completo a todos os endpoints |
| Atendente | `attendant` | Acesso operacional com permissões restritas |

> O perfil padrão atribuído no cadastro via `POST /api/auth/register` é **`admin`**.
> Para criar um usuário com perfil `attendant`, envie `"role": "attendant"` no body.

---

## Endpoints

Prefixo base: **`/api`**

### Autenticação

---

#### `POST /api/auth/register` — Cadastro de usuário

Cria um novo usuário. Senha nunca é armazenada ou retornada em texto puro.

**Body (JSON):**

```json
{
  "name": "João Silva",
  "email": "joao@email.com",
  "password": "senha123",
  "role": "admin"
}
```

> Campo `role` é opcional. Valores aceitos: `"admin"` | `"attendant"`. Padrão: `"admin"`.

**Resposta de sucesso — `201 Created`:**

```json
{
  "message": "Usuário criado com sucesso.",
  "user": {
    "id": "uuid-gerado",
    "name": "João Silva",
    "email": "joao@email.com",
    "role": "admin",
    "createdAt": "2025-01-01T00:00:00.000Z"
  }
}
```

**Respostas de erro:**

| Status | Situação |
|---|---|
| `400` | Campos obrigatórios ausentes ou e-mail inválido |
| `409` | E-mail já cadastrado |

---

#### `POST /api/auth/login` — Login do usuário

Valida as credenciais e retorna um token JWT.

**Body (JSON):**

```json
{
  "email": "joao@email.com",
  "password": "senha123"
}
```

**Resposta de sucesso — `200 OK`:**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid-gerado",
    "name": "João Silva",
    "email": "joao@email.com",
    "role": "admin",
    "createdAt": "2025-01-01T00:00:00.000Z"
  }
}
```

**Respostas de erro:**

| Status | Situação |
|---|---|
| `400` | Campos obrigatórios ausentes |
| `401` | Credenciais inválidas (e-mail ou senha incorretos) |

---

### Rotas protegidas

> Todas as rotas abaixo exigem o header:
> ```
> Authorization: Bearer <token>
> ```

---

#### `GET /api/users/me` — Dados do usuário autenticado

Retorna os dados do usuário identificado pelo token JWT.

**Resposta de sucesso — `200 OK`:**

```json
{
  "user": {
    "id": "uuid-gerado",
    "name": "João Silva",
    "email": "joao@email.com",
    "role": "admin",
    "createdAt": "2025-01-01T00:00:00.000Z"
  }
}
```

**Respostas de erro:**

| Status | Situação |
|---|---|
| `401` | Token ausente, inválido ou expirado |
| `404` | Usuário do token não encontrado no banco |

---

#### `GET /api/admin/ping` — Verificação de acesso de Administrador

Endpoint restrito ao perfil `admin`. Demonstra o funcionamento do RBAC.

**Resposta de sucesso — `200 OK`:**

```json
{
  "message": "pong",
  "role": "admin"
}
```

**Respostas de erro:**

| Status | Situação |
|---|---|
| `401` | Token ausente, inválido ou expirado |
| `403` | Usuário autenticado sem perfil `admin` |

---

## Variáveis de ambiente

| Variável | Descrição | Exemplo |
|---|---|---|
| `PORT` | Porta do servidor | `3000` |
| `DB_HOST` | Host do PostgreSQL | `localhost` |
| `DB_PORT` | Porta do PostgreSQL | `5432` |
| `DB_USER` | Usuário do banco | `postgres` |
| `DB_PASS` | Senha do banco | `postgres` |
| `DB_NAME` | Nome do banco | `medclin_db` |
| `JWT_SECRET` | Chave secreta para assinar tokens | string longa e aleatória |
| `JWT_EXPIRES_IN` | Tempo de expiração do token | `1d`, `8h`, `30m` |

---
