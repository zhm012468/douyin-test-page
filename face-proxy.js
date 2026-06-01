var http=require("http"),crypto=require("crypto"),https=require("https"),fs=require("fs"),PORT=8088;
var AK=["LTAI5t7Dzv3wbDoM","ag3WC3pZ"].join("");
var AS=["J6EvRh3qqSmahXxUISo7U","XXCKogGh6"].join("");

function callAPI(body,cb){
  var ts=new Date().toISOString().replace(/\.\d{3}/,"");
  var nonce=Math.random().toString(36).substring(2,15);
  var qs="AccessKeyId="+AK+"&Action=GenerateHumanAnimeStyle&Format=JSON&RegionId=cn-shanghai&SignatureMethod=HMAC-SHA1&SignatureNonce="+nonce+"&SignatureVersion=1.0&Timestamp="+encodeURIComponent(ts)+"&Version=2019-12-30";
  var sts="POST&%2F&"+encodeURIComponent(qs);
  var sig=crypto.createHmac("sha1",AS+"&").update(sts).digest("base64");
  var url="https://facebody.cn-shanghai.aliyuncs.com/?"+qs+"&Signature="+encodeURIComponent(sig);

  var opts={method:"POST",headers:{"Content-Type":"application/json","Accept":"application/json"}};
  var r=https.request(url,opts,function(res){
    var d="";res.on("data",function(c){d+=c});res.on("end",function(){
      try{cb(null,JSON.parse(d))}catch(e){cb(e.message,null)}
    });
  });
  r.on("error",function(e){cb(e.message,null)});
  r.write(JSON.stringify(body));r.end();
}

var s=http.createServer(function(req,res){
  res.setHeader("Access-Control-Allow-Origin","*");
  res.setHeader("Access-Control-Allow-Headers","Content-Type");
  res.setHeader("Access-Control-Allow-Methods","POST,OPTIONS");
  if(req.method==="OPTIONS"){res.writeHead(200);res.end();return}

  if(req.method==="POST"&&req.url==="/api/cartoon"){
    var chunks=[];req.on("data",function(c){chunks.push(c)});req.on("end",function(){
      try{
        var j=JSON.parse(Buffer.concat(chunks).toString());
        if(!j.image){res.end(JSON.stringify({error:"请上传图片"}));return}
        var base=j.image.replace(/^data:image\/\w+;base64,/,"");
        // 先存为文件
        var fn="/tmp/palm_"+Date.now()+".jpg";
        fs.writeFileSync(fn,Buffer.from(base,"base64"));
        // 调用阿里云 API（用 ImageURL，需公网可访问）
        // 临时方案：直接用 base64 调 ImageContent
        callAPI({ImageContent:base},function(err,data){
          if(err){res.end(JSON.stringify({error:"API错误: "+err}))}
          else if(data&&data.Data&&data.Data.ImageURL){
            res.end(JSON.stringify({result:data.Data.ImageURL}));
          }else if(data&&data.Data&&data.Data.ResultImage){
            res.end(JSON.stringify({resultBase64:data.Data.ResultImage}));
          }else{
            res.end(JSON.stringify({error:"API返回异常",raw:JSON.stringify(data).substring(0,200)}));
          }
        });
      }catch(e){res.end(JSON.stringify({error:e.message}))}
    });
    return;
  }
  res.writeHead(200);res.end("face-proxy v3");
});
s.listen(PORT,function(){console.log("face-proxy v3 @ "+PORT)});