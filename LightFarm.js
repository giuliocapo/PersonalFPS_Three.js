import * as THREE from 'three';

export class LightFarm {
    constructor(scene) {
        this.scene = scene;
    }

    addAmbientLight(color , intensity) {
        const ambientLight = new THREE.AmbientLight(color, intensity);
        this.scene.add(ambientLight);
    }

    addPointLight(color , intensity, position ) {
        const pointLight = new THREE.PointLight(color, intensity);
        pointLight.position.set(position.x, position.y, position.z);
        pointLight.castShadow = true;
        pointLight.shadow.camera.near = 0.1;
        pointLight.shadow.camera.far = 25;
       //pointLight.shadow.bias = 0.0001;
        return pointLight;
    }
}