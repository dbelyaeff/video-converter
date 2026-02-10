export type Language = 'ru' | 'en';

interface Translations {
  [key: string]: string | Translations;
}

const translations: Record<Language, Translations> = {
  ru: {
    welcome: '🎬 Добро пожаловать в Video Converter CLI!',
    description: 'Это приложение поможет вам конвертировать видео в различные форматы и качества.',
    menu: {
      title: '📋 Главное меню',
      convert: '🎥 Конвертировать видео',
      settings: '⚙️  Настройки',
      exit: '🚪 Выход'
    },
    settings: {
      title: '⚙️  Настройки',
      language: '🌐 Язык',
      video: '🎬 Видео',
      audio: '🔊 Аудио',
      global: '🌍 Глобальная установка',
      back: '⬅️  Назад',
      saved: '✅ Настройки сохранены!',
      languageSelect: 'Выберите язык:',
      videoBitrate: {
        title: '🎬 Битрейт видео',
        description: 'Настройте битрейт для каждого качества видео (шаг 100 Kbps, мин 900, макс 10000)',
        '4k': '📺 4K (2160p)',
        '1080p': '📺 1080p (Full HD)',
        '720p': '📺 720p (HD)',
        '480p': '📺 480p (SD)',
        hint: 'Введите значение от 900 до 10000 Kbps с шагом 100'
      },
      audioBitrate: {
        title: '🔊 Битрейт аудио (MP3)',
        description: 'Выберите битрейт для конвертации в MP3',
        select: 'Выберите битрейт MP3:'
      }
    },
    ffmpeg: {
      downloadPrompt: 'Скачать и установить FFmpeg автоматически?',
      downloading: 'Загрузка FFmpeg...',
      extracting: 'Распаковка FFmpeg...',
      installed: '✅ FFmpeg успешно установлен!',
      error: '❌ Ошибка установки FFmpeg'
    },
    globalInstall: {
      title: '🌍 Глобальная установка',
      description: 'Установите скрипт глобально для запуска из любой директории',
      methods: {
        symlink: '🔗 Симлинк (рекомендуется)',
        copy: '📋 Копирование в /usr/local/bin (требуется sudo)',
        path: '📝 Добавить в PATH',
        back: '⬅️  Назад'
      },
      symlink: {
        success: '✅ Симлинк создан: {path}',
        error: '❌ Не удалось создать симлинк: {error}'
      },
      copy: {
        success: '✅ Скрипт скопирован в: {path}',
        error: '❌ Не удалось скопировать: {error}',
        sudoRequired: '⚠️  Требуются права администратора (sudo)'
      },
      path: {
        instruction: 'Добавьте следующую строку в ваш ~/.bashrc, ~/.zshrc или ~/.bash_profile:'
      }
    },
    convert: {
      title: '🎥 Конвертация видео',
      selectFile: '📁 Выберите видеофайл для конвертации:',
      noFiles: '❌ В текущей директории не найдено видеофайлов',
      selectQuality: 'Выберите качество для конвертации:',
      qualityOptions: {
        '1080p': '📺 1080p (Full HD)',
        '720p': '📺 720p (HD)', 
        '480p': '📺 480p (SD)',
        'audio': '🎵 Аудио (MP3)'
      },
      enterFilename: 'Введите имя выходного файла:',
      defaultHint: '(по умолчанию: {default})',
      searchHint: '🔍 Найдено {count} видеофайлов. Введите поисковый запрос или оставьте пустым для показа всех:',
      searchPlaceholder: 'Введите часть имени файла...',
      noSearchResults: '❌ По вашему запросу ничего не найдено',
      converting: '⏳ Конвертация {filename}...',
      success: '✅ Конвертация завершена!',
      error: '❌ Ошибка конвертации: {error}',
      fileInfo: '📄 {filename} ({size})',
      timeSpent: '⏱️  Время: {time}',
      total: '📊 Всего сконвертировано: {count} файл(ов) за {time}',
      eta: 'ETA'
    },
    common: {
      cancel: '❌ Отменено пользователем',
      confirm: '✅ Подтвердить',
      back: '⬅️  Назад',
      exit: '👋 До свидания!',
      search: '🔍 Поиск:',
      empty: '-- Нет результатов --'
    },
    units: {
      mb: 'Мб',
      gb: 'Гб',
      kbps: 'Kbps'
    }
  },
  en: {
    welcome: '🎬 Welcome to Video Converter CLI!',
    description: 'This app helps you convert videos to various formats and qualities.',
    menu: {
      title: '📋 Main Menu',
      convert: '🎥 Convert Video',
      settings: '⚙️  Settings',
      exit: '🚪 Exit'
    },
    settings: {
      title: '⚙️  Settings',
      language: '🌐 Language',
      video: '🎬 Video',
      audio: '🔊 Audio',
      global: '🌍 Global Install',
      back: '⬅️  Back',
      saved: '✅ Settings saved!',
      languageSelect: 'Select language:',
      videoBitrate: {
        title: '🎬 Video Bitrate',
        description: 'Configure bitrate for each video quality (step 100 Kbps, min 900, max 10000)',
        '4k': '📺 4K (2160p)',
        '1080p': '📺 1080p (Full HD)',
        '720p': '📺 720p (HD)',
        '480p': '📺 480p (SD)',
        hint: 'Enter value from 900 to 10000 Kbps with step 100'
      },
      audioBitrate: {
        title: '🔊 Audio Bitrate (MP3)',
        description: 'Select bitrate for MP3 conversion',
        select: 'Select MP3 bitrate:'
      }
    },
    ffmpeg: {
      downloadPrompt: 'Download and install FFmpeg automatically?',
      downloading: 'Downloading FFmpeg...',
      extracting: 'Extracting FFmpeg...',
      installed: '✅ FFmpeg installed successfully!',
      error: '❌ FFmpeg installation error'
    },
    globalInstall: {
      title: '🌍 Global Installation',
      description: 'Install the script globally to run from any directory',
      methods: {
        symlink: '🔗 Symlink (recommended)',
        copy: '📋 Copy to /usr/local/bin (requires sudo)',
        path: '📝 Add to PATH',
        back: '⬅️  Back'
      },
      symlink: {
        success: '✅ Symlink created: {path}',
        error: '❌ Failed to create symlink: {error}'
      },
      copy: {
        success: '✅ Script copied to: {path}',
        error: '❌ Failed to copy: {error}',
        sudoRequired: '⚠️  Administrator privileges required (sudo)'
      },
      path: {
        instruction: 'Add the following line to your ~/.bashrc, ~/.zshrc, or ~/.bash_profile:'
      }
    },
    convert: {
      title: '🎥 Video Conversion',
      selectFile: '📁 Select video file to convert:',
      noFiles: '❌ No video files found in current directory',
      selectQuality: 'Select quality for conversion:',
      qualityOptions: {
        '1080p': '📺 1080p (Full HD)',
        '720p': '📺 720p (HD)',
        '480p': '📺 480p (SD)',
        'audio': '🎵 Audio (MP3)'
      },
      enterFilename: 'Enter output filename:',
      defaultHint: '(default: {default})',
      searchHint: '🔍 Found {count} video files. Enter search query or leave empty to show all:',
      searchPlaceholder: 'Type part of filename...',
      noSearchResults: '❌ No results found for your query',
      converting: '⏳ Converting {filename}...',
      success: '✅ Conversion completed!',
      error: '❌ Conversion error: {error}',
      fileInfo: '📄 {filename} ({size})',
      timeSpent: '⏱️  Time: {time}',
      total: '📊 Total converted: {count} file(s) in {time}',
      eta: 'ETA'
    },
    common: {
      cancel: '❌ Cancelled by user',
      confirm: '✅ Confirm',
      back: '⬅️  Back',
      exit: '👋 Goodbye!',
      search: '🔍 Search:',
      empty: '-- No results --'
    },
    units: {
      mb: 'MB',
      gb: 'GB',
      kbps: 'Kbps'
    }
  }
};

class I18n {
  private currentLang: Language = 'ru';

  setLanguage(lang: Language) {
    this.currentLang = lang;
  }

  getLanguage(): Language {
    return this.currentLang;
  }

  t(key: string, params?: Record<string, string>): string {
    const keys = key.split('.');
    let value: any = translations[this.currentLang];
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return key;
      }
    }

    if (typeof value !== 'string') {
      return key;
    }

    if (params) {
      return value.replace(/\{(\w+)\}/g, (match, paramKey) => {
        return params[paramKey] || match;
      });
    }

    return value;
  }
}

export const i18n = new I18n();
