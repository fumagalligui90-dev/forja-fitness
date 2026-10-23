import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

/**
 * Notificação LOCAL do fim do descanso: agendada no próprio aparelho para o
 * horário em que o descanso termina, então toca mesmo com o app minimizado ou
 * a tela bloqueada. Não usa push nem servidor.
 */
const supported = Platform.OS === 'ios' || Platform.OS === 'android';
const CHANNEL = 'rest-timer';

export async function setupNotifications() {
  if (!supported) return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL, {
      name: 'Fim do descanso',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 150, 250],
      sound: 'default',
    });
  }
}

/** Pede permissão só quando o usuário vai de fato usar o descanso. */
export async function ensureNotificationPermission(): Promise<boolean> {
  if (!supported) return false;
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const req = await Notifications.requestPermissionsAsync();
  return req.granted;
}

let scheduled: { id: string; endsAt: string } | null = null;

/**
 * Mantém exatamente um alarme agendado, coerente com o estado do descanso:
 * `endsAt` null (pausado, pulado, treino pausado) cancela o alarme.
 */
export async function syncRestAlarm(endsAt: string | null, exerciseName: string, enabled: boolean) {
  if (!supported) return;
  if (scheduled && scheduled.endsAt === endsAt && enabled) return;
  if (scheduled) {
    await Notifications.cancelScheduledNotificationAsync(scheduled.id).catch(() => {});
    scheduled = null;
  }
  if (!endsAt || !enabled) return;
  const seconds = Math.round((Date.parse(endsAt) - Date.now()) / 1000);
  if (seconds < 1) return;
  if (!(await ensureNotificationPermission())) return;
  const id = await Notifications.scheduleNotificationAsync({
    content: { title: 'Descanso concluído', body: `Próxima série: ${exerciseName}`, sound: 'default' },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds,
      ...(Platform.OS === 'android' ? { channelId: CHANNEL } : {}),
    },
  });
  scheduled = { id, endsAt };
}
