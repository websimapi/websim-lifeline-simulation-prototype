import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { EARTH_RADIUS, scaleDistance } from './astronomy.js';

export class RocketDesigner {
    constructor() {
        this.components = [];
        this.selectedComponent = null;
        this.fuel = 1.0; // Full tank
        
        // Real-world physics constants
        this.G = 6.67430e-11; // Gravitational constant in m^3 kg^-1 s^-2
        this.earthMass = 5.972e24; // kg
        
        // Default rocket configuration
        this.addComponent('engine');
        this.addComponent('fuel-tank');
        this.addComponent('payload');
    }
    
    addComponent(type) {
        const component = {
            id: Date.now().toString(),
            type: type,
            position: this.components.length, // Stack components
            properties: this.getDefaultProperties(type)
        };
        
        this.components.push(component);
        this.selectedComponent = component;
        
        return component;
    }
    
    getDefaultProperties(type) {
        switch(type) {
            case 'engine':
                return {
                    thrust: 2000, // kN - Roughly equivalent to a Merlin 1D engine
                    isp: 350, // seconds - Vacuum efficiency
                    mass: 1.5, // tons
                    fuelConsumption: 0.008, // % per second at full thrust
                    minThrottle: 0.4, // 40% minimum throttle
                    type: 'liquid'
                };
            case 'fuel-tank':
                return {
                    capacity: 40, // tons of fuel
                    mass: 4.0, // dry mass in tons
                    type: 'liquid hydrogen/oxygen',
                    material: 'aluminum-lithium'
                };
            case 'payload':
                return {
                    mass: 2.0, // tons
                    type: 'satellite',
                    purpose: 'communication',
                    dragCoefficient: 0.2
                };
            case 'satellite':
                return {
                    mass: 1.8, // tons
                    transmissionPower: 250, // watts
                    dataStorage: 25, // terabytes
                    solarPanelArea: 30, // sq meters
                    batteryCapacity: 5000, // watt-hours
                    purpose: 'lifeline communications'
                };
            case 'relay':
                return {
                    mass: 1.2, // tons
                    quantumProcessors: 8,
                    encryptionLevel: 'quantum-resistant',
                    signalBoost: 300, // percent
                    powerRequirement: 180, // watts
                    antennaGain: 40 // dBi
                };
            case 'cargo':
                return {
                    mass: 3.5, // tons
                    capacity: 12, // cubic meters
                    contents: 'construction materials',
                    lifeSupportSystems: false,
                    deploymentMechanism: 'automated'
                };
            default:
                return { mass: 1.0 };
        }
    }
    
    createRocketModel() {
        const rocketGroup = new THREE.Group();
        
        // Calculate total height
        let totalHeight = 0;
        this.components.forEach(component => {
            const componentHeight = this.getComponentHeight(component.type);
            totalHeight += componentHeight;
        });
        
        // Create geometries for each component
        let currentHeight = -totalHeight/2; // Start from bottom of rocket
        
        this.components.forEach((component) => {
            let mesh;
            const componentHeight = this.getComponentHeight(component.type);
            
            switch(component.type) {
                case 'engine':
                    mesh = this.createEngineMesh();
                    break;
                case 'fuel-tank':
                    mesh = this.createFuelTankMesh();
                    break;
                case 'payload':
                case 'satellite':
                case 'relay':
                case 'cargo':
                    mesh = this.createPayloadMesh(component.type);
                    break;
                default:
                    mesh = new THREE.Mesh(
                        new THREE.BoxGeometry(5, 5, 5),
                        new THREE.MeshPhongMaterial({ color: 0xaaaaaa })
                    );
            }
            
            // Position component along rocket's height
            mesh.position.y = currentHeight + componentHeight/2;
            currentHeight += componentHeight;
            
            mesh.userData.componentId = component.id;
            rocketGroup.add(mesh);
        });
        
        return rocketGroup;
    }
    
    getComponentHeight(type) {
        switch(type) {
            case 'engine': return 10;
            case 'fuel-tank': return 15;
            case 'payload': return 8;
            case 'satellite': return 10;
            case 'relay': return 8;
            case 'cargo': return 12;
            default: return 5;
        }
    }
    
