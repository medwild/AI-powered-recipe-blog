# To learn more about how to use Nix to configure your environment
# see: https://firebase.google.com/docs/studio/customize-workspace
{ pkgs, ... }: {
  # Which nixpkgs channel to use.
  channel = "stable-24.05"; # or "unstable"

  # Use https://search.nixos.org/packages to find packages
  packages = [
    pkgs.gh
    # pkgs.go
    # pkgs.python311
    # pkgs.python311Packages.pip
    # pkgs.nodejs_20
    # pkgs.nodePackages.nodemon
  ];

  # Sets environment variables in the workspace
  env = rec {
    # === Active Configuration: DeepSeek ===
    # To use the Fireworks.ai config below, comment out this block.
    DEEPSEEK_API_KEY = ""; # Set in environment or .env.local — do not commit
    ANTHROPIC_BASE_URL = "https://api.deepseek.com/anthropic";
    ANTHROPIC_AUTH_TOKEN = "sk-9e34b74df2734b228550a3cf981c7012"; # Set in environment or .env.local — do not commit
    ANTHROPIC_MODEL = "deepseek-v4-pro";
    ANTHROPIC_DEFAULT_OPUS_MODEL = "deepseek-v4-pro";
    ANTHROPIC_DEFAULT_SONNET_MODEL = "deepseek-v4-pro";
    ANTHROPIC_DEFAULT_HAIKU_MODEL = "deepseek-v4-flash";
    CLAUDE_CODE_SUBAGENT_MODEL = "deepseek-v4-flash";
    CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC = "1";
    CLAUDE_CODE_EFFORT_LEVEL = "max";

    # === Alternative Configuration: Fireworks.ai (glm-5.2) ===
    # To use this, uncomment this block and comment out the DeepSeek block above.
    # WARNING: This configuration is likely incompatible.
    /*
    FIREWORKS_API_KEY = ""; # Set in environment or .env.local — do not commit
    ANTHROPIC_BASE_URL = "https://api.fireworks.ai/inference";
    ANTHROPIC_AUTH_TOKEN = "Bearer ${FIREWORKS_API_KEY}";
    ANTHROPIC_MODEL = "accounts/fireworks/models/glm-5p2";
    ANTHROPIC_DEFAULT_OPUS_MODEL = "accounts/fireworks/models/glm-5p2";
    ANTHROPIC_DEFAULT_SONNET_MODEL = "accounts/fireworks/models/glm-5p2";
    ANTHROPIC_DEFAULT_HAIKU_MODEL = "accounts/fireworks/models/glm-5p2";
    CLAUDE_CODE_SUBAGENT_MODEL = "accounts/fireworks/models/glm-5p2";
    CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC = "1";
    CLAUDE_CODE_EFFORT_LEVEL = "max";
    */
  };
  idx = {
    # Search for the extensions you want on https://open-vsx.org/ and use "publisher.id"
    extensions = [
      # "vscodevim.vim"
    ];
  };
}
