import sqlite3
from pathlib import Path


class Database:
    @staticmethod
    def conectar():
        pasta_projeto = Path(__file__).resolve().parent.parent
        caminho_banco = pasta_projeto / "banco" / "arenahub.db"
        caminho_esquema = pasta_projeto / "banco" / "01_estrutura_vazia.sql"

        caminho_banco.parent.mkdir(parents=True, exist_ok=True)

        conexao = sqlite3.connect(caminho_banco)
        conexao.row_factory = sqlite3.Row
        conexao.execute("PRAGMA foreign_keys = ON")

        with open(caminho_esquema, "r", encoding="utf-8") as arquivo:
            conexao.executescript(arquivo.read())

        return conexao
