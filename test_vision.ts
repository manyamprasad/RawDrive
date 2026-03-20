import { ImageAnnotatorClient } from '@google-cloud/vision';

async function testVision() {
  console.log("Testing Google Vision API Credentials...");
  
  if (!process.env.GOOGLE_CREDENTIALS_JSON) {
    console.error("❌ GOOGLE_CREDENTIALS_JSON is not set in environment variables.");
    return;
  }

  try {
    const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
    console.log(`✅ JSON parsed successfully. Project ID: ${credentials.project_id}, Client Email: ${credentials.client_email}`);
    
    const client = new ImageAnnotatorClient({ credentials });
    
    console.log("Sending test request to Vision API...");
    // We will send a tiny 1x1 pixel transparent PNG just to test authentication
    const tinyImageBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');
    
    const [result] = await client.faceDetection({ image: { content: tinyImageBuffer } });
    console.log("✅ Vision API authenticated and responded successfully!");
    console.log("Result:", JSON.stringify(result));
  } catch (err: any) {
    console.error("❌ Vision API Error:", err.message);
    if (err.message.includes('UNAUTHENTICATED')) {
      console.error("   -> Google rejected the credentials. This usually means:");
      console.error("      1. The Service Account was deleted or recreated.");
      console.error("      2. The Cloud Vision API is NOT enabled for this specific project.");
      console.error("      3. The JSON key is incomplete or has been altered.");
    }
  }
}

testVision();
