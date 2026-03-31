-- Schema Salão de Beleza Leila
-- PostgreSQL

-- Tabela de Clientes
CREATE TABLE IF NOT EXISTS clientes (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    telefone VARCHAR(20) NOT NULL,
    email VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Serviços
CREATE TABLE IF NOT EXISTS servicos (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    descricao TEXT,
    preco DECIMAL(10,2) NOT NULL,
    duracao_minutos INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Agendamentos
CREATE TABLE IF NOT EXISTS agendamentos (
    id SERIAL PRIMARY KEY,
    cliente_id INTEGER REFERENCES clientes(id) ON DELETE CASCADE,
    data_hora TIMESTAMP NOT NULL,
    status VARCHAR(20) DEFAULT 'pendente',
    observacoes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de serviços do agendamento (relação many-to-many)
CREATE TABLE IF NOT EXISTS agendamento_servicos (
    id SERIAL PRIMARY KEY,
    agendamento_id INTEGER REFERENCES agendamentos(id) ON DELETE CASCADE,
    servico_id INTEGER REFERENCES servicos(id) ON DELETE CASCADE
);

-- Dados Iniciais - Serviços
INSERT INTO servicos (nome, descricao, preco, duracao_minutos) VALUES
('Corte', 'Corte de cabelo tradicional', 80.00, 45),
('Escova', 'Escova modeladora', 60.00, 40),
('Tintura', 'Coloração completa', 150.00, 120),
('Mechas', 'Mechas californianas ou tradicionais', 200.00, 150),
('Progressiva', 'Alisamento brasileiro', 250.00, 180),
('Manicure', 'Esmaltação tradicional', 40.00, 30),
('Pedicure', 'Cuidados com os pés', 50.00, 40),
('Depilação', 'Depilação com cera', 60.00, 30),
('Massagem', 'Massagem relaxante', 100.00, 60),
('Tratamento Facial', 'Limpeza de pele', 120.00, 60)
ON CONFLICT DO NOTHING;

-- Dados Iniciais - Clientes
INSERT INTO clientes (nome, telefone, email) VALUES
('Maria Santos', '(31) 99999-0001', 'maria@email.com'),
('Ana Costa', '(31) 99999-0002', 'ana@email.com'),
('Juliana Silva', '(31) 99999-0003', 'juliana@email.com'),
('Carla Oliveira', '(31) 99999-0004', 'carla@email.com');

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_agendamentos_data ON agendamentos(data_hora);
CREATE INDEX IF NOT EXISTS idx_agendamentos_cliente ON agendamentos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_agendamentos_status ON agendamentos(status);