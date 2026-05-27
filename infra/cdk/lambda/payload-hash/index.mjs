// Lambda@Edge: Origin Request — adds x-amz-content-sha256 header for POST/PUT requests.
// Required because CloudFront OAC + Lambda Function URL (AWS_IAM) needs the payload hash
// to complete SigV4 signing. Lambda does not support unsigned payloads.
export async function handler(event) {
  const request = event.Records[0].cf.request;

  if (request.method === 'POST' || request.method === 'PUT') {
    const body = request.body?.data
      ? Buffer.from(request.body.data, request.body.encoding === 'base64' ? 'base64' : 'utf8')
      : Buffer.alloc(0);

    const hashBuffer = await crypto.subtle.digest('SHA-256', body);
    const hashHex = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    request.headers['x-amz-content-sha256'] = [{ key: 'x-amz-content-sha256', value: hashHex }];
  }

  return request;
}
