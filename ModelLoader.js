import * as THREE from 'three';
import {MTLLoader} from "three/examples/jsm/loaders/MTLLoader";
import {OBJLoader} from "three/examples/jsm/loaders/OBJLoader";

//Load Models
//I wrap everything in the for loop in a function to stop the key variable from changing during the loading process
//first will do "myFirstObj" the loop then changes to "secondObj" the first one when finished put the mesh into _key and you can end up with a mesh loaded in the wrong place
export function loadModels(models, loadingManager, scene, meshes, boundingBoxes) {
    for (var _key in models) { // Iterate through all keys (tent, campfire_stones, cliff_block_rock) in the models object
        (function (key) { // Create a closure to maintain the value of 'key' for each iteration asynchronous of the loop
            //console.log(_key); first time is tent
            //console.log(key); first time is tent, so will just traverse the models structure
            var mtlLoader = new MTLLoader(loadingManager);
            mtlLoader.load(models[key].mtl, function (materials) {
                materials.preload(); // Prepare the materials for use

                var objLoader = new OBJLoader(loadingManager);

                objLoader.setMaterials(materials);
                objLoader.load(models[key].obj, function (mesh) {

                    mesh.traverse(function (node) { // Traverse all nodes of the loaded mesh
                        if (node instanceof THREE.Mesh) {
                            node.castShadow = true;
                            node.receiveShadow = true;
                        }
                    });
                    models[key].mesh = mesh; // Store the loaded mesh in the models object at the corresponding key
                    console.log(`Loaded mesh for ${key}`);
                });
            });

        })(_key); // Pass the current key to the self-invoking function to maintain context of the asynchronous loop
    }
}

export function addBoundingBox(mesh, scale, position, key, scene, boundingBoxes) {
    mesh.position.copy(position);
    mesh.scale.copy(scale);
    mesh.updateMatrixWorld(true);

    const boxHelper = new THREE.BoxHelper(mesh, 0xff0000);
    scene.add(boxHelper);

    boundingBoxes[key] = new THREE.Box3().setFromObject(mesh);
    console.log(`${key} BBox:`, boundingBoxes[key]);
}