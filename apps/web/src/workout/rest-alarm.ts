/**
 * Báo hết giờ nghỉ (UC08 bước 2): hai tiếng bíp và rung nếu máy có Vibration API (iOS
 * không có, SRS 5.5). Không có Web Audio hay bị chặn thì im lặng; hiệu ứng trên dải số áo
 * vẫn báo.
 */

type AudioContextClass = typeof AudioContext;

let audio: AudioContext | undefined;

function audioContextClass(): AudioContextClass | undefined {
  return (
    window.AudioContext ??
    (window as { webkitAudioContext?: AudioContextClass }).webkitAudioContext
  );
}

/**
 * Mở khoá âm thanh. Gọi trong thao tác của user (bấm ghi set): iOS chỉ cho phát tiếng từ
 * AudioContext đã tạo hoặc resume trong một cử chỉ của user, còn tiếng báo chạy từ timer.
 */
export function unlockRestAlarm(): void {
  try {
    const Ctx = audioContextClass();
    if (!Ctx) return;
    audio ??= new Ctx();
    if (audio.state === 'suspended') void audio.resume().catch(() => {});
  } catch {
    // Trình duyệt từ chối tạo AudioContext: vẫn còn hiệu ứng hình ảnh.
  }
}

/** Hai tiếng bíp 880 Hz (như prototype › beep) và rung nếu có. */
export function ringRestAlarm(): void {
  try {
    if (audio) {
      for (const at of [0, 0.28]) {
        const osc = audio.createOscillator();
        const gain = audio.createGain();
        const t = audio.currentTime + at;
        osc.frequency.value = 880;
        gain.gain.setValueAtTime(0.18, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
        osc.connect(gain).connect(audio.destination);
        osc.start(t);
        osc.stop(t + 0.24);
      }
    }
  } catch {
    // Không phát được tiếng: bỏ qua.
  }
  if ('vibrate' in navigator) navigator.vibrate([180, 90, 180]);
}