    createEngineMesh() {
        const engineGroup = new THREE.Group();
        
        // Engine bell
        const bellGeometry = new THREE.CylinderGeometry(2, 5, 8, 16);
        const bellMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x555555,
            specular: 0x111111,
            shininess: 100
        });
        const bell = new THREE.Mesh(bellGeometry, bellMaterial);
        bell.position.y = -4;
        engineGroup.add(bell);
        
        // Engine body
        const bodyGeometry = new THREE.CylinderGeometry(4, 4, 4, 16);
        const bodyMaterial = new THREE.MeshPhongMaterial({ color: 0x333333 });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 2;
        engineGroup.add(body);
        
        return engineGroup;
    }
    
    createFuelTankMesh() {
        const geometry = new THREE.CylinderGeometry(5, 5, 15, 16);
        const material = new THREE.MeshPhongMaterial({
            color: 0xdddddd,
            specular: 0x222222,
            shininess: 30
        });
        
        return new THREE.Mesh(geometry, material);
    }
    
    createPayloadMesh(type) {
        let geometry, material;
        
        switch(type) {
            case 'satellite':
                // Create satellite with solar panels
                const satGroup = new THREE.Group();
                
                // Satellite body
                geometry = new THREE.BoxGeometry(4, 2, 4);
                material = new THREE.MeshPhongMaterial({ color: 0x888888 });
                const body = new THREE.Mesh(geometry, material);
                satGroup.add(body);
                
                // Solar panels
                geometry = new THREE.BoxGeometry(10, 0.1, 3);
                material = new THREE.MeshPhongMaterial({ 
                    color: 0x2244aa,
                    specular: 0xaaaaaa,
                    shininess: 100
                });
                
                const leftPanel = new THREE.Mesh(geometry, material);
                leftPanel.position.x = -7;
                satGroup.add(leftPanel);
                
                const rightPanel = new THREE.Mesh(geometry, material);
                rightPanel.position.x = 7;
                satGroup.add(rightPanel);
                
                // Dish antenna
                geometry = new THREE.SphereGeometry(2, 8, 8, 0, Math.PI);
                material = new THREE.MeshPhongMaterial({ color: 0xffffff });
                const dish = new THREE.Mesh(geometry, material);
                dish.rotation.x = Math.PI / 2;
                dish.position.z = 3;
                satGroup.add(dish);
                
                return satGroup;
                
            case 'relay':
                // Quantum relay with antennas
                const relayGroup = new THREE.Group();
                
                // Relay body
                geometry = new THREE.SphereGeometry(3, 16, 16);
                material = new THREE.MeshPhongMaterial({ 
                    color: 0x22cc88,
                    specular: 0xaaaaaa,
                    shininess: 80
                });
                const relayBody = new THREE.Mesh(geometry, material);
                relayGroup.add(relayBody);
                
                // Antennas
                geometry = new THREE.CylinderGeometry(0.1, 0.1, 6, 8);
                material = new THREE.MeshPhongMaterial({ color: 0xaaaaaa });
                
                for (let i = 0; i < 3; i++) {
                    const antenna = new THREE.Mesh(geometry, material);
                    antenna.position.y = 3;
                    antenna.rotation.z = i * Math.PI * 2/3;
                    relayGroup.add(antenna);
                }
                
                return relayGroup;
                
            case 'cargo':
                // Cargo container
                geometry = new THREE.BoxGeometry(7, 5, 7);
                material = new THREE.MeshPhongMaterial({ color: 0xcc8822 });
                return new THREE.Mesh(geometry, material);
                
            case 'payload':
            default:
                // Generic payload
                geometry = new THREE.ConeGeometry(5, 8, 16);
                material = new THREE.MeshPhongMaterial({ color: 0x22cccc });
                return new THREE.Mesh(geometry, material);
        }
    }
    
    calculateThrust() {
        if (this.fuel <= 0) return 0;
        
        let totalThrust = 0;
        
        this.components.forEach(component => {
            if (component.type === 'engine') {
                totalThrust += component.properties.thrust;
            }
        });
        
        return totalThrust * 1000; // Convert kN to N for physics
    }
    
    consumeFuel(dt = 1/60) {
        if (this.fuel <= 0) return 0;
        
        // Calculate fuel consumption rate based on thrust
        let consumptionRate = 0;
        
        this.components.forEach(component => {
            if (component.type === 'engine') {
                consumptionRate += component.properties.fuelConsumption;
            }
        });
        
        // Consume fuel (scale by time delta)
        this.fuel -= consumptionRate * dt;
        this.fuel = Math.max(0, this.fuel); // Ensure fuel doesn't go negative
        
        return this.fuel;
    }
    
    calculatePerformance() {
        let mass = 0;
        let thrust = 0;
        let deltaV = 0;
        let fuelMass = 0;
        let dryMass = 0;
        
        // Calculate total mass and thrust
        this.components.forEach(component => {
            mass += component.properties.mass;
            
            if (component.type === 'engine') {
                thrust += component.properties.thrust;
            }
            
            if (component.type === 'fuel-tank') {
                fuelMass += component.properties.capacity;
                dryMass += component.properties.mass;
            } else {
                dryMass += component.properties.mass;
            }
        });
        
        // Add fuel mass to total mass
        mass += fuelMass;
        
        // Calculate thrust-to-weight ratio using Earth gravity
        const gravity = 9.81; // m/s²
        const weight = mass * 1000 * gravity; // Convert tons to kg
        const thrustToWeight = thrust * 1000 / weight; // Convert kN to N
        
        // Calculate delta-V using Tsiolkovsky rocket equation
        // Calculate average ISP
        let totalIsp = 0;
        let engineCount = 0;
        
        this.components.forEach(component => {
            if (component.type === 'engine') {
                totalIsp += component.properties.isp;
                engineCount++;
            }
        });
        
        const averageIsp = engineCount > 0 ? totalIsp / engineCount : 0;
        
        if (averageIsp > 0 && dryMass > 0 && fuelMass > 0) {
            deltaV = averageIsp * gravity * Math.log((dryMass + fuelMass) / dryMass);
        }
        
        // Calculate realistic orbital parameters
        const orbitalVelocity = 7800; // m/s for Low Earth Orbit
        const escapeVelocity = 11200; // m/s for Earth
        
        // Estimate max altitude based on delta-V
        let maxAltitude = 0;
        if (deltaV > 0) {
            if (deltaV >= escapeVelocity) {
                maxAltitude = Infinity; // Escape velocity reached
            } else if (deltaV >= orbitalVelocity) {
                // Approximate altitude calculation for orbital velocity
                // Using vis-viva equation: v^2 = GM(2/r - 1/a)
                // For circular orbit, a = r, so v^2 = GM/r
                // r = GM/v^2
                const earthRadius = EARTH_RADIUS; // km
                const mu = this.G * this.earthMass; // GM value
                
                // Calculate altitude above Earth surface
                const orbitalRadius = mu / Math.pow(deltaV, 2);
                maxAltitude = (orbitalRadius / 1000) - earthRadius; // Convert to km and get altitude
            } else {
                // Suborbital trajectory - approximate using energy equations
                const maxHeight = Math.pow(deltaV, 2) / (2 * gravity) / 1000; // Convert to km
                maxAltitude = maxHeight;
            }
        }
        
        // Calculate payload capacity (simplified)
        let payloadCapacity = 0;
        if (thrustToWeight > 1.2) { // Need some extra thrust for acceleration
            payloadCapacity = (thrustToWeight - 1.2) * mass / 5;
        }
        
        // Can this rocket reach orbit?
        const canReachOrbit = deltaV >= orbitalVelocity && thrustToWeight > 1.2;
        
        return {
            mass,
            thrust,
            thrustToWeight,
            deltaV,
            maxAltitude: Math.min(maxAltitude, 1000000), // Cap display value
            payloadCapacity,
            canReachOrbit,
            canEscape: deltaV >= escapeVelocity
        };
    }
    
    getComponentPropertiesHTML() {
        if (!this.selectedComponent) {
            return '<p>No component selected</p>';
        }
        
        const component = this.selectedComponent;
        let html = `<h4>${this.formatComponentType(component.type)}</h4>`;
        
        html += '<div class="property-list">';
        
        for (const [key, value] of Object.entries(component.properties)) {
            html += `
                <div class="property">
                    <label>${this.formatPropertyName(key)}:</label>
                    <input type="text" data-property="${key}" value="${value}">
                </div>
            `;
        }
        
        html += '</div>';
        
        return html;
    }
    
    formatComponentType(type) {
        return type.split('-').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
    }
    
    formatPropertyName(name) {
        return name.split(/(?=[A-Z])/).map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
    }
    
    getPayload() {
        // Find the first payload component (satellite, relay, cargo)
        const payloadTypes = ['satellite', 'relay', 'cargo', 'payload'];
        
        for (const component of this.components) {
            if (payloadTypes.includes(component.type)) {
                return component;
            }
        }
        
        return null;
    }
}