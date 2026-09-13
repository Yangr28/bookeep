import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
import i18n from '../i18n';
import AppUpdate, { type DownloadProgress } from '../plugins/appUpdate';

const CACHE_DIR = 'ocr_cache';
const LANG_FILENAME = 'chi_sim.traineddata.gz';
const WORKER_FILENAME = 'worker.min.js';
const CORE_DIRNAME = 'core';

const CDN_BASE = 'https://cdn.jsdelivr.net/npm';
const TESSERACT_VERSION = '7';
const TESSERACT_CORE_VERSION = '7';

// 运行时 worker（tesseract.js@7，oem=LSTM_ONLY）按设备 SIMD能力依次请求：
// relaxedsimd-lstm → simd-lstm → lstm，本地 core/ 必须备齐全部三个，缺任一都会导致对应设备识别失败
const CORE_FILES = [
  'tesseract-core-relaxedsimd-lstm.wasm.js',
  'tesseract-core-simd-lstm.wasm.js',
  'tesseract-core-lstm.wasm.js',
];

// CDN 候选（镜像加速优先，直链兜底）。不再包含 /ocr/* 相对路径：
// 热更新页面上该路径必 404；内置资源已由 prepareOcrAssets 原生复制覆盖
const LANG_CDN_URLS = [
  'https://tessdata.projectnaptha.com/4.0.0/chi_sim.traineddata.gz',
  `${CDN_BASE}/tesseract.js-lang-data@4.0.0/chi_sim.traineddata.gz`,
  'https://unpkg.com/tesseract.js-lang-data@4.0.0/chi_sim.traineddata.gz',
];
const WORKER_CDN_URLS = [
  `${CDN_BASE}/tesseract.js@${TESSERACT_VERSION}/dist/worker.min.js`,
  `https://unpkg.com/tesseract.js@${TESSERACT_VERSION}/dist/worker.min.js`,
];
const CORE_CDN_BASES = [
  `${CDN_BASE}/tesseract.js-core@${TESSERACT_CORE_VERSION}`,
  `https://unpkg.com/tesseract.js-core@${TESSERACT_CORE_VERSION}`,
];

export interface OCRCacheStatus {
  langDownloaded: boolean;
  workerDownloaded: boolean;
  coreDownloaded: boolean;
  totalSizeMB: number;
  isDownloading: boolean;
  downloadProgress: number;
  currentFile: string;
}

let downloadInProgress = false;

const ensureCacheDir = async (): Promise<void> => {
  try {
    await Filesystem.mkdir({
      path: CACHE_DIR,
      directory: Directory.Data,
      recursive: true,
    });
    await Filesystem.mkdir({
      path: `${CACHE_DIR}/${CORE_DIRNAME}`,
      directory: Directory.Data,
      recursive: true,
    });
  } catch {
    // directory may already exist
  }
};

const fileExists = async (path: string): Promise<boolean> => {
  try {
    await Filesystem.stat({
      path,
      directory: Directory.Data,
    });
    return true;
  } catch {
    return false;
  }
};

const getLocalUrl = (path: string): string => {
  return Capacitor.convertFileSrc(path);
};

// ---------- 原生下载（多镜像 + 超时 + .part 保护） ----------

/** 各阶段在总进度中的占比：语言包 55%，引擎 5%，核心库 3 个文件共 40% */
const progressForFile = (fileName: string, filePercent: number): { percent: number; label: string } => {
  let base = 0;
  let span = 55;
  let label = i18n.t('ocr.file.lang');
  if (fileName === WORKER_FILENAME) {
    base = 55;
    span = 5;
    label = i18n.t('ocr.file.worker');
  } else {
    const idx = CORE_FILES.indexOf(fileName);
    if (idx >= 0) {
      base = 60 + (idx * 40) / CORE_FILES.length;
      span = 40 / CORE_FILES.length;
      label = i18n.t('ocr.file.core');
    }
  }
  return {
    percent: Math.min(100, Math.round(base + (span * Math.max(0, filePercent)) / 100)),
    label,
  };
};

