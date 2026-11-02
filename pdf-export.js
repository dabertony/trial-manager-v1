/* Générateur PDF autonome pour la PWA Trial Manager.
 * Aucun service distant ni dépendance réseau : les pages sont rendues localement
 * puis intégrées dans un PDF A4 (images JPEG haute résolution).
 */
(function(){
  'use strict';
  const A4 = { portrait:[595.276,841.89], landscape:[841.89,595.276] };
  const fromDataURL = data => {
    const binary = atob(data.slice(data.indexOf(',') + 1));
    const out = new Uint8Array(binary.length);
    for(let i=0;i<binary.length;i++) out[i]=binary.charCodeAt(i);
    return out;
  };
  const ascii = value => new TextEncoder().encode(value);
  function makePdf(pages, landscape){
    const size = landscape ? A4.landscape : A4.portrait;
    const objects = [];
    const add = value => { objects.push(value); return objects.length; };
    const catalogId = add('');
    const pagesId = add('');
    const pageIds = [];
    pages.forEach((page,index)=>{
      const imageBytes = fromDataURL(page.dataUrl);
      const imageId = add({stream:imageBytes,dict:`/Type /XObject /Subtype /Image /Width ${page.width} /Height ${page.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode`});
      const fit = Math.min(size[0] / page.width, size[1] / page.height);
      const drawW = page.width * fit, drawH = page.height * fit;
      const offsetX = (size[0] - drawW) / 2, offsetY = (size[1] - drawH) / 2;
      const content = `q\n${drawW.toFixed(3)} 0 0 ${drawH.toFixed(3)} ${offsetX.toFixed(3)} ${offsetY.toFixed(3)} cm\n/Im${index+1} Do\nQ\n`;
      const contentId = add({stream:ascii(content),dict:''});
      const pageId = add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${size[0].toFixed(3)} ${size[1].toFixed(3)}] /Resources << /XObject << /Im${index+1} ${imageId} 0 R >> >> /Contents ${contentId} 0 R >>`);
      pageIds.push(pageId);
    });
    objects[catalogId-1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
    objects[pagesId-1] = `<< /Type /Pages /Kids [${pageIds.map(id=>`${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`;
    const chunks=[ascii('%PDF-1.4\n%âãÏÓ\n')];
    const offsets=[0]; let length=chunks[0].length;
    objects.forEach((obj,i)=>{
      offsets.push(length);
      const head=ascii(`${i+1} 0 obj\n`); chunks.push(head); length+=head.length;
      if(obj && typeof obj==='object' && obj.stream){
        const dict=ascii(`<< ${obj.dict} /Length ${obj.stream.length} >>\nstream\n`); chunks.push(dict); length+=dict.length;
        chunks.push(obj.stream); length+=obj.stream.length;
        const tail=ascii('\nendstream\nendobj\n'); chunks.push(tail); length+=tail.length;
      } else {
        const body=ascii(`${obj}\nendobj\n`); chunks.push(body); length+=body.length;
      }
    });
    const xrefOffset=length;
    let xref=`xref\n0 ${objects.length+1}\n0000000000 65535 f \n`;
    for(let i=1;i<offsets.length;i++) xref+=`${String(offsets[i]).padStart(10,'0')} 00000 n \n`;
    xref+=`trailer\n<< /Size ${objects.length+1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
    chunks.push(ascii(xref));
    return new Blob(chunks,{type:'application/pdf'});
  }
  async function deliver(blob, filename){
    const file = new File([blob],filename,{type:'application/pdf'});
    if(navigator.share && navigator.canShare){
      try {
        if(navigator.canShare({files:[file]})){
          await navigator.share({files:[file],title:filename});
          return true;
        }
      } catch(error){
        if(error && error.name==='AbortError') return false;
        console.warn('Partage PDF indisponible, tentative de téléchargement.',error);
      }
    }
    const url=URL.createObjectURL(blob);
    const link=document.createElement('a');
    link.href=url; link.download=filename; link.style.display='none';
    document.body.appendChild(link); link.click(); link.remove();
    setTimeout(()=>URL.revokeObjectURL(url),60000);
    return true;
  }
  async function elementToJpeg(element, scale=2){
    const rect=element.getBoundingClientRect();
    const isCravatePage=element.classList.contains('cravate-page');
    const width=Math.ceil(Math.max(rect.width,element.scrollWidth,isCravatePage?1:1000));
    const height=element.classList.contains('double-pointage')
      ? Math.max(1,(element.tBodies[0]?.rows.length || 43)*25+100)
      : Math.ceil(Math.max(rect.height,element.scrollHeight,1));
    const clone=element.cloneNode(true);
    if(!isCravatePage){clone.style.width=`${width}px`;clone.style.margin='0';clone.style.boxSizing='border-box';}
    clone.querySelectorAll('button,.no-pdf,.ranking-pdf-modal').forEach(node=>node.remove());
    // Inline SVG du logo UFOLEP : aucune image distante dans le rendu PDF.
    const logo=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 190"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#b21b70"/><stop offset=".22" stop-color="#e74742"/><stop offset=".42" stop-color="#f29b2e"/><stop offset=".62" stop-color="#d4c747"/><stop offset=".82" stop-color="#79bb88"/><stop offset="1" stop-color="#2e9b9b"/></linearGradient></defs><text x="260" y="105" text-anchor="middle" font-family="Arial,sans-serif" font-size="100" font-style="italic" font-weight="700" fill="url(#g)">ufolep</text><text x="260" y="151" text-anchor="middle" font-family="Arial,sans-serif" font-size="25" font-weight="700" fill="#606060">TOUS LES SPORTS</text><text x="260" y="180" text-anchor="middle" font-family="Arial,sans-serif" font-size="25" font-weight="700" fill="#239b9b">AUTREMENT</text></svg>`;
    const parser=new DOMParser();
    const logoDoc=parser.parseFromString(logo,'image/svg+xml');
    logoDoc.documentElement.setAttribute('class','ufolep-ranking-logo');
    logoDoc.documentElement.setAttribute('xmlns','http://www.w3.org/2000/svg');
    clone.querySelectorAll('img.ufolep-ranking-logo').forEach(img=>img.replaceWith(document.importNode(logoDoc.documentElement,true)));
    if(clone.classList.contains('cravate-page')){
      clone.style.fontFamily='Arial,Helvetica,sans-serif';
      clone.style.color='#111';
      clone.style.background='#fff';
    }
    const images=Array.from(clone.querySelectorAll('img'));
    for(const img of images){
      if(img.src && !img.src.startsWith('data:')){
        try{
          const response=await fetch(img.src,{cache:'force-cache'});
          if(!response.ok) throw new Error('Image indisponible');
          const blob=await response.blob();
          img.src=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(blob);});
        }catch(error){img.remove();}
      }
    }
    let css='';
    for(const sheet of Array.from(document.styleSheets)){
      try{
        for(const rule of Array.from(sheet.cssRules)){
          // Le PDF reprend aussi les règles prévues pour l'impression, sans
          // demander au navigateur d'ouvrir sa propre boîte d'impression.
          if(rule.type===4 && /print/i.test(rule.conditionText || rule.media?.mediaText || '')){
            css+=Array.from(rule.cssRules).map(child=>child.cssText).join('\n')+'\n';
          }else{
            css+=rule.cssText+'\n';
          }
        }
      }catch(_){/* feuille externe non lisible */}
    }
    const inlineStyles=Array.from(clone.querySelectorAll('style')).map(s=>s.textContent).join('\n');
    const cloneMarkup=clone.outerHTML.replace(/<(img|br|hr|input|meta|link|source|wbr)(\b[^>]*?)>/gi,'<$1$2 />');
    const html=`<div xmlns="http://www.w3.org/1999/xhtml" id="app" style="margin:0!important;padding:0!important;width:${width}px!important;min-height:${height}px!important;background:#fff!important;color:#111!important;overflow:hidden!important;"><style>${css}\n${inlineStyles}\nhtml,body{margin:0!important;padding:0!important;background:#fff!important;color:#111!important;}*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;} .double-pointage-print-header-row>th{padding:0!important;border:0!important}.double-pointage-print-header{display:flex!important;align-items:center!important;justify-content:center!important;position:relative!important;box-sizing:border-box!important;width:100%!important;min-height:19mm!important;padding:1mm 42mm 1mm 2mm!important;background:#fff!important;color:#111!important}.double-pointage-print-heading{display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;width:100%!important;gap:1mm!important}.double-pointage-print-title{display:block!important;width:100%!important;text-align:center!important;font-size:22pt!important;line-height:1.1!important;font-weight:800!important;color:#111!important}.double-pointage-print-date{display:block!important;text-align:center!important;font-size:13pt!important;line-height:1.1!important;font-weight:600!important;color:#111!important}.double-pointage-print-zone{position:absolute!important;right:2mm!important;top:50%!important;transform:translateY(-50%)!important;display:flex!important;align-items:center!important;gap:2mm!important;font-size:14pt!important;font-weight:800!important;white-space:nowrap!important;color:#111!important}.double-pointage-zone-circle{display:inline-block!important;width:15mm!important;height:15mm!important;min-width:15mm!important;min-height:15mm!important;border:2px solid #111!important;border-radius:50%!important;box-sizing:border-box!important;background:#fff!important}.cravate-page{margin:0!important;border:0!important;box-shadow:none!important}</style>${cloneMarkup}</div>`;
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xhtml="http://www.w3.org/1999/xhtml" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><foreignObject x="0" y="0" width="${width}" height="${height}">${html}</foreignObject></svg>`;
    const url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml;charset=utf-8'}));
    try{
      const image=await new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(new Error('Le rendu de la page PDF a échoué sur cet appareil.'));img.src=url;});
      const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.ceil(width*scale));canvas.height=Math.max(1,Math.ceil(height*scale));
      const ctx=canvas.getContext('2d',{alpha:false});ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,0,0,canvas.width,canvas.height);
      return {dataUrl:canvas.toDataURL('image/jpeg',0.94),width:canvas.width,height:canvas.height};
    }finally{URL.revokeObjectURL(url);}
  }
  async function exportElements(elements, filename, landscape){
    const pages=[];
    for(const element of elements){
      const page=await elementToJpeg(element,2);
      pages.push(page);
    }
    if(!pages.length) throw new Error('Aucune page à exporter.');
    return deliver(makePdf(pages,landscape),filename);
  }
  window.TMDirectPDF={exportElements,elementToJpeg,makePdf};
})();
