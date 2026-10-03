Add-Type -AssemblyName System.Drawing

$projectRoot = "D:\VS code\New folder\Bill Desk"
$logoPath = Join-Path $projectRoot "assets\logo.png"

if (-not (Test-Path $logoPath)) {
    Write-Error "Logo not found at $logoPath"
    exit 1
}

# Read bytes to avoid locking file
$bytes = [System.IO.File]::ReadAllBytes($logoPath)
$ms = New-Object System.IO.MemoryStream(,$bytes)
$logo = [System.Drawing.Bitmap]::FromStream($ms)
$bgColor = [System.Drawing.Color]::FromArgb(255, 9, 21, 64) # #091540

function Set-HighQualityGraphics($g) {
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
}

# 1. Generate assets/adaptive-icon.png (1080x1080, transparent, 210px padding on all sides)
$adaptiveIcon = New-Object System.Drawing.Bitmap(1080, 1080, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$gAdaptive = [System.Drawing.Graphics]::FromImage($adaptiveIcon)
Set-HighQualityGraphics $gAdaptive
$gAdaptive.Clear([System.Drawing.Color]::Transparent)

# Draw logo scaled to 660x660 at (210, 210) - exact 210px padding on all sides
$destRectAdaptive = New-Object System.Drawing.Rectangle(210, 210, 660, 660)
$gAdaptive.DrawImage($logo, $destRectAdaptive)
$gAdaptive.Dispose()

$adaptiveIconPath = Join-Path $projectRoot "assets\adaptive-icon.png"
if (Test-Path $adaptiveIconPath) { Remove-Item $adaptiveIconPath -Force }
$adaptiveIcon.Save($adaptiveIconPath, [System.Drawing.Imaging.ImageFormat]::Png)
Write-Host "Created assets/adaptive-icon.png"

# 2. Generate assets/icon.png (1080x1080, with #091540 background)
$icon = New-Object System.Drawing.Bitmap(1080, 1080, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$gIcon = [System.Drawing.Graphics]::FromImage($icon)
Set-HighQualityGraphics $gIcon
$gIcon.Clear($bgColor)
$destRectIcon = New-Object System.Drawing.Rectangle(180, 180, 720, 720)
$gIcon.DrawImage($logo, $destRectIcon)
$gIcon.Dispose()

$iconPath = Join-Path $projectRoot "assets\icon.png"
if (Test-Path $iconPath) { Remove-Item $iconPath -Force }
$icon.Save($iconPath, [System.Drawing.Imaging.ImageFormat]::Png)
Write-Host "Created assets/icon.png"

# 3. Generate Android native mipmap densities
$densities = @(
    @{ Name = "mipmap-mdpi"; ForegroundSize = 108; IconSize = 48 },
    @{ Name = "mipmap-hdpi"; ForegroundSize = 162; IconSize = 72 },
    @{ Name = "mipmap-xhdpi"; ForegroundSize = 216; IconSize = 96 },
    @{ Name = "mipmap-xxhdpi"; ForegroundSize = 324; IconSize = 144 },
    @{ Name = "mipmap-xxxhdpi"; ForegroundSize = 432; IconSize = 192 }
)

$resDir = Join-Path $projectRoot "android\app\src\main\res"

foreach ($d in $densities) {
    $dirPath = Join-Path $resDir $d.Name
    if (-not (Test-Path $dirPath)) {
        New-Item -ItemType Directory -Path $dirPath -Force | Out-Null
    }

    # A) ic_launcher_foreground.webp (scaled adaptive icon)
    $fgBmp = New-Object System.Drawing.Bitmap($d.ForegroundSize, $d.ForegroundSize, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $gFg = [System.Drawing.Graphics]::FromImage($fgBmp)
    Set-HighQualityGraphics $gFg
    $gFg.Clear([System.Drawing.Color]::Transparent)
    $gFg.DrawImage($adaptiveIcon, (New-Object System.Drawing.Rectangle(0, 0, $d.ForegroundSize, $d.ForegroundSize)))
    $gFg.Dispose()

    $fgPath = Join-Path $dirPath "ic_launcher_foreground.webp"
    if (Test-Path $fgPath) { Remove-Item $fgPath -Force }
    $fgBmp.Save($fgPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $fgBmp.Dispose()

    # B) ic_launcher.webp (square icon with #091540 background)
    $sqBmp = New-Object System.Drawing.Bitmap($d.IconSize, $d.IconSize, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $gSq = [System.Drawing.Graphics]::FromImage($sqBmp)
    Set-HighQualityGraphics $gSq
    $gSq.Clear($bgColor)
    $padding = [int]($d.IconSize * 0.12)
    $logoDrawSize = $d.IconSize - ($padding * 2)
    $gSq.DrawImage($logo, (New-Object System.Drawing.Rectangle($padding, $padding, $logoDrawSize, $logoDrawSize)))
    $gSq.Dispose()

    $sqPath = Join-Path $dirPath "ic_launcher.webp"
    if (Test-Path $sqPath) { Remove-Item $sqPath -Force }
    $sqBmp.Save($sqPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $sqBmp.Dispose()

    # C) ic_launcher_round.webp (circular clipped icon with #091540 background)
    $rdBmp = New-Object System.Drawing.Bitmap($d.IconSize, $d.IconSize, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $gRd = [System.Drawing.Graphics]::FromImage($rdBmp)
    Set-HighQualityGraphics $gRd
    $gRd.Clear([System.Drawing.Color]::Transparent)

    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $path.AddEllipse(0, 0, $d.IconSize, $d.IconSize)
    $gRd.SetClip($path)
    $brush = New-Object System.Drawing.SolidBrush($bgColor)
    $gRd.FillEllipse($brush, 0, 0, $d.IconSize, $d.IconSize)
    $gRd.DrawImage($logo, (New-Object System.Drawing.Rectangle($padding, $padding, $logoDrawSize, $logoDrawSize)))
    $brush.Dispose()
    $path.Dispose()
    $gRd.Dispose()

    $rdPath = Join-Path $dirPath "ic_launcher_round.webp"
    if (Test-Path $rdPath) { Remove-Item $rdPath -Force }
    $rdBmp.Save($rdPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $rdBmp.Dispose()

    Write-Host "Updated $($d.Name) icons"
}

$logo.Dispose()
$ms.Dispose()
$adaptiveIcon.Dispose()
$icon.Dispose()

Write-Host "All icons generated and updated successfully!"
