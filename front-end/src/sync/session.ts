/** The room this device belongs to. Saved outside the per-room storage so we can find it on start-up. */
export interface RoomSession {
  v: 1;
  /** The secret code, formatted "XXXX-XXXX-XXXX-XXXX". Never sent to the server. */
  code: string;
  roomId: string;
  /** Random id for this device (one of the two allowed in the room). */
  device: string;
  role: "creator" | "joiner";
  createdAt: number;
  /** The newest server event this device has applied. */
  lastSeq: number;
  /** True once both people are in the room. */
  partnerJoined: boolean;
}

const KEY = "usspace:session";
const HEX32 = /^[0-9a-f]{32}$/;

export function loadSession(): RoomSession | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as RoomSession;
    if (s?.v !== 1 || !HEX32.test(s.roomId) || !HEX32.test(s.device) || typeof s.code !== "string") return null;
    return { ...s, lastSeq: Number(s.lastSeq) || 0, partnerJoined: !!s.partnerJoined };
  } catch {
    return null;
  }
}

export function saveSession(session: RoomSession): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(session));
  } catch {
    /* storage blocked — the room still works until the tab closes */
  }
}

export function clearSession(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* nothing to clear */
  }
}
