import dns from "dns";

// Guard de SSRF compartido — cualquier tool que haga fetch() server-side a
// una URL controlada por el caller (talento, admin, o la IA en su nombre)
// debe pasar el hostname por acá antes de conectar. Sin esto, el MCP server
// se puede usar como proxy para sondear red interna (IPs privadas, metadata
// de la nube en 169.254.169.254, loopback, etc.) usando nuestra infra como
// origen. Usado por import_external_design (fetch de imagen) y
// register_webhook (valida el destino antes de aceptar el registro; el
// dispatcher re-valida en cada entrega porque DNS puede cambiar — rebinding).

const PRIVATE_IPV4_RANGES: Array<[string, number]> = [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],   // CGNAT
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],  // link-local / metadata de nube
  ["172.16.0.0", 12],
  ["192.168.0.0", 16],
];

function ipv4ToLong(ip: string): number {
  return ip.split(".").reduce((acc, oct) => (acc << 8) + parseInt(oct, 10), 0) >>> 0;
}

function isPrivateIPv4(ip: string): boolean {
  const long = ipv4ToLong(ip);
  return PRIVATE_IPV4_RANGES.some(([base, bits]) => {
    const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
    return (long & mask) === (ipv4ToLong(base) & mask);
  });
}

function isPrivateIPv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  return lower === "::1" || lower.startsWith("fc") || lower.startsWith("fd") || lower.startsWith("fe80");
}

export async function isSafePublicHost(hostname: string): Promise<boolean> {
  try {
    const addresses = await dns.promises.lookup(hostname, { all: true });
    if (addresses.length === 0) return false;
    return addresses.every(({ address, family }) =>
      family === 4 ? !isPrivateIPv4(address) : !isPrivateIPv6(address)
    );
  } catch {
    return false;
  }
}
