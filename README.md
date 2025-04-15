# 📦 Inventário Produtos de Escritorio

Sistema web desenvolvido para **gestão de inventário**, com foco em controle de entradas, saídas, atualizações e monitoramento de itens essenciais utilizados internamente.

---

## 🏢 Sobre o Projeto

Este sistema foi desenvolvido **dentro da Imobiliária Santamérica** com o intuito de **melhorar e facilitar os cadastros de itens**, substituindo o método anterior que era realizado manualmente por **planilhas no Excel**.

A ferramenta visa:

- Aumentar a **eficiência operacional** na gestão de estoque.
- Garantir **mais precisão** nos dados.
- Fornecer **visão em tempo real** dos níveis de estoque.
- Reduzir erros humanos em registros manuais.

---

## ⚙️ Funcionalidades

- **Dashboard** com gráficos de status de estoque e movimentações recentes.
- **Cadastro de novos itens** com definição de limite mínimo e máximo.
- **Registro de adições** ao estoque com responsável e data.
- **Registro de retiradas** com controle de setor e solicitante.
- **Histórico de alterações** de cada item.
- **Relatórios de movimentação e necessidade de compra**.
- Exportação de relatórios para **PDF** e **CSV**.

---

## 🛠️ Tecnologias Utilizadas

**Back-end**:
- Python 3.13
- Flask
- Flask-SQLAlchemy
- MySQL (via SQL Workbench)
- PyMySQL

**Front-end**:
- HTML5
- CSS3
- JavaScript (puro)
- Chart.js (gráficos)
- jsPDF + AutoTable (exportação de relatórios)

---

## 📂 Estrutura de Pastas

<div>📂Inv</div>
<div>├── app/ </div>
<div>│      └── static/ </div>
<div>│         └── style.css # Estilo visual da aplicação </div>
<div>│         └── script.js # Lógica de interação front-end</div>
<div>├── templates/ </div>
<div>│         └── index.html # Interface principal </div>
<div>├── style.css # Estilo visual da aplicação </div>
<div>│         └── script.js # Lógica de interação front-end</div>
<div>├── main.py # Back-end Flask (API e lógica principal) </div>


**Atulizações Futuras**
- Login com autenticação de usuários.
- Controle por departamentos.
- tórios mensais automáticos.
- Integração com sistemas de compras.

## 👨‍💼 Desenvolvido por
Equipe de desenvolvimento interno da Imobiliária Santamérica
