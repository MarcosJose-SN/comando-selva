/* =====================================================================
   COMANDO SELVA - jogo de tiro 2D (JavaScript puro + Canvas)
   Controles: A/D mover | W mirar pra cima | S agachar | ESPAÇO pular | L atirar
   ===================================================================== */


/* ---------------------------------------------------------------------
   1. CONFIGURAÇÃO INICIAL
   Pega o canvas da página e define as constantes principais
   --------------------------------------------------------------------- */
const cv = document.getElementById('g');   // elemento <canvas>
const x = cv.getContext('2d', { alpha: false });             // "pincel" para desenhar (ctx)
const W = 1000;                             // largura da tela
const H = 600;                             // altura da tela
const GY = 470;                            // altura (Y) do chão


/* ---------------------------------------------------------------------
   2. TECLADO
   K guarda quais teclas estão pressionadas agora (ex.: K.KeyL = true)
   --------------------------------------------------------------------- */
const K = {};
// Ações que acontecem UMA vez ao apertar (pausa e menu). Usado pelo teclado e pelo controle.
function onPress(code) {
  if (code == 'Escape') {                       // ESC / Start: pausa / continua
    if (st == 'play') { st = 'pause'; menuIdx = 0; }
    else if (st == 'pause') st = 'play';
  } else if (st == 'pause') {                   // navegação no menu de pausa
    if (code == 'KeyW' || code == 'ArrowUp')   menuIdx = (menuIdx + 2) % 3;
    if (code == 'KeyS' || code == 'ArrowDown') menuIdx = (menuIdx + 1) % 3;
    if (code == 'Enter' || code == 'Space') menuSelect();
  }
}

addEventListener('keydown', e => {
  K[e.code] = 1;
  if (e.code == 'Space' || e.code.startsWith('Arrow')) e.preventDefault();  // evita rolar a página
  if (!e.repeat) onPress(e.code);
});

// Pausa sozinho se a janela perder o foco (e solta todas as teclas)
addEventListener('blur', () => {
  for (const k in K) K[k] = 0;
  if (st == 'play') { st = 'pause'; menuIdx = 0; }
});
addEventListener('keyup', e => K[e.code] = 0);


/* ---------------------------------------------------------------------
   2b. CONTROLE DE XBOX (Gamepad API)
   Analógico esquerdo ou direcional: mover (←/→), mirar pra cima (↑), agachar (↓)
   A = pular | X, B, RB ou RT = atirar | Start = pausar
   No menu de pausa: direcional ↑/↓ escolhe, A confirma, B ou Start continua
   --------------------------------------------------------------------- */
const PAD = {};          // estado anterior dos botões (para detectar "acabou de apertar")
let padOn = false;       // tem controle conectado?
let padRef = null;       // o controle em uso (para vibrar)

// Liga/desliga uma "tecla virtual" (o resto do jogo continua lendo K.KeyA, K.Space...)
function setKey(code, on) {
  if (on !== !!PAD[code]) { PAD[code] = on; K[code] = on ? 1 : 0; }
}
// true só no frame em que o botão foi apertado
function edge(name, on) {
  const was = !!PAD[name]; PAD[name] = on; return on && !was;
}
const PLAY_KEYS = ['KeyA', 'KeyD', 'KeyW', 'KeyS', 'Space', 'KeyL'];

function pollPad() {
  const list = (typeof navigator !== 'undefined' && navigator.getGamepads) ? navigator.getGamepads() : [];
  let g = null;
  for (const c of list) if (c && c.connected) { g = c; break; }
  if (!g) {                                            // sem controle: solta tudo
    if (padOn) { padOn = false; padRef = null; for (const k of PLAY_KEYS) setKey(k, false); }
    return;
  }
  padOn = true; padRef = g;

  const b = i => !!(g.buttons[i] && g.buttons[i].pressed);        // botão apertado?
  const ax = g.axes[0] || 0, ay = g.axes[1] || 0, dz = .4;          // dz = zona morta do analógico
  const left = ax < -dz || b(14), right = ax > dz || b(15);
  const up = ay < -dz || b(12), down = ay > dz || b(13);
  const A = b(0), B = b(1), shoot = b(2) || b(1) || b(5) || b(7), start = b(9);

  const jA = edge('A', A), jB = edge('B', B), jS = edge('S', start), jU = edge('U', up), jD = edge('D', down);

  if (st == 'play') {
    setKey('KeyA', left); setKey('KeyD', right); setKey('KeyW', up); setKey('KeyS', down);
    setKey('Space', A);   setKey('KeyL', shoot);
    if (jS) onPress('Escape');                                      // Start = pausar
  } else {
    for (const k of PLAY_KEYS) setKey(k, false);
    if (st == 'pause') {                                            // menu de pausa
      if (jU) onPress('ArrowUp');
      if (jD) onPress('ArrowDown');
      if (jA) onPress('Enter');
      if (jB || jS) onPress('Escape');
    } else if (jA || jS) K.Enter = 1;                               // início / game over / vitória
  }
}

// Vibra o controle (se ele suportar)
function rumble(ms, strong, weak) {
  const a = padRef && padRef.vibrationActuator;
  if (a && a.playEffect) {
    try { Promise.resolve(a.playEffect('dual-rumble', { duration: ms, strongMagnitude: strong, weakMagnitude: weak })).catch(() => {}); } catch (e) {}
  }
}


/* ---------------------------------------------------------------------
   3. FASES
   len  = comprimento da fase | n = quantidade de inimigos
   boss = vida do boss        | name = nome mostrado na tela
   --------------------------------------------------------------------- */
const LV = [
  { len: 3200, n: 10, boss: 30,  bt: 'robot', bname: 'ROBÔ GUARDIÃO',         name: 'FASE 1 - Selva',          hint: 'Dica: pule para desviar dos tiros em leque!' },
  { len: 3600, n: 13, boss: 50,  bt: 'heli',  bname: 'HELICÓPTERO DE ATAQUE', name: 'FASE 2 - Deserto',        hint: 'Dica: segure W e atire para cima!' },
  { len: 4000, n: 16, boss: 70,  bt: 'tank',  bname: 'TANQUE DE GUERRA',      name: 'FASE 3 - Cidade Noturna', hint: 'Dica: agache (S) ou pule para desviar do canhão!' },
  { len: 4400, n: 20, boss: 110, bt: 'super', bname: 'SUPER TANQUE',          name: 'FASE 4 - Fortaleza',      hint: 'Dica: cuidado com as granadas em arco!' },
  { len: 4800, n: 24, boss: 160, bt: 'mech',  bname: 'ROBÔ DE GUERRA',        name: 'FASE 5 - Base Militar',   hint: 'Dica: pule a onda de choque e desvie dos mísseis!' }
];

// Tamanho de cada tipo de boss (air = voa)
const BS = {
  robot: { w: 90,  h: 110 },
  heli:  { w: 140, h: 60, air: 1 },
  tank:  { w: 150, h: 80 },
  super: { w: 210, h: 112 },
  mech:  { w: 130, h: 170 }
};

// Cores do céu de cada fase [topo, base]
const SKY = [
  ['#2d6a4f', '#95d5b2'],
  ['#e9a13b', '#fbe3a1'],
  ['#1b1b3a', '#5a4e8c'],
  ['#3a0f12', '#ff7b3a'],
  ['#2c3e5a', '#8fb3d6']
];


/* ---------------------------------------------------------------------
   4. VARIÁVEIS DE ESTADO DO JOGO
   --------------------------------------------------------------------- */
let st = 'title';   // tela atual: 'title', 'play', 'pause', 'over' (game over) ou 'win'
let kills = 0;       // inimigos derrotados na fase (ímpar = vida, par = munição forte)
let BG, BGlv = -1, VIG;   // fundos pré-desenhados (cache): deixam o jogo bem mais leve
let menuIdx = 0;    // opção selecionada no menu de pausa
let lv = 0;         // índice da fase atual (0, 1, 2)
let p;              // jogador
let B;              // lista de balas
let E;              // lista de inimigos
let D;              // lista de caixas de munição forte (drops dos inimigos)
let PT = [];        // partículas (faíscas, explosões)
let shake = 0;      // tremor de tela
let pl;             // lista de plataformas
let cam;            // posição da câmera (rolagem lateral)
let boss;           // chefe da fase
let score = 0;      // pontuação
let T = 0;          // contador de frames (usado no efeito de piscar)
let end = 0;        // contador depois de derrotar o boss


/* ---------------------------------------------------------------------
   5. FUNÇÕES AUXILIARES
   --------------------------------------------------------------------- */

// Número aleatório entre a e b
const R = (a, b) => a + Math.random() * (b - a);

// Verifica colisão entre dois retângulos (a e b)
const hit = (a, b) =>
  a.x < b.x + b.w && a.x + a.w > b.x &&
  a.y < b.y + b.h && a.y + a.h > b.y;

