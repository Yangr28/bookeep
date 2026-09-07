import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';

const CACHE_DIR = 'ocr_cache';
const LANG_FILENAME = 'chi_sim.traineddata.gz';
const WORKER_FILENAME = 'worker.min.js';
const CORE_DIRNAME = 'core';

const CDN_BASE = 'https://cdn.jsdelivr.net/npm';
const TESSERACT_VERSION = '5';
const TESSERACT_CORE_VERSION = '5';

const LANG_CDN_URL = 'https://tessdata.project.files.com/4.0.0/chi_sim.traineddata.gz';
const WORKER_CDN_URL = `${CDN_BASE}/tesseract.js@${TESSERACT_VERSION}/dist/worker.min.js`;
const CORE_CDN_BASE = `${CDN_BASE}/tesseract.js-core@${TESSERACT_CORE_VERSION}`;

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
  } catch (e) {
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

const downloadFile = async (
  url: string,
  destPath: string,
  onProgress?: (loaded: number, total: number) => void
): Promise<void> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`下载失败: ${response.status}`);
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
};

const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

const getCoreWasmFilename = async (coreBaseUrl: string): Promise<string> => {
  try {
    const response = await fetch(`${coreBaseUrl}/tesseract-core.wasm.js`);
    if (response.ok) return 'tesseract-core.wasm.js';
  } catch {
    // ignore
  }
  try {
    const response = await fetch(`${coreBaseUrl}/tesseract-core-simd.wasm.js`);
    if (response.ok) return 'tesseract-core-simd.wasm.js';
  } catch {
    // ignore
  }
  return 'tesseract-core.wasm.js';
};

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

    const langPath = `${CACHE_DIR}/${LANG_FILENAME}`;
    const workerPath = `${CACHE_DIR}/${WORKER_FILENAME}`;
    const coreDir = `${CACHE_DIR}/${CORE_DIRNAME}`;

    const langExists = await fileExists(langPath);
    const workerExistsInitial = await fileExists(workerPath);
    if (!langExists) {
      onProgress?.({
        langDownloaded: false,
        workerDownloaded: workerExistsInitial,
        coreDownloaded: false,
        totalSizeMB: 0,
        isDownloading: true,
        downloadProgress: 0,
        currentFile: '语言数据包',
      });
      await downloadFile(LANG_CDN_URL, langPath, (loaded, total) => {
        onProgress?.({
          langDownloaded: false,
          workerDownloaded: workerExistsInitial,
          coreDownloaded: false,
          totalSizeMB: 0,
          isDownloading: true,
          downloadProgress: Math.round((loaded / total) * 40),
          currentFile: '语言数据包',
        });
      });
    }

    const workerExists = await fileExists(workerPath);
    if (!workerExists) {
      onProgress?.({
        langDownloaded: true,
        workerDownloaded: false,
        coreDownloaded: false,
        totalSizeMB: 0,
        isDownloading: true,
        downloadProgress: 40,
        currentFile: '识别引擎',
      });
      await downloadFile(WORKER_CDN_URL, workerPath);
    }

    let coreExists = false;
    try {
      const coreFiles = await Filesystem.readdir({
        path: coreDir,
        directory: Directory.Data,
      });
      coreExists = coreFiles.files.length > 0;
    } catch {
      coreExists = false;
    }

    if (!coreExists) {
      onProgress?.({
        langDownloaded: true,
        workerDownloaded: true,
        coreDownloaded: false,
        totalSizeMB: 0,
        isDownloading: true,
        downloadProgress: 60,
        currentFile: '核心运行库',
      });

      const coreWasmFilename = await getCoreWasmFilename(CORE_CDN_BASE);
      await downloadFile(
        `${CORE_CDN_BASE}/${coreWasmFilename}`,
        `${coreDir}/${coreWasmFilename}`
      );
      await downloadFile(
        `${CORE_CDN_BASE}/tesseract-core.js`,
        `${coreDir}/tesseract-core.js`
      ).catch(() => {
        // core.js may not be needed if wasm version works
      });
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
    workerPath: WORKER_CDN_URL,
    langPath: 'https://tessdata.project.files.com/4.0.0',
    corePath: CORE_CDN_BASE,
  };
};
