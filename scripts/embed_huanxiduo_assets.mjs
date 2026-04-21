import fs from 'node:fs';

const projectRoot = '/home/ubuntu/icloush-digital-platform';
const appPath = `${projectRoot}/apps/web-b2b/src/App.tsx`;
const testPath = `${projectRoot}/apps/web-b2b/src/App.test.tsx`;
const heroB64 = fs.readFileSync(`${projectRoot}/tmp_hxd_hero.b64`, 'utf8').trim();
const tdsB64 = fs.readFileSync(`${projectRoot}/tmp_hxd_tds.b64`, 'utf8').trim();

const heroDataUri = `data:image/jpeg;base64,${heroB64}`;
const tdsDataUri = `data:application/pdf;base64,${tdsB64}`;

let app = fs.readFileSync(appPath, 'utf8');
app = app.replace(/const heroMediaUrl = .*?;\n/, `const heroMediaUrl = ${JSON.stringify(heroDataUri)};\n`);
app = app.replace(/const tdsPlaceholderUrl = .*?;\n/, `const tdsPlaceholderUrl = ${JSON.stringify(tdsDataUri)};\n`);
fs.writeFileSync(appPath, app);

let test = fs.readFileSync(testPath, 'utf8');
test = test.replace('/manus-storage/hero-liquid-macro_48cca472.jpg', 'data:image/jpeg;base64,');
test = test.replace('/manus-storage/huanxiduo-tds-placeholder_49fb5e1d.pdf', 'data:application/pdf;base64,');
fs.writeFileSync(testPath, test);