const nativeOcrDownload = async (onProgress?: (status: OCRCacheStatus) => void): Promise<boolean> => {
  const langUrls = LANG_CDN_URLS;
  const coreUrls = CORE_CDN_BASES.flatMap(base => CORE_FILES.map(f => `${base}/${f}`));
  try {
    const handle = await AppUpdate.addListener('downloadProgress', (p: DownloadProgress) => {
      if (p.kind !== 'ocr' || !p.file) return;
      const { percent, label } = progressForFile(p.file, p.percent);
      onProgress?.({
        langDownloaded: false,
        workerDownloaded: false,
        coreDownloaded: false,
        totalSizeMB: 0,
        isDownloading: true,
        downloadProgress: percent,
        currentFile: label,
      });
    });
    try {
      const result = await AppUpdate.downloadOcrResources({
        langUrls,
        workerUrls: WORKER_CDN_URLS,
        coreUrls,
      });
      return result.ready;
    } finally {
      await handle.remove();
    }
  } catch {
    // 旧基座无此方法或原生下载失败 → 返回 false，由调用方降级 JS fetch
    return false;
  }
};

// ---------- JS fetch 兜底（旧基座；每源 60s 超时防永久转圈） ----------

const fetchWithTimeout = async (url: string, timeoutMs = 60000): Promise<Response> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
};

const downloadFile = async (
  urls: string[],
  destPath: string,
  onProgress?: (loaded: number, total: number) => void
): Promise<void> => {
  let lastError: Error | null = null;
  for (const url of urls) {
    try {
      const response = await fetchWithTimeout(url);
      if (!response.ok) {
        lastError = new Error(`下载失败: ${response.status}`);
        continue;
      }

      const contentLength = response.headers.get('content-length');
      const total = contentLength ? parseInt(contentLength, 10) : 0;
      let loaded = 0;

      const reader = response.body?.getReader();
      if (!reader) {
        const blob = await response.blob();
        const arrayBuffer = await blob.arrayBuffer();
        const base64 = arrayBufferToBase64(arrayBuffer);
        await Filesystem.writeFile({
          path: destPath,
          data: base64,
          directory: Directory.Data,
          recursive: true,
        });
        return;
      }

      const chunks: Uint8Array[] = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        loaded += value.length;
        if (onProgress && total > 0) {
          onProgress(loaded, total);
        }
      }

      const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
      const combined = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        combined.set(chunk, offset);
        offset += chunk.length;
      }

      const base64 = arrayBufferToBase64(combined.buffer);
      await Filesystem.writeFile({
        path: destPath,
        data: base64,
        directory: Directory.Data,
        recursive: true,
      });
      return;
    } catch (e) {
      lastError = e instanceof Error ? e : new Error('下载失败');
      // 继续尝试下一个源
    }
  }
  throw lastError || new Error('所有下载源均失败');
};

const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 8192;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const end = Math.min(i + chunkSize, bytes.length);
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, end)));
  }
  return btoa(binary);
};

// ---------- 缓存状态 ----------

export const getOCRCacheStatus = async (): Promise<OCRCacheStatus> => {
  await ensureCacheDir();
  const langExists = await fileExists(`${CACHE_DIR}/${LANG_FILENAME}`);
  const workerExists = await fileExists(`${CACHE_DIR}/${WORKER_FILENAME}`);

  let coreExists = false;
  try {
    const coreFiles = await Filesystem.readdir({
      path: `${CACHE_DIR}/${CORE_DIRNAME}`,
      directory: Directory.Data,
    });
    coreExists = coreFiles.files.length > 0;
  } catch {
    coreExists = false;
  }

  let totalSize = 0;
  try {
    const allFiles = await Filesystem.readdir({
      path: CACHE_DIR,
      directory: Directory.Data,
    });
    for (const file of allFiles.files) {
      if (typeof file === 'string') continue;
      if (file.type === 'file') {
        totalSize += file.size;
      }
    }
  } catch {
    // ignore
  }

  return {
    langDownloaded: langExists,
    workerDownloaded: workerExists,
    coreDownloaded: coreExists,
    totalSizeMB: Math.round((totalSize / 1024 / 1024) * 100) / 100,
    isDownloading: downloadInProgress,
    downloadProgress: 0,
    currentFile: '',
  };
};

export const isOCRReady = async (): Promise<boolean> => {
  const status = await getOCRCacheStatus();
  return status.langDownloaded && status.workerDownloaded && status.coreDownloaded;
};

