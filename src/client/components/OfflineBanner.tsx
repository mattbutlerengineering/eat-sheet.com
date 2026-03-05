import { useState, useEffect } from "react";
import { randomOfflineMessage } from "../utils/personality";

export function OfflineBanner() {
  const [offline, setOffline] = useState(!navigator.onLine);
  const [message] = useState(() => randomOfflineMessage());

  useEffect(() => {
    const goOffline = () => setOffline(true);
    const goOnline = () => setOffline(false);

    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);

    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, []);

  if (!offline) return null;

  return (
    <div className="bg-amber-600 text-white text-center text-sm py-2 px-4 animate-slide-down">
      {message}
    </div>
  );
}
