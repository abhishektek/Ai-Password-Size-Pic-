import { Dimensions, Point, PassportStandard } from "../types";

export const performCrop = (
  image: HTMLImageElement,
  crop: { x: number; y: number; width: number; height: number }, // Natural coordinates
  targetWidth: number = 600
): string => {
  const canvas = document.createElement('canvas');
  // Target height based on crop aspect ratio
  const aspectRatio = crop.width / crop.height;
  const targetHeight = targetWidth / aspectRatio;
  
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw the cropped portion of the source image onto the target canvas
  ctx.drawImage(
    image,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    targetWidth,
    targetHeight
  );

  return canvas.toDataURL('image/jpeg', 1.0);
};

export const createTiledSheet = async (
  sourceImage: string, 
  standard: PassportStandard,
  paperSize: '4x6' | 'A4' = '4x6',
  orientation: 'portrait' | 'landscape' = 'portrait',
  config: {
    addBorder: boolean;
    gapMm: number; // Gap between photos in mm
    forceGrid?: { cols: number, rows: number }; // Optional forced grid
    limitCount?: number; // Optional limit for custom quantity
  }
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
        // DPI Configuration
        const dpi = 300;
        const mmToPx = (mm: number) => (mm / 25.4) * dpi;
        
        let sheetWidth = 0;
        let sheetHeight = 0;

        // Define dimensions in pixels based on 300 DPI
        if (paperSize === '4x6') {
             // 4x6 inches (101.6 x 152.4 mm)
             sheetWidth = 1200;
             sheetHeight = 1800;
        } else if (paperSize === 'A4') {
             // A4 (210 x 297 mm)
             sheetWidth = 2480;
             sheetHeight = 3508;
        }

        // Handle Orientation Swap
        if (orientation === 'landscape') {
            const temp = sheetWidth;
            sheetWidth = sheetHeight;
            sheetHeight = temp;
        }

        const sheetCanvas = document.createElement('canvas');
        sheetCanvas.width = sheetWidth;
        sheetCanvas.height = sheetHeight;
        const ctx = sheetCanvas.getContext('2d');
        
        if (!ctx) {
            reject("Could not get canvas context");
            return;
        }

        // White background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, sheetCanvas.width, sheetCanvas.height);
        
        // Settings
        const gapPx = mmToPx(config.gapMm);
        const marginPx = mmToPx(config.gapMm); // Use same margin as gap for uniformity
        
        let cols = 0;
        let rows = 0;
        let itemWidth = 0;
        let itemHeight = 0;

        if (config.forceGrid) {
            // --- Forced Grid Logic (Fit 12 or 36 photos exactly) ---
            cols = config.forceGrid.cols;
            rows = config.forceGrid.rows;
            
            // Calculate available space
            const availableWidth = sheetWidth - (2 * marginPx) - ((cols - 1) * gapPx);
            const availableHeight = sheetHeight - (2 * marginPx) - ((rows - 1) * gapPx);
            
            // Calculate max possible slot size
            const maxSlotWidth = availableWidth / cols;
            const maxSlotHeight = availableHeight / rows;
            
            // Determine dimensions based on aspect ratio
            const photoAspect = standard.widthMm / standard.heightMm;
            
            if (maxSlotWidth / maxSlotHeight > photoAspect) {
                // Height is the limiting factor
                itemHeight = maxSlotHeight;
                itemWidth = itemHeight * photoAspect;
            } else {
                // Width is the limiting factor
                itemWidth = maxSlotWidth;
                itemHeight = itemWidth / photoAspect;
            }
        } else {
            // --- Standard Auto-Fit Logic ---
            const wPx = mmToPx(standard.widthMm);
            const hPx = mmToPx(standard.heightMm);
            
            // Calculate grid
            const availW = sheetWidth - (2 * marginPx);
            const availH = sheetHeight - (2 * marginPx);
            
            cols = Math.floor((availW + gapPx) / (wPx + gapPx));
            rows = Math.floor((availH + gapPx) / (hPx + gapPx));
            
            itemWidth = wPx;
            itemHeight = hPx;
        }

        // Center the grid on the sheet
        const totalGridW = (cols * itemWidth) + ((cols - 1) * gapPx);
        const totalGridH = (rows * itemHeight) + ((rows - 1) * gapPx);
        
        const startX = (sheetWidth - totalGridW) / 2;
        const startY = (sheetHeight - totalGridH) / 2;

        // Draw Loop
        let count = 0;
        const maxLimit = config.limitCount || (cols * rows); // Use custom limit or fill sheet

        // We loop row by row, col by col. 
        // We break if we hit the limit.
        outerLoop:
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                if (count >= maxLimit) break outerLoop;

                const px = startX + col * (itemWidth + gapPx);
                const py = startY + row * (itemHeight + gapPx);
                
                // Draw Photo
                ctx.drawImage(img, px, py, itemWidth, itemHeight);
                
                // Draw Border (Black line around photo for cutting guide)
                if (config.addBorder) {
                    ctx.strokeStyle = '#000000'; 
                    ctx.lineWidth = 1;
                    ctx.strokeRect(px, py, itemWidth, itemHeight);
                }
                
                count++;
            }
        }
        
        // Add meta info text
        ctx.fillStyle = '#aaaaaa';
        ctx.font = '24px Arial';
        const infoText = `PassportAI - ${count} Photos`;
        
        // Position text at bottom if space permits
        if (sheetHeight - (startY + totalGridH) > 30) {
             ctx.textAlign = 'center';
             ctx.fillText(infoText, sheetWidth / 2, sheetHeight - 15);
        }

        resolve(sheetCanvas.toDataURL('image/jpeg', 0.95));
    };
    img.onerror = reject;
    img.src = sourceImage;
  });
};