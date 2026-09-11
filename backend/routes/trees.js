const express = require('express');
const router = express.Router();
const Tree = require('../models/Tree');
const Adoption = require('../models/Adoption');
const TreeRegistration = require('../models/TreeRegistration');
const Notification = require('../models/Notification');

// @route   GET /api/trees
// @desc    Get all tree inventory items
// @access  Public
router.get('/', async (req, res) => {
  try {
    // Remove legacy non-Udupi trees
    await Tree.deleteMany({
      origin: { $not: /Udupi|Manipal|Ajjarkad|Malpe|KMC|MGM|Kaup|Brahmavar|Sooda|Barkur|Pajaka/i },
      notes: { $not: /Udupi|Manipal|Ajjarkad|Malpe|KMC|MGM|Kaup|Brahmavar|Sooda|Barkur|Pajaka/i }
    });

    let trees = await Tree.find().sort({ createdAt: -1 });

    // Check if we need to seed the Udupi trees
    if (trees.length === 0) {
      console.log('[DB] Seeding Udupi encyclopedia trees...');
      const defaultUdupiTrees = [
        {
          name: 'Heritage Banyan Tree',
          scientificName: 'Ficus benghalensis',
          family: 'Moraceae',
          origin: 'Central Ajjarkadu Park, Udupi',
          category: 'Sacred / Canopy Shade Tree',
          lifespan: '250+ years',
          height: '25 m',
          ageRange: '80-100 years',
          canopySpread: '35 m',
          description: 'A massive historic Banyan tree located near the Mahatma Gandhi District Stadium in Ajjarkadu Park. It serves as a cornerstone of the park’s biodiversity, offering massive shade and hosting nesting sites for numerous bird species.',
          climate: 'Tropical monsoonal',
          soilType: 'Alluvial and loamy soil',
          sunlight: 'Full Sun',
          growthRate: 'Slow to Moderate',
          leafType: 'Large, leathery, glossy green oval leaves',
          floweringSeason: 'Feb – May',
          fruitingSeason: 'Apr – Jul',
          carbonSequestration: 'Very High (estimated 12 tons CO2 annually)',
          notes: 'Located near the children’s play area in Ajjarkadu Park, Udupi. Regularly monitored for root health. Healthy aerial roots structure is developing well.',
          healthScore: 95,
          canopyCoverage: 98,
          waterRequirement: 'Low (Well established)',
          benefits: ['Substantial canopy cooling effect', 'Nesting habitat for over 15 bird species', 'Prevents soil erosion and maintains local humidity', 'Traditional and cultural significance'],
          diseases: ['Leaf spot', 'Root rot (minor)'],
          pests: ['Banyan thrips', 'Scale insects'],
          image: 'https://images.unsplash.com/photo-1596436889106-be35e843f974?auto=format&fit=crop&w=800&q=80',
          lat: 13.3412,
          lng: 74.7415,
          addedAt: '12 Jan 2026'
        },
        {
          name: 'Sanctuary Neem Tree',
          scientificName: 'Azadirachta indica',
          family: 'Meliaceae',
          origin: 'KMC Hospital Campus, Manipal, Udupi',
          category: 'Medicinal / Shade Tree',
          lifespan: '150-200 years',
          height: '18 m',
          ageRange: '25 years',
          canopySpread: '14 m',
          description: 'A mature Neem tree planted within the healing gardens of the KMC Hospital complex. Renowned for its antibacterial and air-purifying properties, it creates a serene, restorative space for patients and healthcare workers.',
          climate: 'Semi-arid to tropical wet-dry',
          soilType: 'Dry, stony, sandy or shallow soils',
          sunlight: 'Full Sun to Partial Shade',
          growthRate: 'Fast',
          leafType: 'Pinnate leaves with serrated leaflets',
          floweringSeason: 'Mar – May',
          fruitingSeason: 'Jun – Aug',
          carbonSequestration: 'High',
          notes: 'Located in the west courtyard of Kasturba Hospital (KMC), Manipal. Regularly pruned for utility clearance. Excellent health index.',
          healthScore: 92,
          canopyCoverage: 85,
          waterRequirement: 'Moderate to Low',
          benefits: ['Improves local air quality and purifies atmosphere', 'Natural insect repellent', 'Shedding leaves enrich soil organic matter', 'Shade reduces ambient building temperature'],
          diseases: ['Powdery mildew (seasonal)'],
          pests: ['Tea mosquito bug'],
          image: 'https://images.unsplash.com/photo-1600718374662-0483d2b9da44?auto=format&fit=crop&w=800&q=80',
          lat: 13.3538,
          lng: 74.7865,
          addedAt: '15 Feb 2026'
        },
        {
          name: 'Presidential Ashoka Border',
          scientificName: 'Polyalthia longifolia',
          family: 'Annonaceae',
          origin: 'Christian High School Campus, Udupi',
          category: 'Ornamental / Noise Barrier',
          lifespan: '60-80 years',
          height: '15 m',
          ageRange: '12 years',
          canopySpread: '4 m',
          description: 'Sleek, tall, and weeping Ashoka trees planted along the compound wall of the Christian High School. They form a thick green noise barrier that dampens street traffic sounds from the busy adjacent highway, facilitating a quiet learning environment.',
          climate: 'Warm tropical',
          soilType: 'Well-drained loam or clay-loam',
          sunlight: 'Full Sun',
          growthRate: 'Moderate to Fast',
          leafType: 'Narrow, lanceolate leaves with wavy margins',
          floweringSeason: 'Mar – May',
          fruitingSeason: 'Jul – Sep',
          carbonSequestration: 'Moderate',
          notes: 'Located along the western perimeter wall of Christian High School, Udupi. Trimmed regularly to maintain symmetrical column growth.',
          healthScore: 89,
          canopyCoverage: 70,
          waterRequirement: 'Medium',
          benefits: ['Acts as an effective noise and dust filter', 'Provides privacy and campus security decoration', 'Windbreak capability during monsoon seasons'],
          diseases: ['Leaf blight'],
          pests: ['Mealybugs'],
          image: 'https://images.unsplash.com/photo-1502082553048-f009c37129b9?auto=format&fit=crop&w=800&q=80',
          lat: 13.3375,
          lng: 74.7450,
          addedAt: '20 Mar 2026'
        },
        {
          name: 'Ajjarkad Orchard Mango',
          scientificName: 'Mangifera indica',
          family: 'Anacardiaceae',
          origin: 'Bhujanga Park Promenade, Udupi',
          category: 'Fruit / Canopy Shade Tree',
          lifespan: '100-150 years',
          height: '20 m',
          ageRange: '35 years',
          canopySpread: '18 m',
          description: 'An ancient Mango tree located near the walking tracks of Bhujanga Park, Ajjarkadu. During summers, it is loaded with local sweet mangoes and offers a cool canopy for morning walkers.',
          climate: 'Tropical humid',
          soilType: 'Rich, deep, well-drained loam',
          sunlight: 'Full Sun',
          growthRate: 'Moderate',
          leafType: 'Simple, alternate, leathery lanceolate leaves',
          floweringSeason: 'Jan – Mar',
          fruitingSeason: 'Apr – Jun',
          carbonSequestration: 'High',
          notes: 'Located near the south entrance of Bhujanga Park, Udupi. Fruit harvest managed by local municipal council.',
          healthScore: 94,
          canopyCoverage: 90,
          waterRequirement: 'Medium',
          benefits: ['Abundant seasonal fruit production for birds and visitors', 'Thick, cool shade canopy', 'Supports bees, butterflies and other pollinators'],
          diseases: ['Anthracnose (minor)'],
          pests: ['Mango hoppers'],
          image: 'https://images.unsplash.com/photo-1557800636-894a64c1696f?auto=format&fit=crop&w=800&q=80',
          lat: 13.3425,
          lng: 74.7430,
          addedAt: '05 Jan 2026'
        },
        {
          name: 'Scholastic Gulmohar',
          scientificName: 'Delonix regia',
          family: 'Fabaceae',
          origin: 'MGM College Quadrangle, Udupi',
          category: 'Flowering / Ornamental',
          lifespan: '50-60 years',
          height: '12 m',
          ageRange: '18 years',
          canopySpread: '15 m',
          description: 'Famous for its spectacular display of crimson and orange flowers in summer. Situated at the main quadrangle of MGM College, this iconic tree is a cultural landmark on campus and provides a shaded social area for students.',
          climate: 'Tropical dry/wet',
          soilType: 'Sandy, loamy or gravelly soils',
          sunlight: 'Full Sun',
          growthRate: 'Fast',
          leafType: 'Bipinnate, feathery light green leaves',
          floweringSeason: 'Apr – Jun',
          fruitingSeason: 'Sep – Dec (long pods)',
          carbonSequestration: 'Moderate',
          notes: 'Located in the central quadrangle of Mahatma Gandhi Memorial (MGM) College, Udupi. Requires branching support checks.',
          healthScore: 88,
          canopyCoverage: 80,
          waterRequirement: 'Medium to Low',
          benefits: ['Outstanding aesthetic and landscape decoration', 'Wide canopy shade during peak hot hours', 'Soil nitrogen fixing root bacteria'],
          diseases: ['Root rot (requires monitoring)'],
          pests: ['Wood borers'],
          image: 'https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?auto=format&fit=crop&w=800&q=80',
          lat: 13.3512,
          lng: 74.7600,
          addedAt: '18 Apr 2026'
        },
        {
          name: 'Clinical Bilva Tree',
          scientificName: 'Aegle marmelos',
          family: 'Rutaceae',
          origin: 'Adarsha Hospital Herbal Garden, Udupi',
          category: 'Medicinal / Sacred Tree',
          lifespan: '80-100 years',
          height: '10 m',
          ageRange: '8 years',
          canopySpread: '6 m',
          description: 'A young sacred Bael (Bilva) tree planted in the ayurvedic and rehabilitation garden of Adarsha Hospital. Highly valued for its therapeutic fruits, leaves, and bark in Indian traditional medicine.',
          climate: 'Subtropical to tropical dry',
          soilType: 'Clayey, rich, water-retaining soils',
          sunlight: 'Full Sun',
          growthRate: 'Slow',
          leafType: 'Trifoliate, aromatic green leaflets',
          floweringSeason: 'May – Jul',
          fruitingSeason: 'Nov – Mar',
          carbonSequestration: 'Moderate',
          notes: 'Located in the herbal garden path of Adarsha Hospital, Udupi. Maintained by hospital botanical team.',
          healthScore: 96,
          canopyCoverage: 60,
          waterRequirement: 'Medium',
          benefits: ['Leaves and fruit harvested for therapeutic infusions', 'Spiritual significance for patient mindfulness', 'High oxygen discharge during daytime'],
          diseases: ['Citrus canker (susceptible)'],
          pests: ['Lemon butterfly caterpillar'],
          image: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=800&q=80',
          lat: 13.3445,
          lng: 74.7485,
          addedAt: '03 Mar 2026'
        },
        {
          name: 'Academy Jackfruit',
          scientificName: 'Artocarpus heterophyllus',
          family: 'Moraceae',
          origin: 'St. Cecily School Grounds, Udupi',
          category: 'Fruit / Canopy Tree',
          lifespan: '100-120 years',
          height: '16 m',
          ageRange: '30 years',
          canopySpread: '12 m',
          description: 'A native Jackfruit tree standing tall near the school playground of St. Cecily’s. It bears heavy loads of jackfruits along its trunk every year, introducing children to nature and local flora.',
          climate: 'Humid tropical',
          soilType: 'Deep, rich, alluvial soils',
          sunlight: 'Full Sun to Partial Shade',
          growthRate: 'Moderate',
          leafType: 'Glossy, dark green, oval leathery leaves',
          floweringSeason: 'Dec – Mar',
          fruitingSeason: 'Apr – Jul',
          carbonSequestration: 'High',
          notes: 'Located near the assembly ground of St. Cecily’s School, Udupi. Heavy fruit fall protection nets are installed in harvesting season.',
          healthScore: 91,
          canopyCoverage: 88,
          waterRequirement: 'Medium',
          benefits: ['Highly nutritious state-fruit production', 'Strong thick evergreen foliage providing wind protection', 'Eco-education marker for students'],
          diseases: ['Fruit rot'],
          pests: ['Bud weevil', 'Shoot borer'],
          image: 'https://images.unsplash.com/photo-1590005354167-6da97870c913?auto=format&fit=crop&w=800&q=80',
          lat: 13.3435,
          lng: 74.7490,
          addedAt: '30 May 2026'
        },
        {
          name: 'Mahatma Gandhi Park Coconut Palm',
          scientificName: 'Cocos nucifera',
          family: 'Arecaceae',
          origin: 'Mahatma Gandhi Park, Ajjarkadu, Udupi',
          category: 'Coastal Canopy / Fruit Palm',
          lifespan: '80-100 years',
          height: '22 m',
          ageRange: '15 years',
          canopySpread: '6 m',
          description: 'A tall, iconic Coconut palm situated near the entrance of Mahatma Gandhi Park in Ajjarkadu, Udupi. A staple of coastal Karnataka\'s landscape, it provides fresh coconuts and represents the region\'s agricultural heritage.',
          climate: 'Tropical maritime, humid',
          soilType: 'Sandy, well-draining coastal loam',
          sunlight: 'Full Sun',
          growthRate: 'Moderate',
          leafType: 'Large, pinnate feathery fronds',
          floweringSeason: 'All year round',
          fruitingSeason: 'All year round',
          carbonSequestration: 'Moderate (about 250 kg CO2 annually)',
          notes: 'Located near the Mahatma Gandhi Park central promenade, Udupi. Regularly harvested for safety to prevent falling coconuts on walking paths.',
          healthScore: 93,
          canopyCoverage: 65,
          waterRequirement: 'Medium to High',
          benefits: ['Fresh coconut water and fruit', 'Foliage acts as windbreak', 'Excellent soil-binding roots', 'Aesthetic coastal landscape value'],
          diseases: ['Bud rot', 'Stem bleeding'],
          pests: ['Rhinoceros beetle', 'Red palm weevil'],
          image: 'https://images.unsplash.com/photo-1528183429752-a97d0bf99b5a?auto=format&fit=crop&w=800&q=80',
          lat: 13.3415,
          lng: 74.7425,
          addedAt: '14 Aug 2026'
        },
        {
          name: 'Ajjarkad Indian Almond',
          scientificName: 'Terminalia catappa',
          family: 'Combretaceae',
          origin: 'Ajjarkadu Park, Udupi',
          category: 'Canopy Shade Tree',
          lifespan: '80-100 years',
          height: '15 m',
          ageRange: '18 years',
          canopySpread: '12 m',
          description: 'A broad-leafed deciduous tree located in Ajjarkadu Park. Known for its distinct tiered branching structure and large leaves that turn red before shedding.',
          climate: 'Tropical wet-dry',
          soilType: 'Sandy, saline-tolerant loam',
          sunlight: 'Full Sun',
          growthRate: 'Fast',
          leafType: 'Large, obovate glossy green leaves',
          floweringSeason: 'Feb – May',
          fruitingSeason: 'Jun – Sep',
          carbonSequestration: 'High',
          notes: 'Located near the Ajjarkadu Park outer jogging path, Udupi. Branches monitored for weight distribution.',
          healthScore: 91,
          canopyCoverage: 85,
          waterRequirement: 'Medium',
          benefits: ['High shading capacity', 'Host for local silkworms', 'Traditional medicinal uses of leaves', 'Biodiversity support'],
          diseases: ['Leaf spot', 'Powdery mildew'],
          pests: ['Thrips', 'Leaf rollers'],
          image: 'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?auto=format&fit=crop&w=800&q=80',
          lat: 13.3418,
          lng: 74.7420,
          addedAt: '14 Aug 2026'
        },
        {
          name: 'Ajjarkad Golden Shower',
          scientificName: 'Cassia fistula',
          family: 'Fabaceae',
          origin: 'Ajjarkadu Park, Udupi',
          category: 'Flowering Ornamental',
          lifespan: '50-70 years',
          height: '12 m',
          ageRange: '10 years',
          canopySpread: '8 m',
          description: 'An ornamental flowering tree in Ajjarkadu Park that bursts into golden-yellow cascades of blossoms in late spring. The state flower of Kerala, highly celebrated in local culture.',
          climate: 'Tropical dry-humid',
          soilType: 'Well-drained loamy soil',
          sunlight: 'Full Sun',
          growthRate: 'Moderate',
          leafType: 'Pinnate leaves with ovate leaflets',
          floweringSeason: 'Mar – May',
          fruitingSeason: 'Aug – Nov',
          carbonSequestration: 'Moderate',
          notes: 'Located near the central open lawn of Ajjarkadu Park, Udupi. Beautiful flowering specimen in summer.',
          healthScore: 94,
          canopyCoverage: 75,
          waterRequirement: 'Low to Medium',
          benefits: ['Outstanding aesthetic and landscape appeal', 'Supports native butterflies and honeybees', 'Soil nitrogen fixation', 'Traditional therapeutic value'],
          diseases: ['Twig blight'],
          pests: ['Caterpillars', 'Aphids'],
          image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
          lat: 13.3405,
          lng: 74.7412,
          addedAt: '14 Aug 2026'
        },
        {
          name: 'Ajjarkad Kadamba Specimen',
          scientificName: 'Neolamarckia cadamba',
          family: 'Rubiaceae',
          origin: 'Ajjarkadu Park, Udupi',
          category: 'Sacred / Fast-Growing Shade',
          lifespan: '100-120 years',
          height: '18 m',
          ageRange: '14 years',
          canopySpread: '10 m',
          description: 'A legendary sacred tree in Ajjarkadu Park, celebrated in Indian literature and mythology. Features round, orange-gold, fragrant flower heads and broad evergreen leaves.',
          climate: 'Warm humid tropical',
          soilType: 'Alluvial, moist, deep soil',
          sunlight: 'Full Sun to Partial Shade',
          growthRate: 'Very Fast',
          leafType: 'Large, glossy dark green simple leaves',
          floweringSeason: 'Jun – Aug',
          fruitingSeason: 'Sep – Nov',
          carbonSequestration: 'High',
          notes: 'Located near the children\'s park area of Ajjarkadu, Udupi. Requires regular base mulching.',
          healthScore: 89,
          canopyCoverage: 80,
          waterRequirement: 'Medium to High',
          benefits: ['Cultural and spiritual value', 'Provides rapid cool shade cover', 'Fragrant flowers attract diverse pollinators', 'Leaves used in cattle fodder'],
          diseases: ['Leaf rust'],
          pests: ['Leaf defoliator caterpillar'],
          image: 'https://images.unsplash.com/photo-1502082553048-f009c37129b9?auto=format&fit=crop&w=800&q=80',
          lat: 13.3410,
          lng: 74.7432,
          addedAt: '14 Aug 2026'
        },
        {
          name: 'Thimmakka Park Tamarind',
          scientificName: 'Tamarindus indica',
          family: 'Fabaceae',
          origin: 'Salumarada Thimmakka Tree Park, Manipal, Udupi',
          category: 'Fruit / Long-lived Shade',
          lifespan: '200+ years',
          height: '20 m',
          ageRange: '45 years',
          canopySpread: '20 m',
          description: 'A massive, long-lived Tamarind tree standing inside the Thimmakka Tree Park. Renowned for its hard wood, evergreen foliage, and sour pod fruits used in regional cuisine.',
          climate: 'Semi-arid to humid tropical',
          soilType: 'Deep, loamy, drought-resistant soil',
          sunlight: 'Full Sun',
          growthRate: 'Slow',
          leafType: 'Pinnate leaves with small leaflets',
          floweringSeason: 'May – Jul',
          fruitingSeason: 'Dec – Mar',
          carbonSequestration: 'Very High',
          notes: 'Located in the heritage block of Salumarada Thimmakka Tree Park, Manipal, Udupi. Strong structure, storm-resistant.',
          healthScore: 96,
          canopyCoverage: 95,
          waterRequirement: 'Low',
          benefits: ['High culinary fruit production', 'Excellent windbreak and storm protection', 'Very high carbon storage capability', 'Deep shade reduces local ground heat'],
          diseases: ['Stem rot (monitored)'],
          pests: ['Tamarind seed borer'],
          image: 'https://images.unsplash.com/photo-1596436889106-be35e843f974?auto=format&fit=crop&w=800&q=80',
          lat: 13.3215,
          lng: 74.8050,
          addedAt: '14 Aug 2026'
        },
        {
          name: 'Thimmakka Park Arecanut Palm',
          scientificName: 'Areca catechu',
          family: 'Arecaceae',
          origin: 'Salumarada Thimmakka Tree Park, Manipal, Udupi',
          category: 'Commercial / Coastal Palm',
          lifespan: '60-80 years',
          height: '16 m',
          ageRange: '12 years',
          canopySpread: '3 m',
          description: 'A slender, tall Arecanut palm (betel nut) planted inside the coastal flora sector of the Thimmakka Tree Park. Typical of local agricultural homesteads in South Canara.',
          climate: 'Humid tropical coastal',
          soilType: 'Laterite and gravelly red soil',
          sunlight: 'Full Sun to Partial Shade',
          growthRate: 'Moderate',
          leafType: 'Feathery, crown shaft pinnate fronds',
          floweringSeason: 'Oct – Dec',
          fruitingSeason: 'Mar – Jun',
          carbonSequestration: 'Low',
          notes: 'Located near the traditional farming showcase area in Salumarada Thimmakka Tree Park, Manipal, Udupi.',
          healthScore: 92,
          canopyCoverage: 50,
          waterRequirement: 'High',
          benefits: ['Regional agricultural indicator', 'Slender design allows multi-tier park landscaping', 'Cultural betel nut harvest'],
          diseases: ['Koleroga (Fruit rot)'],
          pests: ['Pentatomid bug', 'Spider mites'],
          image: 'https://images.unsplash.com/photo-1473448912268-2022ce9509d8?auto=format&fit=crop&w=800&q=80',
          lat: 13.3223,
          lng: 74.8056,
          addedAt: '14 Aug 2026'
        },
        {
          name: 'Thimmakka Park Honge Specimen',
          scientificName: 'Millettia pinnata',
          family: 'Fabaceae',
          origin: 'Salumarada Thimmakka Tree Park, Manipal, Udupi',
          category: 'Bio-diesel / Shade Tree',
          lifespan: '80-100 years',
          height: '14 m',
          ageRange: '20 years',
          canopySpread: '12 m',
          description: 'Also known as Pongamia pinnata, this Honge tree features glossy green leaves and clusters of pinkish-white blossoms. Renowned for its oil-rich seeds, nitrogen-fixing roots, and dense shade canopy.',
          climate: 'Tropical monsoonal to arid',
          soilType: 'Clayey, sandy, or saline soils',
          sunlight: 'Full Sun',
          growthRate: 'Moderate to Fast',
          leafType: 'Imparipinnate glossy green leaves',
          floweringSeason: 'Apr – Jun',
          fruitingSeason: 'Nov – Jan',
          carbonSequestration: 'High',
          notes: 'Located near the entrance parking zone of Salumarada Thimmakka Tree Park, Manipal, Udupi. Seeds harvested for bio-diesel research.',
          healthScore: 95,
          canopyCoverage: 90,
          waterRequirement: 'Low to Medium',
          benefits: ['Nitrogen-fixing root systems enrich soil', 'Bio-diesel oil seed source', 'Excellent air-purifying qualities', 'Dense summer shade cover'],
          diseases: ['Rust fungus'],
          pests: ['Leaf miners'],
          image: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=800&q=80',
          lat: 13.3218,
          lng: 74.8048,
          addedAt: '14 Aug 2026'
        },
        {
          name: 'TMA Pai Sanctuary Peepal',
          scientificName: 'Ficus religiosa',
          family: 'Moraceae',
          origin: 'Dr. TMA Pai Hospital Campus, Udupi',
          category: 'Medicinal / Sacred Shade',
          lifespan: '150-200 years',
          height: '18 m',
          ageRange: '30 years',
          canopySpread: '16 m',
          description: 'A large Peepal tree standing inside the Dr. TMA Pai Hospital campus. Highly revered for its continuous oxygen release and calming presence, providing a peaceful resting shade for hospital patients and visitors.',
          climate: 'Tropical monsoon',
          soilType: 'Loamy, well-aerated soil',
          sunlight: 'Full Sun',
          growthRate: 'Moderate to Fast',
          leafType: 'Heart-shaped leaves with long tapering tips',
          floweringSeason: 'Apr – Jun',
          fruitingSeason: 'Jun – Aug',
          carbonSequestration: 'High',
          notes: 'Located adjacent to Dr. TMA Pai Hospital outpatient wing, Udupi. Branches trimmed for hospital facade protection.',
          healthScore: 92,
          canopyCoverage: 88,
          waterRequirement: 'Medium',
          benefits: ['Medicinal bark and leaf extracts', '24-hour oxygen release cycle', 'Wide cooling shade cover', 'Spiritual comfort for patients'],
          diseases: ['Leaf spot'],
          pests: ['Peepal leaf worm'],
          image: 'https://images.unsplash.com/photo-1596436889106-be35e843f974?auto=format&fit=crop&w=800&q=80',
          lat: 13.3440,
          lng: 74.7495,
          addedAt: '14 Aug 2026'
        },
        {
          name: 'St. Marys Scholastic Ashoka',
          scientificName: 'Polyalthia longifolia',
          family: 'Annonaceae',
          origin: 'St. Mary\'s School Campus, Kannarpady, Udupi',
          category: 'Ornamental / Noise Barrier',
          lifespan: '60-80 years',
          height: '14 m',
          ageRange: '10 years',
          canopySpread: '3 m',
          description: 'A cluster of tall columnar Ashoka trees planted along the perimeter of St. Mary\'s School campus. They form an elegant natural green curtain that filters highway dust and absorbs vehicular noise.',
          climate: 'Humid tropical',
          soilType: 'Alluvial sandy loam',
          sunlight: 'Full Sun',
          growthRate: 'Fast',
          leafType: 'Weeping, wavy-edged lanceolate leaves',
          floweringSeason: 'Feb – May',
          fruitingSeason: 'Jul – Sep',
          carbonSequestration: 'Moderate',
          notes: 'Located near the St. Mary\'s School playground, Udupi. Regularly watered by campus groundkeepers.',
          healthScore: 90,
          canopyCoverage: 70,
          waterRequirement: 'Medium',
          benefits: ['Effective noise buffer for school classrooms', 'Air filtration and dust capture', 'Visual border enhancement'],
          diseases: ['Leaf blight'],
          pests: ['Aphids', 'Mealybugs'],
          image: 'https://images.unsplash.com/photo-1502082553048-f009c37129b9?auto=format&fit=crop&w=800&q=80',
          lat: 13.3325,
          lng: 74.7580,
          addedAt: '14 Aug 2026'
        },
        {
          name: 'Ajjarkad Pride of India',
          scientificName: 'Lagerstroemia speciosa',
          family: 'Lythraceae',
          origin: 'Ajjarkadu Park, Udupi',
          category: 'Flowering Shade',
          lifespan: '60-80 years',
          height: '10 m',
          ageRange: '12 years',
          canopySpread: '7 m',
          description: 'A beautiful flowering tree near the jogging tracks of Ajjarkadu Park. Produces stunning mauve-purple blooms during summer, adding vibrant colors to the park landscape.',
          climate: 'Tropical wet',
          soilType: 'Rich loamy soil',
          sunlight: 'Full Sun',
          growthRate: 'Moderate',
          leafType: 'Oblong, glossy green leaves',
          floweringSeason: 'Apr – Jun',
          fruitingSeason: 'Aug – Oct',
          carbonSequestration: 'Moderate',
          notes: 'Located near the Ajjarkadu Park open gym zone, Udupi. Extremely attractive to local honeybees.',
          healthScore: 92,
          canopyCoverage: 70,
          waterRequirement: 'Medium',
          benefits: ['High aesthetic and ornamental value', 'Attracts native pollinators', 'Provides partial cool shade'],
          diseases: ['Powdery mildew'],
          pests: ['Aphids'],
          image: 'https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?auto=format&fit=crop&w=800&q=80',
          lat: 13.3414,
          lng: 74.7408,
          addedAt: '14 Aug 2026'
        },
        {
          name: 'Bhujanga Park Gulmohar',
          scientificName: 'Delonix regia',
          family: 'Fabaceae',
          origin: 'Bhujanga Park, Udupi',
          category: 'Flowering Ornamental',
          lifespan: '50-60 years',
          height: '12 m',
          ageRange: '15 years',
          canopySpread: '14 m',
          description: 'A grand Royal Poinciana (Gulmohar) situated on the high lawns of Bhujanga Park, Ajjarkadu. During the hot season, it forms a stunning canopy of crimson flowers.',
          climate: 'Tropical monsoon',
          soilType: 'Loamy to sandy soils',
          sunlight: 'Full Sun',
          growthRate: 'Fast',
          leafType: 'Bipinnate feathery leaflets',
          floweringSeason: 'Apr – Jun',
          fruitingSeason: 'Sep – Nov',
          carbonSequestration: 'Moderate to High',
          notes: 'Located near the central gazebo of Bhujanga Park, Udupi. Requires monitoring for hollow branches.',
          healthScore: 90,
          canopyCoverage: 82,
          waterRequirement: 'Medium to Low',
          benefits: ['Spectacular landscape decoration', 'Provides wide canopy shade', 'Nitrogen-fixing capabilities'],
          diseases: ['Root rot'],
          pests: ['Stem borer'],
          image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
          lat: 13.3421,
          lng: 74.7438,
          addedAt: '14 Aug 2026'
        },
        {
          name: 'KMC Campus Indian Tulip',
          scientificName: 'Thespesia populnea',
          family: 'Malvaceae',
          origin: 'KMC Hospital Perimeter, Manipal, Udupi',
          category: 'Coastal / Medicinal',
          lifespan: '80-100 years',
          height: '10 m',
          ageRange: '20 years',
          canopySpread: '8 m',
          description: 'A coastal Indian Tulip (Portia) tree located near the KMC Hospital perimeter. Renowned for its cup-shaped yellow flowers that change to purple, and its air-purifying foliage.',
          climate: 'Humid maritime',
          soilType: 'Saline-tolerant sandy loam',
          sunlight: 'Full Sun',
          growthRate: 'Moderate',
          leafType: 'Heart-shaped glossy dark green leaves',
          floweringSeason: 'All year round',
          fruitingSeason: 'All year round',
          carbonSequestration: 'High',
          notes: 'Located along the medical ward garden pathways of KMC, Manipal. Extremely high resistance to monsoonal winds.',
          healthScore: 94,
          canopyCoverage: 78,
          waterRequirement: 'Medium',
          benefits: ['Medicinal extracts from seeds and leaves', 'Airborne dust filtration', 'Soil-binding root system'],
          diseases: ['Leaf spot'],
          pests: ['Cotton stainer bug'],
          image: 'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?auto=format&fit=crop&w=800&q=80',
          lat: 13.3545,
          lng: 74.7870,
          addedAt: '14 Aug 2026'
        },
        {
          name: 'Kasturba Sanctuary Bael',
          scientificName: 'Aegle marmelos',
          family: 'Rutaceae',
          origin: 'Kasturba Hospital Campus, Manipal, Udupi',
          category: 'Medicinal / Sacred',
          lifespan: '80-100 years',
          height: '9 m',
          ageRange: '12 years',
          canopySpread: '5 m',
          description: 'A sacred Bael tree located in the tranquil therapeutic gardens of Kasturba Hospital. The fruit and leaves are highly valued in ayurvedic formulations for digestion.',
          climate: 'Subtropical to tropical wet',
          soilType: 'Rich clay-loam',
          sunlight: 'Full Sun',
          growthRate: 'Slow',
          leafType: 'Trifoliate aromatic leaflets',
          floweringSeason: 'May – Jun',
          fruitingSeason: 'Oct – Feb',
          carbonSequestration: 'Moderate',
          notes: 'Located near the patient wellness walking track at Kasturba Hospital, Manipal. Maintained by hospital herbalists.',
          healthScore: 95,
          canopyCoverage: 62,
          waterRequirement: 'Medium',
          benefits: ['Leaves used for traditional therapeutic recipes', 'High diurnal oxygen release rate', 'Calming spiritual presence'],
          diseases: ['Powdery mildew'],
          pests: ['Citrus butterfly larvae'],
          image: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=800&q=80',
          lat: 13.3530,
          lng: 74.7858,
          addedAt: '14 Aug 2026'
        },
        {
          name: 'MGM College Honge Border',
          scientificName: 'Millettia pinnata',
          family: 'Fabaceae',
          origin: 'MGM College Campus, Udupi',
          category: 'Shade / Nitrogen-fixing',
          lifespan: '80-100 years',
          height: '12 m',
          ageRange: '15 years',
          canopySpread: '10 m',
          description: 'A mature Honge tree planted along the compound wall of MGM College. Provides excellent shade for student vehicles and plays a role in fixing nitrogen in the soil.',
          climate: 'Tropical wet-dry',
          soilType: 'Poor sandy laterite soil',
          sunlight: 'Full Sun',
          growthRate: 'Moderate',
          leafType: 'Glossy green imparipinnate leaves',
          floweringSeason: 'Apr – Jun',
          fruitingSeason: 'Nov – Jan',
          carbonSequestration: 'High',
          notes: 'Located near the MGM College student parking zone, Udupi. Regularly pruned for structure.',
          healthScore: 91,
          canopyCoverage: 85,
          waterRequirement: 'Low to Medium',
          benefits: ['Enriches soil nutrients through nitrogen fixation', 'Dense cooling shade canopy', 'Reduces micro-climatic ambient temperatures'],
          diseases: ['Rust fungus'],
          pests: ['Leaf miner moths'],
          image: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=800&q=80',
          lat: 13.3520,
          lng: 74.7605,
          addedAt: '14 Aug 2026'
        },
        {
          name: 'Christian School Tamarind',
          scientificName: 'Tamarindus indica',
          family: 'Fabaceae',
          origin: 'Christian High School Campus, Udupi',
          category: 'Fruit / Shading Canopy',
          lifespan: '150-200 years',
          height: '18 m',
          ageRange: '40 years',
          canopySpread: '16 m',
          description: 'A historic Tamarind tree located near the old academic block of Christian High School, Udupi. Offers an excellent cooling canopy for outdoor student activities.',
          climate: 'Tropical monsoonal',
          soilType: 'Deep clay-loam',
          sunlight: 'Full Sun',
          growthRate: 'Slow',
          leafType: 'Pinnate leaves with dense small leaflets',
          floweringSeason: 'May – Jul',
          fruitingSeason: 'Jan – Mar',
          carbonSequestration: 'Very High',
          notes: 'Located next to the central assembly yard, Christian High School, Udupi. Structurally sound with regular canopy thinning.',
          healthScore: 93,
          canopyCoverage: 90,
          waterRequirement: 'Low',
          benefits: ['High carbon capture volume', 'Thick microclimate temperature cooling', 'Culinary fruit production'],
          diseases: ['Bacterial canker'],
          pests: ['Scale insects'],
          image: 'https://images.unsplash.com/photo-1596436889106-be35e843f974?auto=format&fit=crop&w=800&q=80',
          lat: 13.3380,
          lng: 74.7455,
          addedAt: '14 Aug 2026'
        },
        {
          name: 'Ajjarkad Indian Mahua',
          scientificName: 'Madhuca longifolia',
          family: 'Sapotaceae',
          origin: 'Ajjarkadu Park, Udupi',
          category: 'Canopy Shade / Medicinal',
          lifespan: '100-120 years',
          height: '16 m',
          ageRange: '22 years',
          canopySpread: '14 m',
          description: 'A large Mahua tree standing in the botanical corner of Ajjarkadu Park. Renowned for its sweet flowers which attract birds and its seeds which produce local oil.',
          climate: 'Warm tropical dry-wet',
          soilType: 'Sandy, rocky, or clayey soils',
          sunlight: 'Full Sun',
          growthRate: 'Moderate',
          leafType: 'Clustered oval leaves at branch ends',
          floweringSeason: 'Mar – May',
          fruitingSeason: 'Jun – Aug',
          carbonSequestration: 'High',
          notes: 'Located near the Ajjarkadu Park senior citizens corner, Udupi. Regularly checked for leaf spot infections.',
          healthScore: 92,
          canopyCoverage: 84,
          waterRequirement: 'Medium to Low',
          benefits: ['Edible flowers and oil-producing seeds', 'Hosts a wide variety of local birds', 'Dense broadleaf shade canopy'],
          diseases: ['Leaf spot'],
          pests: ['Bark-eating caterpillars'],
          image: 'https://images.unsplash.com/photo-1502082553048-f009c37129b9?auto=format&fit=crop&w=800&q=80',
          lat: 13.3418,
          lng: 74.7410,
          addedAt: '14 Aug 2026'
        },
        {
          name: 'Adarsha Hospital Golden Shower',
          scientificName: 'Cassia fistula',
          family: 'Fabaceae',
          origin: 'Adarsha Hospital Gardens, Udupi',
          category: 'Flowering Ornamental',
          lifespan: '50-70 years',
          height: '10 m',
          ageRange: '8 years',
          canopySpread: '6 m',
          description: 'A young Golden Shower (Amaltas) tree planted inside the therapeutic healing garden of Adarsha Hospital. Offers a cheerful display of golden blooms that aids patient well-being.',
          climate: 'Tropical wet-dry',
          soilType: 'Well-drained rich loam',
          sunlight: 'Full Sun',
          growthRate: 'Moderate',
          leafType: 'Compound pinnate leaves',
          floweringSeason: 'Mar – May',
          fruitingSeason: 'Jul – Oct',
          carbonSequestration: 'Moderate',
          notes: 'Located near the Adarsha Hospital physiotherapy recovery garden, Udupi.',
          healthScore: 96,
          canopyCoverage: 70,
          waterRequirement: 'Medium to Low',
          benefits: ['Visual therapeutic value for recovery', 'Supports beneficial insect populations', 'Soil enrichment properties'],
          diseases: ['Mild leaf spot'],
          pests: ['Leaf caterpillars'],
          image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
          lat: 13.3448,
          lng: 74.7480,
          addedAt: '14 Aug 2026'
        },
        {
          name: 'St Cecily Junior Jackfruit',
          scientificName: 'Artocarpus heterophyllus',
          family: 'Moraceae',
          origin: 'St. Cecily School Campus, Udupi',
          category: 'Fruit / Shade Tree',
          lifespan: '100-120 years',
          height: '12 m',
          ageRange: '15 years',
          canopySpread: '9 m',
          description: 'A junior Jackfruit tree planted near the school canteen of St. Cecily\'s. Bears large sweet jackfruits and provides a shady spot for students during recess.',
          climate: 'Humid tropical',
          soilType: 'Alluvial deep loamy soil',
          sunlight: 'Full Sun to Partial Shade',
          growthRate: 'Moderate',
          leafType: 'Dark green glossy leathery oval leaves',
          floweringSeason: 'Dec – Feb',
          fruitingSeason: 'Apr – Jun',
          carbonSequestration: 'Moderate to High',
          notes: 'Located near the St. Cecily School primary school section, Udupi. Fruit harvest supervised annually.',
          healthScore: 94,
          canopyCoverage: 80,
          waterRequirement: 'Medium',
          benefits: ["Nutritious local fruit supply", "Foliage provides good windbreak", "Active biodiversity marker on campus"],
          diseases: ['Soft rot'],
          pests: ['Shoot borers'],
          image: 'https://images.unsplash.com/photo-1590005354167-6da97870c913?auto=format&fit=crop&w=800&q=80',
          lat: 13.3438,
          lng: 74.7495,
          addedAt: '14 Aug 2026'
        },
        {
          name: 'MGM College Indian Almond',
          scientificName: 'Terminalia catappa',
          family: 'Combretaceae',
          origin: 'MGM College Campus, Udupi',
          category: 'Shade / Canopy Tree',
          lifespan: '80-100 years',
          height: '14 m',
          ageRange: '16 years',
          canopySpread: '10 m',
          description: 'A mature Indian Almond tree located at the MGM College campus perimeter. Features large leaves that provide rich shade and change color through seasons.',
          climate: 'Tropical maritime',
          soilType: 'Sandy or gravelly well-drained soils',
          sunlight: 'Full Sun',
          growthRate: 'Fast',
          leafType: 'Large obovate shiny leaves',
          floweringSeason: 'Feb – May',
          fruitingSeason: 'Jun – Sep',
          carbonSequestration: 'High',
          notes: 'Located near the MGM College bus shelter corridor, Udupi. Regularly watered during dry summers.',
          healthScore: 91,
          canopyCoverage: 83,
          waterRequirement: 'Medium',
          benefits: ['Dense canopy cooling effect', 'Visual ornamental seasonal colors', 'Supports campus wildlife nesting'],
          diseases: ['Powdery mildew'],
          pests: ['Caterpillars'],
          image: 'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?auto=format&fit=crop&w=800&q=80',
          lat: 13.3518,
          lng: 74.7612,
          addedAt: '14 Aug 2026'
        }
      ];
      await Tree.insertMany(defaultUdupiTrees);
      console.log('[DB] Seeding of Udupi trees completed.');
      trees = await Tree.find().sort({ createdAt: -1 });
    }

    res.json(trees);
  } catch (err) {
    console.error('Error fetching/seeding trees:', err);
    res.status(500).json({ msg: 'Server error fetching trees' });
  }
});

