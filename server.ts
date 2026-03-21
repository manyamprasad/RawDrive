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
import admin from 'firebase-admin';
import { createCanvas, loadImage, Image, ImageData, Canvas } from 'canvas';
import * as faceapi from 'face-api.js';
import axios from 'axios';
import crypto from 'crypto';
// import { faceDetectionNet, faceLandmark68Net, faceRecognitionNet } from 'face-api.js';
// import PaytmChecksum from 'paytmchecksum';
// import twilio from 'twilio';
// import nodemailer from 'nodemailer';

// Initialize Firebase Admin
if (process.env.GOOGLE_CREDENTIALS_JSON) {
  const serviceAccount = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}
const dbAdmin = admin.firestore();

// Initialize face-api.js
// @ts-ignore
faceapi.env.monkeyPatch({ Canvas: Canvas, Image: Image, ImageData: ImageData, createCanvas: createCanvas, createImageData: createCanvas, loadImage: loadImage });

async function loadModels() {
  const modelDir = './models';
  if (!fs.existsSync(modelDir)) fs.mkdirSync(modelDir);
  
  const modelUrl = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/';
  const models = ['ssd_mobilenetv1_model-weights_manifest.json', 'ssd_mobilenetv1_model-shard1', 'ssd_mobilenetv1_model-shard2', 'face_landmark_68_model-weights_manifest.json', 'face_landmark_68_model-shard1', 'face_recognition_model-weights_manifest.json', 'face_recognition_model-shard1', 'face_recognition_model-shard2'];
  for (const model of models) {
    if (!fs.existsSync(path.join(modelDir, model))) {
      console.log(`Downloading model ${model}...`);
      const response = await axios.get(modelUrl + model, { responseType: 'arraybuffer' });
      fs.writeFileSync(path.join(modelDir, model), response.data);
    }
  }

  await faceapi.nets.ssdMobilenetv1.loadFromDisk(modelDir);
  await faceapi.nets.faceLandmark68Net.loadFromDisk(modelDir);
  await faceapi.nets.faceRecognitionNet.loadFromDisk(modelDir);
}
loadModels().catch(console.error);

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const { app, getWss } = expressWs(express());
const PORT = 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

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

import { StandardCheckoutClient, Env, StandardCheckoutPayRequest } from '@phonepe-pg/pg-sdk-node';
import { randomUUID } from 'crypto';

// ... (existing config)

