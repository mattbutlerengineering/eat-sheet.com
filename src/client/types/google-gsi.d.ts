interface CredentialResponse {
  readonly credential: string;
  readonly select_by: string;
}

interface GsiButtonConfiguration {
  readonly type?: "standard" | "icon";
  readonly theme?: "outline" | "filled_blue" | "filled_black";
  readonly size?: "large" | "medium" | "small";
  readonly text?: "signin_with" | "signup_with" | "continue_with" | "signin";
  readonly shape?: "rectangular" | "pill" | "circle" | "square";
  readonly logo_alignment?: "left" | "center";
  readonly width?: number;
}

declare namespace google.accounts.id {
  function initialize(config: {
    client_id: string;
    callback: (response: CredentialResponse) => void;
    auto_select?: boolean;
    cancel_on_tap_outside?: boolean;
  }): void;

  function renderButton(
    parent: HTMLElement,
    config: GsiButtonConfiguration
  ): void;

  function prompt(): void;
}