// @route   POST /api/trees
// @desc    Create a tree inventory item
// @access  Public (or Admin)
router.post('/', async (req, res) => {
  try {
    const { name, scientificName } = req.body;
    if (!name || !scientificName) {
      return res.status(400).json({ msg: 'Tree name and scientific name are required.' });
    }
    const newTree = new Tree(req.body);
    const savedTree = await newTree.save();
    console.log(`[DB] Tree created successfully in MongoDB: ${savedTree.name} (${savedTree._id})`);
    res.status(201).json(savedTree);
  } catch (err) {
    console.error('Error creating tree in DB:', err);
    res.status(400).json({ msg: err.message || 'Server error creating tree' });
  }
});

// @route   PUT /api/trees/:id
// @desc    Update a tree inventory item
// @access  Public (or Admin)
router.put('/:id', async (req, res) => {
  try {
    const updatedTree = await Tree.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    );
    if (!updatedTree) {
      return res.status(404).json({ msg: 'Tree not found' });
    }
    res.json(updatedTree);
  } catch (err) {
    res.status(400).json({ msg: err.message || 'Server error updating tree' });
  }
});

// Helper to calculate Haversine distance in meters
function getDistanceMeters(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 999999;
  const R = 6371e3;
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

// @route   POST /api/trees/scan
// @desc    CanopyLens AI Tree Identification & Inventory GPS Matcher
// @access  Public
router.post('/scan', async (req, res) => {
  try {
    const Adoption = require('../models/Adoption');
    const { imageUrl, lat, lng, hintSpecies, userId } = req.body;
    const userLat = parseFloat(lat) || 13.3409;
    const userLng = parseFloat(lng) || 74.7421;

    // 1. Fetch all registered trees from MongoDB
    const allTrees = await Tree.find();

    // 2. Find closest tree in MongoDB within 500 meters
    let closestTree = null;
    let minDistance = Infinity;

    allTrees.forEach(t => {
      if (t.lat && t.lng) {
        const dist = getDistanceMeters(userLat, userLng, t.lat, t.lng);
        if (dist < minDistance) {
          minDistance = dist;
          closestTree = t;
        }
      }
    });

    // 3. Species identification via hintSpecies, OpenRouter AI Vision, or dictionary fallback
    const speciesDictionary = [
      {
        commonName: 'Neem',
        scientificName: 'Azadirachta indica',
        confidence: 0.98,
        characteristics: ['Serrated compound leaves', 'Dense spreading canopy', 'Fissured dark grey bark'],
        benefits: ['Air purification', 'Natural pest repellent', 'High carbon sequestration'],
        careTip: 'Requires moderate watering during dry spells; highly resilient to urban monsoon climate.'
      },
      {
        commonName: 'Banyan Tree',
        scientificName: 'Ficus benghalensis',
        confidence: 0.98,
        characteristics: ['Massive aerial prop roots', 'Glossy leathery leaves', 'Expansive shade canopy'],
        benefits: ['Extremely high CO2 absorption', 'Bird nesting sanctuary', 'Prevents soil erosion'],
        careTip: 'Monitor aerial root growth and maintain clear soil perimeter.'
      },
      {
        commonName: 'Peepal',
        scientificName: 'Ficus religiosa',
        confidence: 0.98,
        characteristics: ['Heart-shaped leaves with tail tips', 'Light grey smooth bark', 'Dense foliage'],
        benefits: ['24-hour oxygen release', 'High shade index', 'Cultural & ecological value'],
        careTip: 'Ensure soil drainage around trunk base.'
      },
      {
        commonName: 'Teak',
        scientificName: 'Tectona grandis',
        confidence: 0.98,
        characteristics: ['Large rough opposite leaves', 'Tall straight trunk', 'Small fragrant white flowers'],
        benefits: ['Durable timber value', 'High canopy height', 'Soil stabilization'],
        careTip: 'Prune lower dead branches before monsoon.'
      },
      {
        commonName: 'Gulmohar',
        scientificName: 'Delonix regia',
        confidence: 0.98,
        characteristics: ['Feathery bipinnate leaves', 'Vibrant scarlet-orange flowers', 'Umbrella-shaped canopy'],
        benefits: ['Urban heat island reduction', 'Visual landscape aesthetic', 'Shade coverage'],
        careTip: 'Protect shallow root system from heavy construction.'
      },
      {
        commonName: 'Orchard Mango',
        scientificName: 'Mangifera indica',
        confidence: 0.98,
        characteristics: ['Lanceolate dark green leaves', 'Dense rounded canopy', 'Fragrant panicle flowers'],
        benefits: ['Fruit supply', 'High CO2 absorption', 'Shade density'],
        careTip: 'Water deeply during flowering and fruiting seasons.'
      },
      {
        commonName: 'Jackfruit',
        scientificName: 'Artocarpus heterophyllus',
        confidence: 0.98,
        characteristics: ['Dark green glossy leathery oval leaves', 'Heavy cauliflorous fruit trunks', 'Dense shade canopy'],
        benefits: ['Local nutritious fruit supply', 'Foliage windbreak', 'High carbon offset'],
        careTip: 'Supervise heavy fruit harvest annually to protect main branches.'
      },
      {
        commonName: 'Coconut Palm',
        scientificName: 'Cocos nucifera',
        confidence: 0.98,
        characteristics: ['Tall slender ringed trunk', 'Feathery pinnate fronds', 'Coastal maritime root system'],
        benefits: ['Coastal erosion control', 'Nutritious coconut water & oil', 'Windbreak barrier'],
        careTip: 'Maintain clear crown area and remove dry fronds during pre-monsoon.'
      },
      {
        commonName: 'Ashoka',
        scientificName: 'Polyalthia longifolia',
        confidence: 0.98,
        characteristics: ['Sleek columnar growth', 'Wavy-bordered lanceolate leaves', 'Dense noise barrier'],
        benefits: ['Acoustic noise dampening', 'Air pollution reduction', 'Aesthetic perimeter border'],
        careTip: 'Trim side branches to maintain upright architectural shape.'
      },
      {
        commonName: 'Honge',
        scientificName: 'Pongamia pinnata',
        confidence: 0.98,
        characteristics: ['Glossy compound leaves', 'Pinkish-white fragrant flowers', 'Biofuel seed pods'],
        benefits: ['Nitrogen fixing soil enrichment', 'Biodiesel seed oil source', 'Shade canopy'],
        careTip: 'Requires minimal maintenance once taproot reaches subterranean water.'
      }
    ];

    let identifiedSpecies = null;

    // Check if user explicitly selected a species hint
    if (hintSpecies && hintSpecies.trim() !== '') {
      const matchInDict = speciesDictionary.find(s => 
        s.commonName.toLowerCase().includes(hintSpecies.toLowerCase()) ||
        s.scientificName.toLowerCase().includes(hintSpecies.toLowerCase())
      );
      if (matchInDict) {
        identifiedSpecies = { ...matchInDict, confidence: 0.98 };
        console.log(`[AI Vision] Species selected by citizen: ${identifiedSpecies.commonName}`);
      }
    }

    // Try OpenRouter AI Vision API with location & regional species context
    if (process.env.OPENROUTER_API_KEY && imageUrl) {
      const visionModels = ['openai/gpt-4o-mini', 'google/gemini-flash-1.5', 'meta-llama/llama-3.2-11b-vision-instruct'];

      for (const modelName of visionModels) {
        if (identifiedSpecies) break;
        try {
          console.log(`[AI Vision] Calling OpenRouter vision model (${modelName})...`);
          const aiRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
              'HTTP-Referer': 'http://localhost:5173',
              'X-Title': 'CanopyGuard',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: modelName,
              messages: [
                {
                  role: 'user',
                  content: [
                    {
                      type: 'text',
                      text: `You are CanopyLens AI, an urban tree classifier for the Udupi region, Karnataka, India.
User Coordinates: (${userLat.toFixed(4)}, ${userLng.toFixed(4)}).
Common local species in this region: Neem (Azadirachta indica), Banyan Tree (Ficus benghalensis), Peepal (Ficus religiosa), Teak (Tectona grandis), Gulmohar (Delonix regia), Orchard Mango (Mangifera indica), Jackfruit (Artocarpus heterophyllus), Coconut Palm (Cocos nucifera), Ashoka (Polyalthia longifolia), Honge (Pongamia pinnata), Casuarina, Tamarind.

Analyze this tree image carefully. Respond ONLY with a valid raw JSON object (no markdown formatting, no \`\`\`json tags) with keys:
commonName (string, e.g. "Neem"),
scientificName (string, e.g. "Azadirachta indica"),
confidence (number between 0.85 and 0.98),
characteristics (array of 3 distinct visual feature strings),
benefits (array of 3 ecological benefit strings),
careTip (string, 1 actionable care sentence).`
                    },
                    {
                      type: 'image_url',
                      image_url: { url: imageUrl }
                    }
                  ]
                }
              ]
            })
          });

          if (aiRes.ok) {
            const aiData = await aiRes.json();
            const replyText = aiData?.choices?.[0]?.message?.content || '';
            const cleanedText = replyText.replace(/```json/g, '').replace(/```/g, '').trim();
            const parsedJSON = JSON.parse(cleanedText);
            if (parsedJSON && parsedJSON.commonName) {
              identifiedSpecies = parsedJSON;
              console.log(`[AI Vision] OpenRouter (${modelName}) successfully identified:`, parsedJSON.commonName);
            }
          }
        } catch (aiErr) {
          console.warn(`[AI Vision] Model ${modelName} error:`, aiErr.message);
        }
      }
    }

    if (!identifiedSpecies) {
      if (closestTree && minDistance <= 250) {
        const matched = speciesDictionary.find(s => 
          closestTree.name.toLowerCase().includes(s.commonName.toLowerCase()) || 
          closestTree.scientificName.toLowerCase().includes(s.scientificName.toLowerCase())
        );
        if (matched) {
          identifiedSpecies = { ...matched, confidence: 0.95 };
        } else {
          identifiedSpecies = {
            commonName: closestTree.name,
            scientificName: closestTree.scientificName || 'Ficus sp.',
            confidence: 0.92,
            characteristics: ['Dense foliage', 'Sturdy urban trunk', 'Mature canopy spread'],
            benefits: ['Air cooling', 'CO2 absorption', 'Urban shade'],
            careTip: 'Regular watering and soil aerating recommended.'
          };
        }
      } else {
        const randomIndex = Math.floor(Math.abs(Math.sin(userLat * userLng) * speciesDictionary.length));
        identifiedSpecies = speciesDictionary[randomIndex % speciesDictionary.length];
      }
    }

    // 4. Species-Aware GIS Inventory Matching
    let matchedInventoryTree = null;
    let matchedDistance = Infinity;

    if (identifiedSpecies && identifiedSpecies.commonName) {
      const targetCommon = identifiedSpecies.commonName.toLowerCase();
      const targetSci = (identifiedSpecies.scientificName || '').toLowerCase();
      const keyWord = targetCommon.split(' ')[0]; // e.g. "Mango", "Neem", "Banyan", "Peepal"

      allTrees.forEach(t => {
        if (t.lat && t.lng) {
          const tName = (t.name || '').toLowerCase();
          const tSci = (t.scientificName || '').toLowerCase();

          const isSpeciesMatch = 
            tName.includes(targetCommon) || targetCommon.includes(tName) ||
            tName.includes(keyWord) ||
            (targetSci && (tSci.includes(targetSci) || targetSci.includes(tSci)));

          if (isSpeciesMatch) {
            const dist = getDistanceMeters(userLat, userLng, t.lat, t.lng);
            if (dist <= 500 && dist < matchedDistance) {
              matchedDistance = dist;
              matchedInventoryTree = t;
            }
          }
        }
      });
    }

    // Fallback: If no species match found, check if there is an exact tree at the spot (within 15m)
    if (!matchedInventoryTree && closestTree && minDistance <= 15) {
      matchedInventoryTree = closestTree;
      matchedDistance = minDistance;
    }

    // 5. Check if matched tree is adopted in MongoDB Adoption collection
    let adoptionInfo = null;
    let isAdopted = false;
    let isAdoptedByCurrentUser = false;

    if (matchedInventoryTree) {
      const activeAdoption = await Adoption.findOne({
        treeId: matchedInventoryTree._id.toString(),
        status: 'Active'
      });

      if (!activeAdoption) {
        const nameAdoption = await Adoption.findOne({
          treeName: matchedInventoryTree.name,
          status: 'Active'
        });
        if (nameAdoption) {
          isAdopted = true;
          adoptionInfo = nameAdoption;
        }
      } else {
        isAdopted = true;
        adoptionInfo = activeAdoption;
      }

      if (adoptionInfo && userId && (adoptionInfo.userId == userId || adoptionInfo.userId === userId)) {
        isAdoptedByCurrentUser = true;
      }
    }

    const matchedTreeData = matchedInventoryTree ? {
      _id: matchedInventoryTree._id,
      name: matchedInventoryTree.name,
      scientificName: matchedInventoryTree.scientificName,
      lat: matchedInventoryTree.lat,
      lng: matchedInventoryTree.lng,
      healthScore: matchedInventoryTree.healthScore || 90,
      image: matchedInventoryTree.image,
      category: matchedInventoryTree.category,
      origin: matchedInventoryTree.origin,
      distanceMeters: Math.round(matchedDistance),
      isRegistered: true,
      isAdopted: isAdopted,
      isAdoptedByCurrentUser: isAdoptedByCurrentUser,
      guardianName: adoptionInfo ? (isAdoptedByCurrentUser ? 'You' : (adoptionInfo.userName || 'Community Guardian')) : null,
      adoptedAt: adoptionInfo ? adoptionInfo.adoptedAt : null,
      lastCareDate: adoptionInfo ? adoptionInfo.lastCareDate : null,
      careStreak: adoptionInfo ? adoptionInfo.careStreak : null
    } : null;

    res.json({
      success: true,
      identification: identifiedSpecies,
      matchedTree: matchedTreeData,
      scannedCoords: { lat: userLat, lng: userLng },
      scanId: `SCAN-${Date.now().toString().slice(-6)}`
    });

  } catch (err) {
    console.error('Error in /api/trees/scan:', err);
    res.status(500).json({ msg: 'Server error processing tree scan' });
  }
});

