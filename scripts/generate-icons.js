import fs from 'fs';
import path from 'path';

const icons = {
  'mipmap-mdpi': { size: 48 },
  'mipmap-hdpi': { size: 72 },
  'mipmap-xhdpi': { size: 96 },
  'mipmap-xxhdpi': { size: 144 },
  'mipmap-xxxhdpi': { size: 192 }
};

const resDir = path.join(path.dirname(new URL(import.meta.url).pathname).replace('/C:/', 'C:/'), '..', 'android', 'app', 'src', 'main', 'res');

const createIcon = (size) => {
  return `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="${size}dp"
    android:height="${size}dp"
    android:viewportWidth="100"
    android:viewportHeight="100">
    <defs>
        <linearGradient android:id="grad" android:startX="0%" android:startY="0%" android:endX="100%" android:endY="100%">
            <item android:offset="0%" android:color="#10B981"/>
            <item android:offset="100%" android:color="#059669"/>
        </linearGradient>
    </defs>
    <circle
        android:cx="50"
        android:cy="50"
        android:r="45"
        android:fill="url(#grad)"/>
    <path
        android:fill="#FFFFFF"
        android:pathData="M45 35 L45 50 L60 50 L60 35 L65 35 L65 55 L40 55 L40 35 L45 35 Z"/>
    <path
        android:fill="#FFFFFF"
        android:pathData="M30 60 L30 80 L70 80 L70 60 L30 60 M35 65 L35 75 L65 75 L65 65 L35 65 Z"/>
</vector>`;
};

for (const [dir, { size }] of Object.entries(icons)) {
  const dirPath = path.join(resDir, dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  
  const iconPath = path.join(dirPath, 'ic_launcher.xml');
  fs.writeFileSync(iconPath, createIcon(size));
  console.log(`Created ${dir}/ic_launcher.xml`);
}

console.log('All icons generated successfully!');