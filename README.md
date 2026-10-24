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

## Testar a API manualmente com `curl`

Os exemplos a seguir usam Bash e a API publicada no Render. `jq` é opcional para
formatar respostas, mas os comandos de login usam `jq` para construir o JSON e
extrair o token. Instale-o ou adapte os comandos se não estiver disponível.
Não compartilhe senhas ou tokens. As operações de criação, alteração e exclusão
afetam os dados do ambiente usado.

Defina a URL base e confira se a API está disponível:

```sh
BASE_URL="https://medclin-jhey.onrender.com/api/v1"
curl --include "$BASE_URL/health/"
```

O health check deve responder HTTP `200` com `{"status":"ok"}`. A raiz
`/api/v1/` não é um endpoint e pode responder `404`.

Faça login com uma conta existente; informe as credenciais sem colocá-las no
README ou em arquivos versionados:

```sh
read -r -p "E-mail: " EMAIL
read -r -s -p "Senha: " PASSWORD
printf '\n'

LOGIN_RESPONSE=$(curl --silent --show-error \
  --request POST "$BASE_URL/auth/login" \
  --header "Content-Type: application/json" \
  --data "$(jq -n --arg email "$EMAIL" --arg password "$PASSWORD" \
    '{email:$email,password:$password}')")
unset PASSWORD

printf '%s\n' "$LOGIN_RESPONSE" | jq .
TOKEN=$(printf '%s' "$LOGIN_RESPONSE" | jq -r '.accessToken')
test -n "$TOKEN" && test "$TOKEN" != "null" || echo "Não foi possível obter o token"
```

O login retorna `accessToken`. Use-o nas demais rotas protegidas. Faça login
novamente com outra conta para testar os perfis `admin`, `secretary` e `doctor`:

```sh
curl --include "$BASE_URL/users/me" \
  --header "Authorization: Bearer $TOKEN"
```

### Pacientes

Todos os perfis autenticados podem listar e consultar pacientes. As listas usam
paginação (padrão: página `1`, até `20` itens; máximo de `100` por página) e
aceitam filtro pelo nome:

```sh
curl --include "$BASE_URL/patients?page=1&pageSize=10" \
  --header "Authorization: Bearer $TOKEN"

curl --get --include "$BASE_URL/patients" \
  --header "Authorization: Bearer $TOKEN" \
  --data-urlencode "name=Maria"

PATIENT_ID=1
curl --include "$BASE_URL/patients/$PATIENT_ID" \
  --header "Authorization: Bearer $TOKEN"
```

Administradores e secretarias podem cadastrar e editar pacientes. O CPF precisa
ter 11 dígitos e ser único. Somente administradores podem excluir:

```sh
curl --include --request POST "$BASE_URL/patients" \
  --header "Authorization: Bearer $TOKEN" \
  --header "Content-Type: application/json" \
  --data '{"name":"Paciente Teste Curl","cpf":"12345678901"}'

curl --include --request PATCH "$BASE_URL/patients/$PATIENT_ID" \
  --header "Authorization: Bearer $TOKEN" \
  --header "Content-Type: application/json" \
  --data '{"name":"Paciente Teste Atualizado"}'

curl --include --request DELETE "$BASE_URL/patients/$PATIENT_ID" \
  --header "Authorization: Bearer $TOKEN"
```

Use apenas registros de teste para alterações e exclusões. Pacientes vinculados a
agendamentos podem não ser excluídos.

### Médicos, escalas e agendamentos

Usuários autenticados podem consultar médicos e escalas; somente administradores
podem criar médicos ou substituir escalas. O `weekDay` vai de `0` (domingo) a
`6` (sábado). A substituição da escala remove os turnos anteriores:

