class Campeonato:
    def __init__(self, nome, temporada, local=None, data_inicio=None, data_fim=None, status='planejamento'):
        self.nome = nome
        self.temporada = temporada
        self.local = local
        self.data_inicio = data_inicio
        self.data_fim = data_fim
        self.status = status

class Equipe:
    def __init__(self, nome, cidade=None, responsavel=None, email=None, escudo_url=None):
        self.nome = nome
        self.cidade = cidade
        self.responsavel = responsavel
        self.email = email
        self.escudo_url = escudo_url

class Jogador:
    def __init__(self, equipe_id, nome, numero_camisa=None, posicao=None, data_nascimento=None):
        self.equipe_id = equipe_id
        self.nome = nome
        self.numero_camisa = numero_camisa
        self.posicao = posicao
        self.data_nascimento = data_nascimento
