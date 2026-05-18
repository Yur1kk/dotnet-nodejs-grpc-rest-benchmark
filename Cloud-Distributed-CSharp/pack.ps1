$folders = @('deploy-gateway', 'deploy-users', 'deploy-orders')
$basePath = "c:\Users\Admin\Desktop\Diploma\Cloud-Distributed-CSharp"
$tmpPath  = "c:\Users\Admin\Desktop\Diploma\Cloud-Distributed-CSharp\__pack_tmp"

foreach ($f in $folders) {
    $src     = Join-Path $basePath $f
    $destZip = Join-Path $basePath "$f.zip"
    $staging = Join-Path $tmpPath $f

    if (Test-Path $destZip) { Remove-Item $destZip -Force }
    if (Test-Path $staging)  { Remove-Item $staging -Recurse -Force }

    Write-Host "Staging $f (excluding bin/obj)..."
    robocopy $src $staging /MIR /XD bin obj .git tmp /R:1 /W:1 /NFL /NDL /NJH /NJS

    Write-Host "Zipping $f..."
    Compress-Archive -Path "$staging\*" -DestinationPath $destZip

    Remove-Item $staging -Recurse -Force -ErrorAction SilentlyContinue
}
if (Test-Path $tmpPath) { Remove-Item $tmpPath -Recurse -Force -ErrorAction SilentlyContinue }
Write-Host "All archives created successfully."
