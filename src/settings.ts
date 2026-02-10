import { parse, stringify } from 'yaml';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import type { Language } from './i18n.ts';

export interface VideoBitrates {
  '4k': number;
  '1080p': number;
  '720p': number;
  '480p': number;
}

export type AudioBitrate = 64 | 96 | 128 | 256 | 320;

export interface Settings {
  language: Language;
  videoBitrates: VideoBitrates;
  audioBitrate: AudioBitrate;
}

const DEFAULT_SETTINGS: Settings = {
  language: 'ru',
  videoBitrates: {
    '4k': 5000,
    '1080p': 3000,
    '720p': 2000,
    '480p': 1000,
  },
  audioBitrate: 128,
};

const CONFIG_DIR = join(homedir(), '.video-converter');
const CONFIG_FILE = join(CONFIG_DIR, 'config.yaml');

export class SettingsManager {
  private settings: Settings;

  constructor() {
    this.settings = this.loadSettings();
  }

  private loadSettings(): Settings {
    try {
      if (existsSync(CONFIG_FILE)) {
        const content = readFileSync(CONFIG_FILE, 'utf-8');
        const parsed = parse(content) as Partial<Settings>;
        return this.mergeWithDefaults(parsed);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
    return { ...DEFAULT_SETTINGS };
  }

  private mergeWithDefaults(parsed: Partial<Settings>): Settings {
    return {
      language: parsed.language || DEFAULT_SETTINGS.language,
      videoBitrates: {
        '4k': parsed.videoBitrates?.['4k'] || DEFAULT_SETTINGS.videoBitrates['4k'],
        '1080p': parsed.videoBitrates?.['1080p'] || DEFAULT_SETTINGS.videoBitrates['1080p'],
        '720p': parsed.videoBitrates?.['720p'] || DEFAULT_SETTINGS.videoBitrates['720p'],
        '480p': parsed.videoBitrates?.['480p'] || DEFAULT_SETTINGS.videoBitrates['480p'],
      },
      audioBitrate: parsed.audioBitrate || DEFAULT_SETTINGS.audioBitrate,
    };
  }

  saveSettings(): void {
    try {
      if (!existsSync(CONFIG_DIR)) {
        mkdirSync(CONFIG_DIR, { recursive: true });
      }
      const yaml = stringify(this.settings);
      writeFileSync(CONFIG_FILE, yaml, 'utf-8');
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  }

  getSettings(): Settings {
    return { ...this.settings };
  }

  setLanguage(language: Language): void {
    this.settings.language = language;
    this.saveSettings();
  }

  setVideoBitrate(quality: keyof VideoBitrates, bitrate: number): void {
    const clampedBitrate = Math.max(900, Math.min(10000, Math.round(bitrate / 100) * 100));
    this.settings.videoBitrates[quality] = clampedBitrate;
    this.saveSettings();
  }

  setAudioBitrate(bitrate: AudioBitrate): void {
    this.settings.audioBitrate = bitrate;
    this.saveSettings();
  }

  validateVideoBitrate(value: number): boolean {
    if (value < 900 || value > 10000) return false;
    return value % 100 === 0;
  }
}

export const settingsManager = new SettingsManager();
