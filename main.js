import * as THREE from 'three';

import {addBoundingBox, addCapsuleBoundingBox, LoadAnimatedModel, LoadModel, loadModels} from "./ModelLoader";
import {LightFarm} from "./LightFarm";
import {Sky} from "three/addons/objects/Sky.js";
import {gui} from "./GUIManager";
import {all} from "three/examples/jsm/nodes/math/MathNode";


var scene, camera, renderer, mesh;
var meshFloor;

var box, boxTexture, boxNormalMap, boxBumpMap;


var keyboard;
keyboard = {};

var mixers = [];

//create a player object to hold details about the 'player', such as height and move speed
var player = { height: 1.8, speed: 0.2 ,turnSpeed:Math.PI*0.002, canShoot: 0 , bBox: null};

//GUI command for speed and turnspeed
{
    const speedPlayerFolder = gui.addFolder('speedPlayer');
    speedPlayerFolder.add(player, 'speed', 0, 1).name('Speed');
    speedPlayerFolder.open();

    const rotationSpeedPlayerFolder = gui.addFolder('rotationSpeedPlayer');
    rotationSpeedPlayerFolder.add(player, 'turnSpeed', 0, Math.PI * 0.01).name('Turn Speed');
    rotationSpeedPlayerFolder.open();
}

var USE_WIREFRAME = false;

//loading screen object (scene, camera, mesh)
var loadingScreen = {
    scene: new THREE.Scene(),
    camera: new THREE.PerspectiveCamera(90, window.innerWidth/window.innerHeight, 0.1, 100),
    box: new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.5, 0.5),
        new THREE.MeshBasicMaterial({color: 0x4444ff}),
    )
}
//loading animation variables
var boxSpeed = 0.05;
var boxDirection = 1;
var boxPosition = 0;

//boolean variable to track when the resources are ready to load
var RESOURCES_LOADED = false;

//models is an object to hold OBJ and MTL file locations that will be loaded to the "mesh" field
var models = {
    tent: {
        obj: "Models/OBJ format/tent_detailedOpen.obj",
        mtl: "Models/OBJ format/tent_detailedOpen.mtl",
        mesh: null,

    },
    campfire_stones: {
        obj: "Models/OBJ format/campfire_stones.obj",
        mtl: "Models/OBJ format/campfire_stones.mtl",
        mesh: null,

    },
    cliff_block_rock: {
        obj: "Models/OBJ format/cliff_block_rock.obj",
        mtl: "Models/OBJ format/cliff_block_rock.mtl",
        mesh: null,

    },
    pistol: {
        obj: "Models/OBJ weapons/uziLong.obj",
        mtl: "Models/OBJ weapons/uziLong.mtl",
        mesh: null,

    }
}
//Meshes object to index and will store every object appears in the scene indexed by a key
var meshes = {}

// BoundingBoxes object to store the bounding boxes of the meshes and PLAYER
var boundingBoxes = {};


// capsuleBoundingBoxes object to store the bounding boxes of the zombies and also HP!
var capsuleBoundingBoxes = {
    zombie: {},
};



