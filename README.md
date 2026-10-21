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
forte e as credenciais iniciais do administrador (`ADMIN_NAME`, `ADMIN_EMAIL`,
`ADMIN_PASSWORD`).

Se preferir, informe a URL completa em `DATABASE_URL`; quando definida, ela tem
precedência sobre as variáveis `DB_*`. Para conexões externas ao PostgreSQL do
Render, use a URL externa com `sslmode=verify-full` para exigir TLS e validar o
certificado.

Instale, compile e execute:

```sh
npm ci
npm run build
npm start
```

Após configurar o banco e compilar a aplicação, crie o primeiro administrador
uma vez:

```sh
npm run seed:admin
```

O seed é idempotente: se o e-mail já existir, não altera o usuário existente.
Para Docker, execute o comando no contêiner antes de iniciar o serviço:
`docker run --rm --env-file .env medclinic-api npm run seed:admin`.

Para desenvolvimento com recarga automática, execute `npm run dev`. A API fica
disponível em `http://localhost:3000/api/v1`; `GET /api/v1/health` verifica a
disponibilidade HTTP. Migrações TypeORM são executadas ao iniciar o servidor.
O `synchronize` do TypeORM fica desativado.

## Docker

Construa e inicie a imagem, fornecendo as variáveis de ambiente indicadas no
`.env.example` para o contêiner:

```sh
docker build -t medclinic-api .
docker run --rm -p 3000:3000 --env-file .env medclinic-api
```

O contêiner não inclui o arquivo `.env`; mantenha-o local e forneça os segredos
por configuração de ambiente no runtime.
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

Crie no Render um Web Service conectado ao repositório e configure-o para usar o
`Dockerfile` da raiz. Configure no serviço as variáveis de ambiente de
`.env.example`, apontando para um PostgreSQL gerenciado. Defina `DB_SSL=true`
quando o provedor exigir conexão TLS.

Execute `npm run seed:admin` uma vez usando as variáveis de produção e acesso ao
banco antes de liberar o serviço para os usuários.

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
