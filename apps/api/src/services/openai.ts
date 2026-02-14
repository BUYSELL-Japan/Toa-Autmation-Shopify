
export class OpenAIService {
    private apiKey: string;

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    async formatProduct(title: string, description: string): Promise<any> {
        const prompt = `
You are a professional e-commerce copywriter for "Japan Anime Shoten".
Your task is to re-write the following product information into a **clean, objective catalog format** in **Japanese**.
AND extraction of key attributes as **English Tags**.

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

4. **Tag Extraction (English & Japanese)**:
   Extract the following attributes.
   - **English Tags (\`tags\`)**: Format as "Key:Value" (e.g., "Anime:Chainsaw Man").
   - **Japanese Tags (\`tags_ja\`)**: Format as "Key:Value" (e.g., "アニメ:チェンソーマン").

   **Attributes to Extract**:
   - **Anime**: "Anime:[Series Name]" / "アニメ:[作品名]"
   - **Char**: "Char:[Character Name]" / "キャラ:[キャラクター名]"
   - **Maker**: "Maker:[Manufacturer]" / "メーカー:[メーカー名]"
   - **Scale**: "Scale:[Value]" / "スケール:[Value]" (e.g., 1/7).
   - **Size**: "Size:[Small/Medium/Large]" / "サイズ:[小/中/大]"
   - **Year**: "Year:[YYYY]" / "発売年:[YYYY]"
   - **Rarity**: "Rarity:[Level]" / "レア度:[Level]"
     - Common / コモン
     - Uncommon / アンコモン
     - Rare / レア
     - Very Rare / ベリーレア
     - Ultra Rare / ウルトラレア
   - **Price**: "Price:[Level]" / "価格帯:[Level]"
     - Budget / entry / Mid / High / Premium / Luxury

Output JSON format ONLY:
{
  "ja": { "title": "...", "body_html": "..." },
  "estimated_weight_g": 500,
  "tags": [ "Anime:...", "Char:...", ... ],
  "tags_ja": [ "アニメ:...", "キャラ:...", ... ]
}
`;
        return this.callOpenAI(prompt, 0.3);
    }

