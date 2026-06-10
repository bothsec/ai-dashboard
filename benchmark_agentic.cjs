const fs = require('fs');
const http = require('https');

const apiKey = process.env.NVIDIA_API_KEY;

if (!apiKey) {
  console.error('Error: NVIDIA_API_KEY environment variable is not set.');
  process.exit(1);
}

const agenticModels = [
  'nvidia/llama-3.1-nemotron-70b-instruct',
  'nvidia/nemotron-3-super-120b-a12b',
  'nvidia/nemotron-4-340b-instruct',
  'meta/llama-3.1-405b-instruct'
];

async function testModel(model) {
  const data = JSON.stringify({
    model: model,
    messages: [{ role: 'user', content: 'You are an agent. Respond with "Ready".' }],
    max_tokens: 5,
    stream: false
  });

  const options = {
    hostname: 'integrate.api.nvidia.com',
    path: '/v1/chat/completions',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'Content-Length': Buffer.byteLength(data)
    },
    timeout: 30000 // 30s timeout for massive models
  };

  return new Promise((resolve) => {
    const start = Date.now();
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        const duration = (Date.now() - start) / 1000;
        if (res.statusCode === 200) {
          resolve({ model, status: 'Success', time: duration.toFixed(2) + 's' });
        } else {
          resolve({ model, status: `Error ${res.statusCode}`, time: duration.toFixed(2) + 's' });
        }
      });
    });

    req.on('error', (e) => {
      resolve({ model, status: 'Failed', time: 'N/A' });
    });
    
    req.on('timeout', () => {
        req.destroy();
        resolve({ model, status: 'Timeout', time: '>30s' });
    });

    req.write(data);
    req.end();
  });
}

async function runAgenticBenchmarks() {
  console.log('--- NVIDIA NIM Agentic Model Benchmark ---');
  console.log('| Model | Status | Response Time |');
  console.log('| :--- | :--- | :--- |');
  
  for (const model of agenticModels) {
    const result = await testModel(model);
    console.log(`| ${result.model} | ${result.status} | ${result.time} |`);
  }
}

runAgenticBenchmarks();
