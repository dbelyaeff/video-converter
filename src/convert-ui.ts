import * as p from '@clack/prompts';
import pc from 'picocolors';
import { readdirSync } from 'fs';
import { join, basename } from 'path';
import { i18n } from './i18n.ts';
import { settingsManager } from './settings.ts';
import {
  checkFfmpegInstalled,
  downloadAndInstallFfmpeg,
} from './ffmpeg-downloader.ts';
import {
  isVideoFile,
  getVideoInfo,
  getAvailableQualities,
  convertVideo,
  formatFileSize,
  formatDuration,
  generateOutputFilename,
  type VideoInfo,
  type Quality,
} from './video.ts';

export async function showConvertMenu(): Promise<void> {
  const ffmpegInstalled = await checkFfmpegInstalled();
  if (!ffmpegInstalled) {
    p.log.warning(pc.yellow('⚠️  FFmpeg не найден. Требуется установка.'));
    p.log.warning(pc.yellow('⚠️  FFmpeg not found. Installation required.'));
    
    const shouldDownload = await p.confirm({
      message: i18n.t('ffmpeg.downloadPrompt'),
    });
    
    if (p.isCancel(shouldDownload) || !shouldDownload) {
      return;
    }
    
    const installed = await downloadAndInstallFfmpeg();
    if (!installed) {
      await p.select({ message: '', options: [{ value: 'ok', label: 'OK' }] });
      return;
    }
  }

  console.clear();
  p.intro(pc.cyan(i18n.t('convert.title')));

  const cwd = process.cwd();
  const files = readdirSync(cwd)
    .filter(f => !f.startsWith('.')) // Исключаем скрытые файлы
    .filter(isVideoFile)
    .map(f => join(cwd, f));

  if (files.length === 0) {
    p.log.error(pc.red(i18n.t('convert.noFiles')));
    await p.select({ message: '', options: [{ value: 'ok', label: 'OK' }] });
    return;
  }

  // Если файлов много, предлагаем поиск
  let filteredFiles = files;
  
  if (files.length > 10) {
    p.note(i18n.t('convert.searchHint', { count: files.length.toString() }));
    
    const searchQuery = await p.text({
      message: i18n.t('common.search'),
      placeholder: i18n.t('convert.searchPlaceholder'),
    });

    if (p.isCancel(searchQuery)) return;

    if (searchQuery && (searchQuery as string).trim()) {
      const query = (searchQuery as string).toLowerCase();
      filteredFiles = files.filter(f => basename(f).toLowerCase().includes(query));
    }

    if (filteredFiles.length === 0) {
      p.log.error(pc.red(i18n.t('convert.noSearchResults')));
      await p.select({ message: '', options: [{ value: 'ok', label: 'OK' }] });
      return;
    }
  }

  const selectedFile = await p.select({
    message: i18n.t('convert.selectFile'),
    options: filteredFiles.map(f => ({ value: f, label: basename(f) })),
  });

  if (p.isCancel(selectedFile)) return;

  const spinner = p.spinner();
  spinner.start(i18n.t('convert.converting', { filename: basename(selectedFile as string) }).replace('...', ''));

  let videoInfo: VideoInfo;
  try {
    videoInfo = await getVideoInfo(selectedFile as string);
    spinner.stop(pc.green(`✓ ${videoInfo.name} (${videoInfo.width}x${videoInfo.height}, ${formatFileSize(videoInfo.size)})`));
  } catch (error) {
    spinner.stop(pc.red(`❌ Error: ${error}`));
    return;
  }

  const availableQualities = getAvailableQualities(videoInfo);
  
  const selectedQualities = await p.multiselect({
    message: i18n.t('convert.selectQuality'),
    options: availableQualities.map(q => ({
      value: q,
      label: i18n.t(`convert.qualityOptions.${q}`),
    })),
  });

  if (p.isCancel(selectedQualities) || (selectedQualities as Quality[]).length === 0) return;

  const settings = settingsManager.getSettings();
  const tasks: { quality: Quality; outputPath: string }[] = [];

  for (const quality of selectedQualities as Quality[]) {
    const defaultName = generateOutputFilename(selectedFile as string, quality);
    
    if ((selectedQualities as Quality[]).length > 1) {
      const qualityLabel = i18n.t('convert.qualityOptions.' + quality);
      const defaultFilename = basename(defaultName);
      
      const customName = await p.text({
        message: `${qualityLabel}\n  ${i18n.t('convert.enterFilename')} ${i18n.t('convert.defaultHint', { default: defaultFilename })}`,
        defaultValue: defaultFilename,
      });

      if (p.isCancel(customName)) return;

      tasks.push({
        quality,
        outputPath: join(cwd, (customName as string) || defaultFilename),
      });
    } else {
      tasks.push({
        quality,
        outputPath: defaultName,
      });
    }
  }

  const startTime = Date.now();
  const results: { filename: string; size: number }[] = [];

  for (const task of tasks) {
    console.clear();
    const qualityLabel = task.quality === 'audio' ? '🎵 MP3' : task.quality;
    p.intro(pc.cyan(`⏳ Конвертация: ${qualityLabel}`));

    const taskStartTime = Date.now();
    let lastProgress = 0;

    function renderProgress(progress: number) {
      const barWidth = 30;
      const filled = Math.floor((progress / 100) * barWidth);
      const empty = barWidth - filled;
      const bar = '█'.repeat(filled) + '░'.repeat(empty);
      
      const now = Date.now();
      const elapsed = (now - taskStartTime) / 1000;
      
      let eta = 0;
      if (progress > 0) {
        const rate = progress / elapsed;
        eta = (100 - progress) / rate;
      }
      
      const elapsedStr = formatDuration(elapsed);
      const etaStr = eta > 0 ? formatDuration(eta) : '--:--';
      
      const line = `${pc.green(bar)} ${pc.white(progress.toFixed(1).padStart(5))}% ${pc.dim(elapsedStr)} / ${pc.dim(etaStr)} ${i18n.t('convert.eta')}`;
      
      process.stdout.write('\r' + line);
    }

    try {
      const result = await convertVideo(
        {
          inputPath: selectedFile as string,
          outputPath: task.outputPath,
          quality: task.quality,
          settings,
        },
        (progress) => {
          lastProgress = progress;
          renderProgress(progress);
        }
      );

      process.stdout.write('\n');
      p.log.success(pc.green(`${i18n.t('convert.success')} ${qualityLabel}`));
      
      results.push({
        filename: basename(result.outputPath),
        size: result.size,
      });

      p.log.success(i18n.t('convert.fileInfo', {
        filename: basename(result.outputPath),
        size: formatFileSize(result.size),
      }));
    } catch (error) {
      process.stdout.write('\n');
      p.log.error(pc.red(i18n.t('convert.error', { error: String(error) })));
    }
  }

  const totalTime = Date.now() - startTime;
  
  console.log();
  p.outro(pc.green(i18n.t('convert.total', {
    count: results.length.toString(),
    time: formatDuration(totalTime / 1000),
  })));

  for (const result of results) {
    p.log.success(i18n.t('convert.fileInfo', {
      filename: result.filename,
      size: formatFileSize(result.size),
    }));
  }

  await p.select({ message: '', options: [{ value: 'ok', label: 'OK' }] });
}