    async translateProduct(title: string, body_html: string): Promise<any> {
        const prompt = `
You are a specialized translator for Japanese anime figure/collectible product descriptions.

=== ABSOLUTE REQUIREMENT ===
YOUR OUTPUT MUST CONTAIN ZERO JAPANESE CHARACTERS.
Before submitting your translation, scan every single word to ensure NO hiragana (あ), katakana (ア), or kanji (漢) remain.
If you find ANY Japanese characters in your output, you have FAILED this task.

=== CRITICAL RULES - PRIORITY ORDER ===

RULE 1: NO JAPANESE CHARACTERS IN OUTPUT
- Translated text must use ONLY: English alphabet, Chinese characters (汉字/漢字), Korean Hangul (한글), Thai script (ไทย), numbers, and punctuation
- Even if unsure how to translate something, you MUST romanize it - NEVER leave Japanese characters
- Check EVERY word before output

RULE 2: PRESERVE THESE EXACTLY (DO NOT TRANSLATE):
- Manufacturer names: FuRyu, Good Smile Company, BANDAI SPIRITS, KOTOBUKIYA, Max Factory, SEGA, Taito, Alpha Satellite, etc.
- Product series names: figma, Nendoroid, S.H.Figuarts, BiCute Bunnies Figure, ARTFX J, POP UP PARADE, AMP+, Luminasta, Shibuya Scramble, etc.
- Scale notations: 1/7 scale, 1/8 scale, Non-scale
- Model numbers: NON, etc.
- Material abbreviations: ABS, PVC, etc.
- Designer/sculptor names: Design COCO, CHIGA, etc.
- Store names: Round1, Amazon, Animate, Wonder Festival, etc.
- Geographic product names: Shibuya Scramble (keep as "Shibuya Scramble" in ALL languages)

RULE 3: TRANSLATE CHARACTER NAMES CONSISTENTLY
- Convert ALL katakana character names to target language
- Chinese (Simplified): パワー → 帕瓦 | マキマ → 玛奇玛 | デンジ → 电次 | アキ → 阿基
- Chinese (Traditional): パワー → 帕瓦 | マキマ → 瑪奇瑪 | デンジ → 電次 | アキ → 阿基
- Korean: パワー → 파워 | マキマ → 마키마 | デンジ → 덴지 | アキ → 아키
- Thai: パワー → พาวเวอร์ | マキマ → มาคิมะ | デンジ → เด็นจิ | アキ → อากิ
- English: Romanize (Power, Makima, Denji, Aki)
- CRITICAL: If the source mentions "パワー", ALL translations must refer to "Power/帕瓦/파워/พาวเวอร์" - NOT other characters

RULE 4: TRANSLATE ANIME/MANGA TITLES
- Chinese (Simplified): チェンソーマン → 链锯人 | 鬼滅の刃 → 鬼灭之刃
- Chinese (Traditional): チェンソーマン → 鏈鋸人 | 鬼滅の刃 → 鬼滅之刃
- Korean: チェンソーマン → 체인소맨 (NO SPACE) | 鬼滅の刃 → 귀멸의 칼날
- Thai: チェンソーマン → เชนซอแมน (NO SPACE) | 鬼滅の刃 → ดาบพิฆาตอสูร
- English: Use official title (Chainsaw Man, Demon Slayer)

RULE 5: EXCLUSIVE/LIMITED EDITION
- Keep store name in English, translate "limited/exclusive"
- ラウンドワン限定 → Round1 exclusive (EN) | Round1限定 (CN) | Round1 한정 (KO) | Round1 จำกัด (TH)
- 渋谷スクランブル → Shibuya Scramble (ALL languages - this is a product series name)

RULE 6: COLOR TRANSLATION
- ライトブルー → Light Blue (EN) | 浅蓝色/淺藍色 (CN) | 라이트 블루 (KO) | ฟ้าอ่อน (TH)
- ブルー → Blue (EN) | 蓝色/藍色 (CN) | 블루 (KO) | น้ำเงิน (TH)
- Maintain consistency in title and body

RULE 7: TECHNICAL TERMS
- 塗装済み完成品 → Pre-painted finished figure (EN) | 涂装完成品/塗裝完成品 (CN) | 도색 완성품 (KO) | ฟิกเกอร์ทาสีสำเร็จรูป (TH)
- 交換パーツ → Interchangeable parts (EN) | 替换配件/替換配件 (CN) | 교체 파츠 (KO) | ชิ้นส่วนสำรอง (TH)
- 台座 → Base (EN) | 底座 (CN) | 베이스 (KO) | ฐาน (TH)

RULE 8: FORMAT PRESERVATION
- Keep ALL HTML tags: <p>, <ul>, <li>
- Keep numbers and units: 180mm, 25cm
- Keep dates: YYYY/MM/DD
- Preserve list structure

RULE 9: LANGUAGE-SPECIFIC RULES
Korean:
- NO spaces in anime titles: 체인소맨 NOT 체인소 맨
- Complete sentences must be in Korean, NO Japanese verb endings (施されています ❌)
Thai:
- NO spaces in anime titles: เชนซอแมน NOT เชนซอ แมน
- Complete sentences in Thai script only

=== VALIDATION CHECKLIST (CHECK BEFORE SUBMITTING) ===
For EACH language translation:
□ Scan every character - is there ANY hiragana/katakana/kanji? If YES → FIX IT
□ Are brand names preserved in English? (Alpha Satellite, not アルファサテライト)
□ Are series names preserved? (Shibuya Scramble, not 渋谷スクランブル)
□ Is character name consistent with source? (If source says パワー, translate as Power/帕瓦 - NOT other characters)
□ Are HTML tags intact?
□ Are numbers unchanged?

=== INPUT ===
Source Title: ${title}
Source Description: ${body_html}

=== OUTPUT FORMAT ===
Return ONLY valid JSON:
{
  "en": { "title": "...", "body_html": "..." },
  "zh_tw": { "title": "...", "body_html": "..." },
  "zh_cn": { "title": "...", "body_html": "..." },
  "ko": { "title": "...", "body_html": "..." },
  "th": { "title": "...", "body_html": "..." }
}

CRITICAL REMINDER: Before outputting, verify ZERO Japanese characters exist in your translations.
`;

        // 1. Initial Translation with low temperature
        let results = await this.callOpenAI(prompt, 0.1);

        // 2. Validation & Retry
        const languages = ['en', 'zh_tw', 'zh_cn', 'ko', 'th'];
        for (const lang of languages) {
            let attempts = 0;
            // Retry logic: up to 2 times
            while (attempts < 2) {
                if (this.hasJapanese(results[lang], lang)) {
                    console.warn(`[Translation] Japanese detected in ${lang}. Retrying (${attempts + 1}/2)...`);
                    const fixed = await this.retrySingleLanguage(title, body_html, lang);
                    if (fixed && fixed[lang]) {
                        results[lang] = fixed[lang];
                    }
                    if (!this.hasJapanese(results[lang], lang)) {
                        console.log(`[Translation] Successfully fixed ${lang}`);
                        break;
                    }
                    attempts++;
                } else {
                    break;
                }
            }
            // Final check
            if (this.hasJapanese(results[lang], lang)) {
                console.error(`[Translation] Failed to remove Japanese from ${lang} after retries.`);
            }
        }

        return results;
    }

