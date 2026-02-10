#!/usr/bin/env bun

import * as p from '@clack/prompts';
import pc from 'picocolors';
import { i18n } from './i18n.ts';
import { settingsManager } from './settings.ts';
import { showSettingsMenu } from './settings-ui.ts';
import { showConvertMenu } from './convert-ui.ts';

async function main() {
  const settings = settingsManager.getSettings();
  i18n.setLanguage(settings.language);

  console.clear();
  
  p.intro(pc.magenta(`
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║  🎬 ${i18n.t('welcome').replace('🎬 ', '')}                     ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
  `));

  p.note(i18n.t('description'));

  while (true) {
    const action = await p.select({
      message: i18n.t('menu.title'),
      options: [
        { value: 'convert', label: i18n.t('menu.convert') },
        { value: 'settings', label: i18n.t('menu.settings') },
        { value: 'exit', label: i18n.t('menu.exit') },
      ],
    });

    if (p.isCancel(action)) {
      p.outro(pc.yellow(i18n.t('common.exit')));
      process.exit(0);
    }

    switch (action) {
      case 'convert':
        await showConvertMenu();
        break;
      case 'settings':
        await showSettingsMenu();
        break;
      case 'exit':
        p.outro(pc.yellow(i18n.t('common.exit')));
        process.exit(0);
    }

    console.clear();
  }
}

main().catch((error) => {
  p.log.error(pc.red(`Error: ${error.message}`));
  process.exit(1);
});