```sh
curl --include "$BASE_URL/doctors?page=1&pageSize=20" \
  --header "Authorization: Bearer $TOKEN"

DOCTOR_ID=1
curl --include "$BASE_URL/doctors/$DOCTOR_ID/work-schedule" \
  --header "Authorization: Bearer $TOKEN"

curl --include --request PUT "$BASE_URL/doctors/$DOCTOR_ID/work-schedule" \
  --header "Authorization: Bearer $TOKEN" \
  --header "Content-Type: application/json" \
  --data '{
    "shifts":[
      {"weekDay":1,"startTime":"09:00","endTime":"12:00","slotDurationMinutes":30}
    ]
  }'
```

Todos os perfis autenticados podem consultar agendamentos; médicos veem apenas
os próprios. Administradores e secretarias podem criar agendamentos. Use datas
`YYYY-MM-DD` nos filtros e uma data ISO 8601 com fuso em `startsAt`. O horário
deve estar dentro da escala do médico e disponível para o paciente e o médico:

```sh
curl --get --include "$BASE_URL/appointments" \
  --header "Authorization: Bearer $TOKEN" \
  --data-urlencode "doctorId=$DOCTOR_ID" \
  --data-urlencode "patientId=$PATIENT_ID" \
  --data-urlencode "status=scheduled" \
  --data-urlencode "from=2026-10-01" \
  --data-urlencode "to=2026-10-31"

curl --include --request POST "$BASE_URL/appointments" \
  --header "Authorization: Bearer $TOKEN" \
  --header "Content-Type: application/json" \
  --data "{
    \"doctorId\":$DOCTOR_ID,
    \"patientId\":$PATIENT_ID,
    \"startsAt\":\"2026-10-26T09:00:00-03:00\"
  }"

curl --get --include "$BASE_URL/doctors/$DOCTOR_ID/calendar" \
  --header "Authorization: Bearer $TOKEN" \
  --data-urlencode "from=2026-10-26" \
  --data-urlencode "to=2026-10-31"
```

As datas acima são exemplos; escolha um período válido e futuro de acordo com a
escala cadastrada. Os status são `scheduled`, `in_progress`, `done` e
`cancelled`. Uma transição permitida pode ser testada assim:

```sh
APPOINTMENT_ID=1
curl --include --request PATCH "$BASE_URL/appointments/$APPOINTMENT_ID/status" \
  --header "Authorization: Bearer $TOKEN" \
  --header "Content-Type: application/json" \
  --data '{"status":"in_progress"}'
```

As transições são `scheduled` para `in_progress` ou `cancelled`, e
`in_progress` para `done` ou `cancelled`; permissões também dependem do perfil e
do vínculo com o agendamento.

### Prontuários e usuários

Administradores podem consultar prontuários. Médicos podem consultar e criar
anotações para pacientes com quem tenham vínculo clínico. Secretarias não têm
acesso. Não use dados médicos reais em testes:

```sh
curl --include "$BASE_URL/patients/$PATIENT_ID/medical-records?page=1&pageSize=20" \
  --header "Authorization: Bearer $TOKEN"

curl --include --request POST "$BASE_URL/patients/$PATIENT_ID/medical-records" \
  --header "Authorization: Bearer $TOKEN" \
  --header "Content-Type: application/json" \
  --data '{"text":"Anotação clínica de teste."}'
```

Somente administradores podem criar usuários, com os perfis `admin`,
`secretary` ou `doctor`:

```sh
curl --include --request POST "$BASE_URL/users" \
  --header "Authorization: Bearer $TOKEN" \
  --header "Content-Type: application/json" \
  --data '{
    "name":"Secretaria Teste Curl",
    "email":"secretaria-teste-curl@example.com",
    "password":"SENHA_FORTE_DE_TESTE",
    "roles":["secretary"]
  }'
```

O endpoint administrativo `GET /admin/ping` retorna `200` para administradores
e `403` para outros perfis. Em geral, `401` indica falta ou invalidade do token,
`403` falta de permissão, `404` recurso inexistente, `409` conflito e `422`
regra de negócio não atendida. Use `--include` para ver o status HTTP e o JSON
de erro retornado.

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
