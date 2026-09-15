import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';
const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Content-Type':'application/json'};
Deno.serve(async(req)=>{if(req.method==='OPTIONS')return new Response('ok',{headers});if(req.method!=='POST')return new Response('{}',{status:405,headers});
 const send=(body,status=200)=>new Response(JSON.stringify(body),{status,headers});
 try{const {email,password,name,token}=await req.json();if(typeof token!=='string'||token.length!==48||typeof email!=='string'||email.length>254||typeof password!=='string'||password.length<12||password.length>200||typeof name!=='string'||!name.trim()||name.length>80)return send({error:'Use a valid invitation, name, email, and a password of at least 12 characters.'},400);
 const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
 const {data:role,error:check}=await db.rpc('inspect_invite',{token});if(check||!role)return send({error:'This invitation is expired or has already been used.'},403);
 // Enrollment is authorized by a one-use bearer invitation, not by asserted email ownership.
 const {data,error}=await db.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{name,invite_enrolled:true}});if(error)return send({error:'Account could not be created. Try signing in if you already have an account.'},400);
 const {error:redeem}=await db.rpc('redeem_invite',{token,new_user:data.user.id,display_name:name.trim()});if(redeem){await db.auth.admin.deleteUser(data.user.id);return send({error:'Invitation could not be redeemed.'},409);}return send({ok:true});
 }catch{return send({error:'Enrollment failed. Please try again.'},400);}});
