import http from 'node:http';
const user={id:'00000000-0000-4000-8000-000000000001',aud:'authenticated',role:'authenticated',email:'activation-test@example.invalid',app_metadata:{provider:'email'},user_metadata:{},created_at:'2026-09-16T00:00:00Z'};
let wishlists=[];
const server=http.createServer(async(req,res)=>{
 res.setHeader('Access-Control-Allow-Origin',req.headers.origin||'*');
 res.setHeader('Access-Control-Allow-Headers',req.headers['access-control-request-headers']||'authorization,apikey,content-type,x-client-info,prefer,x-supabase-api-version');
 res.setHeader('Access-Control-Allow-Methods','GET,POST,DELETE,OPTIONS,PATCH');
 res.setHeader('Content-Type','application/json');
 if(req.method==='OPTIONS'){res.end();return;}
 const url=new URL(req.url,'http://localhost');
 let data=[];
 if(url.pathname==='/auth/v1/user') data=user;
 if(url.pathname==='/rest/v1/wishlists') {
  if(req.method==='POST') {let body='';for await(const chunk of req) body+=chunk;wishlists.push(JSON.parse(body));}
  if(req.method==='DELETE') wishlists=wishlists.filter(x=>x.facility_slug!==url.searchParams.get('facility_slug')?.replace('eq.',''));
  data=wishlists;
 }
 console.log(req.method,url.pathname);
 res.end(JSON.stringify(data));
});
server.listen(54321,'127.0.0.1',()=>console.log('Local synthetic auth fixture listening'));
