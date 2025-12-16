// Physics system for The Hunt For The Epstein Files
window.FILE_MANIFEST = window.FILE_MANIFEST || [];
window.FILE_MANIFEST.push({
  name: 'src/engine/physics.js',
  exports: ['PhysicsEngine', 'AABB', 'Circle', 'Vector2D'],
  dependencies: ['GAME_CONSTANTS']
});

window.Vector2D = class Vector2D {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }
  
  add(v) {
    return new window.Vector2D(this.x + v.x, this.y + v.y);
  }
  
  subtract(v) {
    return new window.Vector2D(this.x - v.x, this.y - v.y);
  }
  
  multiply(scalar) {
    return new window.Vector2D(this.x * scalar, this.y * scalar);
  }
  
  divide(scalar) {
    return new window.Vector2D(this.x / scalar, this.y / scalar);
  }
  
  dot(v) {
    return this.x * v.x + this.y * v.y;
  }
  
  length() {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }
  
  lengthSquared() {
    return this.x * this.x + this.y * this.y;
  }
  
  normalize() {
    const len = this.length();
    if (len === 0) return new window.Vector2D(0, 0);
    return this.divide(len);
  }
  
  distanceTo(v) {
    return this.subtract(v).length();
  }
  
  angle() {
    return Math.atan2(this.y, this.x);
  }
  
  rotate(angle) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return new window.Vector2D(
      this.x * cos - this.y * sin,
      this.x * sin + this.y * cos
    );
  }
  
  lerp(v, t) {
    return new window.Vector2D(
      this.x + (v.x - this.x) * t,
      this.y + (v.y - this.y) * t
    );
  }
  
  clone() {
    return new window.Vector2D(this.x, this.y);
  }
  
  toString() {
    return `Vector2D(${this.x.toFixed(2)}, ${this.y.toFixed(2)})`;
  }
};

window.AABB = class AABB {
  constructor(x, y, width, height) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
  }
  
  get left() { return this.x; }
  get right() { return this.x + this.width; }
  get top() { return this.y; }
  get bottom() { return this.y + this.height; }
  get centerX() { return this.x + this.width / 2; }
  get centerY() { return this.y + this.height / 2; }
  
  contains(point) {
    return point.x >= this.left && point.x <= this.right &&
           point.y >= this.top && point.y <= this.bottom;
  }
  
  intersects(other) {
    if (other instanceof window.AABB) {
      return !(this.right < other.left || this.left > other.right ||
               this.bottom < other.top || this.top > other.bottom);
    }
    return false;
  }
  
  getIntersection(other) {
    if (!this.intersects(other)) return null;
    
    const left = Math.max(this.left, other.left);
    const top = Math.max(this.top, other.top);
    const right = Math.min(this.right, other.right);
    const bottom = Math.min(this.bottom, other.bottom);
    
    return new window.AABB(left, top, right - left, bottom - top);
  }
  
  getCenter() {
    return new window.Vector2D(this.centerX, this.centerY);
  }
  
  clone() {
    return new window.AABB(this.x, this.y, this.width, this.height);
  }
};

window.Circle = class Circle {
  constructor(x, y, radius) {
    this.x = x;
    this.y = y;
    this.radius = radius;
  }
  
  get center() {
    return new window.Vector2D(this.x, this.y);
  }
  
  contains(point) {
    const dx = point.x - this.x;
    const dy = point.y - this.y;
    return dx * dx + dy * dy <= this.radius * this.radius;
  }
  
  intersects(other) {
    if (other instanceof window.Circle) {
      const dx = this.x - other.x;
      const dy = this.y - other.y;
      const distanceSquared = dx * dx + dy * dy;
      const radiusSum = this.radius + other.radius;
      return distanceSquared <= radiusSum * radiusSum;
    } else if (other instanceof window.AABB) {
      // Find closest point on AABB to circle center
      const closestX = Math.max(other.left, Math.min(this.x, other.right));
      const closestY = Math.max(other.top, Math.min(this.y, other.bottom));
      
      // Check if closest point is inside circle
      const dx = this.x - closestX;
      const dy = this.y - closestY;
      return dx * dx + dy * dy <= this.radius * this.radius;
    }
    return false;
  }
  
  clone() {
    return new window.Circle(this.x, this.y, this.radius);
  }
};

