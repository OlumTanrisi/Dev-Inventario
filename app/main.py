# ================== IMPORTAÇÕES ==================

# Importa o framework Flask para criação de APIs e páginas web
from flask import Flask, request, jsonify, render_template

# Importa a extensão SQLAlchemy do Flask para facilitar o uso de ORM (mapeamento objeto-relacional)
from flask_sqlalchemy import SQLAlchemy

# Importa a biblioteca padrão para lidar com data e hora
from datetime import datetime

# Importa funcionalidades do sistema operacional (não está em uso neste arquivo)
import os

# ================== CONFIGURAÇÃO DO APP ==================

#====== APENAS PARA TESTE ======

# Instancia o app Flask, especificando os diretórios estáticos e de templates
app = Flask(__name__, static_folder='static', template_folder='templates')

# Define a URL de conexão com o banco de dados MySQL usando o driver PyMySQL
app.config['SQLALCHEMY_DATABASE_URI'] = 'mysql+pymysql://(USUARIO):(SENHA)@(IP DA DATABASE OU LOCALHOST)/(NOME DO SCHEMA DA DATABASE)'

# Desativa o recurso de rastreamento de modificações do SQLAlchemy para economizar recursos
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Instancia o objeto `db` do SQLAlchemy para gerenciar o banco de dados
db = SQLAlchemy(app)

# ================== MODELOS DO BANCO DE DADOS ==================

# Modelo para representar os itens cadastrados no inventário
class Item(db.Model):
    __tablename__ = 'items'  # Nome da tabela no banco de dados

    # Campos da tabela com seus respectivos tipos e restrições
    item_id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    measurement_unit = db.Column(db.String(50), nullable=False)
    current_quantity = db.Column(db.Integer, nullable=False, default=0)
    min_threshold = db.Column(db.Integer, nullable=False, default=15)
    max_threshold = db.Column(db.Integer, nullable=False, default=50)
    status = db.Column(db.Enum('SUFFICIENT', 'COMPRAS'), nullable=False, default='SUFFICIENT')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)  # Data de criação
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)  # Data da última atualização

# Modelo para registrar cada adição de estoque feita em um item
class ItemAddition(db.Model):
    __tablename__ = 'item_additions'

    addition_id = db.Column(db.Integer, primary_key=True)
    item_id = db.Column(db.Integer, db.ForeignKey('items.item_id'), nullable=False)  # Chave estrangeira para a tabela items
    quantity_added = db.Column(db.Integer, nullable=False)
    purchase_date = db.Column(db.Date, nullable=False)
    received_by = db.Column(db.String(100), nullable=False)
    notes = db.Column(db.Text)  # Campo opcional de observações
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Define a relação de acesso entre a adição e o item correspondente
    item = db.relationship('Item', backref=db.backref('additions', lazy=True))

# Modelo para registrar as retiradas (saídas) de estoque
class ItemWithdrawal(db.Model):
    __tablename__ = 'item_withdrawals'

    withdrawal_id = db.Column(db.Integer, primary_key=True)
    item_id = db.Column(db.Integer, db.ForeignKey('items.item_id'), nullable=False)
    quantity_withdrawn = db.Column(db.Integer, nullable=False)
    withdrawal_date = db.Column(db.Date, nullable=False)
    withdrawn_by = db.Column(db.String(100), nullable=False)
    department = db.Column(db.String(100), nullable=False)
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    item = db.relationship('Item', backref=db.backref('withdrawals', lazy=True))

# Modelo para armazenar histórico de alterações em campos dos itens
class ItemUpdateHistory(db.Model):
    __tablename__ = 'item_updates_history'

    history_id = db.Column(db.Integer, primary_key=True)
    item_id = db.Column(db.Integer, db.ForeignKey('items.item_id'), nullable=False)
    field_name = db.Column(db.String(50), nullable=False)  # Campo que foi alterado
    old_value = db.Column(db.Text, nullable=False)  # Valor antigo
    new_value = db.Column(db.Text, nullable=False)  # Valor novo
    updated_by = db.Column(db.String(100), nullable=False)  # Quem alterou
    updated_at = db.Column(db.DateTime, default=datetime.utcnow)

    item = db.relationship('Item', backref=db.backref('update_history', lazy=True))

