import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import * as CANNON from 'cannon-es';
import { RocketDesigner } from './rocket.js';
import { LifelineNetwork } from './lifeline.js';

class LifelineSimulation {
    constructor() {
        // Initialize properties
        this.activeTab = 'design';
        this.simulationRunning = false;
        this.rocketLaunched = false;
        this.lifeline = new LifelineNetwork();
        this.rocketDesigner = new RocketDesigner();
        
        // Set up the scene
        this.initScene();
        this.initPhysics();
        this.initUI();
        
        // Start animation loop
        this.animate();
    }
    
    initScene() {
        // Create scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000000);
        
        // Add fog for atmospheric effect
        this.scene.fog = new THREE.FogExp2(0x000000, 0.00003);
        
        // Create camera
        this.camera = new THREE.PerspectiveCamera(
            75, window.innerWidth * 0.7 / window.innerHeight, 0.1, 50000
        );
        this.camera.position.set(0, 50, 200);
        
        // Create renderer
        this.renderer = new THREE.WebGLRenderer({
            canvas: document.getElementById('simulation-canvas'),
            antialias: true
        });
        this.renderer.setSize(window.innerWidth * 0.7, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        
        // Add orbit controls
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        
        // Add lighting
        this.addLights();
        
        // Create Earth
        this.createEarth();
        
        // Add stars background
        this.createStars();
        
        // Window resize listener
        window.addEventListener('resize', () => this.onWindowResize());
    }
    
    addLights() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0x404040, 2);
        this.scene.add(ambientLight);
        
