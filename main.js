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
var player = { height: 1.8, speed: 0.2 ,turnSpeed:Math.PI*0.002, canShoot: 0 };
var USE_WIREFRAME = false;

//loading screen object (scene, camera, mesh)
var loadingScreen = {
    scene: new THREE.Scene(),
    camera: new THREE.PerspectiveCamera(90, window.innerWidth/window.innerHeight, 0.1, 100),
    box: new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.5, 0.5),
        new THREE.MeshBasicMaterial({color: 0x4444ff})
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
        bbox: null
    },
    campfire_stones: {
        obj: "Models/OBJ format/campfire_stones.obj",
        mtl: "Models/OBJ format/campfire_stones.mtl",
        mesh: null,
        bbox: null
    },
    cliff_block_rock: {
        obj: "Models/OBJ format/cliff_block_rock.obj",
        mtl: "Models/OBJ format/cliff_block_rock.mtl",
        mesh: null,
        bbox: null
    },
    pistol: {
        obj: "Models/OBJ weapons/uziLong.obj",
        mtl: "Models/OBJ weapons/uziLong.mtl",
        mesh: null,
        bbox: null
    }
}
//Meshes object to index and will store every object appears in the scene indexed by a key
var meshes = {}

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

    const loaderSkybox = new THREE.CubeTextureLoader();
    scene.background = loaderSkybox.load([
        'zombieSkybox1.png',
        'zombieSkybox1.png',
        'zombieSkybox1.png',
        'zombieSkybox1.png',
        'zombieSkybox1.png',
        'zombieSkybox1.png'
    ]);


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


    //Load Models
    //I wrap everything in the for loop in a function to stop the key variable from changing during the loading process
    //first will do "myFirstObj" the loop then changes to "secondObj" the first one when finished put the mesh into _key and you can end up with a mesh loaded in the wrong place
    for (var _key in models) { // Iterate through all keys (tent, campfire_stones, cliff_block_rock) in the models object
        (function(key) { // Create a closure to maintain the value of 'key' for each iteration asynchronous of the loop
            //console.log(_key); first time is tent
            //console.log(key); first time is tent, so will just traverse the models structure
            var mtlLoader = new MTLLoader(loadingManager);
            mtlLoader.load(models[key].mtl, function(materials) {
                materials.preload(); // Prepare the materials for use

                var objLoader = new OBJLoader(loadingManager);

                objLoader.setMaterials(materials);
                objLoader.load(models[key].obj, function(mesh) {

                    mesh.traverse(function(node) { // Traverse all nodes of the loaded mesh
                        if (node instanceof THREE.Mesh) {
                            node.castShadow = true;
                            node.receiveShadow = true;
                        }
                    });
                    models[key].mesh = mesh; // Store the loaded mesh in the models object at the corresponding key
                    // Scale the model here if needed
                    //models[key].mesh.scale.set(5, 5, 5);
                    //scene.add(models[key].mesh);
                    //models[key].bbox = new THREE.Box3().setFromObject(mesh); //TRYING TO CREATE BOUNDING BOX FOR THE MESHES TO BE HITTED
                    //console.log(key, models[key].bbox); // Debugging statement to check bbox initialization
                });
            });

        })(_key); // Pass the current key to the self-invoking function to maintain context of the asynchronous loop
    }
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



