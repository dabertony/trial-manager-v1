const fs = require('fs');
const vm = require('vm');
const { Blob } = require('buffer');
const context = { window:{}, Blob, TextEncoder, atob, console, URL, File: class File {}, navigator:{} };
vm.runInNewContext(fs.readFileSync(require('path').join(__dirname,'..','pdf-export.js'),'utf8'),context);
const jpeg='data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAb/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAH/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAE/AI//xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAEDAQE/AI//xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAECAQE/AI//xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAY/AI//xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAE/AI//2Q==';
(async()=>{
  const blob=context.window.TMDirectPDF.makePdf([{dataUrl:jpeg,width:1,height:1},{dataUrl:jpeg,width:1,height:1}],true);
  const bytes=Buffer.from(await blob.arrayBuffer());
  if(!bytes.subarray(0,8).toString('ascii').startsWith('%PDF-1.4')) throw new Error('PDF header missing');
  fs.writeFileSync('/tmp/tm-direct-test.pdf',bytes);
  const pageCount=(bytes.toString('latin1').match(/\/Type \/Page\b/g)||[]).length;
  if(pageCount!==2) throw new Error(`Expected 2 pages, got ${pageCount}`);
  console.log('PASS: direct PDF generator creates a valid two-page PDF structure.');
})().catch(error=>{console.error(error);process.exit(1);});