    private hasJapanese(textObj: any, lang: string): boolean {
        if (!textObj) return false;
        const content = (textObj.title || '') + (textObj.body_html || '');

        const hasHiragana = /[\u3040-\u309F]/.test(content);
        const hasKatakana = /[\u30A0-\u30FF]/.test(content);
        // Common CJK Unified Ideographs block: 4E00-9FFF
        // Note: Checking for "Kanji" is tricky for Chinese.
        const hasKanji = /[\u4E00-\u9FAF]/.test(content);

        // For Chinese (zh_tw, zh_cn), Kanji is expected. Only check Kana.
        if (lang === 'zh_tw' || lang === 'zh_cn') {
            if (hasHiragana || hasKatakana) return true;
            // Check common implementation of "Japanese-specific Kanji" is hard without huge lookup tables, 
            // so we rely on context. Generally, if no Kana, it's safer.
            return false;
        }

        // For others (en, ko, th), NO CJK characters allowed ideally (except maybe brand names if allowed, but rule says NO).
        // Rule 1 says: "English alphabet, Chinese characters (allowed?), Korean Hangul, Thai script..."
        // Rule 1 says: "NO ... kanji (漢字) in any translated language" -> This implies EN/KO/TH should strictly not have Kanji.
        // Wait, Rule 1 says "Translated text must use ONLY: ... Chinese characters (汉字/漢字) ...". 
        // Ah, Rule 1 applies to the *Output*. 
        // "Chinese characters" are listed as ALLOWED. This means Kanji might be allowed if it's Chinese text?
        // But for English/Korean/Thai, Kanji shouldn't be there unless it's a specific proper noun in Chinese?
        // Let's follow the strict "NO Japanese characters" prompt instructions: "NO ... or kanji".
        // BUT Rule 1 also says "Translated text must use ONLY: ... Chinese characters". 
        // This contradiction (No Kanji vs Use Chinese Characters) implies Chinese Characters are for Chinese Language output.
        // For EN/KO/TH, we should probably flag Kanji as suspicious effectively.

        if (lang === 'en' || lang === 'ko' || lang === 'th') {
            return hasHiragana || hasKatakana || hasKanji;
        }

        return false;
    }

    private async retrySingleLanguage(title: string, body_html: string, lang: string): Promise<any> {
        const prompt = `
You are fixing a translation that FAILED because it contained Japanese characters.
Language: ${lang}

Original Japanese Title: ${title}
Original Japanese Description: ${body_html}

YOUR TASK:
Translate the above into ${lang} following these rules STRICTLY:
1. ABSOLUTELY NO JAPANESE CHARACTERS (Hiragana, Katakana, Kanji).
2. Use ONLY ${lang} characters (and English for brand names).
3. Translate everything completely.

Output JSON format ONLY for this language:
{
  "${lang}": { "title": "...", "body_html": "..." }
}
`;
        return this.callOpenAI(prompt, 0.1);
    }

    private async callOpenAI(prompt: string, temperature: number = 0.7): Promise<any> {
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
                temperature: temperature, // Using optimized temperature
                response_format: { type: "json_object" }
            })
        });

        if (!response.ok) {
            const err = await response.text();
            console.error('OpenAI API Error Details:', err);
            throw new Error(`OpenAI API Error: ${response.status} ${response.statusText} - ${err}`);
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
