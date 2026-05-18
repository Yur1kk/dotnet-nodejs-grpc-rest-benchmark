$folders = @('deploy-db', 'deploy-gateway', 'deploy-users', 'deploy-orders')
$basePath = "c:\Users\Admin\Desktop\Diploma\Cloud-Distributed"
$tmpPath = "c:\Users\Admin\Desktop\Diploma\Cloud-Distributed\__pack_tmp"

foreach ($f in $folders) {
    $src = Join-Path $basePath $f
    $destZip = Join-Path $basePath "$f.zip"
    $staging = Join-Path $tmpPath $f
    
    if (Test-Path $destZip) { Remove-Item $destZip -Force }
    if (Test-Path $staging) { Remove-Item $staging -Recurse -Force }
    
    Write-Host "Staging $f (excluding node_modules/dist)..."
    # Robocopy is great for excluding folders
    robocopy $src $staging /MIR /XD node_modules dist .git tmp /R:1 /W:1 /NFL /NDL /NJH /NJS
    
    Write-Host "Zipping $f..."
    Compress-Archive -Path "$staging\*" -DestinationPath $destZip
    
    # Cleanup staging
    Remove-Item $staging -Recurse -Force
}
if (Test-Path $tmpPath) { Remove-Item $tmpPath -Recurse -Force }
Write-Host "All 4 archives created successfully."
