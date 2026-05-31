// AI 动漫化代理服务
const http = require("http");
const crypto = require("crypto");
const https = require("https");
const fs = require("fs");
const path = require("path");
const PORT = 8081;

// ★★★ 改成你的阿里云密钥 ★★★
const AK_ID  = "你的AccessKeyID";
const AK_SECRET = "你的AccessKeySecret";

// 阿里云视觉智能 API - 动漫化
function cartoonFace(imageBase64, callback) {
  const host = "facebody.cn-shanghai.aliyuncs.com";
  const action = "GenerateHumanAnimeStyle";
  const timestamp = new Date().toISOString().replace(/[:-]/g,"").substring(0,15)+"Z";
  const nonce = Math.random().toString(36).substring(2,15);

  const query = `AccessKeyId=${AK_ID}&Action=${action}&Format=JSON&RegionId=cn-shanghai&SignatureMethod=HMAC-SHA1&SignatureNonce=${nonce}&SignatureVersion=1.0&Timestamp=${encodeURIComponent(timestamp)}&Version=2020-02-28`;
  const stringToSign = `POST&${encodeURIComponent("/")}&${encodeURIComponent(query)}`;
  const signature = crypto.createHmac("sha1", AK_SECRET+"&").update(stringToSign).digest("base64");
  const fullUrl = `https://${host}/?${query}&Signature=${encodeURIComponent(signature)}`;

  const body = JSON.stringify({ ImageURL: "" }); // 先留空，用 ImageContent 传 base64

  const opts = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json"
    }
  };

  const req = https.request(fullUrl, opts, res => {
    let data = "";
    res.on("data", c => data += c);
    res.on("end", () => {
      try { callback(null, JSON.parse(data)); }
      catch(e) { callback(e, null); }
    });
  });
  req.on("error", e => callback(e, null));
  req.write(JSON.stringify({ ImageContent: imageBase64 }));
  req.end();
}

// 接收上传图片
http.createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") { res.writeHead(200); res.end(); return; }

  if (req.url === "/api/cartoon" && req.method === "POST") {
    let chunks = [];
    req.on("data", c => chunks.push(c));
    req.on("end", () => {
      try {
        const body = JSON.parse(Buffer.concat(chunks).toString());
        if (!body.image) { res.writeHead(400); res.end(JSON.stringify({error:"请上传图片"})); return; }
        // 去掉 data:image/...;base64, 前缀
        const base64 = body.image.replace(/^data:image\/\w+;base64,/,"");
        cartoonFace(base64, (err, data) => {
          if (err) { res.writeHead(500); res.end(JSON.stringify({error:err.message})); return; }
          res.writeHead(200, {"Content-Type":"application/json"});
          res.end(JSON.stringify(data));
        });
      } catch(e) { res.writeHead(400); res.end(JSON.stringify({error:e.message})); }
    });
    return;
  }

  res.writeHead(404); res.end("Not Found");
}).listen(PORT, () => console.log(`🤖 AI动漫化服务已启动: http://0.0.0.0:${PORT}`));
