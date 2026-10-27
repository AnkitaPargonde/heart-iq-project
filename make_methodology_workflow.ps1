Add-Type -AssemblyName System.Drawing

$outPng = 'C:\Users\ankita\Documents\New project\methodology_workflow_heart_iq.png'
$outJpg = 'C:\Users\ankita\Documents\New project\methodology_workflow_heart_iq.jpg'

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

function Draw-Box(
    [int]$x,
    [int]$y,
    [int]$w,
    [int]$h,
    [string]$fillHex,
    [string]$label,
    [string]$textHex,
    [int]$fontSize,
    [bool]$bold = $true,
    [int]$radius = 16
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

    $fontStyle = if ($bold) { [System.Drawing.FontStyle]::Bold } else { [System.Drawing.FontStyle]::Regular }
    $font = New-Object System.Drawing.Font('Arial', $fontSize, $fontStyle)
    $rect = [System.Drawing.RectangleF]::new([float]($x + 12), [float]($y + 8), [float]($w - 24), [float]($h - 16))
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

function Draw-Text([string]$label, [int]$x, [int]$y, [int]$w, [int]$h, [int]$size, [string]$colorHex, [bool]$bold = $false) {
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

$dark = '#4e2a1f'
$muted = '#7f5a4c'

Draw-Text 'Methodology of Heart-IQ' 500 20 1200 55 34 $dark $true
Draw-Text 'Acoustic heart sound analysis and digital twin visualization pipeline' 430 74 1340 40 20 $muted $false

Draw-Text 'Input' 80 135 200 30 16 $muted $false
Draw-Text 'Preprocessing' 490 135 250 30 16 $muted $false
Draw-Text 'Feature Extraction' 930 135 300 30 16 $muted $false
Draw-Text 'Inference' 1570 135 200 30 16 $muted $false
Draw-Text 'Outputs' 1640 645 160 30 16 $muted $false
Draw-Text 'Clinical recommendation layer' 900 1010 340 25 14 $muted $false

Draw-Box 70 170 360 110 '#a3563f' 'PhysioNet / CinC 2016 PCG Dataset' 'White' 20 $true
Draw-Box 70 340 360 110 '#b86a4b' 'WAV Audio Input' 'White' 20 $true
Draw-Box 70 510 360 110 '#cf7b5d' "User Symptoms`n& Notes" 'White' 20 $true

Draw-Box 520 190 370 100 '#f2b26d' "Resample to`n2000 Hz" $dark 18 $true
Draw-Box 520 360 370 100 '#f19a61' "Butterworth Bandpass Filter`n25 Hz to 400 Hz" $dark 16 $true
Draw-Box 520 530 370 100 '#ea7f48' 'Peak Normalization' $dark 18 $true

Draw-Box 980 190 370 100 '#f6d27a' '13 MFCCs' $dark 18 $true
Draw-Box 980 360 370 100 '#f1c05d' 'BPM Estimation' $dark 18 $true
Draw-Box 980 530 370 100 '#eab24f' "Spectral Features`nCentroid, Bandwidth, Rolloff" $dark 15 $true
Draw-Box 980 700 370 100 '#e1ab47' "Energy & Rhythm Features`nRMS, Bands, Entropy, RR" $dark 14 $true

Draw-Box 1510 185 560 100 '#9d3b63' "Machine Learning Classification`n(Logistic Regression, SVM, Random Forest, Extra Trees, XGBoost)" 'White' 14 $true
Draw-Box 1510 355 560 100 '#b04364' "Binary Prediction`nNormal / Abnormal" 'White' 18 $true
Draw-Box 1510 525 560 100 '#bf5b70' "Confidence, Severity,`nSignal Quality, Explainability" 'White' 16 $true

Draw-Box 520 930 320 95 '#d26e4d' 'PDF Report' 'White' 18 $true
Draw-Box 900 930 320 95 '#d26e4d' 'MongoDB History' 'White' 16 $true
Draw-Box 1280 930 320 95 '#d26e4d' 'JSON Response' 'White' 18 $true
Draw-Box 1660 930 320 95 '#d26e4d' '3D Digital Twin' 'White' 18 $true
Draw-Box 720 1120 760 95 '#9a6a2b' "Personalized Care Guidance`nRoutine monitoring / Doctor follow-up / Urgent advice" 'White' 16 $true

Draw-Arrow 250 280 250 340
Draw-Arrow 250 450 250 510
Draw-Arrow 430 565 520 580

Draw-Arrow 705 290 705 360
Draw-Arrow 705 460 705 530

Draw-Arrow 1165 290 1165 360
Draw-Arrow 1165 460 1165 530
Draw-Arrow 1165 630 1165 700

Draw-Arrow 1490 240 1510 240
Draw-Arrow 1490 410 1510 410
Draw-Arrow 1490 580 1510 580

Draw-Arrow 1790 285 1790 355
Draw-Arrow 1790 455 1790 525
Draw-Arrow 1790 625 1790 900

Draw-Arrow 680 930 850 1080
Draw-Arrow 1060 930 1030 1080
Draw-Arrow 1440 930 1210 1080
Draw-Arrow 1820 930 1390 1080

$bmp.Save($outPng, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Save($outJpg, [System.Drawing.Imaging.ImageFormat]::Jpeg)
$g.Dispose()
$bmp.Dispose()

Write-Output $outPng
Write-Output $outJpg