// Cria uma bala. own = 1 (do jogador) ou 0 (do inimigo); r = raio; dmg = dano
function shoot(o, vx, vy, own, r = 3, dmg = 1, g = 0) {   // g > 0 = explosivo (bomba/granada)
  B.push({ x: o.x, y: o.y, vx, vy, own, r, dmg, g });
}

// Jogador leva dano (com 90 frames de invencibilidade depois)
// Cria n partículas (faíscas) em (px,py)
function spark(px, py, n, col, sp) {
  if (PT.length > 250) return;               // limite de partículas (desempenho)
  for (let i = 0; i < n; i++) {
    const l = (R(15, 35)) | 0;
    PT.push({ x: px, y: py, vx: R(-1, 1) * sp, vy: R(-1, 1) * sp - 1, g: .15, life: l, max: l, col, s: R(2, 5) });
  }
}

function hurt() {
  if (p.inv > 0) return;
  p.hp--;
  p.inv = 90;
  shake = 14;
  rumble(180, .9, .4);                       // vibra o controle ao levar dano
  spark(p.x + 12, p.y + 20, 14, '#ff4d6d', 4);
  if (p.hp <= 0) st = 'over';   // sem vida = game over
}


/* ---------------------------------------------------------------------
   6. INICIAR / REINICIAR FASE
   Cria jogador, plataformas, inimigos e boss da fase atual
   --------------------------------------------------------------------- */
function init() {
  const L = LV[lv];

  // --- Jogador ---
  p = {
    x: 60, y: GY - 40,   // posição
    vx: 0, vy: 0,        // velocidade
    w: 24, h: 40,        // tamanho
    f: 1,                // direção (1 = direita, -1 = esquerda)
    hp: 6,               // vidas
    cd: 0,               // tempo de espera entre tiros
    inv: 0,              // tempo de invencibilidade
    on: 0,               // 1 se estiver no chão/plataforma
    ammo: 0              // quantidade de munição forte (0 = tiro normal)
  };

  kills = 0; B = []; E = []; D = []; PT = []; pl = []; cam = 0; end = 0;

  // --- Plataformas (a cada 520px, até antes da arena do boss) ---
  for (let px = 500; px < L.len - 1000; px += 520) {
    pl.push({ x: px, y: GY - 95, w: 150 });
  }

  // --- Inimigos espalhados pela fase ---
  for (let i = 0; i < L.n; i++) {
    E.push({
      x: 600 + i * (L.len - 1600) / L.n + R(0, 100),
      y: GY - 40, w: 24, h: 40,
      hp: 2,             // vida do inimigo
      cd: R(30, 120),    // tempo até o próximo tiro
      f: -1              // direção
    });
  }

  // --- Boss da fase (o tipo vem de LV[lv].bt) ---
  const bs = BS[L.bt], by0 = bs.air ? GY - 240 : GY - bs.h;
  boss = {
    type: L.bt, w: bs.w, h: bs.h,
    x: L.len - bs.w - 70, x0: L.len - bs.w - 70,   // x0 = posição base de patrulha
    y: by0, by: by0,                               // by = altura base
    hp: L.boss, max: L.boss,                       // vida atual e máxima
    dir: -1, cd: 80, f: -1,
    t: 0, n: 0, dive: 0, warn: 0                   // contadores internos
  };

  if (BGlv !== lv) { buildBG(); BGlv = lv; }   // pré-desenha o fundo da fase (só quando troca de fase)
}


/* ---------------------------------------------------------------------
   7. ATUALIZAÇÃO (lógica do jogo, roda 60x por segundo)
   --------------------------------------------------------------------- */
function update() {
  T++;
  const L = LV[lv];

  /* ----- 7.0 PARTÍCULAS e tremor de tela ----- */
  if (shake > 0) shake--;
  for (const q of PT) { q.x += q.vx; q.y += q.vy; q.vy += q.g; q.life--; }
  PT = PT.filter(q => q.life > 0);

  /* ----- 7.1 JOGADOR: agachar ----- */
  const crouch = K.KeyS && p.on;       // só agacha se estiver no chão
  const bot = p.y + p.h;               // base do jogador (mantém os pés no lugar)
  p.h = crouch ? 28 : 40;
  p.y = bot - p.h;

  /* ----- 7.2 JOGADOR: movimento lateral (A / D) ----- */
  const dir = (K.KeyD ? 1 : 0) - (K.KeyA ? 1 : 0);
  if (dir) p.f = dir;                  // vira para o lado que andou
  p.x += dir * (crouch ? 1.5 : 4);     // agachado anda mais devagar
  p.x = Math.max(cam, Math.min(L.len - p.w, p.x));  // não sai da tela/fase

  /* ----- 7.3 JOGADOR: pulo (ESPAÇO) ----- */
  if (K.Space && p.on) {
    p.vy = -12.5;
    p.on = 0;
  }

  /* ----- 7.4 JOGADOR: gravidade e colisão com chão/plataformas ----- */
  const pb = p.y + p.h;                // base ANTES de mover
  p.vy += .6;                          // gravidade
  p.y += p.vy;
  p.on = 0;

  if (p.y + p.h >= GY) {               // tocou o chão
    p.y = GY - p.h;
    p.vy = 0;
    p.on = 1;
  } else if (p.vy >= 0) {              // caindo: verifica plataformas
    for (const q of pl) {
      if (pb <= q.y + 2 && p.y + p.h >= q.y &&
          p.x + p.w > q.x && p.x < q.x + q.w) {
        p.y = q.y - p.h;
        p.vy = 0;
        p.on = 1;
      }
    }
  }

  /* ----- 7.5 JOGADOR: tiro (L) ----- */
  p.cd--;
  p.inv--;
  if (K.KeyL && p.cd <= 0) {
    const strong = p.ammo > 0;         // tem munição forte?
    p.cd = strong ? 8 : 10;            // munição forte atira mais rápido
    const sp = strong ? 14 : 11;       // velocidade da bala
    const up = K.KeyW;                 // W = atirar para cima
    spark(p.x + 12 + (up ? 0 : p.f * 50), p.y + (up ? -26 : crouch ? 13 : 17), 3, strong ? '#ff9f1c' : '#ffe66d', 2.5);  // clarão do cano
    shoot(
      { x: p.x + 12 + (up ? 0 : p.f * 46), y: p.y + (up ? -22 : crouch ? 13 : 17) },
      up ? 0 : p.f * sp,               // velocidade horizontal
      up ? -sp : 0,                    // velocidade vertical
      1,                               // 1 = bala do jogador
      strong ? 6 : 3,                  // tamanho da bala
      strong ? 3 : 1                   // DANO: forte = 3, normal = 1
    );
    if (strong) p.ammo--;              // gasta 1 munição forte
  }

  /* ----- 7.6 CÂMERA: segue o jogador ----- */
  cam = Math.max(0, Math.min(L.len - W, p.x - 300));

  /* ----- 7.7 BALAS: movimento e limpeza ----- */
  for (const b of B) {
    b.vy += b.g || 0;                          // gravidade (bombas e granadas)
    b.x += b.vx; b.y += b.vy;
    if (b.g && b.y >= GY - 6 && !b.dead) {     // explosiva: estoura no chão
      b.dead = 1;
      spark(b.x, GY - 4, 16, '#ff9f1c', 5);
      shake = Math.max(shake, 8);
      if (Math.abs(p.x + 12 - b.x) < 50 && p.y + p.h >= GY - 30) hurt();
    }
  }
  B = B.filter(b =>
    b.x > cam - 50 && b.x < cam + W + 50 &&   // dentro da tela
    b.y > -50 && b.y < H + 50 && !b.dead      // não "morreu"
  );

  /* ----- 7.8 INIMIGOS: movimento, tiro e colisões ----- */
  for (const e of E) {
    const dx = p.x - e.x, ad = Math.abs(dx);
    e.f = dx > 0 ? 1 : -1;                    // sempre olha para o jogador

    if (ad < 650 && ad > 230) e.x += e.f * 1.3;  // aproxima até certa distância

    e.cd--;
    if (ad < 480 && e.cd <= 0 && e.x > cam - 20 && e.x < cam + W) {
      shoot({ x: e.x + 12, y: e.y + 14 }, e.f * 5, 0, 0);   // 0 = bala inimiga
      e.cd = R(90, 160);
    }

    if (hit(p, e)) hurt();                    // encostou = dano

    // balas do jogador acertando o inimigo
    for (const b of B) {
      if (b.own && !b.dead && !e.dead &&
          hit({ x: b.x - b.r, y: b.y - b.r, w: b.r * 2, h: b.r * 2 }, e)) {
        b.dead = 1;
        spark(b.x, b.y, 5, '#ffe66d', 3);
        e.hp -= b.dmg;                        // dano depende do tipo de bala
        if (e.hp <= 0) {
          e.dead = 1;
          score += 100;
          spark(e.x + 12, e.y + 20, 22, '#ff6b35', 5);   // explosão
          shake = Math.max(shake, 5);
          // DROP: abates ÍMPARES (1º, 3º...) soltam VIDA | PARES (2º, 4º...) soltam MUNIÇÃO FORTE
          kills++;
          const kind = kills % 2 == 0 ? 'ammo' : 'life';
          if (kind == 'ammo' || p.hp < 6)           // VIDA só aparece se o jogador perdeu vida (com a vida cheia, não cai nada)
            D.push({ x: e.x + 4, y: e.y + 10, w: 16, h: 16, vy: 0, kind });
        }
      }
    }
  }
  E = E.filter(e => !e.dead);                 // remove inimigos mortos

  /* ----- 7.8b MUNIÇÃO FORTE: queda e coleta das caixas ----- */
  for (const d of D) {
    d.vy += .5;                               // gravidade
    d.y += d.vy;
    if (d.y + d.h >= GY) { d.y = GY - d.h; d.vy = 0; }   // para no chão
    if (d.kind == 'life' && p.hp >= 6) { d.dead = 1; continue; }   // vida cheia: a caixa de vida some
    if (hit(p, d)) {                          // jogador pegou a caixa
      d.dead = 1;
      if (d.kind == 'life') {                // ímpar: +1 vida (máx. 6)
        p.hp++;
        spark(p.x + 12, p.y + 10, 10, '#7dff9a', 3);
      } else p.ammo = Math.min(99, p.ammo + 25);     // +25 munições fortes (máx. 99)
    }
  }
  D = D.filter(d => !d.dead);

  /* ----- 7.9 BOSS: patrulha, ataque e dano ----- */
  if (boss.hp > 0) {
    if (p.x > boss.x0 - 700) bossAI();        // só age quando o jogador chega perto

    // balas do jogador acertando o boss
    for (const b of B) {
      if (b.own && !b.dead && boss.hp > 0 &&
          hit({ x: b.x - b.r, y: b.y - b.r, w: b.r * 2, h: b.r * 2 }, boss)) {
        b.dead = 1;
        spark(b.x, b.y, 6, '#c77dff', 3);
        boss.hp -= b.dmg;
        if (boss.hp <= 0) {
          score += 1000; end = 1; shake = 30; rumble(500, 1, 1);
          for (let i = 0; i < 8; i++) spark(boss.x + R(0, boss.w), boss.y + R(0, boss.h), 20, i % 2 ? '#ff9f1c' : '#ff4d6d', 6);
        }   // boss derrotado!
      }
    }
  }

  /* ----- 7.10 BALAS INIMIGAS acertando o jogador ----- */
  for (const b of B) {
    if (!b.own && !b.dead &&
        hit({ x: b.x - b.r, y: b.y - b.r, w: b.r * 2, h: b.r * 2 }, p)) {
      b.dead = 1;
      hurt();
    }
  }

  /* ----- 7.11 FIM DE FASE: espera 2 segundos e avança ----- */
  if (end && ++end > 120) {
    if (lv < LV.length - 1) { lv++; init(); }   // próxima fase
    else st = 'win';                            // venceu o jogo
  }
}


