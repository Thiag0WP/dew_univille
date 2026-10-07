// Passos 4 e 5 da história: a soundbar toca uma música e a TV vira um visualizador.
// A música é criada na hora com a Web Audio API (sem arquivo de áudio):
// pads, baixo, bateria e um arpejo, em loop de 4 compassos.
(function () {
  const storyVisual = document.querySelector('.story-visual');
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!storyVisual || !AudioContextClass) return;

  const canvas = storyVisual.querySelector('.music-canvas');
  const draw2d = canvas.getContext('2d');
  const soundbar = storyVisual.querySelector('.soundbar');
  const button = storyVisual.querySelector('.music-toggle');
  const buttonIcon = button.querySelector('.music-icon');
  const buttonText = button.querySelector('.music-text');
  const story = document.querySelector('.story-inner');
  const noMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- A música ----------
  const BPM = 96;
  const STEP = 60 / BPM / 4;   // duração de uma semicolcheia (16 por compasso)

  // Lá menor 7, Fá maior 7, Dó maior 7, Sol 6 (notas MIDI)
  const CHORDS = [
    { bass: 45, notes: [57, 60, 64, 67] },
    { bass: 41, notes: [53, 57, 60, 64] },
    { bass: 48, notes: [55, 59, 60, 64] },
    { bass: 43, notes: [55, 59, 62, 64] }
  ];
  const ARPEGGIO = [0, 1, 2, 3, 2, 1, 0, 2, 1, 3, 2, 0, 3, 2, 1, 2];

  let audio = null;
  let master;
  let analyser;
  let reverb;
  let echo;
  let noise;
  let scheduler = 0;
  let stopTimer = 0;
  let nextTime = 0;
  let stepCount = 0;
  let kicks = [];
  let playing = false;
  let wanted = true;           // false quando a pessoa pausa: não toca sozinho de novo

  function frequency(note) {
    return 440 * Math.pow(2, (note - 69) / 12);
  }

  // ruído branco, usado na caixa e no chimbal
  function makeNoise() {
    const buffer = audio.createBuffer(1, audio.sampleRate, audio.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  // "sala" artificial para o reverb: ruído que vai sumindo
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

  function setupAudio() {
    audio = new AudioContextClass();

    master = audio.createGain();
    master.gain.value = 0;
    const compressor = audio.createDynamicsCompressor();
    compressor.threshold.value = -16;
    compressor.ratio.value = 4;
    analyser = audio.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.78;
    master.connect(compressor);
    compressor.connect(analyser);
    analyser.connect(audio.destination);

    reverb = audio.createConvolver();
    reverb.buffer = makeImpulse(2.8, 2.6);
    const reverbVolume = audio.createGain();
    reverbVolume.gain.value = 0.32;
    reverb.connect(reverbVolume);
    reverbVolume.connect(master);

    // eco no tempo da música (3 semicolcheias)
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
  function envelope(time, peak, attack, end) {
    const gain = audio.createGain();
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(peak, time + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, end);
    return gain;
  }

  function pad(chord, time, duration) {
    const filter = audio.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(700, time);
    filter.frequency.linearRampToValueAtTime(1500, time + duration);
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
        osc.start(time);
        osc.stop(time + duration + 0.9);
      });
    });
  }

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

  function kick(time) {
    const osc = audio.createOscillator();
    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(42, time + 0.16);
    const gain = envelope(time, 0.9, 0.004, time + 0.42);
    osc.connect(gain);
    gain.connect(master);
    osc.start(time);
    osc.stop(time + 0.45);
    kicks.push(time);
  }

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
  function playStep(count, time) {
    const position = count % 16;
    const chord = CHORDS[Math.floor(count / 16) % CHORDS.length];
    const drums = count >= 32;

    if (position === 0) {
      pad(chord, time, STEP * 16);
      bass(chord.bass, time, STEP * 6);
    }
    if (position === 6 || position === 14) bass(chord.bass, time, STEP * 2);
    if (position === 10) bass(chord.bass + 12, time, STEP * 2);

    if (drums) {
      if (position === 0 || position === 8 || position === 10) kick(time);
      if (position === 4 || position === 12) noiseHit(time, 'bandpass', 1800, 0.32, 0.2, true);
      if (position % 2 === 0) noiseHit(time, 'highpass', 7500, position % 4 === 2 ? 0.08 : 0.04, 0.05, false);
    }

    pluck(chord.notes[ARPEGGIO[position]] + 12, time, position % 2 === 0 ? 0.09 : 0.05);
  }

  // agenda as notas um pouquinho à frente para o som não falhar
  function schedule() {
    while (nextTime < audio.currentTime + 0.12) {
      playStep(stepCount, nextTime);
      nextTime += STEP;
      stepCount++;
    }
  }

  function updateButton() {
    storyVisual.classList.toggle('music-on', playing);
    button.setAttribute('aria-pressed', playing);
    buttonIcon.textContent = playing ? '❚❚' : '▶';
    buttonText.textContent = playing ? 'Pausar música' : 'Ouvir a soundbar';
  }

  function play() {
    if (playing) return;
    if (!audio) setupAudio();
    clearTimeout(stopTimer);

    audio.resume().then(function () {
      // o navegador pode bloquear o som até a pessoa tocar na página
      if (audio.state !== 'running' || playing) return;
      playing = true;
      stepCount = 0;
      kicks = [];
      nextTime = audio.currentTime + 0.05;
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
    master.gain.cancelScheduledValues(audio.currentTime);
    master.gain.setTargetAtTime(0, audio.currentTime, 0.25);
    clearTimeout(stopTimer);
    stopTimer = setTimeout(function () {
      clearInterval(scheduler);
      audio.suspend();
    }, 1200);
  }

  button.addEventListener('click', function () {
    wanted = !playing;
    if (playing) pause();
    else play();
  });

  // ---------- Quando tocar ----------
  let storyVisible = false;

  function musicStep() {
    const step = storyVisual.dataset.step;
    return step === '4' || step === '5';
  }

  // o navegador só deixa tocar som depois que a pessoa já clicou/tocou na página
  function canAutoplay() {
    return !navigator.userActivation || navigator.userActivation.hasBeenActive;
  }

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
  new MutationObserver(update).observe(storyVisual, { attributes: true, attributeFilter: ['data-step'] });

  // pausa quando a história sai da tela
  new IntersectionObserver(function (entries) {
    storyVisible = entries[0].isIntersecting;
    update();
  }).observe(story);

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) pause();
    else update();
  });

  // ---------- Visualizador na tela da TV ----------
  const bins = new Uint8Array(128);
  let frame = 0;
  let beat = 0;
  let width = 0;
  let height = 0;

  function resize() {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    draw2d.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  // cada barra usa uma faixa de frequência (mais detalhe nos graves)
  function binFor(i, total) {
    return 1 + Math.floor(Math.pow(i / total, 1.5) * 70);
  }

  function roundBar(x, y, w, h) {
    draw2d.beginPath();
    if (draw2d.roundRect) draw2d.roundRect(x, y, w, h, w / 2);
    else draw2d.rect(x, y, w, h);
    draw2d.fill();
  }

  // passo 4: barras espelhadas a partir do centro, com reflexo
  function drawBars(now) {
    const total = 28;
    const gap = width / (total * 2);
    const barWidth = gap * 0.62;
    const base = height * 0.64;

    for (let i = 0; i < total; i++) {
      const value = bins[binFor(i, total)] / 255;
      const barHeight = Math.max(3, value * height * 0.52);
      const hue = 210 + (i / total) * 130 + Math.sin(now / 2000) * 15;
      draw2d.fillStyle = 'hsl(' + hue + ', 95%, ' + (52 + value * 18) + '%)';

      [width / 2 + i * gap, width / 2 - (i + 1) * gap].forEach(function (x) {
        const left = x + (gap - barWidth) / 2;
        draw2d.globalAlpha = 1;
        roundBar(left, base - barHeight, barWidth, barHeight);
        draw2d.globalAlpha = 0.18;
        roundBar(left, base + 3, barWidth, barHeight * 0.45);
      });
    }
    draw2d.globalAlpha = 1;
  }

  // passo 5: anel de frequências girando em volta do "Pronto!"
  function drawRing(now) {
    const total = 72;
    const size = Math.min(width, height);
    const radius = size * 0.27 * (1 + beat * 0.08);
    const cx = width / 2;
    const cy = height / 2;

    draw2d.lineCap = 'round';
    draw2d.lineWidth = Math.max(2, (Math.PI * 2 * radius / total) * 0.5);
    for (let i = 0; i < total; i++) {
      // espelhado para o anel ficar simétrico
      const half = i < total / 2 ? i : total - i;
      const value = bins[binFor(half, total / 2)] / 255;
      const angle = (i / total) * Math.PI * 2 + now / 6000;
      const length = 3 + value * size * 0.2;
      draw2d.strokeStyle = 'hsl(' + ((i / total) * 360 + now / 30) % 360 + ', 90%, 62%)';
      draw2d.beginPath();
      draw2d.moveTo(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
      draw2d.lineTo(cx + Math.cos(angle) * (radius + length), cy + Math.sin(angle) * (radius + length));
      draw2d.stroke();
    }
  }

  // anel de onda saindo da soundbar
  function ring() {
    const el = document.createElement('span');
    el.className = 'sound-ring';
    el.addEventListener('animationend', function () { el.remove(); });
    soundbar.appendChild(el);
  }

  function render(now) {
    if (canvas.clientWidth !== width || canvas.clientHeight !== height) resize();

    if (playing) {
      analyser.getByteFrequencyData(bins);
    } else {
      // sem som: as barras "respiram" devagar
      for (let i = 0; i < bins.length; i++) {
        bins[i] = (0.18 + 0.12 * Math.sin(now / 700 + i * 0.35)) * 255 * (1 - i / 140);
      }
    }

    // grave (para a luz ambiente pulsar) e volume geral
    let low = 0;
    let all = 0;
    for (let i = 1; i <= 5; i++) low += bins[i];
    for (let i = 0; i < 64; i++) all += bins[i];
    const target = playing ? Math.pow(low / (5 * 255), 2.2) : 0.15;
    beat += (target - beat) * 0.35;
    storyVisual.style.setProperty('--beat', beat.toFixed(3));
    storyVisual.style.setProperty('--level', (all / (64 * 255)).toFixed(3));
    storyVisual.style.setProperty('--hue', ((now / 40) % 360).toFixed(1) + 'deg');

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

    draw2d.globalCompositeOperation = 'lighter';
    if (storyVisual.dataset.step === '5') drawRing(now);
    else drawBars(now);
    draw2d.globalCompositeOperation = 'source-over';

    frame = requestAnimationFrame(render);
  }

  function startDrawing() {
    if (!frame) frame = requestAnimationFrame(render);
  }

  function stopDrawing() {
    cancelAnimationFrame(frame);
    frame = 0;
  }
})();
