import type { LocalTrack } from "@/lib/types";

type StoredTrack = LocalTrack & { blob: Blob };
const DB_NAME = "zuzumusic-local-v1";
const STORE = "tracks";

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) {
        request.result.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function execute<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore, done: (value: T) => void) => void): Promise<T> {
  const db = await openDatabase();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    let result: T;
    tx.oncomplete = () => { db.close(); resolve(result); };
    tx.onerror = () => { db.close(); reject(tx.error); };
    run(tx.objectStore(STORE), (value) => { result = value; });
  });
}

export async function importLocalFile(file: File): Promise<LocalTrack> {
  if (file.size > 250 * 1024 * 1024) throw new Error("Local files must be under 250 MB.");
  if (!file.type.startsWith("audio/") && !/\.(mp3|wav|flac|ogg|m4a|aac)$/i.test(file.name)) {
    throw new Error("Choose an audio file.");
  }
  const track: LocalTrack = {
    id: "local-" + crypto.randomUUID(),
    title: file.name.replace(/\.[^.]+$/, ""),
    artist: "Local library",
    duration: null,
    fileName: file.name,
    mimeType: file.type || "audio/mpeg",
    source: "local",
  };
  await execute<void>("readwrite", (store, done) => {
    store.put({ ...track, blob: file } satisfies StoredTrack);
    done(undefined);
  });
  return track;
}

export async function listLocalTracks(): Promise<LocalTrack[]> {
  const rows = await execute<StoredTrack[]>("readonly", (store, done) => {
    const request = store.getAll();
    request.onsuccess = () => done(request.result as StoredTrack[]);
  });
  return rows.map(({ blob: _blob, ...track }) => track);
}

export async function getLocalBlob(id: string): Promise<Blob | null> {
  const row = await execute<StoredTrack | undefined>("readonly", (store, done) => {
    const request = store.get(id);
    request.onsuccess = () => done(request.result as StoredTrack | undefined);
  });
  return row?.blob ?? null;
}

export async function removeLocalTrack(id: string) {
  return execute<void>("readwrite", (store, done) => {
    store.delete(id);
    done(undefined);
  });
}
