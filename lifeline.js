import * as THREE from 'three';

export class LifelineNetwork {
    constructor() {
        this.devices = [];
        this.connections = [];
        this.earth = { position: new THREE.Vector3(0, 0, 0), radius: 100 };
    }
    
    addDevice(type, position, properties) {
        const device = {
            id: Date.now().toString(),
            type,
            position,
            properties,
            connections: [],
            status: 'active'
        };
        
        this.devices.push(device);
        
        // Connect to nearby devices
        this.connectDevice(device);
        
        return device;
    }
    
    connectDevice(device) {
        // Connect to nearest devices
        const maxConnections = 3;
        const maxDistance = 1000; // Maximum connection distance
        
        // Find devices within range, sorted by distance
        const nearbyDevices = this.devices
            .filter(d => d.id !== device.id)
            .map(d => ({
                device: d,
                distance: device.position.distanceTo(d.position)
            }))
            .filter(d => d.distance < maxDistance)
            .sort((a, b) => a.distance - b.distance)
            .slice(0, maxConnections);
        
        // Create connections
        nearbyDevices.forEach(nearby => {
            const connection = {
                id: `${device.id}-${nearby.device.id}`,
                deviceA: device.id,
                deviceB: nearby.device.id,
                status: 'active',
                quality: this.calculateConnectionQuality(device, nearby.device, nearby.distance)
            };
            
            this.connections.push(connection);
            device.connections.push(connection.id);
            nearby.device.connections.push(connection.id);
        });
    }
    
    calculateConnectionQuality(deviceA, deviceB, distance) {
        // Base quality inversely proportional to distance
        let quality = 1 - (distance / 1000);
        
        // Adjust based on device types and properties
        if (deviceA.type === 'relay' || deviceB.type === 'relay') {
            quality += 0.2; // Relays improve connection quality
        }
        
        // Additional bonus for satellite connections
        if (deviceA.type === 'satellite' && deviceB.type === 'satellite') {
            quality += 0.1;
        }
        
        // Limit between 0 and 1
        return Math.max(0, Math.min(1, quality));
    }
    
    createDeviceMesh(device) {
        let geometry, material;
        
        switch(device.type) {
            case 'satellite':
                return this.createSatelliteMesh(device);
            case 'relay':
                return this.createRelayMesh(device);
            case 'cargo':
                return this.createCargoMesh(device);
            default:
                // Generic device
                geometry = new THREE.SphereGeometry(5, 8, 8);
                material = new THREE.MeshPhongMaterial({ color: 0x888888 });
                const mesh = new THREE.Mesh(geometry, material);
                mesh.position.copy(device.position);
                return mesh;
        }
    }
    
