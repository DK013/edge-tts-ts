#!/bin/bash

# Navigate to typescript root and ensure the package is built
cd ../..
npm run build

echo "--- Listing first 10 voices ---"
node dist/cli/edge-tts.js --list-voices | head -n 10

echo "--- Synthesizing text ---"
node dist/cli/edge-tts.js --text "Hello from the Node.js shell example!" --write-media examples/nodejs/example-shell.mp3 --write-subtitles examples/nodejs/example-shell.srt

echo "--- Customizing voice settings ---"
node dist/cli/edge-tts.js --voice en-US-EmmaMultilingualNeural --rate=+10% --volume=+10% --text "Fast and loud voice synthesis." --write-media examples/nodejs/example-custom.mp3

echo "--- Testing playback ---"
node dist/cli/edge-playback.js --text "This is a playback test from the shell script."