/* ---------------------------------------------------------------------
   7b. CHEFES: cada fase tem um boss com ataques diferentes
   --------------------------------------------------------------------- */
function bossAI() {
  const b = boss, rage = 1 - b.hp / b.max;           // rage: 0 -> 1 conforme perde vida
  const px = p.x + 12, py = p.y + 20, cx = b.x + b.w / 2;
  b.t++; b.cd--;

  // n balas em leque mirando no jogador
  const aim = (sx, sy, sp, spread, n, r = 5) => {
    const a = Math.atan2(py - sy, px - sx);
    for (let i = 0; i < n; i++) {
      const o = (i - (n - 1) / 2) * spread;
      shoot({ x: sx, y: sy }, Math.cos(a + o) * sp, Math.sin(a + o) * sp, 0, r);
    }
  };
  // granada em arco: cai perto de tx e explode no chão
  const lob = (sx, sy, tx) => {
    const t = 55, g = .25;
    shoot({ x: sx, y: sy }, (tx - sx) / t, (GY - 8 - sy - .5 * g * t * t) / t, 0, 8, 1, g);
  };
  // anda de um lado para o outro
  const patrol = (sp, lo) => {
    b.x += b.dir * sp;
    if (b.x < b.x0 - lo) b.dir = 1;
    if (b.x > b.x0 + 40) b.dir = -1;
  };

  if (b.type == 'robot') {                            // ROBÔ: 3 balas em leque
    patrol(1.5, 160);
    if (b.cd <= 0) { aim(b.x + 20, b.y + 40, 5, .25, 3); b.cd = Math.max(40, 90 - rage * 40); }

  } else if (b.type == 'heli') {                      // HELICÓPTERO: voa alto, atira e bombardeia
    b.x = b.x0 - 220 + Math.sin(b.t / 70) * 240;
    b.y = b.by + Math.sin(b.t / 25) * 14;
    if (b.cd <= 0) {
      if (++b.n % 3 == 0)                             // a cada 3 ataques: 3 bombas
        for (let i = -1; i <= 1; i++) shoot({ x: cx + i * 30, y: b.y + b.h }, i * .8 + (px - cx) / 200, .5, 0, 7, 1, .22);
      else aim(cx, b.y + b.h - 10, 5, .3, 3);
      b.cd = Math.max(45, 95 - rage * 40);
    }

  } else if (b.type == 'tank') {                      // TANQUE: tiro reto (agache/pule) e granada em arco
    patrol(.9, 260);
    if (b.cd <= 0) {
      const mx = b.x - 36;
      if (++b.n % 3 == 0) lob(mx, b.y + 42, px);
      else shoot({ x: mx, y: b.y + 42 }, -7, 0, 0, 8);
      spark(mx, b.y + 42, 6, '#ffd166', 3);
      b.cd = Math.max(55, 110 - rage * 45);
    }

  } else if (b.type == 'super') {                     // SUPER TANQUE: leque + 2 granadas + chama soldados
    patrol(.7, 300);
    if (b.cd <= 0) {
      const mx = b.x - 52;
      aim(mx, b.y + 72, 6, .22, rage > .5 ? 5 : 3, 6);
      if (++b.n % 2 == 0) { lob(mx, b.y + 30, px - 70); lob(mx, b.y + 30, px + 70); }
      if (b.n % 4 == 0 && E.length < 4) E.push({ x: b.x - 20, y: GY - 40, w: 24, h: 40, hp: 2, cd: R(30, 60), f: -1 });
      spark(mx, b.y + 72, 8, '#ff6b35', 4); shake = Math.max(shake, 4);
      b.cd = Math.max(50, 100 - rage * 45);
    }

  } else {                                            // ROBÔ DE GUERRA: rajada, mísseis, leque e onda de choque
    patrol(.8, 320);
    const mx = b.x - 62, my = b.y + 85;               // boca da metralhadora
    if (b.burst > 0 && b.t % 5 == 0) {                // rajada: 1 tiro mirado a cada 5 frames
      b.burst--; aim(mx, my, 7, 0, 1, 4); spark(mx, my, 3, '#ffd166', 3);
    }
    if (b.cd <= 0) {
      const k = ++b.n % 4;
      if (k == 1) b.burst = 6;                        // 1) rajada de metralhadora
      else if (k == 2) {                              // 2) 3 mísseis em arco (ombro)
        lob(b.x - 6, b.y + 40, px - 90); lob(b.x - 6, b.y + 40, px); lob(b.x - 6, b.y + 40, px + 90);
      } else if (k == 3) aim(mx, my, 6, .2, 5);       // 3) leque de 5 balas
      else {                                          // 4) onda de choque rasteira (pule!)
        shoot({ x: b.x, y: GY - 14 }, -6.5, 0, 0, 10);
        shake = Math.max(shake, 8); spark(b.x, GY - 6, 10, '#c9a227', 4);
      }
      b.cd = Math.max(45, 95 - rage * 40);
    }
  }

  if (hit(p, b)) hurt();                              // encostar no boss = dano
}


/* ---------------------------------------------------------------------
   8. DESENHO (tudo que aparece na tela)
   --------------------------------------------------------------------- */

// Cores de cada fase: far = montanhas, mid = árvores/cactos/prédios, gtop/gbody = chão, plat = plataformas
const TH = [
  { far: '#1f5a45', mid: '#14402f', gtop: '#4caf50', gbody: ['#5a4030', '#2e2018'], plat: '#6b5340' },
  { far: '#c98a3a', mid: '#8f5f22', gtop: '#e0b050', gbody: ['#a07a3c', '#5a4220'], plat: '#8a6a3a' },
  { far: '#2b2750', mid: '#1a1838', gtop: '#7a7aaa', gbody: ['#3a3a5a', '#1a1a2e'], plat: '#4a4a6a' },
  { far: '#4a1a1a', mid: '#2a0e0e', gtop: '#8a5a3a', gbody: ['#4a3028', '#1e1210'], plat: '#5a4036' },
  { far: '#4a5d78', mid: '#2d3b50', gtop: '#9aa7b5', gbody: ['#6b7480', '#2f353d'], plat: '#6b7480' }
];
const PAL_P = { body: '#4a5d23', pants: '#3a4a1b', helmet: '#2f3e14', skin: '#e0b48a', accent: '#c9a227', m4: 1 };
const PAL_E = { body: '#a4161a', pants: '#5c1012', helmet: '#3a0d0f', skin: '#e0a96d', accent: '#222' };

