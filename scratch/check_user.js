const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../backend/.env') });

const User = require('../../backend/models/User');

async function checkUser() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/treecanopy');
    console.log('Connected to MongoDB');
    
    const user = await User.findOne({ email: 'neelanjanv08@gmail.com' });
    if (!user) {
      console.log('User neelanjanv08@gmail.com NOT FOUND');
    } else {
      console.log('User found:');
      console.log('ID:', user._id);
      console.log('Name:', user.name);
      console.log('Email:', user.email);
      console.log('Role:', user.role);
      console.log('Status:', user.status);
      console.log('Password hash length:', user.password ? user.password.length : 0);
      console.log('Created At:', user.createdAt);
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    mongoose.disconnect();
  }
}

checkUser();