export const downloadOCRData = async (
  onProgress?: (status: OCRCacheStatus) => void
): Promise<void> => {
  if (downloadInProgress) {
    return;
  }
  downloadInProgress = true;

  try {
    await ensureCacheDir();

    onProgress?.({
      langDownloaded: false,
      workerDownloaded: false,
      coreDownloaded: false,
      totalSizeMB: 0,
      isDownloading: true,
      downloadProgress: 0,
      currentFile: i18n.t('ocr.file.lang'),
    });

    // 首选：原生下载器（多镜像快速切换 + 超时 + .part 保护，逐字节落盘不占 WebView 内存）
    const nativeReady = await nativeOcrDownload(onProgress);
    if (nativeReady) {
      onProgress?.({
        langDownloaded: true,
        workerDownloaded: true,
        coreDownloaded: true,
        totalSizeMB: 0,
        isDownloading: false,
        downloadProgress: 100,
        currentFile: '',
      });
      return;
    }

    // 兜底：旧基座 JS fetch（每源带超时）
    const workerExistsInitial = await fileExists(`${CACHE_DIR}/${WORKER_FILENAME}`);
    const langExists = await fileExists(`${CACHE_DIR}/${LANG_FILENAME}`);
    if (!langExists) {
      onProgress?.({
        langDownloaded: false,
        workerDownloaded: workerExistsInitial,
        coreDownloaded: false,
        totalSizeMB: 0,
        isDownloading: true,
        downloadProgress: 0,
        currentFile: i18n.t('ocr.file.lang'),
      });
      await downloadFile(LANG_CDN_URLS, `${CACHE_DIR}/${LANG_FILENAME}`, (loaded, total) => {
        onProgress?.({
          langDownloaded: false,
          workerDownloaded: workerExistsInitial,
          coreDownloaded: false,
          totalSizeMB: 0,
          isDownloading: true,
          downloadProgress: Math.round((loaded / total) * 55),
          currentFile: i18n.t('ocr.file.lang'),
        });
      });
    }

    const workerExists = await fileExists(`${CACHE_DIR}/${WORKER_FILENAME}`);
    if (!workerExists) {
      onProgress?.({
        langDownloaded: true,
        workerDownloaded: false,
        coreDownloaded: false,
        totalSizeMB: 0,
        isDownloading: true,
        downloadProgress: 55,
        currentFile: i18n.t('ocr.file.worker'),
      });
      await downloadFile(WORKER_CDN_URLS, `${CACHE_DIR}/${WORKER_FILENAME}`);
    }

    // core：三个 lstm 变体逐个补齐（worker 运行时按设备 SIMD 能力选择其一）
    for (let i = 0; i < CORE_FILES.length; i++) {
      const fileName = CORE_FILES[i];
      if (await fileExists(`${CACHE_DIR}/${CORE_DIRNAME}/${fileName}`)) continue;
      onProgress?.({
        langDownloaded: true,
        workerDownloaded: true,
        coreDownloaded: false,
        totalSizeMB: 0,
        isDownloading: true,
        downloadProgress: 60 + Math.round((i * 40) / CORE_FILES.length),
        currentFile: i18n.t('ocr.file.core'),
      });
      await downloadFile(
        CORE_CDN_BASES.map(base => `${base}/${fileName}`),
        `${CACHE_DIR}/${CORE_DIRNAME}/${fileName}`
      );
    }

    onProgress?.({
      langDownloaded: true,
      workerDownloaded: true,
      coreDownloaded: true,
      totalSizeMB: 0,
      isDownloading: false,
      downloadProgress: 100,
      currentFile: '',
    });
  } finally {
    downloadInProgress = false;
  }
};

export const getOCREndpoints = async (): Promise<{
  workerPath: string;
  langPath: string;
  corePath: string;
}> => {
  const status = await getOCRCacheStatus();

  if (status.langDownloaded && status.workerDownloaded && status.coreDownloaded) {
    const langLocalPath = await Filesystem.getUri({
      path: `${CACHE_DIR}/${LANG_FILENAME}`,
      directory: Directory.Data,
    });
    const workerLocalPath = await Filesystem.getUri({
      path: `${CACHE_DIR}/${WORKER_FILENAME}`,
      directory: Directory.Data,
    });
    const coreLocalPath = await Filesystem.getUri({
      path: `${CACHE_DIR}/${CORE_DIRNAME}`,
      directory: Directory.Data,
    });

    return {
      workerPath: getLocalUrl(workerLocalPath.uri),
      langPath: getLocalUrl(langLocalPath.uri).replace(`/${LANG_FILENAME}`, ''),
      corePath: getLocalUrl(coreLocalPath.uri),
    };
  }

  return {
    workerPath: WORKER_CDN_URLS[0],
    langPath: LANG_CDN_URLS[0].replace(`/${LANG_FILENAME}`, ''),
    corePath: CORE_CDN_BASES[0],
  };
};
