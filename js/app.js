const API = '/api';

let campeonatos = [];
let equipes = [];
let partidas = [];
let filtroStatus = 'todas';

let campeonatoProfissionalAtual = null;
const cacheProfissional = {};

async function api(url, op = {}) {
    const r = await fetch(API + url, {
        headers: { 'Content-Type': 'application/json' },
        ...op
    });

    const d = await r.json();

    if (!r.ok) {
        throw new Error(d.erro || 'Erro na operação.');
    }

    return d;
}

function toast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3000);
}

function br(d) {
    if (!d) return 'Data a definir';

    const s = String(d).slice(0, 10).split('-');

    return s.length === 3
        ? `${s[2]}/${s[1]}/${s[0]}`
        : d;
}

function iniciais(n) {
    return (n || '?')
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map(x => x[0])
        .join('')
        .toUpperCase();
}

function escapar(valor) {
    return String(valor ?? '').replace(/[&<>"']/g, caractere => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[caractere]);
}

function tela(nome) {
    document.querySelectorAll('.view').forEach(x => {
        x.classList.remove('active');
    });

    document.getElementById('view-' + nome).classList.add('active');

    document.querySelectorAll('.nav-link').forEach(x => {
        x.classList.toggle('active', x.dataset.section === nome);
    });

    document.querySelector('.main-nav').classList.remove('open');

    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (nome === 'partidas') renderPartidas();
    if (nome === 'classificacao') classificacao();
}

document.querySelectorAll('[data-section]').forEach(x => {
    x.onclick = () => tela(x.dataset.section);
});

document.querySelectorAll('[data-go]').forEach(x => {
    x.onclick = () => tela(x.dataset.go);
});

document.getElementById('abrir-admin').onclick = () => tela('admin');

document.getElementById('menu-mobile').onclick = () => {
    document.querySelector('.main-nav').classList.toggle('open');
};

function placar(p) {
    return p.gols_mandante === null || p.gols_visitante === null
        ? 'VS'
        : `${p.gols_mandante} : ${p.gols_visitante}`;
}

function cardPartida(p) {
    return `
        <article class="match-card">
            <div class="match-meta">
                <span>${escapar(p.nome_campeonato || 'ArenaHub')}</span>
                <span>${br(p.data_hora)}</span>
            </div>

            <div class="match-teams">
                <div class="match-team">
                    <div class="team-badge">${iniciais(p.equipe_mandante)}</div>
                    ${escapar(p.equipe_mandante)}
                </div>

                <div class="match-score">${placar(p)}</div>

                <div class="match-team">
                    <div class="team-badge">${iniciais(p.equipe_visitante)}</div>
                    ${escapar(p.equipe_visitante)}
                </div>
            </div>

            <div class="match-meta">
                <span>${escapar(p.nome_grupo || p.fase)}</span>
                <span class="match-status">
                    ${p.status === 'finalizada' ? '● Finalizada' : escapar(p.status)}
                </span>
            </div>
        </article>
    `;
}

function cardCamp(c) {
    return `
        <article class="tournament-card">
            <div>
                <div class="match-meta">
                    <span>${escapar(c.temporada)}</span>
                    <span class="status-tag">${escapar(c.status.replace('_', ' '))}</span>
                </div>

                <h3>${escapar(c.nome)}</h3>

                <p>
                    ${escapar(c.local || 'Local a definir')}
                    ${c.data_inicio ? ' • ' + br(c.data_inicio) : ''}
                </p>
            </div>

            <div class="tournament-bottom">
                <span>COMPETIÇÃO ARENAHUB</span>
                <span class="arrow-link">↗</span>
            </div>
        </article>
    `;
}

async function carregar() {
    try {
        const [r, p, c] = await Promise.all([
            api('/resumo'),
            api('/partidas'),
            api('/campeonatos')
        ]);

        partidas = p;
        campeonatos = c;

        document.getElementById('stat-campeonatos').textContent = r.campeonatos;
        document.getElementById('stat-equipes').textContent = r.equipes;
        document.getElementById('stat-jogadores').textContent = r.jogadores;
        document.getElementById('stat-partidas').textContent = r.partidas_finalizadas;

        const recentes = [...p]
            .sort((a, b) => String(b.data_hora || '').localeCompare(String(a.data_hora || '')))
            .slice(0, 3);

        document.getElementById('home-partidas').innerHTML =
            recentes.length
                ? recentes.map(cardPartida).join('')
                : '<div class="loading-card">Nenhuma partida cadastrada.</div>';

        document.getElementById('home-campeonatos').innerHTML =
            c.slice(0, 3).map(cardCamp).join('') ||
            '<div class="loading-card">Nenhum campeonato cadastrado.</div>';

        document.getElementById('lista-campeonatos').innerHTML =
            c.map(cardCamp).join('') ||
            '<div class="loading-card">Nenhum campeonato cadastrado.</div>';

        preencherSelects();
        await carregarEquipes();
        await preencherPartidasAdmin();

    } catch (e) {
        toast('Falha ao carregar dados. Confira MySQL e Flask. ' + e.message);
    }
}

function preencherSelects() {
    const opts = campeonatos.map(c =>
        `<option value="${c.id}">${escapar(c.nome)}</option>`
    ).join('');

    document.getElementById('filtro-partidas').innerHTML =
        '<option value="">Todos os campeonatos</option>' + opts;

    document.getElementById('filtro-classificacao').innerHTML =
        opts || '<option value="">Sem campeonatos</option>';

    ['grupo-campeonato', 'inscricao-campeonato', 'partida-campeonato'].forEach(id => {
        document.getElementById(id).innerHTML =
            '<option value="">Escolha um campeonato</option>' + opts;
    });
}

async function carregarEquipes() {
    equipes = await api('/equipes');

    document.getElementById('lista-equipes').innerHTML =
        equipes.map(e => `
            <article class="team-card">
                <div class="team-badge">${iniciais(e.nome)}</div>
                <h3>${escapar(e.nome)}</h3>
                <p>
                    ${escapar(e.cidade || 'Cidade não informada')}
                    • ${e.total_jogadores} jogadores
                </p>
            </article>
        `).join('') || '<div class="loading-card">Nenhuma equipe cadastrada.</div>';

    ['jogador-equipe', 'inscricao-equipe', 'partida-mandante', 'partida-visitante'].forEach(id => {
        const s = document.getElementById(id);
        const first = s.options[0].outerHTML;

        s.innerHTML = first + equipes.map(e =>
            `<option value="${e.id}">${escapar(e.nome)}</option>`
        ).join('');
    });
}

async function gruposAdmin() {
    const id =
        document.getElementById('partida-campeonato').value ||
        document.getElementById('inscricao-campeonato').value ||
        document.getElementById('grupo-campeonato').value ||
        document.getElementById('filtro-classificacao').value;

    if (!id) return;

    try {
        const g = await api('/grupos?campeonato_id=' + id);

        const opts = g.map(x =>
            `<option value="${x.id}">${escapar(x.nome)}</option>`
        ).join('');

        document.getElementById('inscricao-grupo').innerHTML =
            '<option value="">Sem grupo</option>' + opts;

        document.getElementById('partida-grupo').innerHTML =
            '<option value="">Escolha o grupo</option>' + opts;

        document.getElementById('filtro-grupo').innerHTML =
            '<option value="">Todos os grupos</option>' + opts;

    } catch (e) {
        console.log(e);
    }
}

async function classificacao() {
    const id = document.getElementById('filtro-classificacao').value;

    if (!id) return;

    try {
        const gid = document.getElementById('filtro-grupo').value;
                let url = `/classificacao?campeonato_id=${id}`;

        if (gid) url += '&grupo_id=' + gid;

        const dados = await api(url);

        document.getElementById('tabela-classificacao').innerHTML =
            dados.length
                ? dados.map((x, i) => `
                    <tr>
                        <td>${String(i + 1).padStart(2, '0')}</td>
                        <td><b>${escapar(x.equipe)}</b></td>
                        <td>${x.jogos}</td>
                        <td>${x.vitorias}</td>
                        <td>${x.empates}</td>
                        <td>${x.derrotas}</td>
                        <td>${x.saldo_gols}</td>
                        <td>${x.pontos}</td>
                    </tr>
                `).join('')
                : '<tr><td colspan="8">Sem dados de classificação.</td></tr>';

    } catch (e) {
        toast(e.message);
    }
}

function renderPartidas() {
    const cid = document.getElementById('filtro-partidas').value;

    let dados = partidas.filter(p =>
        !cid || String(p.campeonato_id) === cid
    );

    if (filtroStatus !== 'todas') {
        dados = dados.filter(p => p.status === filtroStatus);
    }

    document.getElementById('lista-partidas').innerHTML =
        dados.length
            ? dados.map(p => `
                <article class="match-row">
                    <div class="match-row-meta">
                        ${escapar(p.nome_campeonato)}<br>
                        ${escapar(p.nome_grupo || p.fase)}<br>
                        ${br(p.data_hora)}
                    </div>

                    <div class="match-row-teams">
                        <span>${escapar(p.equipe_mandante)}</span>
                        <b class="match-row-score">${placar(p)}</b>
                        <span>${escapar(p.equipe_visitante)}</span>
                    </div>

                    <div class="match-status">${escapar(p.status.replace('_', ' '))}</div>
                </article>
            `).join('')
            : '<div class="loading-card">Nenhuma partida encontrada.</div>';
}

document.getElementById('filtro-partidas').onchange = renderPartidas;

document.getElementById('filtro-classificacao').onchange = () => {
    gruposAdmin().then(classificacao);
};

document.getElementById('filtro-grupo').onchange = classificacao;

document.querySelectorAll('.filter-pill[data-filter]').forEach(b => {
    b.onclick = () => {
        document.querySelectorAll('.filter-pill[data-filter]').forEach(x => {
            x.classList.remove('active');
        });

        b.classList.add('active');
        filtroStatus = b.dataset.filter;

        renderPartidas();
    };
});

['grupo-campeonato', 'inscricao-campeonato', 'partida-campeonato'].forEach(id => {
    document.getElementById(id).onchange = gruposAdmin;
});

document.querySelector('#form-partida [name=fase]').onchange = e => {
    const s = document.getElementById('partida-grupo');

    s.disabled = e.target.value !== 'grupos';

    if (s.disabled) s.value = '';
};

function form(id, url, converter = x => Object.fromEntries(x.entries())) {
    document.getElementById(id).addEventListener('submit', async e => {
        e.preventDefault();

        const formulario = e.currentTarget;
        const botao = formulario.querySelector('[type="submit"]');

        if (botao && botao.disabled) return;
        if (botao) botao.disabled = true;

        try {
            const dados = converter(new FormData(formulario));

            const r = await api(url, {
                method: 'POST',
                body: JSON.stringify(dados)
            });

            toast(r.mensagem);
            formulario.reset();

            await carregar();

        } catch (err) {
            toast(err.message);
        } finally {
            if (botao) botao.disabled = false;
        }
    });
}

form('form-equipe', '/equipes');

form('form-campeonato', '/campeonatos');

form('form-jogador', '/jogadores', f => {
    const d = Object.fromEntries(f.entries());

    d.equipe_id = Number(d.equipe_id);
    d.numero_camisa = d.numero_camisa ? Number(d.numero_camisa) : null;

    return d;
});

form('form-grupo', '/grupos', f => {
    const d = Object.fromEntries(f.entries());

    d.campeonato_id = Number(d.campeonato_id);

    return d;
});

form('form-inscricao', '/inscricoes', f => {
    const d = Object.fromEntries(f.entries());

    d.campeonato_id = Number(d.campeonato_id);
    d.equipe_id = Number(d.equipe_id);
    d.grupo_id = d.grupo_id ? Number(d.grupo_id) : null;

    return d;
});

form('form-partida', '/partidas', f => {
    const d = Object.fromEntries(f.entries());

    ['campeonato_id', 'equipe_mandante_id', 'equipe_visitante_id', 'grupo_id'].forEach(k => {
        d[k] = d[k] ? Number(d[k]) : null;
    });

    d.data_hora = d.data_hora
        ? d.data_hora.replace('T', ' ') + ':00'
        : null;

    if (d.fase !== 'grupos') d.grupo_id = null;

    return d;
});

document.getElementById('form-placar').addEventListener('submit', async e => {
    e.preventDefault();

    const formulario = e.currentTarget;
    const botao = formulario.querySelector('[type="submit"]');

    if (botao && botao.disabled) return;
    if (botao) botao.disabled = true;

    const f = new FormData(formulario);
    const id = f.get('partida_id');

    try {
        const d = {
            gols_mandante: Number(f.get('gols_mandante')),
            gols_visitante: Number(f.get('gols_visitante'))
        };

        const r = await api(`/partidas/${id}/placar`, {
            method: 'PUT',
            body: JSON.stringify(d)
        });

        toast(r.mensagem);
        formulario.reset();

        await carregar();

    } catch (err) {
        toast(err.message);
    } finally {
        if (botao) botao.disabled = false;
    }
});

async function preencherPartidasAdmin() {
    const s = document.getElementById('placar-partida');

    s.innerHTML =
        '<option value="">Escolha uma partida</option>' +
        partidas.map(p => `
            <option value="${p.id}">
                ${escapar(p.equipe_mandante)} x ${escapar(p.equipe_visitante)} — ${escapar(p.status)}
            </option>
        `).join('');
}


// =====================================
// FUTEBOL PROFISSIONAL
// =====================================

async function carregarCampeonatosProfissionais() {
    const pais = document.getElementById('profissional-pais').value;
    const temporada = document.getElementById('profissional-temporada').value;
    const lista = document.getElementById('lista-profissional');

    lista.innerHTML = '<div class="loading-card">Buscando campeonatos...</div>';

    try {
        const dados = await api(
            `/profissional/campeonatos?pais=${encodeURIComponent(pais)}&temporada=${temporada}`
        );

        if (!dados.response || dados.response.length === 0) {
            lista.innerHTML = '<div class="loading-card">Nenhum campeonato encontrado.</div>';
            return;
        }

        lista.innerHTML = dados.response.map(item => {
            const campeonato = item.league;
            const paisInfo = item.country;

            return `
                <article class="tournament-card profissional-card"
                    data-profissional-id="${campeonato.id}"
                    data-profissional-nome="${escapar(campeonato.name)}"
                    data-profissional-pais="${escapar(paisInfo.name)}"
                    data-profissional-temporada="${temporada}"
                    data-profissional-logo="${escapar(campeonato.logo)}"
                    style="cursor:pointer;">

                    <div>
                        <div class="match-meta">
                            <span>${escapar(paisInfo.name)}</span>
                            <span class="status-tag">${temporada}</span>
                        </div>

                        <div style="display:flex;align-items:center;gap:15px;margin:20px 0;">
                            <img
                                src="${escapar(campeonato.logo)}"
                                alt="Escudo de ${escapar(campeonato.name)}"
                                style="width:55px;height:55px;object-fit:contain;"
                            >

                            <h3>${escapar(campeonato.name)}</h3>
                        </div>

                        <p>Competição profissional • ${escapar(paisInfo.name)}</p>
                    </div>

                    <div class="tournament-bottom">
                        <span>VER DETALHES DO CAMPEONATO</span>
                        <span class="arrow-link">↗</span>
                    </div>
                </article>
            `;
        }).join('');
            } catch (erro) {
        lista.innerHTML = '<div class="loading-card">Não foi possível carregar os campeonatos.</div>';
        toast(erro.message);
    }
}

document.getElementById('buscar-profissional').addEventListener(
    'click',
    carregarCampeonatosProfissionais
);


// Abre a página do campeonato clicado
document.getElementById('lista-profissional').addEventListener('click', e => {
    const card = e.target.closest('.profissional-card');

    if (!card) return;

    abrirCampeonatoProfissional({
        id: Number(card.dataset.profissionalId),
        nome: card.dataset.profissionalNome,
        pais: card.dataset.profissionalPais,
        temporada: Number(card.dataset.profissionalTemporada),
        logo: card.dataset.profissionalLogo
    });
});

function abrirCampeonatoProfissional(campeonato) {
    campeonatoProfissionalAtual = campeonato;

    document.getElementById('detalhe-pais').textContent =
        campeonato.pais.toUpperCase();

    document.getElementById('detalhe-nome').textContent =
        campeonato.nome.toUpperCase() + '.';

    document.getElementById('detalhe-temporada').textContent =
        'Temporada ' + campeonato.temporada;

    document.getElementById('detalhe-logo').src = campeonato.logo;

    document.querySelectorAll('[data-detalhe]').forEach(botao => {
        botao.classList.toggle(
            'active',
            botao.dataset.detalhe === 'classificacao'
        );
    });

    tela('detalhes-profissional');

    carregarDetalheProfissional('classificacao');
}


// Voltar para a lista de campeonatos
document.getElementById('voltar-profissional').onclick = () => {
    tela('profissional');
};


// Carrega apenas a aba selecionada
document.querySelectorAll('[data-detalhe]').forEach(botao => {
    botao.addEventListener('click', () => {
        document.querySelectorAll('[data-detalhe]').forEach(x => {
            x.classList.remove('active');
        });

        botao.classList.add('active');

        carregarDetalheProfissional(botao.dataset.detalhe);
    });
});

async function carregarDetalheProfissional(tipo) {
    if (!campeonatoProfissionalAtual) return;

    const campeonato = campeonatoProfissionalAtual;

    const chave = `${campeonato.id}-${campeonato.temporada}-${tipo}`;

    const conteudo = document.getElementById('conteudo-detalhe-profissional');

    if (cacheProfissional[chave]) {
        mostrarDetalhe(tipo, cacheProfissional[chave]);
        return;
    }

    conteudo.innerHTML =
        '<div class="loading-card">Carregando informações do campeonato...</div>';

    const rotas = {
        classificacao: 'classificacao',
        partidas: 'partidas',
        equipes: 'equipes',
        artilheiros: 'artilheiros'
    };

    try {
        const dados = await api(
            `/profissional/${rotas[tipo]}?campeonato_id=${campeonato.id}&temporada=${campeonato.temporada}`
        );

        cacheProfissional[chave] = dados;

        mostrarDetalhe(tipo, dados);

    } catch (erro) {
        conteudo.innerHTML =
            '<div class="loading-card">Não foi possível carregar essas informações.</div>';

        toast(erro.message);
    }
}


// Mostra os dados recebidos da API
function mostrarDetalhe(tipo, dados) {
    if (tipo === 'classificacao') mostrarClassificacaoProfissional(dados);
    if (tipo === 'partidas') mostrarPartidasProfissionais(dados);
    if (tipo === 'equipes') mostrarEquipesProfissionais(dados);
    if (tipo === 'artilheiros') mostrarArtilheirosProfissionais(dados);
}


// Classificação profissional
function mostrarClassificacaoProfissional(dados) {
    const conteudo = document.getElementById('conteudo-detalhe-profissional');
    const grupos = dados.response?.[0]?.league?.standings || [];

    if (!grupos.length || !grupos.some(grupo => grupo.length)) {
        conteudo.innerHTML =
            '<div class="loading-card">Classificação não disponível para este campeonato.</div>';
        return;
    }

    function classePosicao(time) {
        const descricao = (time.description || '').toLowerCase();

        if (descricao.includes('relegation')) return 'posicao-rebaixamento';
        if (descricao.includes('champions league')) return 'posicao-champions';
        if (descricao.includes('europa league')) return 'posicao-europa';
        if (descricao.includes('conference league')) return 'posicao-conference';

        return '';
    }

    const legenda = [
        ['posicao-champions', 'Champions League'],
        ['posicao-europa', 'Europa League'],
        ['posicao-conference', 'Conference League'],
        ['posicao-rebaixamento', 'Rebaixamento']
    ].filter(([classe]) =>
        grupos.flat().some(time => classePosicao(time) === classe)
    );

    conteudo.innerHTML = `
        <h2>CLASSIFICAÇÃO <em>OFICIAL</em></h2>

        ${legenda.length ? `
            <div class="legenda-classificacao">
                ${legenda.map(([classe, nome]) => `
                    <span class="legenda-item">
                        <i class="${classe}"></i>
                        ${nome}
                    </span>
                `).join('')}
            </div>
        ` : ''}

        ${grupos.map((grupo, indice) => `
            <div class="table-wrap tabela-profissional">
                ${grupos.length > 1 ? `<h3 class="titulo-grupo">GRUPO ${String.fromCharCode(65 + indice)}</h3>` : ''}

                <table>
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>EQUIPE</th>
                            <th>J</th>
                            <th>V</th>
                            <th>E</th>
                            <th>D</th>
                            <th>SG</th>
                            <th>PTS</th>
                        </tr>
                    </thead>

                    <tbody>
                        ${grupo.map(time => `
                            <tr class="${classePosicao(time)}">
                                <td>${time.rank}</td>
                                <td>
                                    <div class="equipe-classificacao">
                                        <img src="${escapar(time.team.logo)}"
                                             alt=""
                                             style="width:25px;height:25px;object-fit:contain;">
                                        <b>${escapar(time.team.name)}</b>
                                    </div>
                                </td>
                                <td>${time.all.played}</td>
                                <td>${time.all.win}</td>
                                <td>${time.all.draw}</td>
                                <td>${time.all.lose}</td>
                                <td>${time.goalsDiff}</td>
                                <td>${time.points}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `).join('')}
    `;
}


// Partidas profissionais

// Partidas profissionais
function mostrarPartidasProfissionais(dados) {
    const conteudo = document.getElementById('conteudo-detalhe-profissional');
    const jogos = dados.response || [];

    if (!jogos.length) {
        conteudo.innerHTML =
            '<div class="loading-card">Nenhuma partida encontrada.</div>';
        return;
    }

    const finalizados = ['FT', 'AET', 'PEN'];
    const agendados = ['NS', 'TBD'];
    const cancelados = ['PST', 'CANC', 'ABD', 'AWD', 'WO'];

    const grupos = {
        andamento: [],
        agendados: [],
        finalizados: [],
        outros: []
    };

    jogos.forEach(jogo => {
        const status = jogo.fixture.status.short;

        if (finalizados.includes(status)) {
            grupos.finalizados.push(jogo);
        } else if (agendados.includes(status)) {
            grupos.agendados.push(jogo);
        } else if (cancelados.includes(status)) {
            grupos.outros.push(jogo);
        } else {
            grupos.andamento.push(jogo);
        }
    });

    function dataHorario(data) {
        const dataJogo = new Date(data);

        if (isNaN(dataJogo.getTime())) return 'Data a definir';

        return dataJogo.toLocaleString('pt-BR', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    function cardJogo(jogo, tipo) {
        const status = jogo.fixture.status.short;
        const finalizado = finalizados.includes(status);
        const aoVivo = tipo === 'andamento';

        const golsCasa = jogo.goals.home;
        const golsFora = jogo.goals.away;

        const placarCasa = golsCasa ?? '-';
        const placarFora = golsFora ?? '-';

        let etiqueta = 'AGENDADA';
                if (finalizado) etiqueta = 'FINALIZADA';
        if (aoVivo) etiqueta = 'EM ANDAMENTO';
        if (cancelados.includes(status)) etiqueta = jogo.fixture.status.long;

        return `
            <article class="profissional-match-card ${aoVivo ? 'partida-ao-vivo' : ''}">
                <div class="profissional-match-header">
                    <span>${dataHorario(jogo.fixture.date)}</span>
                    <span class="partida-status">${escapar(etiqueta)}</span>
                </div>

                <div class="profissional-match-body">
                    <div class="profissional-match-team">
                        <img src="${escapar(jogo.teams.home.logo)}" alt="">
                        <b>${escapar(jogo.teams.home.name)}</b>
                    </div>

                    <div class="profissional-match-score">
                        <strong>${placarCasa}</strong>
                        <span>:</span>
                        <strong>${placarFora}</strong>
                    </div>

                    <div class="profissional-match-team">
                        <img src="${escapar(jogo.teams.away.logo)}" alt="">
                        <b>${escapar(jogo.teams.away.name)}</b>
                    </div>
                </div>

                <div class="profissional-match-footer">
                    <span>${escapar(jogo.league.round || 'Campeonato')}</span>
                    <span>${escapar(jogo.fixture.venue?.name || 'Local não informado')}</span>
                </div>
            </article>
        `;
    }

    function secaoJogos(titulo, lista, tipo, mensagem) {
        if (!lista.length) return '';

        return `
            <section class="profissional-match-section">
                <div class="profissional-match-title">
                    <h3>${titulo}</h3>
                    <span>${lista.length} ${lista.length === 1 ? 'JOGO' : 'JOGOS'}</span>
                </div>

                <div class="profissional-match-grid">
                    ${lista.map(jogo => cardJogo(jogo, tipo)).join('')}
                </div>
            </section>
        `;
    }

    conteudo.innerHTML = `
        <h2>PARTIDAS <em>DO CAMPEONATO</em></h2>

        ${secaoJogos('EM ANDAMENTO', grupos.andamento, 'andamento')}
        ${secaoJogos('PRÓXIMOS JOGOS', grupos.agendados, 'agendados')}
        ${secaoJogos('JOGOS FINALIZADOS', grupos.finalizados, 'finalizados')}
        ${secaoJogos('OUTRAS SITUAÇÕES', grupos.outros, 'outros')}
    `;
}



// Equipes profissionais
function mostrarEquipesProfissionais(dados) {
    const conteudo = document.getElementById('conteudo-detalhe-profissional');
    const times = dados.response || [];

    if (!times.length) {
        conteudo.innerHTML =
            '<div class="loading-card">Nenhuma equipe encontrada.</div>';
        return;
    }

    conteudo.innerHTML = `
        <h2>EQUIPES <em>PARTICIPANTES</em></h2>

        <div class="professional-team-grid">
            ${times.map(item => {
                const time = item.team;
                const estadio = item.venue || {};

                return `
                    <article class="professional-team-card">
                        <div class="professional-team-logo">
                            <img src="${escapar(time.logo)}"
                                 alt="Escudo de ${escapar(time.name)}">
                        </div>

                        <h3>${escapar(time.name)}</h3>

                        <span class="professional-team-country">
                            ${escapar(time.country || 'País não informado')}
                        </span>

                        <div class="professional-team-info">
                            <div>
                                <span>ESTÁDIO</span>
                                <b>${escapar(estadio.name || 'Não informado')}</b>
                            </div>

                            <div>
                                <span>CIDADE</span>
                                <b>${escapar(estadio.city || 'Não informada')}</b>
                            </div>
                        </div>

                        <div class="professional-team-footer">
                            <span>ARENAHUB</span>
                            <span>CLUBE OFICIAL ↗</span>
                        </div>
                    </article>
                `;
            }).join('')}
        </div>
    `;
}

// Artilheiros profissionais
function mostrarArtilheirosProfissionais(dados) {
    const conteudo = document.getElementById('conteudo-detalhe-profissional');
    const jogadores = dados.response || [];

    if (!jogadores.length) {
        conteudo.innerHTML =
            '<div class="loading-card">Artilharia não disponível.</div>';
        return;
    }

    function mediaGols(item) {
        const estatistica = item.statistics?.[0] || {};
        const gols = estatistica.goals?.total || 0;
        const jogos = estatistica.games?.appearences || 0;

        return jogos > 0 ? (gols / jogos).toFixed(2) : '0.00';
    }

    function classePodio(indice) {
        if (indice === 0) return 'artilheiro-ouro';
        if (indice === 1) return 'artilheiro-prata';
        if (indice === 2) return 'artilheiro-bronze';
        return '';
    }

    const primeiros = jogadores.slice(0, 3);

    conteudo.innerHTML = `
        <h2>ARTILHARIA <em>DO CAMPEONATO</em></h2>

        <div class="artilheiros-podio">
            ${primeiros.map((item, indice) => {
                const jogador = item.player;
                const estatistica = item.statistics?.[0] || {};

                return `
                    <article class="artilheiro-destaque ${classePodio(indice)}">
                        <span class="artilheiro-posicao">
                            ${indice + 1}º LUGAR
                        </span>

                        <img class="artilheiro-foto"
                             src="${escapar(jogador.photo || '')}"
                             alt="${escapar(jogador.name)}"
                             onerror="this.style.display='none'">

                        <h3>${escapar(jogador.name)}</h3>

                        <div class="artilheiro-clube">
                            <img src="${escapar(estatistica.team?.logo || '')}"
                                 alt=""
                                 onerror="this.style.display='none'">
                            <span>${escapar(estatistica.team?.name || '-')}</span>
                        </div>

                        <strong class="artilheiro-gols">
                            ${estatistica.goals?.total ?? 0}
                            <small>GOLS</small>
                        </strong>
                    </article>
                `;
            }).join('')}
        </div>

        <div class="artilharia-resumo">
            <h3>RANKING <em>COMPLETO</em></h3>
            <span>${jogadores.length} JOGADORES</span>
        </div>

        <div class="table-wrap tabela-artilharia">
            <table>
                <thead>
                    <tr>
                        <th>#</th>
                        <th>JOGADOR</th>
                        <th>EQUIPE</th>
                        <th>JOGOS</th>
                        <th>GOLS</th>
                        <th>MÉDIA</th>
                    </tr>
                </thead>

                <tbody>
                    ${jogadores.map((item, indice) => {
                        const jogador = item.player;
                        const estatistica = item.statistics?.[0] || {};

                        return `
                            <tr class="${classePodio(indice)}">
                                <td>
                                    <span class="artilharia-ranking">
                                        ${indice + 1}
                                    </span>
                                </td>

                                <td>
                                    <div class="artilharia-jogador">
                                        <img src="${escapar(jogador.photo || '')}"
                                             alt=""
                                             onerror="this.style.display='none'">
                                        <b>${escapar(jogador.name)}</b>
                                    </div>
                                </td>

                                <td>
                                    <div class="artilharia-clube">
                                        <img src="${escapar(estatistica.team?.logo || '')}"
                                             alt=""
                                             onerror="this.style.display='none'">
                                        ${escapar(estatistica.team?.name || '-')}
                                    </div>
                                </td>

                                <td>${estatistica.games?.appearences ?? '-'}</td>

                                <td>
                                    <strong class="artilharia-gols">
                                        ${estatistica.goals?.total ?? 0}
                                    </strong>
                                </td>

                                <td>${mediaGols(item)}</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;
}


// Inicialização
async function iniciar() {
    try {
        await api('/status');
        await carregar();

    } catch (e) {
        toast('Não conectou ao MySQL. ' + e.message);
    }
}

iniciar();