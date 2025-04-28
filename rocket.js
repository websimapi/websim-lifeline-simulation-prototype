import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export class RocketDesigner {
    constructor() {
        this.components = [];
        this.selectedComponent = null;
        this.fuel = 1.0; // Full tank
        
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
                    thrust: 1000, // kN
                    isp: 350, // seconds
                    mass: 2.0, // tons
                    fuelConsumption: 0.01 // per second
                };
            case 'fuel-tank':
                return {
                    capacity: 50, // tons
                    mass: 5.0, // dry mass in tons
                    type: 'liquid hydrogen'
                };
            case 'payload':
                return {
                    mass: 2.0, // tons
                    type: 'satellite',
                    purpose: 'communication'
                };
            case 'satellite':
                return {
                    mass: 1.5,
                    transmissionPower: 100, // watts
                    dataStorage: 10, // terabytes
                    solarPanelArea: 20 // sq meters
                };
            case 'relay':
                return {
                    mass: 1.0,
                    quantumProcessors: 5,
                    encryptionLevel: 'military-grade',
                    signalBoost: 200 // percent
                };
            case 'cargo':
                return {
                    mass: 3.0,
                    capacity: 10, // cubic meters
                    contents: 'construction materials'
                };
            default:
                return { mass: 1.0 };
        }
    }
    
    createRocketModel() {
        const rocketGroup = new THREE.Group();
        
        // Create geometries for each component
        this.components.forEach((component, index) => {
            let mesh;
            const yPosition = index * 10; // Stack components vertically
            
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
            
            mesh.position.y = yPosition;
            mesh.userData.componentId = component.id;
            rocketGroup.add(mesh);
        });
        
        return rocketGroup;
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
        const geometry = new THREE.CylinderGeometry(5, 5, 10, 16);
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
                geometry = new THREE.ConeGeometry(5, 10, 16);
                material = new THREE.MeshPhongMaterial({ color: 0x22cccc });
                return new THREE.Mesh(geometry, material);
        }
    }
    
    createRocketPhysics() {
        // Calculate total height and mass
        let totalHeight = 0;
        let totalMass = 0;
        
        this.components.forEach(component => {
            totalHeight += 10; // Each component is about 10 units tall
            totalMass += component.properties.mass;
            
            // Add fuel mass if it's a fuel tank
            if (component.type === 'fuel-tank') {
                totalMass += component.properties.capacity;
            }
        });
        
        // Create physical body for the rocket
        const rocketBody = new CANNON.Body({
            mass: totalMass,
            shape: new CANNON.Cylinder(5, 5, totalHeight, 16),
            position: new CANNON.Vec3(0, 0, 0),
            material: new CANNON.Material()
        });
        
        // Set damping to simulate air resistance
        rocketBody.linearDamping = 0.01;
        rocketBody.angularDamping = 0.1;
        
        return rocketBody;
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
    
    consumeFuel() {
        if (this.fuel <= 0) return 0;
        
        // Calculate fuel consumption rate
        let consumptionRate = 0;
        
        this.components.forEach(component => {
            if (component.type === 'engine') {
                consumptionRate += component.properties.fuelConsumption;
            }
        });
        
        // Consume fuel
        this.fuel -= consumptionRate;
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
        
        // Calculate thrust-to-weight ratio
        const gravity = 9.81; // m/s²
        const weight = mass * gravity;
        const thrustToWeight = thrust * 1000 / weight;
        
        // Calculate delta-V using Tsiolkovsky rocket equation
        // Assuming average ISP of all engines
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
        
        // Estimate max altitude based on delta-V
        const escapeVelocity = 11200; // m/s for Earth
        const orbitalVelocity = 7800; // m/s for Low Earth Orbit
        
        let maxAltitude = 0;
        if (deltaV > 0) {
            if (deltaV >= escapeVelocity) {
                maxAltitude = Infinity; // Escape velocity reached
            } else if (deltaV >= orbitalVelocity) {
                maxAltitude = 400; // Low Earth Orbit
            } else {
                maxAltitude = (deltaV / orbitalVelocity) * 400; // Rough approximation
            }
        }
        
        // Calculate payload capacity
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
            maxAltitude,
            payloadCapacity,
            canReachOrbit
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

