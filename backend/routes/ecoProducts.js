const express = require('express');
const router = express.Router();
const cloudinary = require('cloudinary').v2;
const EcoProduct = require('../models/EcoProduct');

// Seed sample products if empty
const seedSampleProducts = async () => {
  const count = await EcoProduct.countDocuments();
  if (count === 0) {
    const products = [
      {
        name: 'CanopyGuard Certified Organic Compost (5kg)',
        sku: 'CMP-5KG-ORG',
        category: 'Organic Compost',
        description: 'Matured, aerated organic compost processed from pruned municipal canopy trees. Enriched with native beneficial soil microbes. Zero chemicals.',
        unitSize: '5 kg Bag',
        weightKg: 5,
        priceInr: 99,
        priceEcoPoints: 40,
        allowEcoPointsRedemption: true,
        stockQuantity: 120,
        image: 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=600&auto=format&fit=crop&q=80',
        npkRatio: '2.5 : 1.4 : 1.9',
        organicMatterPercent: 68,
        sourceFacility: 'Ajjarkadu Municipal Biomass Processing Center',
        usageInstructions: 'Mix 1 part organic compost with 3 parts garden soil for planting pots or spread 2 inches around garden root zones.',
        benefits: ['100% Recycled Municipal Tree Biomass', 'Boosts Soil Moisture Retention by 40%', 'Rich in Humic Acid and Micronutrients'],
        ratingsAvg: 4.9,
        ratingsCount: 32
      },
      {
        name: 'CanopyGuard Certified Organic Compost (10kg Value Pack)',
        sku: 'CMP-10KG-ORG',
        category: 'Organic Compost',
        description: 'Large value pack of fine-screened organic compost for home gardens and terrace vegetable farming.',
        unitSize: '10 kg Bag',
        weightKg: 10,
        priceInr: 180,
        priceEcoPoints: 70,
        allowEcoPointsRedemption: true,
        stockQuantity: 65,
        image: 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=600&auto=format&fit=crop&q=80',
        npkRatio: '2.5 : 1.4 : 1.9',
        organicMatterPercent: 68,
        sourceFacility: 'Ajjarkadu Municipal Biomass Processing Center',
        usageInstructions: 'Apply 500g per flowering shrub or fruit tree every 3 weeks.',
        benefits: ['Optimal C:N Ratio (18:1)', 'Weed-Seed Free', 'Supports Earthworm Population'],
        ratingsAvg: 4.8,
        ratingsCount: 19
      },
      {
        name: 'Chipped Tree Bark & Woodchip Mulch (5kg)',
        sku: 'MLC-5KG-NAT',
        category: 'Bio-Mulch & Woodchips',
        description: 'Natural decorative woodchip mulch produced from seasoned tree branch chipping. Suppresses weed growth and conserves garden moisture.',
        unitSize: '5 kg Bag',
        weightKg: 5,
        priceInr: 79,
        priceEcoPoints: 30,
        allowEcoPointsRedemption: true,
        stockQuantity: 80,
        image: 'https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?w=600&auto=format&fit=crop&q=80',
        sourceFacility: 'Korangrapady Biomass Facility',
        usageInstructions: 'Spread a 2 to 3 inch layer around tree basins, walkways, and shrub beds.',
        benefits: ['Cools Root Zone Temperatures', 'Prevents Soil Erosion', 'Natural Cedar/Neem Aroma'],
        ratingsAvg: 4.7,
        ratingsCount: 14
      },
      {
        name: 'Activated Bio-Char Soil Rejuvenator (2kg)',
        sku: 'BCH-2KG-ACT',
        category: 'Bio-Char',
        description: 'High-porosity pyrolyzed bio-char inoculated with liquid bio-fertilizer. Stores nutrients and carbon in soil for decades.',
        unitSize: '2 kg Bag',
        weightKg: 2,
        priceInr: 120,
        priceEcoPoints: 50,
        allowEcoPointsRedemption: true,
        stockQuantity: 45,
        image: 'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?w=600&auto=format&fit=crop&q=80',
        sourceFacility: 'Ajjarkadu Biomass Pyrolysis Unit',
        usageInstructions: 'Incorporate 5-10% into potting mix or apply around established trees.',
        benefits: ['Permanent Carbon Sequestration', 'Supercharged Cation Exchange', 'Reduces Watering Need by 50%'],
        ratingsAvg: 5.0,
        ratingsCount: 11
      },
      {
        name: 'Native Neem (Azadirachta indica) Sapling (Potted)',
        sku: 'SPL-NEEM-01',
        category: 'Native Saplings',
        description: 'Healthy 1.5ft medicinal neem sapling grown in municipal nursery using 100% recycled canopy compost.',
        unitSize: '1 Potted Sapling',
        weightKg: 3,
        priceInr: 60,
        priceEcoPoints: 25,
        allowEcoPointsRedemption: true,
        stockQuantity: 90,
        image: 'https://images.unsplash.com/photo-1603569283847-aa295f0d016a?w=600&auto=format&fit=crop&q=80',
        sourceFacility: 'Udupi Social Forestry Nursery',
        usageInstructions: 'Plant in open sunlight with 15x15 ft spacing. Water twice weekly.',
        benefits: ['High Air Purification Index', 'Natural Insect Repellent', 'Thrives in Coastal Karnataka Climate'],
        ratingsAvg: 4.9,
        ratingsCount: 27
      }
    ];
    await EcoProduct.insertMany(products);
  }
};
seedSampleProducts().catch(err => console.warn('EcoProduct seed notice:', err.message));

