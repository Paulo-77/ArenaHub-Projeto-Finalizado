
import requests
from config import Config


class ApiFootball:

    URL = "https://v3.football.api-sports.io"

    @staticmethod
    def consultar(endpoint, parametros):

        chave = Config.API_FOOTBALL_KEY

        if not chave:
            raise Exception("Chave da API-Football não encontrada.")

        url = f"{ApiFootball.URL}/{endpoint}"

        headers = {
            "x-apisports-key": chave
        }

        resposta = requests.get(
            url,
            headers=headers,
            params=parametros,
            timeout=20
        )

        resposta.raise_for_status()

        dados = resposta.json()

        if dados.get("errors"):
            raise Exception(str(dados["errors"]))

        return dados

    @staticmethod
    def listar_campeonatos(pais=None, temporada=None):

        parametros = {}

        if pais:
            parametros["country"] = pais

        if temporada:
            parametros["season"] = temporada

        return ApiFootball.consultar("leagues", parametros)

    @staticmethod
    def classificacao(campeonato_id, temporada):

        return ApiFootball.consultar(
            "standings",
            {
                "league": campeonato_id,
                "season": temporada
            }
        )

    @staticmethod
    def partidas(campeonato_id, temporada):

        return ApiFootball.consultar(
            "fixtures",
            {
                "league": campeonato_id,
                "season": temporada
            }
        )

    @staticmethod
    def equipes(campeonato_id, temporada):

        return ApiFootball.consultar(
            "teams",
            {
                "league": campeonato_id,
                "season": temporada
            }
        )

    @staticmethod
    def artilheiros(campeonato_id, temporada):

        return ApiFootball.consultar(
            "players/topscorers",
            {
                "league": campeonato_id,
                "season": temporada
            }
        )
