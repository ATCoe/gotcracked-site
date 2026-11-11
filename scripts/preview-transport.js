/* Served ONLY by the local preview server in place of supabase.js. Never referenced by production HTML. */
(() => {
 const saved=new Map();
 const invoke=async(name,options={})=>{
  if(name==='public-media')return {data:{posts:[],settings:{store_hours:{mon:['10:00','20:00'],tue:['10:00','20:00'],wed:['10:00','20:00'],thu:['10:00','20:00'],fri:['10:00','20:00'],sat:['10:00','18:00'],sun:null},accepts_mail_in_repairs:true}},error:null};
  if(name==='public-intake'){
   const payload=options.body||{};
   if(saved.has(payload.clientRequestId))return {data:saved.get(payload.clientRequestId),error:null};
   const data={reference:'PREVIEW-ONLY',appointmentId:payload.serviceMode==='walk_in'?'preview-appointment':null,authorizationReceivedAt:new Date().toISOString(),timingGuidance:'Preview Only — No Request Sent to the Shop.'};
   saved.set(payload.clientRequestId,data);return {data,error:null};
  }
  return {data:null,error:{message:'This action is unavailable in the local preview.'}};
 };
 window.supabaseClient={functions:{invoke}};
 window.GotCrackedSupabaseResilience={run:async(_name,action)=>action()};
 const notice=document.createElement('div');notice.textContent='LOCAL PREVIEW · Forms Are Simulated · No Requests Are Sent';notice.style.cssText='position:fixed;bottom:0;left:0;right:0;z-index:1000;background:#234265;color:white;text-align:center;font:12px/1.5 sans-serif;padding:5px;pointer-events:none';document.body.append(notice);
})();
