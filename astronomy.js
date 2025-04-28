import * as THREE from 'three';

// Constants for astronomical calculations
export const ASTRONOMICAL_UNIT = 149597870.7; // km, 1 AU
export const EARTH_RADIUS = 6371; // km
export const SUN_RADIUS = 695700; // km
export const SCALE_FACTOR = 1/10000; // Scale factor for visualization (1:10000)

// Scale an astronomical distance for visualization
export function scaleDistance(kilometers) {
    return kilometers * SCALE_FACTOR;
}

// Scale a celestial body radius for visualization
export function scaleRadius(kilometers) {
    // Use cubic root scaling for bodies to keep them visible while maintaining relative sizes
    return Math.pow(kilometers, 1/3) * SCALE_FACTOR * 5;
}

export class SolarSystem {
    constructor() {
        this.bodies = [];
        this.chunks = new Map();
        this.chunkSize = 10000; // Size of each space chunk in scaled units
        this.loadedChunks = new Set();
        this.chunkGroup = new THREE.Group();
    }

    initialize(scene) {
        this.scene = scene;
        scene.add(this.chunkGroup);
        
        // Create the sun
        this.createSun();
        
        // Create planets
        this.createPlanets();
        
        // Create asteroid belt
        this.createAsteroidBelt();
    }

    createSun() {
        const sunGeometry = new THREE.SphereGeometry(scaleRadius(SUN_RADIUS), 64, 64);
        const sunMaterial = new THREE.MeshBasicMaterial({
            color: 0xffdd00,
            emissive: 0xffaa00,
            emissiveIntensity: 1
        });
        
        const sun = new THREE.Mesh(sunGeometry, sunMaterial);
        
        // Add glow effect
        const sunGlowGeometry = new THREE.SphereGeometry(scaleRadius(SUN_RADIUS) * 1.2, 64, 64);
        const sunGlowMaterial = new THREE.ShaderMaterial({
            uniforms: {
                "c": { value: 0.2 },
                "p": { value: 4.0 },
                glowColor: { value: new THREE.Color(0xffaa00) },
                viewVector: { value: new THREE.Vector3() }
            },
            vertexShader: `
                uniform vec3 viewVector;
                uniform float c;
                uniform float p;
                varying float intensity;
                void main() {
                    vec3 vNormal = normalize(normal);
                    vec3 vNormel = normalize(viewVector);
                    intensity = pow(c - dot(vNormal, vNormel), p);
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 glowColor;
                varying float intensity;
                void main() {
                    vec3 glow = glowColor * intensity;
                    gl_FragColor = vec4(glow, 1.0);
                }
            `,
            side: THREE.BackSide,
            blending: THREE.AdditiveBlending,
            transparent: true
        });
        
        const sunGlow = new THREE.Mesh(sunGlowGeometry, sunGlowMaterial);
        sun.add(sunGlow);
        
        // Add sun to scene
        this.sun = sun;
        this.scene.add(sun);
        
        // Store in bodies array
        this.bodies.push({
            name: 'Sun',
            object: sun,
            type: 'star',
            radius: SUN_RADIUS,
            mass: 1.989e30, // kg
            position: new THREE.Vector3(0, 0, 0),
            orbit: null
        });
    }

