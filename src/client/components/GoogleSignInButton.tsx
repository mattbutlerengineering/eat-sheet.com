import { useEffect, useRef, useState } from "react";

interface GoogleSignInButtonProps {
  readonly onToken: (idToken: string) => void;
}

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

export function GoogleSignInButton({ onToken }: GoogleSignInButtonProps) {
  const buttonRef = useRef<HTMLDivElement>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  useEffect(() => {
    if (typeof google !== "undefined" && google.accounts?.id) {
      setScriptLoaded(true);
      return;
    }

    // Poll for GIS script load (async defer means it may not be ready)
    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      if (typeof google !== "undefined" && google.accounts?.id) {
        setScriptLoaded(true);
        clearInterval(interval);
      } else if (attempts > 50) {
        clearInterval(interval);
      }
    }, 100);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!scriptLoaded || !buttonRef.current || !CLIENT_ID) return;

    google.accounts.id.initialize({
      client_id: CLIENT_ID,
      callback: (response) => onToken(response.credential),
    });

    google.accounts.id.renderButton(buttonRef.current, {
      type: "standard",
      theme: "filled_black",
      size: "large",
      text: "signin_with",
      shape: "pill",
      width: 320,
    });
  }, [scriptLoaded, onToken]);

  if (!CLIENT_ID) return null;

  return <div ref={buttonRef} className="flex justify-center" />;
}
