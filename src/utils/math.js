// Math utilities for The Hunt For The Epstein Files
window.FILE_MANIFEST = window.FILE_MANIFEST || [];
window.FILE_MANIFEST.push({
  name: 'src/utils/math.js',
  exports: ['MathUtils'],
  dependencies: ['GAME_CONSTANTS', 'Vector2D']
});

window.MathUtils = {
  // ==================== BASIC MATH UTILITIES ====================
  
  /**
   * Linear interpolation between two values
   * @param {number} a - Start value
   * @param {number} b - End value
   * @param {number} t - Interpolation factor (0-1)
   * @returns {number} Interpolated value
   */
  lerp(a, b, t) {
    return a + (b - a) * Math.max(0, Math.min(1, t));
  },
  
  /**
   * Clamp value between min and max
   * @param {number} value - Value to clamp
   * @param {number} min - Minimum value
   * @param {number} max - Maximum value
   * @returns {number} Clamped value
   */
  clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  },
  
  /**
   * Map value from one range to another
   * @param {number} value - Value to map
   * @param {number} inMin - Input minimum
   * @param {number} inMax - Input maximum
   * @param {number} outMin - Output minimum
   * @param {number} outMax - Output maximum
   * @returns {number} Mapped value
   */
  mapRange(value, inMin, inMax, outMin, outMax) {
    return outMin + ((value - inMin) / (inMax - inMin)) * (outMax - outMin);
  },
  
  /**
   * Check if value is approximately equal to target
   * @param {number} value - Value to check
   * @param {number} target - Target value
   * @param {number} epsilon - Tolerance (default: 0.001)
   * @returns {boolean} True if approximately equal
   */
  approxEquals(value, target, epsilon = 0.001) {
    return Math.abs(value - target) < epsilon;
  },
  
  /**
   * Get sign of number (-1, 0, or 1)
   * @param {number} value - Value to check
   * @returns {number} Sign
   */
  sign(value) {
    return value > 0 ? 1 : value < 0 ? -1 : 0;
  },
  
  // ==================== 2.5D PROJECTION UTILITIES ====================
  
  /**
   * Convert 3D world coordinates to 2D screen coordinates with 2.5D perspective
   * @param {number} x - World X coordinate
   * @param {number} y - World Y coordinate  
   * @param {number} z - World Z coordinate (depth/height)
   * @param {number} horizon - Horizon line Y position (default: canvas height / 2)
   * @returns {Object} Screen coordinates {x, y, scale}
   */
  project25D(x, y, z, horizon = window.GAME_CONSTANTS.CANVAS_HEIGHT / 2) {
    // Simple 2.5D projection - simulates top-down with slight perspective
    const perspectiveScale = 1 - (z / 1000); // Depth effect
    const screenX = x * perspectiveScale + (window.GAME_CONSTANTS.CANVAS_WIDTH / 2);
    const screenY = y * perspectiveScale + horizon - (z * perspectiveScale * 0.5);
    
    return {
      x: screenX,
      y: screenY,
      scale: perspectiveScale
    };
  },
  
  /**
   * Calculate depth-based scaling for 2.5D effect
   * @param {number} depth - Depth value (0-1, 0 = closest, 1 = farthest)
   * @param {number} maxScale - Maximum scale for closest objects (default: 1.2)
   * @param {number} minScale - Minimum scale for farthest objects (default: 0.6)
   * @returns {number} Scale factor
   */
  getDepthScale(depth, maxScale = 1.2, minScale = 0.6) {
    return this.lerp(maxScale, minScale, Math.max(0, Math.min(1, depth)));
  },
  
  /**
   * Calculate parallax offset for background layers
   * @param {number} baseX - Base X position
   * @param {number} depth - Depth factor (0-1, higher = more parallax)
   * @param {number} viewX - Current view X position
   * @returns {number} Parallax offset
   */
  getParallaxOffset(baseX, depth, viewX) {
    return baseX - (viewX * depth * 0.5);
  },
  
  // ==================== COLLISION DETECTION UTILITIES ====================
  
  /**
   * Check if point is within detection cone
   * @param {Vector2D} point - Point to check
   * @param {Vector2D} coneOrigin - Cone origin position
   * @param {Vector2D} coneDirection - Cone facing direction (normalized)
   * @param {number} coneAngle - Cone angle in radians
   * @param {number} coneRange - Maximum cone range
   * @returns {boolean} True if point is in cone
   */
  pointInDetectionCone(point, coneOrigin, coneDirection, coneAngle, coneRange) {
    const toPoint = point.subtract(coneOrigin);
    const distance = toPoint.length();
    
    if (distance > coneRange) return false;
    
    const toPointNormalized = toPoint.normalize();
    const dotProduct = coneDirection.dot(toPointNormalized);
    const angle = Math.acos(this.clamp(dotProduct, -1, 1));
    
    return angle <= coneAngle / 2;
  },
  
  /**
   * Check line of sight between two points
   * @param {Vector2D} start - Start point
   * @param {Vector2D} end - End point
   * @param {Array} obstacles - Array of colliders to check against
   * @returns {boolean} True if line of sight is clear
   */
  hasLineOfSight(start, end, obstacles) {
    for (const obstacle of obstacles) {
      if (this.lineIntersectsCollider(start, end, obstacle)) {
        return false;
      }
    }
    return true;
  },
  
  /**
   * Check if line segment intersects with collider
   * @param {Vector2D} lineStart - Line start point
   * @param {Vector2D} lineEnd - Line end point
   * @param {AABB|Circle} collider - Collider to check
   * @returns {boolean} True if line intersects collider
   */
  lineIntersectsCollider(lineStart, lineEnd, collider) {
    if (collider instanceof window.AABB) {
      return this.lineIntersectsAABB(lineStart, lineEnd, collider);
    } else if (collider instanceof window.Circle) {
      return this.lineIntersectsCircle(lineStart, lineEnd, collider);
    }
    return false;
  },
  
  /**
   * Check if line segment intersects with AABB
   * @param {Vector2D} lineStart - Line start point
   * @param {Vector2D} lineEnd - Line end point
   * @param {AABB} aabb - AABB to check
   * @returns {boolean} True if line intersects AABB
   */
  lineIntersectsAABB(lineStart, lineEnd, aabb) {
    // Liang-Barsky algorithm
    const dx = lineEnd.x - lineStart.x;
    const dy = lineEnd.y - lineStart.y;
    
    const p = [-dx, dx, -dy, dy];
    const q = [lineStart.x - aabb.left, aabb.right - lineStart.x, 
               lineStart.y - aabb.top, aabb.bottom - lineStart.y];
    
    let u1 = 0, u2 = 1;
    
    for (let i = 0; i < 4; i++) {
      if (p[i] === 0) {
        if (q[i] < 0) return false;
      } else {
        const t = q[i] / p[i];
        if (p[i] < 0 && t > u1) u1 = t;
        else if (p[i] > 0 && t < u2) u2 = t;
        if (u1 > u2) return false;
      }
    }
    
    return u2 >= 0 && u1 <= 1;
  },
  
  /**
   * Check if line segment intersects with circle
   * @param {Vector2D} lineStart - Line start point
   * @param {Vector2D} lineEnd - Line end point
   * @param {Circle} circle - Circle to check
   * @returns {boolean} True if line intersects circle
   */
  lineIntersectsCircle(lineStart, lineEnd, circle) {
    const d = lineEnd.subtract(lineStart);
    const f = lineStart.subtract(new window.Vector2D(circle.x, circle.y));
    
    const a = d.dot(d);
    const b = 2 * f.dot(d);
    const c = f.dot(f) - circle.radius * circle.radius;
    
    const discriminant = b * b - 4 * a * c;
    if (discriminant < 0) return false;
    
    const t1 = (-b - Math.sqrt(discriminant)) / (2 * a);
    const t2 = (-b + Math.sqrt(discriminant)) / (2 * a);
    
    return (t1 >= 0 && t1 <= 1) || (t2 >= 0 && t2 <= 1) || (t1 < 0 && t2 > 1);
  },
  
  // ==================== GAME-SPECIFIC MATH ====================
  
  /**
   * Calculate stealth level based on distance and cover
   * @param {number} distance - Distance to observer
   * @param {number} maxDistance - Maximum detection distance
   * @param {number} coverFactor - Cover factor (0-1, 0 = full cover, 1 = no cover)
   * @param {number} movementPenalty - Movement speed penalty (0-1)
   * @returns {number} Detection likelihood (0-1)
   */
  calculateStealthLevel(distance, maxDistance, coverFactor, movementPenalty) {
    const distanceFactor = 1 - this.clamp(distance / maxDistance, 0, 1);
    const baseDetection = distanceFactor * coverFactor;
    return this.clamp(baseDetection + movementPenalty, 0, 1);
  },
  
  /**
   * Calculate suspicion decay over time
   * @param {number} currentSuspicion - Current suspicion level (0-1)
   * @param {number} dt - Delta time in seconds
   * @param {number} decayRate - Decay rate per second (default: 0.1)
   * @returns {number} New suspicion level
   */
  calculateSuspicionDecay(currentSuspicion, dt, decayRate = 0.1) {
    return Math.max(0, currentSuspicion - decayRate * dt);
  },
  
  /**
   * Get optimal patrol point for guards
   * @param {Array} patrolPoints - Array of patrol points
   * @param {Vector2D} currentPos - Current guard position
   * @param {Vector2D} targetPos - Target/player position (for investigation)
   * @param {number} investigationLevel - How aggressively to pursue target (0-1)
   * @returns {Vector2D} Next patrol point
   */
  getOptimalPatrolPoint(patrolPoints, currentPos, targetPos, investigationLevel) {
    if (patrolPoints.length === 0) return currentPos;
    
    if (investigationLevel > 0.5 && targetPos) {
      // Move towards target when suspicious
      return targetPos;
    }
    
    // Find nearest patrol point
    let nearestPoint = patrolPoints[0];
    let minDistance = currentPos.distanceTo(nearestPoint);
    
    for (let i = 1; i < patrolPoints.length; i++) {
      const distance = currentPos.distanceTo(patrolPoints[i]);
      if (distance < minDistance) {
        minDistance = distance;
        nearestPoint = patrolPoints[i];
      }
    }
    
    return nearestPoint;
  },
  
  /**
   * Calculate trap trigger probability based on proximity and speed
   * @param {number} distance - Distance to trap center
   * @param {number} triggerRadius - Trap trigger radius
   * @param {number} entitySpeed - Entity movement speed
   * @param {number} maxSpeed - Maximum expected speed
   * @returns {number} Trigger probability (0-1)
   */
  calculateTrapTriggerProbability(distance, triggerRadius, entitySpeed, maxSpeed) {
    const proximityFactor = 1 - this.clamp(distance / triggerRadius, 0, 1);
    const speedFactor = this.clamp(entitySpeed / maxSpeed, 0, 1);
    return this.clamp(proximityFactor * speedFactor, 0, 1);
  },
  
  /**
   * Generate random position within bounds
   * @param {AABB} bounds - Bounds to generate position within
   * @param {number} margin - Margin from edges (default: 0)
   * @returns {Vector2D} Random position
   */
  randomPositionInBounds(bounds, margin = 0) {
    const x = bounds.x + margin + Math.random() * (bounds.width - 2 * margin);
    const y = bounds.y + margin + Math.random() * (bounds.height - 2 * margin);
    return new window.Vector2D(x, y);
  },
  
  /**
   * Generate random position on circle perimeter
   * @param {Vector2D} center - Circle center
   * @param {number} radius - Circle radius
   * @param {number} angleRange - Angle range in radians (default: 2PI for full circle)
   * @param {number} angleOffset - Angle offset in radians (default: 0)
   * @returns {Vector2D} Random position on perimeter
   */
  randomPositionOnCircle(center, radius, angleRange = Math.PI * 2, angleOffset = 0) {
    const angle = angleOffset + Math.random() * angleRange;
    const x = center.x + Math.cos(angle) * radius;
    const y = center.y + Math.sin(angle) * radius;
    return new window.Vector2D(x, y);
  },
  
  /**
   * Calculate bounce direction for projectiles
   * @param {Vector2D} incident - Incident direction (normalized)
   * @param {Vector2D} normal - Surface normal (normalized)
   * @param {number} elasticity - Bounce factor (0-1, 1 = perfect bounce)
   * @returns {Vector2D} Bounce direction
   */
  calculateBounce(incident, normal, elasticity = 1) {
    const dotProduct = incident.dot(normal);
    const reflection = incident.subtract(normal.multiply(2 * dotProduct));
    return reflection.multiply(elasticity);
  },
  
  /**
   * Interpolate between multiple waypoints
   * @param {Array} waypoints - Array of Vector2D waypoints
   * @param {number} t - Interpolation factor (0-1)
   * @param {boolean} loop - Whether to loop back to start
   * @returns {Vector2D} Interpolated position
   */
  interpolateWaypoints(waypoints, t, loop = false) {
    if (waypoints.length === 0) return new window.Vector2D();
    if (waypoints.length === 1) return waypoints[0].clone();
    
    let totalLength = 0;
    const segmentLengths = [];
    
    // Calculate total path length
    for (let i = 0; i < waypoints.length - 1; i++) {
      const length = waypoints[i].distanceTo(waypoints[i + 1]);
      segmentLengths.push(length);
      totalLength += length;
    }
    
    if (loop) {
      const length = waypoints[waypoints.length - 1].distanceTo(waypoints[0]);
      segmentLengths.push(length);
      totalLength += length;
    }
    
    // Find current segment
    const targetDistance = t * totalLength;
    let currentDistance = 0;
    let segmentIndex = 0;
    
    for (let i = 0; i < segmentLengths.length; i++) {
      if (currentDistance + segmentLengths[i] >= targetDistance) {
        segmentIndex = i;
        break;
      }
      currentDistance += segmentLengths[i];
    }
    
    // Interpolate within segment
    const segmentT = (targetDistance - currentDistance) / segmentLengths[segmentIndex];
    const startPoint = waypoints[segmentIndex];
    const endPoint = loop && segmentIndex === waypoints.length - 1 ? 
                      waypoints[0] : waypoints[segmentIndex + 1];
    
    return startPoint.lerp(endPoint, segmentT);
  },
  
  /**
   * Smooth value using exponential moving average
   * @param {number} current - Current value
   * @param {number} target - Target value
   * @param {number} smoothing - Smoothing factor (0-1, higher = less smoothing)
   * @param {number} dt - Delta time
   * @returns {number} Smoothed value
   */
  smoothValue(current, target, smoothing, dt) {
    const factor = 1 - Math.pow(1 - smoothing, dt);
    return this.lerp(current, target, factor);
  },
  
  /**
   * Convert degrees to radians
   * @param {number} degrees - Angle in degrees
   * @returns {number} Angle in radians
   */
  degToRad(degrees) {
    return degrees * Math.PI / 180;
  },
  
  /**
   * Convert radians to degrees
   * @param {number} radians - Angle in radians
   * @returns {number} Angle in degrees
   */
  radToDeg(radians) {
    return radians * 180 / Math.PI;
  }
};