//Bullets array to hold the bullets
var bullets = [];


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

    //Sky
    {
        const sky = new Sky();
        sky.scale.set(100, 1000, 100);
        let skyVisible = false

        sky.material.uniforms['turbidity'].value = 10;
        sky.material.uniforms['rayleigh'].value = 3;
        sky.material.uniforms['mieCoefficient'].value = 0.1;
        sky.material.uniforms['mieDirectionalG'].value = 0.95;
        sky.material.uniforms['sunPosition'].value.set(0.3, -0.038, -0.95)

        // Add GUI control for Sky
        const skyFolder = gui.addFolder('Sky');
        skyFolder.add({skyVisible: false}, 'skyVisible').name('Toggle Sky').onChange((value) => {
            skyVisible = value;
            if (skyVisible) {
                scene.add(sky);
            } else {
                scene.remove(sky);
            }
        });
        skyFolder.open();

    }

    //Fog
    {
        scene.fog = new THREE.FogExp2('#808080', 0.05);
        const fogFolder = gui.addFolder('Fog');
        fogFolder.add({fogDensity: 0.05}, 'fogDensity', 0, 0.1).name('Fog Density').onChange((value) => {
            scene.fog.density = value;
        });
        fogFolder.open();
    }

    //Background images
    {
        const loaderSkybox = new THREE.CubeTextureLoader();
        scene.background = loaderSkybox.load([
            'zombieSkybox1.png',
            'zombieSkybox1.png',
            'zombieSkybox1.png',
            'zombieSkybox1.png',
            'zombieSkybox1.png',
            'zombieSkybox1.png'
        ]);
    }

    //set up loading screen scene
    loadingScreen.box.position.set(0,0,5);
    loadingScreen.camera.lookAt(loadingScreen.box.position);
    loadingScreen.scene.add(loadingScreen.box);

    // Create a loading manager to set RESOURCES_LOADED when appropriate.
    // Pass loadingManager to all resource loaders.
    var loadingManager = new THREE.LoadingManager();

    loadingManager.onProgress = function(item, loaded, total){
        console.log(item, loaded, total);
    };

    loadingManager.onLoad = function(){
        console.log("loaded all resources");
        // watch the loading screen for 5 seconds
        setTimeout(function() {
            console.log("5 seconds have passed!");
            RESOURCES_LOADED = true;
            onResourcesLoaded();
        }, 5);
    };



    //texture loader
    var textureLoader = new THREE.TextureLoader(loadingManager);

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
        new THREE.PlaneGeometry(100,100., 100,100), //more segments = more polygons, which results in more detail.
        new THREE.MeshPhongMaterial( {color: 0x8b0000, wireframe: USE_WIREFRAME}), //wireframe is useful to see the true geometry of things.
    )
    meshFloor.rotation.x -= Math.PI/2; //rotate the mesh of 90grades x.
    meshFloor.receiveShadow = true; //tell the mesh to receive, the floor doesn't need to cast shadow.
    scene.add( meshFloor );

    // LIGHTS
    const lightFarm = new LightFarm(scene);
    //add light with lightFarm
    lightFarm.addAmbientLight(0x404040, 0.2);
    lightFarm.addPointLight(0xffffff, 100, 18, { x: -3, y: 6, z: -3 });
    lightFarm.addPointLight(0xffffff, 100, 18, { x: 40, y: 6, z: 40 });
    lightFarm.addPointLight(0xffffff, 100, 18, { x: -40, y: 6, z: 40 });
    lightFarm.addPointLight(0xffffff, 100, 18, { x: 40, y: 6, z: -40 });
    lightFarm.addPointLight(0xffffff, 100, 18, { x: -40, y: 6, z: -40 });


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


    //LOAD MODELS
    loadModels(models, loadingManager);

    // Carica il modello animato
    LoadAnimatedModel('zombie/',
        'mremireh_o_desbiens.fbx',
        'walk.fbx',
        'zombie', mixers, scene, meshes, loadingManager)
        .then(() => {
            meshes['zombie'].rotation.set(0, Math.PI, 0);
            addCapsuleBoundingBox(meshes['zombie'], new THREE.Vector3(0.02, 0.02, 0.02), new THREE.Vector3(6, 0, 0), 'zombie', scene, capsuleBoundingBoxes);
            //console.log(capsuleBoundingBoxes);
            capsuleBoundingBoxes.zombie['zombie'].hp = 5; //added hp integer value to the sub object zombie with name zombie in this case. so now capsuleBoundingBoxes.zombie['zombie'] got mesh and hp.


        })
        .catch(error => {
            console.error('Error loading model or animation:', error);
        });

    LoadModel(scene, loadingManager);
    //LoadModel();
    //Carica un altro modello animato e avvia l'animazione
    //LoadAnimatedModelAndPlay(scene, mixers, './resources/zombie/', 'mremireh_o_desbiens.fbx', 'walk.fbx', new THREE.Vector3(0, 0, 0));

    //Carica un modello statico




    // Move the camera to 0,player.height,-5 (the Y axis is "up")
    camera.position.set(0, player.height, -5);
    // Point the camera to look at 0,player.height,0
    camera.lookAt(new THREE.Vector3(0, player.height, 0));



    // Player Bounding Box creation
    const cameraBoundingBox = new THREE.BoxGeometry();
    const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const playerBox = new THREE.Mesh(cameraBoundingBox, material);

    player.bBox = new THREE.Box3().setFromObject(playerBox);
    console.log(`${'player'} BBox:`, player.bBox);






    renderer = new THREE.WebGLRenderer({ antialias: true }); // Ensure correct initialization of WebGLRenderer, antialiasing true to correct corner errors.
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.BasicShadowMap;

    document.body.appendChild(renderer.domElement); // Append renderer's DOM element to the body

    // Begin animation
    animate();
}




