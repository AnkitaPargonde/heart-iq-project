Add-Type -AssemblyName System.Drawing

$outPng = 'C:\Users\ankita\Documents\New project\architecture_diagram_heart_iq.png'
$outJpg = 'C:\Users\ankita\Documents\New project\architecture_diagram_heart_iq.jpg'

$bmp = New-Object System.Drawing.Bitmap 2200, 1300
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::ClearTypeGridFit
$g.Clear([System.Drawing.ColorTranslator]::FromHtml('#fbf4ef'))

function New-Brush([string]$hex) {
    return New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml($hex))
}

function New-Pen([string]$hex, [float]$w = 2) {
    return New-Object System.Drawing.Pen ([System.Drawing.ColorTranslator]::FromHtml($hex), $w)
}

function Draw-RoundBox(
    [int]$x,
    [int]$y,
    [int]$w,
    [int]$h,
    [string]$fillHex,
    [string]$label,
    [string]$textHex,
    [int]$fontSize,
    [bool]$bold = $true,
    [int]$radius = 18
) {
    $brush = New-Brush $fillHex
    $pen = New-Pen '#a86a4b' 2
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $d = $radius * 2
    $path.AddArc($x, $y, $d, $d, 180, 90)
    $path.AddArc($x + $w - $d, $y, $d, $d, 270, 90)
    $path.AddArc($x + $w - $d, $y + $h - $d, $d, $d, 0, 90)
    $path.AddArc($x, $y + $h - $d, $d, $d, 90, 90)
    $path.CloseFigure()
    $g.FillPath($brush, $path)
    $g.DrawPath($pen, $path)

    $style = if ($bold) { [System.Drawing.FontStyle]::Bold } else { [System.Drawing.FontStyle]::Regular }
    $font = New-Object System.Drawing.Font('Arial', $fontSize, $style)
    $rect = [System.Drawing.RectangleF]::new([float]($x + 14), [float]($y + 10), [float]($w - 28), [float]($h - 20))
    $sf = New-Object System.Drawing.StringFormat
    $sf.Alignment = [System.Drawing.StringAlignment]::Center
    $sf.LineAlignment = [System.Drawing.StringAlignment]::Center
    $sf.Trimming = [System.Drawing.StringTrimming]::Word
    $textBrush = New-Brush $textHex
    $g.DrawString([string]$label, $font, $textBrush, $rect, $sf)

    $brush.Dispose(); $pen.Dispose(); $font.Dispose(); $sf.Dispose(); $textBrush.Dispose(); $path.Dispose()
}

function Draw-Arrow([int]$x1, [int]$y1, [int]$x2, [int]$y2, [string]$hex = '#a86a4b', [float]$width = 3) {
    $pen = New-Pen $hex $width
    $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::ArrowAnchor
    $g.DrawLine($pen, $x1, $y1, $x2, $y2)
    $pen.Dispose()
}

function Draw-Label([string]$label, [int]$x, [int]$y, [int]$w, [int]$h, [int]$size, [string]$colorHex, [bool]$bold = $false) {
    $style = if ($bold) { [System.Drawing.FontStyle]::Bold } else { [System.Drawing.FontStyle]::Regular }
    $font = New-Object System.Drawing.Font('Arial', $size, $style)
    $brush = New-Brush $colorHex
    $rect = [System.Drawing.RectangleF]::new([float]$x, [float]$y, [float]$w, [float]$h)
    $sf = New-Object System.Drawing.StringFormat
    $sf.Alignment = [System.Drawing.StringAlignment]::Center
    $sf.LineAlignment = [System.Drawing.StringAlignment]::Center
    $g.DrawString($label, $font, $brush, $rect, $sf)
    $font.Dispose(); $brush.Dispose(); $sf.Dispose()
}

