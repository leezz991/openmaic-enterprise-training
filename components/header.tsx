'use client';

import {
  Settings,
  Sun,
  Moon,
  Monitor,
  ArrowLeft,
  BookOpen,
  Loader2,
  Download,
  FileDown,
  Package,
  Upload,
} from 'lucide-react';
import { useI18n } from '@/lib/hooks/use-i18n';
import { useTheme } from '@/lib/hooks/use-theme';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { SettingsDialog } from './settings';
import { cn } from '@/lib/utils';
import { useStageStore } from '@/lib/store/stage';
import { useMediaGenerationStore } from '@/lib/store/media-generation';
import { useExportPPTX } from '@/lib/export/use-export-pptx';
import { persistClassroomForPublishing } from '@/lib/client/persist-classroom';
import { toast } from 'sonner';

interface HeaderProps {
  readonly currentSceneTitle: string;
  readonly backHref?: string;
  readonly backTitle?: string;
  readonly showBackButton?: boolean;
  readonly showPersist?: boolean;
  readonly showExport?: boolean;
  readonly showLanguageSwitcher?: boolean;
  readonly showThemeSwitcher?: boolean;
  readonly showSettings?: boolean;
  readonly portalHref?: string;
  readonly portalLabel?: string;
}

export function Header({
  currentSceneTitle,
  backHref = '/',
  backTitle,
  showBackButton = true,
  showPersist = true,
  showExport = true,
  showLanguageSwitcher = true,
  showThemeSwitcher = true,
  showSettings = true,
  portalHref,
  portalLabel = '返回培训门户',
}: HeaderProps) {
  const { t, locale, setLocale } = useI18n();
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const [persisting, setPersisting] = useState(false);

  const { exporting: isExporting, exportPPTX, exportResourcePack } = useExportPPTX();
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);
  const stage = useStageStore((s) => s.stage);
  const scenes = useStageStore((s) => s.scenes);
  const setScenes = useStageStore((s) => s.setScenes);
  const generatingOutlines = useStageStore((s) => s.generatingOutlines);
  const failedOutlines = useStageStore((s) => s.failedOutlines);
  const mediaTasks = useMediaGenerationStore((s) => s.tasks);

  const canExport =
    scenes.length > 0 &&
    generatingOutlines.length === 0 &&
    failedOutlines.length === 0 &&
    Object.values(mediaTasks).every((task) => task.status === 'done' || task.status === 'failed');
  const canPersist = Boolean(stage) && canExport;

  const languageRef = useRef<HTMLDivElement>(null);
  const themeRef = useRef<HTMLDivElement>(null);

  const handleClickOutside = useCallback(
    (e: MouseEvent) => {
      if (languageOpen && languageRef.current && !languageRef.current.contains(e.target as Node)) {
        setLanguageOpen(false);
      }
      if (themeOpen && themeRef.current && !themeRef.current.contains(e.target as Node)) {
        setThemeOpen(false);
      }
      if (exportMenuOpen && exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportMenuOpen(false);
      }
    },
    [languageOpen, themeOpen, exportMenuOpen],
  );

  useEffect(() => {
    if (languageOpen || themeOpen || exportMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [languageOpen, themeOpen, exportMenuOpen, handleClickOutside]);

  const handlePersistAndPublish = useCallback(async () => {
    if (!stage || !canPersist || persisting) return;

    setPersisting(true);
    try {
      const result = await persistClassroomForPublishing(stage, scenes);
      setScenes(result.scenes);

      const search = new URLSearchParams({
        courseId: result.id,
        persisted: '1',
      });
      if (result.warnings.length > 0) {
        search.set('warnings', '1');
      }

      router.push(`/admin/courses?${search.toString()}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '课堂固化失败');
    } finally {
      setPersisting(false);
    }
  }, [canPersist, persisting, router, scenes, setScenes, stage]);

  const showControls = showLanguageSwitcher || showThemeSwitcher || showSettings;

  return (
    <>
      <header className="h-20 px-8 flex items-center justify-between z-10 bg-transparent gap-4">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {showBackButton ? (
            <button
              onClick={() => router.push(backHref)}
              className="shrink-0 p-2 rounded-lg text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              title={backTitle || t('generation.backToHome')}
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          ) : null}
          <div className="flex flex-col min-w-0">
            <span className="text-[10px] uppercase tracking-widest font-bold text-gray-400 dark:text-gray-500 mb-0.5">
              {t('stage.currentScene')}
            </span>
            <h1
              className="text-xl font-bold text-gray-800 dark:text-gray-200 tracking-tight truncate"
              suppressHydrationWarning
            >
              {currentSceneTitle || t('common.loading')}
            </h1>
          </div>
        </div>

        {portalHref ? (
          <button
            type="button"
            onClick={() => router.push(portalHref)}
            className="shrink-0 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            <BookOpen className="w-4 h-4" />
            {portalLabel}
          </button>
        ) : null}

        {showPersist ? (
          <button
            type="button"
            onClick={handlePersistAndPublish}
            disabled={!canPersist || persisting}
            className={cn(
              'shrink-0 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all',
              canPersist && !persisting
                ? 'bg-slate-950 text-white hover:bg-slate-800 shadow-sm'
                : 'bg-slate-200 text-slate-500 cursor-not-allowed',
            )}
          >
            {persisting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            固化并去发布
          </button>
        ) : null}

        {showControls ? (
          <div className="flex items-center gap-4 bg-white/60 dark:bg-gray-800/60 backdrop-blur-md px-2 py-1.5 rounded-full border border-gray-100/50 dark:border-gray-700/50 shadow-sm shrink-0">
            {showLanguageSwitcher ? (
              <div className="relative" ref={languageRef}>
                <button
                  onClick={() => {
                    setLanguageOpen(!languageOpen);
                    setThemeOpen(false);
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold text-gray-500 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-700 hover:text-gray-800 dark:hover:text-gray-200 hover:shadow-sm transition-all"
                >
                  {locale === 'zh-CN' ? 'CN' : 'EN'}
                </button>
                {languageOpen ? (
                  <div className="absolute top-full mt-2 right-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden z-50 min-w-[120px]">
                    <button
                      onClick={() => {
                        setLocale('zh-CN');
                        setLanguageOpen(false);
                      }}
                      className={cn(
                        'w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors',
                        locale === 'zh-CN' &&
                          'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
                      )}
                    >
                      简体中文
                    </button>
                    <button
                      onClick={() => {
                        setLocale('en-US');
                        setLanguageOpen(false);
                      }}
                      className={cn(
                        'w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors',
                        locale === 'en-US' &&
                          'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
                      )}
                    >
                      英文
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}

            {showLanguageSwitcher && (showThemeSwitcher || showSettings) ? (
              <div className="w-[1px] h-4 bg-gray-200 dark:bg-gray-700" />
            ) : null}

            {showThemeSwitcher ? (
              <div className="relative" ref={themeRef}>
                <button
                  onClick={() => {
                    setThemeOpen(!themeOpen);
                    setLanguageOpen(false);
                  }}
                  className="p-2 rounded-full text-gray-400 dark:text-gray-500 hover:bg-white dark:hover:bg-gray-700 hover:text-gray-800 dark:hover:text-gray-200 hover:shadow-sm transition-all group"
                >
                  {theme === 'light' ? <Sun className="w-4 h-4" /> : null}
                  {theme === 'dark' ? <Moon className="w-4 h-4" /> : null}
                  {theme === 'system' ? <Monitor className="w-4 h-4" /> : null}
                </button>
                {themeOpen ? (
                  <div className="absolute top-full mt-2 right-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden z-50 min-w-[140px]">
                    <button
                      onClick={() => {
                        setTheme('light');
                        setThemeOpen(false);
                      }}
                      className={cn(
                        'w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-2',
                        theme === 'light' &&
                          'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
                      )}
                    >
                      <Sun className="w-4 h-4" />
                      {t('settings.themeOptions.light')}
                    </button>
                    <button
                      onClick={() => {
                        setTheme('dark');
                        setThemeOpen(false);
                      }}
                      className={cn(
                        'w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-2',
                        theme === 'dark' &&
                          'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
                      )}
                    >
                      <Moon className="w-4 h-4" />
                      {t('settings.themeOptions.dark')}
                    </button>
                    <button
                      onClick={() => {
                        setTheme('system');
                        setThemeOpen(false);
                      }}
                      className={cn(
                        'w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-2',
                        theme === 'system' &&
                          'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
                      )}
                    >
                      <Monitor className="w-4 h-4" />
                      {t('settings.themeOptions.system')}
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}

            {showThemeSwitcher && showSettings ? (
              <div className="w-[1px] h-4 bg-gray-200 dark:bg-gray-700" />
            ) : null}

            {showSettings ? (
              <div className="relative">
                <button
                  onClick={() => setSettingsOpen(true)}
                  className="p-2 rounded-full text-gray-400 dark:text-gray-500 hover:bg-white dark:hover:bg-gray-700 hover:text-gray-800 dark:hover:text-gray-200 hover:shadow-sm transition-all group"
                >
                  <Settings className="w-4 h-4 group-hover:rotate-90 transition-transform duration-500" />
                </button>
              </div>
            ) : null}
          </div>
        ) : null}

        {showExport ? (
          <div className="relative" ref={exportRef}>
            <button
              onClick={() => {
                if (canExport && !isExporting) setExportMenuOpen(!exportMenuOpen);
              }}
              disabled={!canExport || isExporting}
              title={
                canExport
                  ? isExporting
                    ? t('export.exporting')
                    : t('export.pptx')
                  : t('share.notReady')
              }
              className={cn(
                'shrink-0 p-2 rounded-full transition-all',
                canExport && !isExporting
                  ? 'text-gray-400 dark:text-gray-500 hover:bg-white dark:hover:bg-gray-700 hover:text-gray-800 dark:hover:text-gray-200 hover:shadow-sm'
                  : 'text-gray-300 dark:text-gray-600 cursor-not-allowed opacity-50',
              )}
            >
              {isExporting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
            </button>
            {exportMenuOpen ? (
              <div className="absolute top-full mt-2 right-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden z-50 min-w-[200px]">
                <button
                  onClick={() => {
                    setExportMenuOpen(false);
                    exportPPTX();
                  }}
                  className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-2.5"
                >
                  <FileDown className="w-4 h-4 text-gray-400 shrink-0" />
                  <span>{t('export.pptx')}</span>
                </button>
                <button
                  onClick={() => {
                    setExportMenuOpen(false);
                    exportResourcePack();
                  }}
                  className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-2.5"
                >
                  <Package className="w-4 h-4 text-gray-400 shrink-0" />
                  <div>
                    <div>{t('export.resourcePack')}</div>
                    <div className="text-[11px] text-gray-400 dark:text-gray-500">
                      {t('export.resourcePackDesc')}
                    </div>
                  </div>
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
      </header>
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </>
  );
}