// Número "aleatório" fixo (sempre igual para o mesmo n) - usado em cenário
const hs = n => ((Math.sin(n * 127.1) * 43758.5453) % 1 + 1) % 1;

// Brilho suave (círculo com degradê). O desenho fica em cache: muito mais leve.
const GC = {};
function glow(cx, cy, r, col, c = x) {
  const k = col + r;
  if (!GC[k]) {
    const o = document.createElement('canvas'); o.width = o.height = r * 2;
    const q = o.getContext('2d'), g = q.createRadialGradient(r, r, 0, r, r, r);
    g.addColorStop(0, col); g.addColorStop(1, 'rgba(255,255,255,0)');
    q.fillStyle = g; q.fillRect(0, 0, r * 2, r * 2);
    GC[k] = o;
  }
  c.drawImage(GC[k], cx - r, cy - r);
}

/* Pré-desenha o fundo da fase UMA vez (céu, montanhas, camada do meio, chão, vinheta).
   Durante o jogo só copiamos essas imagens, em vez de redesenhar tudo a cada frame. */
function buildBG() {
  const L = LV[lv], th = TH[lv], s = SKY[lv];
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  BG = {
    sky: mk(W, GY),
    far: mk(Math.ceil(L.len * .15 + W + 40), GY),
    mid: mk(Math.ceil(L.len * .4 + W + 260), GY),
    gnd: mk(W, H - GY),
    det: mk(L.len + 100, H - GY + 12)
  };

  { // céu: degradê + sol (ou lua e estrelas na fase 3)
    const x = BG.sky.getContext('2d');
    const g = x.createLinearGradient(0, 0, 0, GY);
    g.addColorStop(0, s[0]); g.addColorStop(1, s[1]);
    x.fillStyle = g; x.fillRect(0, 0, W, GY);
    if (lv == 2) {
      x.fillStyle = '#fff'; x.globalAlpha = .8;
      for (let i = 0; i < 50; i++) x.fillRect(hs(i) * W, hs(i + 50) * GY * .7, 2, 2);
      x.globalAlpha = 1;
      glow(820, 100, 120, 'rgba(200,200,255,.45)', x);
      x.fillStyle = '#f1f1ff'; x.beginPath(); x.arc(820, 100, 36, 0, 7); x.fill();
    } else {
      const sy = lv ? 150 : 110;
      glow(780, sy, 190, 'rgba(255,240,170,.75)', x);
      x.fillStyle = lv == 3 ? '#ffb27a' : '#fff6c2'; x.beginPath(); x.arc(780, sy, lv ? 62 : 44, 0, 7); x.fill();
    }
  }

  { // montanhas distantes
    const x = BG.far.getContext('2d');
    x.fillStyle = th.far; x.beginPath(); x.moveTo(0, GY);
    for (let px = 0; px <= BG.far.width + 10; px += 10)
      x.lineTo(px, GY - 150 - Math.sin(px / 110) * 45 - Math.sin(px / 41) * 14);
    x.lineTo(BG.far.width + 10, GY); x.fill();
  }

  { // camada do meio: árvores, cactos, prédios, fábricas ou hangares
    const x = BG.mid.getContext('2d');
    for (let i = -1; i * 120 < BG.mid.width; i++) {
      const wx = i * 120 + hs(i) * 40, h = 70 + hs(i + 9) * 70;
      x.fillStyle = th.mid;
      if (lv == 0) {                                      // árvores
        x.fillRect(wx + 18, GY - h * .6, 10, h * .6);
        x.beginPath(); x.arc(wx + 23, GY - h * .6, 28 + hs(i + 3) * 10, 0, 7); x.fill();
      } else if (lv == 1) {                               // cactos
        x.fillRect(wx + 20, GY - h, 12, h);
        x.fillRect(wx + 6, GY - h * .65, 14, 8);  x.fillRect(wx + 6, GY - h * .65 - 18, 8, 18);
        x.fillRect(wx + 32, GY - h * .5, 14, 8);  x.fillRect(wx + 38, GY - h * .5 - 18, 8, 18);
      } else if (lv == 2) {                               // prédios com janelas acesas
        x.fillRect(wx, GY - h * 1.6, 70, h * 1.6);
        x.fillStyle = 'rgba(255,220,120,.55)';
        for (let r = 0; r < (h * 1.6 / 22 | 0); r++)
          for (let c = 0; c < 3; c++)
            if (hs(i * 13 + r * 3 + c) > .45) x.fillRect(wx + 8 + c * 20, GY - h * 1.6 + 8 + r * 22, 10, 12);
      } else if (lv == 3) {                               // fábricas com chaminés e fumaça
        x.fillRect(wx + 10, GY - h * 1.3, 22, h * 1.3);
        x.fillRect(wx + 7, GY - h * 1.3, 28, 6);
        x.fillRect(wx + 36, GY - h * .7, 56, h * .7);
        x.fillStyle = 'rgba(255,120,40,.6)';
        for (let c = 0; c < 3; c++) x.fillRect(wx + 42 + c * 16, GY - h * .7 + 10, 8, 10);
        x.fillStyle = 'rgba(40,20,20,.35)';
        x.beginPath(); x.ellipse(wx + 22 + Math.sin(i) * 6, GY - h * 1.3 - 18, 18, 10, 0, 0, 7); x.fill();
      } else {                                            // hangares e torres de controle
        x.beginPath(); x.arc(wx + 50, GY, 50, Math.PI, 0); x.fill();
        x.fillRect(wx + 85, GY - h * 1.2, 14, h * 1.2);
        x.fillRect(wx + 78, GY - h * 1.2 - 14, 28, 14);
        x.fillStyle = '#ff3b3b'; x.fillRect(wx + 90, GY - h * 1.2 - 22, 4, 6);
      }
    }
  }

  { // chão (degradê)
    const x = BG.gnd.getContext('2d'), h = H - GY;
    const gg = x.createLinearGradient(0, 0, 0, h);
    gg.addColorStop(0, th.gbody[0]); gg.addColorStop(1, th.gbody[1]);
    x.fillStyle = gg; x.fillRect(0, 0, W, h);
    x.fillStyle = th.gtop; x.fillRect(0, 0, W, 10);
    x.fillStyle = 'rgba(255,255,255,.18)'; x.fillRect(0, 0, W, 2);
  }

  { // detalhes do chão (capim e pedrinhas) ao longo de toda a fase
    const x = BG.det.getContext('2d'), oy = 12;          // oy = altura do chão dentro deste canvas
    for (let wx = 0; wx < BG.det.width; wx += 20) {
      const r = hs(wx);
      x.fillStyle = th.gtop;
      x.beginPath(); x.moveTo(wx, oy); x.lineTo(wx + 4, oy - 5 - r * 7); x.lineTo(wx + 8, oy); x.fill();
      x.fillStyle = 'rgba(0,0,0,.2)';
      x.fillRect(wx + r * 10, oy + 20 + hs(wx + 5) * 150, 8 + r * 14, 5);
    }
  }

  if (!VIG) {                                             // vinheta (igual em todas as fases)
    VIG = mk(W, H);
    const x = VIG.getContext('2d');
    const vg = x.createRadialGradient(W / 2, H / 2, H * .35, W / 2, H / 2, H * .9);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.4)');
    x.fillStyle = vg; x.fillRect(0, 0, W, H);
  }
}

// Coração do HUD
function heart(hx, hy, s, on) {
  x.fillStyle = on ? '#ff4d6d' : 'rgba(0,0,0,.45)';
  x.beginPath();
  x.moveTo(hx, hy + s * .3);
  x.bezierCurveTo(hx, hy - s * .2, hx - s, hy - s * .2, hx - s, hy + s * .3);
  x.bezierCurveTo(hx - s, hy + s * .8, hx, hy + s, hx, hy + s * 1.2);
  x.bezierCurveTo(hx, hy + s, hx + s, hy + s * .8, hx + s, hy + s * .3);
  x.bezierCurveTo(hx + s, hy - s * .2, hx, hy - s * .2, hx, hy + s * .3);
  x.fill();
}

