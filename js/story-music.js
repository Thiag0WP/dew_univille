// =====================================================================
// story-music.js — música da soundbar e visualizador (passos 4 e 5)
// =====================================================================
// Passos 4 e 5 da história: a soundbar toca uma música e a TV vira um visualizador.
// A música é criada na hora com a Web Audio API (sem arquivo de áudio):
// pads, baixo, bateria e um arpejo, em loop de 4 compassos.
//
// Como a Web Audio API funciona (resumo):
//   - Tudo acontece dentro de um AudioContext (o "estúdio").
//   - Criamos "nós" (nodes) e ligamos um no outro com connect(), como cabos:
//       oscilador (gera o som) -> filtro (muda o timbre) -> volume -> caixa de som
//   - Os horários são em segundos no relógio do áudio (audio.currentTime),
//     então dá para agendar notas no futuro com precisão.
//
// Este arquivo só é carregado na página inicial (products.html).
// Ele não conversa diretamente com o main.js: ele "observa" o atributo
// data-step da TV, que o main.js muda conforme a rolagem.

// Função que se executa sozinha: as variáveis daqui não vazam para fora.
(function () {
  const storyVisual = document.querySelector('.story-visual');
  // navegadores antigos do Safari usavam o nome webkitAudioContext
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  // sem a história na página ou sem suporte a áudio: não faz nada
  if (!storyVisual || !AudioContextClass) return;

  // elementos da página usados aqui
  const canvas = storyVisual.querySelector('.music-canvas');
  // "draw2d" é o pincel do canvas (contexto 2D) do visualizador
  const draw2d = canvas.getContext('2d');
  const soundbar = storyVisual.querySelector('.soundbar');
  const button = storyVisual.querySelector('.music-toggle');
  const buttonIcon = button.querySelector('.music-icon');
  const buttonText = button.querySelector('.music-text');
  const story = document.querySelector('.story-inner');
  // "reduzir movimento" do sistema: sem ondas saindo da soundbar
  const noMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- A música ----------
  // BPM = batidas por minuto (o andamento da música)
  const BPM = 96;
  // 60 / BPM = duração de uma batida em segundos; / 4 = semicolcheia
  const STEP = 60 / BPM / 4;   // duração de uma semicolcheia (16 por compasso)

  // Lá menor 7, Fá maior 7, Dó maior 7, Sol 6 (notas MIDI)
  // Notas MIDI são números: 60 = Dó central, cada +1 é meio tom acima,
  // +12 é a mesma nota uma oitava acima. "bass" é a nota do baixo e
  // "notes" são as notas do acorde. Cada acorde dura um compasso.
  const CHORDS = [
    { bass: 45, notes: [57, 60, 64, 67] },
    { bass: 41, notes: [53, 57, 60, 64] },
    { bass: 48, notes: [55, 59, 60, 64] },
    { bass: 43, notes: [55, 59, 62, 64] }
  ];
  // ordem em que as notas do acorde são tocadas no arpejo
  // (uma para cada semicolcheia do compasso; o número é a posição em "notes")
  const ARPEGGIO = [0, 1, 2, 3, 2, 1, 0, 2, 1, 3, 2, 0, 3, 2, 1, 2];

  // Nós de áudio. Ficam vazios até a primeira vez que a música tocar,
  // porque o navegador só deixa criar o som depois de um clique.
  let audio = null;            // o AudioContext
  let master;                  // volume geral (usado para o fade in/out)
  let analyser;                // "ouve" a música para o visualizador
  let reverb;                  // eco de sala grande
  let echo;                    // eco repetido no tempo da música (delay)
  let noise;                   // ruído branco (bateria)
  let scheduler = 0;           // setInterval que agenda as notas
  let stopTimer = 0;           // setTimeout que desliga o áudio após o fade
  let nextTime = 0;            // horário (no relógio do áudio) da próxima nota
  let stepCount = 0;           // quantas semicolcheias já foram agendadas
  let kicks = [];              // horários dos bumbos (para as ondas da soundbar)
  let playing = false;         // está tocando agora?
  let wanted = true;           // false quando a pessoa pausa: não toca sozinho de novo

  // Converte nota MIDI em frequência (Hz). A nota 69 é o Lá de 440 Hz;
  // cada oitava acima dobra a frequência (2 elevado a "oitavas").
  function frequency(note) {
    return 440 * Math.pow(2, (note - 69) / 12);
  }

  // ruído branco, usado na caixa e no chimbal
  // É 1 segundo de números aleatórios entre -1 e 1: soa como um chiado.
  // Filtrando esse chiado, sai o som da caixa e do chimbal da bateria.
  function makeNoise() {
    const buffer = audio.createBuffer(1, audio.sampleRate, audio.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  // "sala" artificial para o reverb: ruído que vai sumindo
  // O ConvolverNode "imita" uma sala usando a gravação de como ela ecoa.
  // Em vez de uma gravação, geramos um ruído que diminui até sumir em
  // "seconds" segundos (decay controla a rapidez). Dois canais = estéreo.
  function makeImpulse(seconds, decay) {
    const length = Math.floor(audio.sampleRate * seconds);
    const buffer = audio.createBuffer(2, length, audio.sampleRate);
    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
      }
    }
    return buffer;
  }

  // Monta o "estúdio": cria o AudioContext e liga os cabos principais.
  //   instrumentos -> master -> compressor -> analyser -> caixas de som
  //   instrumentos -> reverb -> master
  //   arpejo -> echo -> master
  function setupAudio() {
    audio = new AudioContextClass();

    // começa com volume 0 e sobe no play() (fade in)
    master = audio.createGain();
    master.gain.value = 0;
    // o compressor segura os picos de volume, deixando o som mais "encorpado"
    const compressor = audio.createDynamicsCompressor();
    compressor.threshold.value = -16;
    compressor.ratio.value = 4;
    // o analyser não muda o som: ele só mede as frequências para o desenho.
    // fftSize 256 = 128 faixas de frequência (do grave ao agudo)
    analyser = audio.createAnalyser();
    analyser.fftSize = 256;
    // suaviza os valores entre um quadro e outro (barras menos "tremidas")
    analyser.smoothingTimeConstant = 0.78;
    master.connect(compressor);
    compressor.connect(analyser);
    analyser.connect(audio.destination);

    // reverb de 2,8 segundos, entrando com 32% do volume
    reverb = audio.createConvolver();
    reverb.buffer = makeImpulse(2.8, 2.6);
    const reverbVolume = audio.createGain();
    reverbVolume.gain.value = 0.32;
    reverb.connect(reverbVolume);
    reverbVolume.connect(master);

    // eco no tempo da música (3 semicolcheias)
    // feedback devolve 32% do eco para dentro dele mesmo, então cada
    // repetição sai mais baixa que a anterior até sumir
    echo = audio.createDelay(1);
    echo.delayTime.value = STEP * 3;
    const feedback = audio.createGain();
    feedback.gain.value = 0.32;
    const echoVolume = audio.createGain();
    echoVolume.gain.value = 0.22;
    echo.connect(feedback);
    feedback.connect(echo);
    echo.connect(echoVolume);
    echoVolume.connect(master);

    noise = makeNoise();
  }

  // envelope de volume: sobe em "attack" e some até "end"
  // Todo instrumento precisa de um envelope, senão o som começaria e
  // terminaria de repente (com um "clique"). As rampas "exponential" soam
  // naturais ao ouvido; elas não aceitam 0, por isso usamos 0.0001.
  function envelope(time, peak, attack, end) {
    const gain = audio.createGain();
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(peak, time + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, end);
    return gain;
  }

  // Pad: o "colchão" de acordes, suave e longo.
  // Cada nota do acorde usa 2 osciladores "dente de serra" levemente
  // desafinados (-7 e +7 cents), o que dá um som cheio, tipo coral.
  // O filtro passa-baixa vai abrindo (700 -> 1500 Hz) e o som "cresce".
  function pad(chord, time, duration) {
    const filter = audio.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(700, time);
    filter.frequency.linearRampToValueAtTime(1500, time + duration);
    // ataque lento (0,7s) para entrar devagar
    const gain = envelope(time, 0.03, 0.7, time + duration + 0.8);
    filter.connect(gain);
    gain.connect(master);
    gain.connect(reverb);

    chord.notes.forEach(function (note) {
      [-7, 7].forEach(function (detune) {
        const osc = audio.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.value = frequency(note);
        osc.detune.value = detune;
        osc.connect(filter);
        // start/stop agendam o início e o fim da nota
        osc.start(time);
        osc.stop(time + duration + 0.9);
      });
    });
  }

  // Baixo: uma onda senoidal (grave puro) + uma triangular (um pouco mais
  // de corpo), com filtro deixando passar só os graves (até 420 Hz).
  function bass(note, time, duration) {
    const filter = audio.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 420;
    const gain = envelope(time, 0.3, 0.015, time + duration);
    filter.connect(gain);
    gain.connect(master);

    ['sine', 'triangle'].forEach(function (type) {
      const osc = audio.createOscillator();
      osc.type = type;
      osc.frequency.value = frequency(note);
      osc.connect(filter);
      osc.start(time);
      osc.stop(time + duration + 0.05);
    });
  }

  // Bumbo: uma onda senoidal que despenca de 150 Hz para 42 Hz bem rápido
  // (0,16s). É essa queda que faz o "tum" característico.
  function kick(time) {
    const osc = audio.createOscillator();
    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(42, time + 0.16);
    const gain = envelope(time, 0.9, 0.004, time + 0.42);
    osc.connect(gain);
    gain.connect(master);
    osc.start(time);
    osc.stop(time + 0.45);
    // guarda o horário para a soundbar soltar uma onda nesse momento
    kicks.push(time);
  }

  // Caixa e chimbal: um pedaço do ruído branco com filtro.
  //   type/cutoff: 'bandpass' 1800 Hz = caixa; 'highpass' 7500 Hz = chimbal
  //   peak = volume, length = duração, wet = se vai para o reverb
  function noiseHit(time, type, cutoff, peak, length, wet) {
    const source = audio.createBufferSource();
    source.buffer = noise;
    const filter = audio.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = cutoff;
    const gain = envelope(time, peak, 0.002, time + length);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    if (wet) gain.connect(reverb);
    source.start(time);
    source.stop(time + length + 0.02);
  }

  // Arpejo: notas curtas ("pluck", como uma corda beliscada) com onda
  // triangular, mandadas também para o eco e o reverb.
  function pluck(note, time, volume) {
    const osc = audio.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = frequency(note);
    const gain = envelope(time, volume, 0.005, time + 0.45);
    osc.connect(gain);
    gain.connect(master);
    gain.connect(echo);
    gain.connect(reverb);
    osc.start(time);
    osc.stop(time + 0.5);
  }

  // toca uma semicolcheia; a bateria só entra depois de 2 compassos de introdução
  // count = número da semicolcheia desde o início; time = quando tocar
  function playStep(count, time) {
    // posição dentro do compasso (0 a 15)
    const position = count % 16;
    // acorde do compasso atual (os 4 acordes se repetem em loop)
    const chord = CHORDS[Math.floor(count / 16) % CHORDS.length];
    // 32 semicolcheias = 2 compassos de introdução sem bateria
    const drums = count >= 32;

    // início do compasso: novo acorde e nota longa do baixo
    if (position === 0) {
      pad(chord, time, STEP * 16);
      bass(chord.bass, time, STEP * 6);
    }
    // baixo repetindo a nota (e uma oitava acima na posição 10) para dar ritmo
    if (position === 6 || position === 14) bass(chord.bass, time, STEP * 2);
    if (position === 10) bass(chord.bass + 12, time, STEP * 2);

    if (drums) {
      // bumbo nas posições 0, 8 e 10
      if (position === 0 || position === 8 || position === 10) kick(time);
      // caixa nos tempos 2 e 4 (posições 4 e 12)
      if (position === 4 || position === 12) noiseHit(time, 'bandpass', 1800, 0.32, 0.2, true);
      // chimbal a cada colcheia; mais forte no contratempo
      if (position % 2 === 0) noiseHit(time, 'highpass', 7500, position % 4 === 2 ? 0.08 : 0.04, 0.05, false);
    }

    // arpejo em toda semicolcheia, uma oitava acima (+12),
    // mais forte nas posições pares para ter "balanço"
    pluck(chord.notes[ARPEGGIO[position]] + 12, time, position % 2 === 0 ? 0.09 : 0.05);
  }

  // agenda as notas um pouquinho à frente para o som não falhar
  // O setInterval do JavaScript não é preciso (pode atrasar alguns ms).
  // Então, a cada 25ms, agendamos no relógio do áudio (que é preciso)
  // todas as notas dos próximos 0,12 segundos.
  function schedule() {
    while (nextTime < audio.currentTime + 0.12) {
      playStep(stepCount, nextTime);
      nextTime += STEP;
      stepCount++;
    }
  }

  // Atualiza o botão e a classe "music-on" (o CSS usa para acender a soundbar
  // e parar o botão de pulsar)
  function updateButton() {
    storyVisual.classList.toggle('music-on', playing);
    button.setAttribute('aria-pressed', playing);
    buttonIcon.textContent = playing ? '❚❚' : '▶';
    buttonText.textContent = playing ? 'Pausar música' : 'Ouvir a soundbar';
  }

  function play() {
    if (playing) return;
    // primeira vez: monta o estúdio
    if (!audio) setupAudio();
    // se estava no meio de um fade de pausa, cancela o desligamento
    clearTimeout(stopTimer);

    // resume() liga o áudio; ele devolve uma Promise (o .then roda quando
    // terminar de ligar)
    audio.resume().then(function () {
      // o navegador pode bloquear o som até a pessoa tocar na página
      if (audio.state !== 'running' || playing) return;
      playing = true;
      // recomeça a música do início (com a introdução)
      stepCount = 0;
      kicks = [];
      nextTime = audio.currentTime + 0.05;
      // fade in: volume sobe de onde estiver até 0.8 em 1,5 segundo
      master.gain.cancelScheduledValues(audio.currentTime);
      master.gain.setValueAtTime(master.gain.value, audio.currentTime);
      master.gain.linearRampToValueAtTime(0.8, audio.currentTime + 1.5);
      clearInterval(scheduler);
      scheduler = setInterval(schedule, 25);
      schedule();
      updateButton();
    });
  }

  // a música some devagar em vez de cortar
  function pause() {
    if (!playing) return;
    playing = false;
    updateButton();
    // fade out: o volume cai até 0 de forma suave
    master.gain.cancelScheduledValues(audio.currentTime);
    master.gain.setTargetAtTime(0, audio.currentTime, 0.25);
    // depois do fade, para de agendar notas e "desliga" o áudio
    // (suspend economiza processamento e bateria)
    clearTimeout(stopTimer);
    stopTimer = setTimeout(function () {
      clearInterval(scheduler);
      audio.suspend();
    }, 1200);
  }

  // botão "Ouvir a soundbar" / "Pausar música"
  button.addEventListener('click', function () {
    // lembra a escolha: se pausou, não volta a tocar sozinho
    wanted = !playing;
    if (playing) pause();
    else play();
  });

  // ---------- Quando tocar ----------
  // a história está aparecendo na tela?
  let storyVisible = false;

  // true nos passos que têm música (4 e 5)
  function musicStep() {
    const step = storyVisual.dataset.step;
    return step === '4' || step === '5';
  }

  // o navegador só deixa tocar som depois que a pessoa já clicou/tocou na página
  // navigator.userActivation.hasBeenActive diz se já houve um clique/toque.
  // Navegadores sem esse recurso: tentamos tocar mesmo assim (o play()
  // confere se o áudio realmente ligou).
  function canAutoplay() {
    return !navigator.userActivation || navigator.userActivation.hasBeenActive;
  }

  // Decide o que fazer sempre que o passo muda ou a história entra/sai da tela
  function update() {
    if (musicStep() && storyVisible) {
      startDrawing();
      if (wanted && canAutoplay()) play();
    } else {
      pause();
      stopDrawing();
    }
  }

  // a TV avisa a troca de passo mudando o data-step
  // MutationObserver chama update() toda vez que o atributo data-step muda
  new MutationObserver(update).observe(storyVisual, { attributes: true, attributeFilter: ['data-step'] });

  // pausa quando a história sai da tela
  new IntersectionObserver(function (entries) {
    storyVisible = entries[0].isIntersecting;
    update();
  }).observe(story);

  // trocou de aba ou minimizou: pausa; voltou: decide de novo
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) pause();
    else update();
  });

  // ---------- Visualizador na tela da TV ----------
  // 128 números de 0 a 255: o volume de cada faixa de frequência
  // (bins[0] = mais grave ... bins[127] = mais agudo)
  const bins = new Uint8Array(128);
  let frame = 0;               // número do requestAnimationFrame
  let beat = 0;                // força do grave agora (0 a 1), suavizada
  let width = 0;
  let height = 0;

  // Ajusta a resolução do canvas ao tamanho na tela (nítido em telas retina,
  // no máximo 2x). Mesma ideia do resize() da tela de pixels no main.js.
  function resize() {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    draw2d.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  // cada barra usa uma faixa de frequência (mais detalhe nos graves)
  // A potência 1.5 faz as primeiras barras pegarem faixas vizinhas (graves,
  // onde a música tem mais coisa) e as últimas pularem faixas (agudos).
  function binFor(i, total) {
    return 1 + Math.floor(Math.pow(i / total, 1.5) * 70);
  }

  // Desenha uma barra com as pontas arredondadas.
  // roundRect é recente; navegadores antigos ganham um retângulo comum.
  function roundBar(x, y, w, h) {
    draw2d.beginPath();
    if (draw2d.roundRect) draw2d.roundRect(x, y, w, h, w / 2);
    else draw2d.rect(x, y, w, h);
    draw2d.fill();
  }

  // passo 4: barras espelhadas a partir do centro, com reflexo
  function drawBars(now) {
    // 28 barras para cada lado
    const total = 28;
    // espaço de cada barra e largura dela (62% do espaço; o resto é vão)
    const gap = width / (total * 2);
    const barWidth = gap * 0.62;
    // linha do "chão" das barras (64% da altura); o reflexo fica abaixo dela
    const base = height * 0.64;

    for (let i = 0; i < total; i++) {
      // volume da faixa de 0 a 1
      const value = bins[binFor(i, total)] / 255;
      // altura mínima de 3px para a barra nunca sumir
      const barHeight = Math.max(3, value * height * 0.52);
      // cor em HSL: o "hue" (matiz) vai do azul (210) ao rosa (340) do centro
      // para fora, e oscila um pouco com o tempo (Math.sin(now / 2000))
      const hue = 210 + (i / total) * 130 + Math.sin(now / 2000) * 15;
      // barras mais altas ficam mais claras
      draw2d.fillStyle = 'hsl(' + hue + ', 95%, ' + (52 + value * 18) + '%)';

      // a mesma barra à direita e à esquerda do centro (espelho)
      [width / 2 + i * gap, width / 2 - (i + 1) * gap].forEach(function (x) {
        const left = x + (gap - barWidth) / 2;
        draw2d.globalAlpha = 1;
        roundBar(left, base - barHeight, barWidth, barHeight);
        // reflexo: mais baixo e bem transparente, embaixo da linha
        draw2d.globalAlpha = 0.18;
        roundBar(left, base + 3, barWidth, barHeight * 0.45);
      });
    }
    draw2d.globalAlpha = 1;
  }

  // passo 5: anel de frequências girando em volta do "Pronto!"
  function drawRing(now) {
    // 72 risquinhos em volta do círculo
    const total = 72;
    const size = Math.min(width, height);
    // o anel "pulsa" um pouco com o grave
    const radius = size * 0.27 * (1 + beat * 0.08);
    // centro da tela
    const cx = width / 2;
    const cy = height / 2;

    draw2d.lineCap = 'round';
    // espessura: metade do espaço entre um risco e outro
    draw2d.lineWidth = Math.max(2, (Math.PI * 2 * radius / total) * 0.5);
    for (let i = 0; i < total; i++) {
      // espelhado para o anel ficar simétrico
      const half = i < total / 2 ? i : total - i;
      const value = bins[binFor(half, total / 2)] / 255;
      // ângulo do risco; o "+ now / 6000" faz o anel girar devagar
      const angle = (i / total) * Math.PI * 2 + now / 6000;
      // tamanho do risco conforme o volume da faixa
      const length = 3 + value * size * 0.2;
      // arco-íris em volta do anel, girando as cores com o tempo
      draw2d.strokeStyle = 'hsl(' + ((i / total) * 360 + now / 30) % 360 + ', 90%, 62%)';
      // cos/sin transformam o ângulo em posição no círculo:
      // o risco vai da borda do anel (radius) para fora (radius + length)
      draw2d.beginPath();
      draw2d.moveTo(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
      draw2d.lineTo(cx + Math.cos(angle) * (radius + length), cy + Math.sin(angle) * (radius + length));
      draw2d.stroke();
    }
  }

  // anel de onda saindo da soundbar
  // Cria um <span class="sound-ring">; o CSS anima ele crescendo e sumindo.
  // Quando a animação acaba (animationend), o elemento é removido.
  function ring() {
    const el = document.createElement('span');
    el.className = 'sound-ring';
    el.addEventListener('animationend', function () { el.remove(); });
    soundbar.appendChild(el);
  }

  // Desenha um quadro do visualizador (chamada ~60 vezes por segundo)
  function render(now) {
    if (canvas.clientWidth !== width || canvas.clientHeight !== height) resize();

    if (playing) {
      // preenche "bins" com o volume atual de cada frequência
      analyser.getByteFrequencyData(bins);
    } else {
      // sem som: as barras "respiram" devagar
      // (uma onda de seno inventada, mais baixa nos agudos)
      for (let i = 0; i < bins.length; i++) {
        bins[i] = (0.18 + 0.12 * Math.sin(now / 700 + i * 0.35)) * 255 * (1 - i / 140);
      }
    }

    // grave (para a luz ambiente pulsar) e volume geral
    let low = 0;
    let all = 0;
    // faixas 1 a 5 = graves (bumbo e baixo)
    for (let i = 1; i <= 5; i++) low += bins[i];
    for (let i = 0; i < 64; i++) all += bins[i];
    // média dos graves de 0 a 1; a potência 2.2 deixa só as batidas fortes
    // "acenderem" bastante. Parado, fica fixo em 0.15.
    const target = playing ? Math.pow(low / (5 * 255), 2.2) : 0.15;
    // anda 35% do caminho a cada quadro: pulso rápido, mas sem tremer
    beat += (target - beat) * 0.35;
    // passa os valores para o CSS como variáveis (--beat, --level, --hue);
    // o CSS usa para a luz ambiente e a faixa de luz da soundbar
    storyVisual.style.setProperty('--beat', beat.toFixed(3));
    storyVisual.style.setProperty('--level', (all / (64 * 255)).toFixed(3));
    // --hue gira de 0 a 360 graus: as cores da luz ambiente vão rodando
    storyVisual.style.setProperty('--hue', ((now / 40) % 360).toFixed(1) + 'deg');

    // solta uma onda na soundbar para cada bumbo que já tocou
    if (playing && !noMotion) {
      while (kicks.length && kicks[0] <= audio.currentTime) {
        kicks.shift();
        ring();
      }
    }

    // fundo escuro com um brilho no centro que acompanha o grave
    draw2d.globalCompositeOperation = 'source-over';
    draw2d.fillStyle = '#05060b';
    draw2d.fillRect(0, 0, width, height);
    const glow = draw2d.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, width * 0.6);
    glow.addColorStop(0, 'rgba(70, 90, 255, ' + (0.12 + beat * 0.3) + ')');
    glow.addColorStop(1, 'rgba(70, 90, 255, 0)');
    draw2d.fillStyle = glow;
    draw2d.fillRect(0, 0, width, height);

    // 'lighter' soma as cores: onde as barras se encostam, fica mais claro (brilho)
    draw2d.globalCompositeOperation = 'lighter';
    if (storyVisual.dataset.step === '5') drawRing(now);
    else drawBars(now);
    draw2d.globalCompositeOperation = 'source-over';

    frame = requestAnimationFrame(render);
  }

  // liga o desenho (se ainda não estiver ligado)
  function startDrawing() {
    if (!frame) frame = requestAnimationFrame(render);
  }

  // desliga o desenho (fora dos passos 4 e 5 não precisa gastar processamento)
  function stopDrawing() {
    cancelAnimationFrame(frame);
    frame = 0;
  }
})();
