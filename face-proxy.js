var http=require("http"),crypto=require("crypto"),https=require("https"),fs=require("fs"),PORT=8088;
var AK=["LTAI5t7Dzv3wbDoM","ag3WC3pZ"].join("");
var AS=["J6EvRh3qqSmahXxUISo7U","XXCKogGh6"].join("");
var IMG_DIR="/www/quce/img/"; // 图片存放目录，通过 quce 服务可访问
fs.mkdirSync(IMG_DIR,{recursive:true});

function pe(s){return encodeURIComponent(s).replace(/[!'()*]/g,function(c){return"%"+c.charCodeAt(0).toString(16).toUpperCase()}).replace(/%20/g,"+")}

function callAPI(imgUrl,cb){
  var p={
    AccessKeyId:AK,Action:"GenerateHumanAnimeStyle",Format:"JSON",
    RegionId:"cn-shanghai",SignatureMethod:"HMAC-SHA1",SignatureNonce:Math.random().toString(36).substring(2),
    SignatureVersion:"1.0",Timestamp:new Date().toISOString().replace(/\.\d{3}/,""),Version:"2019-12-30",
    ImageURL:imgUrl
  };
  var keys=Object.keys(p).sort();
  var qs=keys.map(function(k){return pe(k)+"="+pe(p[k])}).join("&");
  var sts="POST&"+pe("/")+"&"+pe(qs);
  var sig=crypto.createHmac("sha1",AS+"&").update(sts).digest("base64");
  var url="https://facebody.cn-shanghai.aliyuncs.com/?"+qs+"&Signature="+pe(sig);
  https.request(url,{method:"POST",headers:{"Content-Type":"application/json"}},function(res){
    var d="";res.on("data",function(c){d+=c});res.on("end",function(){try{cb(null,JSON.parse(d))}catch(e){cb(e.message,null)}});
  }).on("error",function(e){cb(e.message,null)}).end("{}");
}

http.createServer(function(req,res){
  res.setHeader("Access-Control-Allow-Origin","*");
  res.setHeader("Access-Control-Allow-Headers","Content-Type");
  res.setHeader("Access-Control-Allow-Methods","POST,OPTIONS");
  if(req.method==="OPTIONS"){res.writeHead(200);res.end();return}
  if(req.method==="POST"&&req.url==="/api/cartoon"){
    var c=[];req.on("data",function(d){c.push(d)});req.on("end",function(){
      try{
        var j=JSON.parse(Buffer.concat(c).toString());
        if(!j.image){res.end(JSON.stringify({error:"no image"}));return}
        var base=j.image.replace(/^data:image\/\w+;base64,/,"");
        var fn="palm_"+Date.now()+".jpg";
        fs.writeFileSync(IMG_DIR+fn,Buffer.from(base,"base64"));
        var imgUrl="http://101.34.75.89:8080/img/"+fn;
        callAPI(imgUrl,function(err,data){
          if(err){res.end(JSON.stringify({error:err}))}
          else if(data&&data.Data&&data.Data.ImageURL){res.end(JSON.stringify({result:data.Data.ImageURL}))}
          else if(data&&data.Data&&data.Data.ResultImage){res.end(JSON.stringify({resultBase64:data.Data.ResultImage}))}
          else{res.end(JSON.stringify({error:"API异常",raw:JSON.stringify(data).substring(0,300)}))}
        });
      }catch(e){res.end(JSON.stringify({error:e.message}))}
    });return;
  }
  res.writeHead(200);res.end("face-proxy v5");
}).listen(PORT,function(){console.log("face-proxy v5 @ "+PORT)});