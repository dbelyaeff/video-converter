import * as p from '@clack/prompts';
import pc from 'picocolors';
import { existsSync, symlinkSync, copyFileSync, chmodSync } from 'fs';
import { join, dirname } from 'path';
import { homedir, platform } from 'os';
import { spawn } from 'child_process';
import { i18n } from './i18n.ts';

const SCRIPT_NAME = 'video-converter';
const WINDOWS_SCRIPT_NAME = 'video-converter.cmd';

function getScriptPath(): string {
  // Путь к директории src
  if (import.meta.url) {
    const currentFile = new URL(import.meta.url).pathname;
    return join(dirname(currentFile), 'index.ts');
  }
  return join(dirname(process.argv[1]), 'src', 'index.ts');
}

function getBunPath(): string {
  // Пытаемся найти bun в PATH
  try {
    const { execSync } = require('child_process');
    return execSync('which bun || command -v bun || echo bun', { encoding: 'utf8' }).trim();
  } catch {
    return 'bun';
  }
}

function getWindowsScriptContent(scriptPath: string): string {
  return `@echo off
setlocal enabledelayedexpansion

:: Проверяем наличие bun
where bun >nul 2>&1
if errorlevel 1 (
    echo Ошибка: bun не найден в PATH
    echo Установите Bun: https://bun.sh
    exit /b 1
)

bun run "${scriptPath}" %*`;
}

function getUnixScriptContent(scriptPath: string): string {
  const bunPath = getBunPath();
  return `#!/bin/bash

# Проверяем наличие bun
if ! command -v bun &> /dev/null; then
    echo "Ошибка: bun не найден в PATH"
    echo "Установите Bun: https://bun.sh"
    exit 1
fi

# Проверяем существование файла
if [ ! -f "${scriptPath}" ]; then
    echo "Ошибка: файл не найден: ${scriptPath}"
    exit 1
fi

${bunPath} run "${scriptPath}" "$@"`;
}

export async function showGlobalInstallMenu(): Promise<void> {
  console.clear();
  p.intro(pc.cyan(i18n.t('globalInstall.title')));
  p.note(i18n.t('globalInstall.description'));

  const method = await p.select({
    message: i18n.t('globalInstall.title'),
    options: [
      { value: 'symlink', label: i18n.t('globalInstall.methods.symlink') },
      { value: 'copy', label: i18n.t('globalInstall.methods.copy') },
      { value: 'path', label: i18n.t('globalInstall.methods.path') },
      { value: 'back', label: i18n.t('globalInstall.methods.back') },
    ],
  });

  if (p.isCancel(method) || method === 'back') {
    return;
  }

  switch (method) {
    case 'symlink':
      await installViaSymlink();
      break;
    case 'copy':
      await installViaCopy();
      break;
    case 'path':
      await showPathInstructions();
      break;
  }
}

async function installViaSymlink(): Promise<void> {
  const os = platform();
  const scriptPath = getScriptPath();
  
  if (os === 'win32') {
    // Для Windows создаем .cmd файл
    const targetDir = join(homedir(), 'AppData', 'Local', 'Microsoft', 'WindowsApps');
    const targetPath = join(targetDir, WINDOWS_SCRIPT_NAME);
    
    try {
      const cmdContent = getWindowsScriptContent(scriptPath);
      const { writeFileSync } = await import('fs');
      writeFileSync(targetPath, cmdContent);
      
      p.outro(pc.green(i18n.t('globalInstall.symlink.success', { path: targetPath })));
    } catch (error) {
      p.outro(pc.red(i18n.t('globalInstall.symlink.error', { error: String(error) })));
    }
  } else {
    // Для Unix систем
    const targetPath = join('/usr/local/bin', SCRIPT_NAME);
    
    try {
      if (existsSync(targetPath)) {
        const { unlinkSync } = await import('fs');
        unlinkSync(targetPath);
      }
      
      symlinkSync(scriptPath, targetPath);
      chmodSync(targetPath, 0o755);
      
      p.outro(pc.green(i18n.t('globalInstall.symlink.success', { path: targetPath })));
    } catch (error) {
      p.log.error(pc.red(i18n.t('globalInstall.symlink.error', { error: String(error) })));
      p.log.info(pc.yellow(i18n.t('globalInstall.copy.sudoRequired')));
      
      const useSudo = await p.confirm({
        message: 'Попробовать с sudo? / Try with sudo?',
      });
      
      if (useSudo) {
        await installWithSudo('symlink', scriptPath, targetPath);
      }
    }
  }
  
  await p.select({ message: '', options: [{ value: 'ok', label: 'OK' }] });
}

