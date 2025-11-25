# NetSentry - Network Monitoring System

Sistema de monitoramento de rede em tempo real com alertas automáticos por email e interface web moderna.

## 🔗 Link do projeto

- **Aplicação:** (https://netsentry.onrender.com)
  
## 📋 Sobre

NetSentry é um sistema de monitoramento de dispositivos de rede que permite:

- Monitoramento em tempo real via PING ou HTTP
- Alertas automáticos por email
- Dashboard com estatísticas e métricas
- WebSocket para atualizações instantâneas
- API RESTful documentada

## 🚀 Tecnologias

### Backend
- Node.js + Express
- Socket.IO
- Sequelize + SQLite
- Redis (sessões e cache)
- JWT + Bcryptjs (Autenticação via token + criptografia)
- Nodemailer (Emails)
- Swagger (Documentação)
- Winston (Logs)
- Cypress (Testes)

### Frontend
- React 18
- TailwindCSS
- Socket.IO Client
- Axios
- React Router

## 💻 Instalação Local

### Pré-requisitos
- Node.js v18+
- npm v8+
- Redis (opcional)

### Passo a Passo

**1. Clone o repositório**
```bash
git clone https://github.com/seu-usuario/netsentry.git
cd netsentry
```

**2. Configure o Backend**
```bash
cd monitoring-backend
npm install
cp .env.example .env
# Edite o .env com suas configurações
```

**3. Configure o Frontend**
```bash
cd ../monitoring-frontend
npm install
cp .env.example .env
# Edite o .env com suas configurações
```

**4. Inicie os servidores**

Terminal 1 (Backend):
```bash
cd monitoring-backend
npm start
```

Terminal 2 (Frontend):
```bash
cd monitoring-frontend
npm start
```
- Dica: Usar o Concurrently para startar ambos os servidores na raiz do projeto com apenas um comando

**5. Acesse**
- Frontend: http://localhost:3000
- Backend: http://localhost:5000
- Docs: http://localhost:5000/api-docs

## ⚙️ Variáveis de Ambiente

### Backend

```env
NODE_ENV=production
PORT=5000
JWT_SECRET=chave_secreta_segura
JWT_EXPIRES_IN=7d
DB_STORAGE=./database.sqlite
CORS_ORIGIN=*
EMAIL_SERVICE=gmail
EMAIL_USER=seuemail@gmail.com
EMAIL_PASSWORD=senha_app_google
EMAIL_FROM=seuemail@gmail.com
ALERT_EMAIL_TO=admin@example.com
MONITORING_INTERVAL=30000
```

### Frontend

```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_SOCKET_URL=http://localhost:5000
```

## 🚢 Deploy

O projeto usa Render para hospedagem Web Service

**Deploy no Render:**

1. Conecte seu repositório no Render
2. Crie um Web Service
3. Configure as variáveis de ambiente
4. Deploy automático

## 📖 Uso

### Adicionar Dispositivo
1. Faça login
2. Clique em "Add Host"
3. Preencha: nome, IP, tipo
4. Sistema monitora automaticamente a cada 30s

### Alertas
Emails são enviados automaticamente quando:
- Dispositivo fica offline
- Dispositivo volta online
- Tempo de resposta alto

## 🔌 API

### Autenticação
```bash
POST /api/auth/login
POST /api/auth/register
GET  /api/auth/me
```

### Dispositivos
```bash
GET    /api/devices
GET    /api/devices/:id
POST   /api/devices
PUT    /api/devices/:id
DELETE /api/devices/:id
POST   /api/devices/:id/check
```

### Alertas
```bash
GET /api/alerts
GET /api/alerts/recent
PUT /api/alerts/:id/acknowledge
```

Documentação completa: `/api-docs`


## 🔐 Segurança

- Autenticação JWT
- Rate limiting
- Validação de inputs
- CORS configurado
- Senhas criptografadas (bcrypt)

## ⚠️ Observações

- No plano free do Render, o banco SQLite é reiniciado a cada deploy
- Redis é opcional (fallback para memória)
- Para persistência real, use PostgreSQL ou plano pago

## 📄 Licença

MIT

## 👤 Autor

**[Bernardo Martins]**
- Email: bernado.dmartins7@gmail.com

---

**Projeto desenvolvido para:** [Projeto técnológico em desenvolvimento de sistemas] - [ULBRA]  
**Data:** Novembro/2025
