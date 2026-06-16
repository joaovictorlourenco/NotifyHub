# Notification System — Software Design Document (SDD)

**Versão:** 1.0  
**Data:** Junho 2026

---

## 1. Visão Geral

Sistema de disparo e rastreamento de notificações (e-mail e SMS) com processamento assíncrono via fila de mensagens. O projeto foi desenvolvido como portfólio técnico para demonstrar domínio da stack exigida pela vaga de Desenvolvedor FullStack Pleno, cobrindo os requisitos obrigatórios: Java/Spring Boot, JMS/ActiveMQ, SQL avançado, REST e versionamento de API.

### 1.1 Objetivos

- Disparo assíncrono de notificações via ActiveMQ
- API REST versionada com endpoints de criação, consulta e auditoria
- Persistência em PostgreSQL com migrations Flyway e queries SQL avançadas
- Frontend React simples para visualização e envio de notificações
- Observabilidade via Spring Actuator

### 1.2 Stack tecnológica

| Camada | Tecnologia | Versão |
|--------|-----------|--------|
| Backend | Java + Spring Boot | 21 / 3.3.x |
| Mensageria | ActiveMQ Classic | 6.x |
| Banco de dados | PostgreSQL | 16 |
| Migrations | Flyway | gerenciado pelo Boot |
| Frontend | React + Vite | 18 / 5.x |
| Infraestrutura | Docker + Docker Compose | latest |
| Interface DB | pgAdmin 4 | latest |
| Build | Maven (mvnw) | 3.x |

---

## 2. Arquitetura

O sistema é composto por quatro camadas principais: apresentação (React), API (Spring Boot), mensageria (ActiveMQ) e persistência (PostgreSQL). O fluxo padrão de envio de notificação é síncrono até a criação do registro, e assíncrono a partir da publicação na fila.

### 2.1 Fluxo de envio

1. Frontend faz `POST /api/v1/notifications`
2. `NotificationController` valida o DTO e chama `NotificationService`
3. `NotificationService` persiste o registro com status `PENDING` e publica na fila `notifications.queue` via `JmsTemplate`
4. `NotificationWorker` consome a mensagem com `@JmsListener`, chama o Sender correspondente (Email ou SMS stub) e atualiza o status para `SENT` ou `FAILED`
5. `AuditService` registra cada mudança de estado na tabela `audit_log`

### 2.2 Containers Docker

| Container | Imagem | Portas | Função |
|-----------|--------|--------|--------|
| notification-postgres | postgres:16-alpine | 5432 | Banco de dados principal |
| notification-pgadmin | dpage/pgadmin4:latest | 5050 → 80 | Interface web para o banco |
| notification-activemq | apache/activemq-classic:latest | 61616 (JMS) / 8161 (console) | Broker de mensagens |

---

## 3. Domínio de Negócio

### 3.1 Notification

Representa uma notificação a ser enviada.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | Chave primária |
| recipient | VARCHAR(200) | Destinatário (e-mail ou telefone) |
| channel | ENUM | EMAIL ou SMS |
| status | ENUM | PENDING → SENT \| FAILED |
| templateId | UUID | FK para templates |
| variables | JSONB | Variáveis para substituição no template |
| createdAt | TIMESTAMPTZ | Data de criação |
| sentAt | TIMESTAMPTZ | Data de envio efetivo |

### 3.2 Template

Modelo de mensagem com variáveis substituíveis.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | Chave primária |
| name | VARCHAR(100) | Nome do template |
| channel | ENUM | EMAIL ou SMS |
| subject | VARCHAR(200) | Assunto (apenas e-mail) |
| body | TEXT | Corpo com placeholders `{{variavel}}` |
| version | INT | Versão do template |
| active | BOOLEAN | Se está ativo |
| createdAt | TIMESTAMPTZ | Data de criação |

### 3.3 AuditLog

Histórico imutável de eventos por notificação.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | Chave primária |
| notificationId | UUID | FK para notifications |
| event | VARCHAR(50) | Tipo do evento (CREATED, SENT, FAILED...) |
| detail | TEXT | Detalhes do evento |
| occurredAt | TIMESTAMPTZ | Data do evento |

---

## 4. API REST

