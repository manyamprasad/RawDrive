import express from 'express';
import expressWs from 'express-ws';
import cors from 'cors';
import multer from 'multer';
import sharp from 'sharp';
import { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { ImageAnnotatorClient } from '@google-cloud/vision';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import fs from 'fs';
import rtspRelay from 'rtsp-relay';
import { WebSocketServer } from 'ws';
// import PaytmChecksum from 'paytmchecksum';
// import twilio from 'twilio';
// import nodemailer from 'nodemailer';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const { app, getWss } = expressWs(express());
const PORT = 3000;

app.use(cors());
app.use(express.json());

// --- Gateway Config ---
/*
const twilioClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN 
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN) 
  : null;

const emailTransporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT),
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});
*/
const twilioClient = null;
const emailTransporter = null;

import axios from 'axios';
import crypto from 'crypto';

import { StandardCheckoutClient, Env, StandardCheckoutPayRequest } from '@phonepe-pg/pg-sdk-node';
import { randomUUID } from 'crypto';

// ... (existing config)

// --- API Routes ---
app.post('/api/payment/initiate', async (req, res) => {
  const { amount, userId, gateway } = req.body;
  
  if (gateway === 'paytm') {
    // TODO: Implement Paytm (Disabled)
    return res.status(503).json({ success: false, message: 'Paytm is temporarily disabled' });
  } else if (gateway === 'phonepe') {
    // PhonePe implementation using the new OAuth SDK
    const clientId = process.env.PHONEPE_CLIENT_ID;
    const clientSecret = process.env.PHONEPE_CLIENT_SECRET;
    const clientVersion = parseInt(process.env.PHONEPE_CLIENT_VERSION || '1', 10);
    
    if (!clientId || !clientSecret) {
      return res.status(500).json({ error: 'PhonePe OAuth credentials not configured. Please set PHONEPE_CLIENT_ID and PHONEPE_CLIENT_SECRET.' });
    }

    try {
      // Use Env.SANDBOX for testing, Env.PRODUCTION for live
      const env = process.env.NODE_ENV === 'production' ? Env.PRODUCTION : Env.SANDBOX;
      
      const client = StandardCheckoutClient.getInstance(clientId, clientSecret, clientVersion, env);
      
      const merchantOrderId = `TXN_${Date.now()}_${randomUUID().substring(0, 8)}`;
      const redirectUrl = `${process.env.APP_URL}/payment/callback`;
      
      const request = StandardCheckoutPayRequest.builder()
        .merchantOrderId(merchantOrderId)
        .amount(amount * 100) // Amount in paise
        .redirectUrl(redirectUrl)
        .build();
        
      const response = await client.pay(request);
      
      // Return the redirect URL to the frontend
      res.json({ 
        success: true, 
        redirectUrl: response.redirectUrl,
        merchantOrderId 
      });
    } catch (err: any) {
      console.error('PhonePe Payment Error:', err);
      res.status(500).json({ error: err.message || 'Payment initiation failed' });
    }
  } else {
    res.status(400).json({ error: 'Invalid gateway' });
  }
});

/*
app.post('/api/share/sms', async (req, res) => {
  const { to, message } = req.body;
  if (!twilioClient) return res.status(500).json({ error: 'SMS service not configured' });
  try {
    await twilioClient.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to
    });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/share/email', async (req, res) => {
  const { to, subject, text } = req.body;
  try {
    await emailTransporter.sendMail({
      from: process.env.EMAIL_FROM,
      to,
      subject,
      text,
    });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
*/

// Ensure local upload directories exist for fallback storage
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
const ORIGINALS_DIR = path.join(UPLOADS_DIR, 'originals');
const WEBP_DIR = path.join(UPLOADS_DIR, 'webp');

if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
if (!fs.existsSync(ORIGINALS_DIR)) fs.mkdirSync(ORIGINALS_DIR, { recursive: true });
if (!fs.existsSync(WEBP_DIR)) fs.mkdirSync(WEBP_DIR, { recursive: true });

// Serve local uploads statically
app.use('/uploads', express.static(UPLOADS_DIR));

// Configure Multer for memory storage
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

// Configure Cloudflare R2 Client
const R2_ACCOUNT_ID = process.env.CF_ACCOUNT_ID || process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || process.env.CF_API_KEY; 
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || process.env.CF_CACHE_API_TOKEN; 
const BUCKET_NAME = process.env.R2_BUCKET_NAME?.trim();

let s3Client: S3Client | null = null;

// Only initialize if we have credentials and bucket name
if (R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && BUCKET_NAME) {
  const isValidBucketName = /^[a-z0-9.-]{1,63}$/.test(BUCKET_NAME);
  
  if (R2_ACCESS_KEY_ID.length !== 32) {
    console.warn(`[R2 Config] ERROR: R2_ACCESS_KEY_ID has length ${R2_ACCESS_KEY_ID.length}, expected 32. You pasted the wrong key (likely the Token Value instead of the Access Key ID). R2 Uploads are DISABLED until this is fixed.`);
  } else if (!isValidBucketName) {
    console.warn(`[R2 Config] ERROR: R2_BUCKET_NAME "${BUCKET_NAME}" is not valid. Bucket names must contain only lowercase letters, numbers, dots, and hyphens. R2 Uploads are DISABLED.`);
    s3Client = null;
  } else {
    s3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
      },
    });
    console.log("[R2 Config] R2 Client initialized successfully.");
  }
} else if (R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && !BUCKET_NAME) {
  console.warn("[R2 Config] ERROR: R2_BUCKET_NAME is not set. R2 Uploads are DISABLED. Please set R2_BUCKET_NAME in your environment variables.");
}