// Desenha o fuzil M4 do jogador (coronha, trilho, mira, carregador, guarda-mão, cano)
function drawM4(o, up) {
  const f = o.f, cx = o.x + o.w / 2;
  const gy = o.y + (o.h < 40 ? 12 : 16);
  x.save();
  if (up) x.translate(cx + f * 2, o.y + 16); else x.translate(cx + f * 8, gy + 1);
  x.scale(f, 1);                                   // espelha conforme a direção
  if (up) x.rotate(-Math.PI / 2);                  // aponta pra cima
  x.translate(o.cd >= 8 ? -2 : 0, 0);              // recuo ao atirar

  // coronha
  x.fillStyle = '#1b1b1b'; x.fillRect(-15, -2, 11, 6); x.fillRect(-17, -3, 3, 8);
  // empunhadura
  x.fillStyle = '#242424';
  x.beginPath(); x.moveTo(-3, 4); x.lineTo(2, 4); x.lineTo(0, 13); x.lineTo(-5, 13); x.fill();
  // receptor inferior + gatilho
  x.fillStyle = '#2c2c2e'; x.fillRect(-4, 0, 17, 5);
  x.fillStyle = '#0d0d0d'; x.fillRect(4, 5, 1, 3);
  // carregador
  x.fillStyle = '#1a1a1a';
  x.beginPath(); x.moveTo(5, 5); x.lineTo(11, 5); x.lineTo(12, 16); x.lineTo(7, 16); x.fill();
  x.fillStyle = 'rgba(255,255,255,.12)'; x.fillRect(6, 8, 1, 7);
  // receptor superior + trilho com dentes
  x.fillStyle = '#3a3a3d'; x.fillRect(-4, -4, 19, 4);
  x.fillStyle = '#1e1e20'; x.fillRect(-3, -6, 16, 2);
  x.fillStyle = '#555';
  for (let i = -2; i < 13; i += 3) x.fillRect(i, -6, 1, 2);
  // mira holográfica com ponto vermelho
  x.fillStyle = '#141414'; x.fillRect(3, -11, 9, 5); x.fillRect(4, -12, 7, 1);
  x.fillStyle = 'rgba(255,60,60,.95)'; x.fillRect(10, -10, 1, 3);
  // guarda-mão com aberturas de ventilação
  x.fillStyle = '#303033'; x.fillRect(15, -4, 14, 7);
  x.fillStyle = '#1c1c1e';
  for (let i = 17; i < 28; i += 3) x.fillRect(i, -2, 1, 4);
  // cano, quebra-chamas e massa de mira
  x.fillStyle = '#555'; x.fillRect(29, -2, 6, 3);
  x.fillStyle = '#1a1a1a'; x.fillRect(35, -3, 5, 5);
  x.fillStyle = '#222'; x.fillRect(27, -8, 2, 4);
  // brilho metálico
  x.fillStyle = 'rgba(255,255,255,.18)'; x.fillRect(-4, -4, 19, 1); x.fillRect(15, -4, 14, 1);
  // braços e mãos
  x.fillStyle = PAL_P.body; x.fillRect(2, 4, 17, 3);
  x.fillStyle = PAL_P.skin; x.fillRect(-4, 6, 5, 5); x.fillRect(19, 3, 7, 4);
  // clarão do tiro
  if (o.cd >= 7) {
    x.fillStyle = '#ffd166';
    x.beginPath(); x.moveTo(40, -4); x.lineTo(52, -1); x.lineTo(40, 2); x.lineTo(44, -1); x.fill();
    x.shadowBlur = 0;
  }
  x.restore();
}

// Desenha um soldado (usado no jogador e nos inimigos)
// o = objeto (x,y,w,h,f) | pal = cores | walk = andando? | up = mirando pra cima?
function soldier(o, pal, walk, up) {
  const cx = o.x + o.w / 2, f = o.f;
  const sw = walk ? Math.sin(T / 3 + o.x) * 5 : 0;       // balanço das pernas
  const legH = Math.min(14, o.h * .35);

  // sombra no chão (diminui quando está no ar)
  const k = Math.max(.3, 1 - (GY - (o.y + o.h)) / 220);
  x.fillStyle = 'rgba(0,0,0,.28)';
  x.beginPath(); x.ellipse(cx, GY + 3, 18 * k, 4 * k, 0, 0, 7); x.fill();

  // pernas + botas
  x.fillStyle = pal.pants;
  x.fillRect(cx - 8 + sw, o.y + o.h - legH, 7, legH);
  x.fillRect(cx + 1 - sw, o.y + o.h - legH, 7, legH);
  x.fillStyle = '#1a1a1a';
  x.fillRect(cx - 9 + sw, o.y + o.h - 4, 9, 4);
  x.fillRect(cx + 1 - sw, o.y + o.h - 4, 9, 4);

  // tronco, cinto e tira de munição
  x.fillStyle = pal.body;
  x.fillRect(o.x + 2, o.y + 12, o.w - 4, o.h - 12 - legH + 2);
  x.fillStyle = pal.accent;
  x.fillRect(o.x + 2, o.y + o.h - legH - 2, o.w - 4, 3);
  x.fillRect(o.x + 4, o.y + 13, 3, o.h - 24);

  // cabeça, capacete e olho
  x.fillStyle = pal.skin;
  x.beginPath(); x.arc(cx + f, o.y + 9, 6, 0, 7); x.fill();
  x.fillStyle = pal.helmet;
  x.beginPath(); x.arc(cx + f, o.y + 8, 8, Math.PI, 0); x.fill();
  x.fillRect(cx + f - 8, o.y + 7, 16, 3);
  x.fillStyle = '#111';
  x.fillRect(cx + f * 3 - 1, o.y + 8, 2, 2);

  // braço + arma (jogador usa o M4)
  if (pal.m4) { drawM4(o, up); return; }
  x.fillStyle = pal.skin;
  if (up) {
    x.fillRect(cx + f * 2 - 2, o.y + 12, 4, 8);
    x.fillStyle = '#222'; x.fillRect(cx + f * 2 - 3, o.y - 10, 6, 24);
    x.fillStyle = '#666'; x.fillRect(cx + f * 2 - 2, o.y - 12, 4, 4);
  } else {
    const gy = o.y + (o.h < 40 ? 12 : 16);
    x.fillRect(cx + f * 4 - 2, gy - 1, 6, 5);
    x.fillStyle = '#222'; x.fillRect(f > 0 ? cx + 2 : cx - 26, gy, 24, 6);
    x.fillStyle = '#666'; x.fillRect(f > 0 ? cx + 22 : cx - 26, gy, 4, 6);
  }
}

// ----- Desenhos dos bosses -----
function drawBoss() {
  const b = boss, low = b.hp / b.max < .35;           // low = pouca vida (fica vermelho)
  if (b.type == 'robot') drawRobot(b, low);
  else if (b.type == 'heli') drawHeli(b.x, b.y, low);
  else if (b.type == 'tank') drawTank(b.x, b.y, 1, { hull: '#5a6b45', turret: '#6b7f55', track: '#1b1b1b', acc: '#ff9f1c' }, false, low);
  else if (b.type == 'super') drawTank(b.x, b.y, 1.4, { hull: '#3a3a48', turret: '#55556a', track: '#101014', acc: '#ff3b3b' }, true, low);
  else drawMech(b, low);
}

function drawRobot(b, low) {                          // robô blindado com olho brilhante
  const bx = b.x, by = b.y;
  x.fillStyle = 'rgba(0,0,0,.3)'; x.beginPath(); x.ellipse(bx + 45, GY + 3, 62, 7, 0, 0, 7); x.fill();
  x.fillStyle = '#111'; x.fillRect(bx - 6, by + b.h - 22, b.w + 12, 22);
  x.fillStyle = '#3a3a3a';
  for (let i = 0; i < 7; i++) x.fillRect(bx - 2 + i * 14, by + b.h - 18, 8, 14);
  const bg = x.createLinearGradient(bx, 0, bx + b.w, 0);
  bg.addColorStop(0, '#2b2b3a'); bg.addColorStop(.5, '#4f4f6b'); bg.addColorStop(1, '#1f1f2b');
  x.fillStyle = bg; x.fillRect(bx, by + 10, b.w, b.h - 30);
  x.fillStyle = '#3a3a52'; x.beginPath(); x.arc(bx + 45, by + 16, 36, Math.PI, 0); x.fill();
  x.fillStyle = '#6a6a8a'; x.fillRect(bx + 10, by + 40, b.w - 20, 4);
  x.fillStyle = '#222';
  for (let i = 0; i < 4; i++) x.fillRect(bx + 12 + i * 20, by + 54, 12, 20);
  glow(bx + 45, by + 16, 34, low ? 'rgba(255,40,40,.6)' : 'rgba(199,125,255,.6)');
  x.fillStyle = low ? '#ff3b3b' : '#e0b3ff';
  x.globalAlpha = .7 + Math.sin(T / 6) * .3;
  x.fillRect(bx + 22, by + 12, 46, 8);
  x.globalAlpha = 1; x.shadowBlur = 0;
  x.fillStyle = '#555'; x.fillRect(bx - 34, by + 50, 44, 14);
  x.fillStyle = '#222'; x.fillRect(bx - 38, by + 47, 8, 20);
}