### 4.1 Versionamento

Todos os endpoints seguem o padrão `/api/v1/`. Backward compatibility garantida: novos campos adicionados com `@JsonInclude(NON_NULL)`, nenhum campo removido em versões existentes.

### 4.2 Endpoints

| Método | Rota | Descrição |
|--------|------|-----------|
| `POST` | `/api/v1/notifications` | Cria e enfileira notificação |
| `GET` | `/api/v1/notifications` | Lista com filtros (status, canal, período) |
| `GET` | `/api/v1/notifications/{id}` | Detalhe + histórico de auditoria |
| `POST` | `/api/v1/templates` | Cria template |
| `GET` | `/api/v1/templates` | Lista templates ativos |
| `GET` | `/api/v1/audit/{notificationId}` | Histórico de eventos da notificação |
| `GET` | `/api/v1/metrics/summary` | Contagens por status e canal (SQL agregado) |

---

## 5. Modelo de Dados

### 5.1 Migrations Flyway (`src/main/resources/db/migration/`)

```sql
-- V1__create_notifications.sql
CREATE TABLE templates (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(100) NOT NULL,
    channel     VARCHAR(10)  NOT NULL CHECK (channel IN ('EMAIL','SMS')),
    subject     VARCHAR(200),
    body        TEXT         NOT NULL,
    version     INT          NOT NULL DEFAULT 1,
    active      BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE notifications (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient    VARCHAR(200) NOT NULL,
    channel      VARCHAR(10)  NOT NULL,
    status       VARCHAR(20)  NOT NULL DEFAULT 'PENDING',
    template_id  UUID         REFERENCES templates(id),
    variables    JSONB,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    sent_at      TIMESTAMPTZ
);

CREATE TABLE audit_log (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_id  UUID         NOT NULL REFERENCES notifications(id),
    event            VARCHAR(50)  NOT NULL,
    detail           TEXT,
    occurred_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_status  ON notifications(status);
CREATE INDEX idx_notifications_channel ON notifications(channel);
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);
CREATE INDEX idx_audit_notification_id ON audit_log(notification_id);
```

### 5.2 Query de métricas (SQL avançado)

```sql
SELECT
    channel,
    status,
    COUNT(*)                                                            AS total,
    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24h')       AS last_24h,
    AVG(EXTRACT(EPOCH FROM (sent_at - created_at)))                     AS avg_seconds_to_send
FROM notifications
GROUP BY ROLLUP(channel, status)
ORDER BY channel, status;
```

---

## 6. Mensageria (JMS / ActiveMQ)

### 6.1 Componentes

| Classe | Responsabilidade |
|--------|-----------------|
| `NotificationPublisher` | Publica mensagens na fila usando `JmsTemplate` |
| `NotificationWorker` | Consome mensagens com `@JmsListener`, processa com `@Async` |
| `JmsConfig` | Configura `ConnectionFactory`, `JmsTemplate` e `DefaultJmsListenerContainerFactory` |
| `AsyncConfig` | Configura `ThreadPoolTaskExecutor` para processamento concorrente |

### 6.2 Fila

- Nome: `notifications.queue`
- Protocolo: OpenWire (TCP porta 61616)
- Worker com pool de threads configurável via `@EnableAsync`
- Console de administração em `http://localhost:8161` (admin/admin)

---

## 7. Estrutura de Pacotes

```
src/main/java/com/example/notifications/
├── api/
│   ├── v1/
│   │   ├── NotificationController.java
│   │   ├── TemplateController.java
│   │   └── MetricsController.java
│   └── dto/
├── domain/
│   ├── model/
│   │   ├── Notification.java
│   │   ├── Template.java
│   │   └── AuditLog.java
│   ├── repository/
│   └── service/
│       ├── NotificationService.java
│       ├── TemplateService.java
│       └── AuditService.java
├── messaging/
│   ├── NotificationPublisher.java
│   └── NotificationWorker.java
├── sender/
│   ├── NotificationSender.java
│   ├── EmailSender.java
│   └── SmsSender.java
└── config/
    ├── JmsConfig.java
    ├── AsyncConfig.java
    └── JacksonConfig.java
```

---

## 8. Dependências

### 8.1 Backend (`pom.xml`)