# ================== FUNÇÕES AUXILIARES ==================

# Verifica a quantidade atual do item e define seu status
def update_item_status(item):
    if item.current_quantity <= item.min_threshold:
        item.status = 'COMPRAS'  # Está abaixo do limite, precisa comprar
    else:
        item.status = 'SUFFICIENT'  # Quantidade suficiente

# ================== ROTAS PRINCIPAIS ==================

# Página inicial do sistema (renderiza o HTML)
@app.route('/')
def index():
    return render_template('index.html')

# ================== ENDPOINTS DE API ==================

# Retorna todos os itens cadastrados no sistema
@app.route('/api/items', methods=['GET'])
def get_items():
    items = Item.query.all()
    return jsonify([{
        'item_id': item.item_id,
        'name': item.name,
        'measurement_unit': item.measurement_unit,
        'current_quantity': item.current_quantity,
        'min_threshold': item.min_threshold,
        'max_threshold': item.max_threshold,
        'status': item.status
    } for item in items])

# Adiciona um novo item ao banco de dados
@app.route('/api/items', methods=['POST'])
def add_item():
    data = request.json
    new_item = Item(
        name=data['name'],
        measurement_unit=data['measurement_unit'],
        current_quantity=data['current_quantity'],
        min_threshold=data.get('min_threshold', 15),
        max_threshold=data.get('max_threshold', 50)
    )
    update_item_status(new_item)
    db.session.add(new_item)
    db.session.commit()
    return jsonify({'message': 'Item added successfully', 'item_id': new_item.item_id}), 201

# Retorna os dados de um item específico com base no ID
@app.route('/api/items/<int:item_id>', methods=['GET'])
def get_item(item_id):
    item = Item.query.get_or_404(item_id)
    return jsonify({
        'item_id': item.item_id,
        'name': item.name,
        'measurement_unit': item.measurement_unit,
        'current_quantity': item.current_quantity,
        'min_threshold': item.min_threshold,
        'max_threshold': item.max_threshold,
        'status': item.status
    })

# Atualiza as informações de um item existente
@app.route('/api/items/<int:item_id>', methods=['PUT'])
def update_item(item_id):
    item = Item.query.get_or_404(item_id)
    data = request.json
    changes = []

    # Verifica quais campos foram modificados e armazena no histórico
    for field, new_value in data.items():
        if hasattr(item, field) and getattr(item, field) != new_value:
            changes.append({
                'field_name': field,
                'old_value': str(getattr(item, field)),
                'new_value': str(new_value),
                'updated_by': data.get('updated_by', 'System')
            })
            setattr(item, field, new_value)

    update_item_status(item)

    # Salva as alterações no histórico
    for change in changes:
        history = ItemUpdateHistory(
            item_id=item.item_id,
            field_name=change['field_name'],
            old_value=change['old_value'],
            new_value=change['new_value'],
            updated_by=change['updated_by']
        )
        db.session.add(history)

    db.session.commit()
    return jsonify({'message': 'Item updated successfully'})

# Adiciona uma quantidade de estoque a um item já existente
@app.route('/api/additions', methods=['POST'])
def add_item_stock():
    data = request.json
    item = Item.query.get_or_404(data['item_id'])

    # Cria o registro de adição
    addition = ItemAddition(
        item_id=item.item_id,
        quantity_added=data['quantity_added'],
        purchase_date=datetime.strptime(data['purchase_date'], '%Y-%m-%d').date(),
        received_by=data['received_by'],
        notes=data.get('notes', '')
    )

    # Atualiza a quantidade atual do item
    old_quantity = item.current_quantity
    item.current_quantity += data['quantity_added']
    update_item_status(item)

    # Registra no histórico a nova quantidade
    history = ItemUpdateHistory(
        item_id=item.item_id,
        field_name='current_quantity',
        old_value=str(old_quantity),
        new_value=str(item.current_quantity),
        updated_by=data['received_by']
    )

    db.session.add(addition)
    db.session.add(history)
    db.session.commit()
    return jsonify({'message': 'Stock added successfully'}), 201

