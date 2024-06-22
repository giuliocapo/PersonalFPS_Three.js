import * as THREE from 'three';
import {MTLLoader} from "three/examples/jsm/loaders/MTLLoader";
import {OBJLoader} from "three/examples/jsm/loaders/OBJLoader";



var scene, camera, renderer, mesh;
var meshFloor;

var box, boxTexture, boxNormalMap, boxBumpMap;

var ambientLight;
var light;

var keyboard;
keyboard = {};
//create a player object to hold details about the 'player', such as height and move speed
var player = { height: 1.8, speed: 0.2 ,turnSpeed:Math.PI*0.02 };
var USE_WIREFRAME = false;

function init() {
    // Create a scene and camera
    scene = new THREE.Scene();

    // Perspective projection: like a cone with all lines converging at the camera's point
    camera = new THREE.PerspectiveCamera(
        75, //field of view
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );

    //texture loader
    var textureLoader = new THREE.TextureLoader();

    // A Mesh is made up of a geometry and a material.
    // Materials affect how the geometry looks, especially under lights.
    mesh = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 1), // width, height, depth
        new THREE.MeshPhongMaterial({color: 0xff4444, wireframe: USE_WIREFRAME}) // Phong material reacts to the light, MI STA DANDO ERRORE GIALLO PERCHè DI DEFAULT C'è IL BASICMATERIAL MA NN HA SENSO DATO CHE LO STO CAMBIANDO
    );

    mesh.position.y += 1; // Move the mesh up 1 meter
    mesh.receiveShadow = true; //tell the mesh to receive
    mesh.castShadow = true; //tell the mesh to cast shadows
    // Add the mesh to the scene.
    scene.add(mesh);

    meshFloor = new THREE.Mesh(
        new THREE.PlaneGeometry(30,30., 30,30), //more segments = more polygons, which results in more detail.
        new THREE.MeshPhongMaterial( {color: 0xffffff, wireframe: USE_WIREFRAME}), //wireframe is useful to see the true geometry of things.
    )
    meshFloor.rotation.x -= Math.PI/2; //rotate the mesh of 90grades x.
    meshFloor.receiveShadow = true; //tell the mesh to receive, the floor doesn't need to cast shadow.
    scene.add( meshFloor );

    // LIGHTS
    ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
    scene.add(ambientLight);

    light = new THREE.PointLight(0xffffff, 100, 18);
    light.position.set(-3,6,-3);
    light.castShadow = true;
    // Will not light anything closer than 0.1 units or further than 25 units
    light.shadow.camera.near = 0.1;
    light.shadow.camera.far = 25;
    scene.add(light);

    //BOX
    boxTexture =  textureLoader.load("./textures/crate0/crate0_diffuse.png");
    boxBumpMap = textureLoader.load("textures/crate0/crate0_bump.png");
    boxNormalMap = textureLoader.load("./textures/crate0/crate0_normal.png");

    box = new THREE.Mesh(
        new THREE.BoxGeometry(3, 3, 3),
        new THREE.MeshPhongMaterial({
            color: 0xffffff,
            map: boxTexture,
            bumpMap: boxBumpMap,
            normalMap: boxNormalMap
        })
    );
    scene.add(box);
    box.receiveShadow = true;
    box.castShadow = true;
    box.position.set(2.5, 3/2, 2.5);

    // Model/material loading!
    var mtlLoader = new MTLLoader();
    mtlLoader.load("Models/OBJ format/bed.mtl", function(materials){

        // materials.preload();
        var objLoader = new OBJLoader();
        objLoader.setMaterials(materials);

        objLoader.load("Models/OBJ format/bed.obj", function(mesh) {
            scene.add(mesh);
        });


    });

    // Move the camera to 0,player.height,-5 (the Y axis is "up")
    camera.position.set(0, player.height, -5);
    // Point the camera to look at 0,player.height,0
    camera.lookAt(new THREE.Vector3(0, player.height, 0));


    renderer = new THREE.WebGLRenderer({ antialias: true }); // Ensure correct initialization of WebGLRenderer, antialiasing true to correct corner errors.
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.BasicShadowMap;

    document.body.appendChild(renderer.domElement); // Append renderer's DOM element to the body

    // Begin animation
    animate();
}

function animate() {
    requestAnimationFrame(animate); // Tells the browser to smoothly render at 60Hz

    // Rotate our mesh.
    mesh.rotation.x += 0.01;
    mesh.rotation.y += 0.02;

    //rotate box
    box.rotation.y += 0.001;

    // Keyboard movement inputs
    if(keyboard[87]){ // W key
        camera.position.x -= Math.sin(camera.rotation.y) * player.speed;
        camera.position.z -= -Math.cos(camera.rotation.y) * player.speed;
    }
    if(keyboard[83]){ // S key
        camera.position.x += Math.sin(camera.rotation.y) * player.speed;
        camera.position.z += -Math.cos(camera.rotation.y) * player.speed;
    }
    if(keyboard[65]){ // A key
        // Redirect movement by 90 degrees
        camera.position.x += Math.sin(camera.rotation.y + Math.PI/2) * player.speed;
        camera.position.z += -Math.cos(camera.rotation.y + Math.PI/2) * player.speed;
    }
    if(keyboard[68]){ // D key
        camera.position.x += Math.sin(camera.rotation.y - Math.PI/2) * player.speed;
        camera.position.z += -Math.cos(camera.rotation.y - Math.PI/2) * player.speed;
    }

    // Keyboard turn camera on player inputs
    if(keyboard[37]){ // left arrow key
        camera.rotation.y -= player.turnSpeed;
    }
    if(keyboard[39]){ // right arrow key
        camera.rotation.y += player.turnSpeed;
    }

    // Draw the scene from the perspective of the camera.
    renderer.render(scene, camera);
}



function KeyDown(event) {
    keyboard[event.keyCode] = true;
}
function KeyUp(event) {
    keyboard[event.keyCode] = false;
}

//listeners when a key is pressed down or pull up.
window.addEventListener('keydown', KeyDown);
window.addEventListener('keyup', KeyUp);


function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

window.addEventListener('resize', onWindowResize, false); //put the box when resize event is fired that is when the windows is resized.

// When the page has loaded, run init();
window.onload = init;