// @route   DELETE /api/trees/:id
// @desc    Delete a tree inventory item
// @access  Public (or Admin)
router.delete('/:id', async (req, res) => {
  try {
    const tree = await Tree.findById(req.params.id);
    if (!tree) {
      return res.status(404).json({ msg: 'Tree not found' });
    }
    await Tree.findByIdAndDelete(req.params.id);
    res.json({ msg: 'Tree deleted successfully' });
  } catch (err) {
    res.status(500).json({ msg: 'Server error deleting tree' });
  }
});

// @route   POST /api/trees/register-proposal
// @desc    Citizen submits a new tree registration proposal (image, location, name, GPS)
// @access  Public
router.post('/register-proposal', async (req, res) => {
  try {
    const {
      name,
      scientificName,
      image,
      lat,
      lng,
      locationText,
      submittedBy,
      submittedByEmail,
      submittedByUserId,
      notes
    } = req.body;

    if (!name) {
      return res.status(400).json({ msg: 'Tree name is required.' });
    }

    const parsedLat = (lat !== undefined && !isNaN(Number(lat))) ? Number(lat) : 13.3412;
    const parsedLng = (lng !== undefined && !isNaN(Number(lng))) ? Number(lng) : 74.7415;

    let validImg = image;
    if (!validImg || typeof validImg !== 'string' || validImg.startsWith('blob:')) {
      validImg = 'https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?auto=format&fit=crop&w=800&q=80';
    }

    const proposal = new TreeRegistration({
      name: String(name).trim(),
      scientificName: String(scientificName || name).trim(),
      image: validImg,
      lat: parsedLat,
      lng: parsedLng,
      locationText: locationText ? String(locationText).trim() : 'Udupi Region',
      submittedBy: submittedBy ? String(submittedBy).trim() : 'Citizen User',
      submittedByEmail: submittedByEmail ? String(submittedByEmail).trim() : '',
      submittedByUserId: submittedByUserId ? String(submittedByUserId).trim() : null,
      notes: notes ? String(notes).trim() : 'Submitted by citizen via CanopyLens AI',
      status: 'Pending'
    });

    await proposal.save();

    // Create notification for Admin & Official
    try {
      await Notification.create({
        targetRole: 'Admin',
        type: 'complaint_submitted',
        title: '🌳 New Tree Registration Request',
        message: `Citizen ${submittedBy || 'A citizen'} submitted a new tree (${name}) at ${locationText || 'Udupi'} for verification.`,
        relatedId: proposal._id.toString()
      });
    } catch (notifErr) {
      console.warn('Could not create notification:', notifErr.message);
    }

    res.status(201).json({
      success: true,
      proposal,
      msg: 'Tree registration proposal submitted successfully! Sent to Admin for verification.'
    });
  } catch (err) {
    console.error('Error submitting tree registration proposal:', err.message, err.stack);
    res.status(500).json({ msg: err.message || 'Server error submitting tree proposal' });
  }
});

