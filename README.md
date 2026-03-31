# 💇‍♀️ Cabeleleila Leila - Sistema de Agendamento

Sistema de agendamento online para Salão de Beleza, desenvolvido em Node.js com Express e PostgreSQL, seguindo o padrão MVC.

![Badge](https://img.shields.io/badge/Node.js-18+-green)
![Badge](https://img.shields.io/badge/PostgreSQL-18+-blue)
![Badge](https://img.shields.io/badge/License-MIT-yellow)

---

## 📋 Índice

- [Sobre o Projeto](#sobre-o-projeto)
- [Funcionalidades](#funcionalidades)
- [Tecnologias Utilizadas](#tecnologias-utilizadas)
- [Pré-requisitos](#pré-requisitos)
- [Instalação](#instalação)
- [Configuração do Banco de Dados](#configuração-do-banco-de-dados)
- [Executando o Projeto](#executando-o-projeto)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [API Endpoints](#api-endpoints)
- [Guia de Uso](#guia-de-uso)
  - [Área do Cliente](#área-do-cliente)
  - [Área Administrativa](#área-administrativa)
- [Regras de Negócio](#regras-de-negócio)
- [Contribuição](#contribuição)
- [Licença](#licença)

---

## 📖 Sobre o Projeto

O **Cabeleleila Leila** é um sistema de agendamento para salão de beleza que permite:
- Clientes agendarem serviços online
- Administradora gerenciar agendamentos e serviços
- Dashboard com indicadores de desempenho

---

## ✨ Funcionalidades

### Área do Cliente
- 🔍 Busca de cliente por telefone
- 📝 Cadastro de novos clientes
- 📅 Agendamento de serviços com escolha de data/hora
- 🎯 Seleção múltipla de serviços
- 📊 Visualização do histórico de agendamentos
- ✏️ Edição de agendamentos pendentes (mais de 48h de antecedência)
- 🗑️ Exclusão de agendamentos pendentes (mais de 48h de antecedência)

### Área Administrativa
- 🔐 Login com senha protegida
- 📊 Dashboard com indicadores:
  - Total de agendamentos (7 dias)
  - Agendamentos confirmados
  - Agendamentos concluídos
  - Faturamento total
- 📅 Visualização da agenda
- ✏️ Edição completa de agendamentos (data, serviços, status)
- ✅ Confirmação de agendamentos
- ❌ Cancelamento de agendamentos
- 💅 Gerenciamento de serviços (CRUD)

### Regras de Negócio
- ⚠️ Alerta de unificação: se cliente tentar agendar na mesma semana, sugere unificar serviços
- ⏰ Validação de 48h: alterações só permitidas por telefone com menos de 48h de antecedência
- 🔒 Autenticação: área admin protegida por senha

---

## 🛠️ Tecnologias Utilizadas

- **Backend**: Node.js + Express
- **Banco de Dados**: PostgreSQL
- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Bibliotecas**: pg, cors, dotenv

---

## 📌 Pré-requisitos

- Node.js 18+
- PostgreSQL 18+
- npm ou yarn

---

## 🚀 Instalação

1. **Clone o repositório:**
```bash
git clone https://github.com/seu-usuario/cabeleleila-leila.git
cd cabeleleila-leila
```

2. **Instale as dependências:**
```bash
npm install
```

---

## 🗄️ Configuração do Banco de Dados

1. **Crie o banco de dados:**
```sql
CREATE DATABASE salao_leila_db;
```

2. **Execute o script de criação das tabelas:**
```bash
psql -U postgres -d salao_leila_db -f schema.sql
```

3. **Configure as variáveis de ambiente:**

Crie um arquivo `.env` na raiz do projeto:
```env
PORT=3000
DB_HOST=localhost
DB_PORT=5433
DB_NAME=salao_leila_db
DB_USER=postgres
DB_PASSWORD=sua_senha
ADMIN_PASSWORD=admin123
```

> ⚠️ **Nota**: Configure a senha do PostgreSQL conforme sua instalação.

---

## ▶️ Executando o Projeto

```bash
npm start
```

O servidor akan executar em `http://localhost:3000`

---

## 📁 Estrutura do Projeto

```
cabeleleila-leila/
├── public/
│   ├── index.html      # Página principal
│   ├── style.css      # Estilos CSS
│   └── app.js         # JavaScript do frontend
├── src/
│   ├── config/
│   │   └── db.js      # Configuração do banco
│   ├── controllers/
│   │   ├── AgendamentoController.js
│   │   ├── ClienteController.js
│   │   └── ServicoController.js
│   ├── models/
│   │   ├── Agendamento.js
│   │   ├── Cliente.js
│   │   └── Servico.js
│   └── routes/
│       └── index.js   # Rotas da API
├── .env               # Variáveis de ambiente
├── .gitignore
├── package.json
├── schema.sql         # Script do banco de dados
└── server.js          # Arquivo principal
```

---

## 🌐 API Endpoints

### Clientes
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/clientes` | Lista todos os clientes |
| GET | `/api/clientes/telefone?telefone=` | Busca cliente por telefone |
| GET | `/api/clientes/:id` | Busca cliente por ID |
| POST | `/api/clientes` | Cria novo cliente |
| PUT | `/api/clientes/:id` | Atualiza cliente |
| DELETE | `/api/clientes/:id` | Deleta cliente |

### Serviços
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/servicos` | Lista todos os serviços |
| GET | `/api/servicos/:id` | Busca serviço por ID |
| POST | `/api/servicos` | Cria novo serviço |
| PUT | `/api/servicos/:id` | Atualiza serviço |
| DELETE | `/api/servicos/:id` | Deleta serviço |

### Agendamentos
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/agendamentos` | Lista todos os agendamentos |
| GET | `/api/agendamentos/:id` | Busca agendamento por ID |
| GET | `/api/agendamentos/cliente/:id` | Lista agendamentos do cliente |
| POST | `/api/agendamentos` | Cria novo agendamento |
| PUT | `/api/agendamentos/:id` | Atualiza agendamento (admin) |
| PATCH | `/api/agendamentos/:id/status` | Atualiza status |
| DELETE | `/api/agendamentos/:id` | Cancela agendamento |
| DELETE | `/api/agendamentos/cliente/:id` | Cliente exclui próprio agendamento |
| PUT | `/api/agendamentos/cliente/:id` | Cliente edita próprio agendamento |

### Dashboard
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/dashboard` | Dados do dashboard |

---

## 📖 Guia de Uso

### Área do Cliente

1. **Buscar cliente**: Digite o telefone e clique em "Buscar"
   - Se já existir, mostra os dados do cliente
   - Se não existir, mostra formulário para cadastro

2. **Agendar serviço**:
   - Selecione data e hora
   - Escolha um ou mais serviços
   - Adicione observações (opcional)
   - Confirme o agendamento

3. **Ver histórico**: Na aba "Meu Histórico", digite o telefone para ver agendamentos anteriores

4. **Editar/Excluir**: Agendamentos pendentes com mais de 48h podem ser editados ou excluídos

### Área Administrativa

1. **Login**: Clique em "Área da Leila (Admin)" e digite a senha (padrão: `admin123`)

2. **Dashboard**: Visualize indicadores de desempenho

3. **Agenda**: Veja os próximos agendamentos

4. **Gerenciar serviços**: Adicione, edite ou exclua serviços do salão

5. **Editar agendamentos**: Clique em "Editar" para alterar data, serviços, observações ou status

---

## ⚙️ Regras de Negócio

| Regra | Descrição |
|-------|-----------|
| Unificação de serviços | Se cliente tentar agendar na mesma semana, sistema sugere unificar |
| Validação 48h | Alterações em menos de 48h só por telefone |
| Status confirmado | Cliente não pode editar/cancelar agendamentos confirmados |
| Histórico | Histórico mostra todos os agendamentos do cliente |

---

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas alterações (`git commit -m 'Adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Crie um Pull Request

---

## 📝 Licença

Este projeto está sob a licença MIT.

---

## 📸 Screenshots

> Adicione screenshots do sistema aqui:
> - Tela inicial (Área do Cliente)
> - Tela de agendamento
> - Tela administrativa (Dashboard)
> - Tela de gerenciamento de serviços

---

Desenvolvido com ❤️ para o Salão Cabeleleila Leila