// Shopify Translation API Service
// Registers product translations using Shopify GraphQL Admin API

type TranslationInput = {
    locale: string  // e.g., 'en', 'zh-TW', 'ko'
    key: string     // 'title' or 'body_html'
    value: string
    translatableContentDigest: string
}

type ProductTranslations = {
    en?: { title: string; body_html: string }
    zh_tw?: { title: string; body_html: string }
    zh_cn?: { title: string; body_html: string }
    ko?: { title: string; body_html: string }
    th?: { title: string; body_html: string }
}

export class ShopifyTranslationService {
    private baseUrl: string
    private headers: HeadersInit

    constructor(config: { shopName: string; accessToken: string }) {
        this.baseUrl = `https://${config.shopName}.myshopify.com/admin/api/2024-01/graphql.json`
        this.headers = {
            'X-Shopify-Access-Token': config.accessToken,
            'Content-Type': 'application/json',
        }
    }

    // Get translatable content digests for a product
    async getTranslatableContent(productId: string): Promise<any> {
        const query = `
            query getProductTranslatableContent($resourceId: ID!) {
                translatableResource(resourceId: $resourceId) {
                    resourceId
                    translatableContent {
                        key
                        value
                        digest
                        locale
                    }
                }
            }
        `

        const response = await fetch(this.baseUrl, {
            method: 'POST',
            headers: this.headers,
            body: JSON.stringify({
                query,
                variables: {
                    resourceId: `gid://shopify/Product/${productId}`
                }
            })
        })

        if (!response.ok) {
            throw new Error(`Failed to get translatable content: ${response.statusText}`)
        }

        return await response.json()
    }

    // Register translations for a product
    async registerTranslations(
        productId: string,
        translations: ProductTranslations
    ): Promise<any> {
        // First, get the translatable content to get digests
        const contentResult = await this.getTranslatableContent(productId)
        console.log(`[Translation] Content Result for ${productId}:`, JSON.stringify(contentResult));

        const translatableContent = contentResult.data?.translatableResource?.translatableContent

        if (!translatableContent) {
            console.warn('No translatable content found for product', productId)
            return { success: false, message: 'No translatable content found', debug: contentResult }
        }

        // Map language codes
        const languageMap: { [key: string]: string } = {
            'en': 'en',
            'zh_tw': 'zh-TW',
            'zh_cn': 'zh-CN',
            'ko': 'ko',
            'th': 'th'
        }

        const results = []

        for (const [langKey, langData] of Object.entries(translations)) {
            if (!langData) continue

            const locale = languageMap[langKey.toLowerCase()]
            if (!locale) {
                console.warn(`[Translation] No locale mapping found for key: ${langKey}`);
                continue
            }

            const translationInputs: any[] = []

            // Get digests for title and body_html
            const titleContent = translatableContent.find((c: any) => c.key === 'title')
            const bodyContent = translatableContent.find((c: any) => c.key === 'body_html')

            if (titleContent && langData.title) {
                translationInputs.push({
                    locale,
                    key: 'title',
                    value: langData.title,
                    translatableContentDigest: titleContent.digest
                })
            }

            if (bodyContent && langData.body_html) {
                translationInputs.push({
                    locale,
                    key: 'body_html',
                    value: langData.body_html,
                    translatableContentDigest: bodyContent.digest
                })
            }

            if (translationInputs.length === 0) continue

            // Register translations for this locale
            const mutation = `
                mutation RegisterTranslations($resourceId: ID!, $translations: [TranslationInput!]!) {
                    translationsRegister(resourceId: $resourceId, translations: $translations) {
                        userErrors {
                            field
                            message
                        }
                        translations {
                            key
                            value
                        }
                    }
                }
            `

            const response = await fetch(this.baseUrl, {
                method: 'POST',
                headers: this.headers,
                body: JSON.stringify({
                    query: mutation,
                    variables: {
                        resourceId: `gid://shopify/Product/${productId}`,
                        translations: translationInputs
                    }
                })
            })

            const result: any = await response.json()
            results.push({ locale, result })

            if (result.errors) {
                console.error(`[Translation] Error registering for ${locale}:`, JSON.stringify(result.errors));
            } else if (result.data?.translationsRegister?.userErrors?.length > 0) {
                console.error(`[Translation] UserErrors for ${locale}:`, JSON.stringify(result.data.translationsRegister.userErrors));
            } else {
                console.log(`[Translation] Success for ${locale}`);
            }
        }

        return { success: true, results }
    }
}