//function to trigger when all resources are loaded
function onResourcesLoaded(){

    // Clone models into meshes
    meshes["tent1"] = models.tent.mesh.clone();
    meshes["tent2"] = models.tent.mesh.clone();
    meshes["campfire1"] = models.campfire_stones.mesh.clone();
    meshes["campfire2"] = models.campfire_stones.mesh.clone();
    meshes["cliff_block_rock"] = models.cliff_block_rock.mesh.clone();
    meshes["cliff_block_rock2"] = models.cliff_block_rock.mesh.clone();
    meshes["cliff_block_rock3"] = models.cliff_block_rock.mesh.clone();
    meshes["cliff_block_rock4"] = models.cliff_block_rock.mesh.clone();
    meshes["cliff_block_rock5"] = models.cliff_block_rock.mesh.clone();
    meshes["cliff_block_rock6"] = models.cliff_block_rock.mesh.clone();

    // Add bounding boxes and add to scene
    addBoundingBox(meshes["tent1"], new THREE.Vector3(5, 5, 5), new THREE.Vector3(0, 0, 4), 'tent1', scene, boundingBoxes);
    scene.add(meshes["tent1"]);

    addBoundingBox(meshes["tent2"], new THREE.Vector3(5, 5, 5), new THREE.Vector3(-5, 0, 4), 'tent2', scene, boundingBoxes);
    scene.add(meshes["tent2"]);

    addBoundingBox(meshes["campfire1"], new THREE.Vector3(5, 5, 5), new THREE.Vector3(-1, 0, 1), 'campfire1', scene, boundingBoxes);
    scene.add(meshes["campfire1"]);

    addBoundingBox(meshes["campfire2"], new THREE.Vector3(5, 5, 5), new THREE.Vector3(-1, 0, 1), 'campfire2', scene, boundingBoxes);
    scene.add(meshes["campfire2"]);

    addBoundingBox(meshes["cliff_block_rock"], new THREE.Vector3(5, 5, 5), new THREE.Vector3(-11, -1, 1), 'cliff_block_rock', scene, boundingBoxes);
    scene.add(meshes["cliff_block_rock"]);


    addBoundingBox(meshes["cliff_block_rock"], new THREE.Vector3(5, 5, 5), new THREE.Vector3(-11, -1, 1), 'cliff_block_rock', scene, boundingBoxes);
    scene.add(meshes["cliff_block_rock"]);

    //TRYING CASUAL CREATION OF MAP
    function getRandomPosition(maxX, maxY, maxZ) {
        return new THREE.Vector3(
            Math.random() * maxX - maxX / 2, //casual x starting from the center
            Math.random() * maxY - maxY / 2, //casual y starting from the center
            Math.random() * maxZ - maxZ / 2  //casual z starting from the center
        );
    }
    for (let i = 2; i <= 6; i++) {
        const meshName = `cliff_block_rock${i}`;
        const position = getRandomPosition(100, 0, 100);
        addBoundingBox(meshes[meshName], new THREE.Vector3(5, 5, 5), position, `cliff_block_rock${i}`, scene, boundingBoxes);
        scene.add(meshes[`cliff_block_rock${i}`]);
    }

    //player weapon
    meshes["playerWeapon"] = models.pistol.mesh.clone();
    meshes["playerWeapon"].position.set(0,1,0);
    scene.add(meshes["playerWeapon"]);
    meshes["playerWeapon"].scale.set(10, 10, 10);

    //console.log(meshes); here you can see how important asynchronous loop is because if you stamp you see that there are not ordered as they have been put in the closed loop "_key"


}

const clock = new THREE.Clock();

