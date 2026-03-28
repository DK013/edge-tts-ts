# Navigate to typescript root
Set-Location "$PSScriptRoot\..\.."

# Ensure the package is built
npm run build

Write-Host "--- Listing first 10 voices ---"
node dist/cli/edge-tts.js --list-voices | Select-Object -First 10

Write-Host "--- Synthesizing text ---"
node dist/cli/edge-tts.js --text "Hello from the Node.js PowerShell example!" --write-media examples\nodejs\example-powershell.mp3 --write-subtitles examples\nodejs\example-powershell.srt

Write-Host "--- Customizing voice settings ---"
node dist/cli/edge-tts.js --voice en-US-EmmaMultilingualNeural --rate="+10%" --volume="+10%" --text "Fast and loud voice synthesis." --write-media examples\nodejs\example-custom-ps.mp3

Write-Host "--- Testing playback ---"
node dist/cli/edge-playback.js --text "This is a playback test from the PowerShell script."