// --- API Routes ---
app.post('/api/payments/create', async (req, res) => {
  const { userId, amount, referenceId, mobileNumber, email, expiryTime } = req.body;
  
  if (!amount || typeof amount !== 'number') {
    return res.status(400).json({ error: 'Amount is required' });
  }
  
  const clientId = process.env.PHONEPE_CLIENT_ID;
  const clientSecret = process.env.PHONEPE_CLIENT_SECRET;
  const saltKey = process.env.PHONEPE_SALT_KEY;
  const saltIndex = process.env.PHONEPE_SALT_INDEX || '1';
  
  if (!clientId || !clientSecret || !saltKey) {
    return res.status(500).json({ error: 'PhonePe credentials not configured.' });
  }

  try {
    const merchantOrderId = referenceId || `TXN_${Date.now()}_${randomUUID().substring(0, 8)}`;
    const redirectUrl = `${process.env.APP_URL}/payment/callback`;
    
    const payload = {
      merchantId: clientId,
      merchantTransactionId: merchantOrderId,
      amount: amount * 100,
      callbackUrl: redirectUrl,
      paymentInstrument: { type: "PAY_PAGE" },
      // User-provided structure
      expireAfter: 1200,
      paymentFlow: {
        type: "PG_CHECKOUT",
        message: "Payment message used for collect requests",
        merchantUrls: { redirectUrl: redirectUrl }
      },
      disablePaymentRetry: true,
      metaInfo: {
        udf1: "additional-information-1",
        // ... (rest of udf)
      }
    };

    const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64');
    const stringToHash = base64Payload + '/pg/v1/pay' + saltKey;
    const xVerify = crypto.createHash('sha256').update(stringToHash).digest('hex') + '###' + saltIndex;

    const response = await axios.post(
      process.env.NODE_ENV === 'production' 
        ? 'https://api.phonepe.com/apis/hermes/pg/v1/pay' 
        : 'https://api-preprod.phonepe.com/apis/pg-sandbox/pg/v1/pay',
      { request: base64Payload },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-VERIFY': xVerify
        }
      }
    );

    res.json({ 
      success: true, 
      redirectUrl: response.data.data.instrumentResponse.redirectInfo.url,
      merchantOrderId 
    });
  } catch (err: any) {
    console.error('[PhonePe] Payment Error:', err.response?.data || err.message);
    res.status(500).json({ error: err.message || 'Payment initiation failed' });
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
// const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
// const ORIGINALS_DIR = path.join(UPLOADS_DIR, 'originals');
// const WEBP_DIR = path.join(UPLOADS_DIR, 'webp');

// if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
// if (!fs.existsSync(ORIGINALS_DIR)) fs.mkdirSync(ORIGINALS_DIR, { recursive: true });
// if (!fs.existsSync(WEBP_DIR)) fs.mkdirSync(WEBP_DIR, { recursive: true });

// Serve local uploads statically
// app.use('/uploads', express.static(UPLOADS_DIR));

// Configure Multer for memory storage
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

// Configure Cloudflare R2 Client
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
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
    R2_BUCKET_NAME: process.env.R2_BUCKET_NAME ? 'set' : 'not set',
    GOOGLE_CREDENTIALS_JSON: process.env.GOOGLE_CREDENTIALS_JSON ? 'set' : 'not set',
  });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', r2Configured: !!s3Client });
});

