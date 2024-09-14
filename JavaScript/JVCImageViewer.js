// ==UserScript==
// @name         JVC ImageViewer
// @namespace    http://tampermonkey.net/
// @version      1.32
// @description  Améliore la visualisation des images sur les topics de jeuxvideo.com en ajoutant un visualiseur enrichi avec des fonctionnalités telles que la navigation entre les images.
// @author       HulkDu92
// @match        https://*.jeuxvideo.com/forums/*
// @grant        none
// @run-at       document-end
// @license      MIT
// ==/UserScript==

// GreasyFork installation link
// https://greasyfork.org/fr/scripts/508447-jvc-imageviewer

(function() {
    'use strict';
 
    class ImageViewer {
        constructor(images, currentIndex) {
            this.images = images;
            this.currentIndex = currentIndex;
            this.createOverlay();
        }
 
        createOverlay() {
            this.overlay = document.createElement('div');
            this.overlay.style.position = 'fixed';
            this.overlay.style.top = 0;
            this.overlay.style.left = 0;
            this.overlay.style.width = '100%';
            this.overlay.style.height = '100%';
            this.overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
            this.overlay.style.display = 'flex';
            this.overlay.style.alignItems = 'center';
            this.overlay.style.justifyContent = 'center';
            this.overlay.style.zIndex = 10000;
 
            this.imgElement = document.createElement('img');
            this.imgElement.style.maxWidth = '90%';
            this.imgElement.style.maxHeight = '80%';
            this.imgElement.style.objectFit = 'contain';
            this.imgElement.style.transition = 'opacity 0.3s';
            this.imgElement.style.opacity = 0;
            this.imgElement.style.cursor = 'pointer';
 
            this.spinner = document.createElement('div');
            this.spinner.style.position = 'absolute';
            this.spinner.style.border = '8px solid #f3f3f3';
            this.spinner.style.borderTop = '8px solid #3498db';
            this.spinner.style.borderRadius = '50%';
            this.spinner.style.width = '50px';
            this.spinner.style.height = '50px';
            this.spinner.style.animation = 'spin 1s linear infinite';
            this.spinner.style.zIndex = 10001;
 
            this.prevButton = document.createElement('button');
            this.prevButton.innerText = '<';
            this.prevButton.style.position = 'absolute';
            this.prevButton.style.left = '10px';
            this.prevButton.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
            this.prevButton.style.color = 'white';
            this.prevButton.style.fontSize = '24px';
            this.prevButton.style.border = 'none';
            this.prevButton.style.borderRadius = '50%';
            this.prevButton.style.width = '40px';
            this.prevButton.style.height = '40px';
            this.prevButton.style.cursor = 'pointer';
            this.prevButton.style.display = 'flex';
            this.prevButton.style.alignItems = 'center';
            this.prevButton.style.justifyContent = 'center';
            this.prevButton.style.boxShadow = '0px 4px 8px rgba(0, 0, 0, 0.6)';
            this.prevButton.style.transition = 'background-color 0.3s, transform 0.3s';
 
            this.nextButton = document.createElement('button');
            this.nextButton.innerText = '>';
            this.nextButton.style.position = 'absolute';
            this.nextButton.style.right = '10px';
            this.nextButton.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
            this.nextButton.style.color = 'white';
            this.nextButton.style.fontSize = '24px';
            this.nextButton.style.border = 'none';
            this.nextButton.style.borderRadius = '50%';
            this.nextButton.style.width = '40px';
            this.nextButton.style.height = '40px';
            this.nextButton.style.cursor = 'pointer';
            this.nextButton.style.display = 'flex';
            this.nextButton.style.alignItems = 'center';
            this.nextButton.style.justifyContent = 'center';
            this.nextButton.style.boxShadow = '0px 4px 8px rgba(0, 0, 0, 0.6)';
            this.nextButton.style.transition = 'background-color 0.3s, transform 0.3s';
 
            this.closeButton = document.createElement('button');
            this.closeButton.innerText = '✕';
            this.closeButton.style.position = 'absolute';
            this.closeButton.style.top = '80px';
            this.closeButton.style.right = '10px';
            this.closeButton.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
            this.closeButton.style.color = 'white';
            this.closeButton.style.fontSize = '20px';
            this.closeButton.style.border = 'none';
            this.closeButton.style.borderRadius = '50%';
            this.closeButton.style.width = '40px';
            this.closeButton.style.height = '40px';
            this.closeButton.style.cursor = 'pointer';
            this.closeButton.style.zIndex = 10001;
 
            this.infoText = document.createElement('div');
            this.infoText.style.position = 'absolute';
            this.infoText.style.bottom = '10px';
            this.infoText.style.right = '10px';
            this.infoText.style.color = 'white';
            this.infoText.style.fontSize = '16px';
            this.infoText.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
            this.infoText.style.padding = '5px';
            this.infoText.style.borderRadius = '5px';
            this.infoText.style.zIndex = 10001;
 
            this.updateImage();
 
            this.prevButton.addEventListener('click', () => this.changeImage(-1));
            this.nextButton.addEventListener('click', () => this.changeImage(1));
            this.closeButton.addEventListener('click', () => this.closeViewer());
            this.overlay.addEventListener('click', (event) => {
                if (event.target === this.overlay) {
                    this.closeViewer();
                }
            });
 
            this.imgElement.addEventListener('click', () => {
                window.open(this.images[this.currentIndex].href, '_blank');
            });
 
            this.overlay.appendChild(this.imgElement);
            this.overlay.appendChild(this.spinner);
            this.overlay.appendChild(this.prevButton);
            this.overlay.appendChild(this.nextButton);
            this.overlay.appendChild(this.closeButton);
            this.overlay.appendChild(this.infoText);
            document.body.appendChild(this.overlay);
        }
 
        updateImage() {
            let originalSrc = this.images[this.currentIndex].href;
            this.imgElement.src = originalSrc;
            this.infoText.textContent = `${this.currentIndex + 1} / ${this.images.length}`;
 
            this.imgElement.onload = () => {
                this.imgElement.style.opacity = 1;
                this.spinner.style.display = 'none';
            };
 
            this.imgElement.onerror = () => this.handleImageError();
        }
 
        handleImageError() {
            let miniUrl = this.images[this.currentIndex].querySelector('img').getAttribute('src');
            let updatedUrl = miniUrl.replace('/minis/', '/fichiers/').replace('.png', '.jpg');
 
            this.imgElement.src = updatedUrl;
 
            this.imgElement.onerror = () => {
                let secondTryUrl = miniUrl.replace('/minis/', '/fichiers/').replace('.jpg', '.png');
                this.imgElement.src = secondTryUrl;
 
                this.imgElement.onerror = () => {
                    this.imgElement.src = miniUrl;
 
                    this.imgElement.onerror = () => {
                        // alert("L'image n'a pas pu être chargée. Passons à la suivante.");
                        // this.changeImage(1);
                    };
                };
            };
        }
 
        changeImage(direction) {
            this.currentIndex = (this.currentIndex + direction + this.images.length) % this.images.length;
            this.imgElement.style.opacity = 0;
            this.spinner.style.display = 'block';
            this.updateImage();
        }
 
        closeViewer() {
            document.body.removeChild(this.overlay);
        }
    }
 
    const style = document.createElement('style');
    style.textContent = `
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    `;
    document.head.appendChild(style);
 
    // Fonction pour ajouter les listeners
    function addListeners() {
        document.querySelectorAll('.txt-msg a').forEach(link => {
            link.addEventListener('click', function(event) {
                // event.stopImmediatePropagation(); // Arrête la propagation de l'événement
                console.log("click détecté");
                const imgElement = this.querySelector('img');
 
                if (imgElement) {
                    event.preventDefault();
                    console.log("Image détectée, ouverture du visualiseur");
 
                    const images = Array.from(this.closest('.txt-msg').querySelectorAll('a')).filter(imgLink => imgLink.querySelector('img'));
                    const currentIndex = images.indexOf(this);
                    new ImageViewer(images, currentIndex);
                } else {
                    console.log("Pas une image, lien laissé intact : " + this.href);
                }
            }, true);
        });
    }
 
    // MutationObserver pour surveiller les changements dans le DOM
    const observer = new MutationObserver(() => {
        addListeners();
    });
 
    const targetNode = document.querySelector('#page-messages-forum');
 
    const config = { childList: true, subtree: true };
    if (targetNode) {
        observer.observe(targetNode, config);
    }
 
    addListeners();
})();