    createPlanets() {
        // Planet data: name, distance from sun (AU), radius (km), color, orbital period (Earth years)
        const planetData = [
            { name: 'Mercury', distance: 0.39, radius: 2440, color: 0xa5a5a5, period: 0.24, inclination: 7.0 },
            { name: 'Venus', distance: 0.72, radius: 6052, color: 0xe3c08c, period: 0.62, inclination: 3.4 },
            { name: 'Earth', distance: 1.0, radius: EARTH_RADIUS, color: 0x2244aa, period: 1.0, inclination: 0.0 },
            { name: 'Mars', distance: 1.52, radius: 3390, color: 0xc06030, period: 1.88, inclination: 1.8 },
            { name: 'Jupiter', distance: 5.20, radius: 69911, color: 0xc0a080, period: 11.86, inclination: 1.3 },
            { name: 'Saturn', distance: 9.58, radius: 58232, color: 0xb0b080, period: 29.46, inclination: 2.5 },
            { name: 'Uranus', distance: 19.22, radius: 25362, color: 0x80c0d0, period: 84.01, inclination: 0.8 },
            { name: 'Neptune', distance: 30.05, radius: 24622, color: 0x4060c0, period: 164.79, inclination: 1.8 }
        ];
        
        planetData.forEach(planet => {
            const scaledDistance = scaleDistance(planet.distance * ASTRONOMICAL_UNIT);
            const scaledRadius = scaleRadius(planet.radius);
            
            // Create planet geometry
            const geometry = new THREE.SphereGeometry(scaledRadius, 32, 32);
            const material = new THREE.MeshPhongMaterial({
                color: planet.color,
                shininess: 15
            });
            
            const planetMesh = new THREE.Mesh(geometry, material);
            
            // Create orbit
            const orbitGeometry = new THREE.BufferGeometry();
            const orbitMaterial = new THREE.LineBasicMaterial({
                color: 0xffffff,
                transparent: true,
                opacity: 0.3
            });
            
            const orbitPoints = [];
            const segments = 128;
            for (let i = 0; i <= segments; i++) {
                const theta = (i / segments) * Math.PI * 2;
                const x = scaledDistance * Math.cos(theta);
                const z = scaledDistance * Math.sin(theta);
                orbitPoints.push(x, 0, z);
            }
            
            orbitGeometry.setAttribute('position', new THREE.Float32BufferAttribute(orbitPoints, 3));
            const orbit = new THREE.Line(orbitGeometry, orbitMaterial);
            
            // Tilt orbit according to inclination
            orbit.rotation.x = planet.inclination * Math.PI / 180;
            
            this.scene.add(orbit);
            
            // Position planet on its orbit
            const initialAngle = Math.random() * Math.PI * 2;
            planetMesh.position.x = scaledDistance * Math.cos(initialAngle);
            planetMesh.position.z = scaledDistance * Math.sin(initialAngle);
            
            // Add planet to scene
            this.scene.add(planetMesh);
            
            // Add to bodies array
            this.bodies.push({
                name: planet.name,
                object: planetMesh,
                orbit: orbit,
                type: 'planet',
                radius: planet.radius,
                scaledRadius: scaledRadius,
                distance: planet.distance * ASTRONOMICAL_UNIT,
                scaledDistance: scaledDistance,
                period: planet.period,
                angle: initialAngle,
                inclination: planet.inclination
            });
        });
    }
    
    createAsteroidBelt() {
        // Asteroid belt between Mars and Jupiter
        const asteroidCount = 1000;
        const innerRadius = scaleDistance(2.2 * ASTRONOMICAL_UNIT);
        const outerRadius = scaleDistance(3.2 * ASTRONOMICAL_UNIT);
        const asteroidGeometry = new THREE.SphereGeometry(scaleRadius(10), 4, 4); // Small asteroids
        const asteroidMaterial = new THREE.MeshPhongMaterial({ color: 0x888888 });
        
        const belt = new THREE.Group();
        
        for (let i = 0; i < asteroidCount; i++) {
            const asteroid = new THREE.Mesh(asteroidGeometry, asteroidMaterial);
            
            // Random position in belt
            const distance = innerRadius + Math.random() * (outerRadius - innerRadius);
            const angle = Math.random() * Math.PI * 2;
            const height = (Math.random() - 0.5) * distance * 0.1; // Some vertical spread
            
            asteroid.position.set(
                distance * Math.cos(angle),
                height,
                distance * Math.sin(angle)
            );
            
            // Random rotation and scale
            asteroid.rotation.set(
                Math.random() * Math.PI,
                Math.random() * Math.PI,
                Math.random() * Math.PI
            );
            
            const scale = 0.5 + Math.random();
            asteroid.scale.set(scale, scale, scale);
            
            belt.add(asteroid);
        }
        
        this.scene.add(belt);
        this.asteroidBelt = belt;
    }
    