// ── GET /api/eco-products
router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.category && req.query.category !== 'All Products') filter.category = req.query.category;
    if (req.query.available === 'true') filter.isAvailable = true;
    const products = await EcoProduct.find(filter).sort({ createdAt: -1 });
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/eco-products/:id
router.get('/:id', async (req, res) => {
  try {
    const product = await EcoProduct.findById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/eco-products (Add product by Processing Manager / Admin)
router.post('/', async (req, res) => {
  try {
    const { name, category, description, unitSize, weightKg, priceInr, priceEcoPoints, stockQuantity, imageBase64, npkRatio, usageInstructions, benefits } = req.body;
    let imageUrl = 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=600&auto=format&fit=crop&q=80';

    if (imageBase64 && imageBase64.startsWith('data:image')) {
      try {
        const uploadRes = await cloudinary.uploader.upload(imageBase64, {
          folder: 'treecanopy/eco-store',
          resource_type: 'image'
        });
        imageUrl = uploadRes.secure_url;
      } catch (uploadErr) {
        console.warn('Product image upload warning:', uploadErr.message);
      }
    }

    const count = await EcoProduct.countDocuments();
    const sku = `ECO-${category ? category.slice(0, 3).toUpperCase() : 'PRD'}-${String(count + 1).padStart(3, '0')}`;

    const product = new EcoProduct({
      name,
      sku,
      category: category || 'Organic Compost',
      description: description || 'Municipal recycled tree biomass organic product.',
      unitSize: unitSize || '5 kg Bag',
      weightKg: Number(weightKg || 5),
      priceInr: Number(priceInr || 99),
      priceEcoPoints: Number(priceEcoPoints || 40),
      stockQuantity: Number(stockQuantity || 50),
      image: imageUrl,
      npkRatio: npkRatio || '2.4 : 1.2 : 1.8',
      usageInstructions: usageInstructions || '',
      benefits: Array.isArray(benefits) ? benefits : (benefits ? [benefits] : ['100% Organic & Municipal Recycled'])
    });

    await product.save();
    res.status(201).json({ success: true, product });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /api/eco-products/:id (Update product — handles imageBase64 Cloudinary upload)
router.put('/:id', async (req, res) => {
  try {
    const updates = { ...req.body };
    // Handle image upload if a base64 string is provided
    if (updates.imageBase64 && updates.imageBase64.startsWith('data:image')) {
      try {
        const uploadRes = await cloudinary.uploader.upload(updates.imageBase64, {
          folder: 'treecanopy/eco-store',
          resource_type: 'image'
        });
        updates.image = uploadRes.secure_url;
      } catch (uploadErr) {
        console.warn('Product image update upload warning:', uploadErr.message);
      }
      delete updates.imageBase64;
    }
    const product = await EcoProduct.findByIdAndUpdate(req.params.id, updates, { returnDocument: 'after' });
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json({ success: true, product });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/eco-products/:id
router.delete('/:id', async (req, res) => {
  try {
    await EcoProduct.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

