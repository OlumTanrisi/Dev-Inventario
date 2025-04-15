-- Create database
CREATE DATABASE IF NOT EXISTS office_inventory;
USE office_inventory;

-- Items table (main inventory)
CREATE TABLE items (
    item_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    measurement_unit VARCHAR(50) NOT NULL,
    current_quantity INT NOT NULL DEFAULT 0,
    min_threshold INT NOT NULL DEFAULT 15,
    max_threshold INT NOT NULL DEFAULT 50,
    status ENUM('SUFFICIENT', 'COMPRAS') NOT NULL DEFAULT 'SUFFICIENT',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Item additions table
CREATE TABLE item_additions (
    addition_id INT AUTO_INCREMENT PRIMARY KEY,
    item_id INT NOT NULL,
    quantity_added INT NOT NULL,
    purchase_date DATE NOT NULL,
    received_by VARCHAR(100) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (item_id) REFERENCES items(item_id)
);

-- Item withdrawals table
CREATE TABLE item_withdrawals (
    withdrawal_id INT AUTO_INCREMENT PRIMARY KEY,
    item_id INT NOT NULL,
    quantity_withdrawn INT NOT NULL,
    withdrawal_date DATE NOT NULL,
    withdrawn_by VARCHAR(100) NOT NULL,
    department VARCHAR(100) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (item_id) REFERENCES items(item_id)
);

-- Item update history table
CREATE TABLE item_updates_history (
    history_id INT AUTO_INCREMENT PRIMARY KEY,
    item_id INT NOT NULL,
    field_name VARCHAR(50) NOT NULL,
    old_value TEXT NOT NULL,
    new_value TEXT NOT NULL,
    updated_by VARCHAR(100) NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (item_id) REFERENCES items(item_id)
);

-- Trigger to automatically update status based on quantity
DELIMITER //
CREATE TRIGGER update_item_status
BEFORE UPDATE ON items
FOR EACH ROW
BEGIN
    IF NEW.current_quantity <= NEW.min_threshold THEN
        SET NEW.status = 'COMPRAS';
    ELSE
        SET NEW.status = 'SUFFICIENT';
    END IF;
END //
DELIMITER ;

-- Insert initial data from the Excel file
INSERT INTO items (name, measurement_unit, current_quantity, status) VALUES
('Apontadores', 'Unidade', 2, 'SUFFICIENT'),
('Bateria 9v', 'Unidade', 10, 'SUFFICIENT'),
('Borracha branca', 'Unidade', 2, 'SUFFICIENT'),
('Caderno 96 folhas Espiral (pequeno)', 'Unidade', 4, 'SUFFICIENT'),
('Caderno Protocolo 100fls', 'Unidade', 5, 'SUFFICIENT'),
('Caderno Protocolo 50fls', 'Unidade', 1, 'COMPRAS'),
('Caixa Arquivo de Papelão', 'Unidade', 25, 'SUFFICIENT'),
('Caneta BIC Azul', 'Unidade', 27, 'SUFFICIENT'),
('Caneta BIC Preta', 'Unidade', 20, 'SUFFICIENT'),
('Caneta BIC Vermelha', 'Unidade', 4, 'COMPRAS'),
('Caneta Marca Texto Amarela', 'Unidade', 4, 'SUFFICIENT'),
('Caneta Marca Texto Verde', 'Unidade', 4, 'SUFFICIENT'),
('Caneta Retroprojetor Preta Pilot', 'Unidade', 12, 'SUFFICIENT'),
('Clips 2/0 (caixa de 725 unidades)', 'Unidade', 1, 'SUFFICIENT'),
('Clips 6/0 (caixa de 220 unidades)', 'Unidade', 2, 'SUFFICIENT'),
('Cola Branca Bastão 10g', 'Unidade', -1, 'COMPRAS'),
('Cola Branca Líq.(110g)', 'Unidade', 4, 'SUFFICIENT'),
('Cheirinho', 'Unidade', 60, 'SUFFICIENT'),
('Copos', 'Unidade', 38, 'SUFFICIENT'),
('Calculadora', 'Unidade', 4, 'SUFFICIENT'),
('Corretivo em fita', 'Unidade', 6, 'SUFFICIENT'),
('Envelope Plástico (ofício c/ furos) Caixa com 400', 'Unidade', 1, 'SUFFICIENT'),
('Extrator de Grampo', 'Unidade', 3, 'SUFFICIENT'),
('Fita Adesiva Dupla Face (18mm)', 'Unidade', 3, 'SUFFICIENT'),
('Fita Adesiva grande (48mm)', 'Unidade', 2, 'COMPRAS'),
('Fita adesiva pequena (12mm) (Durex)', 'Unidade', 8, 'SUFFICIENT'),
('Grampeador', 'Unidade', 5, 'SUFFICIENT'),
('Grampo Galvanizado 26/6', 'Unidade', 6, 'SUFFICIENT'),
('Lápis Preto', 'Unidade', 4, 'SUFFICIENT'),
('Papel Sulfite A4', 'Unidade', 27, 'SUFFICIENT'),
('Papel Contact 45cm x 25m Cristal', 'Unidade', 1, 'SUFFICIENT'),
('Régua 30 cm', 'Unidade', 3, 'COMPRAS'),
('Tesoura', 'Unidade', 3, 'COMPRAS'),
('Tinta para Carimbo Vermelha (40ml)', 'Unidade', 4, 'SUFFICIENT'),
('Tinta para Carimbo Preta (40ml)', 'Unidade', 5, 'SUFFICIENT'),
('Pasta Transparente L', 'Unidade', 12, 'SUFFICIENT');
