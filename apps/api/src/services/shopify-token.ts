export interface ShopifyTokenOptions {
    shopName: string;
    clientId?: string;
    clientSecret?: string;
    DB: any; // D1Database
    envToken?: string;
}

export const getShopifyAccessToken = async (options: ShopifyTokenOptions): Promise<string | null> => {
    const { DB, envToken } = options;
    console.log('[TokenService] Fetching access token...');

    try {
        // 1. Try to get from D1 Database
        if (DB) {
            const result: any = await DB.prepare(
                "SELECT value FROM app_settings WHERE key = 'shopify_access_token'"
            ).first();

            if (result && result.value) {
                console.log('[TokenService] Found token in D1 (starts with):', result.value.substring(0, 10) + '...');
                return result.value as string;
            } else {
                console.log('[TokenService] No token found in D1.');
            }
        } else {
            console.error('[TokenService] DB binding is missing!');
        }
    } catch (e) {
        console.warn('[TokenService] Failed to fetch token from D1:', e)
    }

    // 2. Fallback to Environment Variable
    if (envToken && envToken.length > 10) {
        console.log('[TokenService] Using fallback env token.');
        return envToken
    }

    console.error('[TokenService] No valid token found.');
    return null
}