//Player vs Meshes collision function
function checkCollision() {                                                                                         //DA RIVEDERE
    player.bBox.setFromCenterAndSize(camera.position, new THREE.Vector3(1, 2, 1)); //NEED TO REVIEW BECAUSE SEEMS LIKE DOESN'T WORK WITHOUT INCLUDING FIRST THE BOUNDING BOX OF PLAYER QUINDI A CHE SERVE SETFROMCENTER AND SIZE
    for (const key in boundingBoxes) {
        if (player.bBox.intersectsBox(boundingBoxes[key])) {
            return true;
        }
    }
    return false;
}


function animate() {

    if ( RESOURCES_LOADED === false){
        requestAnimationFrame(animate)

        // Rotate the loading screen box
        loadingScreen.box.rotation.x += 0.05;
        loadingScreen.box.rotation.y += 0.05;

        // Bounce the loading screen box
        boxPosition += boxSpeed * boxDirection;
        if (boxPosition > 3 || boxPosition < -3) {
            boxDirection *= -1; // Reverse direction when hitting the boundary
        }
        loadingScreen.box.position.x = Math.sin(boxPosition); //added sin casually and appreciated the animation


        renderer.render(loadingScreen.scene, loadingScreen.camera);
        return;
    }


    requestAnimationFrame(animate); // Tells the browser to smoothly render at 60Hz


    // Rotate our mesh.
    mesh.rotation.x += 0.01;
    mesh.rotation.y += 0.02;

    //rotate box
    box.rotation.y += 0.001;


    // Keyboard movement inputs
    if(keyboard[87]){ // W key
        const previousPosition = camera.position.clone();
        camera.position.x -= Math.sin(camera.rotation.y) * player.speed;
        camera.position.z -= -Math.cos(camera.rotation.y) * player.speed;
        if (checkCollision()) {
            camera.position.copy(previousPosition); //if there is a collision reset the position
        }
    }
    if(keyboard[83]){ // S key
        const previousPosition = camera.position.clone();
        camera.position.x += Math.sin(camera.rotation.y) * player.speed;
        camera.position.z += -Math.cos(camera.rotation.y) * player.speed;
        if (checkCollision()) {
            camera.position.copy(previousPosition); //if there is a collision reset the position
        }
    }
    if(keyboard[65]){ // A key
        // Redirect movement by 90 degrees
        const previousPosition = camera.position.clone();
        camera.position.x += Math.sin(camera.rotation.y + Math.PI/2) * player.speed;
        camera.position.z += -Math.cos(camera.rotation.y + Math.PI/2) * player.speed;
        if (checkCollision()) {
            camera.position.copy(previousPosition); //if there is a collision reset the position
        }
    }
    if(keyboard[68]){ // D key
        const previousPosition = camera.position.clone();
        camera.position.x += Math.sin(camera.rotation.y - Math.PI/2) * player.speed;
        camera.position.z += -Math.cos(camera.rotation.y - Math.PI/2) * player.speed;
        if (checkCollision()) {
            camera.position.copy(previousPosition); //if there is a collision reset the position
        }
    }

    // Keyboard turn camera on player inputs
    if(keyboard[37]){ // left arrow key
        camera.rotation.y -= player.turnSpeed;
    }
    if(keyboard[39]){ // right arrow key
        camera.rotation.y += player.turnSpeed;
    }

    //create a loop to update the bullets every frame
    for(var index = 0; index < bullets.length; index += 1){
        if (bullets[index] === undefined) continue;
        if( bullets[index].alive === false){ //if the bullet is not alive, skip to the next one and remove this one
            bullets.splice(index, 1)
            continue;
        }

        bullets[index].position.add(bullets[index].velocity); //add velocity to bullet's position


        // Check for bullet collisions with models
        for (var key in boundingBoxes) {
            //console.log(boundingBoxes[key] ,key);
            if (boundingBoxes[key] !== null) {
                var bulletBox = new THREE.Box3().setFromObject(bullets[index]);

                //console.log('Checking collision for:', key); // Add key to debug statement
                //console.log('Bullet Box:', bulletBox); // Debugging statement for bullet box
               // console.log('Model Box:', models[key].bbox); // Debugging statement for model box


                if (bulletBox.intersectsBox(boundingBoxes[key])){
                    console.log('Hit:', key);
                    bullets[index].alive = false;
                    scene.remove(bullets[index]);
                    //scene.remove(meshes[key]);
                }
            }
        }
        for (var key in capsuleBoundingBoxes.zombie) {
            //console.log(boundingBoxes[key] ,key);
            if (capsuleBoundingBoxes.zombie[key] !== null) {
                var bulletBox = new THREE.Box3().setFromObject(bullets[index]);

                //console.log('Checking collision for:', key); // Add key to debug statement
                //console.log('Bullet Box:', bulletBox); // Debugging statement for bullet box
                // console.log('Model Box:', models[key].bbox); // Debugging statement for model box
                var capsuleBox = new THREE.Box3().setFromObject(capsuleBoundingBoxes.zombie[key].cBBox);

                if (bulletBox.intersectsBox(capsuleBox)){
                    console.log('Hit:', key);
                    bullets[index].alive = false;
                    scene.remove(bullets[index]);
                    capsuleBoundingBoxes.zombie[key].hp -= 1;
                    if ((capsuleBoundingBoxes.zombie[key].hp) === 0 ){
                        scene.remove(meshes[key]);
                        scene.remove(capsuleBoundingBoxes.zombie[key].cBBox);
                    }
                }
            }
        }
    }

    //spacebar clicked to shoot, it creates a sphere geometry
    if (keyboard[32] && player.canShoot <= 0){
        var bullet = new THREE.Mesh(
            new THREE.SphereGeometry(0.05,8,8),
            new THREE.MeshBasicMaterial({color: 0xffffff})
    );
        bullet.position.set(
            meshes["playerWeapon"].position.x,
            meshes["playerWeapon"].position.y + 0.17,
            meshes["playerWeapon"].position.z
        )

        bullet.velocity =new THREE.Vector3(
            -Math.sin(camera.rotation.y), //being 45grades to give me direction of the bullet sin of y give me direction x
            0, //we have no vertical velocity
            Math.cos(camera.rotation.y)  //being 45grades to give me direction of the bullet cos of y give me direction z
        )
        bullet.alive = true;
        setTimeout(function(){ //timeToLive of the bullets to clear up the scene
                bullet.alive = false;
                scene.remove(bullet);

        },1000);

        bullets.push(bullet);
        scene.add(bullet);
        player.canShoot = 40; //1 bullet per 20 frames
    }
    if (player.canShoot > 0) {
        player.canShoot -= 1;
    }

    // position the gun in front of the camera
    var time = Date.now() * 0.0005;

    meshes["playerWeapon"].position.set(
        camera.position.x - Math.sin(camera.rotation.y + Math.PI/6) * 0.75,
        camera.position.y - 0.5 + Math.sin(time*4 + camera.position.x + camera.position.z)*0.01, //I added the camera.position.x and z to make the inhalation animation irregular when i'm moving
        camera.position.z  + Math.cos(camera.rotation.y + Math.PI/6) * 0.75
    );
    meshes["playerWeapon"].rotation.set(
        camera.rotation.x,
        camera.rotation.y - Math.PI,
        camera.rotation.z
    );

    const delta = clock.getDelta();
    mixers.forEach(mixer => mixer.update(delta));

    // Move zombie towards the camera
    if (meshes["zombie"]) {
        const direction = new THREE.Vector3();
        direction.subVectors(camera.position, meshes["zombie"].position).normalize(); // Calcola la direzione verso la telecamera

        //Setup zombies' velocity
        const speed = 1.6;

        //Update the position of the zombie only on X and Z to let him walk on the Y = 0 (ground)
        meshes["zombie"].position.addScaledVector(new THREE.Vector3(direction.x, 0, direction.z), speed * delta);

        //Update the position of the capsuleBoundingBox only on X and Y
        capsuleBoundingBoxes.zombie["zombie"].cBBox.position.addScaledVector(new THREE.Vector3(direction.x, 0, direction.z), speed * delta);

        //Calculate the rotation to let him look to the camera (player)
        const lookAtPosition = new THREE.Vector3(camera.position.x, meshes["zombie"].position.y, camera.position.z);
        meshes["zombie"].lookAt(lookAtPosition);
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