//function to trigger when all resources are loaded
function onResourcesLoaded(){

    function setManualBoundingBox(min, max) {
        return new THREE.Box3(min, max);
    }
    function addBoundingBox(mesh, scale, position, key, manualBBox) {
        mesh.position.copy(position);
        mesh.scale.copy(scale);
        scene.add(mesh);
        mesh.updateMatrixWorld(true);

        const boxHelper = new THREE.BoxHelper(mesh, 0xff0000); // Create a BoxHelper
        scene.add(boxHelper);

        // Use the manual bounding box if provided
        if (manualBBox) {
            models[key].bbox = manualBBox;
        } else {
            // Otherwise, calculate the bounding box from the mesh
            // Update the bounding box for collision detection
            models[key].bbox = new THREE.Box3().setFromObject(mesh);
        }


        console.log(key + ' BBox:', models[key].bbox); // Debugging statement for bounding box
    }

    // Clone models into meshes.
    meshes["tent1"] = models.tent.mesh.clone();
    meshes["tent2"] = models.tent.mesh.clone();
    meshes["campfire1"] = models.campfire_stones.mesh.clone();
    meshes["campfire2"] = models.campfire_stones.mesh.clone();
    meshes["cliff_block_rock"] = models.cliff_block_rock.mesh.clone();
    meshes["cliff_block_rock2"] = models.cliff_block_rock.mesh.clone();


    // Reposition individual meshes, then add meshes to scene
    const tent1Position = new THREE.Vector3(0, 0, 4);
    const tent1Scale = new THREE.Vector3(5, 5, 5);

    // Define the manual bounding box dimensions (adjust as needed)
    const tent1Min = new THREE.Vector3(-5, -2.5, -5);
    const tent1Max = new THREE.Vector3(5, 2.5, 5);
    const tent1BBox = setManualBoundingBox(tent1Min, tent1Max);

    addBoundingBox(meshes["tent1"], tent1Scale, tent1Position, 'tent', tent1BBox);



    addBoundingBox(meshes["tent2"], new THREE.Vector3(5, 5, 5), new THREE.Vector3(-5, 0, 4), 'tent');
    //meshes["tent2"].bbox.expandByVector(1, 1, 1);


    scene.add(meshes["campfire1"]);
    scene.add(meshes["campfire2"]);
    meshes["campfire1"].position.set(-1, 0, 1);
    models.tent.bbox.setFromObject(meshes["campfire1"]);
    meshes["campfire2"].position.set(-5, 0, 1);
    models.tent.bbox.setFromObject(meshes["campfire2"]);

    /*meshes["cliff_block_rock"].position.set(-11, -1, 1);
    meshes["cliff_block_rock"].rotation.set(0, Math.PI, 0); // Rotate it to face the other way.
    //scene.add(meshes["cliff_block_rock"]);
    models.tent.bbox.setFromObject(meshes["cliff_block_rock"]);*/
    addBoundingBox(meshes["cliff_block_rock"], new THREE.Vector3(5, 5, 5), new THREE.Vector3(-11, -1, 1), 'cliff_block_rock');
    //addBoundingBox(meshes["cliff_block_rock2"], new THREE.Vector3(5, 5, 5), new THREE.Vector3(-5, -1, -1), 'cliff_block_rock');



    //player weapon
    meshes["playerWeapon"] = models.pistol.mesh.clone();
    meshes["playerWeapon"].position.set(0,1,0);
    scene.add(meshes["playerWeapon"]);
    meshes["playerWeapon"].scale.set(10, 10, 10);


    //console.log(meshes); here you can see how important asynchronous loop is because if you stamp you see that there are not ordered as they have been put in the closed loop "_key"
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

    //create a loop to update the bullets every frame
    for(var index = 0; index<bullets.length; index+=1){
        if (bullets[index] === undefined) continue;
        if( bullets[index].alive === false){ //if the bullet is not alive, skip to the next one and remove this one
            bullets.splice(index, 1)
            continue;
        }

        bullets[index].position.add(bullets[index].velocity); //add velocity to bullet's position


        // Check for bullet collisions with models
        for (var key in models) {
            if (models[key].bbox !== null) {
                var bulletBox = new THREE.Box3().setFromObject(bullets[index]);

                //console.log('Checking collision for:', key); // Add key to debug statement
                //console.log('Bullet Box:', bulletBox); // Debugging statement for bullet box
               // console.log('Model Box:', models[key].bbox); // Debugging statement for model box


                if (bulletBox.intersectsBox(models[key].bbox)) {
                    console.log('Hit:', key);
                    bullets[index].alive = false;
                    //scene.remove(bullets[index]);
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
            Math.cos(camera.rotation.y) - 0.9 //being 45grades to give me direction of the bullet cos of y give me direction z
        )
        bullet.alive = true;
        setTimeout(function(){ //timeToLive of the bullets to clear up the scene
                bullet.alive = false;
                scene.remove(bullet);

        },1000);

        bullets.push(bullet);
        scene.add(bullet);
        player.canShoot = 160; //1 bullet per 20 frames
    }
    if (player.canShoot > 0) {
        player.canShoot -= 1;
    }
    // position the gun in front of the camera
    var time = Date.now() * 0.0005;

    meshes["playerWeapon"].position.set(
        camera.position.x - Math.sin(camera.rotation.y + Math.PI/6) * 0.75,
        camera.position.y - 0.5 + Math.sin(time*4 + camera.position.x + camera.position.z)*0.01, //i added the camera.position.x and z to make the inhalation animation irregular when i'm moving
        camera.position.z  + Math.cos(camera.rotation.y + Math.PI/6) * 0.75
    );
    meshes["playerWeapon"].rotation.set(
        camera.rotation.x,
        camera.rotation.y - Math.PI,
        camera.rotation.z
    );

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