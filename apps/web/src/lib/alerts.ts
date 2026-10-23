'use client';

/**
 * Avisos do fim do descanso: som (WebAudio), vibração e notificação do sistema
 * quando a aba está em segundo plano. Navegadores reduzem timers em abas
 * ocultas; ao voltar, o tempo é recalculado pelo timestamp do servidor.
 */
let ctx: AudioContext | null = null;

/** Precisa ser chamado num gesto do usuário (clique) para liberar o áudio. */
export function unlockAudio() {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
  } catch {
    ctx = null;
  }
}

function beep() {
  if (!ctx) return;
  const t = ctx.currentTime;
  for (const offset of [0, 0.22]) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, t + offset);
    gain.gain.exponentialRampToValueAtTime(0.25, t + offset + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + offset + 0.16);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t + offset);
    osc.stop(t + offset + 0.18);
  }
}

export function notifyRestOver(exerciseName: string) {
  beep();
  navigator.vibrate?.([200, 100, 200]);
  if (document.hidden && 'Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification('Descanso concluído', { body: `Próxima série: ${exerciseName}`, tag: 'forja-rest' });
    } catch {
      // Alguns navegadores móveis só permitem notificações via Service Worker.
    }
  }
}

export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!('Notification' in window)) return 'unsupported';
  if (Notification.permission !== 'default') return Notification.permission;
  return Notification.requestPermission();
}

/** Mantém a tela acesa durante o treino, quando suportado. Retorna a função de limpeza. */
export function keepScreenOn(): () => void {
  if (!('wakeLock' in navigator)) return () => {};
  let lock: WakeLockSentinel | null = null;
  const acquire = () => {
    if (document.visibilityState === 'visible') {
      navigator.wakeLock
        .request('screen')
        .then((l) => (lock = l))
        .catch(() => {});
    }
  };
  acquire();
  document.addEventListener('visibilitychange', acquire);
  return () => {
    document.removeEventListener('visibilitychange', acquire);
    void lock?.release().catch(() => {});
  };
}
