from database import Database


def executar_consulta(sql, parametros=()):
    conexao = Database.conectar()
    try:
        cursor = conexao.cursor()
        cursor.execute(sql, parametros)
        return [dict(linha) for linha in cursor.fetchall()]
    finally:
        conexao.close()


class CampeonatoDAO:
    def listar(self):
        return executar_consulta(
            "SELECT * FROM campeonatos ORDER BY id DESC"
        )

    def criar(self, campeonato):
        conexao = Database.conectar()
        try:
            cursor = conexao.cursor()
            cursor.execute(
                """INSERT INTO campeonatos
                (nome, temporada, local, data_inicio, data_fim, status)
                VALUES (?, ?, ?, ?, ?, ?)""",
                (campeonato.nome, campeonato.temporada, campeonato.local,
                 campeonato.data_inicio, campeonato.data_fim, campeonato.status)
            )
            conexao.commit()
            return cursor.lastrowid
        finally:
            conexao.close()


class EquipeDAO:
    def listar(self):
        return executar_consulta(
            """SELECT e.*, COUNT(j.id) AS total_jogadores
            FROM equipes e
            LEFT JOIN jogadores j
                ON j.equipe_id = e.id AND j.ativo = 1
            GROUP BY e.id
            ORDER BY e.nome"""
        )

    def criar(self, equipe):
        conexao = Database.conectar()
        try:
            cursor = conexao.cursor()
            cursor.execute(
                """INSERT INTO equipes
                (nome, cidade, responsavel, email, escudo_url)
                VALUES (?, ?, ?, ?, ?)""",
                (equipe.nome, equipe.cidade, equipe.responsavel,
                 equipe.email, equipe.escudo_url)
            )
            conexao.commit()
            return cursor.lastrowid
        finally:
            conexao.close()


class JogadorDAO:
    def listar(self, equipe_id=None):
        sql = """SELECT j.*, e.nome AS equipe
                 FROM jogadores j
                 JOIN equipes e ON e.id = j.equipe_id"""
        parametros = ()

        if equipe_id:
            sql += " WHERE j.equipe_id = ? ORDER BY j.nome"
            parametros = (equipe_id,)
        else:
            sql += " ORDER BY e.nome, j.nome"

        return executar_consulta(sql, parametros)

    def criar(self, jogador):
        conexao = Database.conectar()
        try:
            cursor = conexao.cursor()
            cursor.execute(
                """INSERT INTO jogadores
                (equipe_id, nome, numero_camisa, posicao, data_nascimento)
                VALUES (?, ?, ?, ?, ?)""",
                (jogador.equipe_id, jogador.nome, jogador.numero_camisa,
                 jogador.posicao, jogador.data_nascimento)
            )
            conexao.commit()
            return cursor.lastrowid
        finally:
            conexao.close()


class CompeticaoDAO:
    def resumo(self):
        consultas = {
            "campeonatos": "SELECT COUNT(*) AS total FROM campeonatos",
            "equipes": "SELECT COUNT(*) AS total FROM equipes",
            "jogadores": "SELECT COUNT(*) AS total FROM jogadores WHERE ativo = 1",
            "partidas_finalizadas": "SELECT COUNT(*) AS total FROM partidas WHERE status = 'finalizada'"
        }

        resultado = {}
        conexao = Database.conectar()
        try:
            cursor = conexao.cursor()
            for chave, sql in consultas.items():
                cursor.execute(sql)
                resultado[chave] = cursor.fetchone()["total"]
            return resultado
        finally:
            conexao.close()

    def grupos(self, campeonato_id):
        return executar_consulta(
            "SELECT * FROM grupos WHERE campeonato_id = ? ORDER BY nome",
            (campeonato_id,)
        )

    def criar_grupo(self, campeonato_id, nome):
        conexao = Database.conectar()
        try:
            cursor = conexao.cursor()
            cursor.execute(
                "INSERT INTO grupos (campeonato_id, nome) VALUES (?, ?)",
                (campeonato_id, nome)
            )
            conexao.commit()
            return cursor.lastrowid
        finally:
            conexao.close()

    def inscrever(self, campeonato_id, equipe_id, grupo_id=None):
        conexao = Database.conectar()
        try:
            cursor = conexao.cursor()
            cursor.execute(
                """SELECT id FROM inscricoes
                WHERE campeonato_id = ? AND equipe_id = ?""",
                (campeonato_id, equipe_id)
            )
            inscricao = cursor.fetchone()

            if inscricao:
                inscricao_id = inscricao["id"]
                cursor.execute(
                    """UPDATE inscricoes
                    SET grupo_id = ?, status = 'confirmada'
                    WHERE id = ?""",
                    (grupo_id, inscricao_id)
                )
            else:
                cursor.execute(
                    """INSERT INTO inscricoes
                    (campeonato_id, equipe_id, grupo_id, status)
                    VALUES (?, ?, ?, 'confirmada')""",
                    (campeonato_id, equipe_id, grupo_id)
                )
                inscricao_id = cursor.lastrowid

            conexao.commit()
            return inscricao_id
        finally:
            conexao.close()

    def classificacao(self, campeonato_id, grupo_id=None):
        sql = "SELECT * FROM classificacao_grupos WHERE campeonato_id = ?"
        parametros = [campeonato_id]

        if grupo_id:
            sql += " AND grupo_id = ?"
            parametros.append(grupo_id)

        sql += " ORDER BY pontos DESC, saldo_gols DESC, gols_pro DESC, equipe ASC"
        return executar_consulta(sql, tuple(parametros))


class PartidaDAO:
    def listar(self, campeonato_id=None):
        sql = "SELECT * FROM partidas_detalhadas"
        parametros = ()

        if campeonato_id:
            sql += " WHERE campeonato_id = ?"
            parametros = (campeonato_id,)

        sql += " ORDER BY data_hora, id"
        return executar_consulta(sql, parametros)

    def criar(self, dados):
        conexao = Database.conectar()
        try:
            cursor = conexao.cursor()
            cursor.execute(
                """INSERT INTO partidas
                (campeonato_id, grupo_id, fase, rodada, equipe_mandante_id,
                 equipe_visitante_id, data_hora, local, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'agendada')""",
                (dados["campeonato_id"], dados.get("grupo_id"), dados["fase"],
                 dados.get("rodada"), dados["equipe_mandante_id"],
                 dados["equipe_visitante_id"], dados.get("data_hora"),
                 dados.get("local"))
            )
            conexao.commit()
            return cursor.lastrowid
        finally:
            conexao.close()

    def atualizar_placar(self, partida_id, gols_casa, gols_fora):
        conexao = Database.conectar()
        try:
            cursor = conexao.cursor()
            cursor.execute(
                """UPDATE partidas
                SET gols_mandante = ?, gols_visitante = ?, status = 'finalizada'
                WHERE id = ?""",
                (gols_casa, gols_fora, partida_id)
            )
            conexao.commit()
            return cursor.rowcount > 0
        finally:
            conexao.close()
