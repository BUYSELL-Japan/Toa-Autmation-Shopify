// Japan Post Shipping Rates (2026/01/01 Revision)
// Data provided by user from Spreadsheet

export interface ShippingRate {
    maxWeight: number // grams
    zone1: number // CN, KR, TW
    zone2: number // Asia (Thailand etc)
    zone3: number // Oceania, Canada, EU
    zone4: number // USA (Special Zone)
    zone5: number // South America, Africa
}

// --- ePacket Light (Max 2kg) ---
export const EPACKET_LIGHT_RATES: ShippingRate[] = [
    { maxWeight: 100, zone1: 720, zone2: 750, zone3: 880, zone4: 1200, zone5: 920 },
    { maxWeight: 200, zone1: 820, zone2: 870, zone3: 1060, zone4: 1410, zone5: 1180 },
    { maxWeight: 300, zone1: 920, zone2: 990, zone3: 1240, zone4: 1620, zone5: 1440 },
    { maxWeight: 400, zone1: 1020, zone2: 1110, zone3: 1420, zone4: 1830, zone5: 1700 },
    { maxWeight: 500, zone1: 1120, zone2: 1230, zone3: 1600, zone4: 2040, zone5: 1960 },
    { maxWeight: 600, zone1: 1220, zone2: 1350, zone3: 1780, zone4: 2250, zone5: 2220 },
    { maxWeight: 700, zone1: 1320, zone2: 1470, zone3: 1960, zone4: 2460, zone5: 2480 },
    { maxWeight: 800, zone1: 1420, zone2: 1590, zone3: 2140, zone4: 2670, zone5: 2740 },
    { maxWeight: 900, zone1: 1520, zone2: 1710, zone3: 2320, zone4: 2880, zone5: 3000 },
    { maxWeight: 1000, zone1: 1620, zone2: 1830, zone3: 2500, zone4: 3090, zone5: 3260 },
    { maxWeight: 1100, zone1: 1720, zone2: 1950, zone3: 2680, zone4: 3300, zone5: 3520 },
    { maxWeight: 1200, zone1: 1820, zone2: 2070, zone3: 2860, zone4: 3510, zone5: 3780 },
    { maxWeight: 1300, zone1: 1920, zone2: 2190, zone3: 3040, zone4: 3720, zone5: 4040 },
    { maxWeight: 1400, zone1: 2020, zone2: 2310, zone3: 3220, zone4: 3930, zone5: 4300 },
    { maxWeight: 1500, zone1: 2120, zone2: 2430, zone3: 3400, zone4: 4140, zone5: 4560 },
    { maxWeight: 1600, zone1: 2220, zone2: 2550, zone3: 3580, zone4: 4350, zone5: 4820 },
    { maxWeight: 1700, zone1: 2320, zone2: 2670, zone3: 3760, zone4: 4560, zone5: 5080 },
    { maxWeight: 1800, zone1: 2420, zone2: 2790, zone3: 3940, zone4: 4770, zone5: 5340 },
    { maxWeight: 1900, zone1: 2520, zone2: 2910, zone3: 4120, zone4: 4980, zone5: 5600 },
    { maxWeight: 2000, zone1: 2620, zone2: 3030, zone3: 4300, zone4: 5190, zone5: 5860 }
]

