import fetch from 'node-fetch';

async function test() {
  try {
    const response = await fetch('http://localhost:3000/api/upload', {
      method: 'POST',
      body: 'test'
    });
    console.log('Status:', response.status);
    const text = await response.text();
    console.log('Response:', text.substring(0, 100));
  } catch (e) {
    console.error(e);
  }
}

test();