    updatePlanetPositions(time) {
        this.bodies.forEach(body => {
            if (body.type === 'planet') {
                // Calculate new position based on orbital period
                const orbitalSpeed = (2 * Math.PI) / (body.period * 365 * 24 * 60 * 60); // radians per second
                body.angle += orbitalSpeed * time;
                
                // Calculate position considering inclination
                const x = body.scaledDistance * Math.cos(body.angle);
                const z = body.scaledDistance * Math.sin(body.angle);
                
                // Update mesh position
                body.object.position.set(x, 0, z);
                
                // Rotate planet
                body.object.rotation.y += 0.01 * (1 / body.period) * time;
            }
        });
    }
    
    getChunkKey(x, y, z) {
        const chunkX = Math.floor(x / this.chunkSize);
        const chunkY = Math.floor(y / this.chunkSize);
        const chunkZ = Math.floor(z / this.chunkSize);
        return `${chunkX},${chunkY},${chunkZ}`;
    }
    
    loadChunk(chunkKey) {
        if (this.loadedChunks.has(chunkKey)) return;
        
        const [chunkX, chunkY, chunkZ] = chunkKey.split(',').map(Number);
        
        // Create new chunk
        const chunkGroup = new THREE.Group();
        chunkGroup.position.set(
            chunkX * this.chunkSize + this.chunkSize/2,
            chunkY * this.chunkSize + this.chunkSize/2,
            chunkZ * this.chunkSize + this.chunkSize/2
        );
        
        // Generate stars for this chunk
        const starsGeometry = new THREE.BufferGeometry();
        const starsVertices = [];
        
        // Density of stars depends on distance from galactic center
        const centerDistance = Math.sqrt(chunkX*chunkX + chunkY*chunkY + chunkZ*chunkZ);
        let starCount = 100 * Math.max(0.1, Math.exp(-centerDistance/50));
        
        for (let i = 0; i < starCount; i++) {
            const x = (Math.random() - 0.5) * this.chunkSize;
            const y = (Math.random() - 0.5) * this.chunkSize;
            const z = (Math.random() - 0.5) * this.chunkSize;
            starsVertices.push(x, y, z);
        }
        
        starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starsVertices, 3));
        
        const starsMaterial = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 3,
            sizeAttenuation: true
        });
        
        const stars = new THREE.Points(starsGeometry, starsMaterial);
        chunkGroup.add(stars);
        
        // Add chunk to scene
        this.chunkGroup.add(chunkGroup);
        this.chunks.set(chunkKey, chunkGroup);
        this.loadedChunks.add(chunkKey);
    }
    
    unloadChunk(chunkKey) {
        if (!this.loadedChunks.has(chunkKey)) return;
        
        const chunk = this.chunks.get(chunkKey);
        this.chunkGroup.remove(chunk);
        this.chunks.delete(chunkKey);
        this.loadedChunks.delete(chunkKey);
    }
    
    updateChunks(cameraPosition, loadRadius = 5) {
        // Determine which chunks should be loaded
        const centerChunkKey = this.getChunkKey(
            cameraPosition.x,
            cameraPosition.y,
            cameraPosition.z
        );
        
        const [centerX, centerY, centerZ] = centerChunkKey.split(',').map(Number);
        const chunksToLoad = new Set();
        
        // Calculate chunks that should be loaded
        for (let x = centerX - loadRadius; x <= centerX + loadRadius; x++) {
            for (let y = centerY - loadRadius; y <= centerY + loadRadius; y++) {
                for (let z = centerZ - loadRadius; z <= centerZ + loadRadius; z++) {
                    // Check if chunk is within load radius
                    const distance = Math.sqrt(
                        Math.pow(x - centerX, 2) +
                        Math.pow(y - centerY, 2) +
                        Math.pow(z - centerZ, 2)
                    );
                    
                    if (distance <= loadRadius) {
                        chunksToLoad.add(`${x},${y},${z}`);
                    }
                }
            }
        }
        
        // Load new chunks
        for (const chunkKey of chunksToLoad) {
            this.loadChunk(chunkKey);
        }
        
        // Unload chunks that are too far
        for (const chunkKey of this.loadedChunks) {
            if (!chunksToLoad.has(chunkKey)) {
                this.unloadChunk(chunkKey);
            }
        }
    }
}