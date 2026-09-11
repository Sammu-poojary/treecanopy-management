require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;

// Check Cloudinary environment variables
if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
  console.error('❌ Missing Cloudinary environment variables in .env');
  process.exit(1);
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadDir = path.join(__dirname, '..', 'uploads');

async function runSync() {
  console.log('🚀 Starting Automated Cloudinary Migration for Static Images...');
  
  if (!fs.existsSync(uploadDir)) {
    console.log('No uploads directory found.');
    return;
  }

  const files = fs.readdirSync(uploadDir).filter(f => /\.(png|jpg|jpeg|webp)$/i.test(f));
  console.log(`📁 Found ${files.length} images in backend/uploads to migrate...`);

  // Map to store filename -> Cloudinary secure_url
  const urlMap = {};

  for (let i = 0; i < files.length; i++) {
    const filename = files[i];
    const filePath = path.join(uploadDir, filename);

    try {
      // Use filename (without ext) as public_id for easy identification
      const publicId = path.parse(filename).name;
      const result = await cloudinary.uploader.upload(filePath, {
        folder: 'treecanopy_uploads',
        public_id: publicId,
        overwrite: false, // Don't re-upload if already exists
      });

      urlMap[filename] = result.secure_url;
      console.log(`[${i + 1}/${files.length}] Uploaded ${filename} ➔ ${result.secure_url}`);
    } catch (err) {
      console.error(`❌ Failed to upload ${filename}:`, err.message);
    }
  }

  // Connect to MongoDB and update old database image URLs
  if (process.env.MONGODB_URI) {
    console.log('\n🔄 Connecting to MongoDB to update legacy database image references...');
    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection.db;

    const collections = await db.listCollections().toArray();
    for (const colInfo of collections) {
      const colName = colInfo.name;
      const col = db.collection(colName);
      const docs = await col.find({}).toArray();

      for (const doc of docs) {
        let updated = false;

        // Recursive helper to scan and update any field containing /uploads/
        const replaceUploads = (obj) => {
          if (!obj || typeof obj !== 'object') return;
          for (const key of Object.keys(obj)) {
            if (typeof obj[key] === 'string' && obj[key].includes('/uploads/')) {
              const basename = path.basename(obj[key]);
              if (urlMap[basename]) {
                obj[key] = urlMap[basename];
                updated = true;
              }
            } else if (typeof obj[key] === 'object') {
              replaceUploads(obj[key]);
            }
          }
        };

        replaceUploads(doc);

        if (updated) {
          await col.replaceOne({ _id: doc._id }, doc);
          console.log(`  ✓ Updated references in collection '${colName}' (doc _id: ${doc._id})`);
        }
      }
    }

    console.log('\n✨ DB migration complete! Closing database connection.');
    await mongoose.disconnect();
  }

  // Save the URL mapping to backend/uploads_map.json for fallback auto-routing
  const mapPath = path.join(__dirname, '..', 'uploads_map.json');
  fs.writeFileSync(mapPath, JSON.stringify(urlMap, null, 2));
  console.log(`💾 Saved Cloudinary URL mapping table to ${mapPath}`);
  console.log('🎉 Migration completed successfully!');
}

runSync().catch(err => {
  console.error('Fatal sync error:', err);
  process.exit(1);
});
