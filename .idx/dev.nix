# To learn more about how to use Nix to configure your environment
# see: https://firebase.google.com/docs/studio/customize-workspace
{ pkgs, ... }: {
  # Which nixpkgs channel to use.
  channel = "stable-24.05"; # or "unstable"

  # Use https://search.nixos.org/packages to find packages
  packages = [
    pkgs.gh
  ];

  # Sets environment variables in the workspace
  env = rec {
    # === Active Configuration: DeepSeek ===
    # The Claude Code agent reads its configuration from these environment variables.
    # The API key is read from the IDX Secrets panel (env var), NEVER hardcoded here.
    ANTHROPIC_BASE_URL = "https://api.deepseek.com/anthropic";
    ANTHROPIC_AUTH_TOKEN = builtins.getEnv "ANTHROPIC_AUTH_TOKEN"; # set in IDX Secrets — do not commit
    ANTHROPIC_MODEL = "deepseek-v4-flash";
    ANTHROPIC_DEFAULT_OPUS_MODEL = "deepseek-v4-flash";
    ANTHROPIC_DEFAULT_SONNET_MODEL = "deepseek-v4-flash";
    ANTHROPIC_DEFAULT_HAIKU_MODEL = "deepseek-v4-flash";
    CLAUDE_CODE_SUBAGENT_MODEL = "deepseek-v4-flash";
    CLAUDE_CODE_EFFORT_LEVEL = "max";

    # Note: NEXT_PUBLIC_* variables for the frontend app should be in .env.local
    # But server-side tools and agents use the Nix environment.
  };

  idx = {
    # Search for the extensions you want on https://open-vsx.org/ and use "publisher.id"
    extensions = [
      # "vscodevim.vim"
    ];
  };
}
