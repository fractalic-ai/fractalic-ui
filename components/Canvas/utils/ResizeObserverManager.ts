/**
 * ResizeObserverManager - Tracks group size changes and triggers layout updates
 */
class ResizeObserverManager {
  private observers: Map<string, ResizeObserver> = new Map();
  private debounceTimers: Map<string, number> = new Map();
  private animationFrames: Map<string, number> = new Map();
  private debounceTime = 100; // ms
  private isTransitioning: Map<string, boolean> = new Map();
  private isBulkOperationInProgress = false;
  
  /**
   * Observe a group element for size changes
   */
  observeGroup(groupId: string, element: HTMLElement) {
    // Clean up any existing observer
    this.unobserveGroup(groupId);
    
    // Create a new observer
    const observer = new ResizeObserver((entries) => {
      // Check if this is a size change during animation
      const entry = entries[0];
      if (entry) {
        const isAnimating = this.isTransitioning.get(groupId) || false;
        this.handleResize(groupId, isAnimating);
      } else {
        this.handleResize(groupId, false);
      }
    });
    
    // Also observe transition events to detect animations
    element.addEventListener('transitionstart', (e: TransitionEvent) => {
      if (e.propertyName === 'height' || e.propertyName === 'max-height') {
        this.isTransitioning.set(groupId, true);
        this.handleContinuousResize(groupId);
        
        // Also trigger connection updates directly
        window.dispatchEvent(new CustomEvent('force-connections-update', {
          detail: { isAnimating: true, groupId }
        }));
      }
    });
    
    element.addEventListener('transitionend', (e: TransitionEvent) => {
      if (e.propertyName === 'height') {
        this.isTransitioning.set(groupId, false);
        // Final update after transition
        this.handleResize(groupId, false);
      }
    });
    
    // Listen for bulk operations to optimize handling
    window.addEventListener('bulk-operation', (e: Event) => {
      const event = e as CustomEvent;
      this.isBulkOperationInProgress = true;
      
      // For bulk operations, we'll handle updates differently
      if (event.detail?.action === 'bulk-expand' || event.detail?.action === 'bulk-collapse') {
        // We'll force a continuous resize update
        this.handleContinuousResize(groupId);
      }
      
      // Reset flag after animation completes
      setTimeout(() => {
        this.isBulkOperationInProgress = false;
      }, 400);
    });
    
    observer.observe(element);
    this.observers.set(groupId, observer);
  }
  
  /**
   * Stop observing a group
   */
  unobserveGroup(groupId: string) {
    const observer = this.observers.get(groupId);
    if (observer) {
      observer.disconnect();
      this.observers.delete(groupId);
    }
    
    // Clear any pending timers
    if (this.debounceTimers.has(groupId)) {
      window.clearTimeout(this.debounceTimers.get(groupId));
      this.debounceTimers.delete(groupId);
    }
    
    // Cancel any animation frames
    if (this.animationFrames.has(groupId)) {
      window.cancelAnimationFrame(this.animationFrames.get(groupId)!);
      this.animationFrames.delete(groupId);
    }
  }
  
  /**
   * Handle continuous resize events during animation
   */
  private handleContinuousResize(groupId: string) {
    // Clear existing animation frame
    if (this.animationFrames.has(groupId)) {
      window.cancelAnimationFrame(this.animationFrames.get(groupId)!);
    }
    
    // Function to update during animation with higher frequency
    const updateDuringAnimation = () => {
      // Dispatch events for both layout and connections
      const layoutEvent = new CustomEvent('force-layout-update', {
        detail: { groupId, isAnimating: true, isBulkOperation: this.isBulkOperationInProgress }
      });
      window.dispatchEvent(layoutEvent);
      
      const connEvent = new CustomEvent('force-connections-update', {
        detail: { isAnimating: true, isBulkOperation: this.isBulkOperationInProgress }
      });
      window.dispatchEvent(connEvent);
      
      // When in animation mode, continue updates at animation framerate
      if (this.isTransitioning.get(groupId) || this.isBulkOperationInProgress) {
        this.animationFrames.set(groupId, window.requestAnimationFrame(updateDuringAnimation));
      } else {
        this.animationFrames.delete(groupId);
      }
    };
    
    // Start animation frame updates
    this.animationFrames.set(groupId, window.requestAnimationFrame(updateDuringAnimation));
    
    // Set a max duration as a failsafe
    setTimeout(() => {
      if (this.animationFrames.has(groupId)) {
        window.cancelAnimationFrame(this.animationFrames.get(groupId)!);
        this.animationFrames.delete(groupId);
        this.isTransitioning.set(groupId, false);
      }
    }, 1000); // 1 second max
  }
  
  /**
   * Handle resize event with debounce
   */
  private handleResize(groupId: string, isAnimating: boolean = false) {
    // During animation, use continuous updates
    if (isAnimating) {
      this.handleContinuousResize(groupId);
      return;
    }
    
    // For non-animated changes, use debouncing
    if (this.debounceTimers.has(groupId)) {
      window.clearTimeout(this.debounceTimers.get(groupId));
    }
    
    // Set a new timer
    const timerId = window.setTimeout(() => {
      // Dispatch a global event for layout recalculation
      const event = new CustomEvent('force-layout-update', {
        detail: { groupId }
      });
      window.dispatchEvent(event);
      this.debounceTimers.delete(groupId);
    }, this.debounceTime);
    
    this.debounceTimers.set(groupId, timerId);
  }
  
  /**
   * Clean up all observers
   */
  dispose() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();
    
    this.debounceTimers.forEach(timerId => window.clearTimeout(timerId));
    this.debounceTimers.clear();
    
    this.animationFrames.forEach(frameId => window.cancelAnimationFrame(frameId));
    this.animationFrames.clear();
    
    this.isTransitioning.clear();
  }
}

export const resizeObserverManager = new ResizeObserverManager();
