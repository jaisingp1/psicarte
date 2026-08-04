# resize_logos.ps1
# Load System.Drawing assembly
Add-Type -AssemblyName System.Drawing

function Resize-Image {
    param (
        [string]$InputPath,
        [string]$OutputPath,
        [int]$NewWidth
    )
    
    if (-not (Test-Path $InputPath)) {
        Write-Host "Input path not found: $InputPath"
        return
    }
    
    Write-Host "Loading image: $InputPath"
    $img = [System.Drawing.Image]::FromFile($InputPath)
    
    # Calculate height to keep aspect ratio
    $ratio = $img.Height / $img.Width
    $newHeight = [int]($NewWidth * $ratio)
    
    Write-Host "Resizing from $($img.Width)x$($img.Height) to $($NewWidth)x$($newHeight)"
    
    $bmp = New-Object System.Drawing.Bitmap($NewWidth, $newHeight)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    
    # Set high quality resize settings
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    
    $g.DrawImage($img, 0, 0, $NewWidth, $newHeight)
    
    # Save image
    $bmp.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    
    # Clean up
    $g.Dispose()
    $bmp.Dispose()
    $img.Dispose()
    Write-Host "Saved resized image to: $OutputPath"
}

# Resize both logos to 300px width
$docDir = "c:\Users\CLEJPA\Downloads\Psicarte\Documentos"
Resize-Image -InputPath "$docDir\psicarte logo ligth.png" -OutputPath "c:\Users\CLEJPA\Downloads\Psicarte\logo_light.png" -NewWidth 300
Resize-Image -InputPath "$docDir\psicarte logo black.png" -OutputPath "c:\Users\CLEJPA\Downloads\Psicarte\logo_dark.png" -NewWidth 300
