// Supabase Edge Function entry. Deploying it is a separate owner-approved production action.
// The service credential and database URL are the platform's own function environment; none is
// passed by callers, stored in the repository or returned in a response.
import postgres from 'npm:postgres@3.4.5';
import {createClient} from 'npm:@supabase/supabase-js@2.46.1';
import {handleUpload,approvalQuery,derivativeCacheSeconds} from './handler.js';

const bucket='jwl-product-media';
const projectUrl=Deno.env.get('SUPABASE_URL')!;
const sql=postgres(Deno.env.get('SUPABASE_DB_URL')!,{max:1,prepare:false});
const storage=createClient(projectUrl,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}}).storage.from(bucket);
const hex=(buffer:ArrayBuffer)=>[...new Uint8Array(buffer)].map(b=>b.toString(16).padStart(2,'0')).join('');

Deno.serve(request=>handleUpload(request,{
  public_base:new URL(`/storage/v1/object/public/${bucket}/`,projectUrl).href,
  approved:async(url:string,sha256:string,bytes:number,width:number,height:number)=>(await sql.unsafe(approvalQuery,[url,sha256,bytes,width,height])).length===1,
  put:async(path:string,bytes:Uint8Array)=>{
    const {error}=await storage.upload(path,bytes,{contentType:'image/webp',cacheControl:String(derivativeCacheSeconds),upsert:false});
    if(!error)return 'uploaded';
    if(/exists|duplicate/i.test(error.message))return 'exists';
    throw error;
  },
  get:async(path:string)=>{const {data,error}=await storage.download(path);if(error)throw error;return new Uint8Array(await data.arrayBuffer());},
  digest:async(bytes:Uint8Array)=>hex(await crypto.subtle.digest('SHA-256',bytes as Uint8Array<ArrayBuffer>)),
}));