// Configure Google Vision Client
let visionClient: ImageAnnotatorClient | null = null;
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || 'AIzaSyAbARn9RfkOD0YTjWdB-ovr-NyRegmv-OE';

try {
  if (process.env.GOOGLE_CREDENTIALS_JSON) {
    console.log("[Vision Config] GOOGLE_CREDENTIALS_JSON found. Initializing Vision Client...");
    const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
    visionClient = new ImageAnnotatorClient({ credentials });
    console.log("[Vision Config] Vision Client initialized successfully.");
  } else if (GOOGLE_API_KEY) {
    console.log("[Vision Config] Using Google API Key for Vision REST API.");
  } else {
    // We won't initialize the default client in AI Studio because the default project doesn't have Vision API enabled.
    console.warn("[Vision Config] Google Vision client not initialized. Please provide GOOGLE_CREDENTIALS_JSON in secrets to enable face detection.");
  }
} catch (error: any) {
  console.warn("[Vision Config] Google Vision client could not be initialized:", error.message);
}

// API Routes
app.get('/api/debug-env', (req, res) => {
  res.json({
    R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID ? 'set' : 'not set',
    CF_ACCOUNT_ID: process.env.CF_ACCOUNT_ID ? 'set' : 'not set',
    R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID ? 'set' : 'not set',
    R2_ACCESS_KEY_ID_PREFIX: process.env.R2_ACCESS_KEY_ID ? process.env.R2_ACCESS_KEY_ID.substring(0, 10) : '',
    R2_ACCESS_KEY_ID_LENGTH: process.env.R2_ACCESS_KEY_ID ? process.env.R2_ACCESS_KEY_ID.length : 0,
    CF_API_KEY: process.env.CF_API_KEY ? 'set' : 'not set',
    R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY ? 'set' : 'not set',
    CF_CACHE_API_TOKEN: process.env.CF_CACHE_API_TOKEN ? 'set' : 'not set',
    GOOGLE_CREDENTIALS_JSON: process.env.GOOGLE_CREDENTIALS_JSON ? 'set' : 'not set',
  });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', r2Configured: !!s3Client });
});

