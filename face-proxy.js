var http=require("http"),crypto=require("crypto"),https=require("https"),PORT=8081;
var AK=["LTAI5t7Dzv3wbDoM","ag3WC3pZ"].join("");
var AS=["J6EvRh3qqSmahXxUISo7U","XXCKogGh6"].join("");

// 阿里云签名调用
function cartoon(img,cb){
  var ts=new Date().toISOString().replace(/[:-]/g,"").substring(0,15)+"Z";
  var n=Math.random().toString(36).substring(2);
  var q="AccessKeyId="+AK+"&Action=GenerateHumanAnimeStyle&Format=JSON&RegionId=cn-shanghai&SignatureMethod=HMAC-SHA1&SignatureNonce="+n+"&SignatureVersion=1.0&Timestamp="+encodeURIComponent(ts)+"&Version=2020-02-28";
  var s="POST&"+encodeURIComponent("/")+"&"+encodeURIComponent(q);
  var sig=crypto.createHmac("sha1",AS+"&").update(s).digest("base64");
  var u="https://facebody.cn-shanghai.aliyuncs.com/?"+q+"&Signature="+encodeURIComponent(sig);
  var r=https.request(u,{method:"POST",headers:{"Content-Type":"application/json"}},function(res){
    var d="";res.on("data",function(c){d+=c});res.on("end",function(){try{cb(JSON.parse(d))}catch(e){cb(null)}});
  });
  r.on("error",function(){cb(null)});
  r.write(JSON.stringify({ImageContent:img}));r.end();
}

var s=http.createServer(function(req,res){
  res.setHeader("Access-Control-Allow-Origin","*");
  res.setHeader("Access-Control-Allow-Headers","Content-Type");
  res.setHeader("Access-Control-Allow-Methods","POST,OPTIONS");
  if(req.method==="OPTIONS"){res.writeHead(200);res.end();return}
  if(req.method==="POST"&&req.url==="/api/cartoon"){
    var b="";req.on("data",function(c){b+=c});req.on("end",function(){
      try{var j=JSON.parse(b);if(!j.image){res.end('{"error":"no image"}');return}
        var base=j.image.replace(/^data:image\/\w+;base64,/,"");
        cartoon(base,function(d){
          if(d&&d.Data){res.end(JSON.stringify(d))}else{res.end('{"error":"API failed"}')}
        });
      }catch(e){res.end('{"error":"'+e.message+'"}')}
    });
    return;
  }
  res.writeHead(200,{"Content-Type":"text/plain"});res.end("face-proxy OK");
});
s.listen(PORT,function(){console.log("face-proxy on "+PORT)});