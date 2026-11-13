import sqlite3
from pathlib import Path
from flask import Flask, jsonify, request, render_template, send_from_directory
import requests
from config import Config
from database import Database
from models import Campeonato, Equipe, Jogador
from daos import CampeonatoDAO, EquipeDAO, JogadorDAO, CompeticaoDAO, PartidaDAO
from api_football import ApiFootball

PASTA_PROJETO = Path(__file__).resolve().parent.parent

app = Flask(
    __name__,
    template_folder=str(PASTA_PROJETO),
    static_folder=None
)

app.config.from_object(Config)

campeonatos = CampeonatoDAO()
equipes = EquipeDAO()
jogadores = JogadorDAO()
competicao = CompeticaoDAO()
partidas = PartidaDAO()

@app.route('/')
def inicio():
    return render_template('index.html')


@app.route('/css/<path:nome_arquivo>')
def arquivos_css(nome_arquivo):
    return send_from_directory(PASTA_PROJETO / 'css', nome_arquivo)


@app.route('/js/<path:nome_arquivo>')
def arquivos_javascript(nome_arquivo):
    return send_from_directory(PASTA_PROJETO / 'js', nome_arquivo)

@app.route('/api/resumo')
def resumo(): return jsonify(competicao.resumo())

@app.route('/api/campeonatos', methods=['GET','POST'])
def api_campeonatos():
    if request.method=='GET': return jsonify(campeonatos.listar())
    d=request.get_json() or {}
    if not d.get('nome') or not d.get('temporada'): return jsonify({'erro':'Informe nome e temporada.'}),400
    novo=campeonatos.criar(Campeonato(d['nome'],d['temporada'],d.get('local'),d.get('data_inicio') or None,d.get('data_fim') or None,d.get('status','planejamento')))
    return jsonify({'mensagem':'Campeonato cadastrado.','id':novo}),201

@app.route('/api/equipes', methods=['GET','POST'])
def api_equipes():
    if request.method=='GET': return jsonify(equipes.listar())
    d=request.get_json() or {}
    if not d.get('nome'): return jsonify({'erro':'Informe o nome da equipe.'}),400
    novo=equipes.criar(Equipe(d['nome'],d.get('cidade'),d.get('responsavel'),d.get('email'),d.get('escudo_url')))
    return jsonify({'mensagem':'Equipe cadastrada.','id':novo}),201

@app.route('/api/jogadores', methods=['GET','POST'])
def api_jogadores():
    if request.method=='GET': return jsonify(jogadores.listar(request.args.get('equipe_id',type=int)))
    d=request.get_json() or {}
    if not d.get('equipe_id') or not d.get('nome'): return jsonify({'erro':'Informe equipe e nome do jogador.'}),400
    obj=Jogador(d['equipe_id'],d['nome'],d.get('numero_camisa') or None,d.get('posicao'),d.get('data_nascimento') or None)
    novo=jogadores.criar(obj); return jsonify({'mensagem':'Jogador cadastrado.','id':novo}),201

@app.route('/api/grupos', methods=['GET','POST'])
def api_grupos():
    if request.method=='GET':
        cid=request.args.get('campeonato_id',type=int)
        if not cid: return jsonify({'erro':'Informe campeonato_id.'}),400
        return jsonify(competicao.grupos(cid))
    d=request.get_json() or {}
    if not d.get('campeonato_id') or not d.get('nome'): return jsonify({'erro':'Informe campeonato e nome do grupo.'}),400
    novo=competicao.criar_grupo(d['campeonato_id'],d['nome']); return jsonify({'mensagem':'Grupo criado.','id':novo}),201

@app.route('/api/inscricoes',methods=['GET','POST'])
def api_inscricoes():
    if request.method=='GET': return jsonify({'mensagem':'Use o cadastro pelo painel administrativo.'})
    d=request.get_json() or {}
    if not d.get('campeonato_id') or not d.get('equipe_id'): return jsonify({'erro':'Informe campeonato e equipe.'}),400
    novo=competicao.inscrever(d['campeonato_id'],d['equipe_id'],d.get('grupo_id') or None)
    return jsonify({'mensagem':'Equipe inscrita no campeonato.','id':novo}),201