async function installViaCopy(): Promise<void> {
  const os = platform();
  const scriptPath = getScriptPath();
  
  if (os === 'win32') {
    const targetDir = 'C:\\Program Files\\video-converter';
    const targetPath = join(targetDir, WINDOWS_SCRIPT_NAME);
    
    try {
      const { mkdirSync, writeFileSync } = await import('fs');
      mkdirSync(targetDir, { recursive: true });
      
      const cmdContent = getWindowsScriptContent(scriptPath);
      writeFileSync(targetPath, cmdContent);
      
      p.outro(pc.green(i18n.t('globalInstall.copy.success', { path: targetPath })));
      p.log.info(pc.cyan('Добавьте путь в PATH:'));
      p.log.info(pc.white(`setx PATH "%PATH%;${targetDir}"`));
    } catch (error) {
      p.outro(pc.red(i18n.t('globalInstall.copy.error', { error: String(error) })));
    }
  } else {
    const targetPath = join('/usr/local/bin', SCRIPT_NAME);
    
    try {
      // Создаем wrapper скрипт
      const wrapperContent = getUnixScriptContent(scriptPath);
      const { writeFileSync } = await import('fs');
      writeFileSync(targetPath, wrapperContent);
      chmodSync(targetPath, 0o755);
      
      p.outro(pc.green(i18n.t('globalInstall.copy.success', { path: targetPath })));
    } catch (error) {
      p.log.error(pc.red(i18n.t('globalInstall.copy.error', { error: String(error) })));
      p.log.info(pc.yellow(i18n.t('globalInstall.copy.sudoRequired')));
      
      const useSudo = await p.confirm({
        message: 'Попробовать с sudo? / Try with sudo?',
      });
      
      if (useSudo) {
        await installWithSudo('copy', scriptPath, targetPath);
      }
    }
  }
  
  await p.select({ message: '', options: [{ value: 'ok', label: 'OK' }] });
}

async function installWithSudo(method: 'symlink' | 'copy', sourcePath: string, targetPath: string): Promise<void> {
  const spinner = p.spinner();
  spinner.start('Установка с sudo... / Installing with sudo...');
  
  return new Promise((resolve) => {
    let command: string;
    
    if (method === 'symlink') {
      command = `sudo ln -sf "${sourcePath}" "${targetPath}" && sudo chmod 755 "${targetPath}"`;
    } else {
      const wrapperContent = getUnixScriptContent(sourcePath);
      command = `sudo bash -c 'cat > "${targetPath}"' << 'EOF'
${wrapperContent}
EOF
sudo chmod 755 "${targetPath}"`;
    }
    
    const proc = spawn('bash', ['-c', command]);
    
    proc.on('close', (code) => {
      if (code === 0) {
        spinner.stop(pc.green(i18n.t('globalInstall.copy.success', { path: targetPath })));
      } else {
        spinner.stop(pc.red(i18n.t('globalInstall.copy.error', { error: 'sudo failed' })));
      }
      resolve();
    });
    
    proc.on('error', () => {
      spinner.stop(pc.red(i18n.t('globalInstall.copy.error', { error: 'command failed' })));
      resolve();
    });
  });
}

async function showPathInstructions(): Promise<void> {
  const scriptPath = dirname(getScriptPath());
  
  console.clear();
  p.intro(pc.cyan(i18n.t('globalInstall.title')));
  
  p.log.info(pc.cyan(i18n.t('globalInstall.path.instruction')));
  p.log.success(pc.white(`export PATH="$PATH:${scriptPath}"`));
  
  p.log.info(pc.dim('\n💡 ' + (i18n.getLanguage() === 'ru' 
    ? 'После добавления перезапустите терминал или выполните: source ~/.bashrc'
    : 'After adding, restart terminal or run: source ~/.bashrc')));
  
  await p.select({ message: '', options: [{ value: 'ok', label: 'OK' }] });
}
