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

// ---- ZIP helpers (STORE method, no compression) ----

function createLocalFileHeader(filename: string, size: number, crc: number): Uint8Array {
  const encoder = new TextEncoder();
  const fnBytes = encoder.encode(filename);
  const buf = new ArrayBuffer(30 + fnBytes.length);
  const v = new DataView(buf);
  v.setUint32(0, 0x04034b50, true);  // signature
  v.setUint16(4, 20, true);           // version needed
  v.setUint16(6, 0, true);            // flags
  v.setUint16(8, 0, true);            // compression (store)
  v.setUint16(10, 0, true);           // mod time
  v.setUint16(12, 0, true);           // mod date
  v.setUint32(14, crc, true);         // crc-32
  v.setUint32(18, size, true);        // compressed size
  v.setUint32(22, size, true);        // uncompressed size
  v.setUint16(26, fnBytes.length, true);
  v.setUint16(28, 0, true);           // extra field length
  const result = new Uint8Array(buf);
  result.set(fnBytes, 30);
  return result;
}

function createCentralDirectoryEntry(filename: string, size: number, crc: number, offset: number): Uint8Array {
  const encoder = new TextEncoder();
  const fnBytes = encoder.encode(filename);
  const buf = new ArrayBuffer(46 + fnBytes.length);
  const v = new DataView(buf);
  v.setUint32(0, 0x02014b50, true);   // signature
  v.setUint16(4, 20, true);            // version made by
  v.setUint16(6, 20, true);            // version needed
  v.setUint16(8, 0, true);             // flags
  v.setUint16(10, 0, true);            // compression
  v.setUint16(12, 0, true);            // mod time
  v.setUint16(14, 0, true);            // mod date
  v.setUint32(16, crc, true);          // crc-32
  v.setUint32(20, size, true);         // compressed size
  v.setUint32(24, size, true);         // uncompressed size
  v.setUint16(28, fnBytes.length, true);
  v.setUint16(30, 0, true);            // extra field length
  v.setUint16(32, 0, true);            // comment length
  v.setUint16(34, 0, true);            // disk number
  v.setUint16(36, 0, true);            // internal attrs
  v.setUint32(38, 0, true);            // external attrs
  v.setUint32(42, offset, true);       // local header offset
  const result = new Uint8Array(buf);
  result.set(fnBytes, 46);
  return result;
}

function createEOCD(count: number, cdSize: number, cdOffset: number): Uint8Array {
  const buf = new ArrayBuffer(22);
  const v = new DataView(buf);
  v.setUint32(0, 0x06054b50, true);
  v.setUint16(4, 0, true);
  v.setUint16(6, 0, true);
  v.setUint16(8, count, true);
  v.setUint16(10, count, true);
  v.setUint32(12, cdSize, true);
  v.setUint32(16, cdOffset, true);
  v.setUint16(20, 0, true);
  return new Uint8Array(buf);
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

function computeCrc32(data: Uint8Array): number {
  let crc = 0xFFFFFFFF;
  const table = getCrc32Table();
  for (let i = 0; i < data.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ data[i]) & 0xFF];
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'No autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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

    const targetFolder = folderPath.replace(/^\/+|\/+$/g, '');
    console.log(`Generating streamed ZIP for project ${projectId} from folder: ${targetFolder}`);

    const files = await listFiles(storageHostname, envStorageZone, targetFolder, storagePassword);

    if (files.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'No se encontraron archivos' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const totalSize = files.reduce((a, f) => a + f.size, 0);
    console.log(`Found ${files.length} files, total size: ${Math.round(totalSize / 1024 / 1024)}MB`);

    // Streaming ZIP: only ONE file in memory at a time
    // Central directory entries are tiny (~50 bytes each)
    const stream = new ReadableStream({
      async start(controller) {
        const cdEntries: Uint8Array[] = [];
        let offset = 0;
        let filesAdded = 0;

        for (const file of files) {
          try {
            const fileUrl = `https://${storageHostname}/${envStorageZone}/${file.path}`;
            console.log(`Streaming: ${file.name} (${Math.round(file.size / 1024)}KB)`);

            const resp = await fetch(fileUrl, {
              headers: { AccessKey: storagePassword! },
            });

            if (!resp.ok) {
              console.error(`Failed to download ${file.name}: ${resp.status}`);
              continue;
            }

            // Download file into memory (one at a time)
            const fileData = new Uint8Array(await resp.arrayBuffer());
            const crc = computeCrc32(fileData);

            // Write local header
            const localHeader = createLocalFileHeader(file.name, fileData.length, crc);
            controller.enqueue(localHeader);

            // Write file data
            controller.enqueue(fileData);

            // Save central directory entry (small)
            cdEntries.push(createCentralDirectoryEntry(file.name, fileData.length, crc, offset));
            offset += localHeader.length + fileData.length;
            filesAdded++;

            // fileData goes out of scope here → GC can reclaim
          } catch (err) {
            console.error(`Error processing ${file.name}:`, err);
          }
        }

        if (filesAdded === 0) {
          // No files could be downloaded - close with empty content
          controller.close();
          return;
        }

        // Write central directory
        const cdOffset = offset;
        let cdSize = 0;
        for (const entry of cdEntries) {
          controller.enqueue(entry);
          cdSize += entry.length;
        }

        // Write EOCD
        controller.enqueue(createEOCD(filesAdded, cdSize, cdOffset));
        console.log(`ZIP streamed: ${filesAdded} files`);

        controller.close();
      }
    });

    const filename = `material_crudo_${projectId.slice(0, 8)}.zip`;

    return new Response(stream, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
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