// @route   GET /api/trees/register-proposals
// @desc    Get all tree registration proposals (Admin/Official review)
// @access  Public (or Admin)
router.get('/register-proposals', async (req, res) => {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};
    const proposals = await TreeRegistration.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, count: proposals.length, proposals });
  } catch (err) {
    console.error('Error fetching tree proposals:', err);
    res.status(500).json({ msg: 'Server error fetching tree proposals' });
  }
});

// @route   PUT /api/trees/register-proposals/:id
// @desc    Admin updates details of a tree registration proposal
// @access  Public (or Admin)
router.put('/register-proposals/:id', async (req, res) => {
  try {
    const { name, scientificName, locationText, lat, lng, notes } = req.body;
    const proposal = await TreeRegistration.findById(req.params.id);
    if (!proposal) {
      return res.status(404).json({ msg: 'Tree proposal not found' });
    }

    if (name) proposal.name = name.trim();
    if (scientificName) proposal.scientificName = scientificName.trim();
    if (locationText) proposal.locationText = locationText.trim();
    if (lat !== undefined && lat !== '') proposal.lat = Number(lat);
    if (lng !== undefined && lng !== '') proposal.lng = Number(lng);
    if (notes !== undefined) proposal.notes = notes.trim();

    await proposal.save();

    res.json({
      success: true,
      proposal,
      msg: 'Proposal details updated successfully.'
    });
  } catch (err) {
    console.error('Error updating tree proposal:', err);
    res.status(500).json({ msg: 'Server error updating proposal' });
  }
});

