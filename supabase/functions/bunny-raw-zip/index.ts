import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BunnyFile {
  Guid: string;
  StorageZoneName: string;
  Path: string;
  ObjectName: string;
  Length: number;
  LastChanged: string;
  ServerId: number;
  IsDirectory: boolean;
  UserId: string;
  DateCreated: string;
  StorageZoneId: number;
  Checksum: string | null;
  ReplicatedZones: string | null;
}

/**
 * List all files in a Bunny Storage folder (non-recursive, only raw folder).
 */
async function listFiles(
  storageHostname: string,
  storageZone: string,
  folderPath: string,
  accessKey: string
): Promise<{ path: string; name: string; size: number }[]> {
  const url = `https://${storageHostname}/${storageZone}/${folderPath}/`;
  console.log(`Listing folder: ${url}`);

  const response = await fetch(url, {
    headers: { AccessKey: accessKey, Accept: 'application/json' },
  });

  if (!response.ok) {
    console.error(`Failed to list folder ${folderPath}: ${response.status}`);
    return [];
  }

  const items: BunnyFile[] = await response.json();
  const files: { path: string; name: string; size: number }[] = [];

  for (const item of items) {
    if (!item.IsDirectory) {
      const filePath = folderPath ? `${folderPath}/${item.ObjectName}` : item.ObjectName;
      files.push({ path: filePath, name: item.ObjectName, size: item.Length });
    }
  }

  return files;
}

/**
 * Create a minimal ZIP file structure without compression (STORE method).
 * This is memory-efficient as we stream each file directly.
 */
function createLocalFileHeader(filename: string, size: number, crc32: number): Uint8Array {
  const encoder = new TextEncoder();
  const filenameBytes = encoder.encode(filename);
  
  const header = new ArrayBuffer(30 + filenameBytes.length);
  const view = new DataView(header);
  
  // Local file header signature
  view.setUint32(0, 0x04034b50, true);
  // Version needed to extract (2.0)
  view.setUint16(4, 20, true);
  // General purpose bit flag
  view.setUint16(6, 0, true);
  // Compression method (0 = store)
  view.setUint16(8, 0, true);
  // Last mod time
  view.setUint16(10, 0, true);
  // Last mod date
  view.setUint16(12, 0, true);
  // CRC-32
  view.setUint32(14, crc32, true);
  // Compressed size
  view.setUint32(18, size, true);
  // Uncompressed size
  view.setUint32(22, size, true);
  // Filename length
  view.setUint16(26, filenameBytes.length, true);
  // Extra field length
  view.setUint16(28, 0, true);
  
  const result = new Uint8Array(header);
  result.set(filenameBytes, 30);
  
  return result;
}

function createCentralDirectoryEntry(
  filename: string, 
  size: number, 
  crc32: number, 
  localHeaderOffset: number
): Uint8Array {
  const encoder = new TextEncoder();
  const filenameBytes = encoder.encode(filename);
  
  const header = new ArrayBuffer(46 + filenameBytes.length);
  const view = new DataView(header);
  
  // Central directory file header signature
  view.setUint32(0, 0x02014b50, true);
  // Version made by
  view.setUint16(4, 20, true);
  // Version needed to extract
  view.setUint16(6, 20, true);
  // General purpose bit flag
  view.setUint16(8, 0, true);
  // Compression method
  view.setUint16(10, 0, true);
  // Last mod time
  view.setUint16(12, 0, true);
  // Last mod date
  view.setUint16(14, 0, true);
  // CRC-32
  view.setUint32(16, crc32, true);
  // Compressed size
  view.setUint32(20, size, true);
  // Uncompressed size
  view.setUint32(24, size, true);
  // Filename length
  view.setUint16(28, filenameBytes.length, true);
  // Extra field length
  view.setUint16(30, 0, true);
  // File comment length
  view.setUint16(32, 0, true);
  // Disk number start
  view.setUint16(34, 0, true);
  // Internal file attributes
  view.setUint16(36, 0, true);
  // External file attributes
  view.setUint32(38, 0, true);
  // Relative offset of local header
  view.setUint32(42, localHeaderOffset, true);
  
  const result = new Uint8Array(header);
  result.set(filenameBytes, 46);
  
  return result;
}

function createEndOfCentralDirectory(
  entriesCount: number,
  centralDirSize: number,
  centralDirOffset: number
): Uint8Array {
  const header = new ArrayBuffer(22);
  const view = new DataView(header);
  
  // End of central directory signature
  view.setUint32(0, 0x06054b50, true);
  // Number of this disk
  view.setUint16(4, 0, true);
  // Disk where central directory starts
  view.setUint16(6, 0, true);
  // Number of central directory records on this disk
  view.setUint16(8, entriesCount, true);
  // Total number of central directory records
  view.setUint16(10, entriesCount, true);
  // Size of central directory
  view.setUint32(12, centralDirSize, true);
  // Offset of start of central directory
  view.setUint32(16, centralDirOffset, true);
  // Comment length
  view.setUint16(20, 0, true);
  
  return new Uint8Array(header);
}

