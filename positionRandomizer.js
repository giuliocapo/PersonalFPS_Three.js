import * as THREE from 'three';
//Function to obtain a casual position on the sides of the floor.
export function getRandomPositionOnEdge(mapSize) {
    const edge = Math.floor(Math.random() * 4);
    const offset = (Math.random() - 0.5) * mapSize;
    switch (edge) {
        case 0: return new THREE.Vector3(-mapSize / 2, 0, offset); //left side
        case 1: return new THREE.Vector3(mapSize / 2, 0, offset);  //right side
        case 2: return new THREE.Vector3(offset, 0, -mapSize / 2); //south side
        case 3: return new THREE.Vector3(offset, 0, mapSize / 2);  //north side
        default: return new THREE.Vector3(0, 0, 0);
    }
}

export function getRandomPosition(maxX, maxY, maxZ) {
    return new THREE.Vector3(
        Math.random() * maxX - maxX / 2, //casual x starting from the center
        Math.random() * maxY - maxY / 2, //casual y starting from the center
        Math.random() * maxZ - maxZ / 2  //casual z starting from the center
    );
}