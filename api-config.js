export default async function handler(req,res){
  if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});
  res.setHeader('Cache-Control','no-store');
  res.status(200).json({supabaseUrl:process.env.SUPABASE_URL||'',supabaseAnonKey:process.env.SUPABASE_ANON_KEY||'',cloudEnabled:Boolean(process.env.SUPABASE_URL&&process.env.SUPABASE_ANON_KEY)});
}
