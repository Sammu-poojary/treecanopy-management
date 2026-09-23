/**
 * AI Product Description & Details Generation Service
 * Powered by OpenRouter Gemini / LLM with intelligent contextual fallback.
 */

// Contextual fallback knowledge for common municipal eco-store items
function getContextualFallback(name = '', category = 'Organic Compost') {
  const lower = (name + ' ' + category).toLowerCase();

  if (lower.includes('seed') || lower.includes('okra') || lower.includes('kit') || lower.includes('garden')) {
    return {
      description: `High-germination heirloom and desi seeds packaged for urban home kitchen gardens and balcony containers. Specially curated by CanopyGuard for coastal and tropical soils with non-GMO, disease-resistant lineage.`,
      usageInstructions: `Sow seeds 0.5 to 1 inch deep in moist, well-draining soil mixed with organic compost. Water gently using a spray mist twice daily until germination occurs (typically 5 to 8 days). Provide 4 to 6 hours of morning sunlight.`,
      benefits: [
        '100% Non-GMO & Native Heirloom Seeds',
        'High Germination Rate (Over 85%)',
        'Naturally Pest and Drought Tolerant',
        'Ideal for Terrace, Balcony, and Raised Garden Beds'
      ],
      suggestedUnitSize: '100 g Packet',
      suggestedWeightValue: 100,
      suggestedWeightUnit: 'g',
      suggestedPriceInr: 69,
      suggestedEcoPoints: 25
    };
  }

  if (lower.includes('char') || lower.includes('biochar') || lower.includes('carbon')) {
    return {
      description: `High-grade activated Bio-Char pyrolyzed from municipal hardwood canopy clearances and pruned woody biomass. Porous carbon structure locks moisture, prevents nutrient leaching, and serves as permanent microbial shelter in plant root zones.`,
      usageInstructions: `Inoculate or charge bio-char by mixing 1 part bio-char with 4 parts aged organic compost or liquid bio-slurry. Let sit for 48 hours before blending into garden topsoil or potting mix.`,
      benefits: [
        'Permanent Soil Carbon Sequestration',
        'Reduces Plant Watering Requirements by 35%',
        'Boosts Beneficial Mycorrhizal Fungal Colonies',
        'Prevents Fertilizer and Nutrient Leaching'
      ],
      suggestedUnitSize: '2 kg Bag',
      suggestedWeightValue: 2,
      suggestedWeightUnit: 'kg',
      suggestedPriceInr: 149,
      suggestedEcoPoints: 60
    };
  }

  if (lower.includes('mulch') || lower.includes('woodchip') || lower.includes('bark')) {
    return {
      description: `Seasoned coarse woodchips and shredded tree biomass harvested from municipal arboricultural operations. Acts as an organic protective carpet over garden beds, moderating soil temperature and suppressing weed emergence.`,
      usageInstructions: `Spread a 2 to 3-inch layer evenly over bare soil around tree bases, shrub beds, and garden borders. Keep mulch 2 inches away from immediate tree trunks to allow ventilation.`,
      benefits: [
        'Suppresses Over 80% of Common Garden Weeds',
        'Drastically Minimizes Soil Moisture Evaporation',
        'Moderates Root Temperature in Hot Seasons',
        'Breaks Down Slowly into Rich Humus'
      ],
      suggestedUnitSize: '5 kg Sack',
      suggestedWeightValue: 5,
      suggestedWeightUnit: 'kg',
      suggestedPriceInr: 89,
      suggestedEcoPoints: 35
    };
  }

  if (lower.includes('sapling') || lower.includes('tree') || lower.includes('plant')) {
    return {
      description: `Vigorous native tree sapling nursery-hardened at the Ajjarkadu Urban Canopy Yard. Adapted to coastal Karnataka microclimates, offering fast root establishment and high canopy shade yield.`,
      usageInstructions: `Dig a pit twice as wide as the root ball and equally deep. Mix excavated soil with equal parts organic compost. Place sapling straight, backfill firmly, and water deeply. Stake if planted in windy spots.`,
      benefits: [
        '100% Native Coastal Biodiversity Species',
        'Nursery Hardened with Robust Root Architecture',
        'Rapid Urban Canopy Shade and Bird Habitat',
        'Eligible for CanopyGuard Tree Adoption Carbon Credits'
      ],
      suggestedUnitSize: '1 Sapling (Root Bag)',
      suggestedWeightValue: 1,
      suggestedWeightUnit: 'pcs',
      suggestedPriceInr: 120,
      suggestedEcoPoints: 50
    };
  }

  if (lower.includes('liquid') || lower.includes('spray') || lower.includes('extract') || lower.includes('tea') || lower.includes('oil')) {
    return {
      description: `Bio-active botanical liquid foliar spray and soil drench fermented from recycled neem leaves, biomass extracts, and beneficial probiotic cultures. Provides rapid nutrient absorption and natural insect pest deterrence.`,
      usageInstructions: `Dilute 10 ml of concentrate per 1 Litre of clean water. Spray generously onto both sides of plant foliage during early morning or late evening hours. Reapply every 10 to 14 days.`,
      benefits: [
        'Immediate Foliar Nutrient & Enzyme Absorption',
        '100% Organic Botanical Insect & Mite Deterrent',
        'Stimulates Chlorophyll Synthesis and Lustrous Foliage',
        'Safe for Bees, Butterflies, and Earthworms'
      ],
      suggestedUnitSize: '500 ml Bottle',
      suggestedWeightValue: 500,
      suggestedWeightUnit: 'ml',
      suggestedPriceInr: 179,
      suggestedEcoPoints: 70
    };
  }

  // Default Organic Compost
  return {
    description: `Premium municipal organic compost processed from urban tree canopy trimmings, yard foliage, and bio-waste at the Ajjarkadu Composting Yard. Aerobically matured, heat-treated, and screened through 4mm sieves for superior soil enrichment.`,
    usageInstructions: `Mix 1 part compost with 3 parts garden soil for potting containers or raised beds. For mature trees, top-dress 1 to 2 inches around the canopy drip line twice a year.`,
    benefits: [
      '100% Organic & Weed-Seed Free',
      'Enriched with Beneficial Trichoderma & Humic Substances',
      'Restores Soil Biology and Aeration',
      'Certified Municipal Circular Economy Recycled'
    ],
    suggestedUnitSize: '5 kg Bag',
    suggestedWeightValue: 5,
    suggestedWeightUnit: 'kg',
    suggestedPriceInr: 99,
    suggestedEcoPoints: 40
  };
}