app.post('/api/upload', (req, res, next) => {
  upload.single('photo')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ error: `Upload error: ${err.message}` });
    } else if (err) {
      return res.status(500).json({ error: `Unknown upload error: ${err.message}` });
    }
    next();
  });
}, async (req, res) => {
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

    // 1. Convert to WebP using Sharp (only for images)
    let webpBuffer: Buffer = fileBuffer;
    const isVideo = mimeType.startsWith('video/');
    
    if (!isVideo) {
      try {
        console.log(`[Vision Config] Converting image to WebP. Original size: ${fileBuffer.length}`);
        webpBuffer = await sharp(fileBuffer)
          .webp({ quality: 80 })
          .toBuffer();
        console.log(`[Vision Config] Conversion successful. New size: ${webpBuffer.length}`);
      } catch (err) {
        console.error("Error converting to WebP:", err);
        // Fallback to original buffer if conversion fails (e.g., unsupported RAW format by sharp)
        webpBuffer = fileBuffer;
      }
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

        // Upload WebP (or original video buffer if it's a video)
        await s3Client.send(new PutObjectCommand({
          Bucket: BUCKET_NAME,
          Key: webpKey,
          Body: webpBuffer,
          ContentType: isVideo ? mimeType : 'image/webp',
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
        throw new Error("R2 Client not configured. Cloudflare R2 storage is required.");
      }
      throw new Error(`R2 Upload failed: ${r2ErrorMessage}`);
    }

    // 3. Run Google Vision Face Detection on WebP buffer
    let faces: any[] = [];
    if (!isVideo) {
      if (visionClient) {
        try {
          console.log(`[Vision Config] Sending image to Vision API. Buffer size: ${webpBuffer.length}, MimeType: ${mimeType}`);
          const [result] = await visionClient.faceDetection({ image: { content: webpBuffer } });
          const detectedFaces = result.faceAnnotations || [];
          // Generate embeddings for each face using face-api.js
          const jpegBuffer = await sharp(fileBuffer).jpeg().toBuffer();
          const img = await loadImage(jpegBuffer as any);
          const detections = await faceapi.detectAllFaces(img as any).withFaceLandmarks().withFaceDescriptors();
          
          faces = detectedFaces.map((face, index) => {
            const embedding = detections[index]?.descriptor ? Array.from(detections[index].descriptor) : [];
            
            // Store embedding in Firestore
            if (embedding.length > 0) {
              dbAdmin.collection('face_embeddings').add({
                albumId: req.body.albumId,
                photoId: fileId,
                photographerId: userId,
                embedding,
                facePosition: face.boundingPoly,
                createdAt: new Date().toISOString()
              }).catch(console.error);
            }

            return {
              id: `face_${index}`,
              joyLikelihood: face.joyLikelihood,
              sorrowLikelihood: face.sorrowLikelihood,
              angerLikelihood: face.angerLikelihood,
              surpriseLikelihood: face.surpriseLikelihood,
              boundingPoly: face.boundingPoly,
              embedding: embedding.length > 0
            };
          });
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
    }

    // Return the keys and face data
    res.json({
      success: true,
      originalKey,
      webpKey,
      faces,
      size: file.size,
      originalName,
      r2ErrorMessage,
      isVideo
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

    if (!s3Client) {
      throw new Error('R2 storage not configured');
    }

    try {
      const command = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
      });

      const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
      res.json({ url: signedUrl });
    } catch (r2Error: any) {
      console.error("R2 getSignedUrl failed:", r2Error.message);
      throw new Error(`R2 getSignedUrl failed: ${r2Error.message}`);
    }
  } catch (error: any) {
    console.error("Error generating signed URL:", error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint to proxy images for download to avoid CORS issues
app.get('/api/images/proxy', async (req, res) => {
  try {
    const { key } = req.query;
    if (!key || typeof key !== 'string') {
      return res.status(400).json({ error: 'Key is required' });
    }

    if (!s3Client) {
      throw new Error('R2 storage not configured');
    }

    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    const response = await s3Client.send(command);
    
    if (response.ContentType) {
      res.setHeader('Content-Type', response.ContentType);
    }
    if (response.ContentLength) {
      res.setHeader('Content-Length', response.ContentLength);
    }
    
    // Stream the response body to the client
    if (response.Body) {
      // @ts-ignore
      response.Body.pipe(res);
    } else {
      res.status(404).json({ error: 'Image not found' });
    }
  } catch (error: any) {
    console.error("Error proxying image:", error);
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

  // Endpoint to match face
  app.post('/api/face/match', async (req, res) => {
    try {
      const { image, albumId } = req.body;
      if (!image || !albumId) {
        return res.status(400).json({ error: 'Image and albumId are required' });
      }

      // 1. Generate embedding for live face
      const imgBuffer = Buffer.from(image.split(',')[1], 'base64');
      const img = await loadImage(imgBuffer as any);
      const detection = await faceapi.detectSingleFace(img as any).withFaceLandmarks().withFaceDescriptor();
      
      if (!detection) {
        return res.status(400).json({ error: 'No face detected' });
      }

      // 2. Query Firestore for embeddings in the album
      const embeddingsSnapshot = await dbAdmin.collection('face_embeddings')
        .where('albumId', '==', albumId)
        .get();
      
      const matches = [];
      for (const doc of embeddingsSnapshot.docs) {
        const data = doc.data();
        const distance = faceapi.euclideanDistance(detection.descriptor, data.embedding);
        if (distance < 0.6) { // Threshold for 95%+ accuracy
          matches.push(data.photoId);
        }
      }

      res.json({ success: true, matches });
    } catch (error: any) {
      console.error("Face match error:", error);
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

  // Custom error handler to return JSON instead of HTML
  app.use((err: any, req: any, res: any, next: any) => {
    console.error('Unhandled error:', err);
    res.status(err.status || 500).json({
      error: err.message || 'Internal Server Error'
    });
  });

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
