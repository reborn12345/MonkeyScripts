// ==UserScript==
// @name         JVC_ImageViewer
// @namespace    http://tampermonkey.net/
// @version      1.42.1
// @description  Naviguer entre les images d'un post sous forme de slideshow en cliquant sur une image sans ouvrir NoelShack.
// @author       HulkDu92
// @match        https://*.jeuxvideo.com/forums/*
// @match        https://*.jeuxvideo.com/profil/*
// @match        https://*.jeuxvideo.com/messages-prives/*
// @match        https://jvarchive.com/*
// @grant        GM_download
// @grant        GM.xmlHttpRequest
// @connect      image.noelshack.com
// @run-at       document-end
// @license      MIT
// @icon         https://image.noelshack.com/fichiers/2024/41/3/1728506420-image-viewer-icon.png
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
            this.downloadButton = null;
            this.searchButton = null;
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
            this.isMouseDown = false;
            this.isTouchDragging = false;
            this.dragTimeout = null;
            this.mouseDownX = 0;
            this.mouseDownY = 0;
            this.initialScale = 1;
            this.isViewerOpen = false;
            this.thumbnailPanel = null;
            this.previousThumbnail = null;
            this.touchSensitivityFactor = 0.5; // Pour les appareils tactiles
            this.mouseSensitivityFactor = 0.4; // Pour les mouvements de souris
            this.defaultImageWidth = Math.min(window.innerWidth, 1200);

            ImageViewer.instance = this;

            this.handlePopState = this.handlePopState.bind(this);

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
            this.overlay.classList.add('jvc-image-viewer');


            this.imgElement = this.createElement('img', {
                maxWidth: '90%',
                maxHeight: '80%',
                objectFit: 'contain',
                transition: 'opacity 0.3s',
                opacity: 0,
                cursor: 'pointer',
                overflow: 'auto',
            });

            this.spinner = this.createSpinner();
            this.prevButton =  this.createButton('<', 'left');
            this.nextButton =  this.createButton('>', 'right');
            this.closeButton = this.createCloseButton();
            this.infoText = this.createInfoText();
            this.downloadButton = this.createDownloadButton();
            this.searchButton = this.createSearchButton();

            this.indicatorsContainer = this.createElement('div', {
                display: 'flex',
                justifyContent: 'center',
                marginBottom: '10px 0',
                position: 'absolute',
                bottom: '40px',
            });

            // this.addScrollbarStyles();
            this.resetHideButtons();

            // Événements associés aux boutons et à l'overlay
            this.addEventListeners();
            this.addInteractionListeners();

            // Ajout des éléments au DOM
            //this.overlay.append(this.imgElement, this.spinner, this.infoText, this.prevButton, this.nextButton, this.closeButton);
            this.overlay.append(
                this.imgElement,
                this.spinner,
                this.infoText,
                this.downloadButton,
                // this.searchButton,
                this.prevButton,
                this.nextButton,
                this.closeButton
            );
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


          //button.textContent = text;*
          const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
          svg.setAttribute('viewBox', '0 0 24 24');
          svg.setAttribute('width', '24');
          svg.setAttribute('height', '24');
          svg.setAttribute('fill', 'white');

          const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          path.setAttribute('d', position === 'left'
              ? 'M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6z' // Icône flèche gauche
              : 'M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z');  // Icône flèche droite
          svg.appendChild(path);
          button.appendChild(svg);

          this.addButtonEffects(button);

          return button;
      }

    createDownloadButton() {
        const isMobileDevice = isMobile();

        const button = this.createElement('button', {
            position: 'absolute',
            top: '80px',
            left: '15px',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            color: 'white',
            fontSize: isMobileDevice ? '12px' : '10px',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            borderRadius: '50%',
            padding: '0',
            cursor: 'pointer',
            zIndex: 10001,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: isMobileDevice ? '37px' : '45px',
            height: isMobileDevice ? '37px' : '45px',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.5)',
            transition: 'transform 0.3s ease, background-color 0.3s ease',
        });

        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('width', isMobileDevice ? '18' : '22');
        svg.setAttribute('height', isMobileDevice ? '18' : '22');
        svg.setAttribute('fill', 'none');
        svg.setAttribute('stroke', 'currentColor');
        svg.setAttribute('stroke-linecap', 'round');
        svg.setAttribute('stroke-linejoin', 'round');
        svg.setAttribute('stroke-width', '2');

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', 'M6 21h12M12 3v14m0 0l5-5m-5 5l-5-5');

        svg.appendChild(path);
        button.appendChild(svg);
        this.addButtonEffects(button);

        return button;
    }

      createSearchButton() {
          const isMobileDevice = isMobile();

          const button = this.createElement('button', {
              position: 'absolute',
              top: '80px',
              left: '65px',
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              color: 'white',
              fontSize: isMobileDevice ? '12px' : '10px',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '50%',
              padding: '0',
              cursor: 'pointer',
              zIndex: 10001,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: isMobileDevice ? '37px' : '45px',
              height: isMobileDevice ? '37px' : '45px',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.5)',
              transition: 'transform 0.3s ease, background-color 0.3s ease',
          });

          const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
          svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
          svg.setAttribute('width', isMobileDevice ? '18' : '22');
          svg.setAttribute('height', isMobileDevice ? '18' : '22');
          svg.setAttribute('viewBox', '0 0 24 24');
          svg.setAttribute('fill', 'currentColor');

          const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          path.setAttribute('fill', 'currentColor');
          path.setAttribute('d', 'M6 2h12a4 4 0 0 1 4 4v6h-2V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h6v2H6a4 4 0 0 1-4-4V6a4 4 0 0 1 4-4m6 6a4 4 0 0 1 4 4a4 4 0 0 1-4 4a4 4 0 0 1-4-4a4 4 0 0 1 4-4m6 8a2 2 0 0 1 2 2a2 2 0 0 1-2 2a2 2 0 0 1-2-2a2 2 0 0 1 2-2Z');

          svg.appendChild(path);
          button.appendChild(svg);

          button.addEventListener('click', () => this.searchImageOnGoogle());

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
                fontSize: isMobileDevice ? '18px' : '16px',
                //border: 'none',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                borderRadius: '50%',
                width: isMobileDevice ? '40px' : '35px',
                height: isMobileDevice ? '40px' : '35px',
                cursor: 'pointer',
                zIndex: 99999999
            });

           button.textContent = '✕';
           this.addButtonEffects(button);

          return button;
        }

        // Crée la zone d'affichage du texte d'information (numéro d'image)
        createInfoText() {
            return this.createElement('div', {
                position: 'absolute',
                //top: '80px',
                bottom: '0px',
                //left: '15px',
                right: '10px',
                color: 'white',
                fontSize: '12px',
                backgroundColor: 'rgba(5, 5, 5, 0.5)',
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
            this.downloadButton.addEventListener('click', () => this.startDownload());
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
            this.imgElement.addEventListener('touchstart', (event) => this.handleTouchEvent(event));
            this.imgElement.addEventListener('touchmove', (event) => this.handleTouchEvent(event));
            this.imgElement.addEventListener('touchend', (event) => this.handleTouchEvent(event));

            // Ouvrir l'image dans une no6velle fenêtre
            this.imgElement.addEventListener('click', () => {
              if (!this.isDragging) {
                window.open(this.images[this.currentIndex].href, '_blank');
              }
            });

            // Touches du clavier
            document.addEventListener('keydown', (event) => this.handleKeyboardEvents(event));
        }

        // Fonctions pour gérer les touches du clavier
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
                    event.preventDefault();
                    this.closeViewer();
                    break;
            }
        }

        // Fonctions pour gérer les touches tactiles
        handleTouchEvent(event) {
          switch (event.type) {
              case 'touchstart':
                  if (event.touches.length === 1) {
                      if (this.imageElementScale > 1) {
                          // Si l'image est zoomée, permettre le déplacement (drag)
                          this.startDrag(event);
                      } else {
                          // Sinon, démarrer le swipe
                          this.handleSwipeStart(event);
                      }
                  } else if (event.touches.length === 2) {
                      // Démarrer le pinch zoom
                      this.handlePinchStart(event);
                  }
                  break;

              case 'touchmove':
                  if (event.touches.length === 1) {
                      if (this.imageElementScale > 1) {
                          // Si l'image est zoomée, permettre le déplacement (drag)
                          this.onDrag(event);
                      } else {
                          this.handleSwipeMove(event);
                      }
                  } else if (event.touches.length === 2) {
                      // Gérer le pinch zoom
                      this.handlePinchMove(event);
                  }
                  break;

              case 'touchend':
                  if (event.touches.length === 1) {
                      if (this.imageElementScale > 1) {
                          this.endDrag(event);
                      }
                  }
                  else if (event.touches.length === 0) {
                      if (this.isSwiping) {
                        this.handleSwipeEnd(event);
                      } else if (this.isPinchZooming) {
                        this.handlePinchEnd(event);
                      } else {
                        this.endDrag(event);
                      }
                  }
                  break;
          }
      }


        // Gestion du début de l'interaction tactile
        handleSwipeStart(event) {
            if (event.touches.length === 1) {
                if(this.isPinchZooming) {
                  return;
                }
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
            if (event.touches.length === 0) {
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

          //  l'image revient à sa taille d'origine, réinitialiser le zIndex
          this.imgElement.style.zIndex = '';
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
                  scale = (deltaDistance / this.start.distance); //* this.touchSensitivityFactor;
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
                this.closeButton.style.zIndex = "10003";
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
            const zoomIncrement = 0.07; // Sensibilité du zoom

            let previousZoomLevel = this.imageElementScale;

            // Calcul du nouveau niveau de zoom
            if (event.deltaY < 0) {
                this.imageElementScale = Math.min(4, this.imageElementScale + zoomIncrement); // Zoom max
            } else {
                this.imageElementScale = Math.max(1, this.imageElementScale - zoomIncrement); // Zoom min
            }

            // Calcul de la position relative du zoom pour recentrer autour du point de la molette
            let imgRect = this.imgElement.getBoundingClientRect();
            let offsetXRelative = (event.clientX - this.offsetX) / previousZoomLevel;
            let offsetYRelative = (event.clientY - this.offsetY) / previousZoomLevel;

            // Recalculer les offsets pour centrer l'image correctement après le zoom
            this.offsetX = event.clientX - offsetXRelative * this.imageElementScale;
            this.offsetY = event.clientY - offsetYRelative * this.imageElementScale;

            // Appliquer les limites de déplacement après zoom
            this.limitOffsets();

            // Appliquer la transformation avec le zoom et les offsets
            //this.imgElement.style.transform = `translate(${this.offsetX}px, ${this.offsetY}px) scale(${this.imageElementScale})`;

            // Ajuster le z-index si zoomé
            this.applyTransform();
      }

      applyTransform() {
          this.imgElement.style.transition = 'transform 0.1s ease'; // Ajout d'une transition fluide
          this.imgElement.style.transform = `translate(${this.offsetX}px, ${this.offsetY}px) scale(${this.imageElementScale})`;

          // Ajuster le z-index si zoomé
          this.imgElement.style.zIndex = this.imageElementScale > 1 ? 10002 : '';
      }

      limitOffsets() {
          let imgRect = this.imgElement.getBoundingClientRect();
          let windowWidth = window.innerWidth;
          let windowHeight = window.innerHeight;

          // Calculer les limites maximales
          let maxOffsetX = Math.max(0, (imgRect.width * this.imageElementScale) - windowWidth);
          let maxOffsetY = Math.max(0, (imgRect.height * this.imageElementScale) - windowHeight);

          // Limiter les déplacements
          this.offsetX = Math.min(Math.max(this.offsetX, -maxOffsetX), 0);
          this.offsetY = Math.min(Math.max(this.offsetY, -maxOffsetY), 0);
      }

      startDrag(event) {
          event.preventDefault(); // Empêche la sélection de l'image

          // Gestion tactile
          if (event.type === 'touchstart') {
              this.isTouchDragging = true;
              this.startX = event.touches[0].clientX;
              this.startY = event.touches[0].clientY;
          } else {
              // Gestion avec la souris
              this.isMouseDown = true;
              this.startX = event.clientX;
              this.startY = event.clientY;
          }

          this.isDragging = true;
          this.imgElement.style.cursor = 'grabbing';
          this.imgElement.style.userSelect = 'none';

          // Ajouter des listeners sur le document pour capturer les mouvements
          if (event.touches) {
              document.addEventListener('touchmove', this.onDragBound = this.onDrag.bind(this));
              document.addEventListener('touchend', this.endDragBound = this.endDrag.bind(this));
          } else {
              document.addEventListener('mousemove', this.onDragBound = this.onDrag.bind(this));
              document.addEventListener('mouseup', this.endDragBound = this.endDrag.bind(this));
          }
      }

      onDrag(event) {
          if (!this.isDragging) return;

          event.preventDefault();

          let deltaX, deltaY;
          if (event.type === 'touchmove') {
              // Gestion tactile
              deltaX = (event.touches[0].clientX - this.startX) * this.touchSensitivityFactor;
              deltaY = (event.touches[0].clientY - this.startY) * this.touchSensitivityFactor;
          } else {
              // Gestion avec la souris
              deltaX = (event.clientX - this.startX) * this.mouseSensitivityFactor;
              deltaY = (event.clientY - this.startY) * this.mouseSensitivityFactor;
          }

          // Calculer les nouveaux offsets
          let newOffsetX = this.offsetX + deltaX;
          let newOffsetY = this.offsetY + deltaY;

          // Limiter les nouveaux offsets
          this.offsetX = Math.min(Math.max(newOffsetX, -this.imgElement.width * (this.imageElementScale - 1)), 0);
          this.offsetY = Math.min(Math.max(newOffsetY, -this.imgElement.height * (this.imageElementScale - 1)), 0);

          // Appliquer la translation ajustée par le facteur de sensibilité
          this.offsetX += deltaX;
          this.offsetY += deltaY;

          // Appliquer la transformation avec le zoom et la translation
          this.applyTransform();

          // Mettre à jour les points de départ pour le prochain déplacement
          this.startX = event.type === 'touchmove' ? event.touches[0].clientX : event.clientX;
          this.startY = event.type === 'touchmove' ? event.touches[0].clientY : event.clientY;
      }

      endDrag(event) {
          this.imgElement.style.cursor = 'grab';

          // Retirer les listeners
          if (event.type === 'touchend') {
              this.isTouchDragging = false; // Réinitialise l'état tactile
              document.removeEventListener('touchmove', this.onDragBound);
              document.removeEventListener('touchend', this.endDragBound);
          } else {
              this.isMouseDown = false; // Réinitialise l'état de la souris
              document.removeEventListener('mousemove', this.onDragBound);
              document.removeEventListener('mouseup', this.endDragBound);
          }

          // Réinitialiser le drag après un délai pour éviter les conflits
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
            this.imageElementScale = 1;
            this.offsetX = 0;
            this.offsetY = 0;
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

                  if (imgRect.width > this.defaultImageWidth) {
                      this.defaultImageWidth = imgRect.width;
                  }

                  if (isMobileDevice) {
                    // pass
                  } else {
                      const margin = 30;
                       // Calcul de la position des boutons
                      let prevButtonLeft = (window.innerWidth - this.defaultImageWidth) / 2 - this.prevButton.offsetWidth - margin;
                      let nextButtonRight = (window.innerWidth - this.defaultImageWidth) / 2 - this.nextButton.offsetWidth - margin;

                      // Limite les boutons pour qu'ils ne sortent pas de l'écran à gauche ou à droite
                      prevButtonLeft = Math.max(prevButtonLeft, margin); // Empêche de sortir à gauche
                      nextButtonRight = Math.max(nextButtonRight, margin); // Empêche de sortir à droite

                      // Appliquer les positions ajustées
                      this.prevButton.style.left = `${prevButtonLeft}px`;
                      this.nextButton.style.right = `${nextButtonRight}px`;
                  }

                  this.focusOnThumbnail();
              };

              this.imgElement.onerror = () => this.handleImageError();
            }
        }

        // Gestion des erreurs de chargement d'image
        handleImageError() {
            const miniUrl = this.images[this.currentIndex].querySelector('img').src;
            const fullUrl = this.images[this.currentIndex].href;
            const extensions = this.reorderExtensions(fullUrl);
            const baseUrl = miniUrl.replace('/minis/', '/fichiers/');

            const tryNextExtension = (index) => {
                if (index >= extensions.length) {
                    // Si toutes les extensions échouent, tenter l'URL originale (mini)
                    this.imgElement.src = miniUrl;
                    const imgTestMini = new Image();
                    imgTestMini.src = miniUrl;

                    imgTestMini.onload = () => {
                        this.imgElement.src = miniUrl;
                    };
                    imgTestMini.onerror = () => {
                        this.setImageNotFound(this.imgElement);
                        //const notFoundImageUrl = "https://upload.wikimedia.org/wikipedia/commons/a/ac/No_image_available.svg"
                        // Si même l'URL originale échoue, afficher l'image par défaut
                        //this.imgElement.src = notFoundImageUrl;
                    };
                    return;
                }

                // Remplacer l'extension et mettre à jour l'URL
                const updatedUrl = baseUrl.replace(/\.(jpg|png|jpeg|webp|gif)$/, extensions[index]);

                // Tester l'URL avec un élément Image temporaire
                const imgTest = new Image();
                imgTest.src = updatedUrl;

                imgTest.onload = () => {
                    this.imgElement.src = updatedUrl;
                };

                imgTest.onerror = () => {
                    // console.log("Error loading: " + updatedUrl);
                    tryNextExtension(index + 1);
                };
            };

            // Commencer les essais avec la première extension
            tryNextExtension(0);
        }

       setImageNotFound(imageElement) {
            const notFoundImageUrl = "https://upload.wikimedia.org/wikipedia/commons/a/ac/No_image_available.svg";
            imageElement.src = notFoundImageUrl;
        }

        // Réarranger la liste des extensions a tester pour mettre l'extension utilisée sur noelshack en premier
       reorderExtensions(currentImageUrl) {
            const extensions = ['.jpg', '.png', '.jpeg'];
            const currentExtension = getImageExtension(currentImageUrl);
            const newExtensions = [...extensions];

            if (currentExtension) {
                if (!newExtensions.includes(currentExtension)) {
                    newExtensions.unshift(currentExtension);
                } else {
                    const index = newExtensions.indexOf(currentExtension);
                    if (index > -1) {
                        newExtensions.splice(index, 1);
                        newExtensions.unshift(currentExtension);
                    }
                }
            }
            return newExtensions;
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

      // Met à jour le focus sur la miniature correspondante
      focusOnThumbnail() {
          // Obtenez la miniature actuelle
          const thumbnails = this.thumbnailPanel ? this.thumbnailPanel.querySelectorAll('img') : [];
          const currentThumbnail = thumbnails[this.currentIndex];

          // Réinitialiser la bordure de la miniature précédente si elle existe
          if (this.previousThumbnail) {
              this.previousThumbnail.style.border = 'none';
              this.previousThumbnail.style.transform = 'scale(1)';
            this.previousThumbnail.style.boxShadow = 'none';
          }

          // Mettre à jour la bordure de la miniature actuelle
          if (currentThumbnail) {
              //currentThumbnail.style.border = '2px solid rgba(40, 40, 40, 0.8)'; // Appliquer la bordure
              currentThumbnail.style.boxShadow = '0 0 0 2px rgba(40, 40, 40, 0.8), 0 0 10px rgba(40, 40, 40, 0.5)'; // Ombre portée
              currentThumbnail.style.transform = 'scale(1.15)'; // Agrandir l'élément
              currentThumbnail.parentElement.scrollIntoView({ behavior: 'smooth', inline: 'center' });
          }

          // Mettre à jour la référence de la miniature précédente
          this.previousThumbnail = currentThumbnail;
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

      // Cacher temporairement le menu JVC
      toggleMenuVisibility(isVisible) {
          const menu = document.querySelector('.header__bottom');
          if (menu) {
              menu.style.display = isVisible ? '' : 'none';
          }
      }

      // Fonction pour créer et afficher le panneau des miniatures
      toggleThumbnailPanel() {
          if (this.thumbnailPanel) {
              this.closeThumbnailPanel(); // Ferme le panneau si déjà ouvert
              return;
          }

          // Créer le panneau
          this.thumbnailPanel = this.createElement('div', {
              position: 'fixed',
              bottom: '10px',
              left: '50%',
              transform: 'translateX(-50%)',
              border: '0px solid',
              padding: '0px',
              zIndex: '99999999',
              maxHeight: '80px',
              maxWidth: '80%',
              overflowY: 'hidden',
              overflowX: 'auto',
              display: 'flex',
              alignItems: 'center',
              backgroundColor: 'transparent',
          });
          this.thumbnailPanel.classList.add('thumbnail-scroll-container');

          // Conteneur pour le défilement horizontal
          const scrollContainer = this.createElement('div', {
              display: 'flex',
              overflowX: 'auto',
              whiteSpace: 'nowrap',
              maxWidth: '100%',
          });

          scrollContainer.classList.add('thumbnail-scroll-container');


          // Ajout des images au conteneur
          this.images.forEach((image, index) => {
              const imgContainer = this.createElement('div', {
                  display: 'inline-block',
                  width: '50px',
                  height: '50px',
                  margin: '5px',
                  padding: '4px',
                  transition: 'transform 0.3s',
              });

              const imgElement = this.createElement('img');
              imgElement.src = image.querySelector('img') ? image.querySelector('img').src : image.href || image.thumbnail;
              imgElement.onerror = () => {
                  this.setImageNotFound(imgElement);
              };

              imgElement.alt = `Image ${index + 1}`;
              imgElement.style.width = 'auto';
              imgElement.style.height = '100%';
              imgElement.style.objectFit = 'cover';
              imgElement.style.cursor = 'pointer';

              imgElement.addEventListener('click', () => {
                  this.images.forEach((_, i) => {
                      const container = scrollContainer.children[i];
                      container.querySelector('img').style.border = 'none';
                  });
                  //imgElement.style.border = '2px solid blue';
                  this.currentIndex = index;
                  this.updateImage();
                  //imgContainer.scrollIntoView({ behavior: 'smooth', inline: 'center' });
              });

              imgContainer.appendChild(imgElement);
              scrollContainer.appendChild(imgContainer);
          });

          this.thumbnailPanel.appendChild(scrollContainer);
          this.overlay.appendChild(this.thumbnailPanel);

          this.focusOnThumbnail();
      }


      // Ecouteurs d'événements pour réinitialiser le timer
      addInteractionListeners() {
          this.overlay.addEventListener('mousemove', this.resetHideButtons.bind(this));
          this.overlay.addEventListener('click', this.resetHideButtons.bind(this));
          this.overlay.addEventListener('touchstart', this.resetHideButtons.bind(this));
      }

      // Réinitialisez le timer pour cacher les boutons
      resetHideButtons() {
        if (this.hideButtonsTimeout) {
            clearTimeout(this.hideButtonsTimeout);
        }
        this.toggleButtonsVisibility(true);
        this.hideButtonsTimeout = setTimeout(() => {
            this.toggleButtonsVisibility(false); // Cachez les boutons après 3 secondes
        }, 2500);
    }

      // Changez la visibilité des boutons
      toggleButtonsVisibility(visible) {
          const displayValue = visible ? 'flex' : 'none';

          const elements = [
              this.prevButton,
              this.nextButton,
              this.thumbnailPanel,
              this.infoText,
              this.downloadButton,
              this.searchButton,
          ];

          elements.forEach(element => {
              if (element) {
                  element.style.display = displayValue;
              }
          });
      }

    startDownload() {
        this.downloadButton.classList.add('downloading'); // Ajout de la classe pour l'animation

        this.downloadCurrentImage().then(() => {
            // Retirer la classe après le téléchargement
            this.downloadButton.classList.remove('downloading');
        }).catch((error) => {
            console.error('Download failed:', error);
            this.downloadButton.classList.remove('downloading');
        });
    }

    downloadCurrentImage() {
        return new Promise((resolve, reject) => {
            const imageElement = this.imgElement;
            if (!imageElement) {
                console.error('Image not found!');
                reject('Image not found');
                return;
            }

            const imageUrl = imageElement.src;
            const fileNameWithExtension = imageUrl.split('/').pop();
            const fileName = fileNameWithExtension.substring(0, fileNameWithExtension.lastIndexOf('.'));

            // Utilisation de GM.xmlHttpRequest pour contourner CORS
            GM.xmlHttpRequest({
                method: "GET",
                url: imageUrl,
                responseType: "blob",
                headers: {
                    'Accept': 'image/jpeg,image/png,image/gif,image/bmp,image/tiff,image/*;q=0.8'
                },
                onload: function(response) {
                    if (response.status === 200) {
                        const blob = response.response;
                        const url = URL.createObjectURL(blob);

                        // Téléchargement du fichier
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = fileName;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);

                        resolve(); // Indique que le téléchargement est terminé
                    } else {
                        reject('Error downloading image: ' + response.statusText);
                    }
                },
                onerror: function(err) {
                    reject('Request failed: ' + err);
                }
            });
        });
    }

    searchImageOnGoogle() {
        if (this.images.length > 0) {
            const imageUrl = this.imgElement.src;
            const googleImageSearchUrl = `https://lens.google.com/uploadbyurl?url=${encodeURIComponent(imageUrl)}`;
            // Ouvrir le lien dans un nouvel onglet
            window.open(googleImageSearchUrl, '_blank');
        } else {
            console.error('Aucune image disponible pour la recherche.');
        }
    }

      // Fonction pour fermer le panneau des miniatures
      closeThumbnailPanel(thumbnailPanel) {
              if (this.thumbnailPanel && this.overlay.contains(this.thumbnailPanel)) {
                  this.overlay.removeChild(this.thumbnailPanel);
                  this.thumbnailPanel = null;
              }
      }

      closeViewer() {
          if (this.overlay) {
              this.handleCloseViewer(); // Ferme le visualiseur
              history.back(); // Supprime l'état ajouté par pushState
          }
      }


      // Ferme le visualiseur d'images
      handleCloseViewer() {
          if (this.overlay) {
                document.body.removeChild(this.overlay);

                // Ferme le panneau des miniatures si ouvert
                if (this.thumbnailPanel) {
                    this.closeThumbnailPanel(this.thumbnailPanel);
                }

                window.removeEventListener('popstate', this.handlePopState);

                this.overlay = null;
                this.isViewerOpen = false;
                ImageViewer.instance = null; // Réinitialise l'instance singleton

                this.toggleMenuVisibility(true);
            }
      }

      openViewer(images, currentIndex) {
            if (this.overlay) {
                this.images = images;
                this.currentIndex = currentIndex;
                this.updateImage();
                this.toggleThumbnailPanel();
            } else {
                new ImageViewer();
                this.images = images;
                this.currentIndex = currentIndex;
                this.createOverlay();
                this.updateImage();
                this.toggleThumbnailPanel();
            }
            this.isViewerOpen = true;

            this.addHistoryState()
            window.addEventListener('popstate', this.handlePopState); // Ecouter l'événement bouton back du navigateur

            this.toggleMenuVisibility(false);
        }

        handlePopState(event) {
          if (ImageViewer.instance) {
                event.preventDefault();
                this.handleCloseViewer();
          }
        }

        // Ajouter une entrée dans l'historique
        addHistoryState() {
          history.pushState({ viewerOpen: true }, '');
        }
    }

    function addSpinnerStyles() {
        const style = document.createElement('style');
        style.textContent = `
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            .spinner {
                width: 50px;
                height: 50px;
                border-radius: 50%;
                border: 5px solid transparent;
                border-top: 5px solid rgba(0, 0, 0, 0.1);
                background: conic-gradient(from 0deg, rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0));
                animation: spin 1s linear infinite;
            }
        `;
        document.head.appendChild(style);
    }

    function addDownloadButtonStyles() {
      const style = document.createElement('style');
      style.textContent = `
          /* Animation de rotation */
          @keyframes rotate {
              0% {
                  transform: rotate(0deg);
              }
              100% {
                  transform: rotate(360deg);
              }
          }

          /* Classe active lors du téléchargement */
          .downloading {
              animation: rotate 1s linear infinite; /* Rotation continue */
              background-color: rgba(0, 0, 0, 0.8); /* Change légèrement le fond */
              border-color: rgba(255, 255, 255, 0.5); /* Bordure plus marquée */
              opacity: 0.7; /* Légère transparence pour indiquer une action */
          }
      `;
      document.head.appendChild(style); // Ajout de la balise style dans le <head> du document
    }

   function addScrollBarStyles() {
      const style = document.createElement('style');
      style.textContent = `
          .thumbnail-scroll-container::-webkit-scrollbar {
              //height: thin;
              height: 7px;
              background-color: transparent;
          }

          .thumbnail-scroll-container::-webkit-scrollbar-button {
              display: none; /* Pas de boutons */
          }

          /* Coin de la scrollbar */
          .thumbnail-scroll-container::-webkit-scrollbar-corner {
              background-color: transparent;
          }

          /* Thumb (la barre de défilement visible) */
          .thumbnail-scroll-container::-webkit-scrollbar-thumb {
              background-color: rgba(74, 77, 82, 0.7);
              border: 2px solid transparent;
              border-radius: 10px;
          }

          /* Thumb au survol (hover) */
          .thumbnail-scroll-container::-webkit-scrollbar-thumb:hover {
              background-color: rgb(90, 93, 98, 0.7);
          }
      `;

      document.head.appendChild(style);
  }

    function injectStyles(){
      const isMobileDevice = isMobile();

      addSpinnerStyles();
      addDownloadButtonStyles();

      if (!isMobileDevice) {
        addScrollBarStyles();
      }
    }

    const parentClasses = `
        .txt-msg,
        .message,
        .conteneur-message.mb-3,
        .bloc-editor-forum,
        .signature-msg,
        .previsu-editor,
        .bloc-description-desc.txt-enrichi-desc-profil,
        .bloc-signature-desc.txt-enrichi-desc-profil
    `.replace(/\s+/g, ''); // Supprimer les sauts de ligne et espaces inutiles

    const linkSelectors = parentClasses.split(',').map(cls => `${cls} a`);

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

    function getImageExtension(url) {
        const match = url.match(/\.(jpg|jpeg|png|gif|bmp|webp|tiff)$/i); // Regexp pour matcher les extensions d'images
        return match ? match[0].toLowerCase() : null;
    }

    // Observer les changements dans le DOM
    function observeDOMChanges() {
        const observer = new MutationObserver(() => addListeners());
        observer.observe(document, { childList: true, subtree: true });
    }

    // Détection des changements d'URL
    function observeURLChanges() {
        let lastUrl = window.location.href;

        const urlObserver = new MutationObserver(() => {
            if (lastUrl !== window.location.href) {
                lastUrl = window.location.href;
                addListeners();
            }
        });
        urlObserver.observe(document, { subtree: true, childList: true });
    }

    function main() {
        injectStyles();
        addListeners();
        observeDOMChanges();
        observeURLChanges();
    }

    main();

})();
