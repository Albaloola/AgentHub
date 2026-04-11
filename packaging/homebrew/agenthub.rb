class Agenthub < Formula
  desc "AI agent orchestration hub - manage and run AI agents from a unified interface"
  homepage "https://github.com/Albaloola/AgentHub"
  version "0.2.0"
  license "Apache-2.0"

  on_arm do
    url "https://github.com/Albaloola/AgentHub/releases/download/v0.2.0/AgentHub-0.2.0-arm64.dmg"
    sha256 "0d65778e404d8c1095656b62a856026340992770402aa79edefc70214441fb99"
  end

  on_intel do
    url "https://github.com/Albaloola/AgentHub/releases/download/v0.2.0/AgentHub-0.2.0-x64.dmg"
    sha256 "6aa17105424aebffdff4ae5ace983638b8cd5eee26e83076c53e5b953cc0bd45"
  end

  livecheck do
    url :stable
    strategy :github_latest
  end

  depends_on macos: :ventura

  app "AgentHub.app"

  caveats <<~EOS
    AgentHub has been installed to /Applications/AgentHub.app.

    On first launch, macOS may ask you to confirm you want to open an
    app downloaded from the internet. Right-click the app and select
    "Open" to bypass Gatekeeper.

    To start AgentHub from the command line:
      open -a AgentHub
  EOS

  zap trash: [
    "~/Library/Application Support/AgentHub",
    "~/Library/Preferences/com.agenthub.desktop.plist",
    "~/Library/Caches/com.agenthub.desktop",
    "~/Library/Logs/AgentHub",
  ]
end