function drawHeli(bx, by, low) {                      // helicóptero de ataque (nariz à esquerda)
  const cx = bx + 60, cy = by + 36;
  x.fillStyle = 'rgba(0,0,0,.2)';                     // sombra no chão
  x.beginPath(); x.ellipse(cx, GY + 3, 70 * Math.max(.3, 1 - (GY - by) / 500), 6, 0, 0, 7); x.fill();
  x.fillStyle = '#3b4a2e';                            // cauda e deriva
  x.beginPath(); x.moveTo(cx + 30, cy - 10); x.lineTo(bx + 142, cy - 6); x.lineTo(bx + 142, cy + 2); x.lineTo(cx + 30, cy + 14); x.fill();
  x.fillRect(bx + 130, cy - 24, 8, 22);
  x.strokeStyle = 'rgba(220,220,220,.7)'; x.lineWidth = 3;   // rotor de cauda
  x.beginPath(); x.moveTo(bx + 136, cy - 6 - Math.sin(T * .6) * 14); x.lineTo(bx + 136, cy - 6 + Math.sin(T * .6) * 14); x.stroke();
  const g = x.createLinearGradient(0, by + 10, 0, by + 58);   // fuselagem
  g.addColorStop(0, low ? '#8a5a4a' : '#6b7f55'); g.addColorStop(1, '#2f3b25');
  x.fillStyle = g; x.beginPath(); x.ellipse(cx, cy, 52, 24, 0, 0, 7); x.fill();
  const gl = x.createLinearGradient(bx, by + 14, bx + 40, by + 44);   // cabine de vidro
  gl.addColorStop(0, 'rgba(190,235,255,.95)'); gl.addColorStop(1, 'rgba(60,110,150,.9)');
  x.fillStyle = gl; x.beginPath(); x.ellipse(bx + 22, cy - 3, 22, 16, 0, 0, 7); x.fill();
  x.fillStyle = 'rgba(255,255,255,.5)'; x.beginPath(); x.ellipse(bx + 14, cy - 10, 8, 3, -.4, 0, 7); x.fill();
  x.fillStyle = '#222'; x.fillRect(cx - 6, cy + 12, 34, 8);          // mísseis
  x.fillStyle = '#ff9f1c';
  for (let i = 0; i < 4; i++) x.fillRect(cx - 8 + i * 9, cy + 14, 4, 4);
  x.fillStyle = T % 30 < 15 ? '#ff3b3b' : '#511';                    // luz piscando
  x.beginPath(); x.arc(bx + 125, cy - 8, 3, 0, 7); x.fill();
  x.strokeStyle = '#222'; x.lineWidth = 3;                           // esquis
  x.beginPath(); x.moveTo(cx - 40, cy + 34); x.lineTo(cx + 40, cy + 34);
  x.moveTo(cx - 24, cy + 22); x.lineTo(cx - 28, cy + 34); x.moveTo(cx + 22, cy + 22); x.lineTo(cx + 26, cy + 34); x.stroke();
  x.fillStyle = '#222'; x.fillRect(cx - 4, cy - 34, 8, 12);          // rotor principal
  const rl = 75 * Math.abs(Math.cos(T * .7)) + 20;
  x.strokeStyle = '#ddd'; x.lineWidth = 4;
  x.beginPath(); x.moveTo(cx - rl, cy - 35); x.lineTo(cx + rl, cy - 35); x.stroke();
  x.fillStyle = 'rgba(255,255,255,.12)'; x.beginPath(); x.ellipse(cx, cy - 35, 80, 4, 0, 0, 7); x.fill();
}

// Tanque (canhão à esquerda). sc = escala | twin = canhão duplo (super tanque)
function drawTank(bx, by, sc, pal, twin, low) {
  x.save(); x.translate(bx, by); x.scale(sc, sc);
  x.fillStyle = 'rgba(0,0,0,.3)'; x.beginPath(); x.ellipse(75, (GY - by) / sc + 2, 80, 6, 0, 0, 7); x.fill();
  x.fillStyle = pal.track; x.beginPath(); x.roundRect(2, 54, 146, 26, 12); x.fill();      // esteiras
  for (let i = 0; i < 6; i++) {
    x.fillStyle = '#3a3a3a'; x.beginPath(); x.arc(20 + i * 22, 67, 9, 0, 7); x.fill();
    x.fillStyle = '#777';    x.beginPath(); x.arc(20 + i * 22, 67, 3, 0, 7); x.fill();
  }
  const hg = x.createLinearGradient(0, 34, 0, 56);                                        // casco
  hg.addColorStop(0, pal.turret); hg.addColorStop(1, pal.hull);
  x.fillStyle = hg; x.beginPath(); x.moveTo(6, 56); x.lineTo(24, 34); x.lineTo(128, 34); x.lineTo(146, 56); x.fill();
  x.fillStyle = '#262626';                                                                // canhão(ões)
  if (twin) { x.fillRect(-34, 19, 84, 6); x.fillRect(-40, 17, 8, 10); x.fillRect(-34, 48, 70, 6); x.fillRect(-40, 46, 8, 10); }
  else { x.fillRect(-34, 38, 86, 8); x.fillRect(-40, 36, 8, 12); }
  x.fillStyle = pal.turret; x.beginPath(); x.roundRect(46, 14, 66, 26, 8); x.fill();      // torre
  x.fillStyle = 'rgba(255,255,255,.18)'; x.fillRect(50, 15, 58, 3);
  x.fillStyle = pal.hull; x.beginPath(); x.arc(92, 14, 7, Math.PI, 0); x.fill();          // escotilha
  x.fillStyle = pal.acc;                                                                  // luzes/rebites
  for (let i = 0; i < 4; i++) x.fillRect(34 + i * 26, 44, 8, 3);
  if (twin) {                                                                             // espinhos
    x.fillStyle = '#1c1c22';
    for (let i = 0; i < 4; i++) { x.beginPath(); x.moveTo(52 + i * 14, 14); x.lineTo(58 + i * 14, 0); x.lineTo(64 + i * 14, 14); x.fill(); }
  }
  if (low) glow(75, 30, 70, 'rgba(255,60,0,.4)');                                         // pegando fogo
  x.restore();
}