// @route   PUT /api/trees/register-proposals/:id/approve
// @desc    Admin approves tree proposal -> Creates official Tree entry in DB (supports edited body overrides)
// @access  Public (or Admin)
router.put('/register-proposals/:id/approve', async (req, res) => {
  try {
    const proposal = await TreeRegistration.findById(req.params.id);
    if (!proposal) {
      return res.status(404).json({ msg: 'Tree proposal not found' });
    }

    // Apply any inline overrides sent by Admin during verification
    const { name, scientificName, locationText, lat, lng, notes } = req.body || {};
    if (name) proposal.name = name.trim();
    if (scientificName) proposal.scientificName = scientificName.trim();
    if (locationText) proposal.locationText = locationText.trim();
    if (lat !== undefined && lat !== '') proposal.lat = Number(lat);
    if (lng !== undefined && lng !== '') proposal.lng = Number(lng);
    if (notes !== undefined) proposal.notes = notes.trim();

    proposal.status = 'Approved';
    proposal.approvedAt = new Date();
    await proposal.save();

    // Create official Tree entry in MongoDB
    const newTree = new Tree({
      name: proposal.name,
      scientificName: proposal.scientificName,
      category: 'Citizen Registered Tree',
      origin: proposal.locationText,
      image: proposal.image,
      lat: proposal.lat,
      lng: proposal.lng,
      notes: proposal.notes || `Discovered and registered by citizen ${proposal.submittedBy}`,
      healthScore: proposal.healthScore || 92,
      canopyCoverage: 85,
      addedAt: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    });

    await newTree.save();


    // Send confirmation notification to Citizen
    if (proposal.submittedByUserId) {
      try {
        await Notification.create({
          targetUserId: proposal.submittedByUserId,
          type: 'status_updated',
          title: '🎉 Tree Registration Approved!',
          message: `Your tree submission '${proposal.name}' at ${proposal.locationText} has been verified by the Admin and added to the official GIS map inventory! +100 Eco-Points awarded.`,
          relatedId: newTree._id.toString()
        });
      } catch (e) {
        console.warn('Notification send failed:', e.message);
      }
    }

    res.json({
      success: true,
      tree: newTree,
      proposal,
      msg: `Tree '${proposal.name}' verified and added to official inventory successfully!`
    });
  } catch (err) {
    console.error('Error approving tree proposal:', err);
    res.status(500).json({ msg: 'Server error approving tree proposal' });
  }
});

