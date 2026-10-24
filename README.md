# MedClinic API — Etapa 2

API REST para gerenciamento de clínicas médicas, com autenticação JWT, controle
de acesso por perfil, pacientes, médicos, escalas, agendamentos e prontuários.

## Tecnologias

- Node.js 22, TypeScript, Express e TypeORM
- PostgreSQL 14+
- Vitest para testes unitários e cobertura
- Docker para empacotamento

## Requisitos e configuração local

- Node.js 22+ e npm
- PostgreSQL 14+ e um banco de dados vazio

Crie o arquivo local de configuração e ajuste os valores:

```sh
cp .env.example .env
```

Configure `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASS` e `DB_NAME`. `DB_SSL=true`
ativa SSL com validação do certificado do servidor. Defina também um `JWT_SECRET`
forte, as credenciais iniciais do administrador (`ADMIN_NAME`, `ADMIN_EMAIL`,
`ADMIN_PASSWORD`) e as credenciais das duas contas secretary e das duas contas
doctor usadas pelo seed (`SEED_SECRETARY_*` e `SEED_DOCTOR_*`, incluindo um CRM
único para cada médico).

Se preferir, informe a URL completa em `DATABASE_URL`; quando definida, ela tem
precedência sobre as variáveis `DB_*` e os campos `DB_HOST` / `DB_USER` não são
enviados ao driver (evita a API tentar `localhost` dentro do contêiner).

Para o PostgreSQL gerenciado do Render: no Web Service use a **Internal
Database URL** (hostname curto `dpg-...-a`, sem `*.render.com`). TLS não é
obrigatório nessa rede privada. A **External Database URL**
(`*.region-postgres.render.com`) é só para ferramentas fora do Render; ela
exige TLS. A API liga SSL automaticamente quando o host é `*.render.com`
(`sslmode=require`, sem validar o hostname do certificado). `DB_SSL=true`
ativa TLS com validação de certificado; `DB_SSL_REJECT_UNAUTHORIZED=false`
mantém TLS sem essa validação.

Instale, compile e execute:

```sh
npm ci
npm run build
npm run seed
npm start
```

O seed idempotente cria o administrador, duas contas secretary, duas contas
doctor com seus perfis de médico e completa a base até pelo menos dez pacientes.
Contas já existentes não têm senha nem dados alterados. Para Docker, o seed é
manual: só execute `npm run seed` quando desejar inserir esses dados de
demonstração em um banco.

Também há um script SQL manual em `database/seed.sql`, para PostgreSQL já
migrado. Ele inclui administrador, duas secretarias, dois médicos e dez pacientes
de demonstração. Antes de executá-lo, substitua os cinco hashes bcrypt de
exemplo e ajuste e-mails/CRMs conforme necessário. Execute com
`psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f database/seed.sql`. O script é
idempotente e aborta se os hashes ainda forem placeholders ou se contas
existentes não tiverem os perfis esperados.

Para desenvolvimento com recarga automática, execute `npm run dev`. A API fica
disponível em `http://localhost:3000/api/v1`; `GET /api/v1/health` verifica a
disponibilidade HTTP. Migrações TypeORM são executadas ao iniciar o servidor.
O `synchronize` do TypeORM fica desativado.

## Docker

Construa a imagem sem incluir nela o arquivo `.env` nem valores secretos. Passe
as variáveis ao iniciar o contêiner com `--env-file`; isso inicia a API, sem
executar o seed:

```sh
docker build -t medclinic-api .
docker run --rm -p 3000:3000 --env-file .env medclinic-api
```

O `.env` deve permanecer local e fora da imagem. Configure nele as variáveis de
`.env.example` necessárias para a API. Para executar o seed manualmente em
Docker, rode `docker run --rm --env-file .env medclinic-api npm run seed`.
Em plataformas com health check configurável, use o caminho
`/api/v1/health`.

## Perfis de acesso

| Perfil | Responsabilidade |
| --- | --- |
| `admin` | Gerencia usuários, médicos, escalas e todos os recursos |
| `secretary` | Gerencia pacientes e agenda operacional |
| `doctor` | Consulta sua agenda e gerencia prontuários dos pacientes vinculados |

Usuários são criados por `POST /api/v1/users`, disponível somente a
administradores. A autenticação é feita por `POST /api/v1/auth/login`. Use o
token retornado como `Authorization: Bearer <accessToken>`. As respostas de
autenticação e do endpoint `/users/me` expõem `roles` como uma lista.

