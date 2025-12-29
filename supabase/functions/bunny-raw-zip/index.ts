import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { BlobWriter, ZipWriter, Uint8ArrayReader } from "https://deno.land/x/zipjs@v2.7.32/index.js";

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
 * Recursively list all files in a Bunny Storage folder.
 */
async function listFilesRecursive(
  storageHostname: string,
  storageZone: string,
  folderPath: string,
  accessKey: string
): Promise<{ path: string; name: string }[]> {
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
  const files: { path: string; name: string }[] = [];

  for (const item of items) {
    if (item.IsDirectory) {
      // Recurse into subdirectory
      const subPath = folderPath ? `${folderPath}/${item.ObjectName}` : item.ObjectName;
      const subFiles = await listFilesRecursive(storageHostname, storageZone, subPath, accessKey);
      files.push(...subFiles);
    } else {
      // It's a file
      const filePath = folderPath ? `${folderPath}/${item.ObjectName}` : item.ObjectName;
      files.push({ path: filePath, name: item.ObjectName });
    }
  }

  return files;
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

    // Get Bunny credentials for authenticated downloads
    const envStorageZone = (Deno.env.get('BUNNY_STORAGE_ZONE') || '').trim() || undefined;
    const storagePassword = (Deno.env.get('BUNNY_STORAGE_PASSWORD') || '').trim() || undefined;
    const storageHostname = (Deno.env.get('BUNNY_STORAGE_HOSTNAME') || 'ny.storage.bunnycdn.com').trim();

    if (!storagePassword || !envStorageZone) {
      return new Response(
        JSON.stringify({ success: false, error: 'Configuración de storage incompleta' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Bunny config:', {
      envStorageZone,
      storagePassword: `SET (length: ${storagePassword.length})`,
      storageHostname,
    });

    const body = await req.json();
    const { projectId, folderPath } = body;

    if (!projectId) {
      return new Response(
        JSON.stringify({ success: false, error: 'projectId requerido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use provided folderPath or build a default one
    // Expected folderPath: raw-assets/org_xxx/client_xxx/project_xxx
    let targetFolder = folderPath;
    if (!targetFolder || typeof targetFolder !== 'string') {
      return new Response(
        JSON.stringify({ success: false, error: 'folderPath requerido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Normalize: remove leading/trailing slashes
    targetFolder = targetFolder.replace(/^\/+|\/+$/g, '');

    console.log(`Generating ZIP for project ${projectId} from folder: ${targetFolder}`);

    // List all files in the folder recursively
    const files = await listFilesRecursive(storageHostname, envStorageZone, targetFolder, storagePassword);

    if (files.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'No se encontraron archivos en la carpeta' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${files.length} files to download`);

    // Create ZIP in memory
    const blobWriter = new BlobWriter("application/zip");
    const zipWriter = new ZipWriter(blobWriter);

    let successCount = 0;
    let errorCount = 0;

    // Download each file and add to ZIP
    for (const file of files) {
      try {
        const fileUrl = `https://${storageHostname}/${envStorageZone}/${file.path}`;
        console.log(`Downloading: ${file.name} from ${fileUrl}`);

        const response = await fetch(fileUrl, {
          headers: { AccessKey: storagePassword },
        });

        if (!response.ok) {
          console.error(`Failed to download ${file.name}: ${response.status}`);
          errorCount++;
          continue;
        }

        console.log(`Successfully downloaded ${file.name}`);
        const arrayBuffer = await response.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);

        // Use the relative path from the target folder for ZIP structure
        const relativePath = file.path.replace(`${targetFolder}/`, '');
        await zipWriter.add(relativePath, new Uint8ArrayReader(uint8Array));
        successCount++;
      } catch (fileError) {
        console.error(`Error processing ${file.name}:`, fileError);
        errorCount++;
      }
    }

    await zipWriter.close();
    const zipBlob = await blobWriter.getData();

    console.log(`ZIP created: ${successCount} files, ${errorCount} errors, size: ${zipBlob.size} bytes`);

    if (successCount === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'No se pudo descargar ningún archivo para el ZIP'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Return ZIP as binary
    const filename = `material_crudo_${projectId.slice(0, 8)}.zip`;

    return new Response(zipBlob, {
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