// @route   PUT /api/trees/register-proposals/:id/reject
// @desc    Admin rejects tree registration proposal
// @access  Public (or Admin)
router.put('/register-proposals/:id/reject', async (req, res) => {
  try {
    const { reason } = req.body;
    const proposal = await TreeRegistration.findById(req.params.id);
    if (!proposal) {
      return res.status(404).json({ msg: 'Tree proposal not found' });
    }

    proposal.status = 'Rejected';
    proposal.rejectionReason = reason || 'Verification failed / duplicate request';
    proposal.rejectedAt = new Date();
    await proposal.save();

    // Send notification to Citizen
    if (proposal.submittedByUserId) {
      try {
        await Notification.create({
          targetUserId: proposal.submittedByUserId,
          type: 'status_updated',
          title: '❌ Tree Registration Request Update',
          message: `Your tree proposal '${proposal.name}' was reviewed: ${proposal.rejectionReason}.`,
          relatedId: proposal._id.toString()
        });
      } catch (e) {
        console.warn('Notification send failed:', e.message);
      }
    }

    res.json({
      success: true,
      proposal,
      msg: 'Tree proposal rejected.'
    });
  } catch (err) {
    console.error('Error rejecting tree proposal:', err);
    res.status(500).json({ msg: 'Server error rejecting proposal' });
  }
});

module.exports = router;

