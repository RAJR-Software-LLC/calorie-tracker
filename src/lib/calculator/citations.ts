import { Linking } from 'react-native';

function isLocalDevHttpHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return host === 'localhost' || host === '127.0.0.1' || host === '[::1]' || host === '::1';
}

/**
 * Open a citation DOI/URL. Only https is allowed in production; http is limited to local/dev hosts.
 */
export async function openCitationUrl(doiOrUrl: string): Promise<boolean> {
  const trimmed = doiOrUrl.trim();
  if (!trimmed) return false;

  let href = trimmed;
  if (/^10\.\d{4,}/.test(trimmed)) {
    href = `https://doi.org/${trimmed}`;
  } else if (trimmed.startsWith('doi:')) {
    href = `https://doi.org/${trimmed.slice(4).trim()}`;
  }

  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return false;
  }

  const isHttps = url.protocol === 'https:';
  const isLocalHttp = url.protocol === 'http:' && isLocalDevHttpHost(url.hostname);
  if (!isHttps && !isLocalHttp) {
    return false;
  }

  const canOpen = await Linking.canOpenURL(url.href);
  if (!canOpen) return false;
  await Linking.openURL(url.href);
  return true;
}
