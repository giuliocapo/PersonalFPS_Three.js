import * as THREE from 'three';
import {MTLLoader} from "three/examples/jsm/loaders/MTLLoader";
import {OBJLoader} from "three/examples/jsm/loaders/OBJLoader";
import {FBXLoader} from "three/examples/jsm/loaders/FBXLoader";
import {GLTFLoader} from "three/examples/jsm/loaders/GLTFLoader";
import {gui} from "./GUIManager";


//Load Models
//I wrap everything in the for loop in a function to stop the key variable from changing during the loading process
//first will do "myFirstObj" the loop then changes to "secondObj" the first one when finished put the mesh into _key and you can end up with a mesh loaded in the wrong place
export function loadModels(models, loadingManager) {
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

/*add an invisible capsule bounding box around a given mesh for collision detection. I utilized the capsule geometry and using maths from the scaled mesh"zombie"
I've created a capsule similar to the zombie, we can also give opacity or not to see that.
*/
var capsuleMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true,  opacity: 1, transparent: true }); //I invented this type of call to let manage all the capsule opacity together with one folder on GUI
export function addCapsuleBoundingBox(mesh, scale, position, key, scene, capsuleBoundingBoxes) {
    //Position and scale the original model
    mesh.position.copy(position);
    mesh.scale.copy(scale);
    mesh.updateMatrixWorld(true);

    //Calculate the mesh dimensions
    const box = new THREE.Box3().setFromObject(mesh);
    const size = new THREE.Vector3();
    box.getSize(size);

    //Create a capsule geometry with the calculated dimensions
    const capsuleRadius = Math.min(size.x, size.z) / 2; //Capsule radius based on the smaller dimension between x and z
    const capsuleHeight = size.y - capsuleRadius * 2; //Height of the central cylinder
    const capsuleGeometry = new THREE.CapsuleGeometry(capsuleRadius, capsuleHeight, 4, 8);

    //Create a mesh for the capsule
    const capsuleMesh = new THREE.Mesh(capsuleGeometry, capsuleMaterial);

    //Calculate the capsule position to center it relative to the model
    const capsulePosition = new THREE.Vector3();
    capsulePosition.copy(position);
    capsulePosition.y += (capsuleHeight / 2 + capsuleRadius); //Adjust the position based on the capsule height unless it would be 50% under the ground in my case

    capsuleMesh.position.copy(capsulePosition);
    scene.add(capsuleMesh);

    //Add the capsule mesh to the bounding box object for future reference
    capsuleBoundingBoxes.zombie[key] = {
        cBBox: capsuleMesh
    };
    console.log(`${key} Capsule Mesh:`, capsuleBoundingBoxes.zombie[key]);

}

//I invented this type of call to let manage all the capsule opacity together with one folder on GUI
export function addCapsuleOpacityGui(){
    // Add GUI control for capsule opacity
    const capsuleFolder = gui.addFolder('Zombie Capsules');
    capsuleFolder.add(capsuleMaterial, 'opacity', 0, 1).name('Opacity').onChange(() => {
        capsuleMaterial.needsUpdate = true;
    });
    capsuleFolder.open();
}

export function LoadAnimatedModel(path, mesh, anime, key, mixers, scene, meshes, loadingManager) {
    return new Promise((resolve, reject) => {
        const loader = new FBXLoader(loadingManager);
        loader.setPath(path);
        loader.load(mesh, (fbx) => {
            //fbx.scale.setScalar(0.02); //now im doing it when i add boundingBoxes with the function boundingBdoxes above
            fbx.traverse(c => {
                c.castShadow = true;
            });

            const animLoader = new FBXLoader(loadingManager);
            animLoader.setPath(path);
            animLoader.load(anime, (anim) => {
                const mixer = new THREE.AnimationMixer(fbx);
                mixers.push(mixer);
                const action = mixer.clipAction(anim.animations[0]);
                action.play();
                resolve(fbx); //resolve the promise after the fbx is loaded
            }, undefined, reject); //manage error for the animation loading, undefined is the third onLoad variable, reject is for OnError

            scene.add(fbx);
            meshes[key] = fbx;
        }, undefined, reject); //manage error for the model loading, undefined is the third onLoad variable, reject is for OnError
    });
}

export function LoadModel(scene, loadingManager) {
    const loader = new GLTFLoader(loadingManager);
    loader.load('thing.glb', (gltf) => {
        gltf.scene.traverse(c => {
            c.castShadow = true;
        });
        scene.add(gltf.scene);
    });
}
/*export function LoadAnimatedModelAndPlay(scene, mixers, path, modelFile, animFile, offset) {
    const loader = new FBXLoader();
    loader.setPath(path);
    loader.load(modelFile, (fbx) => {
        fbx.scale.setScalar(0.1);
        fbx.traverse(c => {
            c.castShadow = true;
        });
        fbx.position.copy(offset);

        const animLoader = new FBXLoader();
        animLoader.setPath(path);
        animLoader.load(animFile, (anim) => {
            const mixer = new THREE.AnimationMixer(fbx);
            mixers.push(mixer);
            const idle = mixer.clipAction(anim.animations[0]);
            idle.play();
        });

        scene.add(fbx);
    });
}
*/
