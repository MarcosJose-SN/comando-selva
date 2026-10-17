# 🪖 Comando Selva

Jogo de tiro 2D de rolagem lateral, no estilo *run and gun* (Contra / Metal Slug), feito com **HTML5, CSS3 e JavaScript puro**. Você controla um soldado armado com um fuzil M4, enfrenta inimigos em **5 fases** e derrota um **boss diferente em cada uma**.

![HTML5](https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=black)
![Sem dependências](https://img.shields.io/badge/depend%C3%AAncias-nenhuma-brightgreen)

<!--
Adicione prints do jogo aqui (crie a pasta docs/ e coloque as imagens):
![Gameplay](docs/gameplay.png)
-->

## 📋 Índice

- [Recursos](#-recursos)
- [Requisitos](#-requisitos)
- [Como rodar](#-como-rodar)
- [Controles](#-controles)
- [Fases e bosses](#-fases-e-bosses)
- [Itens](#-itens)
- [Estrutura do projeto](#-estrutura-do-projeto)
- [Como o código está organizado](#-como-o-código-está-organizado)
- [Personalização](#-personalização)
- [Solução de problemas](#-solução-de-problemas)
- [Publicar no GitHub Pages](#-publicar-no-github-pages)
- [Ideias para o futuro](#-ideias-para-o-futuro)

## ✨ Recursos

- 5 fases com cenários próprios: selva, deserto, cidade noturna, fortaleza e base militar.
- 5 bosses com ataques diferentes: robô, helicóptero, tanque, super tanque e robô de guerra.
- Soldado com fuzil **M4** desenhado por código (mira holográfica, carregador, recuo e clarão do tiro).
- Munição forte e vidas que caem dos inimigos derrotados.
- Menu de pausa, partículas, tremor de tela e fundo com efeito parallax.
- Suporte a **teclado** e a **controle de Xbox**, inclusive com vibração.
- Nenhuma imagem, biblioteca ou build: todo o visual é desenhado no `<canvas>`.

## 🧰 Requisitos

Só um navegador atual: **Chrome, Edge, Firefox ou Safari** (versões de 2023 em diante).

> O jogo usa `roundRect` do Canvas, que exige Chrome/Edge 99+, Firefox 112+ ou Safari 16+.

Para editar o código, recomendamos o **VS Code** com a extensão **Live Server**.

## 🚀 Como rodar

Os três arquivos (`index.html`, `style.css` e `game.js`) precisam ficar **na mesma pasta**.

### Opção 1: duplo clique (a mais simples)

1. Baixe ou clone o projeto.
2. Dê dois cliques em **`index.html`**.
3. O jogo abre no navegador. Clique na página e aperte **Espaço** ou **Enter** para começar.

### Opção 2: VS Code + Live Server (a melhor para editar)

1. Abra o VS Code e vá em **File > Open Folder**, escolhendo a pasta do jogo.
2. Instale a extensão **Live Server**, de Ritwick Dey, na aba de extensões.
3. Clique com o botão direito em `index.html` e escolha **Open with Live Server**.
4. O jogo abre em `http://127.0.0.1:5500` e recarrega sozinho toda vez que você salva uma alteração.

### Opção 3: servidor local pelo terminal

Dentro da pasta do projeto, use uma destas opções.

Com Python:

```bash
python -m http.server 8000
```

Com Node.js:

```bash
npx serve
```

Depois abra `http://localhost:8000` (ou o endereço que o terminal mostrar).

## 🎮 Controles

### Teclado

| Tecla | Ação |
|---|---|
| **A** / **D** | Andar para a esquerda / direita |
| **W** | Mirar para cima (segure e atire) |
| **S** | Agachar |
| **Espaço** | Pular |
| **L** | Atirar |
| **ESC** | Pausar / continuar |
| **Enter** | Confirmar no menu, ou reiniciar no Game Over |

No menu de pausa, use **W/S** (ou **↑/↓**) para escolher e **Enter** para confirmar.

### Controle de Xbox

| Botão | Ação |
|---|---|
| Analógico esquerdo ou direcional **← →** | Andar |
| Analógico ou direcional **↑** | Mirar para cima |
| Analógico ou direcional **↓** | Agachar |
| **A** | Pular |
| **X**, **B**, **RB** ou **RT** | Atirar |
| **Start** | Pausar / continuar |

No menu de pausa: direcional **↑/↓** escolhe, **A** confirma, **B** ou **Start** continua.

> Conecte o controle (USB ou Bluetooth) e **aperte qualquer botão** nele. Os navegadores só reconhecem o controle depois disso. A tela inicial mostra **● Controle conectado** quando ele é detectado.

## 🗺️ Fases e bosses

| Fase | Cenário | Boss | Como derrotar |
|---|---|---|---|
| 1 | Selva | **Robô Guardião** | Pule para desviar dos tiros em leque. |
| 2 | Deserto | **Helicóptero de Ataque** | Ele voa alto: segure **W** e atire para cima. Cuidado com as bombas. |
| 3 | Cidade Noturna | **Tanque de Guerra** | Agache (**S**) ou pule para desviar do canhão. |
| 4 | Fortaleza | **Super Tanque** | Tem canhão duplo e granadas em arco, e chama soldados. |
| 5 | Base Militar | **Robô de Guerra** (boss final) | Pule a onda de choque e desvie dos mísseis. |

Cada fase tem um número crescente de inimigos comuns. O boss só ataca quando você chega perto da arena final, e quanto menos vida ele tem, mais rápido ataca. Ao derrotá-lo, você passa para a próxima fase.

## 🎁 Itens

Os inimigos derrotados soltam caixas, de acordo com a ordem dos abates na fase:

| Abate | Item | Efeito |
|---|---|---|
| Par (2º, 4º, 6º...) | Caixa laranja de **munição forte** | +25 tiros de **3 de dano**, maiores e mais rápidos (máximo 99). |
| Ímpar (1º, 3º, 5º...) | Caixa branca com cruz vermelha de **vida** | +1 coração (máximo 6). |

A caixa de vida **só aparece se você perdeu vida**. Com a vida cheia, nada cai, e se você encher a vida antes de pegar uma caixa de vida que já estava no chão, ela some.

## 📁 Estrutura do projeto

```text
comando-selva/
├── index.html   # página com o <canvas> e o texto dos controles
├── style.css    # layout e tamanho da tela do jogo
├── game.js      # toda a lógica e o desenho do jogo
└── README.md    # este arquivo
```

## 🧩 Como o código está organizado

O `game.js` é dividido em seções numeradas e comentadas:

| Seção | Conteúdo |
|---|---|
| 1 | Configuração do canvas e constantes (`W`, `H`, `GY`) |
| 2 | Teclado e pausa |
| 2b | Controle de Xbox (Gamepad API) |
| 3 | Fases (`LV`), tamanho dos bosses (`BS`), céu (`SKY`) |
| 4 | Variáveis de estado do jogo |
| 5 | Funções auxiliares (colisão, tiros, dano) |
| 6 | `init()`: cria a fase (jogador, plataformas, inimigos e boss) |
| 7 | `update()`: a lógica do jogo, 60 vezes por segundo |
| 7b | `bossAI()`: o comportamento de cada boss |
| 8 | `draw()` e as funções de desenho (cenário, soldado, M4, bosses, HUD) |
| 9 / 9b | Telas de texto e menu de pausa |
| 10 | `loop()`: o ciclo principal |
| 11 | Início do jogo |

**Como funciona por dentro:**

- **Passo fixo de 60/s:** a lógica sempre roda a 60 passos por segundo, então o jogo tem a mesma velocidade em qualquer computador ou taxa de atualização do monitor.
- **Fundo em cache:** céu, montanhas, camada do meio e chão são desenhados **uma vez** por fase e depois só copiados na tela. Isso deixa o jogo leve.
- **Controle como teclas virtuais:** o controle de Xbox liga e desliga as mesmas teclas do teclado (`K.KeyA`, `K.Space`, `K.KeyL`...), então o resto do jogo não precisa saber qual dispositivo está sendo usado.

## 🔧 Personalização

| O que mudar | Onde |
|---|---|
| Vida do boss e quantidade de inimigos | `boss` e `n` em cada fase da lista `LV` (seção 3) |
| Tamanho da fase | `len` em `LV` |
| Vida do jogador | `hp: 6` em `init()` (seção 6) |
| Velocidade do tiro | `p.cd = ...` na seção 7 (menor = atira mais rápido) |
| Altura do pulo | `p.vy = -12.5` na seção 7 |
| Dano e munição da bala forte | `strong ? 3 : 1` (dano) e `p.ammo + 25` (seção 7) |
| Regra dos drops (par/ímpar) | procure por `DROP` na seção 7 |
| Velocidade de ataque dos bosses | `b.cd` de cada boss na seção 7b |
| Botões do controle | função `pollPad()` na seção 2b |
| Tamanho da tela | `W` e `H` no `game.js` e `width`/`height` do `<canvas>` no `index.html` (devem ser iguais) |

## 🩺 Solução de problemas

**A tela fica preta ou nada aparece**
- Confirme que `index.html`, `style.css` e `game.js` estão **na mesma pasta** e com **esses nomes exatos**.
- Abra o console do navegador (**F12 > Console**) e veja se há alguma mensagem de erro em vermelho.
- Se você editou o código, confira se não faltou alguma chave `}` ou parêntese.

**Alterei o código mas nada mudou**
- Recarregue ignorando o cache com **Ctrl + F5** (ou **Cmd + Shift + R** no Mac).
- Se usa o Live Server, confira se salvou o arquivo (**Ctrl + S**).

**O jogo aparece cortado ou esticado**
- `W` e `H` no `game.js` devem ser iguais ao `width` e `height` do `<canvas>` no `index.html` (hoje, 1000 × 600).

**O controle não responde**
- Aperte qualquer botão do controle com a página aberta.
- Use Chrome, Edge ou Firefox, com o controle já conectado antes de abrir o jogo.
- Teste os botões em [gamepad-tester.com](https://gamepad-tester.com).

**O jogo está lento**
- Ative a **aceleração de hardware** nas configurações do navegador e feche abas pesadas.
- Diminua a tela: em `game.js`, troque `W = 1000` e `H = 600` por `800` e `450`, e faça o mesmo no `<canvas>` do `index.html`.

**As teclas não funcionam**
- Clique uma vez dentro da página para ela receber o foco do teclado.
- Se o jogo pausou sozinho, é porque a janela perdeu o foco: aperte **ESC** para continuar.

## 🌐 Publicar no GitHub Pages

1. Crie um repositório no GitHub e envie os arquivos do projeto:

   ```bash
   git init
   git add .
   git commit -m "Comando Selva"
   git branch -M main
   git remote add origin https://github.com/<seu-usuario>/comando-selva.git
   git push -u origin main
   ```

2. No repositório, abra **Settings > Pages**.
3. Em **Branch**, escolha `main` e a pasta `/ (root)`, e clique em **Save**.
4. Em alguns minutos o jogo estará em `https://<seu-usuario>.github.io/comando-selva/`.

## 🔮 Ideias para o futuro

- Efeitos sonoros e música.
- Sprites em PNG no lugar do desenho por código.
- Tela de transição entre as fases e placar com a melhor pontuação.
- Mais armas e inimigos de tipos diferentes.
- Controles de toque para celular.

## 📄 Licença

Defina a licença do seu projeto (por exemplo, [MIT](https://choosealicense.com/licenses/mit/)).

---

Feito com HTML, CSS e JavaScript. 🎮
