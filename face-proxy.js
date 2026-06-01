var http=require("http"),crypto=require("crypto"),https=require("https"),PORT=8088;
var AK="YOUR_AK";var AS="YOUR_AS";// 服务器端用 sed 替换
var BUCKET="qcqw-test",OSS="qcqw-test.oss-cn-shanghai.aliyuncs.com";

function enc(s){return encodeURIComponent(s).replace(/[!'()*]/g,function(c){return"%"+c.charCodeAt(0).toString(16).toUpperCase()})}

// 上传图片到 OSS（返回公网 URL）
function uploadOSS(key,data,cb){
  var date=new Date().toUTCString();
  var sign="PUT\n\nimage/jpeg\n"+date+"\n/"+BUCKET+"/"+key;
  var sig=crypto.createHmac("sha1",AS).update(sign).digest("base64");
  var r=https.request({hostname:OSS,path:"/"+key,method:"PUT",headers:{"Date":date,"Authorization":"OSS "+AK+":"+sig,"Content-Type":"image/jpeg","Content-Length":data.length}},function(res){
    if(res.statusCode===200){cb(null,"https://"+OSS+"/"+key)}else{var b="";res.on("data",function(c){b+=c});res.on("end",function(){cb("OSS:"+res.statusCode,null)})}
  });r.on("error",function(e){cb(e.message,null)});r.write(data);r.end();
}

// 调用阿里云动漫化 API
function cartoon(imgUrl,cb){
  var p={AccessKeyId:AK,Action:"GenerateHumanAnimeStyle",Format:"JSON",ImageURL:imgUrl,RegionId:"cn-shanghai",SignatureMethod:"HMAC-SHA1",SignatureNonce:Math.random().toString(36).substring(2,15),SignatureVersion:"1.0",Timestamp:new Date().toISOString().replace(/\.\d{3}/,""),Version:"2019-12-30"};
  var qs=Object.keys(p).sort().map(function(k){return enc(k)+"="+enc(p[k])}).join("&");
  var sig=crypto.createHmac("sha1",AS+"&").update("POST&"+enc("/")+"&"+enc(qs)).digest("base64");
  https.request("https://facebody.cn-shanghai.aliyuncs.com/?"+qs+"&Signature="+enc(sig),{method:"POST",headers:{"Content-Type":"application/json"}},function(res){var d="";res.on("data",function(c){d+=c});res.on("end",function(){try{cb(null,JSON.parse(d))}catch(e){cb(e.message,null)}})}).on("error",function(e){cb(e.message,null)}).end("{}");
}

http.createServer(function(req,res){
  res.setHeader("Access-Control-Allow-Origin","*");res.setHeader("Access-Control-Allow-Headers","Content-Type");res.setHeader("Access-Control-Allow-Methods","POST,OPTIONS");
  if(req.method==="OPTIONS"){res.writeHead(200);res.end();return}
  if(req.method==="POST"&&req.url==="/api/cartoon"){
    var c=[];req.on("data",function(d){c.push(d)});req.on("end",function(){
      try{
        var j=JSON.parse(Buffer.concat(c).toString());
        if(!j.image){res.end(JSON.stringify({error:"请上传图片"}));return}
        var buf=Buffer.from(j.image.replace(/^data:image\/\w+;base64,/,""),"base64");
        var key="img_"+Date.now()+".jpg";
        uploadOSS(key,buf,function(err,url){
          if(err){res.end(JSON.stringify({error:"上传失败:"+err}));return}
          cartoon(url,function(e2,d){
            if(e2){res.end(JSON.stringify({error:"AI调用失败:"+e2}))}
            else if(d&&d.Data&&d.Data.ImageURL){res.end(JSON.stringify({result:d.Data.ImageURL}))}
            else{res.end(JSON.stringify({error:"生成失败",msg:JSON.stringify(d).substring(0,200)}))}
          });
        });
      }catch(e){res.end(JSON.stringify({error:e.message}))}
    });return;
  }
  res.writeHead(200);res.end("Hm AI v1 OK");
}).listen(PORT,function(){console.log("Hm AI v1 @8088")});