export interface ScrapedData {
    title: string;
    price: number;
    description?: string;
    images: string[];
    url: string;
    weight_g?: number;
    logs?: string[];
}
