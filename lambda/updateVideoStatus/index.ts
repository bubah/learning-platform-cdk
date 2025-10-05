import * as http from 'http';
import { S3Event } from 'aws-lambda';

exports.handler = async (event: S3Event) => {
  console.log('Triggered by S3 event:', JSON.stringify(event, null, 2));

  // Optional: Get the uploaded .m3u8 key (just to show in logs or send)
  const inputKey = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, ' '));

  const sectionId = inputKey.split('/')[2];
  console.log(sectionId);

  // ✅ Replace with your EC2 instance's public IP or DNS
  const apiHost = process.env.LEARNING_PLATFORM_BASE_URL;
  //   const apiHost = "ec2-75-101-224-166.compute-1.amazonaws.com";
  const apiPath = `/content/sections/${sectionId}`; // Your endpoint
  const useHttps = false; // true if using HTTPS

  const postData = JSON.stringify({
    s3Key: inputKey,
    uploadStatus: 'READY',
  });

  const reqOptions = {
    hostname: apiHost,
    port: useHttps ? 443 : 80,
    path: apiPath,
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData),
    },
  };

  const client = http;

  // Promise wrapper for clean async call
  await new Promise((resolve, reject) => {
    const req = client.request(reqOptions, (res: any) => {
      let data = '';
      res.on('data', (chunk: any) => (data += chunk));
      res.on('end', () => {
        console.log(`✅ API response: ${res.statusCode} - ${data}`);
        resolve(undefined);
      });
    });

    req.on('error', (e: any) => {
      console.error('❌ API call failed:', e);
      reject(e);
    });

    req.write(postData);
    req.end();
  });

  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'API call completed.' }),
  };
};