        // Directional light (sun)
        const sunLight = new THREE.DirectionalLight(0xffffff, 3);
        sunLight.position.set(5000, 2500, -2000);
        sunLight.castShadow = true;
        sunLight.shadow.mapSize.width = 2048;
        sunLight.shadow.mapSize.height = 2048;
        sunLight.shadow.camera.near = 500;
        sunLight.shadow.camera.far = 10000;
        sunLight.shadow.camera.left = -1000;
        sunLight.shadow.camera.right = 1000;
        sunLight.shadow.camera.top = 1000;
        sunLight.shadow.camera.bottom = -1000;
        this.scene.add(sunLight);
    }
    
    createEarth() {
        const earthGeometry = new THREE.SphereGeometry(100, 64, 64);
        const earthMaterial = new THREE.MeshPhongMaterial({
            color: 0x2233ff,
            specular: 0x222222,
            shininess: 25,
            emissive: 0x112244
        });
        
        this.earth = new THREE.Mesh(earthGeometry, earthMaterial);
        this.earth.castShadow = true;
        this.earth.receiveShadow = true;
        this.scene.add(this.earth);
        
        // Add atmosphere glow
        const atmosphereGeometry = new THREE.SphereGeometry(103, 64, 64);
        const atmosphereMaterial = new THREE.MeshPhongMaterial({
            color: 0x4466aa,
            transparent: true,
            opacity: 0.3,
            side: THREE.BackSide
        });
        
        const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
        this.scene.add(atmosphere);
        
        // Launchpad
        const launchpadGeometry = new THREE.CylinderGeometry(10, 10, 5, 32);
        const launchpadMaterial = new THREE.MeshPhongMaterial({ color: 0x888888 });
        this.launchpad = new THREE.Mesh(launchpadGeometry, launchpadMaterial);
        this.launchpad.position.set(0, 100, 0);
        this.launchpad.rotation.set(0, 0, 0);
        this.scene.add(this.launchpad);
    }
    
    createStars() {
        const starsGeometry = new THREE.BufferGeometry();
        const starsMaterial = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 1,
            sizeAttenuation: false
        });
        
        const starsVertices = [];
        for (let i = 0; i < 10000; i++) {
            const x = THREE.MathUtils.randFloatSpread(10000);
            const y = THREE.MathUtils.randFloatSpread(10000);
            const z = THREE.MathUtils.randFloatSpread(10000);
            
            // Exclude area near Earth
            if (Math.sqrt(x*x + y*y + z*z) > 300) {
                starsVertices.push(x, y, z);
            }
        }
        
        starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starsVertices, 3));
        this.stars = new THREE.Points(starsGeometry, starsMaterial);
        this.scene.add(this.stars);
    }
    
    initPhysics() {
        // Create physics world
        this.world = new CANNON.World({
            gravity: new CANNON.Vec3(0, -9.82, 0)
        });
        
        // Earth body
        const earthBody = new CANNON.Body({
            mass: 0, // static body
            shape: new CANNON.Sphere(100),
            position: new CANNON.Vec3(0, 0, 0)
        });
        this.world.addBody(earthBody);
        
        // Launchpad body
        const launchpadBody = new CANNON.Body({
            mass: 0, // static body
            shape: new CANNON.Cylinder(10, 10, 5, 32),
            position: new CANNON.Vec3(0, 100, 0)
        });
        this.world.addBody(launchpadBody);
    }
    
    initUI() {
        // Tab buttons
        const tabButtons = document.querySelectorAll('.tab-btn');
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                this.switchTab(button.dataset.tab);
            });
        });
        
        // Rocket design components
        const components = document.querySelectorAll('.component');
        components.forEach(component => {
            component.addEventListener('click', () => {
                this.rocketDesigner.addComponent(component.dataset.type);
                this.updateRocketDesign();
            });
        });
        
        // Launch button
        document.getElementById('launch-btn').addEventListener('click', () => {
            this.launchRocket();
        });
        
        // Abort button
        document.getElementById('abort-btn').addEventListener('click', () => {
            this.abortMission();
        });
        
        // Calculate button
        document.getElementById('calculate-btn').addEventListener('click', () => {
            this.calculateRocketPerformance();
        });
    }
    
    switchTab(tabName) {
        // Update active tab
        this.activeTab = tabName;
        
        // Update UI
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });
        
        document.querySelectorAll('.panel').forEach(panel => {
            const isActive = panel.id === `${tabName}-panel`;
            panel.classList.toggle('active', isActive);
        });
        
        // Update camera position based on active tab
        if (tabName === 'design') {
            this.camera.position.set(0, 150, 200);
            this.controls.target.set(0, 100, 0);
        } else if (tabName === 'launch') {
            this.camera.position.set(150, 150, 150);
            this.controls.target.set(0, 100, 0);
        } else if (tabName === 'lifeline') {
            this.camera.position.set(0, 500, 1000);
            this.controls.target.set(0, 0, 0);
        }
    }
    
    updateRocketDesign() {
        // Update the 3D model of the rocket based on the designer's specifications
        if (this.rocket) {
            this.scene.remove(this.rocket);
        }
        
        this.rocket = this.rocketDesigner.createRocketModel();
        this.rocket.position.copy(this.launchpad.position);
        this.rocket.position.y += 10; // Position on launchpad
        this.scene.add(this.rocket);
        
        // Update component properties panel
        const propertiesPanel = document.getElementById('component-properties');
        propertiesPanel.innerHTML = this.rocketDesigner.getComponentPropertiesHTML();
    }
    
    calculateRocketPerformance() {
        const performance = this.rocketDesigner.calculatePerformance();
        
        // Display performance metrics
        const propertiesPanel = document.getElementById('component-properties');
        propertiesPanel.innerHTML = `
            <h4>Rocket Performance</h4>
            <div class="performance-stats">
                <div><strong>Total Mass:</strong> ${performance.mass.toFixed(2)} tons</div>
                <div><strong>Thrust:</strong> ${performance.thrust.toFixed(2)} kN</div>
                <div><strong>Thrust-to-Weight Ratio:</strong> ${performance.thrustToWeight.toFixed(2)}</div>
                <div><strong>Delta-V:</strong> ${performance.deltaV.toFixed(2)} m/s</div>
                <div><strong>Max Altitude:</strong> ${performance.maxAltitude.toFixed(2)} km</div>
                <div><strong>Payload Capacity:</strong> ${performance.payloadCapacity.toFixed(2)} tons</div>
            </div>
            <div class="performance-assessment">
                ${performance.canReachOrbit ? 
                    '<div class="success">This rocket can reach orbit!</div>' :
                    '<div class="warning">This rocket cannot reach orbit. Try adding more fuel or engines.</div>'
                }
            </div>
        `;
    }
    
    launchRocket() {
        if (this.simulationRunning) return;
        
        this.simulationRunning = true;
        this.rocketLaunched = true;
        
        // Update UI
        document.getElementById('launch-btn').disabled = true;
        document.getElementById('abort-btn').disabled = false;
        
        // Create physical rocket body
        this.rocketBody = this.rocketDesigner.createRocketPhysics();
        this.rocketBody.position.copy(this.launchpad.position);
        this.rocketBody.position.y += 10;
        this.world.addBody(this.rocketBody);
        
        // Apply initial thrust
        const thrust = this.rocketDesigner.calculateThrust();
        this.rocketBody.applyLocalForce(new CANNON.Vec3(0, thrust, 0), new CANNON.Vec3(0, 0, 0));
        
        // Switch to launch tab
        this.switchTab('launch');
    }
    
    abortMission() {
        if (!this.simulationRunning) return;
        
        this.simulationRunning = false;
        this.rocketLaunched = false;
        
        // Update UI
        document.getElementById('launch-btn').disabled = false;
        document.getElementById('abort-btn').disabled = true;
        
        // Remove rocket physics
        if (this.rocketBody) {
            this.world.removeBody(this.rocketBody);
            this.rocketBody = null;
        }
        
        // Reset rocket position
        this.updateRocketDesign();
        
        // Reset stats
        document.getElementById('altitude').textContent = '0 km';
        document.getElementById('velocity').textContent = '0 km/s';
        document.getElementById('fuel').textContent = '100%';
    }
    
    deployPayload() {
        // Get the payload from the rocket
        const payload = this.rocketDesigner.getPayload();
        
        if (payload) {
            // Add the payload to the lifeline
            const deviceInfo = this.lifeline.addDevice(
                payload.type,
                this.rocket.position.clone(),
                payload.properties
            );
            
            // Create visual representation
            const deviceMesh = this.lifeline.createDeviceMesh(deviceInfo);
            this.scene.add(deviceMesh);
            
            // Update lifeline stats
            this.updateLifelineStats();
            
            // Switch to lifeline tab
            this.switchTab('lifeline');
            
            return true;
        }
        
        return false;
    }
    
    updateLifelineStats() {
        const stats = this.lifeline.getStats();
        
        document.getElementById('device-count').textContent = stats.deviceCount;
        document.getElementById('network-integrity').textContent = `${stats.networkIntegrity.toFixed(1)}%`;
        document.getElementById('data-throughput').textContent = `${stats.dataThroughput.toFixed(2)} Qbits/s`;
    }
    
    onWindowResize() {
        this.camera.aspect = window.innerWidth * 0.7 / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth * 0.7, window.innerHeight);
    }
    
    updatePhysics() {
        if (!this.simulationRunning) return;
        
        this.world.step(1/60);
        
        // Update rocket position
        if (this.rocketBody && this.rocket) {
            this.rocket.position.copy(this.rocketBody.position);
            this.rocket.quaternion.copy(this.rocketBody.quaternion);
            
            // Update stats
            const altitude = (this.rocketBody.position.length() - 100).toFixed(2);
            document.getElementById('altitude').textContent = `${altitude} km`;
            
            const velocity = this.rocketBody.velocity.length().toFixed(2);
            document.getElementById('velocity').textContent = `${velocity} km/s`;
            
            // Update fuel
            const fuelRemaining = this.rocketDesigner.consumeFuel();
            document.getElementById('fuel').textContent = `${(fuelRemaining * 100).toFixed(1)}%`;
            
            // Check if we've reached orbit
            if (altitude > 200 && !this.payloadDeployed) {
                this.payloadDeployed = this.deployPayload();
            }
            
            // Apply thrust if fuel remains
            if (fuelRemaining > 0) {
                const thrust = this.rocketDesigner.calculateThrust();
                this.rocketBody.applyLocalForce(new CANNON.Vec3(0, thrust, 0), new CANNON.Vec3(0, 0, 0));
            }
        }
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        
        // Update physics
        this.updatePhysics();
        
        // Rotate earth
        if (this.earth) {
            this.earth.rotation.y += 0.0001;
        }
        
        // Update controls
        this.controls.update();
        
        // Render
        this.renderer.render(this.scene, this.camera);
    }
}

// Start simulation when page loads
window.addEventListener('load', () => {
    new LifelineSimulation();
});

