# AgentHub Installer for Windows
# https://github.com/0x4F6D6172/agenthub

param(
    [string]$Version = "",
    [switch]$Help
)

$ErrorActionPreference = "Stop"

$RepoOwner = "0x4F6D6172"
$RepoName = "agenthub"
$GitHubApi = "https://api.github.com/repos/$RepoOwner/$RepoName/releases/latest"

function Write-Info { param([string]$Message) Write-Host "[INFO]  $Message" -ForegroundColor Cyan }
function Write-Ok { param([string]$Message) Write-Host "[OK]    $Message" -ForegroundColor Green }
function Write-Err { param([string]$Message) Write-Host "[ERROR] $Message" -ForegroundColor Red }

function Show-Help {
    Write-Host ""
    Write-Host "  AgentHub Installer" -ForegroundColor White
    Write-Host ""
    Write-Host "  Usage: install.ps1 [OPTIONS]"
    Write-Host ""
    Write-Host "  Options:"
    Write-Host "    -Help           Show this help message"
    Write-Host "    -Version <tag>  Install a specific version (e.g. -Version v1.0.0)"
    Write-Host ""
    Write-Host "  Examples:"
    Write-Host "    irm https://raw.githubusercontent.com/$RepoOwner/$RepoName/main/packaging/install.ps1 | iex"
    Write-Host "    .\install.ps1 -Version v1.2.0"
    Write-Host ""
    exit 0
}

if ($Help) { Show-Help }

function Get-Release {
    $apiUrl = $GitHubApi
    if ($Version -ne "") {
        $apiUrl = "https://api.github.com/repos/$RepoOwner/$RepoName/releases/tags/$Version"
    }

    Write-Info "Fetching release information from GitHub..."

    try {
        $response = Invoke-RestMethod -Uri $apiUrl -Headers @{ "User-Agent" = "AgentHub-Installer" }
        return $response
    }
    catch {
        Write-Err "Failed to fetch release info. Check your internet connection or verify the version exists."
        Write-Err $_.Exception.Message
        exit 1
    }
}

function Find-InstallerUrl {
    param($Release)

    foreach ($asset in $Release.assets) {
        # Match NSIS installer .exe (exclude blockmap and other non-installer files)
        if ($asset.name -match "\.exe$" -and $asset.name -notmatch "blockmap") {
            return $asset.browser_download_url
        }
    }

    return $null
}

function Install-AgentHub {
    Write-Host ""
    Write-Host "  AgentHub Installer" -ForegroundColor White
    Write-Host "  https://github.com/$RepoOwner/$RepoName" -ForegroundColor Gray
    Write-Host ""

    $release = Get-Release
    $version = $release.tag_name
    Write-Ok "Latest release: $version"

    $downloadUrl = Find-InstallerUrl -Release $release

    if (-not $downloadUrl) {
        Write-Err "No Windows installer (.exe) found in this release."
        Write-Err "Check the releases page: https://github.com/$RepoOwner/$RepoName/releases"
        exit 1
    }

    $fileName = [System.IO.Path]::GetFileName($downloadUrl)
    Write-Ok "Found installer: $fileName"

    $tempDir = Join-Path $env:TEMP "agenthub-install"
    if (-not (Test-Path $tempDir)) {
        New-Item -ItemType Directory -Path $tempDir -Force | Out-Null
    }

    $installerPath = Join-Path $tempDir $fileName

    Write-Info "Downloading installer..."
    try {
        $ProgressPreference = 'SilentlyContinue'
        Invoke-WebRequest -Uri $downloadUrl -OutFile $installerPath -UseBasicParsing
        $ProgressPreference = 'Continue'
    }
    catch {
        Write-Err "Download failed: $($_.Exception.Message)"
        exit 1
    }
    Write-Ok "Download complete."

    Write-Info "Running installer silently..."
    try {
        $process = Start-Process -FilePath $installerPath -ArgumentList "/S" -PassThru -Wait
        if ($process.ExitCode -ne 0) {
            Write-Err "Installer exited with code $($process.ExitCode)."
            exit 1
        }
    }
    catch {
        Write-Err "Failed to run installer: $($_.Exception.Message)"
        exit 1
    }

    # Clean up
    Remove-Item -Path $tempDir -Recurse -Force -ErrorAction SilentlyContinue

    Write-Ok "AgentHub installed successfully!"
    Write-Host ""
    Write-Host "  Installation complete!" -ForegroundColor Green
    Write-Host "  You can launch AgentHub from the Start Menu or Desktop shortcut." -ForegroundColor Gray
    Write-Host ""
}

Install-AgentHub