function drawMech(b, low) {                           // robô militar de guerra (olha para a esquerda)
  const bx = b.x, by = b.y, sw = Math.sin(b.t / 10) * 7;   // sw = balanço das pernas
  x.fillStyle = 'rgba(0,0,0,.3)'; x.beginPath(); x.ellipse(bx + 65, GY + 3, 75, 8, 0, 0, 7); x.fill();

  for (const [lx, o] of [[22, sw], [78, -sw]]) {           // pernas (coxa, joelho, canela, pé)
    x.fillStyle = '#3d4a28'; x.fillRect(bx + lx + o * .3, by + 96, 30, 38);
    x.fillStyle = '#1c1f14'; x.beginPath(); x.arc(bx + lx + 15 + o * .3, by + 136, 11, 0, 7); x.fill();
    x.fillStyle = '#9a8a58'; x.fillRect(bx + lx + 3 + o * .6, by + 138, 24, 20);
    x.fillStyle = '#16180f'; x.fillRect(bx + lx - 8 + o, by + 156, 46, 14);
    x.fillStyle = '#9a8a58'; x.fillRect(bx + lx - 8 + o, by + 156, 12, 4);
  }
  x.fillStyle = '#2b3319'; x.fillRect(bx + 20, by + 86, 90, 16);          // pélvis
  x.fillStyle = '#9a8a58'; x.fillRect(bx + 20, by + 94, 90, 3);
  x.fillStyle = '#2f3a1e'; x.fillRect(bx + 104, by + 56, 20, 44);         // braço de trás
  x.fillStyle = '#1c1f14'; x.fillRect(bx + 106, by + 98, 16, 10);

  const tg = x.createLinearGradient(bx, by + 30, bx + 130, by + 90);      // torso
  tg.addColorStop(0, '#6b7d44'); tg.addColorStop(1, '#3a4626');
  x.fillStyle = tg; x.beginPath();
  x.moveTo(bx + 22, by + 90); x.lineTo(bx + 108, by + 90); x.lineTo(bx + 120, by + 34); x.lineTo(bx + 10, by + 34); x.fill();
  x.fillStyle = 'rgba(40,52,24,.55)';                                     // camuflagem
  x.beginPath(); x.ellipse(bx + 40, by + 52, 16, 9, .3, 0, 7); x.ellipse(bx + 88, by + 72, 18, 8, -.3, 0, 7); x.ellipse(bx + 100, by + 48, 10, 7, 0, 0, 7); x.fill();
  x.fillStyle = 'rgba(154,138,88,.5)';
  x.beginPath(); x.ellipse(bx + 62, by + 78, 14, 6, 0, 0, 7); x.ellipse(bx + 30, by + 74, 9, 6, 0, 0, 7); x.fill();
  x.fillStyle = 'rgba(255,255,255,.12)'; x.fillRect(bx + 12, by + 34, 106, 3);
  x.fillStyle = '#ffd166'; x.beginPath();                                 // estrela de comando
  for (let i = 0; i < 10; i++) { const r = i % 2 ? 5 : 12, a = -Math.PI / 2 + i * Math.PI / 5; x.lineTo(bx + 65 + Math.cos(a) * r, by + 58 + Math.sin(a) * r); }
  x.fill();

  x.fillStyle = '#2f3a1e'; x.beginPath(); x.roundRect(bx + 96, by + 28, 38, 34, 8); x.fill();   // ombro de trás
  x.fillStyle = '#2f3a1e'; x.beginPath(); x.roundRect(bx + 38, by + 4, 58, 34, 9); x.fill();    // cabeça
  x.fillStyle = '#9a8a58'; x.fillRect(bx + 40, by + 4, 54, 5);                                  // capacete
  x.fillStyle = '#222'; x.fillRect(bx + 90, by - 14, 3, 20);                                    // antena
  glow(bx + 62, by + 21, 30, low ? 'rgba(255,40,40,.6)' : 'rgba(255,110,40,.6)');   // brilho do visor
  x.fillStyle = low ? '#ff2b2b' : '#ff7a3a'; x.globalAlpha = .7 + Math.sin(T / 5) * .3;
  x.fillRect(bx + 42, by + 17, 40, 8);
  x.globalAlpha = 1; x.shadowBlur = 0;

  x.fillStyle = '#3d4a28'; x.beginPath(); x.roundRect(bx - 10, by + 28, 42, 38, 8); x.fill();   // ombro da frente
  for (let i = 0; i < 3; i++) {                                                                  // tubos de míssil
    x.fillStyle = '#14160d'; x.beginPath(); x.arc(bx - 2, by + 38 + i * 10, 5, 0, 7); x.fill();
    x.fillStyle = '#ff6b35'; x.beginPath(); x.arc(bx - 2, by + 38 + i * 10, 2, 0, 7); x.fill();
  }
  x.fillStyle = '#3d4a28'; x.fillRect(bx + 6, by + 62, 22, 26);                                  // braço
  x.fillStyle = '#2a2a2a'; x.fillRect(bx - 34, by + 78, 62, 14);                                 // metralhadora
  x.fillStyle = '#555';
  for (let i = 0; i < 3; i++) x.fillRect(bx - 62, by + 79 + i * 4, 30, 2);                       // canos
  x.fillStyle = '#111'; x.fillRect(bx - 34 + (T * 3) % 12, by + 78, 2, 14);
  if (b.burst > 0 && b.t % 5 < 2) glow(bx - 62, by + 85, 26, 'rgba(255,200,80,.9)');            // clarão
  if (low) glow(bx + 65, by + 60, 90, 'rgba(255,60,0,.35)');                                     // pegando fogo
}

function draw() {
  const L = LV[lv], s = SKY[lv], th = TH[lv];

  x.save();
  if (shake > 0) x.translate(R(-1, 1) * shake * .6, R(-1, 1) * shake * .6);   // tremor de tela

  /* ----- 8.1 FUNDO: céu, nuvens, montanhas, camada do meio e chão (vêm do cache) ----- */
  x.drawImage(BG.sky, -12, -12, W + 24, GY + 12);

  x.fillStyle = lv == 2 ? 'rgba(150,140,200,.25)' : lv == 3 ? 'rgba(60,20,20,.4)' : 'rgba(255,255,255,.55)';   // nuvens
  for (let i = 0; i < 6; i++) {
    const cxx = (((i * 230 - cam * .08 - T * (.15 + (i % 3) * .1)) % (W + 300)) + W + 300) % (W + 300) - 150;
    const cyy = 50 + (i * 53) % 130;
    x.beginPath();
    x.ellipse(cxx, cyy, 60, 16, 0, 0, 7);
    x.ellipse(cxx + 28, cyy - 10, 38, 14, 0, 0, 7);
    x.ellipse(cxx - 28, cyy - 6, 34, 12, 0, 0, 7);
    x.fill();
  }

  x.drawImage(BG.far, cam * .15, 0, W, GY, 0, 0, W, GY);   // montanhas (parallax lento)
  x.drawImage(BG.mid, cam * .4, 0, W, GY, 0, 0, W, GY);    // árvores/prédios (parallax médio)
  x.drawImage(BG.gnd, -12, GY, W + 24, H - GY + 12);       // chão

  /* ----- Tudo daqui pra baixo se move com a câmera ----- */
  x.save();
  x.translate(-cam, 0);

  // detalhes do chão (capim e pedrinhas): só a parte visível do cache
  x.drawImage(BG.det, cam, 0, W, BG.det.height, cam, GY - 12, W, BG.det.height);

  /* ----- 8.4 PLATAFORMAS ----- */
  for (const q of pl) {
    if (q.x > cam + W || q.x + q.w < cam) continue;      // fora da tela: não desenha
    x.fillStyle = 'rgba(0,0,0,.2)'; x.fillRect(q.x + 12, q.y + 12, 6, GY - q.y - 12);  // apoios
    x.fillRect(q.x + q.w - 18, q.y + 12, 6, GY - q.y - 12);
    x.fillStyle = th.plat;  x.fillRect(q.x, q.y, q.w, 14);
    x.fillStyle = 'rgba(255,255,255,.25)'; x.fillRect(q.x, q.y, q.w, 3);
    x.fillStyle = 'rgba(0,0,0,.3)'; x.fillRect(q.x, q.y + 11, q.w, 3);
    x.fillStyle = 'rgba(0,0,0,.35)';
    for (let rx = q.x + 8; rx < q.x + q.w; rx += 24) x.fillRect(rx, q.y + 6, 3, 3);   // rebites
  }

  /* ----- 8.5 INIMIGOS ----- */
  for (const e of E) {
    if (e.x < cam - 80 || e.x > cam + W + 80) continue;   // fora da tela: não desenha
    const d = Math.abs(p.x - e.x);
    soldier(e, PAL_E, d > 230 && d < 650, false);
  }

  /* ----- 8.5b CAIXAS DE MUNIÇÃO FORTE (brilhando e flutuando) ----- */
  for (const d of D) {
    if (d.x < cam - 40 || d.x > cam + W + 40) continue;
    const oy = Math.sin(T / 10) * 2;
    if (d.kind == 'life') {                          // VIDA: caixa branca com cruz vermelha
      glow(d.x + 8, d.y + 8 + oy, 30, 'rgba(80,255,120,.55)');
      x.fillStyle = '#0a5c2a'; x.fillRect(d.x - 2, d.y + oy - 2, d.w + 4, d.h + 4);
      x.fillStyle = '#f4f4f4'; x.fillRect(d.x, d.y + oy, d.w, d.h);
      x.fillStyle = '#e63946'; x.fillRect(d.x + 6, d.y + oy + 3, 4, 10); x.fillRect(d.x + 3, d.y + oy + 6, 10, 4);
    } else {                                         // MUNIÇÃO FORTE: caixa laranja
      glow(d.x + 8, d.y + 8 + oy, 30, 'rgba(255,159,28,.55)');
      x.fillStyle = '#7a3e00'; x.fillRect(d.x - 2, d.y + oy - 2, d.w + 4, d.h + 4);
      x.fillStyle = '#ff9f1c'; x.fillRect(d.x, d.y + oy, d.w, d.h);
      x.fillStyle = '#fff3b0';
      x.fillRect(d.x + 3, d.y + oy + 4, 2, 8); x.fillRect(d.x + 7, d.y + oy + 4, 2, 8); x.fillRect(d.x + 11, d.y + oy + 4, 2, 8);
    }
  }

  /* ----- 8.6 BOSS (cada fase tem o seu) ----- */
  if (boss.hp > 0) drawBoss();

  /* ----- 8.7 JOGADOR (pisca quando está invencível) ----- */
  if (!(p.inv > 0 && T % 6 < 3)) soldier(p, PAL_P, (K.KeyA || K.KeyD) && p.on, K.KeyW);

  /* ----- 8.8 BALAS com brilho e rastro ----- */
  for (const b of B) {
    const c = b.own ? (b.r > 3 ? '#ff9f1c' : '#ffe66d') : (b.g ? '#ffa94d' : '#ff4d6d');
    x.strokeStyle = c; x.globalAlpha = .4; x.lineWidth = b.r * 1.4;
    x.beginPath(); x.moveTo(b.x - b.vx * 1.8, b.y - b.vy * 1.8); x.lineTo(b.x, b.y); x.stroke();
    x.globalAlpha = 1;
    x.globalAlpha = .35; x.fillStyle = c;                // brilho barato (círculo maior transparente)
    x.beginPath(); x.arc(b.x, b.y, b.r * 2.2, 0, 7); x.fill();
    x.globalAlpha = 1;
    x.beginPath(); x.arc(b.x, b.y, b.r, 0, 7); x.fill();
  }

  /* ----- 8.8b PARTÍCULAS ----- */
  for (const q of PT) {
    x.globalAlpha = q.life / q.max; x.fillStyle = q.col;
    x.fillRect(q.x, q.y, q.s, q.s);
  }
  x.globalAlpha = 1;

  x.restore();   // fim do movimento de câmera

  // vinheta (escurece as bordas) e alerta de vida baixa
  x.drawImage(VIG, 0, 0);
  if (p.hp <= 2 && st == 'play') {
    x.fillStyle = 'rgba(255,0,0,' + (.1 + Math.sin(T / 8) * .07) + ')';
    x.fillRect(-20, -20, W + 40, H + 40);
  }
  x.restore();   // fim do tremor

  /* ----- 8.9 HUD (informações fixas na tela) ----- */
  x.fillStyle = 'rgba(0,0,0,.4)';                      // painel esquerdo
  x.beginPath(); x.roundRect(10, 10, 210, p.ammo > 0 ? 92 : 68, 10); x.fill();
  x.fillStyle = '#fff'; x.font = 'bold 14px system-ui'; x.textAlign = 'left';
  x.fillText('PONTOS  ' + score, 22, 32);
  for (let i = 0; i < 6; i++) heart(30 + i * 28, 42, 9, i < p.hp);
  if (p.ammo > 0) {
    x.fillStyle = '#ff9f1c'; x.fillText('MUNIÇÃO FORTE  ' + p.ammo, 22, 90);
  }

  x.textAlign = 'center'; x.font = 'bold 15px system-ui';        // nome da fase
  x.fillStyle = 'rgba(255,255,255,.85)'; x.fillText(L.name, W / 2, 28);

  if (boss.hp > 0 && p.x > boss.x0 - 700) {            // barra do boss
    x.fillStyle = 'rgba(0,0,0,.5)'; x.beginPath(); x.roundRect(W - 290, 14, 270, 30, 8); x.fill();
    x.fillStyle = 'rgba(255,255,255,.15)'; x.beginPath(); x.roundRect(W - 280, 28, 250, 10, 5); x.fill();
    const bw = 250 * Math.max(0, boss.hp) / boss.max;
    const bgr = x.createLinearGradient(W - 280, 0, W - 30, 0);
    bgr.addColorStop(0, '#7b2cbf'); bgr.addColorStop(1, '#ff4d6d');
    x.fillStyle = bgr; x.beginPath(); x.roundRect(W - 280, 28, bw, 10, 5); x.fill();
    x.fillStyle = '#fff'; x.font = 'bold 12px system-ui'; x.textAlign = 'left';
    x.fillText((lv == LV.length - 1 ? 'BOSS FINAL · ' : '') + L.bname, W - 280, 24);
    x.font = '12px system-ui'; x.fillStyle = 'rgba(255,255,255,.75)';
    x.fillText(L.hint, W - 280, 62);
  }

  if (end) {                                           // fase concluída
    x.textAlign = 'center'; x.font = 'bold 44px system-ui';
    x.shadowBlur = 20; x.shadowColor = '#000'; x.fillStyle = '#ffe66d';
    x.fillText('FASE CONCLUÍDA!', W / 2, H / 2 - 40);
    x.shadowBlur = 0;
  }
}


