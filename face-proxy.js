var http=require("http"),crypto=require("crypto"),https=require("https"),PORT=8088;
var AK="YOUR_AK",AS="YOUR_AS";// 服务器端用 sed 替换
var BUCKET="qcqw-test",OSS="qcqw-test.oss-cn-shanghai.aliyuncs.com";

function enc(s){return encodeURIComponent(s).replace(/[!'()*]/g,function(c){return"%"+c.charCodeAt(0).toString(16).toUpperCase()})}

// 阿里云 API 通用调用
function callFacebody(params,cb){
  var p=Object.assign({AccessKeyId:AK,Format:"JSON",RegionId:"cn-shanghai",SignatureMethod:"HMAC-SHA1",SignatureNonce:Math.random().toString(36).substring(2,15),SignatureVersion:"1.0",Timestamp:new Date().toISOString().replace(/\.\d{3}/,""),Version:"2019-12-30"},params);
  var qs=Object.keys(p).sort().map(function(k){return enc(k)+"="+enc(p[k])}).join("&");
  var sig=crypto.createHmac("sha1",AS+"&").update("POST&"+enc("/")+"&"+enc(qs)).digest("base64");
  var bodyStr=JSON.stringify(params.Action==="DetectFace"?{ImageURL:p.ImageURL}:{});
  https.request("https://facebody.cn-shanghai.aliyuncs.com/?"+qs+"&Signature="+enc(sig),{method:"POST",headers:{"Content-Type":"application/json"}},function(res){var d="";res.on("data",function(c){d+=c});res.on("end",function(){try{cb(null,JSON.parse(d))}catch(e){cb(e.message,null)}})}).on("error",function(e){cb(e.message,null)}).end(bodyStr);
}

// 上传 OSS
function uploadOSS(key,data,cb){
  var date=new Date().toUTCString();
  var sign="PUT\n\nimage/jpeg\n"+date+"\n/"+BUCKET+"/"+key;
  var sig=crypto.createHmac("sha1",AS).update(sign).digest("base64");
  var r=https.request({hostname:OSS,path:"/"+key,method:"PUT",headers:{"Date":date,"Authorization":"OSS "+AK+":"+sig,"Content-Type":"image/jpeg","Content-Length":data.length}},function(res){
    if(res.statusCode===200){cb(null,"https://"+OSS+"/"+key)}else{cb("OSS:"+res.statusCode,null)}
  });r.on("error",function(e){cb(e.message,null)});r.write(data);r.end();
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
          // ★ 第1步：人脸检测，获取位置（自动裁剪优化）
          callFacebody({Action:"DetectFace",ImageURL:url},function(e2,faceData){
            var imgUrl=url;
            // 如果有人脸数据，记录但不额外裁剪（API 内部已优化）
            var hasFace=faceData&&faceData.Data&&faceData.Data.FaceProbabilityList&&faceData.Data.FaceProbabilityList.length>0&&faceData.Data.FaceProbabilityList[0]>0.5;
            // ★ 第2步：调用动漫化
            callFacebody({Action:"GenerateHumanAnimeStyle",ImageURL:imgUrl},function(e3,animeData){
              if(e3){res.end(JSON.stringify({error:"动漫化失败:"+e3}))}
              else if(animeData&&animeData.Data&&animeData.Data.ImageURL){
                res.end(JSON.stringify({result:animeData.Data.ImageURL,face:hasFace?"检测到人脸":"未检测到清晰人脸"}));
              }else{
                var raw=JSON.stringify(animeData).substring(0,300);
                if(raw.indexOf("InvalidImage")>-1){res.end(JSON.stringify({error:"图片质量不够，请上传清晰正面照"}));}
                else{res.end(JSON.stringify({error:"生成失败",msg:raw}));}
              }
            });
          });
        });
      }catch(e){res.end(JSON.stringify({error:e.message}))}
    });return;
  }
  res.writeHead(200);res.end("Hm AI v2 OK");
}).listen(PORT,function(){console.log("Hm AI v2 @8088")});