// GitHub Pages has no server-side routing. Copying index.html to 404.html makes
// deep links (for example /take-with/listing/123) open the app instead of an error page.
const fs = require('fs');
const path = require('path');
const dist = path.join(__dirname, '../dist');
fs.copyFileSync(path.join(dist, 'index.html'), path.join(dist, '404.html'));
fs.writeFileSync(path.join(dist, '.nojekyll'), '');
console.log('postexport: 404.html and .nojekyll written');
