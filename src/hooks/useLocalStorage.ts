import { useEffect, useState } from "react";

export function useLocalStorage<T>(key: string, initialValue: T) {
  // Lazy initializer: localStorage dibaca sekali saat mount.
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = window.localStorage.getItem(key);
      return raw !== null ? (JSON.parse(raw) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

  // Simpan otomatis setiap value berubah.
  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Storage penuh atau diblokir: abaikan, app tetap jalan.
    }
  }, [key, value]);

  return [value, setValue] as const;
}