const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto('https://www.jeuxvideo.com/forums/42-51-74793440-1-0-1-0-officiel-jeux-paralympiques-de-paris-2024-du-28-aout-au-8-septembre.htm');
  
  // Simuler un clic sur l'image
  const imageLink = await page.$('.txt-msg a img, .message a img, .conteneur-message.mb-3 a img, .bloc-editor-forum a img, .signature-msg a img, .previsu-editor a img, .bloc-description-desc.txt-enrichi-desc-profil a img, .bloc-signature-desc.txt-enrichi-desc-profil a img');
  if (imageLink) {
      await imageLink.click();
  } else {
      console.log("No image found");
  }

  // Vérifier que le slideshow s'affiche
  const isSlideshowVisible = await page.$('.jvc-image-viewer') !== null;
  console.log(`Slideshow visible: ${isSlideshowVisible}`);

  await browser.close();
})();
