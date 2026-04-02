/**
 * Image Optimizer - Compresion client-side antes de upload a Bunny CDN
 *
 * Reduce el tamaño de las imagenes antes de subirlas:
 * - Convierte a WebP (mejor compresion)
 * - Resize si excede maxWidth
 * - Remueve EXIF data (privacidad)
 * - Target: <500KB por imagen
 */

import imageCompression from 'browser-image-compression';

export interface OptimizeOptions {
  /** Ancho maximo en pixels (default: 1200) */
  maxWidth?: number;
  /** Alto maximo en pixels (default: auto, mantiene aspect ratio) */
  maxHeight?: number;
  /** Calidad 0-1 (default: 0.8) */
  quality?: number;
  /** Tamano maximo en MB (default: 0.5) */
  maxSizeMB?: number;
  /** Forzar aspect ratio: '9:16' (vertical), '16:9', '1:1', 'auto' */
  aspectRatio?: '9:16' | '16:9' | '1:1' | 'auto';
  /** Usar Web Workers para no bloquear UI (default: true) */
  useWebWorker?: boolean;
}

export interface OptimizeResult {
  file: File;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  width: number;
  height: number;
}

// Presets por tipo de media
export const OPTIMIZE_PRESETS: Record<string, OptimizeOptions> = {
  avatar: {
    maxWidth: 256,
    maxHeight: 256,
    quality: 0.75,
    maxSizeMB: 0.1,
    aspectRatio: '1:1',
  },
  portfolio: {
    maxWidth: 1200,
    quality: 0.8,
    maxSizeMB: 0.5,
    aspectRatio: '9:16', // Vertical para portfolio
  },
  cover: {
    maxWidth: 1920,
    maxHeight: 600,
    quality: 0.85,
    maxSizeMB: 0.8,
    aspectRatio: 'auto',
  },
  thumbnail: {
    maxWidth: 400,
    quality: 0.7,
    maxSizeMB: 0.1,
    aspectRatio: 'auto',
  },
  general: {
    maxWidth: 1200,
    quality: 0.8,
    maxSizeMB: 0.5,
    aspectRatio: 'auto',
  },
};

/**
 * Optimiza una imagen: comprime, resize y remueve EXIF
 */
export async function optimizeImage(
  file: File,
  options: OptimizeOptions = {}
): Promise<OptimizeResult> {
  const {
    maxWidth = 1200,
    maxHeight,
    quality = 0.8,
    maxSizeMB = 0.5,
    useWebWorker = true,
  } = options;

  const originalSize = file.size;

  // Configuracion para browser-image-compression
  const compressionOptions = {
    maxSizeMB,
    maxWidthOrHeight: maxHeight ? Math.max(maxWidth, maxHeight) : maxWidth,
    useWebWorker,
    // Forzar output como WebP si el navegador lo soporta
    fileType: 'image/webp' as const,
    initialQuality: quality,
    // Remover EXIF y metadata (importante para privacidad)
    exifOrientation: 1,
    // Preservar alpha channel si existe
    preserveExif: false,
  };

  try {
    // Comprimir imagen
    const compressedFile = await imageCompression(file, compressionOptions);

    // Obtener dimensiones del resultado
    const dimensions = await getImageDimensions(compressedFile);

    // Crear nuevo archivo con nombre .webp si se convirtio
    const outputFile = new File(
      [compressedFile],
      file.name.replace(/\.[^.]+$/, '.webp'),
      { type: 'image/webp' }
    );

    return {
      file: outputFile,
      originalSize,
      compressedSize: outputFile.size,
      compressionRatio: Math.round((1 - outputFile.size / originalSize) * 100),
      width: dimensions.width,
      height: dimensions.height,
    };
  } catch (error) {
    console.error('Error optimizing image:', error);
    // Si falla la optimizacion, devolver original
    const dimensions = await getImageDimensions(file);
    return {
      file,
      originalSize,
      compressedSize: file.size,
      compressionRatio: 0,
      width: dimensions.width,
      height: dimensions.height,
    };
  }
}

/**
 * Obtiene las dimensiones de una imagen
 */
export function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}

/**
 * Valida si una imagen tiene el aspect ratio correcto
 * @returns true si cumple, false si no
 */
export async function validateAspectRatio(
  file: File,
  target: '9:16' | '16:9' | '1:1',
  tolerance = 0.1 // 10% de tolerancia
): Promise<{ valid: boolean; actual: string; expected: string }> {
  const { width, height } = await getImageDimensions(file);
  const actualRatio = width / height;

  const targetRatios = {
    '9:16': 9 / 16,  // 0.5625 (vertical)
    '16:9': 16 / 9,  // 1.777 (horizontal)
    '1:1': 1,        // 1 (cuadrado)
  };

  const expectedRatio = targetRatios[target];
  const diff = Math.abs(actualRatio - expectedRatio) / expectedRatio;

  return {
    valid: diff <= tolerance,
    actual: `${width}:${height}`,
    expected: target,
  };
}

/**
 * Recorta una imagen al aspect ratio especificado (centrado)
 */
export async function cropToAspectRatio(
  file: File,
  target: '9:16' | '16:9' | '1:1'
): Promise<File> {
  const { width, height } = await getImageDimensions(file);

  const targetRatios = {
    '9:16': 9 / 16,
    '16:9': 16 / 9,
    '1:1': 1,
  };

  const targetRatio = targetRatios[target];
  const currentRatio = width / height;

  // Si ya tiene el ratio correcto, no hacer nada
  if (Math.abs(currentRatio - targetRatio) < 0.01) {
    return file;
  }

  // Crear canvas para crop
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');

  const img = await loadImage(file);

  let cropWidth: number;
  let cropHeight: number;
  let cropX: number;
  let cropY: number;

  if (currentRatio > targetRatio) {
    // Imagen es mas ancha que el target - crop horizontal
    cropHeight = height;
    cropWidth = height * targetRatio;
    cropX = (width - cropWidth) / 2;
    cropY = 0;
  } else {
    // Imagen es mas alta que el target - crop vertical
    cropWidth = width;
    cropHeight = width / targetRatio;
    cropX = 0;
    cropY = (height - cropHeight) / 2;
  }

  canvas.width = cropWidth;
  canvas.height = cropHeight;

  ctx.drawImage(img, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(new File([blob], file.name, { type: 'image/webp' }));
        } else {
          reject(new Error('Failed to crop image'));
        }
      },
      'image/webp',
      0.85
    );
  });
}

/**
 * Carga una imagen desde un File
 */
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}

/**
 * Formatea bytes a string legible
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Verifica si un archivo es una imagen
 */
export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/');
}
