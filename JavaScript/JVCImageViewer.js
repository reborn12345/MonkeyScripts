// ==UserScript==
// @name         JVC_ImageViewer
// @namespace    http://tampermonkey.net/
// @version      1.38.4
// @description  Naviguer entre les images d'un post sous forme de slideshow en cliquant sur une image sans ouvrir NoelShack.
// @author       HulkDu92
// @match        https://*.jeuxvideo.com/forums/*
// @match        https://jvarchive.com/forums/*
// @grant        none
// @run-at       document-end
// @license      MIT
// @downloadURL https://update.greasyfork.org/scripts/508447/JVC_ImageViewer.user.js
// @updateURL https://update.greasyfork.org/scripts/508447/JVC_ImageViewer.meta.js
// ==/UserScript==

(function() {
    'use strict';

    class ImageViewer {
        constructor() {
            if (ImageViewer.instance) {
                return ImageViewer.instance;
            }

            this.images = [];
            this.currentIndex = 0;
            this.overlay = null;
            this.imgElement = null;
            this.spinner = null;
            this.prevButton = null;
            this.nextButton = null;
            this.closeButton = null;
            this.infoText = null;
            this.indicatorsContainer = null;
            this.indicators = [];
            this.zoomLevel = 1;
            this.isDragging = false;
            this.isPinchZooming = false;
            this.startX = 0;
            this.startY = 0;
            this.offsetX = 0;
            this.offsetY = 0;
            this.xDown = null;
            this.yDown = null;
            this.initialDistance = null;
            this.startTouches = [];
            this.isSwiping = false;
            this.isScaling = false;
            this.imageElementScale = 1;
            this.start = {};
            this.isMouseDown = false; // Suivi de l'état du clic
            this.isTouchDragging = false; // Suivi de l'état de la pression
            this.dragTimeout = null;
            this.mouseDownX = 0;
            this.mouseDownY = 0;
            this.initialScale = 1;

            ImageViewer.instance = this;

            this.createOverlay();
            this.updateImage();
        }

        // Crée et configure les éléments du visualiseur d'images (overlay, boutons, texte d'information, etc.)
        createOverlay() {
            this.overlay = this.createElement('div', {
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10000
            });

            this.imgElement = this.createElement('img', {
                maxWidth: '90%',
                maxHeight: '80%',
                objectFit: 'contain',
                transition: 'opacity 0.3s',
                opacity: 0,
                cursor: 'pointer'
            });

            this.spinner = this.createSpinner();
            this.prevButton = this.createButton('<', 'left');
            this.nextButton = this.createButton('>', 'right');
            this.closeButton = this.createCloseButton();
            this.infoText = this.createInfoText();

            this.indicatorsContainer = this.createElement('div', {
                display: 'flex',
                justifyContent: 'center',
                marginBottom: '10px 0',
                position: 'absolute',
                bottom: '40px',
            });


            // Événements associés aux boutons et à l'overlay
            this.addEventListeners();

            // Ajout des éléments au DOM
            this.overlay.append(this.imgElement, this.spinner, this.prevButton, this.nextButton, this.closeButton,  this.indicatorsContainer, this.infoText);
            document.body.appendChild(this.overlay);
        }

        // Crée un élément HTML avec des styles
        createElement(tag, styles = {}) {
            const element = document.createElement(tag);
            Object.assign(element.style, styles);
            return element;
        }

        // Crée le bouton précédent ou suivant
        createButton(text, position) {

          const isMobileDevice = isMobile();

          const button = this.createElement('button', {
              position: 'absolute',
              [position]: '5px',
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              color: 'white',
              fontSize: isMobileDevice ? '18px' : '22px',//'22px',
              border: 'none',
              borderRadius: '50%',
              width:  isMobileDevice ? '35px' : '40px',//'40px',
              height: isMobileDevice ? '35px' : '40px',//'40px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.6)',
              transition: 'background-color 0.3s, transform 0.3s'
          });


          button.textContent = text;
          this.addButtonEffects(button);

          return button;
      }

        // Crée le bouton de fermeture
        createCloseButton() {
            const isMobileDevice = isMobile();

            const button = this.createElement('button', {
                position: 'absolute',
                top: '80px',
                right: '10px',
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                color: 'white',
                fontSize: isMobileDevice ? '18px' : '14px',//'14px',
                border: 'none',
                borderRadius: '50%',
                width: isMobileDevice ? '40px' : '35px', //'35px',
                height: isMobileDevice ? '40px' : '35px', //'35px',
                cursor: 'pointer',
                zIndex: 10001
            });

           button.textContent = '✕';
           this.addButtonEffects(button);

          return button;
        }

        // Crée la zone d'affichage du texte d'information (numéro d'image)
        createInfoText() {
            return this.createElement('div', {
                position: 'absolute',
                bottom: '10px',
                right: '10px',
                color: 'white',
                fontSize: '16px',
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                padding: '5px',
                borderRadius: '5px',
                zIndex: 10001
            });
        }

        // Crée un spinner pour indiquer le chargement de l'image
        createSpinner() {
            const spinner = this.createElement('div', {
                position: 'absolute',
                border: '8px solid #f3f3f3',
                borderTop: '8px solid #3498db',
                borderRadius: '50%',
                width: '50px',
                height: '50px',
                animation: 'spin 1s linear infinite',
                zIndex: 10001
            });
            return spinner;
        }

        addButtonEffects(button) {
            button.addEventListener('mouseenter', () => {
                button.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
                button.style.color = 'black';
                button.style.transform = 'scale(1.1)';
            });

            button.addEventListener('mouseleave', () => {
                button.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
                button.style.color = 'white';
                button.style.transform = 'scale(1)';
            });

            button.addEventListener('mousedown', () => {
                button.style.transform = 'scale(0.9)';
            });

            button.addEventListener('mouseup', () => {
                button.style.transform = 'scale(1.1)';
            });
        }

        // Ajoute les événements aux différents éléments du visualiseur
        addEventListeners() {
            // Bouttons de controles du visualiseur
            this.prevButton.addEventListener('click', () => this.changeImage(-1));
            this.nextButton.addEventListener('click', () => this.changeImage(1));
            this.closeButton.addEventListener('click', () => this.closeViewer());
            this.overlay.addEventListener('click', (event) => {
                if (event.target === this.overlay) {
                    this.closeViewer();
                }
            });

            // Zoom avec la molette de la souris
            this.imgElement.addEventListener('wheel', (event) => this.handleZoom(event));


            // Déplacement lors du zoom (drag)
            this.imgElement.addEventListener('mousedown', (event) => this.startDrag(event));
            this.imgElement.addEventListener('mousedown', this.handleMouseDown.bind(this));
            this.imgElement.addEventListener('mouseup', this.handleMouseUp.bind(this));

            // Touches avec les doigts
            this.overlay.addEventListener('touchstart', (event) => this.handleTouchEvent(event));
            this.overlay.addEventListener('touchmove', (event) => this.handleTouchEvent(event));
            this.overlay.addEventListener('touchend', (event) => this.handleTouchEvent(event));

             // Zoom sur mobile
            //this.overlay.addEventListener('touchstart', (event) => this.handlePinchStart(event));
            //this.overlay.addEventListener('touchmove', (event) => this.handlePinchMove(event));
            //this.overlay.addEventListener('touchend', (event) => this.handlePinchEnd(event));

            // Ouvrir l'image dans une no6velle fenêtre
            this.imgElement.addEventListener('click', () => {
              if (!this.isDragging) {
                window.open(this.images[this.currentIndex].href, '_blank');
              }
            });

            // Touches du clavier
            document.addEventListener('keydown', (event) => this.handleKeyboardEvents(event));
        }

        // Fonction pour gérer les touches du clavier
        handleKeyboardEvents(event) {
            switch (event.key) {
                case 'ArrowLeft':
                case 'ArrowUp':
                    this.changeImage(-1);
                    break;
                case 'ArrowRight':
                case 'ArrowDown':
                    this.changeImage(1);
                    break;
                case 'Escape':
              case 'Backspace':
                    event.preventDefault();
                    this.closeViewer();
                    break;
            }
        }

        //
        handleTouchEvent(event) {
            // Glissement sur mobile (swipe) -> event.touches.length === 1
            // Zoom sur mobile -> event.touches.length === 2
          switch (event.type) {
              case 'touchstart':
                  if (event.touches.length === 1) {
                        /*if (this.imageElementScale > 1) {
                            // Si l'image est zoomée, permettre le déplacement (drag)
                            this.startDrag(event);
                        } else {*/
                            // Sinon, démarrer le swipe
                            this.handleSwipeStart(event);
                        //}
                  }
                  else if (event.touches.length === 2) {
                      this.handlePinchStart(event);
                  }
                  break;

              case 'touchmove':
                  if (event.touches.length === 1) {
                    this.handleSwipeMove(event);
                  }
                  else if (event.touches.length === 2) {
                    this.handlePinchMove(event);
                  }
                  break;

              case 'touchend':
                  if (event.touches.length === 1) {
                    this.handleSwipeEnd(event);
                  }
                  else if (event.touches.length === 2) {
                    this.handlePinchEnd(event);
                  }
                  break;
          }
      }


        // Gestion du début de l'interaction tactile
        handleSwipeStart(event) {
            if (event.touches.length === 1) {
                if(this.isPinchZooming) return;
                // Commencer le swipe
                this.isSwiping = true;
                this.startX = event.touches[0].clientX;
                this.startY = event.touches[0].clientY;
            }
        }

        // Gestion du mouvement tactile pour swipe
        handleSwipeMove(event) {
            if (this.isSwiping && event.touches.length === 1) {
                this.currentX = event.touches[0].clientX;
                this.currentY = event.touches[0].clientY;
            }
        }

        // Gestion de la fin de l'interaction tactile
        handleSwipeEnd(event) {
            if (event.touches.length < 2) {
              this.initialDistance = null;
            }
            if (this.isSwiping) {
              this.isSwiping = false;
              const deltaX = this.currentX - this.startX;
              const deltaY = this.currentY - this.startY;

              // Si le mouvement est suffisamment grand, on change d'image
              if (Math.abs(deltaX) > 50) {
                  if (deltaX > 0) {
                      this.showPreviousImage();
                  } else {
                      this.showNextImage();
                  }
              }

              // Si le mouvement est suffisamment grand verticalement, on ferme le visualiseur
              if (Math.abs(deltaY) > 50) {
                  this.closeViewer();
              }
          }
        }

        // Calculate distance between two fingers
        distance(event){
            return Math.hypot(event.touches[0].pageX - event.touches[1].pageX, event.touches[0].pageY - event.touches[1].pageY);
        }

        // Gestion du début de l'interaction tactile pour le pincement
        handlePinchStart(event) {
            if (event.touches.length === 2) {
                event.preventDefault(); // Prevent page scroll
                this.isPinchZooming = true;

                // Calculate where the fingers have started on the X and Y axis
                this.start.x = (event.touches[0].pageX + event.touches[1].pageX) / 2;
                this.start.y = (event.touches[0].pageY + event.touches[1].pageY) / 2;
                this.start.distance = this.distance(event);

                // Save the current scale to use it as a base for the new scale
                this.initialScale = this.imageElementScale || 1; // Use 1 if there's no previous zoom
            }
        }

        // Gestion du mouvement tactile pour le pincement (zoom)
        handlePinchMove(event) {
            if (event.touches.length === 2) {
                event.preventDefault(); // Prevent page scroll

                // Safari provides event.scale as two fingers move on the screen
                // For other browsers just calculate the scale manually
                let scale;
                if (event.scale) {
                  scale = event.scale;
                } else {
                  const deltaDistance = this.distance(event);
                  scale = deltaDistance / this.start.distance;
                }
                // this.imageElementScale = Math.min(Math.max(1, scale), 4);
                // Multiply the new scale by the starting scale to retain the zoom level
                // this.imageElementScale = Math.min(Math.max(1, this.startScale * scale), 4);
                this.imageElementScale = Math.min(Math.max(1, this.initialScale * scale), 4);


                // Calculate how much the fingers have moved on the X and Y axis
                const deltaX = (((event.touches[0].pageX + event.touches[1].pageX) / 2) - this.start.x) * 2; // x2 for accelarated movement
                const deltaY = (((event.touches[0].pageY + event.touches[1].pageY) / 2) - this.start.y) * 2; // x2 for accelarated movement

                // Transform the image to make it grow and move with fingers
                const transform = `translate3d(${deltaX}px, ${deltaY}px, 0) scale(${this.imageElementScale})`;
                this.imgElement.style.transform = transform;
                this.imgElement.style.WebkitTransform = transform;
                this.imgElement.style.zIndex = "9999";
            }
        }

        // Gestion de la fin de l'interaction tactile pour le pincement
        handlePinchEnd(event) {
            if (event.touches.length < 2) {
                // Ajouter un délai pour réinitialiser le drag (empeche les conflits avec le clic)
                this.dragTimeout = setTimeout(() => {
                    this.isPinchZooming = false;
                    this.dragTimeout = null;
                }, 100);

              // Si l'image est revenue à sa taille d'origine, réinitialiser le zIndex
              if (this.imageElementScale <= 1) {
                  this.imgElement.style.zIndex = '';
              }
              else  {
                  this.imgElement.style.zIndex = 10002;
              }

            }
        }

        // Fonction pour calculer la distance entre deux points de contact
        getTouchDistance(touches) {
            const [touch1, touch2] = touches;
            const deltaX = touch2.clientX - touch1.clientX;
            const deltaY = touch2.clientY - touch1.clientY;
            return Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        }

        handleZoom(event) {
            event.preventDefault();
            const zoomIncrement = 0.1;

            if (event.deltaY < 0) {
                this.zoomLevel += zoomIncrement; // Zoomer
            } else {
                this.zoomLevel = Math.max(1, this.zoomLevel - zoomIncrement); // Dézoomer, mais ne pas descendre sous 1
            }

            this.imgElement.style.transform = `scale(${this.zoomLevel}) translate(${this.offsetX}px, ${this.offsetY}px)`;

            // Si le niveau de zoom est supérieur à 1, mettre l'image devant les boutons
            if (this.zoomLevel > 1) {
                this.imgElement.style.zIndex = 10002;
            } else {
                // Si le zoom revient à la normale, remettre le zIndex initial
                this.imgElement.style.zIndex = '';
            }
        }


        startDrag(event) {
            event.preventDefault(); // Empêche la sélection de l'image

            // Gestion tactile
            /*if (event.type === 'touchstart') {
                this.isTouchDragging = true;
            }*/

            // if (!this.isMouseDown && !this.isTouchDragging) return; // Ne pas démarrer si ni la souris ni le toucher n'est actif
            if (!this.isMouseDown) return;

            this.isDragging = true;
            this.startX = event.clientX - this.offsetX;
            this.startY = event.clientY - this.offsetY;
            this.imgElement.style.cursor = 'grabbing';
            this.imgElement.style.userSelect = 'none';

            // Ajouter des listeners sur le document pour capturer les mouvements même si on sort de l'image
            /*if (event.touches) {
                document.addEventListener('touchmove', this.onDragBound = this.onDrag.bind(this));
                document.addEventListener('touchend', this.endDragBound = this.endDrag.bind(this));
            } else {*/
                document.addEventListener('mousemove', this.onDragBound = this.onDrag.bind(this));
                document.addEventListener('mouseup', this.endDragBound = this.endDrag.bind(this));
            //}
        }

        onDrag(event) {
            if (!this.isDragging) return;

            event.preventDefault();

            this.offsetX = event.clientX - this.startX;
            this.offsetY = event.clientY - this.startY;

            // Appliquer la transformation avec le zoom actuel, en se déplaçant dans l'image
            this.imgElement.style.transform = `scale(${this.zoomLevel}) translate(${this.offsetX}px, ${this.offsetY}px)`;
        }

        endDrag() {
            this.imgElement.style.cursor = 'grab';

            // Retirer les listeners
            /*if (event.type === 'touchend') {
                this.isTouchDragging = false; // Réinitialise l'état tactile
                document.removeEventListener('touchmove', this.onDragBound);
                document.removeEventListener('touchend', this.endDragBound);
            } else {*/
                this.isMouseDown = false; // Réinitialise l'état de la souris
                document.removeEventListener('mousemove', this.onDragBound);
                document.removeEventListener('mouseup', this.endDragBound);
            //}

            // Ajouter un délai pour réinitialiser le drag (empeche les conflits avec le clic)
            this.dragTimeout = setTimeout(() => {
                this.isDragging = false;
                this.imgElement.style.cursor = 'pointer';
                this.dragTimeout = null;
            }, 100);
        }

        handleMouseDown(event) {
            this.isMouseDown = true;
            this.mouseDownX = event.clientX;
            this.mouseDownY = event.clientY;

            // Démarrer le drag après un délai pour éviter le drag lors des clics courts
            this.dragTimeout = setTimeout(() => {
                if (this.isMouseDown) {
                    this.startDrag(event);
                }
            }, 200);
        }

        handleMouseUp(event) {
            this.isMouseDown = false;

            // Si le délai pour démarrer le drag est encore en cours, le nettoyer
            if (this.dragTimeout) {
                clearTimeout(this.dragTimeout);
                this.dragTimeout = null;
            }

            // Vérifier si le mouvement est suffisant pour considérer que c'est un drag
            const movedX = Math.abs(event.clientX - this.mouseDownX);
            const movedY = Math.abs(event.clientY - this.mouseDownY);

            if (movedX < 5 && movedY < 5) {
                // handleImageClick(event); // Traiter le clic si le mouvement est minime
            }
        }

        // Réinitialiser le zoom de l'image
        resetZoom() {
            this.imgElement.style.transform = 'scale(1)';
            this.imgElement.style.transformOrigin = '0 0';
        }

        // Réinitialiser la position du drag de l'image
        resetDrag() {
            this.imgElement.style.left = '0px';
            this.imgElement.style.top = '0px';
        }

        // Met à jour l'image affichée dans le visualiseur
        updateImage() {
            if (this.currentIndex >= 0 && this.currentIndex < this.images.length) {
              const imageUrl = this.images[this.currentIndex].href;
              this.imgElement.src = imageUrl;
              this.infoText.textContent = `${this.currentIndex + 1} / ${this.images.length}`;
              this.spinner.style.display = 'block';

              this.toggleButtonState();

              this.imgElement.onload = () => {
                  this.imgElement.style.opacity = 1;
                  this.spinner.style.display = 'none';

                  // Réinitialiser le zoom et la position du drag
                  this.resetZoom();
                  this.resetDrag();


                  // Calcul de la position des boutons
                  const imgRect = this.imgElement.getBoundingClientRect();
                  const isMobileDevice = isMobile(); // Détection des mobiles

                  if (isMobileDevice) {
                    // pass
                  } else {
                      const margin = 30;
                      this.prevButton.style.left = `${imgRect.left - this.prevButton.offsetWidth - margin}px`;
                      this.nextButton.style.right = `${window.innerWidth - imgRect.right - this.nextButton.offsetWidth - margin}px`;
                      //this.closeButton.style.right = `${window.innerWidth - imgRect.right - this.closeButton.offsetWidth - margin}px`;
                      //this.closeButton.style.top = `${imgRect.top + margin}px`;
                  }

                  // Mettre à jour les indicateurs
                  // this.createIndicators();

              };

              this.imgElement.onerror = () => this.handleImageError();
            }
        }

        // Gestion des erreurs de chargement d'image
        handleImageError() {
            const miniUrl = this.images[this.currentIndex].querySelector('img').src;
            const extensions = ['.jpg', '.png', '.jpeg'];
            const baseUrl = miniUrl.replace('/minis/', '/fichiers/');

            const tryNextExtension = (index) => {
                if (index >= extensions.length) {
                    // Si toutes les extensions échouent, tenter l'URL originale
                    this.imgElement.src = miniUrl;
                    return;
                }

                // Remplacer l'extension et mettre à jour l'URL
                const updatedUrl = baseUrl.replace(/\.(jpg|png|jpeg)$/, extensions[index]);
                this.imgElement.src = updatedUrl;

                // Tester l'URL
                this.imgElement.onerror = () => tryNextExtension(index + 1);
            };

            // Commencer les essais avec la première extension
            tryNextExtension(0);
        }

        // Change d'image en fonction de la direction (suivant/précédent)
        changeImage(direction) {
            this.currentIndex = (this.currentIndex + direction + this.images.length) % this.images.length;
            this.imgElement.style.opacity = 0;
            this.spinner.style.display = 'block';
            this.updateImage();
        }

        showPreviousImage() {
            this.changeImage(-1);
        }

        showNextImage() {
            this.changeImage(1);
        }

        // Ferme le visualiseur d'images
        closeViewer() {
          if (this.overlay) {
                document.body.removeChild(this.overlay);
                this.overlay = null;
                ImageViewer.instance = null; // Réinitialise l'instance singleton
            }
        }

      // Désactive ou active les boutons suivant/précédent en fonction de l'index actuel
      toggleButtonState() {
          if (this.currentIndex === 0) {
              // this.prevButton.disabled = true;
              this.prevButton.style.opacity = 0.5;
              this.prevButton.style.cursor = 'initial';
          } else {
              // this.prevButton.disabled = false;
              this.prevButton.style.opacity = 1;
              this.prevButton.style.cursor = 'pointer';
          }

          if (this.currentIndex === this.images.length - 1) {
              // this.nextButton.disabled = true;
              this.nextButton.style.opacity = 0.5;
              this.nextButton.style.cursor = 'initial';
          } else {
              // this.nextButton.disabled = false;
              this.nextButton.style.opacity = 1;
              this.nextButton.style.cursor = 'pointer';
          }
      }

      openViewer(images, currentIndex) {
            if (this.overlay) {
                this.images = images;
                this.currentIndex = currentIndex;
                this.updateImage();
                //this.overlay.style.display = 'flex';
            } else {
                new ImageViewer();
                this.images = images;
                this.currentIndex = currentIndex;
                this.createOverlay();
                this.updateImage();
                //this.overlay.style.display = 'flex';
            }
        }
    }

    function addSpinnerStyles() {
        const style = document.createElement('style');
        style.textContent = `
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            .spinner { /* Exemple de classe pour spinner */
                width: 50px;
                height: 50px;
                border: 5px solid rgba(0, 0, 0, 0.1);
                border-left-color: #000;
                border-radius: 50%;
                animation: spin 1s linear infinite;
            }
        `;
        document.head.appendChild(style);
    }

    const parentClasses = '.txt-msg, .message, .conteneur-message.mb-3, .bloc-editor-forum, .signature-msg';
    const linkSelectors = parentClasses.split(', ').map(cls => `${cls} a`);

    // Ajouter des écouteurs d'événements aux images sur la page
    function addListeners() {
        linkSelectors.forEach(selector => {
            document.querySelectorAll(selector).forEach(link => {
                link.addEventListener('click', handleImageClick, true);
            });
        });
    }

    function handleImageClick(event) {
        // Si Ctrl ou Cmd est enfoncé, ne pas ouvrir l'ImageViewer
        if (event.ctrlKey || event.metaKey) {
            return;
        }

        const imgElement = this.querySelector('img');
        if (imgElement) {
            event.preventDefault();
            const closestElement = this.closest(parentClasses);
            if (closestElement) {
                const images = Array.from(closestElement.querySelectorAll('a')).filter(imgLink => imgLink.querySelector('img'));
                const currentIndex = images.indexOf(this);

                const viewer = new ImageViewer();
                viewer.openViewer(images, currentIndex);
            }
        }
    }


    function isMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }


    function main() {
        addSpinnerStyles();
        addListeners();

        const observer = new MutationObserver(() => addListeners());
        observer.observe(document, { childList: true, subtree: true });
    }

    main();


})();
