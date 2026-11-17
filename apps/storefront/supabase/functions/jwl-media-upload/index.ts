// Supabase Edge Function entry. Deploying it is a separate owner-approved production action.
// The service credential and database URL are the platform's own function environment; none is
// passed by callers, stored in the repository or returned in a response.
// PUT uploads one approval-bound derivative; POST completes recorded approvals by exact candidate id.
import postgres from 'npm:postgres@3.4.5';
import {createClient} from 'npm:@supabase/supabase-js@2.46.1';
import {handleUpload,handleCompletion,approvalQueryFor,usableQuery,completionStateQuery,storedQuery,publishQuery,derivativeCacheSeconds} from './handler.js';

const bucket='jwl-product-media';
const projectUrl=Deno.env.get('SUPABASE_URL')!;
const sql=postgres(Deno.env.get('SUPABASE_DB_URL')!,{max:1,prepare:false});
const storage=createClient(projectUrl,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}}).storage.from(bucket);
const hex=(buffer:ArrayBuffer)=>[...new Uint8Array(buffer)].map(b=>b.toString(16).padStart(2,'0')).join('');
const public_base=new URL(`/storage/v1/object/public/${bucket}/`,projectUrl).href;
const approved=async(url:string,sha256:string,bytes:number,width:number,height:number,candidate?:string)=>{
  const ready=(await sql.unsafe(usableQuery))[0]?.ready===true;
  const params:(string|number)[]=[url,sha256,bytes,width,height];
  if(candidate!==undefined)params.push(candidate);
  return (await sql.unsafe(approvalQueryFor(ready,candidate!==undefined),params)).length===1;
};
const get=async(path:string)=>{const {data,error}=await storage.download(path);if(error)throw error;return new Uint8Array(await data.arrayBuffer());};
const digest=async(bytes:Uint8Array)=>hex(await crypto.subtle.digest('SHA-256',bytes as Uint8Array<ArrayBuffer>));

Deno.serve(request=>request.method==='POST'?handleCompletion(request,{
  public_base,approved,get,digest,
  state:async(candidate:string)=>(await sql.unsafe(completionStateQuery,[candidate]))[0]??null,
  present:async(paths:string[])=>new Set((await sql.unsafe(storedQuery,[bucket,JSON.stringify(paths)])).map(row=>String(row.name))),
  // A database refusal (the publication function's own exception or another server error) is reported with its
  // code and message only; a connection failure is thrown and reported as unconfirmed.
  publish:async(candidate:string,revision:string,variants:unknown)=>{
    try{return (await sql.unsafe(publishQuery,[candidate,revision,JSON.stringify(variants)])).length===1?'published':'changed';}
    catch(error){const e=error as {severity?:string,code?:string,message?:string};if(e.severity)return {refused:`${e.code} ${e.message}`};throw error;}
  },
}):handleUpload(request,{
  public_base,approved,get,digest,
  put:async(path:string,bytes:Uint8Array)=>{
    const {error}=await storage.upload(path,bytes,{contentType:'image/webp',cacheControl:String(derivativeCacheSeconds),upsert:false});
    if(!error)return 'uploaded';
    if(/exists|duplicate/i.test(error.message))return 'exists';
    throw error;
  },
}));
