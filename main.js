import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { ASTRONOMICAL_UNIT, EARTH_RADIUS, scaleDistance, scaleRadius, SolarSystem } from './astronomy.js';
import { PhysicsEngine } from './physics.js';
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
        this.lastTime = 0;

        // Set up the scene
        this.initScene();
        this.initSolarSystem();
        this.initUI();

        // Start animation loop
        this.animate();
    }

    initScene() {
        // Create scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000000);

        // Create camera
        this.camera = new THREE.PerspectiveCamera(
            75, window.innerWidth * 0.7 / window.innerHeight, 0.1, 100000
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
        this.controls.maxDistance = 10000; // Allow zooming out quite far

        // Add lighting
        this.addLights();

        // Window resize listener
        window.addEventListener('resize', () => this.onWindowResize());

        // Update camera focus when changing view
        this.camera.addEventListener('change', () => {
            if (this.solarSystem) {
                this.solarSystem.updateChunks(this.camera.position);
            }
        });
    }

    initSolarSystem() {
        // Create solar system
        this.solarSystem = new SolarSystem();
        this.solarSystem.initialize(this.scene);

        // Initialize physics
        this.physics = new PhysicsEngine(this.solarSystem);
        this.physics.initialize();

        // Set initial camera position to Earth
        const earth = this.solarSystem.bodies.find(body => body.name === 'Earth');
        if (earth) {
            this.controls.target.copy(earth.object.position);
            this.camera.position.set(
                earth.object.position.x,
                earth.object.position.y + scaleRadius(EARTH_RADIUS) * 5,
                earth.object.position.z + scaleRadius(EARTH_RADIUS) * 5
            );
            this.controls.update();
        }

        // Create launchpad on Earth
        this.createLaunchpad();

        // Load initial chunks around Earth
        this.solarSystem.updateChunks(this.camera.position);
    }

    createLaunchpad() {
        const earth = this.solarSystem.bodies.find(body => body.name === 'Earth');
        if (!earth) return;

        const earthRadius = scaleRadius(EARTH_RADIUS);

        // Create launchpad on Earth's surface
        const launchpadGeometry = new THREE.CylinderGeometry(
            earthRadius * 0.05,
            earthRadius * 0.08,
            earthRadius * 0.05,
            32
        );
        const launchpadMaterial = new THREE.MeshPhongMaterial({ color: 0x888888 });
        this.launchpad = new THREE.Mesh(launchpadGeometry, launchpadMaterial);

        // Position on Earth's surface (equator)
        const launchPosition = new THREE.Vector3(0, 0, 1).normalize();
        this.launchpad.position.copy(earth.object.position).add(
            launchPosition.multiplyScalar(earthRadius)
        );

        // Orient launchpad to point away from Earth center
        this.launchpad.lookAt(earth.object.position);
        this.launchpad.rotateX(Math.PI / 2);

        earth.object.add(this.launchpad);

        // Store the launch position for rocket placement
        this.launchPosition = this.launchpad.position.clone();
    }

    addLights() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0x202020);
        this.scene.add(ambientLight);

        // We'll use the sun as the main light source (added in solar system)
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

        // Add time controls
        this.addTimeControls();
    }

    addTimeControls() {
        // Create time control UI
        const timeControls = document.createElement('div');
        timeControls.className = 'time-controls';
        timeControls.innerHTML = `
            <div class="time-control">
                <label>Simulation Speed:</label>
                <select id="time-scale">
                    <option value="0.1">0.1x (Slow)</option>
                    <option value="1" selected>1x (Real-time)</option>
                    <option value="10">10x</option>
                    <option value="100">100x</option>
                    <option value="1000">1000x</option>
                    <option value="10000">10000x</option>
                </select>
            </div>
        `;

        // Add to simulation info
        document.getElementById('simulation-info').appendChild(timeControls);

        // Add event listener for time scale changes
        document.getElementById('time-scale').addEventListener('change', (e) => {
            this.physics.timeScale = parseFloat(e.target.value);
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
            // Find Earth
            const earth = this.solarSystem.bodies.find(body => body.name === 'Earth');
            if (earth) {
                this.controls.target.copy(earth.object.position);
                this.camera.position.set(
                    earth.object.position.x,
                    earth.object.position.y + scaleRadius(EARTH_RADIUS) * 5,
                    earth.object.position.z + scaleRadius(EARTH_RADIUS) * 5
                );
            }
        } else if (tabName === 'launch') {
            if (this.rocket) {
                this.controls.target.copy(this.rocket.position);
                // Position camera to view rocket from side
                const offset = new THREE.Vector3(50, 20, 50);
                this.camera.position.copy(this.rocket.position).add(offset);
            }
        } else if (tabName === 'lifeline') {
            // Wide view of the solar system
            this.controls.target.set(0, 0, 0);
            this.camera.position.set(0, scaleDistance(ASTRONOMICAL_UNIT / 2), scaleDistance(ASTRONOMICAL_UNIT));
        }

        this.controls.update();
    }

    updateRocketDesign() {
        // Update the 3D model of the rocket based on the designer's specifications
        if (this.rocket) {
            this.scene.remove(this.rocket);
        }

        this.rocket = this.rocketDesigner.createRocketModel();

        // Place rocket on launchpad
        const earth = this.solarSystem.bodies.find(body => body.name === 'Earth');
        if (earth) {
            // Position rocket on launchpad
            const earthPosition = earth.object.position;
            const earthRadius = scaleRadius(EARTH_RADIUS);

            // Find position on Earth's surface
            const surfacePosition = new THREE.Vector3(0, 0, 1).normalize();
            surfacePosition.multiplyScalar(earthRadius * 1.02); // Slightly above surface

            // Get world position
            this.rocket.position.copy(earthPosition).add(surfacePosition);

            // Orient rocket to point up from Earth's surface
            this.rocket.lookAt(
                this.rocket.position.clone().add(surfacePosition)
            );
        }

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
            <div class="orbit-info">
                <p>Low Earth Orbit: 7.8 km/s at 200-2000 km altitude</p>
                <p>Geosynchronous Orbit: 3.1 km/s additional at 35,786 km</p>
                <p>Earth Escape Velocity: 11.2 km/s</p>
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

        // Find Earth for reference
        const earth = this.solarSystem.bodies.find(body => body.name === 'Earth');
        if (!earth) return;

        // Create physical rocket body
        const earthPhysics = this.physics.bodies.get('Earth');

        // Calculate rocket position and orientation
        const rocketPos = this.rocket.position.clone();
        const rocketDir = new THREE.Vector3().subVectors(rocketPos, earth.object.position).normalize();

        // Create physics body for rocket
        this.rocketBody = this.physics.createDynamicBody({
            position: rocketPos,
            velocity: new THREE.Vector3(0, 0, 0),
            mass: this.rocketDesigner.calculatePerformance().mass * 1000, // kg
            radius: 5, // meters
            mesh: this.rocket
        });

        // Switch to launch tab
        this.switchTab('launch');

        // Follow rocket with camera
        this.followRocket = true;
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
            this.physics.removeBody(this.rocketBody);
            this.rocketBody = null;
        }

        // Reset rocket position
        this.updateRocketDesign();

        // Reset stats
        document.getElementById('altitude').textContent = '0 km';
        document.getElementById('velocity').textContent = '0 km/s';
        document.getElementById('fuel').textContent = '100%';

        // Stop following rocket
        this.followRocket = false;
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

            // Create physics body for the payload
            if (this.rocketBody) {
                // Calculate orbital velocity
                const orbitVelocity = this.physics.getOrbitalVelocity(
                    this.rocket.position,
                    this.getNearestCelestialBody()
                );

                // Create physics body for payload
                const payloadBody = this.physics.createDynamicBody({
                    position: this.rocket.position.clone(),
                    velocity: orbitVelocity,
                    mass: payload.properties.mass * 1000, // kg
                    radius: 2, // meters
                    mesh: deviceMesh
                });
            }

            // Switch to lifeline tab
            this.switchTab('lifeline');

            return true;
        }

        return false;
    }

    getNearestCelestialBody() {
        if (!this.rocket) return 'Earth';

        let nearestBody = 'Earth';
        let nearestDistance = Infinity;

        this.solarSystem.bodies.forEach(body => {
            if (body.type === 'planet' || body.type === 'star') {
                const distance = this.rocket.position.distanceTo(body.object.position);
                if (distance < nearestDistance) {
                    nearestDistance = distance;
                    nearestBody = body.name;
                }
            }
        });

        return nearestBody;
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

    updateRocket(dt) {
        if (!this.simulationRunning || !this.rocketBody) return;

        // Apply thrust if fuel remains
        const fuelRemaining = this.rocketDesigner.consumeFuel();
        document.getElementById('fuel').textContent = `${(fuelRemaining * 100).toFixed(1)}%`;

        if (fuelRemaining > 0) {
            // Apply thrust in the direction the rocket is pointing
            const thrust = this.rocketDesigner.calculateThrust();
            const thrustVector = new THREE.Vector3(0, thrust, 0);

            // Transform thrust to world coordinates
            const worldThrust = this.rocketBody.quaternion.vmult(thrustVector);
            this.rocketBody.applyForce(worldThrust, this.rocketBody.position);
        }

        // Update stats
        const earth = this.solarSystem.bodies.find(body => body.name === 'Earth');
        if (earth) {
            const earthPos = earth.object.position;
            const altitude = this.rocket.position.distanceTo(earthPos) - scaleRadius(EARTH_RADIUS);
            const altitudeKm = (altitude / scaleDistance(1)) * 1000; // Convert to km in real scale
            document.getElementById('altitude').textContent = `${altitudeKm.toFixed(2)} km`;
        }

        const velocity = this.rocketBody.velocity.length();
        const velocityKmS = (velocity / scaleDistance(1)) * 1000; // Convert to km/s in real scale
        document.getElementById('velocity').textContent = `${velocityKmS.toFixed(2)} km/s`;

        // Check if we've reached orbit altitude
        if (altitudeKm > 200 && !this.payloadDeployed) {
            this.payloadDeployed = this.deployPayload();
        }

        // Follow rocket with camera if needed
        if (this.followRocket) {
            // Position camera to track rocket
            this.controls.target.copy(this.rocket.position);

            // Keep relative position to rocket
            const offset = new THREE.Vector3(50, 20, 50);
            const cameraIdealPosition = this.rocket.position.clone().add(offset);

            // Smoothly move camera
            this.camera.position.lerp(cameraIdealPosition, 0.05);
            this.controls.update();
        }
    }

    animate(time) {
        requestAnimationFrame((t) => this.animate(t));

        // Calculate delta time
        const dt = this.lastTime ? (time - this.lastTime) / 1000 : 0;
        this.lastTime = time;

        if (dt > 0 && dt < 1) { // Reasonable delta time limits
            // Update solar system
            this.solarSystem.updatePlanetPositions(dt);

            // Update physics
            this.physics.update(dt);

            // Update rocket
            this.updateRocket(dt);

            // Update space chunks around camera
            this.solarSystem.updateChunks(this.camera.position);
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