import * as p from '@clack/prompts';
import pc from 'picocolors';
import { i18n, type Language } from './i18n.ts';
import { settingsManager, type VideoBitrates, type AudioBitrate } from './settings.ts';
import { showGlobalInstallMenu } from './global-install.ts';

export async function showSettingsMenu(): Promise<void> {
  const settings = settingsManager.getSettings();
  
  while (true) {
    console.clear();
    p.intro(pc.cyan(i18n.t('settings.title')));

    const action = await p.select({
      message: i18n.t('settings.title'),
      options: [
        { value: 'language', label: i18n.t('settings.language') },
        { value: 'video', label: i18n.t('settings.video') },
        { value: 'audio', label: i18n.t('settings.audio') },
        { value: 'global', label: i18n.t('globalInstall.title') },
        { value: 'back', label: i18n.t('settings.back') },
      ],
    });

    if (p.isCancel(action) || action === 'back') {
      break;
    }

    switch (action) {
      case 'language':
        await showLanguageSettings();
        break;
      case 'video':
        await showVideoSettings();
        break;
      case 'audio':
        await showAudioSettings();
        break;
      case 'global':
        await showGlobalInstallMenu();
        break;
    }
  }
}

async function showLanguageSettings(): Promise<void> {
  console.clear();
  p.intro(pc.cyan(i18n.t('settings.language')));

  const lang = await p.select({
    message: i18n.t('settings.languageSelect'),
    options: [
      { value: 'ru', label: '🇷🇺 Русский' },
      { value: 'en', label: '🇬🇧 English' },
    ],
  });

  if (p.isCancel(lang)) return;

  settingsManager.setLanguage(lang as Language);
  i18n.setLanguage(lang as Language);
  
  p.outro(pc.green(i18n.t('settings.saved')));
  await p.select({ message: '', options: [{ value: 'ok', label: 'OK' }] });
}

async function showVideoSettings(): Promise<void> {
  const settings = settingsManager.getSettings();
  
  while (true) {
    console.clear();
    p.intro(pc.cyan(i18n.t('settings.videoBitrate.title')));
    p.note(i18n.t('settings.videoBitrate.description'));

    const bitrates = settings.videoBitrates;
    const quality = await p.select({
      message: i18n.t('settings.videoBitrate.title'),
      options: [
        { value: '4k', label: `${i18n.t('settings.videoBitrate.4k')} - ${bitrates['4k']} Kbps` },
        { value: '1080p', label: `${i18n.t('settings.videoBitrate.1080p')} - ${bitrates['1080p']} Kbps` },
        { value: '720p', label: `${i18n.t('settings.videoBitrate.720p')} - ${bitrates['720p']} Kbps` },
        { value: '480p', label: `${i18n.t('settings.videoBitrate.480p')} - ${bitrates['480p']} Kbps` },
        { value: 'back', label: i18n.t('settings.back') },
      ],
    });

    if (p.isCancel(quality) || quality === 'back') {
      break;
    }

    await editVideoBitrate(quality as keyof VideoBitrates);
  }
}

async function editVideoBitrate(quality: keyof VideoBitrates): Promise<void> {
  const settings = settingsManager.getSettings();
  const currentValue = settings.videoBitrates[quality];

  p.note(i18n.t('settings.videoBitrate.hint'));

  const value = await p.text({
    message: `${i18n.t('settings.videoBitrate.title')} (${quality})`,
    placeholder: currentValue.toString(),
    defaultValue: currentValue.toString(),
    validate: (input) => {
      const num = parseInt(input);
      if (isNaN(num)) return i18n.t('common.error.number');
      if (!settingsManager.validateVideoBitrate(num)) {
        return i18n.t('settings.videoBitrate.hint');
      }
    },
  });

  if (p.isCancel(value)) return;

  const bitrate = parseInt(value);
  settingsManager.setVideoBitrate(quality, bitrate);
  
  p.outro(pc.green(i18n.t('settings.saved')));
  await p.select({ message: '', options: [{ value: 'ok', label: 'OK' }] });
}

async function showAudioSettings(): Promise<void> {
  const settings = settingsManager.getSettings();
  
  console.clear();
  p.intro(pc.cyan(i18n.t('settings.audioBitrate.title')));
  p.note(i18n.t('settings.audioBitrate.description'));

  const bitrates: AudioBitrate[] = [64, 96, 128, 256, 320];
  
  const selected = await p.select({
    message: i18n.t('settings.audioBitrate.select'),
    options: bitrates.map(rate => ({
      value: rate,
      label: `${rate} Kbps ${rate === settings.audioBitrate ? '✓' : ''}`,
    })),
  });

  if (p.isCancel(selected)) return;

  settingsManager.setAudioBitrate(selected as AudioBitrate);
  
  p.outro(pc.green(i18n.t('settings.saved')));
  await p.select({ message: '', options: [{ value: 'ok', label: 'OK' }] });
}