# Retira uma quantidade de estoque de um item
@app.route('/api/withdrawals', methods=['POST'])
def withdraw_item_stock():
    data = request.json
    item = Item.query.get_or_404(data['item_id'])

    if item.current_quantity < data['quantity_withdrawn']:
        return jsonify({'error': 'Insufficient stock'}), 400

    # Cria o registro da retirada
    withdrawal = ItemWithdrawal(
        item_id=item.item_id,
        quantity_withdrawn=data['quantity_withdrawn'],
        withdrawal_date=datetime.strptime(data['withdrawal_date'], '%Y-%m-%d').date(),
        withdrawn_by=data['withdrawn_by'],
        department=data['department'],
        notes=data.get('notes', '')
    )

    old_quantity = item.current_quantity
    item.current_quantity -= data['quantity_withdrawn']
    update_item_status(item)

    # Histórico da retirada
    history = ItemUpdateHistory(
        item_id=item.item_id,
        field_name='current_quantity',
        old_value=str(old_quantity),
        new_value=str(item.current_quantity),
        updated_by=data['withdrawn_by']
    )

    db.session.add(withdrawal)
    db.session.add(history)
    db.session.commit()
    return jsonify({'message': 'Stock withdrawn successfully'}), 201

# Gera relatório com todas as transações (adições e retiradas)
@app.route('/api/reports/transactions', methods=['GET'])
def get_transactions():
    item_id = request.args.get('item_id')

    # Se um item específico foi filtrado, retorna apenas ele
    if item_id:
        additions = ItemAddition.query.filter_by(item_id=item_id).all()
        withdrawals = ItemWithdrawal.query.filter_by(item_id=item_id).all()
    else:
        additions = ItemAddition.query.all()
        withdrawals = ItemWithdrawal.query.all()

    transactions = []

    # Concatena todas as adições
    for addition in additions:
        transactions.append({
            'type': 'addition',
            'item_id': addition.item_id,
            'item_name': addition.item.name,
            'quantity': addition.quantity_added,
            'date': addition.purchase_date.strftime('%Y-%m-%d'),
            'person': addition.received_by,
            'notes': addition.notes
        })

    # Concatena todas as retiradas
    for withdrawal in withdrawals:
        transactions.append({
            'type': 'withdrawal',
            'item_id': withdrawal.item_id,
            'item_name': withdrawal.item.name,
            'quantity': withdrawal.quantity_withdrawn,
            'date': withdrawal.withdrawal_date.strftime('%Y-%m-%d'),
            'person': withdrawal.withdrawn_by,
            'department': withdrawal.department,
            'notes': withdrawal.notes
        })

    return jsonify(transactions)

# Gera relatório com os itens que precisam ser comprados
@app.route('/api/reports/purchase-needs', methods=['GET'])
def get_purchase_needs():
    items_to_purchase = Item.query.filter_by(status='COMPRAS').all()
    return jsonify([{
        'item_id': item.item_id,
        'name': item.name,
        'current_quantity': item.current_quantity,
        'min_threshold': item.min_threshold,
        'needed_quantity': item.max_threshold - item.current_quantity
    } for item in items_to_purchase])

# ================== EXECUÇÃO DO SERVIDOR ==================

if __name__ == '__main__':
    # Cria todas as tabelas se ainda não existirem
    with app.app_context():
        db.create_all()

    # Inicia o servidor em modo debug
    app.run(debug=True)
