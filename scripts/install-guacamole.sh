#!/bin/bash

# Install official Apache Guacamole common-js from GitHub
GUAC_VERSION="1.6.0"
GUAC_DIR="node_modules/guacamole-common-js"

echo "Installing Apache Guacamole common-js ${GUAC_VERSION}..."

# Remove existing directory if it exists
rm -rf "$GUAC_DIR"

# Create temp directory
TEMP_DIR=$(mktemp -d)
cd "$TEMP_DIR"

# Clone the specific version
git clone --depth 1 --branch ${GUAC_VERSION} https://github.com/apache/guacamole-client.git

# Copy only the guacamole-common-js directory
mkdir -p "$(dirname "$OLDPWD/$GUAC_DIR")"
cp -r guacamole-client/guacamole-common-js "$OLDPWD/$GUAC_DIR"

# Clean up
cd "$OLDPWD"
rm -rf "$TEMP_DIR"

# Create index.js to export all modules
cat > "$GUAC_DIR/index.js" << 'EOF'
// Export the Guacamole namespace
var Guacamole = Guacamole || {};

// Load all Guacamole modules
require('./src/main/webapp/modules/Namespace.js');
require('./src/main/webapp/modules/Status.js');
require('./src/main/webapp/modules/ArrayBufferReader.js');
require('./src/main/webapp/modules/ArrayBufferWriter.js');
require('./src/main/webapp/modules/AudioContextFactory.js');
require('./src/main/webapp/modules/AudioPlayer.js');
require('./src/main/webapp/modules/AudioRecorder.js');
require('./src/main/webapp/modules/BlobReader.js');
require('./src/main/webapp/modules/BlobWriter.js');
require('./src/main/webapp/modules/Client.js');
require('./src/main/webapp/modules/DataURIReader.js');
require('./src/main/webapp/modules/Display.js');
require('./src/main/webapp/modules/Event.js');
require('./src/main/webapp/modules/InputSink.js');
require('./src/main/webapp/modules/InputStream.js');
require('./src/main/webapp/modules/IntegerPool.js');
require('./src/main/webapp/modules/JSONReader.js');
require('./src/main/webapp/modules/Keyboard.js');
require('./src/main/webapp/modules/KeyEventInterpreter.js');
require('./src/main/webapp/modules/Layer.js');
require('./src/main/webapp/modules/Mouse.js');
require('./src/main/webapp/modules/Object.js');
require('./src/main/webapp/modules/OnScreenKeyboard.js');
require('./src/main/webapp/modules/OutputStream.js');
require('./src/main/webapp/modules/Parser.js');
require('./src/main/webapp/modules/Position.js');
require('./src/main/webapp/modules/RawAudioFormat.js');
require('./src/main/webapp/modules/SessionRecording.js');
require('./src/main/webapp/modules/StringReader.js');
require('./src/main/webapp/modules/StringWriter.js');
require('./src/main/webapp/modules/Touch.js');
require('./src/main/webapp/modules/Tunnel.js');
require('./src/main/webapp/modules/UTF8Parser.js');
require('./src/main/webapp/modules/Version.js');
require('./src/main/webapp/modules/VideoPlayer.js');

module.exports = Guacamole;
EOF

# Modify package.json to add main field pointing to index.js
sed -i '$ s/}$/,"main": "index.js"\n}/' "$GUAC_DIR/package.json"

echo "Apache Guacamole common-js ${GUAC_VERSION} installed successfully!"
