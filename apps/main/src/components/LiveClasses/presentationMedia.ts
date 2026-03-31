export type PresentationMediaKind =
  | 'none'
  | 'google-doc'
  | 'google-slides'
  | 'youtube'
  | 'image'
  | 'video'
  | 'pdf'
  | 'office'
  | 'canva'
  | 'webpage';

export interface PresentationMedia {
  kind: PresentationMediaKind;
  sourceUrl: string;
  openUrl: string;
  embedUrl: string | null;
  title: string;
  inlineSupported: boolean;
}

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg', '.avif'];
const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.ogg', '.mov', '.m4v'];
const OFFICE_EXTENSIONS = ['.ppt', '.pptx', '.pps', '.ppsx', '.doc', '.docx', '.xls', '.xlsx'];

function normalizeUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  if (!trimmed) return '';
  return /^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function getFileExtension(pathname: string): string {
  const lowerPath = pathname.toLowerCase();
  const lastDot = lowerPath.lastIndexOf('.');
  if (lastDot === -1) return '';
  return lowerPath.slice(lastDot);
}

function buildGoogleDocsEmbed(url: URL): PresentationMedia | null {
  const docMatch = url.pathname.match(/^\/document\/d\/([^/]+)/);
  if (docMatch) {
    const id = docMatch[1];
    return {
      kind: 'google-doc',
      sourceUrl: url.toString(),
      openUrl: url.toString(),
      embedUrl: `https://docs.google.com/document/d/${id}/preview`,
      title: 'Google Doc',
      inlineSupported: true,
    };
  }

  const slidesMatch = url.pathname.match(/^\/presentation\/d\/([^/]+)/);
  if (slidesMatch) {
    const id = slidesMatch[1];
    return {
      kind: 'google-slides',
      sourceUrl: url.toString(),
      openUrl: url.toString(),
      embedUrl: `https://docs.google.com/presentation/d/${id}/embed?rm=minimal`,
      title: 'Google Slides',
      inlineSupported: true,
    };
  }

  return null;
}

function buildYoutubeEmbed(url: URL): PresentationMedia | null {
  const host = url.hostname.replace(/^www\./, '');
  let videoId = '';

  if (host === 'youtu.be') {
    videoId = url.pathname.replace(/^\/+/, '').split('/')[0] ?? '';
  } else if (host === 'youtube.com' || host === 'm.youtube.com') {
    if (url.pathname === '/watch') {
      videoId = url.searchParams.get('v') ?? '';
    } else if (url.pathname.startsWith('/embed/')) {
      videoId = url.pathname.split('/')[2] ?? '';
    } else if (url.pathname.startsWith('/shorts/')) {
      videoId = url.pathname.split('/')[2] ?? '';
    }
  }

  if (!videoId) return null;

  return {
    kind: 'youtube',
    sourceUrl: url.toString(),
    openUrl: url.toString(),
    embedUrl: `https://www.youtube.com/embed/${videoId}`,
    title: 'YouTube Video',
    inlineSupported: true,
  };
}

function buildCanvaEmbed(url: URL): PresentationMedia {
  const canvaViewUrl = url.pathname.includes('/view')
    ? url
    : new URL(`${url.origin}${url.pathname.replace(/\/$/, '')}/view${url.search}`);

  canvaViewUrl.searchParams.set('embed', '1');

  return {
    kind: 'canva',
    sourceUrl: url.toString(),
    openUrl: url.toString(),
    embedUrl: canvaViewUrl.toString(),
    title: 'Canva Presentation',
    inlineSupported: true,
  };
}

function buildOfficeEmbed(url: URL, extension: string): PresentationMedia {
  const encodedSrc = encodeURIComponent(url.toString());

  return {
    kind: 'office',
    sourceUrl: url.toString(),
    openUrl: url.toString(),
    embedUrl: `https://view.officeapps.live.com/op/embed.aspx?src=${encodedSrc}`,
    title: extension === '.pdf' ? 'Document' : 'Office File',
    inlineSupported: true,
  };
}

export function resolvePresentationMedia(rawUrl: string): PresentationMedia {
  const normalized = normalizeUrl(rawUrl);
  if (!normalized) {
    return {
      kind: 'none',
      sourceUrl: '',
      openUrl: '',
      embedUrl: null,
      title: 'Class Material',
      inlineSupported: false,
    };
  }

  try {
    const url = new URL(normalized);
    const host = url.hostname.replace(/^www\./, '');
    const extension = getFileExtension(url.pathname);

    if (host === 'docs.google.com') {
      const googleMedia = buildGoogleDocsEmbed(url);
      if (googleMedia) return googleMedia;
    }

    if (host === 'youtu.be' || host === 'youtube.com' || host === 'm.youtube.com') {
      const youtubeMedia = buildYoutubeEmbed(url);
      if (youtubeMedia) return youtubeMedia;
    }

    if (host.endsWith('canva.com')) {
      return buildCanvaEmbed(url);
    }

    if (extension === '.pdf') {
      return {
        kind: 'pdf',
        sourceUrl: url.toString(),
        openUrl: url.toString(),
        embedUrl: url.toString(),
        title: 'PDF Document',
        inlineSupported: true,
      };
    }

    if (IMAGE_EXTENSIONS.includes(extension)) {
      return {
        kind: 'image',
        sourceUrl: url.toString(),
        openUrl: url.toString(),
        embedUrl: url.toString(),
        title: 'Image',
        inlineSupported: true,
      };
    }

    if (VIDEO_EXTENSIONS.includes(extension)) {
      return {
        kind: 'video',
        sourceUrl: url.toString(),
        openUrl: url.toString(),
        embedUrl: url.toString(),
        title: 'Video',
        inlineSupported: true,
      };
    }

    if (OFFICE_EXTENSIONS.includes(extension)) {
      return buildOfficeEmbed(url, extension);
    }

    return {
      kind: 'webpage',
      sourceUrl: url.toString(),
      openUrl: url.toString(),
      embedUrl: null,
      title: 'Web Link',
      inlineSupported: false,
    };
  } catch {
    return {
      kind: 'webpage',
      sourceUrl: normalized,
      openUrl: normalized,
      embedUrl: null,
      title: 'Web Link',
      inlineSupported: false,
    };
  }
}