// Simple CRC-32 calculation
function crc32(data: Uint8Array): number {
  let crc = 0xFFFFFFFF;
  const table = getCrc32Table();
  
  for (let i = 0; i < data.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ data[i]) & 0xFF];
  }
  
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

let crc32Table: Uint32Array | null = null;
function getCrc32Table(): Uint32Array {
  if (crc32Table) return crc32Table;
  
  crc32Table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    crc32Table[i] = c;
  }
  return crc32Table;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'No autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get Bunny credentials
    const envStorageZone = (Deno.env.get('BUNNY_STORAGE_ZONE') || '').trim() || undefined;
    const storagePassword = (Deno.env.get('BUNNY_STORAGE_PASSWORD') || '').trim() || undefined;
    const storageHostname = (Deno.env.get('BUNNY_STORAGE_HOSTNAME') || 'ny.storage.bunnycdn.com').trim();

    if (!storagePassword || !envStorageZone) {
      return new Response(
        JSON.stringify({ success: false, error: 'Configuración de storage incompleta' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { projectId, folderPath } = body;

    if (!projectId || !folderPath) {
      return new Response(
        JSON.stringify({ success: false, error: 'projectId y folderPath requeridos' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Normalize folder path
    const targetFolder = folderPath.replace(/^\/+|\/+$/g, '');
    console.log(`Generating ZIP for project ${projectId} from folder: ${targetFolder}`);

    // List files
    const files = await listFiles(storageHostname, envStorageZone, targetFolder, storagePassword);

    if (files.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'No se encontraron archivos' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${files.length} files, total size: ${files.reduce((a, f) => a + f.size, 0)} bytes`);

    // Check total size - limit to 200MB to be safe with memory
    const totalSize = files.reduce((a, f) => a + f.size, 0);
    const maxSize = 200 * 1024 * 1024; // 200MB

    if (totalSize > maxSize) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Los archivos son demasiado grandes (${Math.round(totalSize / 1024 / 1024)}MB). Descarga los archivos individualmente.`,
          totalSize,
          maxSize,
          filesCount: files.length
        }),
        { status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build ZIP in chunks to reduce peak memory usage
    const zipParts: Uint8Array[] = [];
    const centralDirectoryEntries: Uint8Array[] = [];
    let currentOffset = 0;

    for (const file of files) {
      try {
        const fileUrl = `https://${storageHostname}/${envStorageZone}/${file.path}`;
        console.log(`Downloading: ${file.name} (${Math.round(file.size / 1024)}KB)`);

        const response = await fetch(fileUrl, {
          headers: { AccessKey: storagePassword },
        });

        if (!response.ok) {
          console.error(`Failed to download ${file.name}: ${response.status}`);
          continue;
        }

        const arrayBuffer = await response.arrayBuffer();
        const fileData = new Uint8Array(arrayBuffer);
        const fileCrc = crc32(fileData);

        // Create local file header
        const localHeader = createLocalFileHeader(file.name, fileData.length, fileCrc);
        zipParts.push(localHeader);
        
        // Add file data
        zipParts.push(fileData);

        // Create central directory entry
        const cdEntry = createCentralDirectoryEntry(file.name, fileData.length, fileCrc, currentOffset);
        centralDirectoryEntries.push(cdEntry);

        currentOffset += localHeader.length + fileData.length;
        console.log(`Added ${file.name} to ZIP`);

      } catch (fileError) {
        console.error(`Error processing ${file.name}:`, fileError);
      }
    }

    if (centralDirectoryEntries.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'No se pudo descargar ningún archivo' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Add central directory
    const centralDirOffset = currentOffset;
    let centralDirSize = 0;
    for (const entry of centralDirectoryEntries) {
      zipParts.push(entry);
      centralDirSize += entry.length;
    }

    // Add end of central directory
    const eocd = createEndOfCentralDirectory(
      centralDirectoryEntries.length,
      centralDirSize,
      centralDirOffset
    );
    zipParts.push(eocd);

    // Calculate total size and merge
    const totalZipSize = zipParts.reduce((a, p) => a + p.length, 0);
    console.log(`ZIP created: ${centralDirectoryEntries.length} files, size: ${totalZipSize} bytes`);

    const zipData = new Uint8Array(totalZipSize);
    let offset = 0;
    for (const part of zipParts) {
      zipData.set(part, offset);
      offset += part.length;
    }

    // Clear parts array to free memory before sending
    zipParts.length = 0;

    const filename = `material_crudo_${projectId.slice(0, 8)}.zip`;

    return new Response(zipData, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store'
      }
    });

  } catch (error: unknown) {
    console.error('ZIP generation error:', error);
    const errMsg = error instanceof Error ? error.message : 'Error generando ZIP';
    return new Response(
      JSON.stringify({ success: false, error: errMsg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