window.PhysicsEngine = class PhysicsEngine {
  constructor() {
    this.gravity = new window.Vector2D(0, 0); // Top-down game, no gravity
    this.entities = [];
    this.staticColliders = [];
    this.triggers = [];
    this.gridSize = window.GAME_CONSTANTS.GRID_SIZE;
    this.spatialGrid = {};
  }
  
  addEntity(entity) {
    this.entities.push(entity);
    return entity;
  }
  
  removeEntity(entity) {
    const index = this.entities.indexOf(entity);
    if (index > -1) {
      this.entities.splice(index, 1);
    }
  }
  
  addStaticCollider(collider) {
    this.staticColliders.push(collider);
    return collider;
  }
  
  addTrigger(trigger) {
    this.triggers.push(trigger);
    return trigger;
  }
  
  update(dt) {
    this.clearSpatialGrid();
    this.buildSpatialGrid();
    
    // Update entity physics
    for (const entity of this.entities) {
      if (entity.physics) {
        this.updateEntity(entity, dt);
      }
    }
    
    // Check collisions
    this.checkCollisions();
    this.checkTriggers();
  }
  
  clearSpatialGrid() {
    this.spatialGrid = {};
  }
  
  buildSpatialGrid() {
    for (const entity of this.entities) {
      if (entity.physics && entity.collider) {
        const bounds = this.getGridBounds(entity.collider);
        for (let x = bounds.minX; x <= bounds.maxX; x++) {
          for (let y = bounds.minY; y <= bounds.maxY; y++) {
            const key = `${x},${y}`;
            if (!this.spatialGrid[key]) {
              this.spatialGrid[key] = [];
            }
            this.spatialGrid[key].push(entity);
          }
        }
      }
    }
  }
  
  getGridBounds(collider) {
    let x, y, width, height;
    
    if (collider instanceof window.AABB) {
      x = collider.x;
      y = collider.y;
      width = collider.width;
      height = collider.height;
    } else if (collider instanceof window.Circle) {
      x = collider.x - collider.radius;
      y = collider.y - collider.radius;
      width = collider.radius * 2;
      height = collider.radius * 2;
    } else {
      return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
    }
    
    return {
      minX: Math.floor(x / this.gridSize),
      minY: Math.floor(y / this.gridSize),
      maxX: Math.floor((x + width) / this.gridSize),
      maxY: Math.floor((y + height) / this.gridSize)
    };
  }
  
  getNearbyEntities(entity) {
    const nearby = [];
    const bounds = this.getGridBounds(entity.collider);
    
    for (let x = bounds.minX; x <= bounds.maxX; x++) {
      for (let y = bounds.minY; y <= bounds.maxY; y++) {
        const key = `${x},${y}`;
        const cell = this.spatialGrid[key];
        if (cell) {
          for (const other of cell) {
            if (other !== entity && nearby.indexOf(other) === -1) {
              nearby.push(other);
            }
          }
        }
      }
    }
    
    return nearby;
  }
  
  updateEntity(entity, dt) {
    const physics = entity.physics;
    
    // Apply velocity
    if (physics.velocity) {
      entity.position.x += physics.velocity.x * dt;
      entity.position.y += physics.velocity.y * dt;
    }
    
    // Apply friction
    if (physics.friction) {
      physics.velocity.x *= Math.pow(1 - physics.friction, dt);
      physics.velocity.y *= Math.pow(1 - physics.friction, dt);
    }
    
    // Update collider position
    if (entity.collider) {
      this.updateColliderPosition(entity.collider, entity.position);
    }
  }
  
  updateColliderPosition(collider, position) {
    if (collider instanceof window.AABB) {
      collider.x = position.x - collider.width / 2;
      collider.y = position.y - collider.height / 2;
    } else if (collider instanceof window.Circle) {
      collider.x = position.x;
      collider.y = position.y;
    }
  }
  
  checkCollisions() {
    for (const entity of this.entities) {
      if (!entity.physics || !entity.collider) continue;
      
      // Check against static colliders
      for (const staticCollider of this.staticColliders) {
        if (this.intersects(entity.collider, staticCollider)) {
          this.resolveCollision(entity, staticCollider);
        }
      }
      
      // Check against other entities
      const nearby = this.getNearbyEntities(entity);
      for (const other of nearby) {
        if (!other.physics || !other.collider) continue;
        
        if (this.intersects(entity.collider, other.collider)) {
          this.resolveEntityCollision(entity, other);
        }
      }
    }
  }
  
  checkTriggers() {
    for (const entity of this.entities) {
      if (!entity.collider) continue;
      
      for (const trigger of this.triggers) {
        if (this.intersects(entity.collider, trigger.collider)) {
          if (trigger.onEnter && !trigger.wasTriggered) {
            trigger.onEnter(entity);
          }
          trigger.wasTriggered = true;
        } else {
          if (trigger.onExit && trigger.wasTriggered) {
            trigger.onExit(entity);
          }
          trigger.wasTriggered = false;
        }
      }
    }
  }
  
  intersects(collider1, collider2) {
    if (collider1 instanceof window.AABB && collider2 instanceof window.AABB) {
      return collider1.intersects(collider2);
    } else if (collider1 instanceof window.Circle && collider2 instanceof window.Circle) {
      return collider1.intersects(collider2);
    } else {
      // Mixed types
      const circle = collider1 instanceof window.Circle ? collider1 : collider2;
      const aabb = collider1 instanceof window.AABB ? collider1 : collider2;
      return circle.intersects(aabb);
    }
  }
  
  resolveCollision(entity, staticCollider) {
    // Simple push-back resolution
    const overlap = this.getOverlap(entity.collider, staticCollider);
    if (!overlap) return;
    
    // Find smallest push-out direction
    let pushX = 0;
    let pushY = 0;
    
    if (Math.abs(overlap.x) < Math.abs(overlap.y)) {
      pushX = -Math.sign(overlap.x) * Math.abs(overlap.x);
    } else {
      pushY = -Math.sign(overlap.y) * Math.abs(overlap.y);
    }
    
    entity.position.x += pushX;
    entity.position.y += pushY;
    
    // Stop velocity in collision direction
    if (Math.abs(pushX) > 0) {
      entity.physics.velocity.x = 0;
    }
    if (Math.abs(pushY) > 0) {
      entity.physics.velocity.y = 0;
    }
    
    this.updateColliderPosition(entity.collider, entity.position);
  }
  
  resolveEntityCollision(entity1, entity2) {
    // Simple elastic collision
    const pos1 = entity1.position;
    const pos2 = entity2.position;
    const vel1 = entity1.physics.velocity;
    const vel2 = entity2.physics.velocity;
    
    // Calculate collision normal
    const normal = pos2.subtract(pos1).normalize();
    
    // Separate entities
    const overlap = this.getOverlap(entity1.collider, entity2.collider);
    if (overlap) {
      const separation = normal.multiply(Math.abs(overlap.x) || Math.abs(overlap.y) * 0.5);
      entity1.position = entity1.position.subtract(separation);
      entity2.position = entity2.position.add(separation);
      
      this.updateColliderPosition(entity1.collider, entity1.position);
      this.updateColliderPosition(entity2.collider, entity2.position);
    }
    
    // Exchange velocities along collision normal
    const relativeVelocity = vel1.subtract(vel2);
    const velocityAlongNormal = relativeVelocity.dot(normal);
    
    if (velocityAlongNormal > 0) return; // Objects moving apart
    
    const restitution = 0.5; // Bounciness
    const impulse = 2 * velocityAlongNormal / 2; // Assuming equal mass
    
    vel1.x -= impulse * normal.x * restitution;
    vel1.y -= impulse * normal.y * restitution;
    vel2.x += impulse * normal.x * restitution;
    vel2.y += impulse * normal.y * restitution;
  }
  
  getOverlap(collider1, collider2) {
    if (collider1 instanceof window.AABB && collider2 instanceof window.AABB) {
      const overlapX = Math.min(collider1.right, collider2.right) - Math.max(collider1.left, collider2.left);
      const overlapY = Math.min(collider1.bottom, collider2.bottom) - Math.max(collider1.top, collider2.top);
      
      if (overlapX > 0 && overlapY > 0) {
        return { x: overlapX, y: overlapY };
      }
    }
    return null;
  }
  
  raycast(start, end, ignoreEntities = []) {
    const direction = end.subtract(start);
    const distance = direction.length();
    const step = direction.normalize().multiply(this.gridSize);
    
    let current = start.clone();
    const steps = Math.ceil(distance / this.gridSize);
    
    for (let i = 0; i <= steps; i++) {
      // Check collision with static colliders
      for (const collider of this.staticColliders) {
        if (collider.contains(current)) {
          return { hit: true, point: current, collider };
        }
      }
      
      // Check collision with entities
      for (const entity of this.entities) {
        if (ignoreEntities.includes(entity) || !entity.collider) continue;
        
        if (this.intersects(new window.Circle(current.x, current.y, 2), entity.collider)) {
          return { hit: true, point: current, entity };
        }
      }
      
      current = current.add(step);
      if (current.distanceTo(start) >= distance) break;
    }
    
    return { hit: false, point: end };
  }
  
  findPath(start, end, avoidEntities = []) {
    // Simple pathfinding using A* algorithm
    // This is a basic implementation - can be optimized
    
    const openSet = [{ pos: start, g: 0, h: start.distanceTo(end), parent: null }];
    const closedSet = new Set();
    
    while (openSet.length > 0) {
      // Find node with lowest f score
      let current = openSet.reduce((min, node) => node.g + node.h < min.g + min.h ? node : min);
      
      if (current.pos.distanceTo(end) < this.gridSize) {
        // Reconstruct path
        const path = [];
        while (current) {
          path.unshift(current.pos);
          current = current.parent;
        }
        return path;
      }
      
      // Move current from open to closed
      openSet.splice(openSet.indexOf(current), 1);
      closedSet.add(`${Math.floor(current.pos.x / this.gridSize)},${Math.floor(current.pos.y / this.gridSize)}`);
      
      // Check neighbors
      const neighbors = this.getNeighbors(current.pos);
      for (const neighbor of neighbors) {
        const key = `${Math.floor(neighbor.x / this.gridSize)},${Math.floor(neighbor.y / this.gridSize)}`;
        if (closedSet.has(key)) continue;
        
        // Check if neighbor is walkable
        if (!this.isWalkable(neighbor, avoidEntities)) continue;
        
        const g = current.g + current.pos.distanceTo(neighbor);
        const h = neighbor.distanceTo(end);
        
        const existingNode = openSet.find(n => n.pos.distanceTo(neighbor) < this.gridSize);
        if (existingNode) {
          if (g < existingNode.g) {
            existingNode.g = g;
            existingNode.parent = current;
          }
        } else {
          openSet.push({ pos: neighbor, g, h, parent: current });
        }
      }
    }
    
    return []; // No path found
  }
  
  getNeighbors(pos) {
    const neighbors = [];
    const directions = [
      new window.Vector2D(0, -1),   // up
      new window.Vector2D(1, 0),    // right
      new window.Vector2D(0, 1),    // down
      new window.Vector2D(-1, 0),   // left
      new window.Vector2D(1, -1),   // diagonal
      new window.Vector2D(1, 1),
      new window.Vector2D(-1, 1),
      new window.Vector2D(-1, -1)
    ];
    
    for (const dir of directions) {
      const neighbor = pos.add(dir.multiply(this.gridSize));
      neighbors.push(neighbor);
    }
    
    return neighbors;
  }
  
  isWalkable(pos, avoidEntities) {
    const testCollider = new window.AABB(pos.x - 2, pos.y - 2, 4, 4);
    
    // Check static colliders
    for (const collider of this.staticColliders) {
      if (this.intersects(testCollider, collider)) {
        return false;
      }
    }
    
    // Check entities
    for (const entity of this.entities) {
      if (avoidEntities.includes(entity) || !entity.collider) continue;
      
      if (this.intersects(testCollider, entity.collider)) {
        return false;
      }
    }
    
    return true;
  }
};

// Initialize global physics engine
window.gamePhysics = new window.PhysicsEngine();