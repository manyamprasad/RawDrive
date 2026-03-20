async function test() {
  try {
    const form = new FormData();
    const largeBody = new Uint8Array(10 * 1024 * 1024); // 10MB
    form.append('photo', new File([largeBody], 'test.jpg', { type: 'image/jpeg' }));

    const response = await fetch('http://localhost:3000/api/upload', {
      method: 'POST',
      body: form
    });
    console.log('Status:', response.status);
    const text = await response.text();
    console.log('Response:', text.substring(0, 100));
  } catch (e) {
    console.error(e);
  }
}

test();
