import { spawn } from 'child_process';
import { createWriteStream, existsSync, chmodSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir, platform } from 'os';
import * as p from '@clack/prompts';
import pc from 'picocolors';
import { i18n } from './i18n.ts';

const CONFIG_DIR = join(homedir(), '.video-converter');
const FFMPEG_DIR = join(CONFIG_DIR, 'ffmpeg');

interface FfmpegDownloadInfo {
  platform: string;
  arch: string;
  url: string;
  filename: string;
  executable: string;
}

function getFfmpegDownloadInfo(): FfmpegDownloadInfo | null {
  const os = platform();
  const arch = process.arch;
  
  // Официальные сборки от BtbN (https://github.com/BtbN/FFmpeg-Builds)
  const baseUrl = 'https://github.com/BtbN/FFmpeg-Builds/releases/download/latest';
  
  switch (os) {
    case 'win32':
      return {
        platform: 'windows',
        arch,
        url: `${baseUrl}/ffmpeg-master-latest-win64-gpl.zip`,
        filename: 'ffmpeg.zip',
        executable: 'ffmpeg.exe',
      };
    case 'darwin':
      // Для macOS используем homebrew или static build
      if (arch === 'arm64') {
        return {
          platform: 'macos',
          arch: 'arm64',
          url: 'https://evermeet.cx/ffmpeg/getrelease/ffmpeg/zip',
          filename: 'ffmpeg.zip',
          executable: 'ffmpeg',
        };
      }
      return {
        platform: 'macos',
        arch: 'x64',
        url: 'https://evermeet.cx/ffmpeg/getrelease/ffmpeg/zip',
        filename: 'ffmpeg.zip',
        executable: 'ffmpeg',
      };
    case 'linux':
      return {
        platform: 'linux',
        arch,
        url: `${baseUrl}/ffmpeg-master-latest-linux64-gpl.tar.xz`,
        filename: 'ffmpeg.tar.xz',
        executable: 'ffmpeg',
      };
    default:
      return null;
  }
}

export function getFfmpegPath(): string {
  const localFfmpeg = join(FFMPEG_DIR, getFfmpegDownloadInfo()?.executable || 'ffmpeg');
  
  if (existsSync(localFfmpeg)) {
    return localFfmpeg;
  }
  
  // Возвращаем системный ffmpeg (если есть в PATH)
  return 'ffmpeg';
}

export async function checkFfmpegInstalled(): Promise<boolean> {
  const ffmpegPath = getFfmpegPath();
  
  return new Promise((resolve) => {
    const ffmpeg = spawn(ffmpegPath, ['-version']);
    ffmpeg.on('error', () => resolve(false));
    ffmpeg.on('close', (code) => resolve(code === 0));
  });
}