/* ---------------------------------------------------------------------
   9. TELAS DE TEXTO (início, game over e vitória)
   --------------------------------------------------------------------- */
function screen(t1, t2) {
  x.fillStyle = 'rgba(8,10,20,.78)';                   // escurece o fundo
  x.fillRect(0, 0, W, H);

  const gt = x.createLinearGradient(0, H / 2 - 90, 0, H / 2 - 20);   // título com degradê
  gt.addColorStop(0, '#fff6c2'); gt.addColorStop(1, '#ff9f1c');
  x.textAlign = 'center'; x.font = 'bold 64px system-ui';
  x.shadowBlur = 25; x.shadowColor = '#ff9f1c';
  x.fillStyle = gt; x.fillText(t1, W / 2, H / 2 - 30);
  x.shadowBlur = 0;

  x.font = '20px system-ui';                           // subtítulo piscando
  x.fillStyle = 'rgba(255,255,255,' + (.65 + Math.sin(Date.now() / 300) * .35) + ')';
  x.fillText(t2, W / 2, H / 2 + 20);

  if (t1 == 'COMANDO SELVA') {                         // controles na tela inicial
    x.font = '15px system-ui'; x.fillStyle = 'rgba(255,255,255,.6)';
    x.fillText('A / D mover  ·  W mirar pra cima  ·  S agachar  ·  ESPAÇO pular  ·  L atirar  ·  ESC pausar', W / 2, H / 2 + 70);
    x.fillText('Controle Xbox: analógico mover/mirar  ·  A pular  ·  X ou RT atirar  ·  Start pausar', W / 2, H / 2 + 96);
    x.fillStyle = padOn ? '#7dff9a' : 'rgba(255,255,255,.45)';
    x.fillText(padOn ? '● Controle conectado' : 'Conectou um controle? Aperte qualquer botão dele', W / 2, H / 2 + 126);
  }
}


/* ---------------------------------------------------------------------
   9b. MENU DE PAUSA (tecla ESC)
   --------------------------------------------------------------------- */
function pauseMenu() {
  x.fillStyle = 'rgba(8,10,20,.72)';
  x.fillRect(0, 0, W, H);
  x.textAlign = 'center'; x.font = 'bold 54px system-ui';
  x.shadowBlur = 20; x.shadowColor = '#ff9f1c'; x.fillStyle = '#ffe66d';
  x.fillText('PAUSADO', W / 2, H / 2 - 90);
  x.shadowBlur = 0;

  const items = ['Continuar', 'Reiniciar fase', 'Menu principal'];
  items.forEach((t, i) => {
    const y = H / 2 - 30 + i * 56, sel = i == menuIdx;
    x.fillStyle = sel ? 'rgba(255,159,28,.92)' : 'rgba(255,255,255,.1)';
    x.beginPath(); x.roundRect(W / 2 - 150, y, 300, 44, 10); x.fill();
    x.fillStyle = sel ? '#1a1000' : '#fff';
    x.font = 'bold 20px system-ui';
    x.fillText(t, W / 2, y + 29);
  });

  x.font = '14px system-ui'; x.fillStyle = 'rgba(255,255,255,.6)';
  x.fillText('W/S ou ↑/↓ escolher  ·  ENTER confirmar  ·  ESC continuar', W / 2, H / 2 + 170);
  x.fillText('Controle: direcional ↑/↓ escolher  ·  A confirmar  ·  B ou Start continuar', W / 2, H / 2 + 194);
}

// Executa a opção escolhida no menu de pausa
function menuSelect() {
  K.Enter = 0; K.Space = 0;
  if (menuIdx == 0) st = 'play';                          // continuar
  else if (menuIdx == 1) { init(); st = 'play'; }         // reiniciar a fase
  else { lv = 0; score = 0; init(); st = 'title'; }       // voltar ao início
}


/* ---------------------------------------------------------------------
   10. LOOP PRINCIPAL (roda o jogo continuamente)
   --------------------------------------------------------------------- */
let last = 0, acc = 0;
const STEP = 1000 / 60;                      // a lógica roda sempre a 60 passos por segundo
function loop(now) {
  now = now || performance.now();
  pollPad();                                 // lê o controle de Xbox
  acc += Math.min(now - last, 100); last = now;
  let n = 0;
  while (acc >= STEP && n++ < 4) {           // recupera quadros perdidos: o jogo não fica lento
    if (st == 'play') update();
    acc -= STEP;
  }
  if (acc > STEP) acc = 0;

  // Sempre desenha a cena
  draw();

  // Mostra a tela correspondente ao estado
  if (st == 'title') screen('COMANDO SELVA', 'Pressione ESPAÇO ou ENTER para começar');
  if (st == 'over')  screen('GAME OVER', 'Pontos: ' + score + ' · ENTER para tentar de novo');
  if (st == 'win')   screen('VITÓRIA!', 'Você derrotou o boss final! Pontos: ' + score + ' · ENTER para jogar de novo');

  if (st == 'pause') pauseMenu();

  // Iniciar / reiniciar com ENTER (ou ESPAÇO na tela inicial)
  if (st != 'play' && st != 'pause' && (K.Enter || (st == 'title' && K.Space))) {
    K.Enter = 0; K.Space = 0;
    lv = st == 'over' ? lv : 0;            // game over: repete a fase | senão: volta à fase 1
    if (st != 'over') score = 0;
    init();
    st = 'play';
  }

  requestAnimationFrame(loop);             // chama o loop de novo no próximo frame
}


/* ---------------------------------------------------------------------
   11. INÍCIO DO JOGO
   --------------------------------------------------------------------- */
init();   // prepara a fase 1
loop();   // começa o loop