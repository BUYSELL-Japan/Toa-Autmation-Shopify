
export class ShopifyChannelService {
    private shopName: string;
    private accessToken: string;

    constructor(config: { shopName: string; accessToken: string }) {
        this.shopName = config.shopName;
        this.accessToken = config.accessToken;
    }

    private async graphql(query: string, variables?: any) {
        const response = await fetch(`https://${this.shopName}.myshopify.com/admin/api/2024-01/graphql.json`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Shopify-Access-Token': this.accessToken
            },
            body: JSON.stringify({ query, variables })
        });

        const result = await response.json() as any;
        if (result.errors) {
            throw new Error(JSON.stringify(result.errors));
        }
        return result.data;
    }

    async getPublications() {
        // Fetch all publications (Sales Channels)
        const query = `
        query {
            publications(first: 20) {
                nodes {
                    id
                    name
                    catalog {
                        id
                    }
                }
            }
        }`;

        try {
            const data = await this.graphql(query);
            return data.publications.nodes.map((p: any) => ({
                id: p.id,
                name: p.name,
                catalogId: p.catalog?.id
            }));
        } catch (e: any) {
            console.error('Failed to fetch publications:', e);
            throw e;
        }
    }

    async publishProduct(productId: string, publicationId: string) {
        // Publish product to a specific publication
        const mutation = `
        mutation publishablePublish($id: ID!, $input: [PublicationInput!]!) {
            publishablePublish(id: $id, input: $input) {
                userErrors {
                    field
                    message
                }
            }
        }`;

        const variables = {
            id: productId, // gid://shopify/Product/123
            input: {
                publicationId: publicationId
            }
        };

        try {
            const data = await this.graphql(mutation, variables);
            const errors = data.publishablePublish?.userErrors || [];
            if (errors.length > 0) {
                console.error(`Failed to publish to ${publicationId}:`, errors);
            } else {
                console.log(`Successfully published ${productId} to ${publicationId}`);
            }
        } catch (e) {
            console.error(`Exception publishing to ${publicationId}:`, e);
        }
    }
}
