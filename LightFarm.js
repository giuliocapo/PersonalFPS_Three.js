import * as THREE from 'three';

export class LightFarm {
    constructor(scene) {
        this.scene = scene;
    }

    addAmbientLight(color = 0xffffff, intensity = 0.2) {
        const ambientLight = new THREE.AmbientLight(color, intensity);
        this.scene.add(ambientLight);
    }

    addPointLight(color = 0xffffff, intensity = 100, distance = 18, position = { x: -3, y: 6, z: -3 }) {
        const pointLight = new THREE.PointLight(color, intensity, distance);
        pointLight.position.set(position.x, position.y, position.z);
        pointLight.castShadow = true;
        pointLight.shadow.camera.near = 0.1;
        pointLight.shadow.camera.far = 25;
        this.scene.add(pointLight);
    }
}