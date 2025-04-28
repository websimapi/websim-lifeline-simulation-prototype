import * as CANNON from 'cannon-es';
import * as THREE from 'three';
import { ASTRONOMICAL_UNIT, EARTH_RADIUS, scaleDistance } from './astronomy.js';

export class PhysicsEngine {
    constructor(solarSystem) {
        this.world = new CANNON.World({
            gravity: new CANNON.Vec3(0, 0, 0) // Space has no global gravity
        });
        this.solarSystem = solarSystem;
        this.bodies = new Map();
        this.timeScale = 1.0; // 1.0 = real time, higher values speed up simulation
        
        // G constant for accurate n-body simulation (scaled for our simulation)
        this.G = 6.67430e-11 * 1000; // Gravitational constant in m^3 kg^-1 s^-2, scaled up
    }
    
    initialize() {
        // Create physics bodies for all celestial bodies
        this.solarSystem.bodies.forEach(body => {
            if (body.type === 'star' || body.type === 'planet') {
                this.createCelestialBody(body);
            }
        });
    }
    
    createCelestialBody(astronomyBody) {
        // Create a static physics body for the celestial object
        const body = new CANNON.Body({
            mass: 0, // Static body - gravity will be handled manually
            position: new CANNON.Vec3(
                astronomyBody.object.position.x,
                astronomyBody.object.position.y,
                astronomyBody.object.position.z
            )
        });
        
        // Add sphere shape
        body.addShape(new CANNON.Sphere(astronomyBody.scaledRadius || scaleDistance(astronomyBody.radius)));
        
        // Special treatment for different body types
        body.astronomyData = {
            name: astronomyBody.name,
            type: astronomyBody.type,
            mass: astronomyBody.mass || 0,
            radius: astronomyBody.radius || 0
        };
        
        // Add to our physics world
        this.world.addBody(body);
        this.bodies.set(astronomyBody.name, body);
        
        return body;
    }
    
    createDynamicBody(options) {
        const { position, velocity, mass, radius, mesh } = options;
        
        // Create a dynamic physics body
        const body = new CANNON.Body({
            mass: mass, // kg
            position: new CANNON.Vec3(position.x, position.y, position.z),
            velocity: new CANNON.Vec3(velocity.x, velocity.y, velocity.z)
        });
        
        // Add shape
        body.addShape(new CANNON.Sphere(radius));
        
        // Add to our physics world
        this.world.addBody(body);
        
        // Store reference to the mesh
        body.mesh = mesh;
        
        return body;
    }
    
    removeBody(body) {
        this.world.removeBody(body);
    }
    
    applyNBodyGravity(dt) {
        // Apply gravity between all dynamic bodies and celestial bodies
        // This is a simple n-body simulation
        
        // Get all dynamic bodies (typically rockets, satellites, etc.)
        const dynamicBodies = this.world.bodies.filter(body => body.mass > 0);
        
        // For each dynamic body
        dynamicBodies.forEach(dynamicBody => {
            // Reset gravity force
            dynamicBody.force.set(0, 0, 0);
            
            // Apply gravity from each celestial body
            this.solarSystem.bodies.forEach(celestialBody => {
                if (!celestialBody.mass) return;
                
                // Calculate gravity vector
                const physicsBody = this.bodies.get(celestialBody.name);
                if (!physicsBody) return;
                
                const gravityForce = this.calculateGravityForce(
                    dynamicBody,
                    physicsBody,
                    celestialBody.mass
                );
                
                // Apply force
                dynamicBody.force.vadd(gravityForce, dynamicBody.force);
            });
        });
    }
    
    calculateGravityForce(body1, body2, mass2) {
        // Get positions
        const pos1 = body1.position;
        const pos2 = body2.position;
        
        // Calculate distance vector
        const distanceVec = new CANNON.Vec3();
        pos2.vsub(pos1, distanceVec);
        
        // Distance squared
        const distanceSquared = distanceVec.lengthSquared();
        
        if (distanceSquared < 0.0001) {
            return new CANNON.Vec3(0, 0, 0); // Avoid division by zero
        }
        
        // Normalize distance vector
        const direction = new CANNON.Vec3();
        distanceVec.normalize(direction);
        
        // Calculate force magnitude: F = G * m1 * m2 / r^2
        const forceMagnitude = this.G * body1.mass * mass2 / distanceSquared;
        
        // Return force vector
        return new CANNON.Vec3(
            direction.x * forceMagnitude,
            direction.y * forceMagnitude,
            direction.z * forceMagnitude
        );
    }
    
    update(dt) {
        // Apply time scaling
        const scaledDt = dt * this.timeScale;
        
        // Update positions of celestial bodies from astronomy calculations
        this.solarSystem.bodies.forEach(astronomyBody => {
            if (astronomyBody.type === 'planet') {
                const physicsBody = this.bodies.get(astronomyBody.name);
                if (physicsBody) {
                    physicsBody.position.copy(astronomyBody.object.position);
                }
            }
        });
        
        // Apply n-body gravity
        this.applyNBodyGravity(scaledDt);
        
        // Step the physics world
        this.world.step(scaledDt);
        
        // Update meshes with physics body positions
        this.world.bodies.forEach(body => {
            if (body.mesh) {
                body.mesh.position.copy(body.position);
                body.mesh.quaternion.copy(body.quaternion);
            }
        });
    }
    
    getOrbitalVelocity(position, centralBodyName = 'Earth') {
        // Calculate orbital velocity at a given position
        const centralBody = this.bodies.get(centralBodyName);
        const astronomyBody = this.solarSystem.bodies.find(body => body.name === centralBodyName);
        
        if (!centralBody || !astronomyBody) {
            return new THREE.Vector3(0, 0, 0);
        }
        
        // Get position vector relative to central body
        const posVector = new THREE.Vector3(
            position.x - centralBody.position.x,
            position.y - centralBody.position.y,
            position.z - centralBody.position.z
        );
        
        // Get orbit radius
        const radius = posVector.length();
        
        // Calculate orbit velocity magnitude: v = sqrt(G*M/r)
        const centralMass = astronomyBody.mass || 5.972e24; // Default to Earth mass if not specified
        const velocityMagnitude = Math.sqrt(this.G * centralMass / radius);
        
        // Calculate orbit direction (perpendicular to radius vector and up direction)
        const up = new THREE.Vector3(0, 1, 0);
        const orbitDirection = new THREE.Vector3().crossVectors(posVector, up).normalize();
        
        // Return velocity vector
        return orbitDirection.multiplyScalar(velocityMagnitude);
    }
}