| Dependência | Artefato | Origem |
|-------------|----------|--------|
| Spring Web | `spring-boot-starter-web` | Spring Initializr |
| Validation | `spring-boot-starter-validation` | Spring Initializr |
| ActiveMQ | `spring-boot-starter-activemq` | Spring Initializr |
| Spring Data JPA | `spring-boot-starter-data-jpa` | Spring Initializr |
| PostgreSQL Driver | `postgresql` | Spring Initializr |
| Flyway Core | `flyway-core` | Spring Initializr |
| Flyway PostgreSQL | `flyway-database-postgresql` | Spring Initializr |
| Actuator | `spring-boot-starter-actuator` | Spring Initializr |
| DevTools | `spring-boot-devtools` | Spring Initializr |
| Lombok | `lombok` | Spring Initializr |
| MapStruct | `mapstruct 1.6.3` | Manual no pom.xml |
| SpringDoc OpenAPI | `springdoc-openapi-starter-webmvc-ui 2.8.8` | Manual no pom.xml |
| Testcontainers JUnit 5 | `junit-jupiter` | Spring Initializr |
| Testcontainers PostgreSQL | `postgresql` (scope test) | Manual no pom.xml |
| Testcontainers ActiveMQ | `activemq` (scope test) | Manual no pom.xml |

### 8.2 Frontend (`package.json`)

| Lib | Uso |
|-----|-----|
| `react` + `react-dom` | Base do frontend |
| `vite` | Build e dev server |
| `axios` | Chamadas REST |
| `react-query` | Cache e refetch automático |
| `react-router-dom` | Roteamento de páginas |
| `recharts` | Gráfico de métricas no dashboard |
| `tailwindcss` | Estilização utilitária |

---

## 9. Infraestrutura Local

### 9.1 Subir os containers

```powershell
docker-compose up -d
```

### 9.2 Acesso aos serviços

| Serviço | URL | Credenciais |
|---------|-----|-------------|
| pgAdmin (interface web DB) | http://localhost:5050 | admin@admin.com / admin |
| ActiveMQ Console | http://localhost:8161 | admin / admin |
| API Spring Boot | http://localhost:8080 | — |
| Swagger UI | http://localhost:8080/swagger-ui/index.html | — |
| Actuator health | http://localhost:8080/actuator/health | — |

### 9.3 Configuração do banco no pgAdmin

Ao acessar o pgAdmin pela primeira vez, clique em **Add New Server** e use:

| Campo | Valor |
|-------|-------|
| Host | `notification-postgres` |
| Port | `5432` |
| Database | `notification_db` |
| Username | `notification_user` |
| Password | `notification_pass` |

> O host deve ser o nome do container (`notification-postgres`), não `localhost`, pois os dois containers estão na mesma rede Docker.

---

## 10. Cobertura dos Requisitos da Vaga

| Requisito da vaga | Como é coberto no projeto |
|-------------------|--------------------------|
| Java avançado + Spring | `@Service`, `@Transactional`, `@Async`, `@JmsListener`, `@RestController` |
| SQL avançado + leitura de PL/SQL | Query de métricas com `ROLLUP`, `FILTER`, `EXTRACT` e índices compostos |
| APIs REST | Controllers versionados com DTOs, `@Valid` e tratamento de erros |
| JMS / ActiveMQ | `JmsTemplate` (publish) + `@JmsListener` (consume) com pool de threads |
| Concorrência (threads) | `ThreadPoolTaskExecutor` configurado com `@EnableAsync` no worker |
| Versionamento de API + backward compatibility | Path `/v1/`, `@JsonInclude(NON_NULL)`, campos nunca removidos |
| Maven | `mvnw` com `pom.xml` configurado incluindo annotation processors |
| Git | Projeto versionado com `.gitignore` padrão Spring Boot |
| Observabilidade (logs, métricas) | Spring Actuator: `/health`, `/metrics`, `/info` |
| Containerização (Docker) | `docker-compose` com postgres, pgadmin e activemq |
| Microsserviços (desejável) | Estrutura modular pronta para extração do worker como serviço independente |
| CI/CD (desejável) | `Dockerfile` multi-stage preparado para pipeline Jenkins |
