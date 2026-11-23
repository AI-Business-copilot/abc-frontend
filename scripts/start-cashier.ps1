param(
    [string]$Url,
    [switch]$Setup,
    [switch]$ValidateOnly
)
$ErrorActionPreference = 'Stop'
$printerName = 'EPSON TM-T82III Receipt'
$cashierRoot = Join-Path $env:LOCALAPPDATA 'ABCCopilot\Cashier'
$profilePath = Join-Path $cashierRoot 'ChromeProfile'
$configPath = Join-Path $cashierRoot 'config.json'
$preferencesPath = Join-Path $profilePath 'Default\Preferences'

try {
    $chromePaths = @(
        (Join-Path $env:ProgramFiles 'Google\Chrome\Application\chrome.exe'),
        (Join-Path ${env:ProgramFiles(x86)} 'Google\Chrome\Application\chrome.exe'),
        (Join-Path $env:LOCALAPPDATA 'Google\Chrome\Application\chrome.exe')
    )
    $chrome = $chromePaths | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
    if (-not $chrome) { throw 'Khong tim thay Google Chrome.' }
    Add-Type -AssemblyName System.Drawing
    if (-not ([System.Drawing.Printing.PrinterSettings]::InstalledPrinters -contains $printerName)) {
        throw "Khong tim thay may in '$printerName'. Kiem tra ket noi va driver Epson."
    }
    $running = Get-CimInstance Win32_Process -Filter "Name = 'chrome.exe'" | Where-Object {
        $_.CommandLine -and $_.CommandLine.IndexOf($profilePath, [StringComparison]::OrdinalIgnoreCase) -ge 0
    }
    if ($running) { throw 'Hay dong cua so ABC Quay thu ngan dang mo, roi chay lai. Khong can dong Chrome ca nhan.' }
    if (-not $Url -and (Test-Path -LiteralPath $configPath)) {
        $Url = (Get-Content -Raw -Encoding UTF8 -LiteralPath $configPath | ConvertFrom-Json).url
    }
    if (-not $Url) {
        if ($ValidateOnly) { throw 'Chua cau hinh URL. Chay voi -Setup -Url dia_chi_web.' }
        $Url = Read-Host 'Nhap dia chi web ABC (vi du http://localhost:5173)'
    }
    $webUri = $null
    if (-not [Uri]::TryCreate($Url, [UriKind]::Absolute, [ref]$webUri) -or $webUri.Scheme -notin @('http', 'https') -or $Url.Contains('"') -or $webUri.UserInfo) {
        throw 'Dia chi web khong hop le. Dung URL http/https, khong kem tai khoan hoac mat khau.'
    }
    $Url = $webUri.AbsoluteUri

    # A separate Chrome profile guarantees that the kiosk switch takes effect even when personal Chrome is open.
    # Only read this profile's print settings. Never modify personal Chrome preferences or the Windows default printer.
    $selectedPrinter = $null
    if (Test-Path -LiteralPath $preferencesPath) {
        $prefs = Get-Content -Raw -Encoding UTF8 -LiteralPath $preferencesPath | ConvertFrom-Json
        if ($prefs.printing.print_preview_sticky_settings.appState) {
            $state = $prefs.printing.print_preview_sticky_settings.appState | ConvertFrom-Json
            if ($state.recentDestinations.Count -gt 0) { $selectedPrinter = $state.recentDestinations[0].id }
        }
    }
    if (-not $Setup -and $selectedPrinter -ne $printerName) {
        throw "Chua chon dung Epson trong ho so quay. Chay CAU-HINH-MAY-IN.cmd, in thu mot bill voi '$printerName', dong cua so quay, roi chay ABC-QUAY-THU-NGAN.cmd."
    }
    if ($ValidateOnly) {
        Write-Output "OK: $printerName; URL: $Url; Chrome profile: $profilePath"
        exit 0
    }
    New-Item -ItemType Directory -Path $cashierRoot -Force | Out-Null
    @{ url = $Url } | ConvertTo-Json | Set-Content -Encoding UTF8 -LiteralPath $configPath
    $chromeArgs = @("--user-data-dir=`"$profilePath`"", '--no-first-run', '--no-default-browser-check', "--app=`"$Url`"")
    if ($Setup) {
        Write-Host "CAU HINH LAN DAU: dang nhap, in mot bill va chon '$printerName'."
        Write-Host 'Chon giay cuon 80/58 mm, ty le 100%, tat dau/chan trang. Sau do dong cua so quay.'
        Write-Host 'Cac lan sau dung ABC-QUAY-THU-NGAN.cmd de in tu dong.'
    } else {
        $chromeArgs += '--kiosk-printing'
        Write-Host "Dang mo ABC Quay thu ngan, may in: $printerName"
    }
    Start-Process -FilePath $chrome -ArgumentList $chromeArgs
} catch {
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}
