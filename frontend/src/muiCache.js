import createCache from '@emotion/cache';

// Create an Emotion cache that uses the optional insertion point meta tag.
// This prevents the "Couldn't find a style target" error by ensuring styles
// have a valid container in the document head.
export default function createEmotionCache() {
  let insertionPoint;

  if (typeof document !== 'undefined') {
    const metaTag = document.querySelector('meta[name="emotion-insertion-point"]');
    insertionPoint = metaTag || undefined;
  }

  return createCache({ key: 'mui', insertionPoint });
}