// Asset loading system for The Hunt For The Epstein Files
window.FILE_MANIFEST = window.FILE_MANIFEST || [];
window.FILE_MANIFEST.push({
  name: 'src/game/game-asset-loader.js',
  exports: ['AssetLoader'],
  dependencies: []
});

window.AssetLoader = class AssetLoader {
  constructor() {
    this.isAssetsLoaded = false;
    this.hasAssetError = false;
    this.loadingProgress = 0;
    this.loadingTotal = 0;
  }
  
  /**
   * Load MakkoEngine sprite assets with progress tracking and graceful error handling
   * @returns {Promise<void>}
   */
  async loadAssets(canvas) {
    // MakkoEngine is optional - game will work with fallback rendering
    if (!window.MakkoEngine) {
      console.log('MakkoEngine not available - using fallback rendering');
      this.hasAssetError = false; // Not an error, just fallback
      this.updateLoadingScreen(canvas, 1, 1);
      this.isAssetsLoaded = true;
      return;
    }

    // Check if sprites-manifest.json exists by attempting to fetch it first
    let manifestExists = false;
    try {
      const response = await fetch('sprites-manifest.json', { method: 'HEAD' });
      manifestExists = response.ok;
    } catch (error) {
      console.warn('Could not verify sprites-manifest.json existence:', error.message);
      manifestExists = false;
    }

    if (!manifestExists) {
      console.log('sprites-manifest.json not found - continuing with fallback rendering');
      this.hasAssetError = false; // Not an error, just fallback
      this.updateLoadingScreen(canvas, 1, 1);
      this.isAssetsLoaded = true;
      return;
    }

    return new Promise((resolve, reject) => {
      window.MakkoEngine.init('sprites-manifest.json', {
        onProgress: (loaded, total) => {
          this.loadingProgress = loaded;
          this.loadingTotal = total;
          this.updateLoadingScreen(canvas, loaded, total);
          console.log(`Loading assets: ${loaded}/${total}`);
        },
        onComplete: () => {
          this.isAssetsLoaded = true;
          console.log('All sprite assets loaded successfully');
          resolve();
        },
        onError: (error) => {
          console.error('Asset loading error:', error.message);
          this.hasAssetError = true;
          // Show warning but don't reject - allow game to continue
          this.showErrorScreen(canvas, 'Warning: Some assets failed to load. Game will continue with reduced graphics.');
          resolve();
        }
      });
    });
  }
  
  /**
   * Update loading screen display
   * @param {HTMLCanvasElement} canvas - Canvas element
   * @param {number} loaded - Number of loaded assets
   * @param {number} total - Total number of assets
   */
  updateLoadingScreen(canvas, loaded, total) {
    const percentage = total > 0 ? Math.round((loaded / total) * 100) : 0;
    
    try {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      ctx.fillStyle = '#fff';
      ctx.font = '24px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('Loading The Hunt For The Epstein Files...', canvas.width / 2, canvas.height / 2 - 30);
      
      ctx.font = '18px monospace';
      ctx.fillText(`${loaded} / ${total} assets loaded (${percentage}%)`, canvas.width / 2, canvas.height / 2 + 10);

      if (this.hasAssetError) {
        ctx.fillStyle = '#ff9800';
        ctx.font = '14px monospace';
        ctx.fillText('Note: Some assets may be missing - game will continue with reduced graphics', canvas.width / 2, canvas.height / 2 + 40);
      }
    } catch (error) {
      console.error('Loading screen update error:', error.message);
    }
  }
  
  /**
   * Show error screen
   * @param {HTMLCanvasElement} canvas - Canvas element
   * @param {string} message - Error message to display
   */
  showErrorScreen(canvas, message) {
    try {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      if (message.includes('Warning')) {
        ctx.fillStyle = '#ff9800';
        ctx.font = '24px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('WARNING', canvas.width / 2, canvas.height / 2 - 30);
      } else {
        ctx.fillStyle = '#f44336';
        ctx.font = '24px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('ERROR', canvas.width / 2, canvas.height / 2 - 30);
      }
      
      ctx.fillStyle = '#fff';
      ctx.font = '16px monospace';
      ctx.fillText(message, canvas.width / 2, canvas.height / 2 + 10);
      
      ctx.font = '14px monospace';
      ctx.fillText('Refresh the page to try again', canvas.width / 2, canvas.height / 2 + 40);
    } catch (error) {
      console.error('Error screen display failed:', error.message);
    }
  }
};