## Principais endpoints

Todas as rotas, exceto login e health check, requerem autenticação.

| Método | Endpoint | Acesso / finalidade |
| --- | --- | --- |
| `GET` | `/api/v1/health` | Verificação de saúde |
| `POST` | `/api/v1/auth/login` | Autenticação |
| `POST` | `/api/v1/users` | Admin: criação de usuário |
| `GET` | `/api/v1/users/me` | Dados do usuário autenticado |
| `GET`, `POST` | `/api/v1/patients` | Consulta; admin/secretary cadastram |
| `GET`, `PATCH`, `DELETE` | `/api/v1/patients/:id` | Consulta/edição; exclusão admin |
| `POST`, `GET` | `/api/v1/patients/:patientId/medical-records` | Criação por médico; leitura por médico/admin com vínculo permitido |
| `GET`, `POST` | `/api/v1/doctors` | Consulta; criação admin |
| `GET`, `PUT` | `/api/v1/doctors/:doctorId/work-schedule` | Consulta; substituição admin |
| `GET` | `/api/v1/doctors/:doctorId/calendar` | Agenda do médico |
| `GET`, `POST` | `/api/v1/appointments` | Consulta; criação admin/secretary |
| `GET` | `/api/v1/appointments/:id` | Detalhe permitido conforme vínculo e perfil |
| `PATCH` | `/api/v1/appointments/:id/status` | Atualização sujeita a transições e permissões |

Listas paginadas usam `page` e `pageSize`. Agenda, filtros e operações clínicas
validam identificadores, datas, disponibilidade e relacionamento entre usuários,
profissionais e pacientes. Erros seguem o envelope JSON da API com `code` e
mensagem.

## Testes e cobertura

```sh
npm test
npm run test:cov
```

A cobertura é aplicada aos serviços (`src/**/*.service.ts`), e o comando de
cobertura falha se statements, branches, functions ou lines ficarem abaixo de
80%. O workflow de Pull Request executa instalação limpa, build e cobertura.

## Deploy no Render

O PostgreSQL do Render **não** entra no `Dockerfile`. O Web Service sobe só a
API; o banco é o serviço Postgres do painel. Criar os dois no mesmo projeto
**não** liga as credenciais sozinho.

1. Web Service: **Docker**, `Dockerfile` na raiz, mesma região do banco
   (por exemplo Oregon). Health Check Path: `/api/v1/health` (a raiz `/`
   também responde `200` para o probe padrão).
2. No banco, abra **Connect** e copie a **Internal Database URL**.
3. No Web Service → Environment, defina pelo menos:
   - `DATABASE_URL` = Internal Database URL
   - `NODE_ENV=production`
   - `JWT_SECRET` (valor forte e exclusivo de produção)
   - `JWT_EXPIRES_IN`
   - credenciais `ADMIN_*` e, se for popular dados, `SEED_*`
4. Confirme que o nome do database na URL é o criado no painel (não use um
   nome local como `medclin_db` se o Render gerou outro).
5. Não aponte o serviço para `DB_HOST=localhost` nem para um Postgres
   “de Docker Compose”: no Render não há esse contêiner ao lado da API.
6. Se precisar da URL externa (notebook, `psql` local), acrescente
   `?sslmode=require`. Não use essa URL no Web Service.

O contêiner inicia a API e corre as migrations; o seed **não** roda sozinho.
Depois do primeiro deploy saudável, um Job ou `docker run` equivalente com
`npm run seed` (mesmo `DATABASE_URL` interno) popula o administrador e os
dados de demonstração.

Para ativar deploy automático, crie um Deploy Hook no serviço Render e salve a
URL como secret `RENDER_DEPLOY_HOOK_URL` nas configurações do repositório GitHub.
O workflow `.github/workflows/deploy-render.yml` aciona o hook após atualizações
em `main` ou manualmente; sem o secret, o workflow registra um aviso e pula o
deploy. Configure e valide as credenciais diretamente nos respectivos serviços;
não as adicione ao repositório.

## Segurança de arquivos locais

`folderignore/` contém configuração local e material sensível. A pasta é
explicitamente ignorada pelo Git e pelo Docker e não deve ser adicionada aos
commits.
