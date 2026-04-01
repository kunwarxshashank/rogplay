import { Buffer } from 'buffer';

export interface DrmConfig {
    type: string;
    licenseServer: string;
}

/**
 * Processes various formats of ClearKey DRM keys and returns a configuration compatible with react-native-video.
 * 
 * Supported formats for drmkeys:
 * 1. Hex: "kid:key" (e.g., "edf1...af2:2f5a...4cf")
 * 2. JSON: Base64 JSON string (e.g., '{"keys":[{"kty":"oct","kid":"...","k":"..."}]}')
 * 3. URL: Fetch the key from a URL (GET or POST). Response can be Hex or JSON.
 */
export async function processDrmConfig(drmkeys: string, drmtype: string, headers?: any): Promise<DrmConfig | null> {
    if (!drmkeys || !drmtype) return null;

    const type = drmtype.toLowerCase();

    // Determine the normalized DRM type for react-native-video
    let normalizedType = 'clearkey';
    if (type.includes('widevine')) normalizedType = 'widevine';
    else if (type.includes('playready')) normalizedType = 'playready';
    else if (type.includes('fairplay')) normalizedType = 'fairplay';
    else if (!type.includes('clearkey')) return null; // Unsupported or no DRM

    // If it's not ClearKey, return the original key as licenseServer (usually a URL)
    if (normalizedType !== 'clearkey') {
        return {
            type: normalizedType,
            licenseServer: drmkeys,
        };
    }

    let keyData = drmkeys.trim();

    // Handle URL
    if (keyData.startsWith('http')) {
        try {
            const fetchOptions: any = {
                headers: headers || {}
            };

            // Try POST first (common for license requests)
            let response = await fetch(keyData, { ...fetchOptions, method: 'POST' });
            if (!response.ok) {
                // Fallback to GET
                response = await fetch(keyData, { ...fetchOptions, method: 'GET' });
            }

            if (response.ok) {
                keyData = (await response.text()).trim();
            } else {
                console.error(`Failed to fetch DRM key from URL: ${keyData}. Status: ${response.status}`);
            }
        } catch (error) {
            console.error('Error fetching DRM key:', error);
        }
    }

    // Process Hex format (kid:key)
    if (keyData.includes(':') && !keyData.startsWith('{')) {
        const parts = keyData.split(':');
        if (parts.length === 2) {
            try {
                const kidHex = parts[0].trim();
                const keyHex = parts[1].trim();

                const hexToBase64 = (hex: string) => {
                    // Clean and normalize hex
                    let clean = hex.replace(/[^0-9a-fA-F]/g, '');

                    // Most ClearKey keys are 128-bit (16 bytes / 32 hex chars)
                    // If it's 31 chars, it's usually a missing leading zero
                    if (clean.length === 31) clean = '0' + clean;
                    else if (clean.length % 2 !== 0) clean = clean + '0';

                    // Pad or truncate to 32 chars if it's meant to be a 128-bit key
                    if (clean.length < 32 && clean.length > 0) clean = clean.padEnd(32, '0');

                    const bytes = Buffer.from(clean, 'hex');
                    return bytes.toString('base64')
                        .replace(/\+/g, '-')
                        .replace(/\//g, '_')
                        .replace(/=+$/, '');
                };

                const cleanKid = hexToBase64(kidHex);
                const cleanKey = hexToBase64(keyHex);

                return {
                    type: 'clearkey',
                    licenseServer: JSON.stringify({
                        keys: [
                            {
                                kty: 'oct',
                                kid: cleanKid,
                                k: cleanKey,
                            }
                        ],
                        type: 'temporary'
                    })
                };
            } catch (error) {
                console.error('Error parsing Hex ClearKey:', error);
            }
        }
    }

    // Process JSON format
    if (keyData.startsWith('{')) {
        try {
            // Validate it's proper JSON
            JSON.parse(keyData);
            return {
                type: 'clearkey',
                licenseServer: keyData,
            };
        } catch (error) {
            console.error('Error parsing JSON ClearKey:', error);
        }
    }

    // Default: return as is (might be a direct key or other format)
    return {
        type: 'clearkey',
        licenseServer: keyData,
    };
}
