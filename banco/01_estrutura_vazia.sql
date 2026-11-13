
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS campeonatos (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 nome TEXT NOT NULL,
 temporada TEXT NOT NULL,
 local TEXT,
 data_inicio TEXT,
 data_fim TEXT,
 status TEXT NOT NULL DEFAULT 'planejamento'
   CHECK(status IN ('planejamento','em_andamento','finalizado','cancelado')),
 criado_em TEXT DEFAULT CURRENT_TIMESTAMP,
 CHECK(data_inicio IS NULL OR data_fim IS NULL OR data_fim >= data_inicio)
);

CREATE TABLE IF NOT EXISTS equipes (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 nome TEXT NOT NULL UNIQUE,
 cidade TEXT,
 responsavel TEXT,
 email TEXT,
 escudo_url TEXT,
 criado_em TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS jogadores (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 equipe_id INTEGER NOT NULL,
 nome TEXT NOT NULL,
 numero_camisa INTEGER CHECK(numero_camisa IS NULL OR numero_camisa BETWEEN 1 AND 99),
 posicao TEXT,
 data_nascimento TEXT,
 ativo INTEGER NOT NULL DEFAULT 1 CHECK(ativo IN (0,1)),
 criado_em TEXT DEFAULT CURRENT_TIMESTAMP,
 UNIQUE(equipe_id, numero_camisa),
 FOREIGN KEY(equipe_id) REFERENCES equipes(id) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS grupos (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 campeonato_id INTEGER NOT NULL,
 nome TEXT NOT NULL,
 criado_em TEXT DEFAULT CURRENT_TIMESTAMP,
 UNIQUE(campeonato_id,nome),
 FOREIGN KEY(campeonato_id) REFERENCES campeonatos(id) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS inscricoes (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 campeonato_id INTEGER NOT NULL,
 equipe_id INTEGER NOT NULL,
 grupo_id INTEGER,
 status TEXT NOT NULL DEFAULT 'confirmada'
   CHECK(status IN ('pendente','confirmada','cancelada')),
 data_inscricao TEXT DEFAULT CURRENT_TIMESTAMP,
 UNIQUE(campeonato_id,equipe_id),
 FOREIGN KEY(campeonato_id) REFERENCES campeonatos(id) ON UPDATE CASCADE ON DELETE CASCADE,
 FOREIGN KEY(equipe_id) REFERENCES equipes(id) ON UPDATE CASCADE ON DELETE RESTRICT,
 FOREIGN KEY(grupo_id) REFERENCES grupos(id) ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS partidas (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 campeonato_id INTEGER NOT NULL,
 grupo_id INTEGER,
 fase TEXT NOT NULL DEFAULT 'grupos'
   CHECK(fase IN ('grupos','oitavas','quartas','semifinal','final','terceiro_lugar')),
 rodada INTEGER CHECK(rodada IS NULL OR rodada BETWEEN 0 AND 255),
 equipe_mandante_id INTEGER NOT NULL,
 equipe_visitante_id INTEGER NOT NULL,
 gols_mandante INTEGER CHECK(gols_mandante IS NULL OR gols_mandante BETWEEN 0 AND 255),
 gols_visitante INTEGER CHECK(gols_visitante IS NULL OR gols_visitante BETWEEN 0 AND 255),
 data_hora TEXT,
 local TEXT,
 status TEXT NOT NULL DEFAULT 'agendada'
   CHECK(status IN ('agendada','em_andamento','finalizada','adiada','cancelada')),
 criado_em TEXT DEFAULT CURRENT_TIMESTAMP,
 CHECK(equipe_mandante_id <> equipe_visitante_id),
 CHECK(status <> 'finalizada' OR (gols_mandante IS NOT NULL AND gols_visitante IS NOT NULL)),
 CHECK((fase='grupos' AND grupo_id IS NOT NULL) OR (fase<>'grupos' AND grupo_id IS NULL)),
 FOREIGN KEY(campeonato_id) REFERENCES campeonatos(id) ON UPDATE CASCADE ON DELETE CASCADE,
 FOREIGN KEY(grupo_id) REFERENCES grupos(id) ON UPDATE CASCADE ON DELETE RESTRICT,
 FOREIGN KEY(equipe_mandante_id) REFERENCES equipes(id) ON UPDATE CASCADE ON DELETE RESTRICT,
 FOREIGN KEY(equipe_visitante_id) REFERENCES equipes(id) ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_inscricoes_grupo ON inscricoes(grupo_id);
CREATE INDEX IF NOT EXISTS idx_partidas_campeonato ON partidas(campeonato_id);
CREATE INDEX IF NOT EXISTS idx_partidas_grupo ON partidas(grupo_id);
CREATE INDEX IF NOT EXISTS idx_partidas_data ON partidas(data_hora);

CREATE TRIGGER IF NOT EXISTS trg_inscricao_grupo_bi
BEFORE INSERT ON inscricoes
WHEN NEW.grupo_id IS NOT NULL AND NOT EXISTS (
 SELECT 1 FROM grupos WHERE id=NEW.grupo_id AND campeonato_id=NEW.campeonato_id
)
BEGIN
 SELECT RAISE(ABORT, 'Grupo nao pertence ao campeonato da inscricao.');
END;

CREATE TRIGGER IF NOT EXISTS trg_inscricao_grupo_bu
BEFORE UPDATE ON inscricoes
WHEN NEW.grupo_id IS NOT NULL AND NOT EXISTS (
 SELECT 1 FROM grupos WHERE id=NEW.grupo_id AND campeonato_id=NEW.campeonato_id
)
BEGIN
 SELECT RAISE(ABORT, 'Grupo nao pertence ao campeonato da inscricao.');
END;

CREATE TRIGGER IF NOT EXISTS trg_partida_validar_bi
BEFORE INSERT ON partidas
BEGIN
 SELECT CASE WHEN NOT EXISTS (
  SELECT 1 FROM inscricoes WHERE campeonato_id=NEW.campeonato_id
  AND equipe_id=NEW.equipe_mandante_id AND status='confirmada'
 ) THEN RAISE(ABORT, 'Equipe mandante nao confirmada no campeonato.') END;
 SELECT CASE WHEN NOT EXISTS (
  SELECT 1 FROM inscricoes WHERE campeonato_id=NEW.campeonato_id
  AND equipe_id=NEW.equipe_visitante_id AND status='confirmada'
 ) THEN RAISE(ABORT, 'Equipe visitante nao confirmada no campeonato.') END;
 SELECT CASE WHEN NEW.grupo_id IS NOT NULL AND NOT EXISTS (
  SELECT 1 FROM grupos WHERE id=NEW.grupo_id AND campeonato_id=NEW.campeonato_id
 ) THEN RAISE(ABORT, 'Grupo da partida nao pertence ao campeonato.') END;
 SELECT CASE WHEN NEW.fase='grupos' AND NOT EXISTS (
  SELECT 1 FROM inscricoes a JOIN inscricoes b
  ON a.campeonato_id=b.campeonato_id
  WHERE a.campeonato_id=NEW.campeonato_id
  AND a.equipe_id=NEW.equipe_mandante_id
  AND b.equipe_id=NEW.equipe_visitante_id
  AND a.grupo_id=NEW.grupo_id AND b.grupo_id=NEW.grupo_id
  AND a.status='confirmada' AND b.status='confirmada'
 ) THEN RAISE(ABORT, 'Equipes precisam estar no mesmo grupo.') END;
END;

CREATE TRIGGER IF NOT EXISTS trg_partida_validar_bu
BEFORE UPDATE ON partidas
BEGIN
 SELECT CASE WHEN NOT EXISTS (
  SELECT 1 FROM inscricoes WHERE campeonato_id=NEW.campeonato_id
  AND equipe_id=NEW.equipe_mandante_id AND status='confirmada'
 ) THEN RAISE(ABORT, 'Equipe mandante nao confirmada no campeonato.') END;
 SELECT CASE WHEN NOT EXISTS (
  SELECT 1 FROM inscricoes WHERE campeonato_id=NEW.campeonato_id
  AND equipe_id=NEW.equipe_visitante_id AND status='confirmada'
 ) THEN RAISE(ABORT, 'Equipe visitante nao confirmada no campeonato.') END;
 SELECT CASE WHEN NEW.grupo_id IS NOT NULL AND NOT EXISTS (
  SELECT 1 FROM grupos WHERE id=NEW.grupo_id AND campeonato_id=NEW.campeonato_id
 ) THEN RAISE(ABORT, 'Grupo da partida nao pertence ao campeonato.') END;
 SELECT CASE WHEN NEW.fase='grupos' AND NOT EXISTS (
  SELECT 1 FROM inscricoes a JOIN inscricoes b
  ON a.campeonato_id=b.campeonato_id
  WHERE a.campeonato_id=NEW.campeonato_id
  AND a.equipe_id=NEW.equipe_mandante_id
  AND b.equipe_id=NEW.equipe_visitante_id
  AND a.grupo_id=NEW.grupo_id AND b.grupo_id=NEW.grupo_id
  AND a.status='confirmada' AND b.status='confirmada'
 ) THEN RAISE(ABORT, 'Equipes precisam estar no mesmo grupo.') END;
END;

CREATE VIEW IF NOT EXISTS classificacao_grupos AS
SELECT i.campeonato_id,i.grupo_id,g.nome AS nome_grupo,e.id AS equipe_id,e.nome AS equipe,
 COUNT(p.id) AS jogos,
 SUM(CASE WHEN p.id IS NOT NULL AND p.gols_mandante=p.gols_visitante THEN 1 ELSE 0 END) AS empates,
 SUM(CASE WHEN p.id IS NOT NULL AND ((p.equipe_mandante_id=e.id AND p.gols_mandante>p.gols_visitante) OR (p.equipe_visitante_id=e.id AND p.gols_visitante>p.gols_mandante)) THEN 1 ELSE 0 END) AS vitorias,
 SUM(CASE WHEN p.id IS NOT NULL AND ((p.equipe_mandante_id=e.id AND p.gols_mandante<p.gols_visitante) OR (p.equipe_visitante_id=e.id AND p.gols_visitante<p.gols_mandante)) THEN 1 ELSE 0 END) AS derrotas,
 SUM(CASE WHEN p.id IS NULL THEN 0 WHEN p.equipe_mandante_id=e.id THEN COALESCE(p.gols_mandante,0) ELSE COALESCE(p.gols_visitante,0) END) AS gols_pro,
 SUM(CASE WHEN p.id IS NULL THEN 0 WHEN p.equipe_mandante_id=e.id THEN COALESCE(p.gols_visitante,0) ELSE COALESCE(p.gols_mandante,0) END) AS gols_contra,
 SUM(CASE WHEN p.id IS NULL THEN 0 WHEN p.equipe_mandante_id=e.id THEN COALESCE(p.gols_mandante,0)-COALESCE(p.gols_visitante,0) ELSE COALESCE(p.gols_visitante,0)-COALESCE(p.gols_mandante,0) END) AS saldo_gols,
 SUM(CASE WHEN p.id IS NOT NULL AND p.gols_mandante=p.gols_visitante THEN 1 WHEN p.id IS NOT NULL AND ((p.equipe_mandante_id=e.id AND p.gols_mandante>p.gols_visitante) OR (p.equipe_visitante_id=e.id AND p.gols_visitante>p.gols_mandante)) THEN 3 ELSE 0 END) AS pontos
FROM inscricoes i JOIN equipes e ON e.id=i.equipe_id JOIN grupos g ON g.id=i.grupo_id
LEFT JOIN partidas p ON p.campeonato_id=i.campeonato_id AND p.grupo_id=i.grupo_id
 AND p.fase='grupos' AND p.status='finalizada'
 AND (p.equipe_mandante_id=e.id OR p.equipe_visitante_id=e.id)
WHERE i.status='confirmada' AND i.grupo_id IS NOT NULL
GROUP BY i.campeonato_id,i.grupo_id,g.nome,e.id,e.nome;

CREATE VIEW IF NOT EXISTS partidas_detalhadas AS
SELECT p.id,p.campeonato_id,c.nome AS nome_campeonato,p.grupo_id,g.nome AS nome_grupo,
 p.fase,p.rodada,p.equipe_mandante_id,em.nome AS equipe_mandante,
 p.equipe_visitante_id,ev.nome AS equipe_visitante,p.gols_mandante,p.gols_visitante,
 p.data_hora,p.local,p.status,p.criado_em
FROM partidas p JOIN campeonatos c ON c.id=p.campeonato_id
JOIN equipes em ON em.id=p.equipe_mandante_id
JOIN equipes ev ON ev.id=p.equipe_visitante_id
LEFT JOIN grupos g ON g.id=p.grupo_id;
