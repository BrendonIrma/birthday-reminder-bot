#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🎂 Setting up Birthday Bot with Supabase...\n');

// Проверяем наличие .env файла
const envPath = path.join(__dirname, '..', '.env');
const envExamplePath = path.join(__dirname, '..', 'env.example');

if (!fs.existsSync(envPath)) {
    if (fs.existsSync(envExamplePath)) {
        fs.copyFileSync(envExamplePath, envPath);
        console.log('✅ Created .env file from template');
        console.log('⚠️  Please edit .env file with your actual tokens and Supabase credentials');
    } else {
        console.log('❌ env.example file not found');
    }
} else {
    console.log('✅ .env file already exists');
}

// Проверяем зависимости
try {
    const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
    console.log('✅ Package.json found');
    
    // Проверяем node_modules
    const nodeModulesPath = path.join(__dirname, '..', 'node_modules');
    if (!fs.existsSync(nodeModulesPath)) {
        console.log('⚠️  node_modules not found. Run "npm install" to install dependencies');
    } else {
        console.log('✅ Dependencies installed');
    }
} catch (error) {
    console.log('❌ Error reading package.json:', error.message);
}

console.log('\n🎉 Setup complete!');
console.log('\nNext steps:');
console.log('1. Set up Supabase database:');
console.log('   - Create a new project at https://supabase.com');
console.log('   - Run the SQL script from supabase/schema.sql in the SQL editor');
console.log('   - Get your project URL and anon key from Settings > API');
console.log('2. Edit .env file with your tokens:');
console.log('   - TELEGRAM_BOT_TOKEN (from @BotFather)');
console.log('   - DEEPSEEK_API_KEY (from https://platform.deepseek.com)');
console.log('   - SUPABASE_URL and SUPABASE_ANON_KEY (from Supabase)');
console.log('3. Run "npm install" if not done already');
console.log('4. Run "npm start" to start the bot');
console.log('\nFor more information, see README.md');