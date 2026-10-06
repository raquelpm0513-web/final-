const fs = require('fs');

const targets = [
  'assets/index-v1788893591132.js',
  'dist/assets/index-v1788893591132.js'
];

targets.forEach(targetPath => {
  let code = fs.readFileSync(targetPath, 'utf8');

  // 1. Fix the pageUrls.map div rendering where `key: idx,` was in props
  // Search for `children: pageUrls.map((url, idx) => u.jsxDEV('div', {`
  const targetSnippet1 = `children: pageUrls.map((url, idx) => u.jsxDEV('div', {
                    key: idx,
                    id: \`policy-page-\${idx + 1}\`,`;
  
  // Also check without indentation / formatting
  const regex1 = /children:\s*pageUrls\.map\(\(url,\s*idx\)\s*=>\s*u\.jsxDEV\('div',\s*\{\s*key:\s*idx,\s*id:\s*`policy-page-\$\{idx \+ 1\}`/;
  
  if (regex1.test(code)) {
    code = code.replace(
      regex1,
      `children: pageUrls.map((url, idx) => u.jsxDEV('div', {\n                    id: \`policy-page-\${idx + 1}\``
    );
    console.log('Removed key from props in pageUrls.map for:', targetPath);
  } else {
    // Try substring search
    const idx1 = code.indexOf(`id: \`policy-page-\${idx + 1}\``);
    if (idx1 !== -1) {
      const before = code.substring(idx1 - 60, idx1);
      console.log('Found policy-page context:', before);
      if (before.includes('key: idx,')) {
        code = code.replace('key: idx,', '');
        console.log('Replaced key: idx, in:', targetPath);
      }
    }
  }

  // Ensure the 3rd argument for pageUrls.map div is a unique string key
  // Replace `}, idx, !0))` with `}, \`policy-page-item-\${idx + 1}\`, !0, { fileName: "/app/applet/src/components/SecurityPolicyModal.tsx", lineNumber: 250 + idx, columnNumber: 21 }, this))`
  const oldDivEnd = `}, idx, !0))`;
  if (code.includes(oldDivEnd)) {
    code = code.replace(
      oldDivEnd,
      `}, \`policy-page-item-\${idx + 1}\`, !0, { fileName: "/app/applet/src/components/SecurityPolicyModal.tsx", lineNumber: 250 + idx, columnNumber: 21 }, this))`
    );
    console.log('Updated 3rd argument key for pageUrls.map in:', targetPath);
  }

  // 2. Ensure Array.from option has unique string key and source
  const oldOption = `children: \`Página \${i + 1} de \${totalPages}\`\n                        }, i, !1))`;
  const regexOpt = /children:\s*`Página \$\{i \+ 1\} de \$\{totalPages\}`\s*\}, i, !1\)\)/;
  if (regexOpt.test(code)) {
    code = code.replace(
      regexOpt,
      `children: \`Página \${i + 1} de \${totalPages}\`\n                        }, \`opt-page-\${i + 1}\`, !1, { fileName: "/app/applet/src/components/SecurityPolicyModal.tsx", lineNumber: 180 + i, columnNumber: 27 }, this))`
    );
    console.log('Updated key for select options in:', targetPath);
  }

  fs.writeFileSync(targetPath, code, 'utf8');
});

console.log('fix_keys.cjs completed.');
