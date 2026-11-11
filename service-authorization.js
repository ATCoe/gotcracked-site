/* Accessible electronic authorization. No drafts, signatures or contact details are persisted in browser storage. */
(() => {
  'use strict';
  const form = document.querySelector('#booking-form');
  const canvas = document.querySelector('#signature-canvas');
  if (!form || !canvas) return;
  const method = form.elements.signatureMethod, drawing = form.elements.signatureDrawing;
  const panel = document.querySelector('[data-signature-draw]');
  const ctx = canvas.getContext('2d');
  let active = false, points = [], strokes = [], distance = 0, last = null;
  const redraw = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#182335'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const stroke of strokes) { ctx.beginPath(); stroke.forEach(([x,y],i)=>i ? ctx.lineTo(x,y) : ctx.moveTo(x,y)); ctx.stroke(); }
  };
  const serialize = () => { drawing.value = distance >= 25 ? JSON.stringify(strokes) : ''; };
  const point = event => { const r = canvas.getBoundingClientRect(); return [Math.round((event.clientX-r.left)*canvas.width/r.width),Math.round((event.clientY-r.top)*canvas.height/r.height)]; };
  canvas.addEventListener('pointerdown', event => { if (event.button !== 0 || !event.isPrimary) return; active = true; canvas.setPointerCapture(event.pointerId); points = [point(event)]; strokes.push(points); last=points[0]; });
  canvas.addEventListener('pointermove', event => { if (!active || !event.isPrimary || strokes.flat().length >= 4000) return; const p=point(event); distance+=Math.hypot(p[0]-last[0],p[1]-last[1]); points.push(p); last=p; redraw(); });
  const end = () => { active=false; serialize(); };
  canvas.addEventListener('pointerup',end); canvas.addEventListener('pointercancel',end);
  document.querySelector('#clear-signature').addEventListener('click',()=>{strokes=[];points=[];distance=0;drawing.value='';redraw();});
  method.addEventListener('change',()=>{panel.hidden=method.value!=='drawn';document.querySelector('#signature-error').textContent='';});
  window.GotCrackedAuthorization = {
    validate() {
      if (method.value !== 'drawn' || drawing.value) return true;
      const error=document.querySelector('#signature-error'); error.textContent='Draw your signature, or choose Type My Signature.';
      method.focus(); return false;
    },
    receipt(data,payload) {
      const record=document.querySelector('#authorization-receipt'); if(!record)return;
      record.replaceChildren();
      for (const [label,value] of Object.entries({Reference:data.reference,Name:payload.signatureName,Device:payload.model,Received:data.authorizationReceivedAt||'Recorded by GotCracked',Version:payload.termsVersion,Authorization:document.querySelector('#authorization-terms-text').textContent})) {
        const p=document.createElement('p'),b=document.createElement('strong');b.textContent=label+': ';p.append(b,document.createTextNode(value));record.append(p);
      }
      if(payload.signatureMethod==='drawn'){const img=document.createElement('img');img.src=canvas.toDataURL('image/png');img.alt='Your Submitted Signature';record.append(img);}
      record.hidden=false;
    }
  };
  document.querySelector('#print-authorization').addEventListener('click',()=>window.print());
})();