async function generateProductDetails({ name, category, unitSize, weightValue, weightUnit }) {
  const fallback = getContextualFallback(name, category);

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.log('[AI Product Service] No OPENROUTER_API_KEY, using contextual generator.');
    return fallback;
  }

  const prompt = `You are CanopyGuard AI, an expert copywriter and agronomist for an urban forestry circular economy eco-store in Udupi, Karnataka, India.
Generate high-converting, professional product details for the following eco-product:

Product Name: "${name || 'Municipal Organic Garden Product'}"
Category: "${category || 'Organic Compost'}"
Existing Pack/Unit Info (if any): "${unitSize || ''}"
Existing Weight (if any): "${weightValue || ''} ${weightUnit || ''}"

Return ONLY a raw, valid JSON object (no markdown, no \`\`\`json tags) with the exact structure:
{
  "description": "Engaging, professional 2-3 sentence product overview highlighting municipal recycling, sustainability, and quality",
  "usageInstructions": "Practical, step-by-step directions on how to apply or use this product (ratios, timing, application method)",
  "benefits": [
    "Benefit 1 (concise, high impact)",
    "Benefit 2",
    "Benefit 3",
    "Benefit 4"
  ],
  "suggestedUnitSize": "e.g. 500 g Pack, 5 kg Bag, 250 ml Bottle, 1 Sapling",
  "suggestedWeightValue": 500,
  "suggestedWeightUnit": "g",
  "suggestedPriceInr": 99,
  "suggestedEcoPoints": 40
}

Ensure:
- suggestedWeightUnit is one of: "kg", "g", "mg", "ton", "L", "ml", "pcs"
- suggestedWeightValue is a reasonable number matching the unit (e.g. 500 for g, 5 for kg, 250 for ml, 1 for pcs)
- Output valid JSON only.`;

  const models = [
    'google/gemini-2.0-flash-001',
    'google/gemini-flash-1.5',
    'meta-llama/llama-3.3-70b-instruct'
  ];

  for (const model of models) {
    try {
      console.log(`[AI Product Service] Querying model: ${model}...`);
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': 'http://localhost:5173',
          'X-Title': 'CanopyGuard Eco-Store',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.6,
          max_tokens: 700
        }),
        signal: AbortSignal.timeout(8000)
      });

      if (!response.ok) {
        console.warn(`[AI Product Service] Model ${model} returned status ${response.status}`);
        continue;
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content?.trim();
      if (!content) continue;

      // Extract JSON
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.description && parsed.usageInstructions && Array.isArray(parsed.benefits)) {
          return {
            description: parsed.description,
            usageInstructions: parsed.usageInstructions,
            benefits: parsed.benefits,
            suggestedUnitSize: parsed.suggestedUnitSize || fallback.suggestedUnitSize,
            suggestedWeightValue: Number(parsed.suggestedWeightValue) || fallback.suggestedWeightValue,
            suggestedWeightUnit: parsed.suggestedWeightUnit || fallback.suggestedWeightUnit,
            suggestedPriceInr: Number(parsed.suggestedPriceInr) || fallback.suggestedPriceInr,
            suggestedEcoPoints: Number(parsed.suggestedEcoPoints) || fallback.suggestedEcoPoints
          };
        }
      }
    } catch (err) {
      console.warn(`[AI Product Service] Error with model ${model}:`, err.message);
    }
  }

  console.log('[AI Product Service] Falling back to contextual generator.');
  return fallback;
}

module.exports = {
  generateProductDetails
};
