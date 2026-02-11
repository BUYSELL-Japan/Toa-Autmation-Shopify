
export class OpenAIService {
    private apiKey: string;

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    async formatProduct(title: string, description: string): Promise<any> {
        const prompt = `
You are a professional e-commerce copywriter for "Japan Anime Shoten".
Your task is to re-write the following product information into a **clean, objective catalog format** in **Japanese**.

Input Title: ${title}
Input Description: ${description}

Requirements:
1. **Source Content**: Create a high-quality **Japanese (ja)** version.
   - **Tone**: Objective, fact-based, concise. NO promotional language (e.g., "Must buy", "Great gift").
   - **Title Structure**: "[Manufacturer] [Series Name] [Item Name] [Model No (if available)]" (Clean, precise)
   - **Description**: 1-2 lines describing key features/pose objectively.
   - **Specs**: A list of technical details (Size, Material, Model No, Weight, etc). **DO NOT** include ASIN.

2. **Format**:
   - Use HTML format (e.g., <p>, <ul>, <li>).
   - **NO** "Shipped directly from Japan" or "About Us" sections.
   - **NO** gift/wrapping mentions.
   - **NO** ratings, reviews, or star counts.

3. **Weight Estimation**:
   - Estimate the shipping weight in **grams** based on the product type (e.g., Figure ~500g, Plush ~200g, Keyholder ~50g).
   - If unsure, use a reasonable default.

Output JSON format ONLY:
{
  "ja": { "title": "...", "body_html": "..." },
  "estimated_weight_g": 500
}
`;

        return this.callOpenAI(prompt);
    }

    async translateProduct(title: string, body_html: string): Promise<any> {
        const prompt = `
You are a professional translator for an e-commerce store.
Translate the following **Japanese** product information into English, Traditional Chinese, Simplified Chinese, Korean, and Thai.

Source Title: ${title}
Source Description (HTML): ${body_html}

Requirements:
1. **Accuracy**: Translate technical terms (Size, Material, etc.) correctly.
2. **Tone**: Objective, formal, catalog style.
3. **Format**: Keep the HTML structure of the description.
4. **Thai Language Rule**: For Thai (th), **DO NOT** translate Brand Names, Character Names, Model Numbers, or Series Names. Keep them in **English** or the original source text to avoid translation errors.


Output JSON format ONLY:
{
  "en": { "title": "...", "body_html": "..." },
  "zh_tw": { "title": "...", "body_html": "..." },
  "zh_cn": { "title": "...", "body_html": "..." },
  "ko": { "title": "...", "body_html": "..." },
  "th": { "title": "...", "body_html": "..." }
}
`;
        return this.callOpenAI(prompt);
    }

    private async callOpenAI(prompt: string): Promise<any> {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: 'You are a helpful e-commerce assistant.' },
                    { role: 'user', content: prompt }
                ],
                response_format: { type: "json_object" }
            })
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`OpenAI API Error: ${err}`);
        }

        const data: any = await response.json();
        const content = data.choices[0].message.content;

        try {
            return JSON.parse(content);
        } catch (e) {
            throw new Error('Failed to parse OpenAI response');
        }
    }
}
