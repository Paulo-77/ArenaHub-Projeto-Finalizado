# ArenaHub — Gestão de Campeonatos de Futebol

O ArenaHub é uma plataforma web para organizar campeonatos de futebol. O sistema permite cadastrar competições, equipes, jogadores, grupos e partidas, acompanhar resultados e consultar classificações.

## Tecnologias

- Python e Flask — backend e rotas da aplicação.
- SQLite — banco de dados local, sem necessidade de XAMPP ou MySQL.
- HTML, CSS e JavaScript — interface e interatividade.
- API-Football — consultas de dados do futebol profissional.
- GitHub — versionamento do projeto.

## Estrutura do projeto

```text
ArenaHub_Projeto/
├── backend/
│   ├── app.py
│   ├── api_football.py
│   ├── config.py
│   ├── daos.py
│   ├── database.py
│   ├── models.py
│   └── requirements.txt
├── banco/
│   └── 01_estrutura_vazia.sql
├── css/
│   └── style.css
├── js/
│   └── app.js
├── index.html
├── .gitignore
└── README.md
```

O arquivo `banco/arenahub.db` é criado automaticamente na primeira execução. Ele guarda os dados cadastrados localmente e não precisa ser criado manualmente.

## Como instalar e executar

### 1. Pré-requisitos

- Python instalado.
- Visual Studio Code (recomendado).

Não é necessário instalar ou iniciar XAMPP, Apache ou MySQL.

### 2. Instalar as dependências

Abra o terminal na pasta `backend` e execute:

```bash
py -m pip install -r requirements.txt
```

### 3. Configurar a API-Football (opcional)

Para usar as consultas de futebol profissional, crie um arquivo chamado `.env` dentro da pasta `backend` com:

```env
API_FOOTBALL_KEY=SUA_CHAVE_AQUI
```

Troque `SUA_CHAVE_AQUI` pela sua chave da API-Football. Não publique nem compartilhe esse arquivo. O restante do ArenaHub pode ser executado sem configurar a chave, mas as consultas profissionais dependem dela.

### 4. Iniciar o sistema

Ainda no terminal da pasta `backend`, execute:

```bash
py app.py
```

### 5. Abrir no navegador

Acesse:

```text
http://127.0.0.1:5000
```

## Banco de dados

O ArenaHub utiliza SQLite. A conexão é feita pelo próprio Python e o banco fica no arquivo `banco/arenahub.db`.

As tabelas são criadas automaticamente a partir de `banco/01_estrutura_vazia.sql`. As principais tabelas são:

- `campeonatos`
- `equipes`
- `jogadores`
- `grupos`
- `inscricoes`
- `partidas`

Também são criadas as views `classificacao_grupos` e `partidas_detalhadas`.

O arquivo `.db` contém os dados cadastrados durante a execução. Faça uma cópia de segurança antes de removê-lo.

## API-Football

A integração consulta dados de campeonatos profissionais, equipes, partidas, classificações e artilheiros. A chave deve ser configurada no `.env`, conforme explicado acima.

Os campeonatos profissionais consultados pela API são separados dos campeonatos cadastrados pelos usuários no ArenaHub.

## Observação sobre o GitHub

O GitHub armazena e versiona os arquivos do projeto. O GitHub Pages pode publicar páginas estáticas, mas não executa o backend Flask nem acessa um banco SQLite local. Para que o professor use o sistema pela internet sem instalar o projeto, será necessário hospedar o backend Flask e o banco de dados em um serviço compatível.

## Desenvolvedores

- Paulo Egidio Pinheiro Torres Junior
- Arthur Guilherme

Colégio UNASP-HT — Técnico em Informática  
Professor orientador: Prof. Leonardo Stephan

**ArenaHub — O jogo começa aqui.**
