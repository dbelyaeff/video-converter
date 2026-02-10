import { spawn } from 'child_process';
import { statSync } from 'fs';
import { basename, extname, join, dirname } from 'path';
import type { Settings } from './settings.ts';

export interface VideoInfo {
  path: string;
  name: string;
  size: number;
  width: number;
  height: number;
  duration: number;
  bitrate: number;
}

export type Quality = '1080p' | '720p' | '480p' | 'audio';

export interface ConversionTask {
  inputPath: string;
  outputPath: string;
  quality: Quality;
  settings: Settings;
}

const VIDEO_EXTENSIONS = ['.mp4', '.avi', '.mkv', '.mov', '.wmv', '.flv', '.webm', '.m4v', '.mpeg', '.mpg'];

export function isVideoFile(filename: string): boolean {
  const ext = extname(filename).toLowerCase();
  return VIDEO_EXTENSIONS.includes(ext);
}

export async function getVideoInfo(filePath: string): Promise<VideoInfo> {
  return new Promise((resolve, reject) => {
    const ffprobe = spawn('ffprobe', [
      '-v', 'error',
      '-select_streams', 'v:0',
      '-show_entries', 'stream=width,height,duration,bit_rate',
      '-show_entries', 'format=duration,bit_rate',
      '-of', 'json',
      filePath
    ]);

    let output = '';
    let errorOutput = '';

    ffprobe.stdout.on('data', (data) => {
      output += data.toString();
    });

    ffprobe.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    ffprobe.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`ffprobe failed: ${errorOutput}`));
        return;
      }

      try {
        const info = JSON.parse(output);
        const stream = info.streams?.[0] || {};
        const format = info.format || {};

        const stats = statSync(filePath);

        resolve({
          path: filePath,
          name: basename(filePath),
          size: stats.size,
          width: parseInt(stream.width) || 0,
          height: parseInt(stream.height) || 0,
          duration: parseFloat(stream.duration || format.duration) || 0,
          bitrate: parseInt(stream.bit_rate || format.bit_rate) || 0,
        });
      } catch (error) {
        reject(error);
      }
    });
  });
}

export function getAvailableQualities(videoInfo: VideoInfo): Quality[] {
  const qualities: Quality[] = [];
  const height = videoInfo.height;

  if (height >= 1080) qualities.push('1080p');
  if (height >= 720) qualities.push('720p');
  if (height >= 480) qualities.push('480p');
  qualities.push('audio');

  return qualities;
}

export function formatFileSize(bytes: number): string {
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1) {
    return `${gb.toFixed(2)} GB`;
  }
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(2)} MB`;
}

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  if (mins >= 60) {
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return `${hours}h ${remainingMins}m ${secs}s`;
  }
  return `${mins}m ${secs}s`;
}

export async function convertVideo(
  task: ConversionTask,
  onProgress: (progress: number) => void
): Promise<{ outputPath: string; size: number }> {
  return new Promise((resolve, reject) => {
    const { inputPath, outputPath, quality, settings } = task;
    
    const args: string[] = ['-i', inputPath, '-y'];
    
    if (quality === 'audio') {
      args.push('-vn', '-c:a', 'libmp3lame', '-b:a', `${settings.audioBitrate}k`);
    } else {
      const height = quality === '1080p' ? 1080 : quality === '720p' ? 720 : 480;
      const bitrate = settings.videoBitrates[quality];
      
      args.push(
        '-c:v', 'libx264',
        '-preset', 'medium',
        '-crf', '23',
        '-b:v', `${bitrate}k`,
        '-maxrate', `${bitrate * 1.5}k`,
        '-bufsize', `${bitrate * 2}k`,
        '-vf', `scale=-2:${height}`,
        '-c:a', 'aac',
        '-b:a', '128k',
        '-movflags', '+faststart'
      );
    }
    
    args.push(outputPath);

    const ffmpeg = spawn('ffmpeg', args);
    
    let duration = 0;
    let errorOutput = '';

    ffmpeg.stderr.on('data', (data) => {
      const line = data.toString();
      errorOutput += line;

      if (duration === 0) {
        const durationMatch = line.match(/Duration: (\d{2}):(\d{2}):(\d{2}\.\d{2})/);
        if (durationMatch) {
          const hours = parseInt(durationMatch[1]);
          const minutes = parseInt(durationMatch[2]);
          const seconds = parseFloat(durationMatch[3]);
          duration = hours * 3600 + minutes * 60 + seconds;
        }
      }

      if (duration > 0) {
        const timeMatch = line.match(/time=(\d{2}):(\d{2}):(\d{2}\.\d{2})/);
        if (timeMatch) {
          const hours = parseInt(timeMatch[1]);
          const minutes = parseInt(timeMatch[2]);
          const seconds = parseFloat(timeMatch[3]);
          const currentTime = hours * 3600 + minutes * 60 + seconds;
          const progress = Math.min(100, (currentTime / duration) * 100);
          onProgress(progress);
        }
      }
    });

    ffmpeg.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`ffmpeg failed with code ${code}: ${errorOutput}`));
        return;
      }

      try {
        const stats = statSync(outputPath);
        resolve({ outputPath, size: stats.size });
      } catch (error) {
        reject(error);
      }
    });

    ffmpeg.on('error', (error) => {
      reject(error);
    });
  });
}

export function generateOutputFilename(inputPath: string, quality: Quality): string {
  const dir = dirname(inputPath);
  const name = basename(inputPath, extname(inputPath));
  
  if (quality === 'audio') {
    return join(dir, `${name}.mp3`);
  }
  
  return join(dir, `${name}_${quality}.mp4`);
}

export function checkFfmpegInstalled(): Promise<boolean> {
  return new Promise((resolve) => {
    const ffmpeg = spawn('ffmpeg', ['-version']);
    ffmpeg.on('error', () => resolve(false));
    ffmpeg.on('close', (code) => resolve(code === 0));
  });
}
