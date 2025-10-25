document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Element References ---
    const enterButton = document.getElementById('enter-button');
    const takePhotoButton = document.getElementById('take-photo-button');
    const downloadButton = document.getElementById('download-button');
    const restartButton = document.getElementById('restart-button');
    const filterSwitch = document.getElementById('filter-switch');
    const video = document.getElementById('camera-feed');
    const captureCanvas = document.getElementById('capture-canvas');
    const resultCanvas = document.getElementById('result-canvas');
    const countdownOverlay = document.getElementById('countdown-overlay');
    const printingCountdown = document.getElementById('printing-countdown');
    const flashOverlay = document.getElementById('flash-overlay');
    
    // --- State Variables ---
    let stream;
    const capturedPhotos = [];
    const PHOTO_COUNT = 4;
    const COUNTDOWN_SECONDS = 3;

    /**
     * Shows a specific view by its ID and hides all others.
     * @param {string} viewId The ID of the view to make active.
     */
    const showView = (viewId) => {
        document.querySelectorAll('.view').forEach(view => {
            view.classList.remove('active');
        });
        document.getElementById(viewId).classList.add('active');
    };

    /**
     * Initializes the webcam stream.
     */
    const startCamera = async () => {
        if (!navigator.mediaDevices?.getUserMedia) {
            alert("Sorry, your browser doesn't support camera access!");
            return;
        }
        showView('capture-page');
        try {
            stream = await navigator.mediaDevices.getUserMedia({ 
                video: { width: { ideal: 1280 }, height: { ideal: 720 } }, 
                audio: false 
            });
            video.srcObject = stream;
        } catch (err) {
            console.error("Camera access error:", err);
            alert("Could not access the camera. Please grant permission and try again!");
            showView('landing-page');
        }
    };

    /**
     * Manages the sequence of taking 4 photos.
     */
    const captureSequence = async () => {
        takePhotoButton.disabled = true;
        capturedPhotos.length = 0; // Clear previous photos
        for (let i = 0; i < PHOTO_COUNT; i++) {
            await runCountdown();
            await takePhoto();
        }
        processPhotos();
    };

    /**
     * Displays a countdown on the screen.
     */
    const runCountdown = () => {
        return new Promise(resolve => {
            let count = COUNTDOWN_SECONDS;
            countdownOverlay.textContent = count;
            countdownOverlay.classList.add('show');
            const interval = setInterval(() => {
                count--;
                if (count > 0) {
                    countdownOverlay.textContent = count;
                } else {
                    clearInterval(interval);
                    countdownOverlay.classList.remove('show');
                    setTimeout(resolve, 300); // Brief pause before flash
                }
            }, 1000);
        });
    };

    /**
     * Triggers a flash and captures a single frame from the video.
     */
    const takePhoto = () => {
        return new Promise(resolve => {
            flashOverlay.classList.add('flash');
            setTimeout(() => flashOverlay.classList.remove('flash'), 300);
            
            const ctx = captureCanvas.getContext('2d');
            captureCanvas.width = video.videoWidth;
            captureCanvas.height = video.videoHeight;
            
            // Mirror the capture on canvas
            ctx.translate(captureCanvas.width, 0);
            ctx.scale(-1, 1);

            // Apply grayscale filter on the canvas if the toggle is checked
            ctx.filter = filterSwitch.checked ? 'grayscale(100%)' : 'none'; // Apply filter if checked
            ctx.drawImage(video, 0, 0, captureCanvas.width, captureCanvas.height);
            
            // Reset transformation for next drawing
            ctx.setTransform(1, 0, 0, 1, 0, 0); 
            
            capturedPhotos.push(captureCanvas.toDataURL('image/jpeg', 0.9));
            
            setTimeout(resolve, 500); // Pause between photos
        });
    };

    /**
     * Stops the camera and transitions to the printing page.
     */
    const processPhotos = () => {
        if (stream) stream.getTracks().forEach(track => track.stop());
        showView('printing-page');
        
        let printTime = 5;
        printingCountdown.textContent = printTime;
        const printInterval = setInterval(() => {
            printTime--;
            printingCountdown.textContent = printTime;
            if (printTime <= 0) {
                clearInterval(printInterval);
                createFilmStrip();
                showView('result-page');
            }
        }, 1000);
    };

    /**
     * Draws the captured photos onto the final canvas as a film strip.
     */
    const createFilmStrip = () => {
        const ctx = resultCanvas.getContext('2d');
        const photoWidth = 500; 
        const photoHeight = photoWidth * (9/16); // Match 16:9 aspect ratio
        const padding = 20;
        
        resultCanvas.width = photoWidth + (padding * 2);
        resultCanvas.height = (photoHeight + padding) * PHOTO_COUNT + padding;

        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, resultCanvas.width, resultCanvas.height);

        const imagePromises = capturedPhotos.map(dataUrl => {
            return new Promise(resolve => {
                const img = new Image();
                img.onload = () => resolve(img);
                img.src = dataUrl;
            });
        });

        Promise.all(imagePromises).then(images => {
            images.forEach((img, index) => {
                const yPos = padding + index * (photoHeight + padding);
                ctx.drawImage(img, padding, yPos, photoWidth, photoHeight);
            });
        });
    };
    
    // --- Event Listeners ---
    enterButton.addEventListener('click', startCamera);
    takePhotoButton.addEventListener('click', captureSequence);
    downloadButton.addEventListener('click', () => {
        const link = document.createElement('a');
        link.download = 'photostrip.png';
        link.href = resultCanvas.toDataURL('image/png');
        link.click();
    });
    restartButton.addEventListener('click', () => location.reload());
    filterSwitch.addEventListener('change', () => {
        // Toggles the class on the video element for visual feedback
        video.classList.toggle('grayscale', filterSwitch.checked);
    });

    // --- Initial State ---
    showView('landing-page');
});