class Agenthub < Formula
  desc "AI agent orchestration hub - manage and run AI agents from a unified interface"
  homepage "https://github.com/0x4F6D6172/agenthub"
  url "https://github.com/0x4F6D6172/agenthub/releases/download/v0.1.0/AgentHub-0.1.0-arm64.dmg"
  sha256 "PLACEHOLDER_SHA256"
  version "0.1.0"
  license "MIT"

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
