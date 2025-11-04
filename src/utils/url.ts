/**
 * Utility functions for URL handling and Builder.io icon URLs
 */

/**
 * Get Builder.io icon URL for a given icon name
 * @param iconName - The name of the icon
 * @returns The full URL to the Builder.io icon
 */
export function getBuilderIconUrl(iconName: string): string {
  const baseUrl = 'https://cdn.builder.io/api/v1/image/assets';
  const spaceId = process.env.NEXT_PUBLIC_BUILDER_SPACE_ID || 'your-space-id';
  
  return `${baseUrl}/${spaceId}/icon-${iconName}`;
}

/**
 * Get Builder.io image URL with optional transformations
 * @param imagePath - The path to the image
 * @param options - Optional transformation options
 * @returns The full URL to the Builder.io image
 */
export function getBuilderImageUrl(
  imagePath: string,
  options?: {
    width?: number;
    height?: number;
    quality?: number;
    format?: 'webp' | 'png' | 'jpg';
  }
): string {
  const baseUrl = 'https://cdn.builder.io/api/v1/image/assets';
  const spaceId = process.env.NEXT_PUBLIC_BUILDER_SPACE_ID || 'your-space-id';
  
  let url = `${baseUrl}/${spaceId}/${imagePath}`;
  
  if (options) {
    const params = new URLSearchParams();
    
    if (options.width) params.append('width', options.width.toString());
    if (options.height) params.append('height', options.height.toString());
    if (options.quality) params.append('quality', options.quality.toString());
    if (options.format) params.append('format', options.format);
    
    if (params.toString()) {
      url += `?${params.toString()}`;
    }
  }
  
  return url;
}

/**
 * Build a URL with query parameters
 * @param baseUrl - The base URL
 * @param params - Query parameters as an object
 * @returns The URL with query parameters
 */
export function buildUrl(baseUrl: string, params: Record<string, string | number | boolean>): string {
  const url = new URL(baseUrl);
  
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.append(key, value.toString());
  });
  
  return url.toString();
}

/**
 * Check if a URL is external
 * @param url - The URL to check
 * @returns True if the URL is external
 */
export function isExternalUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.origin !== window.location.origin;
  } catch {
    return false;
  }
}

/**
 * Get the domain from a URL
 * @param url - The URL to extract domain from
 * @returns The domain or null if invalid URL
 */
export function getDomainFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return null;
  }
}