async function downloadFile(url: string, dest: string, onProgress: (progress: number) => void): Promise<void> {
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Failed to download: ${response.statusText}`);
  }
  
  const totalSize = parseInt(response.headers.get('content-length') || '0');
  let downloadedSize = 0;
  
  const fileStream = createWriteStream(dest);
  
  // @ts-ignore - Bun specific
  const reader = response.body?.getReader();
  
  if (!reader) {
    throw new Error('Failed to get response reader');
  }
  
  while (true) {
    const { done, value } = await reader.read();
    
    if (done) break;
    
    fileStream.write(value);
    downloadedSize += value.length;
    
    if (totalSize > 0) {
      onProgress((downloadedSize / totalSize) * 100);
    }
  }
  
  fileStream.end();
  
  return new Promise((resolve, reject) => {
    fileStream.on('finish', resolve);
    fileStream.on('error', reject);
  });
}

async function extractArchive(archivePath: string, destDir: string): Promise<void> {
  const { platform } = process;
  
  if (archivePath.endsWith('.zip')) {
    // Для Windows и macOS используем unzip
    if (platform === 'win32') {
      await new Promise((resolve, reject) => {
        const proc = spawn('powershell', [
          '-Command',
          `Expand-Archive -Path "${archivePath}" -DestinationPath "${destDir}" -Force`
        ]);
        proc.on('close', (code) => code === 0 ? resolve(null) : reject(new Error('Extraction failed')));
      });
    } else {
      await new Promise((resolve, reject) => {
        const proc = spawn('unzip', ['-o', archivePath, '-d', destDir]);
        proc.on('close', (code) => code === 0 ? resolve(null) : reject(new Error('Extraction failed')));
      });
    }
  } else if (archivePath.endsWith('.tar.xz')) {
    // Для Linux
    await new Promise((resolve, reject) => {
      const proc = spawn('tar', ['-xf', archivePath, '-C', destDir]);
      proc.on('close', (code) => code === 0 ? resolve(null) : reject(new Error('Extraction failed')));
    });
  }
}

async function findFfmpegExecutable(dir: string, executableName: string): Promise<string | null> {
  const { readdirSync, statSync } = await import('fs');
  
  function searchDirectory(directory: string): string | null {
    try {
      const entries = readdirSync(directory);
      
      for (const entry of entries) {
        const fullPath = join(directory, entry);
        const stat = statSync(fullPath);
        
        if (stat.isDirectory()) {
          const found = searchDirectory(fullPath);
          if (found) return found;
        } else if (entry === executableName) {
          return fullPath;
        }
      }
    } catch (e) {
      return null;
    }
    
    return null;
  }
  
  return searchDirectory(dir);
}

export async function downloadAndInstallFfmpeg(): Promise<boolean> {
  const info = getFfmpegDownloadInfo();
  
  if (!info) {
    p.log.error(pc.red('❌ Не поддерживаемая платформа для автоматической загрузки FFmpeg'));
    p.log.error(pc.red('❌ Unsupported platform for automatic FFmpeg download'));
    return false;
  }
  
  p.log.info(pc.cyan(`📥 Загрузка FFmpeg для ${info.platform} (${info.arch})...`));
  p.log.info(pc.cyan(`📥 Downloading FFmpeg for ${info.platform} (${info.arch})...`));
  
  try {
    if (!existsSync(FFMPEG_DIR)) {
      mkdirSync(FFMPEG_DIR, { recursive: true });
    }
    
    const archivePath = join(FFMPEG_DIR, info.filename);
    
    // Загружаем архив
    const spinner = p.spinner();
    spinner.start('Загрузка FFmpeg... / Downloading FFmpeg...');
    
    await downloadFile(info.url, archivePath, (progress) => {
      spinner.message(`Загрузка FFmpeg... ${progress.toFixed(1)}% / Downloading FFmpeg... ${progress.toFixed(1)}%`);
    });
    
    spinner.stop('✅ Загрузка завершена / Download complete');
    
    // Распаковываем
    spinner.start('Распаковка FFmpeg... / Extracting FFmpeg...');
    await extractArchive(archivePath, FFMPEG_DIR);
    spinner.stop('✅ Распаковка завершена / Extraction complete');
    
    // Ищем исполняемый файл
    const ffmpegPath = await findFfmpegExecutable(FFMPEG_DIR, info.executable);
    
    if (!ffmpegPath) {
      throw new Error('FFmpeg executable not found in extracted archive');
    }
    
    // Делаем исполняемым (для Unix)
    if (process.platform !== 'win32') {
      chmodSync(ffmpegPath, 0o755);
    }
    
    // Перемещаем в нужное место
    const targetPath = join(FFMPEG_DIR, info.executable);
    const { renameSync } = await import('fs');
    renameSync(ffmpegPath, targetPath);
    
    // Удаляем архив и временные файлы
    const { unlinkSync, rmSync } = await import('fs');
    unlinkSync(archivePath);
    
    // Очищаем временные директории
    const entries = readdirSync(FFMPEG_DIR);
    for (const entry of entries) {
      const fullPath = join(FFMPEG_DIR, entry);
      if (entry !== info.executable) {
        try {
          const stat = statSync(fullPath);
          if (stat.isDirectory()) {
            rmSync(fullPath, { recursive: true });
          } else {
            unlinkSync(fullPath);
          }
        } catch (e) {
          // Игнорируем ошибки при очистке
        }
      }
    }
    
    p.log.success(pc.green('✅ FFmpeg успешно установлен! / FFmpeg installed successfully!'));
    return true;
    
  } catch (error) {
    p.log.error(pc.red(`❌ Ошибка установки FFmpeg: ${error}`));
    p.log.error(pc.red(`❌ FFmpeg installation error: ${error}`));
    return false;
  }
}