app.post('/api/upload', upload.single('photo'), async (req, res) => {
  try {
    const { userId } = req.body;
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const file = req.file;
    const originalName = file.originalname;
    const fileBuffer = file.buffer;
    const mimeType = file.mimetype;
    
    // Generate unique IDs
    const fileId = Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
    
    // Use user-specific prefix if userId is provided
    const prefix = userId ? `users/${userId}/` : '';
    const originalKey = `${prefix}originals/${fileId}_${originalName}`;
    const webpKey = `${prefix}webp/${fileId}.webp`;

    // 1. Convert to WebP using Sharp
    let webpBuffer: Buffer;
    try {
      webpBuffer = await sharp(fileBuffer)
        .webp({ quality: 80 })
        .toBuffer();
    } catch (err) {
      console.error("Error converting to WebP:", err);
      // Fallback to original buffer if conversion fails (e.g., unsupported RAW format by sharp)
      webpBuffer = fileBuffer;
    }

    // 2. Upload to Cloudflare R2 or Local File System
    let uploadedToR2 = false;
    let r2ErrorMessage = null;
    if (s3Client) {
      try {
        // Upload Original
        await s3Client.send(new PutObjectCommand({
          Bucket: BUCKET_NAME,
          Key: originalKey,
          Body: fileBuffer,
          ContentType: mimeType,
        }));

        // Upload WebP
        await s3Client.send(new PutObjectCommand({
          Bucket: BUCKET_NAME,
          Key: webpKey,
          Body: webpBuffer,
          ContentType: 'image/webp',
        }));
        uploadedToR2 = true;
      } catch (r2Error: any) {
        r2ErrorMessage = r2Error.message;
        if (r2Error.message && r2Error.message.includes('bucket name is not valid')) {
          console.warn(`[R2 Upload Failed] The bucket name "${BUCKET_NAME}" is invalid. Cloudflare R2 requires bucket names to be at least 3 characters long. Please create a new bucket in Cloudflare and update your R2_BUCKET_NAME secret. Falling back to local storage.`);
        } else {
          console.warn("R2 Upload failed, falling back to local storage:", r2Error.message);
        }
        if (r2Error.message.includes('Access Denied')) {
          console.warn(`
[R2 Config] ❌ ACCESS DENIED ERROR ❌
Your R2 credentials are valid, but they do not have permission to write to the bucket "${BUCKET_NAME}".
To fix this:
1. Go to Cloudflare Dashboard -> R2 -> Manage R2 API Tokens
2. Create a new token with "Object Read & Write" permissions (NOT "Read Only").
3. Ensure the token is allowed to access the "${BUCKET_NAME}" bucket.
4. Update your R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY secrets.
          `);
        }
      }
    }
    
    if (!uploadedToR2) {
      if (!s3Client) {
        console.warn("R2 Client not configured. Falling back to local storage.");
      }
      // Ensure directories exist for these specific keys
      const originalDir = path.dirname(path.join(UPLOADS_DIR, originalKey));
      const webpKeyDir = path.dirname(path.join(UPLOADS_DIR, webpKey));
      if (!fs.existsSync(originalDir)) fs.mkdirSync(originalDir, { recursive: true });
      if (!fs.existsSync(webpKeyDir)) fs.mkdirSync(webpKeyDir, { recursive: true });
      
      fs.writeFileSync(path.join(UPLOADS_DIR, originalKey), fileBuffer);
      fs.writeFileSync(path.join(UPLOADS_DIR, webpKey), webpBuffer);
    }

    // 3. Run Google Vision Face Detection on WebP buffer
    let faces: any[] = [];
    if (visionClient) {
      try {
        const [result] = await visionClient.faceDetection({ image: { content: webpBuffer } });
        const detectedFaces = result.faceAnnotations || [];
        faces = detectedFaces.map((face, index) => ({
          id: `face_${index}`,
          joyLikelihood: face.joyLikelihood,
          sorrowLikelihood: face.sorrowLikelihood,
          angerLikelihood: face.angerLikelihood,
          surpriseLikelihood: face.surpriseLikelihood,
          boundingPoly: face.boundingPoly,
        }));
      } catch (err: any) {
        console.error("[Vision Config] Face detection failed for this image:", err.message);
      }
    } else if (GOOGLE_API_KEY) {
      try {
        const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_API_KEY}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            requests: [
              {
                image: { content: webpBuffer.toString('base64') },
                features: [{ type: 'FACE_DETECTION' }]
              }
            ]
          })
        });
        
        if (!response.ok) {
          throw new Error(`Vision API REST error: ${response.status} ${response.statusText}`);
        }
        
        const result = await response.json();
        const detectedFaces = result.responses?.[0]?.faceAnnotations || [];
        faces = detectedFaces.map((face: any, index: number) => ({
          id: `face_${index}`,
          joyLikelihood: face.joyLikelihood,
          sorrowLikelihood: face.sorrowLikelihood,
          angerLikelihood: face.angerLikelihood,
          surpriseLikelihood: face.surpriseLikelihood,
          boundingPoly: face.boundingPoly,
        }));
      } catch (err: any) {
        console.error("[Vision Config] REST Face detection failed:", err.message);
      }
    }

    // Return the keys and face data
    res.json({
      success: true,
      originalKey,
      webpKey,
      faces,
      size: file.size,
      originalName,
      r2ErrorMessage
    });

  } catch (error: any) {
    console.error("Upload error:", error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Endpoint to delete photos from R2
app.post('/api/photos/delete', async (req, res) => {
  try {
    const { keys } = req.body;
    if (!keys || !Array.isArray(keys) || keys.length === 0) {
      return res.status(400).json({ error: 'Keys array is required' });
    }

    if (!s3Client) {
      return res.status(503).json({ error: 'R2 storage not configured' });
    }

    const deletePromises = keys.map(key => 
      s3Client!.send(new DeleteObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key
      }))
    );

    await Promise.all(deletePromises);
    res.json({ success: true, deletedCount: keys.length });
  } catch (error: any) {
    console.error("Delete error:", error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Endpoint to sync storage usage from R2
app.get('/api/storage/sync', async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({ error: 'userId is required' });
    }

    if (!s3Client) {
      return res.status(503).json({ error: 'R2 storage not configured' });
    }

    let totalSize = 0;
    let isTruncated = true;
    let continuationToken: string | undefined = undefined;
    const prefix = `users/${userId}/`;

    while (isTruncated) {
      const command: ListObjectsV2Command = new ListObjectsV2Command({
        Bucket: BUCKET_NAME,
        Prefix: prefix,
        ContinuationToken: continuationToken
      });

      const response = await s3Client.send(command);
      
      if (response.Contents) {
        for (const obj of response.Contents) {
          totalSize += obj.Size || 0;
        }
      }

      isTruncated = response.IsTruncated || false;
      continuationToken = response.NextContinuationToken;
    }

    res.json({ success: true, userId, storageUsed: totalSize });
  } catch (error: any) {
    console.error("Storage sync error:", error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Endpoint to get signed URLs for images
app.get('/api/images/url', async (req, res) => {
  try {
    const { key } = req.query;
    if (!key || typeof key !== 'string') {
      return res.status(400).json({ error: 'Key is required' });
    }

    // Check if the file exists locally first (fallback storage)
    const localFilePath = path.join(UPLOADS_DIR, key);
    if (fs.existsSync(localFilePath)) {
      return res.json({ url: `/uploads/${key}` });
    }

    if (!s3Client) {
      // Fallback to local storage URL
      return res.json({ url: `/uploads/${key}` });
    }

    try {
      const command = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
      });

      const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
      res.json({ url: signedUrl });
    } catch (r2Error: any) {
      console.warn("R2 getSignedUrl failed, falling back to local storage:", r2Error.message);
      res.json({ url: `/uploads/${key}` });
    }
  } catch (error: any) {
    console.error("Error generating signed URL:", error);
    res.status(500).json({ error: error.message });
  }
});

// Vite middleware for development
async function startServer() {
  // RTSP Relay Setup
  const { proxy } = rtspRelay(app);

  app.ws('/api/streams/:id', (ws, req) => {
    const rtspUrl = req.query.url as string;
    if (rtspUrl) {
      proxy({
        url: rtspUrl,
      })(ws);
    } else {
      ws.close(1008, 'RTSP URL missing');
    }
  });

  app.get('/api/streams/:id/proxy', (req, res) => {
    // This endpoint will be used by the frontend to get the websocket path
    res.json({ success: true, wsPath: `/api/streams/${req.params.id}` });
  });

  // Image Proxy Endpoint to avoid CORS issues during bulk download
  app.get('/api/images/proxy', async (req, res) => {
    try {
      const { key } = req.query;
      if (!key || typeof key !== 'string') {
        return res.status(400).json({ error: 'Key is required' });
      }

      let imageUrl: string;
      const localFilePath = path.join(UPLOADS_DIR, key);
      
      if (fs.existsSync(localFilePath)) {
        // For local files, we can just read them directly
        const contentType = key.endsWith('.webp') ? 'image/webp' : 'image/jpeg';
        res.setHeader('Content-Type', contentType);
        return res.sendFile(localFilePath);
      } else if (s3Client) {
        const command = new GetObjectCommand({
          Bucket: BUCKET_NAME,
          Key: key,
        });
        imageUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
      } else {
        return res.status(404).json({ error: 'Image not found' });
      }

      const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
      const contentType = response.headers['content-type'];
      
      res.setHeader('Content-Type', contentType);
      res.send(response.data);
    } catch (error: any) {
      console.error("Error proxying image:", error);
      res.status(500).json({ error: error.message });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