@app.route('/api/partidas',methods=['GET','POST'])
def api_partidas():
    if request.method=='GET': return jsonify(partidas.listar(request.args.get('campeonato_id',type=int)))
    d=request.get_json() or {}
    campos=['campeonato_id','fase','equipe_mandante_id','equipe_visitante_id']
    if any(not d.get(c) for c in campos): return jsonify({'erro':'Preencha campeonato, fase e as duas equipes.'}),400
    if d['equipe_mandante_id']==d['equipe_visitante_id']: return jsonify({'erro':'Uma equipe não pode jogar contra ela mesma.'}),400
    if d['fase']=='grupos' and not d.get('grupo_id'): return jsonify({'erro':'Escolha um grupo para a fase de grupos.'}),400
    if d['fase']!='grupos': d['grupo_id']=None
    novo=partidas.criar(d); return jsonify({'mensagem':'Partida agendada.','id':novo}),201

@app.route('/api/partidas/<int:partida_id>/placar',methods=['PUT'])
def api_placar(partida_id):
    d=request.get_json() or {}
    if d.get('gols_mandante') is None or d.get('gols_visitante') is None: return jsonify({'erro':'Informe os dois placares.'}),400
    if not partidas.atualizar_placar(partida_id,d['gols_mandante'],d['gols_visitante']): return jsonify({'erro':'Partida não encontrada.'}),404
    return jsonify({'mensagem':'Placar atualizado.'})

@app.route('/api/classificacao')
def api_classificacao():
    cid=request.args.get('campeonato_id',type=int); gid=request.args.get('grupo_id',type=int)
    if not cid: return jsonify({'erro':'Informe campeonato_id.'}),400
    return jsonify(competicao.classificacao(cid,gid))

@app.route('/api/profissional/campeonatos')
def campeonatos_profissionais():
    pais = request.args.get('pais')
    temporada = request.args.get('temporada', type=int)

    try:
        dados = ApiFootball.listar_campeonatos(pais, temporada)
        return jsonify(dados)

    except requests.RequestException as erro:
        return jsonify({'erro': 'Falha na comunicação com a API-Football.', 'detalhes': str(erro)}), 502

    except Exception as erro:
        return jsonify({'erro': str(erro)}), 500

@app.route('/api/profissional/classificacao')
def classificacao_profissional():
    campeonato_id = request.args.get('campeonato_id', type=int)
    temporada = request.args.get('temporada', type=int)

    if not campeonato_id or not temporada:
        return jsonify({'erro': 'Informe campeonato e temporada.'}), 400

    try:
        dados = ApiFootball.classificacao(campeonato_id, temporada)
        return jsonify(dados)
    except requests.RequestException as erro:
        return jsonify({'erro': str(erro)}), 502
    except Exception as erro:
        return jsonify({'erro': str(erro)}), 500


@app.route('/api/profissional/partidas')
def partidas_profissionais():
    campeonato_id = request.args.get('campeonato_id', type=int)
    temporada = request.args.get('temporada', type=int)

    if not campeonato_id or not temporada:
        return jsonify({'erro': 'Informe campeonato e temporada.'}), 400

    try:
        dados = ApiFootball.partidas(campeonato_id, temporada)
        return jsonify(dados)
    except requests.RequestException as erro:
        return jsonify({'erro': str(erro)}), 502
    except Exception as erro:
        return jsonify({'erro': str(erro)}), 500


@app.route('/api/profissional/equipes')
def equipes_profissionais():
    campeonato_id = request.args.get('campeonato_id', type=int)
    temporada = request.args.get('temporada', type=int)

    if not campeonato_id or not temporada:
        return jsonify({'erro': 'Informe campeonato e temporada.'}), 400

    try:
        dados = ApiFootball.equipes(campeonato_id, temporada)
        return jsonify(dados)
    except requests.RequestException as erro:
        return jsonify({'erro': str(erro)}), 502
    except Exception as erro:
        return jsonify({'erro': str(erro)}), 500


@app.route('/api/profissional/artilheiros')
def artilheiros_profissionais():
    campeonato_id = request.args.get('campeonato_id', type=int)
    temporada = request.args.get('temporada', type=int)

    if not campeonato_id or not temporada:
        return jsonify({'erro': 'Informe campeonato e temporada.'}), 400

    try:
        dados = ApiFootball.artilheiros(campeonato_id, temporada)
        return jsonify(dados)
    except requests.RequestException as erro:
        return jsonify({'erro': str(erro)}), 502
    except Exception as erro:
        return jsonify({'erro': str(erro)}), 500

@app.errorhandler(sqlite3.Error)
def erro_banco(erro):
    return jsonify({'erro': str(erro)}), 400

if __name__=='__main__': app.run(debug=True,port=5000)
