const fs = require('fs');

const originalDump = fs.readFileSync('footer_dump.js', 'utf8');

// Construct updated $8
const stateHeader = `function $8({currentPageId:i,onPageChange:a}){const [isPolicyModalOpen,setIsPolicyModalOpen]=P.useState(!1);const [policyStatus,setPolicyStatus]=P.useState({exists:!0,size:403236,pageCount:12,pages:[]});const fetchPolicyStatus=async()=>{try{const r=await fetch("/api/policy-status"),d=await r.json();setPolicyStatus(d)}catch(e){}};P.useEffect(()=>{fetchPolicyStatus()},[]);`;

// Replace function header
let updated = originalDump.replace('function $8({currentPageId:i,onPageChange:a}){', stateHeader);

// In the bottom bar, replace the old download <a> with modal opener button + download icon
const oldLinkStart = updated.indexOf('u.jsxDEV("a",{href:"/download-politica-seguridad"');
const oldLinkEnd = updated.indexOf('{fileName:"/app/applet/src/components/Footer.tsx",lineNumber:121,columnNumber:11},this),');

if (oldLinkStart !== -1 && oldLinkEnd !== -1) {
  const replacementLink = `u.jsxDEV("button",{onClick:()=>setIsPolicyModalOpen(!0),className:"text-gray-400 hover:text-[#00BFBF] transition-colors cursor-pointer flex items-center gap-1.5",title:"Ver Política de Seguridad",children:[u.jsxDEV("span",{children:"Política de Seguridad"},void 0,!1),u.jsxDEV("svg",{className:"w-3.5 h-3.5 text-[#00BFBF]",fill:"none",stroke:"currentColor",viewBox:"0 0 24 24",children:u.jsxDEV("path",{strokeLinecap:"round",strokeLinejoin:"round",strokeWidth:"2",d:"M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"},void 0,!1)},void 0,!1)]},void 0,!0),u.jsxDEV("a",{href:"/download-politica-seguridad",download:"POLÍTICA DE SEGURIDAD.pdf",target:"_blank",rel:"noopener noreferrer",className:"text-gray-400 hover:text-white transition-colors cursor-pointer flex items-center gap-1",title:"Descargar PDF",children:[u.jsxDEV("svg",{className:"w-3.5 h-3.5 text-[#00BFBF]",fill:"none",stroke:"currentColor",viewBox:"0 0 24 24",children:u.jsxDEV("path",{strokeLinecap:"round",strokeLinejoin:"round",strokeWidth:"2",d:"M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"},void 0,!1)},void 0,!1)]},void 0,!0),`;
  const endSlice = oldLinkEnd + '{fileName:"/app/applet/src/components/Footer.tsx",lineNumber:121,columnNumber:11},this),'.length;
  updated = updated.slice(0, oldLinkStart) + replacementLink + updated.slice(endSlice);
  console.log('Replaced download link with modal trigger + download icon');
} else {
  console.error('Could not find oldLink in footer_dump');
  process.exit(1);
}

// Add SecurityPolicyModal at the end of footer children:
// Right after `{fileName:"/app/applet/src/components/Footer.tsx",lineNumber:33,columnNumber:7},this)`
const targetMarker = '{fileName:"/app/applet/src/components/Footer.tsx",lineNumber:33,columnNumber:7},this)';
const targetIdx = updated.indexOf(targetMarker);
if (targetIdx !== -1) {
  const insertPos = targetIdx + targetMarker.length;
  const modalInsertion = `,u.jsxDEV(SecurityPolicyModal,{isOpen:isPolicyModalOpen,onClose:()=>setIsPolicyModalOpen(!1),policyStatus:policyStatus,onRefreshStatus:fetchPolicyStatus},void 0,!1)`;
  updated = updated.slice(0, insertPos) + modalInsertion + updated.slice(insertPos);
  console.log('Inserted SecurityPolicyModal in footer children');
} else {
  console.error('Could not find targetMarker');
  process.exit(1);
}

// Validate JS syntax
try {
  new Function(updated);
  console.log('SUCCESS! Updated $8 parsed cleanly without syntax errors!');
} catch (e) {
  console.error('Syntax error in updated $8:', e);
  process.exit(1);
}

// Apply to assets/index-v1788893591132.js and dist/assets/index-v1788893591132.js
const targets = [
  'assets/index-v1788893591132.js',
  'dist/assets/index-v1788893591132.js'
];

targets.forEach(targetPath => {
  const code = fs.readFileSync(targetPath, 'utf8');
  const f8Start = code.indexOf('function $8(');
  const q8Start = code.indexOf('function q8(');

  if (f8Start === -1 || q8Start === -1) {
    console.error('Could not find f8 or q8 in', targetPath);
    process.exit(1);
  }

  const newCode = code.slice(0, f8Start) + updated + code.slice(q8Start);
  fs.writeFileSync(targetPath, newCode, 'utf8');
  console.log('Successfully updated:', targetPath);
});
