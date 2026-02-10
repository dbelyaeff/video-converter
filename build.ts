#!/usr/bin/env bun

import { $ } from 'bun';
import { existsSync, mkdirSync, copyFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const DIST_DIR = './dist';
const PLATFORMS = [
  { os: 'windows', arch: 'x64', suffix: '.exe' },
  { os: 'linux', arch: 'x64', suffix: '' },
  { os: 'darwin', arch: 'x64', suffix: '' },
  { os: 'darwin', arch: 'arm64', suffix: '' },
];

console.log('🚀 Сборка бинарников для всех платформ...');
console.log('🚀 Building binaries for all platforms...\n');

// Создаем директорию dist
if (!existsSync(DIST_DIR)) {
  mkdirSync(DIST_DIR, { recursive: true });
}

// Собираем для каждой платформы
for (const platform of PLATFORMS) {
  const filename = `video-converter-${platform.os}-${platform.arch}${platform.suffix}`;
  const outputPath = join(DIST_DIR, filename);
  
  console.log(`📦 Сборка для ${platform.os} (${platform.arch})...`);
  
  try {
    // Компилируем с помощью bun
    await $`bun build --compile --target=bun-${platform.os}-${platform.arch} ./src/index.ts --outfile ${outputPath}`;
    
    console.log(`✅ Собрано: ${outputPath}`);
  } catch (error) {
    console.error(`❌ Ошибка сборки для ${platform.os} (${platform.arch}):`, error);
  }
}

// Копируем README
if (existsSync('./README.md')) {
  copyFileSync('./README.md', join(DIST_DIR, 'README.md'));
  console.log('\n📝 README.md скопирован');
}

// Создаем скрипт установки
const installScript = `#!/bin/bash
# Скрипт установки video-converter

set -e

OS="$(uname -s)"
ARCH="$(uname -m)"

# Определяем платформу
case "$OS" in
  Linux*)     PLATFORM=linux;;
  Darwin*)    PLATFORM=darwin;;
  CYGWIN*|MINGW*|MSYS*) PLATFORM=windows;;
  *)          echo "❌ Неподдерживаемая ОС: $OS" && exit 1;;
esac

# Определяем архитектуру
case "$ARCH" in
  x86_64)  ARCH=x64;;
  arm64|aarch64) ARCH=arm64;;
  *)       echo "❌ Неподдерживаемая архитектура: $ARCH" && exit 1;;
esac

# Для macOS x64 используем arm64 (universal binary)
if [ "$PLATFORM" = "darwin" ] && [ "$ARCH" = "x64" ]; then
  ARCH=arm64
fi

BINARY="video-converter-$PLATFORM-$ARCH"
if [ "$PLATFORM" = "windows" ]; then
  BINARY="${BINARY}.exe"
fi

echo "📥 Установка video-converter для $PLATFORM ($ARCH)..."

if [ ! -f "$BINARY" ]; then
  echo "❌ Бинарник не найден: $BINARY"
  exit 1
fi

# Устанавливаем
INSTALL_DIR="/usr/local/bin"
if [ "$PLATFORM" = "windows" ]; then
  INSTALL_DIR="$HOME/AppData/Local/Microsoft/WindowsApps"
  mkdir -p "$INSTALL_DIR"
  cp "$BINARY" "$INSTALL_DIR/video-converter.exe"
else
  if [ -w "$INSTALL_DIR" ]; then
    cp "$BINARY" "$INSTALL_DIR/video-converter"
    chmod +x "$INSTALL_DIR/video-converter"
  else
    echo "🔑 Требуются права администратора..."
    sudo cp "$BINARY" "$INSTALL_DIR/video-converter"
    sudo chmod +x "$INSTALL_DIR/video-converter"
  fi
fi

echo "✅ video-converter установлен!"
echo "🎉 Запустите: video-converter"
`;

writeFileSync(join(DIST_DIR, 'install.sh'), installScript);
console.log('📦 install.sh создан');

console.log('\n✨ Сборка завершена!');
console.log(`📂 Бинарники находятся в папке: ${DIST_DIR}/`);