$text = '#4e2a1f'
$muted = '#7f5a4c'
$frontend = '#b86a4b'
$frontend2 = '#cf7b5d'
$backend = '#f1a55d'
$backend2 = '#e68a51'
$backend3 = '#d26e4d'
$storage = '#9d3b63'

Draw-Label 'Heart-IQ System Architecture' 500 20 1200 60 34 $text $true
Draw-Label 'Frontend, backend, and storage layers connected through REST APIs and MongoDB' 400 72 1400 35 18 $muted $false

Draw-Label 'Frontend Layer' 110 140 400 30 18 $muted $false
Draw-Label 'Backend Layer' 760 140 550 30 18 $muted $false
Draw-Label 'Persistence Layer' 1540 140 350 30 18 $muted $false

Draw-RoundBox 70 190 470 100 $frontend "Login / Register`nMobile number + DOB" 'White' 18
Draw-RoundBox 70 340 470 100 $frontend2 "Dashboard`nUpload, record, symptoms, settings" 'White' 16
Draw-RoundBox 70 490 470 100 $frontend "3D Digital Twin`nPulse, color, severity visualization" 'White' 16
Draw-RoundBox 70 640 470 100 $frontend2 "PDF Report View`nDownload formatted clinical summary" 'White' 16
Draw-RoundBox 70 790 470 100 $frontend "User History`nPatient-specific analysis records" 'White' 16

Draw-RoundBox 710 190 590 100 $backend "Authentication API`nCreate account, login, logout" 'White' 18
Draw-RoundBox 710 340 590 100 $backend2 "Analyze API`nAccept WAV, clinical context, symptoms" 'White' 17
Draw-RoundBox 710 490 590 100 $backend "Signal Processing Engine`nResample, filter, normalize" 'White' 16
Draw-RoundBox 710 640 590 100 $backend2 "Feature Extraction + ML Inference`nMFCC, BPM, spectral features, classifier" 'White' 15
Draw-RoundBox 710 790 590 100 $backend3 "Response Builder`nDiagnosis, confidence, guidance, explainability" 'White' 16

Draw-RoundBox 1470 190 620 100 $storage "MongoDB`nUsers, sessions, analyses, history" 'White' 18
Draw-RoundBox 1470 340 620 100 $storage "Collections`nusers_store / analyses / login data" 'White' 17
Draw-RoundBox 1470 490 620 100 $storage "Per-user storage`nHistory filtered by mobile number" 'White' 17

Draw-RoundBox 770 1010 520 110 '#9a6a2b' "Clinical Output`nPersonalized care guidance, doctor follow-up, urgent advice" 'White' 17

# Frontend vertical arrows
Draw-Arrow 305 290 305 340
Draw-Arrow 305 440 305 490
Draw-Arrow 305 590 305 640
Draw-Arrow 305 740 305 790

# Frontend to backend arrows
Draw-Arrow 540 390 710 390
Draw-Arrow 540 540 710 540
Draw-Arrow 540 865 710 865

# Backend vertical arrows
Draw-Arrow 1005 290 1005 340
Draw-Arrow 1005 440 1005 490
Draw-Arrow 1005 590 1005 640
Draw-Arrow 1005 740 1005 790

# Backend to storage arrows
Draw-Arrow 1300 240 1470 240
Draw-Arrow 1300 390 1470 390
Draw-Arrow 1300 540 1470 540

# Backend to clinical output
Draw-Arrow 1005 890 1005 1010

# Frontend to digital twin/report/history emphasis
Draw-Arrow 540 540 770 1060
Draw-Arrow 540 690 770 1060
Draw-Arrow 540 840 770 1060

# Storage to history and report feedback
Draw-Arrow 1780 590 1780 860
Draw-Arrow 1780 590 1260 1060

$bmp.Save($outPng, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Save($outJpg, [System.Drawing.Imaging.ImageFormat]::Jpeg)
$g.Dispose()
$bmp.Dispose()

Write-Output $outPng
Write-Output $outJpg
