/**
 * Test script for Bunny CDN upload functionality
 *
 * Run with: npx tsx scripts/test-bunny-upload.ts
 *
 * Requirements:
 * - User must be logged in (or use service_role key)
 * - Edge function bunny-media-upload must be deployed
 * - Bunny secrets must be configured
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wjkbqcrxwsmvtxmqgiqc.supabase.co';
// Use service_role key for testing (from Supabase Dashboard > Settings > API)
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const TEST_USER_ID = '53a16df5-0186-429a-a521-e24cad1e6ab2'; // test.client@kreoon.com

async function testBunnyUpload() {
  if (!SUPABASE_SERVICE_KEY) {
    console.error('❌ Set SUPABASE_SERVICE_ROLE_KEY environment variable');
    console.log('   Export it or pass it inline:');
    console.log('   SUPABASE_SERVICE_ROLE_KEY=xxx npx tsx scripts/test-bunny-upload.ts');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  console.log('🧪 Testing Bunny CDN Upload...\n');

  // Test 1: Get upload credentials for avatar
  console.log('1️⃣ Testing bunny-media-upload edge function...');

  const { data: avatarCreds, error: avatarError } = await supabase.functions.invoke(
    'bunny-media-upload',
    {
      body: {
        type: 'avatar',
        fileName: 'test-avatar.jpg',
        contentType: 'image/jpeg',
        userId: TEST_USER_ID,
      },
    }
  );

  if (avatarError) {
    console.error('❌ Avatar upload credentials failed:', avatarError);
    return;
  }

  console.log('✅ Avatar credentials received:');
  console.log(`   Upload URL: ${avatarCreds.uploadUrl}`);
  console.log(`   CDN URL: ${avatarCreds.cdnUrl}`);
  console.log(`   Zone: ${avatarCreds.zone}`);
  console.log(`   Path: ${avatarCreds.path}`);
  console.log(`   Has AccessKey: ${!!avatarCreds.accessKey}`);

  // Test 2: Get upload credentials for portfolio image
  console.log('\n2️⃣ Testing portfolio image credentials...');

  const { data: portfolioCreds, error: portfolioError } = await supabase.functions.invoke(
    'bunny-media-upload',
    {
      body: {
        type: 'portfolio',
        fileName: 'test-portfolio.png',
        contentType: 'image/png',
        userId: TEST_USER_ID,
      },
    }
  );

  if (portfolioError) {
    console.error('❌ Portfolio upload credentials failed:', portfolioError);
    return;
  }

  console.log('✅ Portfolio credentials received:');
  console.log(`   CDN URL: ${portfolioCreds.cdnUrl}`);
  console.log(`   Zone: ${portfolioCreds.zone}`);

  // Test 3: Get upload credentials for chat asset
  console.log('\n3️⃣ Testing chat asset credentials...');

  const { data: chatCreds, error: chatError } = await supabase.functions.invoke(
    'bunny-media-upload',
    {
      body: {
        type: 'chat',
        fileName: 'document.pdf',
        contentType: 'application/pdf',
        organizationId: 'test-org',
      },
    }
  );

  if (chatError) {
    console.error('❌ Chat asset credentials failed:', chatError);
    return;
  }

  console.log('✅ Chat asset credentials received:');
  console.log(`   CDN URL: ${chatCreds.cdnUrl}`);
  console.log(`   Zone: ${chatCreds.zone}`);

  // Test 4: Verify CDN URL optimization params
  console.log('\n4️⃣ Verifying CDN URL optimization...');

  const avatarUrl = new URL(avatarCreds.cdnUrl);
  const hasOptimization = avatarUrl.search.includes('format=webp');
  const hasSize = avatarUrl.search.includes('width=256');

  console.log(`   WebP format: ${hasOptimization ? '✅' : '❌'}`);
  console.log(`   Avatar size (256x256): ${hasSize ? '✅' : '❌'}`);

  // Test 5: Actual upload test (small test file)
  console.log('\n5️⃣ Testing actual upload to Bunny...');

  // Create a tiny test image (1x1 pixel PNG)
  const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const testImageBuffer = Buffer.from(testImageBase64, 'base64');

  try {
    const uploadResponse = await fetch(avatarCreds.uploadUrl, {
      method: 'PUT',
      headers: {
        'AccessKey': avatarCreds.accessKey,
        'Content-Type': 'image/png',
      },
      body: testImageBuffer,
    });

    if (uploadResponse.ok) {
      console.log('✅ Upload successful!');
      console.log(`   Status: ${uploadResponse.status}`);
      console.log(`   File available at: ${avatarCreds.cdnUrl.split('?')[0]}`);

      // Update profile with new avatar
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: avatarCreds.cdnUrl.split('?')[0] })
        .eq('id', TEST_USER_ID);

      if (updateError) {
        console.log('⚠️ Profile update failed:', updateError.message);
      } else {
        console.log('✅ Profile updated with new avatar URL');
      }
    } else {
      console.error('❌ Upload failed:', uploadResponse.status, await uploadResponse.text());
    }
  } catch (err) {
    console.error('❌ Upload error:', err);
  }

  console.log('\n🎉 All tests completed!');
}

testBunnyUpload().catch(console.error);
