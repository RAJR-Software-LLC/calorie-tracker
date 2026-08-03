import { Linking } from 'react-native';

/**
 * Open a citation DOI/URL. Only https (and http for local/dev DOIs rewritten) are allowed.
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

  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    return false;
  }

  const canOpen = await Linking.canOpenURL(url.href);
  if (!canOpen) return false;
  await Linking.openURL(url.href);
  return true;
}
