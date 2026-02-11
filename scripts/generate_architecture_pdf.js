const { chromium } = require('playwright');
const path = require('path');

(async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();

    // HTML: Final Version (Blue + Original Layout)
    const htmlPath = path.join(__dirname, '..', 'doc', 'architecture_rich_final.html');
    const pdfPath = path.join(__dirname, '..', 'doc', 'hackathon_architecture_final.pdf');
    const fileUrl = `file://${htmlPath}`;

    console.log(`Navigating to: ${fileUrl}`);
    await page.goto(fileUrl, { waitUntil: 'networkidle' });

    console.log('Generating Final PDF...');
    await page.pdf({
        path: pdfPath,
        format: 'A4',
        landscape: true,
        printBackground: true,
        margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' }
    });

    console.log(`PDF generated successfully at: ${pdfPath} ✨`);
    await browser.close();
})();
