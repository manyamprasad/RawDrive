import fs from 'fs';

async function test() {
  try {
    console.log("Downloading test image...");
    const imgRes = await fetch('https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80');
    const arrayBuffer = await imgRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    console.log("Uploading to local server...");
    const blob = new Blob([buffer], { type: 'image/jpeg' });
    const formData = new FormData();
    formData.append('photo', blob, 'test_face.jpg');

    const uploadRes = await fetch('http://localhost:3000/api/upload', {
      method: 'POST',
      body: formData,
    });

    const data = await uploadRes.json();
    console.log("Upload Response:");
    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Test failed:", err);
  }
}
test();
