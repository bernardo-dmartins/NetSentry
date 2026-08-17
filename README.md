# NetSentry

NetSentry é uma plataforma full stack para monitoramento e operação de infraestrutura de rede. Além de visibilidade em tempo real, o sistema cobre o ciclo completo de gestão: autenticaçãoo de usuários, cadastro e manutenção de dispositivos, acompanhamento de checks, visualizaçãoo de métricas no dashboard, notificações e configurações de conta e sistema.

Na prática, o projeto combina API REST, eventos em tempo real com WebSocket e interface web para centralizar o acompanhamento do ambiente monitorado e acelerar a resposta a incidentes.
## Status do projeto

Projeto em evolução contínua. A base principal está funcional, mas ainda existem frentes importantes em andamento antes de considerar uma versão mais estável para produção.

- Revisão e estabilização da suite de testes (principalmente E2E)
- Containerização completa da aplicação (backend, frontend e servicos de apoio)
- Deploy em VPS Oracle Cloud Free Tier

## O que o projeto entrega

- Monitoramento de dispositivos com atualização em tempo real
- Alertas de indisponibilidade
- Dashboard web para operação
- Autenticação com JWT
- API documentada com Swagger
- Suíte de testes E2E com Cypress

## Stack

### Backend
- Node.js + Express
- Socket.IO
- SQLite + Sequelize
- Redis (cache e suporte a cenarios de produção)
- JWT, bcrypt, Winston

### Frontend
- React
- Tailwind CSS
- Axios
- Socket.IO Client

### Testes automatizados
- Cypress (E2E)

## Estrutura do repositorio

```text
NetSentry/
|-- monitoring-backend/
|-- monitoring-frontend/
|-- cypress/
`-- package.json
```

## Como rodar localmente

### 1. Clonar o repositorio

```bash
git clone https://github.com/bernardo-dmartins/NetSentry.git
cd NetSentry
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar ambiente

Use os arquivos de exemplo:

- `monitoring-backend/.env.example`
- `monitoring-frontend/.env.example`

Crie os `.env` correspondentes com os valores do seu ambiente.

### 4. Subir backend + frontend

```bash
npm start
```

Se preferir:

```bash
npm run dev
```

## Enderecos locais

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:5000`
- Swagger: `http://localhost:5000/api-docs`

## Scripts principais

| Script | Uso |
|---|---|
| `npm start` | Sobe frontend e backend |
| `npm run dev` | Desenvolvimento com processos concorrentes |
| `npm run build` | Build para produção |
| `npm run test:e2e` | Executa testes E2E |
| `npm run cypress:open` | Abre Cypress em modo interativo |
| `npm run cypress:run` | Cypress headless |

## Testes

Os testes E2E ficam em `cypress/e2e`, organizados por dominio:

- `auth/`
- `devices/`
- `dashboard/`
- `settings/`
- `components/`

Executar:

```bash
npm run cypress:open
```

ou

```bash
npm run cypress:run
```

## API (resumo)

### Autenticacao
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`

### Dispositivos
- `GET /api/devices`
- `POST /api/devices`
- `GET /api/devices/:id`
- `PUT /api/devices/:id`
- `DELETE /api/devices/:id`

### Monitoramento
- `GET /api/monitoring/status`
- `GET /api/monitoring/alerts`
- `GET /api/monitoring/metrics`

## Contribuicao

Sugestões e PRs são bem-vindos.

1. Crie uma branch (`git checkout -b feature/minha-feature`)
2. Commit (`git commit -m "feat: minha feature"`)
3. Push (`git push origin feature/minha-feature`)
4. Abra o Pull Request

## Proximos passos (roadmap curto)

- [ ] Revisar cenários Cypress com falhas e melhorar confiabilidade dos testes
- [ ] Definir e validar estrategia de Docker/Docker Compose
- [ ] Realizar o deploy na Oracle Cloud free tier
## Licenca

MIT.