// --- EMS (International Express Mail) ---
// Max 30kg
// Data from user: "合計" values used for Zone 2, 3, 4 where surcharge exists
export const EMS_RATES: ShippingRate[] = [
    { maxWeight: 500, zone1: 1450, zone2: 2150, zone3: 3150, zone4: 3900, zone5: 3600 },
    { maxWeight: 600, zone1: 1600, zone2: 2450, zone3: 3400, zone4: 4180, zone5: 3900 },
    { maxWeight: 700, zone1: 1750, zone2: 2750, zone3: 3650, zone4: 4460, zone5: 4200 },
    { maxWeight: 800, zone1: 1900, zone2: 3050, zone3: 3900, zone4: 4740, zone5: 4500 },
    { maxWeight: 900, zone1: 2050, zone2: 3350, zone3: 4150, zone4: 5020, zone5: 4800 },
    { maxWeight: 1000, zone1: 2200, zone2: 3650, zone3: 4400, zone4: 5300, zone5: 5100 },
    { maxWeight: 1250, zone1: 2500, zone2: 4150, zone3: 5000, zone4: 5990, zone5: 5850 },
    { maxWeight: 1500, zone1: 2800, zone2: 4600, zone3: 5550, zone4: 6600, zone5: 6600 },
    { maxWeight: 1750, zone1: 3100, zone2: 5100, zone3: 6150, zone4: 7290, zone5: 7350 },
    { maxWeight: 2000, zone1: 3400, zone2: 5550, zone3: 6700, zone4: 7900, zone5: 8100 },
    { maxWeight: 2500, zone1: 3900, zone2: 6400, zone3: 7750, zone4: 9100, zone5: 9600 },
    { maxWeight: 3000, zone1: 4400, zone2: 7250, zone3: 8800, zone4: 10300, zone5: 11100 },
    { maxWeight: 3500, zone1: 4900, zone2: 8100, zone3: 9850, zone4: 11500, zone5: 12600 },
    { maxWeight: 4000, zone1: 5400, zone2: 8950, zone3: 10900, zone4: 12700, zone5: 14100 },
    { maxWeight: 4500, zone1: 5900, zone2: 9800, zone3: 11950, zone4: 13900, zone5: 15600 },
    { maxWeight: 5000, zone1: 6400, zone2: 10650, zone3: 13000, zone4: 15100, zone5: 17100 },
    { maxWeight: 10000, zone1: 11160, zone2: 18350, zone3: 23500, zone4: 27100, zone5: 29700 }, // 5.5~10kg (Simplified to max step)
    { maxWeight: 15000, zone1: 15170, zone2: 26000, zone3: 34000, zone4: 39100, zone5: 41700 },
    { maxWeight: 20000, zone1: 19190, zone2: 33500, zone3: 44500, zone4: 51100, zone5: 53700 },
    { maxWeight: 25000, zone1: 23200, zone2: 40850, zone3: 55000, zone4: 63100, zone5: 65700 },
    { maxWeight: 30000, zone1: 27220, zone2: 48350, zone3: 65500, zone4: 75100, zone5: 77700 }
]

export function getShippingRate(weightG: number, zone: 'zone1' | 'zone2' | 'zone3' | 'zone4' | 'zone5'): number {
    const totalWeight = weightG + 100; // Packaging buffer

    // 1. Try ePacket Light first (Cheapest for < 2kg)
    if (totalWeight <= 2000) {
        const rate = EPACKET_LIGHT_RATES.find(r => totalWeight <= r.maxWeight);
        if (rate) return rate[zone];
    }

    // 2. Fallback to EMS if > 2kg or ePacket undefined
    const emsRate = EMS_RATES.find(r => totalWeight <= r.maxWeight);
    if (emsRate) return emsRate[zone];

    // 3. Fallback for Overweight (> 30kg)
    // Return max EMS + extra
    return EMS_RATES[EMS_RATES.length - 1][zone] + 10000;
}

export function getAllShippingRates(weightG: number): ShippingRate {
    const totalWeight = weightG + 100; // Packaging buffer

    // 1. Try ePacket Light first (Cheapest for < 2kg)
    if (totalWeight <= 2000) {
        const rate = EPACKET_LIGHT_RATES.find(r => totalWeight <= r.maxWeight);
        if (rate) return rate;
    }

    // 2. Fallback to EMS if > 2kg or ePacket undefined
    const emsRate = EMS_RATES.find(r => totalWeight <= r.maxWeight);
    if (emsRate) return emsRate;

    // 3. Fallback for Overweight (> 30kg)
    const max = EMS_RATES[EMS_RATES.length - 1];
    return {
        maxWeight: totalWeight,
        zone1: max.zone1 + 10000,
        zone2: max.zone2 + 10000,
        zone3: max.zone3 + 10000,
        zone4: max.zone4 + 10000,
        zone5: max.zone5 + 10000,
    };
}