    createSatelliteMesh(device) {
        const satGroup = new THREE.Group();
        
        // Satellite body
        const bodyGeometry = new THREE.BoxGeometry(4, 2, 4);
        const bodyMaterial = new THREE.MeshPhongMaterial({ color: 0x3498db });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        satGroup.add(body);
        
        // Solar panels
        const panelGeometry = new THREE.BoxGeometry(10, 0.1, 3);
        const panelMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x2980b9,
            specular: 0xaaaaaa,
            shininess: 100
        });
        
        const leftPanel = new THREE.Mesh(panelGeometry, panelMaterial);
        leftPanel.position.x = -7;
        satGroup.add(leftPanel);
        
        const rightPanel = new THREE.Mesh(panelGeometry, panelMaterial);
        rightPanel.position.x = 7;
        satGroup.add(rightPanel);
        
        // Dish antenna
        const dishGeometry = new THREE.SphereGeometry(2, 8, 8, 0, Math.PI);
        const dishMaterial = new THREE.MeshPhongMaterial({ color: 0xffffff });
        const dish = new THREE.Mesh(dishGeometry, dishMaterial);
        dish.rotation.x = Math.PI / 2;
        dish.position.z = 3;
        satGroup.add(dish);
        
        // Position the group
        satGroup.position.copy(device.position);
        
        // Look at Earth
        const direction = new THREE.Vector3().subVectors(this.earth.position, device.position).normalize();
        const up = new THREE.Vector3(0, 1, 0);
        const axis = new THREE.Vector3().crossVectors(up, direction).normalize();
        const angle = Math.acos(up.dot(direction));
        
        satGroup.quaternion.setFromAxisAngle(axis, angle);
        
        return satGroup;
    }
    
    createRelayMesh(device) {
        const relayGroup = new THREE.Group();
        
        // Relay body
        const bodyGeometry = new THREE.SphereGeometry(3, 16, 16);
        const bodyMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x2ecc71,
            specular: 0xaaaaaa,
            shininess: 80
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        relayGroup.add(body);
        
        // Antennas
        const antennaGeometry = new THREE.CylinderGeometry(0.1, 0.1, 6, 8);
        const antennaMaterial = new THREE.MeshPhongMaterial({ color: 0xaaaaaa });
        
        for (let i = 0; i < 3; i++) {
            const antenna = new THREE.Mesh(antennaGeometry, antennaMaterial);
            antenna.position.y = 3;
            antenna.rotation.z = i * Math.PI * 2/3;
            relayGroup.add(antenna);
        }
        
        // Add glow effect
        const glowGeometry = new THREE.SphereGeometry(4, 16, 16);
        const glowMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x2ecc71,
            transparent: true,
            opacity: 0.3,
            side: THREE.BackSide
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        relayGroup.add(glow);
        
        // Position the group
        relayGroup.position.copy(device.position);
        
        return relayGroup;
    }
    
    createCargoMesh(device) {
        const cargoGroup = new THREE.Group();
        
        // Cargo container
        const bodyGeometry = new THREE.BoxGeometry(7, 5, 7);
        const bodyMaterial = new THREE.MeshPhongMaterial({ color: 0xf39c12 });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        cargoGroup.add(body);
        
        // Add details - stripes
        const stripeGeometry = new THREE.BoxGeometry(7.01, 0.5, 7.01);
        const stripeMaterial = new THREE.MeshPhongMaterial({ color: 0x000000 });
        
        const topStripe = new THREE.Mesh(stripeGeometry, stripeMaterial);
        topStripe.position.y = 2;
        cargoGroup.add(topStripe);
        
        const bottomStripe = new THREE.Mesh(stripeGeometry, stripeMaterial);
        bottomStripe.position.y = -2;
        cargoGroup.add(bottomStripe);
        
        // Position the group
        cargoGroup.position.copy(device.position);
        
        return cargoGroup;
    }
    
    calculateNetworkIntegrity() {
        if (this.devices.length === 0) return 0;
        
        // Calculate based on number of active connections relative to potential connections
        const activeConnections = this.connections.filter(c => c.status === 'active').length;
        const potentialConnections = this.devices.length * 3; // Assuming max 3 connections per device
        
        const connectionRatio = activeConnections / potentialConnections;
        
        // Also consider connection quality
        const averageQuality = this.connections.length > 0 
            ? this.connections.reduce((sum, conn) => sum + conn.quality, 0) / this.connections.length
            : 0;
        
        // Combine metrics with some weighting
        return (connectionRatio * 0.6 + averageQuality * 0.4) * 100;
    }
    
    calculateDataThroughput() {
        if (this.devices.length === 0) return 0;
        
        // Base throughput depends on number of devices and connections
        let baseThroughput = this.devices.length * 5; // 5 units per device
        
        // Adjust for network integrity
        const integrity = this.calculateNetworkIntegrity() / 100;
        baseThroughput *= integrity;
        
        // Quantum relays provide exponential benefit
        const relayCount = this.devices.filter(d => d.type === 'relay').length;
        if (relayCount > 0) {
            baseThroughput *= Math.pow(1.5, relayCount);
        }
        
        return baseThroughput;
    }
    
    getStats() {
        return {
            deviceCount: this.devices.length,
            connectionCount: this.connections.length,
            networkIntegrity: this.calculateNetworkIntegrity(),
            dataThroughput: this.calculateDataThroughput()
        };
    }
}

