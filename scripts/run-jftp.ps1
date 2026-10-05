$ErrorActionPreference = 'Stop'
Set-Location (Join-Path $PSScriptRoot '..')
& java -jar app/launcher/target/jftp-workshop.jar
exit $LASTEXITCODE
