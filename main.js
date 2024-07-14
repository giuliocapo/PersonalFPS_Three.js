import * as THREE from 'three';

import {
    addBoundingBox,
    addCapsuleBoundingBox,
    addCapsuleOpacityGui, colorFBXModel,
    LoadAnimatedModel, LoadAnimatedModelFinalBoss,
    loadGLTFModel,
    loadModels
} from "./ModelLoader";
import {LightFarm} from "./LightFarm";
import {Sky} from "three/addons/objects/Sky.js";
import {gui} from "./GUIManager";
import {bulletSound, deathSound, easterEgg, initAmbientAudio, randomDeathZombieSound, WoWDBMSound} from "./AudioLoader";
import {getRandomPosition, getRandomPositionOnEdge} from "./positionRandomizer";
import {add} from "three/examples/jsm/nodes/math/OperatorNode";
import {threshold} from "three/examples/jsm/nodes/display/ColorAdjustmentNode";


var scene, camera, renderer, mesh;
var meshFloor;

//ghost
var spotLight;
var sphereGeometry = new THREE.SphereGeometry(0.3, 16, 16);
var sphereMaterial = new THREE.MeshBasicMaterial({ color: '#8f00ff' });
var ghostLight = new THREE.Mesh(sphereGeometry, sphereMaterial);
var miniGhostLight1, miniGhostLight2, miniGhostLight3;

//light
var lightFarm; //lightfarm class

var boxEasterEggValue = 10, boxEasterEgg, boxTexture, boxNormalMap, boxBumpMap;

var mapSize = 100; //Map dimension

var keyboard;
keyboard = {};

var mixers = [];



//create a player object to hold details about the 'player', such as height and move speed
var player = { hp: 3, height: 1.8, speed: 0.5 ,turnSpeed:Math.PI*0.008, canShoot: 0 , bBox: null};

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

    },
    campfire_bricks:{
        obj: "Models/OBJ format/campfire_bricks.obj",
        mtl: "Models/OBJ format/campfire_bricks.mtl",
        mesh: null,
    },
    cliff_block_rock: {
        obj: "Models/OBJ format/cliff_block_rock.obj",
        mtl: "Models/OBJ format/cliff_block_rock.mtl",
        mesh: null,

    },
    crop_pumpkin: {
        obj: "Models/OBJ format/crop_pumpkin.obj",
        mtl: "Models/OBJ format/crop_pumpkin.mtl",
        mesh: null,
    },
    GraveFree:{
        obj: "Models/OBJ format/GraveFree.obj",
        mtl: "Models/OBJ format/GraveFree.mtl",
        mesh: null,
    },
    campfire_planks:{
        obj: "Models/OBJ format/campfire_planks.obj",
        mtl: "Models/OBJ format/campfire_planks.mtl",
        mesh: null,
    },
    tree_pineTallC_detailed:{
        obj: "Models/OBJ format/tree_plateau_fall.obj",
        mtl: "Models/OBJ format/tree_plateau_fall.mtl",
        mesh: null,
    },
    tree_thin_fall:{
        obj: "Models/OBJ format/tree_thin_fall.obj",
        mtl: "Models/OBJ format/tree_thin_fall.mtl",
        mesh: null,
    },
    stump_oldTall:{
        obj: "Models/OBJ format/stump_oldTall.obj",
        mtl: "Models/OBJ format/stump_oldTall.mtl",
        mesh: null,
    },
    log_stackLarge:{
        obj: "Models/OBJ format/log_stackLarge.obj",
        mtl: "Models/OBJ format/log_stackLarge.mtl",
        mesh: null,
    },
    path_stone:{
        obj: "Models/OBJ format/path_stone.obj",
        mtl: "Models/OBJ format/path_stone.mtl",
        mesh: null,
    },
    stone_tallB:{
        obj: "Models/OBJ format/stone_tallB.obj",
        mtl: "Models/OBJ format/stone_tallB.mtl",
        mesh: null,
    },
    statue_head:{
        obj: "Models/OBJ format/statue_head.obj",
        mtl: "Models/OBJ format/statue_head.mtl",
        mesh: null,
    },
    bed_floor:{
        obj: "Models/OBJ format/bed_floor.obj",
        mtl: "Models/OBJ format/bed_floor.mtl",
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

var zombieCount;

var loadFinalBoss; //function global so i can call in animate but define in init
var finalBoss = {};

//Bullets array to hold the bullets
var bullets = [];


function init() {
    //Create a scene and camera //Presentation (2): PR1.1
    scene = new THREE.Scene();

    //Perspective projection: like a cone with all lines converging at the camera's point
    camera = new THREE.PerspectiveCamera(
        75, //field of view
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );

    //MUSIC
    //Ambient Music
    initAmbientAudio('music/Ambient 02.mp3', scene);

    //Sky //presentation(1): PR3.1
    {
        const sky = new Sky();
        sky.scale.set(mapSize + 10, mapSize + 10, mapSize + 10);
        let skyVisible = true;

        sky.material.uniforms['turbidity'].value = 10;
        sky.material.uniforms['rayleigh'].value = 3;
        sky.material.uniforms['mieCoefficient'].value = 0.1;
        sky.material.uniforms['mieDirectionalG'].value = 0.95;
        sky.material.uniforms['sunPosition'].value.set(0.3, -0.038, -0.95)

        scene.add(sky); //add it at the start
        // Add GUI control for Sky
        const skyFolder = gui.addFolder('Sky');
        skyFolder.add({skyVisible: true}, 'skyVisible').name('Toggle Sky').onChange((value) => {
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
        scene.fog = new THREE.FogExp2('#06343f', 0.05);
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
            RESOURCES_LOADED = true; //change to false, so let it see after loaded all models, unless will lag forever :s
            onResourcesLoaded();
        }, 5000);
    };



    //texture loader
    var textureLoader = new THREE.TextureLoader(loadingManager);

    //First Mesh Added in the project, i will maintain it till the end
    //A Mesh is made up of a geometry and a material.
    //Materials affect how the geometry looks, especially under lights.
    mesh = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 1), // width, height, depth
        new THREE.MeshPhongMaterial({color: 0xff4444, wireframe: USE_WIREFRAME}) // Phong material reacts to the light
    );

    mesh.position.y += 1; //move the mesh up 1 meter
    mesh.receiveShadow = true; //tell the mesh to receive
    mesh.castShadow = true; //tell the mesh to cast shadows

    mesh.position.z -= 12;
    mesh.position.x += 0;
    // Add the mesh to the scene.
    scene.add(mesh);

    //Floor //Presentation: PR1.3
    const floorAlphaTexture  = textureLoader.load('FloorTextures/alpha.jpg');
    const floorColorTexture = textureLoader.load('FloorTextures/red_laterite_soil_stones_diff_1k.jpg')
    const floorARMTexture = textureLoader.load('FloorTextures/red_laterite_soil_stones_arm_1k.jpg')//ambient occlusion roughness, metalness
    const floorNormalTexture= textureLoader.load('FloorTextures/red_laterite_soil_stones_nor_gl_1k.jpg')
    const floorDisplacementTexture= textureLoader.load('FloorTextures/red_laterite_soil_stones_disp_1k.jpg')

    floorColorTexture.colorSpace = THREE.SRGBColorSpace; //because the color was given in SRGB from the site
    floorColorTexture.repeat.set(40, 40); //the texture was too small for my floor so i repeate it more times
    floorColorTexture.wrapS = THREE.RepeatWrapping;
    floorColorTexture.wrapT = THREE.RepeatWrapping;
    floorARMTexture.repeat.set(40, 40);
    floorARMTexture.wrapS = THREE.RepeatWrapping;
    floorARMTexture.wrapT = THREE.RepeatWrapping;
    floorNormalTexture.repeat.set(40, 40);
    floorNormalTexture.wrapS = THREE.RepeatWrapping;
    floorNormalTexture.wrapT = THREE.RepeatWrapping;
    floorDisplacementTexture.repeat.set(40, 40);
    floorDisplacementTexture.wrapS = THREE.RepeatWrapping;
    floorDisplacementTexture.wrapT = THREE.RepeatWrapping;


    meshFloor = new THREE.Mesh(
        new THREE.PlaneGeometry(mapSize,mapSize, mapSize,mapSize), //more segments = more polygons, which results in more detail.
        new THREE.MeshStandardMaterial( {
            //transparent: true,
            //alphaMap: floorAlphaTexture,
            map: floorColorTexture,
            aoMap: floorARMTexture,
            roughnessMap: floorARMTexture,
            metalnessMap: floorARMTexture,
            normalMap: floorNormalTexture,
            displacementMap: floorDisplacementTexture,
            displacementScale: 1,
            displacementBias:- 0.250,
            wireframe: USE_WIREFRAME

        }), //wireframe is useful to see the true geometry of things.
    )
    meshFloor.rotation.x -= Math.PI/2; //rotate the mesh of 90grades x.
    meshFloor.receiveShadow = true; //tell the mesh to receive, the floor doesn't need to cast shadow.
    scene.add( meshFloor );

    gui.add(meshFloor.material, 'displacementScale').min(0).max(1).step(0.001).name('floorDisplacementScale');
    gui.add(meshFloor.material, 'displacementBias').min(-1).max(1).step(0.001).name('floorDisplacementBias');

    //House Group
    const house = new THREE.Group(loadingManager); //create a group to create a house mesh that i can modify as a complete object
    //scale house vector
    const scaleHouseVector = new THREE.Vector3(2,2,2);
    house.scale.copy(scaleHouseVector);
    scene.add(house);

    //Walls of the house
    const wallColorTexture = textureLoader.load('HouseTextures/WallTexture/brick_wall_04_diff_1k.jpg')
    const wallARMTexture = textureLoader.load('HouseTextures/WallTexture/brick_wall_04_arm_1k.jpg')//ambient occlusion roughness, metalness
    const wallNormalTexture= textureLoader.load('HouseTextures/WallTexture/brick_wall_04_nor_gl_1k.jpg')

    wallColorTexture.colorSpace = THREE.SRGBColorSpace;
    const walls = new THREE.Mesh(
        new THREE.BoxGeometry(4,3,4),
        new THREE.MeshStandardMaterial({
            map: wallColorTexture,
            aoMap: wallARMTexture,
            roughnessMap: wallARMTexture,
            metalnessMap: wallARMTexture,
            normalMap: wallNormalTexture
        })
    )
    walls.position.y += 3/2; //beacuse height is 3 and is half in the floor, 3/2 = 1.5

    //House boundingbox
    // Create a bounding box from the walls object
    boundingBoxes["walls"] = new THREE.Box3().setFromObject(walls);
    //Create a scaling matrix
    const scaleMatrix = new THREE.Matrix4().makeScale(scaleHouseVector.x, scaleHouseVector.y, scaleHouseVector.z); //this fun create a scaled matrix on x,y and z (diagonale), couldn't use matrix3 because boundingbox got only applyMatrix4.
    //Apply the scaling matrix to the bounding box
    boundingBoxes["walls"].applyMatrix4(scaleMatrix);

    house.add(walls); //add to the house group

    //Rooftop of the House
    const roofColorTexture = textureLoader.load('HouseTextures/RoofTexture/clay_roof_tiles_diff_1k.jpg')
    const roofARMTexture = textureLoader.load('HouseTextures/RoofTexture/clay_roof_tiles_arm_1k.jpg')//ambient occlusion roughness, metalness
    const roofNormalTexture= textureLoader.load('HouseTextures/RoofTexture/clay_roof_tiles_nor_gl_1k.jpg')
    roofColorTexture.colorSpace = THREE.SRGBColorSpace;

    roofColorTexture.repeat.set(4,1);
    roofARMTexture.repeat.set(4,1);
    roofNormalTexture.repeat.set(4,1);

    roofColorTexture.wrapS = THREE.RepeatWrapping;
    roofARMTexture.wrapS = THREE.RepeatWrapping;
    roofNormalTexture.wrapS = THREE.RepeatWrapping;

    roofColorTexture.wrapT = THREE.RepeatWrapping;
    roofARMTexture.wrapT = THREE.RepeatWrapping;
    roofNormalTexture.wrapT = THREE.RepeatWrapping;

    const rooftop = new THREE.Mesh(
        new THREE.ConeGeometry(3.5,1.5,4), //created through three.js documentation 3D renderer
        new THREE.MeshStandardMaterial({
            map: roofColorTexture,
            aoMap: roofARMTexture,
            roughnessMap: roofARMTexture,
            metalnessMap: roofARMTexture,
            normalMap: roofNormalTexture
        })
    )
    rooftop.position.y += 3 + (1.5/2); //so i added the height of the wall and half of the height of the cone, because needs to be at the half as the rooftop
    rooftop.rotation.y += Math.PI /4;
    house.add(rooftop);

    //Door
    const  doorColorTexture = textureLoader.load('HouseTextures/DoorTexture/Door_Wood_001_basecolor.jpg');
    const  doorAmbientOcclusionTexture = textureLoader.load('HouseTextures/DoorTexture/Door_Wood_001_ambientOcclusion.jpg');
    const  doorHeightTexture = textureLoader.load('HouseTextures/DoorTexture/Door_Wood_001_height.jpg');
    const  doorMetallicTexture = textureLoader.load('HouseTextures/DoorTexture/Door_Wood_001_metallic.jpg');
    const  doorNormalTexture = textureLoader.load('HouseTextures/DoorTexture/Door_Wood_001_normal.jpg');
    const  doorOpacityTexture = textureLoader.load('HouseTextures/DoorTexture/Door_Wood_001_opacity.jpg');
    const  doorRoughnessTexture = textureLoader.load('HouseTextures/DoorTexture/Door_Wood_001_roughness.jpg');

    doorColorTexture.colorSpace = THREE.SRGBColorSpace;

    const door = new THREE.Mesh(
        new THREE.PlaneGeometry(2.2, 2.2, 100, 100),
        new THREE.MeshStandardMaterial({
            map: doorColorTexture,
            transparent: true,
            alphaMap: doorOpacityTexture,
            aoMap: doorAmbientOcclusionTexture,
            displacementMap: doorHeightTexture,
            displacementScale: 3.65,
            displacementBias: 0.01,
            normalMap: doorNormalTexture,
            metalnessMap: doorMetallicTexture,
            roughnessMap: doorRoughnessTexture
        })
    )
    door.position.y += 1;
    door.position.z -= 2 + 0.01; //Z FIGHTING the 0.01 is added to avoid that GPU doesn't understand which object is in front of the other, if is the wall or the door
    door.rotation.y += Math.PI;
    house.add(door);

    //Bushes
    const bushColorTexture = textureLoader.load('HouseTextures/BushTexture/leaves_forest_ground_diff_1k.jpg')
    const bushARMTexture = textureLoader.load('HouseTextures/BushTexture/leaves_forest_ground_arm_1k.jpg')//ambient occlusion roughness, metalness
    const bushNormalTexture= textureLoader.load('HouseTextures/BushTexture/leaves_forest_ground_nor_gl_1k.jpg')
    bushColorTexture.colorSpace = THREE.SRGBColorSpace;

    bushColorTexture.repeat.set(2,1);
    bushARMTexture.repeat.set(2,1);
    bushNormalTexture.repeat.set(2,1);

    bushColorTexture.wrapS = THREE.RepeatWrapping;
    bushARMTexture.wrapS = THREE.RepeatWrapping;
    bushNormalTexture.wrapS = THREE.RepeatWrapping;

    bushColorTexture.wrapT = THREE.RepeatWrapping;
    bushARMTexture.wrapT = THREE.RepeatWrapping;
    bushNormalTexture.wrapT = THREE.RepeatWrapping;

    const bushGeometry = new THREE.SphereGeometry(1, 16, 16);
    const bushMaterial = new THREE.MeshStandardMaterial({
        map: bushColorTexture,
        aoMap: bushARMTexture,
        roughnessMap: bushARMTexture,
        metalnessMap: bushARMTexture,
        normalMap: bushNormalTexture
    });

    const bush1 = new THREE.Mesh(bushGeometry,bushMaterial);
    bush1.scale.set(0.6, 0.6, 0.6);
    bush1.position.set(0.8,0.2,2.2);
    bush1.rotation.x += 0.75; //to cover the imperfection of the texture
    house.add(bush1);

    const bush2 = new THREE.Mesh(bushGeometry,bushMaterial);
    bush2.scale.set(0.6, 0.6, 0.6);
    bush2.position.set(1.44,0.2,-2.2);
    bush2.rotation.x += 0.75; //to cover the imperfection of the texture
    house.add(bush2);

    const bush3 = new THREE.Mesh(bushGeometry,bushMaterial);
    bush3.scale.set(0.25, 0.25, 0.25);
    bush3.position.set(0.8,0.1,-2.2);
    bush3.rotation.x += 0.75; //to cover the imperfection of the texture
    house.add(bush3);

    const bush4 = new THREE.Mesh(bushGeometry,bushMaterial);
    bush4.scale.set(0.25, 0.25, 0.25);
    bush4.position.set(-0.8,0.1,2.2);
    bush4.rotation.x += 0.75; //to cover the imperfection of the texture
    house.add(bush4);

    const bush5 = new THREE.Mesh(bushGeometry,bushMaterial);
    bush5.scale.set(0.4, 0.4, 0.4);
    bush5.position.set(-2,0.2,-2.2);
    bush5.rotation.x += 0.75; //to cover the imperfection of the texture
    house.add(bush5);

    //House shadows
    walls.castShadow = true;
    walls.receiveShadow = true;
    rooftop.castShadow = true;
    bush1.castShadow = true;
    bush2.castShadow = true;
    bush3.castShadow = true;
    bush4.castShadow = true;
    bush5.castShadow = true;

    // LIGHTS
    lightFarm = new LightFarm(scene); //initialize constructor of the class

    //add light with lightFarm
    lightFarm.addAmbientLight('#86cdff', 0.220);

    const doorLight = lightFarm.addPointLight('#ff7d46', 15, new THREE.Vector3(0, 3, -2.4));
    house.add(doorLight);

    //ghostLight
    spotLight = new THREE.SpotLight( '#86cdff', 100 );
    spotLight.position.y = 3;
    spotLight.castShadow = true;
    scene.add(spotLight);
    scene.add(ghostLight);

    //miniGhostLights
    miniGhostLight1 = new THREE.PointLight("#8800ff", 6);
    miniGhostLight2 = new THREE.PointLight("#ff0088", 6);
    miniGhostLight3 = new THREE.PointLight("#ff0000", 6);
    scene.add(miniGhostLight1, miniGhostLight2, miniGhostLight3);

    //boxEasterEgg
    {
        boxTexture = textureLoader.load("./textures/crate0/crate0_diffuse.png");
        boxBumpMap = textureLoader.load("textures/crate0/crate0_bump.png");
        boxNormalMap = textureLoader.load("./textures/crate0/crate0_normal.png");

        boxEasterEgg = new THREE.Mesh(
            new THREE.BoxGeometry(3, 3, 3),
            new THREE.MeshPhongMaterial({
                color: 0xffffff,
                map: boxTexture,
                bumpMap: boxBumpMap,
                normalMap: boxNormalMap
            })
        );
        scene.add(boxEasterEgg);
        boxEasterEgg.receiveShadow = true;
        boxEasterEgg.castShadow = true;
        const positionEasterEgg = new THREE.Vector3(45,0,45);
        boxEasterEgg.position.copy(positionEasterEgg);
        boxEasterEgg.position.y = 1.5; //CHANGE THIS TO LET PROF SEE THE MAPPING DONE ON THIS OBJECT
    }

    //LOAD MODELS
    loadModels(models, loadingManager); //load the mesh (obj, mtl) and then store them in meshes at the corresponding key


    //ZOMBIE creation, fabric, factory
    zombieCount = 1;

    for (let i = 1; i <= zombieCount; i++) {
        const zombieName = `zombie${i}`;
        LoadAnimatedModel('zombie/', 'Mremireh_O_Desbiens.fbx', 'Walking.fbx', 'Zombie_Attack.fbx', "Moonwalk.fbx", zombieName, mixers, scene, meshes, loadingManager)
            .then(() => {
                meshes[zombieName].rotation.set(0, Math.PI, 0);
                const position = getRandomPositionOnEdge(mapSize + 50); //let the zombie spawn out of the graveyard
                addCapsuleBoundingBox(meshes[zombieName], new THREE.Vector3(0.02, 0.02, 0.02), position, zombieName, scene, capsuleBoundingBoxes);
                capsuleBoundingBoxes.zombie[zombieName].hp = 5; //added hp integer value to the sub object zombie with name zombie in this case. so now capsuleBoundingBoxes.zombie['zombie'] got mesh and hp.
                capsuleBoundingBoxes.zombie[zombieName].lastAttackTime = 0;
            })
            .catch(error => {
                console.error('Error loading model or animation:', error);
            });
    }
    addCapsuleOpacityGui(); //I invented this type of call to let manage all the capsule opacity together with one folder on GUI

    //load FinalBoss
    function loadBoss(){
        const zombieName = `zombie`;
        LoadAnimatedModelFinalBoss('zombie/', 'Mremireh_O_Desbiens.fbx', 'Walking.fbx', 'Zombie_Attack.fbx', "Moonwalk.fbx", zombieName, mixers, scene, meshes, loadingManager)
            .then(() => {
            })
            .catch(error => {
                console.error('Error loading model or animation:', error);
            });
    }
    loadBoss();

    //loadFinalBoss = loadBoss; //to define it global

    //this is the loading of the strange GLTF mesh
    loadGLTFModel(scene, 'thing.glb', loadingManager);
    //corner light
    const cornerLight1 = lightFarm.addPointLight('#ff7d46', 14, new THREE.Vector3( 45,  4, 45));
    const cornerLight2 = lightFarm.addPointLight('#ff7d46', 14, new THREE.Vector3( -45,  4, 45));
    const cornerLight3 = lightFarm.addPointLight('#ff7d46', 14, new THREE.Vector3( 45,  4, -45));
    const cornerLight4 = lightFarm.addPointLight('#ff7d46', 14, new THREE.Vector3( -45,  4, -45));
    scene.add(cornerLight1,cornerLight2,cornerLight3,cornerLight4);

    //if you want to see the helper for the north-west light
    /*
    const pointLightHelper = new THREE.PointLightHelper( cornerLight1, 1 );
    scene.add( pointLightHelper );
    */


    // Move the camera to 0,player.height,-5 (the Y axis is "up")
    camera.position.set(0, player.height, -5);
    // Point the camera to look at 0,player.height,0
    camera.lookAt(new THREE.Vector3(0, player.height, 0));


    //Player Bounding Box creation
    const cameraBoundingBox = new THREE.BoxGeometry();
    const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const playerBox = new THREE.Mesh(cameraBoundingBox, material);

    player.bBox = new THREE.Box3().setFromObject(playerBox);
    console.log(`${'player'} BBox:`, player.bBox);




    //renderer //Presentation: PR1.2; Presentation(1): PR2.1
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
    meshes["campfire1"] = models.campfire_bricks.mesh.clone();
    meshes["crop_pumpkin"] = models.crop_pumpkin.mesh.clone();
    meshes["campfire_planks1"] = models.campfire_planks.mesh.clone();
    meshes["campfire_planks2"] = models.campfire_planks.mesh.clone();
    meshes["campfire_planks3"] = models.campfire_planks.mesh.clone();
    meshes["tree_pineTallC_detailed1"] = models.tree_pineTallC_detailed.mesh.clone();
    meshes["tree_thin_fall1"] = models.tree_thin_fall.mesh.clone();
    meshes["tree_thin_fall2"] = models.tree_thin_fall.mesh.clone();
    meshes["tree_thin_fall3"] = models.tree_thin_fall.mesh.clone();
    meshes["tree_thin_fall4"] = models.tree_thin_fall.mesh.clone();
    meshes["tree_thin_fall5"] = models.tree_thin_fall.mesh.clone();
    meshes["tree_thin_fall6"] = models.tree_thin_fall.mesh.clone();
    meshes["log_stackLarge1"] = models.log_stackLarge.mesh.clone();
    meshes["stump_oldTall1"] = models.stump_oldTall.mesh.clone();
    meshes["stump_oldTall2"] = models.stump_oldTall.mesh.clone();
    meshes["stump_oldTall3"] = models.stump_oldTall.mesh.clone();
    meshes["stone_tallB1"] = models.stone_tallB.mesh.clone();
    meshes["statue_head"] = models.statue_head.mesh.clone();
    meshes["bed_floor"] = models.bed_floor.mesh.clone();




    meshes["GraveFree0"] = models.GraveFree.mesh.clone();
    meshes["GraveFree1"] = models.GraveFree.mesh.clone();
    meshes["GraveFree2"] = models.GraveFree.mesh.clone();
    meshes["GraveFree3"] = models.GraveFree.mesh.clone();

    meshes["cliff_block_rock"] = models.cliff_block_rock.mesh.clone();
    meshes["cliff_block_rock1"] = models.cliff_block_rock.mesh.clone();
    meshes["cliff_block_rock2"] = models.cliff_block_rock.mesh.clone();
    meshes["cliff_block_rock3"] = models.cliff_block_rock.mesh.clone();
    meshes["cliff_block_rock4"] = models.cliff_block_rock.mesh.clone();
    meshes["cliff_block_rock5"] = models.cliff_block_rock.mesh.clone();
    meshes["cliff_block_rock6"] = models.cliff_block_rock.mesh.clone();
    meshes["cliff_block_rock7"] = models.cliff_block_rock.mesh.clone();
    meshes["cliff_block_rock8"] = models.cliff_block_rock.mesh.clone();
    meshes["cliff_block_rock9"] = models.cliff_block_rock.mesh.clone();
    meshes["cliff_block_rock10"] = models.cliff_block_rock.mesh.clone();



    //Add bounding boxes and add to scene

    //Safe corner spots
    //North West spot
    const safeNWCornerSpot = new THREE.Group();
    scene.add(safeNWCornerSpot);

    addBoundingBox(meshes["tent1"], new THREE.Vector3(5, 5, 5), new THREE.Vector3(40, 0, 45), 'tent1', scene, boundingBoxes);
    meshes["tent1"].rotation.y += Math.PI
    safeNWCornerSpot.add(meshes["tent1"]);

    addBoundingBox(meshes["campfire1"], new THREE.Vector3(5, 5, 5), new THREE.Vector3(40, 0, 40), 'campfire1', scene, boundingBoxes);
    safeNWCornerSpot.add(meshes["campfire1"]);
    const campfire1= lightFarm.addPointLight('#ff7d46', 14, new THREE.Vector3( 40,  1, 40));
    safeNWCornerSpot.add(campfire1);

    addBoundingBox(meshes["crop_pumpkin"], new THREE.Vector3(3, 3, 3), new THREE.Vector3(43, 0, 40), 'crop_pumpkin', scene, boundingBoxes);
    safeNWCornerSpot.add(meshes["crop_pumpkin"]);

    //South West spot
    const safeSWCornerSpot = new THREE.Group();
    scene.add(safeSWCornerSpot);

    meshes["tent2"].rotation.y += -Math.PI/4;
    addBoundingBox(meshes["tent2"], new THREE.Vector3(4, 4, 4), new THREE.Vector3(43, 0, -43), 'tent2', scene, boundingBoxes);

    addBoundingBox(meshes["campfire_planks1"], new THREE.Vector3(5, 5, 5), new THREE.Vector3(40, 0, -40), 'campfire_planks1', scene, boundingBoxes);
    const campfire_planks1= lightFarm.addPointLight('#ff7d46', 14, new THREE.Vector3( 40,  1, -40));

    //South West spot: trees
    meshes["tree_pineTallC_detailed1"].position.set(48, 0, -40);
    meshes["tree_pineTallC_detailed1"].scale.set(5,5,5);
    meshes["tree_thin_fall1"].position.set(41, 0, -47);
    meshes["tree_thin_fall1"].scale.set(5,5,5);
    meshes["tree_thin_fall2"].position.set(44, 0, -47);
    meshes["tree_thin_fall2"].scale.set(5,5,5);
    meshes["tree_thin_fall3"].position.set(48, 0, -43);
    meshes["tree_thin_fall3"].scale.set(5,5,5);

    //South West spot: add meshes
    safeSWCornerSpot.add(meshes["tent2"],meshes["campfire_planks1"],campfire_planks1,meshes["tree_pineTallC_detailed1"],meshes["tree_pineTallC_detailed1"],meshes["tree_thin_fall1"],meshes["tree_thin_fall2"],meshes["tree_thin_fall3"]);

    //North Est spot
    const safeNECornerSpot = new THREE.Group();
    scene.add(safeNECornerSpot);

    //North Est spot: trees
    meshes["tree_thin_fall4"].position.set(-41, 0, 47);
    meshes["tree_thin_fall4"].scale.set(5,5,5);
    meshes["tree_thin_fall5"].position.set(-44, 0, 47);
    meshes["tree_thin_fall5"].scale.set(5,5,5);
    meshes["tree_thin_fall6"].position.set(-48, 0, 43);
    meshes["tree_thin_fall6"].scale.set(5,5,5);
    addBoundingBox(meshes["stone_tallB1"], new THREE.Vector3(4, 4, 4), new THREE.Vector3(-46, 0, 42), 'stone_tallB1', scene, boundingBoxes);

    addBoundingBox(meshes["campfire_planks2"], new THREE.Vector3(5, 5, 5), new THREE.Vector3(-43, 0, 42), 'campfire_planks2', scene, boundingBoxes);
    const campfire_planks2= lightFarm.addPointLight('#ff7d46', 14, new THREE.Vector3( -43,  1, 42));

    meshes["statue_head"].rotation.y += (-Math.PI/2) - (Math.PI/2.5);
    addBoundingBox(meshes["statue_head"], new THREE.Vector3(4, 4, 4), new THREE.Vector3(-42, 0, 45), 'statue_head', scene, boundingBoxes);

    //North Est spot: add meshes
    safeSWCornerSpot.add(meshes["tree_thin_fall4"],meshes["tree_thin_fall5"],meshes["tree_thin_fall6"],meshes["stone_tallB1"],campfire_planks2, meshes["campfire_planks2"],meshes["statue_head"]);


    //South Est spot
    const safeSECornerSpot = new THREE.Group();
    scene.add(safeSECornerSpot);

    addBoundingBox(meshes["campfire_planks3"], new THREE.Vector3(5, 5, 5), new THREE.Vector3(-43, 0, -42), 'campfire_planks3', scene, boundingBoxes);

    addBoundingBox(meshes["log_stackLarge1"], new THREE.Vector3(5, 5, 5), new THREE.Vector3(-48, 0, -42), 'log_stackLarge1', scene, boundingBoxes);

    //South Est spot: trees
    meshes["stump_oldTall1"].position.set(-41, 0, -47);
    meshes["stump_oldTall1"].scale.set(5,5,5);
    meshes["stump_oldTall2"].position.set(-44, 0, -47);
    meshes["stump_oldTall2"].scale.set(5,5,5);
    meshes["stump_oldTall3"].position.set(-48, 0, -43);
    meshes["stump_oldTall3"].scale.set(5,5,5);
    meshes["bed_floor"].position.set(-45.3,  0, -42);
    meshes["bed_floor"].scale.set(5,5,5);

    //South Est spot: add meshes
    safeSECornerSpot.add( meshes["campfire_planks3"],meshes["log_stackLarge1"],meshes["stump_oldTall1"],meshes["stump_oldTall2"],meshes["stump_oldTall3"],meshes["bed_floor"]);

    for (let i = 1; i <= 10; i++) {
        const meshName = `cliff_block_rock${i}`;
        const position = getRandomPosition(100, 0, 100);
        addBoundingBox(meshes[meshName], new THREE.Vector3(5, 5, 5), position, `cliff_block_rock${i}`, scene, boundingBoxes);

        scene.add(meshes[`cliff_block_rock${i}`]);
    }

    //CONSTRAINTS OF THE MAP
    const gravePositions = [
        new THREE.Vector3(0, -3, -57),  //Position for the back side (behind the initial camera view)
        new THREE.Vector3(57, -3, 0),
        new THREE.Vector3(0, -3, 57),
        new THREE.Vector3(-57, -3, 0)
    ];

    const graveRotations = [
        Math.PI / 2,
        Math.PI,
        -Math.PI / 2,
        0
    ];

    for (let i = 0; i < gravePositions.length; i++) {
        const position = gravePositions[i];
        const rotation = graveRotations[i];

        meshes[`GraveFree${i}`].rotation.y += rotation;
        addBoundingBox(meshes[`GraveFree${i}`], new THREE.Vector3(7, 7, 7), position, `GraveFree${i}`, scene, boundingBoxes);
        scene.add(meshes[`GraveFree${i}`]);
    }

    //player weapon
    meshes["playerWeapon"] = models.pistol.mesh.clone();
    meshes["playerWeapon"].position.set(0,1,0);
    scene.add(meshes["playerWeapon"]);
    meshes["playerWeapon"].scale.set(10, 10, 10);

    //console.log(meshes); here you can see how important asynchronous loop is because if you stamp you see that there are not ordered as they have been put in the closed loop "_key"

}


//function to calculate the reflected vector for collision with the meshes (bounce)
function reflectVector(velocity, normal) {
    //Calculate the dot product of the velocity and the normal that will project the velocity vector on the normal vector
    const dotProduct = velocity.dot(normal);

    //Clone the normal vector and scale it by 2 times the dot product to obtain the component on n, that is what we need. The multiplication by 2 is done to be sure that the vector is right reflected
    const scaledNormal = normal.clone().multiplyScalar(2 * dotProduct);

    //Clone the original velocity vector and subtract the scaled normal from it to obtein the perfect reflected vector
    const reflectedVector = velocity.clone().sub(scaledNormal);

    return reflectedVector; //w - 2(w * n)*n that is a bit different from the one we did for phong model but this works better.
}

//COLLISION FUNCTION
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

function checkCollisionZombieWithMeshes(thisZombieCapsuleBox) {
    // Check if the zombie is in rage mode
    if (finalBossRaged) {
        return false; //Avoid all collisions
    }

    for (const key in boundingBoxes) {
        // Skip collision check for GraveFree (graveyard)
        if (key.includes('GraveFree')) {
            continue;
        }

        const zombieBox = new THREE.Box3().setFromObject(thisZombieCapsuleBox);
        if (boundingBoxes[key].intersectsBox(zombieBox)) {
            //console.log('zombieBox hitted');
            return true;
        }
    }
    return false;
}

function checkCollisionZombieWithPlayer(thisZombieCapsuleBox){
    for (const key in capsuleBoundingBoxes.zombie) {
        player.bBox.setFromCenterAndSize(camera.position, new THREE.Vector3(1, 2, 1));
        const zombieBox = new THREE.Box3().setFromObject(thisZombieCapsuleBox);
        if  (player.bBox.intersectsBox(zombieBox)){
            return true;
            }
        else {
            return false;
        }
    }
}


const clock = new THREE.Clock();
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


    requestAnimationFrame(animate); //Tells the browser to smoothly render at 60Hz

    //Ghost
    //calculate ghost position
    const ghostTiming = Date.now() * 0.001; //time in seconds
    const radius = 45;
    const speed = 0.5;


    spotLight.position.x = radius * Math.sin(ghostTiming * speed); //r * sin(teta) teta is the angle that change over time
    spotLight.position.z = radius * Math.cos(ghostTiming * speed); //r * cos(teta) teta is the angle that change over time

    //sincronize ghost with the spotlight
    ghostLight.position.copy(spotLight.position);

    //Calculate mini ghost lights positions
    const offset = mapSize/2 * Math.sin(ghostTiming * speed/2);

    miniGhostLight1.position.x = offset;
    miniGhostLight1.position.z = offset;
    miniGhostLight1.position.y = 0.5;

    miniGhostLight2.position.x = -offset;
    miniGhostLight2.position.z =  offset;
    miniGhostLight2.position.y = 0.5;

    miniGhostLight3.position.x =  (radius - 38) * Math.sin(ghostTiming * speed);
    miniGhostLight3.position.z =  (radius -38) * Math.cos(ghostTiming * speed);
    miniGhostLight3.position.y = Math.sin(ghostTiming * speed)*Math.sin(ghostTiming * speed*2.75)*Math.sin(ghostTiming * speed*3.23); //r * sin(teta) teta is the angle that change over time





    //Rotate mesh (red box)
    mesh.rotation.x += 0.01;
    mesh.rotation.y += 0.02;

    //rotate boxEasterEgg
    boxEasterEgg.rotation.y += 0.001;


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

    //create a loop to update the bullets every frame. Bullets creation.
    for(var index = 0; index < bullets.length; index += 1) {
        if (bullets[index] === undefined) continue;
        if (bullets[index].alive === false) { //if the bullet is not alive, skip to the next one and remove this one
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


                if (bulletBox.intersectsBox(boundingBoxes[key])) {
                    console.log('Hit:', key);

                    //calculate the NORMAL on the hitted surface
                    const normal = new THREE.Vector3();
                    const boundingBox = boundingBoxes[key];

                    //calculates the minimum distances in each dimensions
                    const deltaX = Math.min(
                        Math.abs(bulletBox.max.x - boundingBox.min.x),
                        Math.abs(bulletBox.min.x - boundingBox.max.x)
                    );
                    const deltaY = Math.min(
                        Math.abs(bulletBox.max.y - boundingBox.min.y),
                        Math.abs(bulletBox.min.y - boundingBox.max.y)
                    );
                    const deltaZ = Math.min(
                        Math.abs(bulletBox.max.z - boundingBox.min.z),
                        Math.abs(bulletBox.min.z - boundingBox.max.z)
                    );

                    if (deltaX < deltaY && deltaX < deltaZ) {
                        //If the deltaX is the smallest, it means the collision is on x face.

                        if (bulletBox.max.x > boundingBox.min.x) {
                            //If the bullet hits the right side of the bounding box
                            normal.set(-1, 0, 0); //Normal pointing left
                        } else {
                            //If the bullet hits the left side of the bounding box
                            normal.set(1, 0, 0); //Normal pointing right
                        }
                    } else if (deltaY < deltaX && deltaY < deltaZ) {
                        //If the deltaY is the smallest, it means the collision is on y face.

                        if (bulletBox.max.y > boundingBox.min.y) {
                            //If the bullet hits the top side of the bounding box
                            normal.set(0, -1, 0); //Normal pointing down
                        } else {
                            //If the bullet hits the bottom side of the bounding box
                            normal.set(0, 1, 0); //Normal pointing up
                        }
                    } else {
                        //If the deltaZ is the smallest, it means the collision is on z face.

                        if (bulletBox.max.z > boundingBox.min.z) {
                            //If the bullet hits the front side of the bounding box
                            normal.set(0, 0, -1); //Normal pointing backwards
                        } else {
                            //If the bullet hits the back side of the bounding box
                            normal.set(0, 0, 1); //Normal pointing forwards
                        }
                    }


                    //moves the bullet a bit from the surface because it was remaining blocked inside some meshes.
                    bullets[index].position.add(normal.clone().multiplyScalar(0.1));

                    //reflect the velocity of the bullet that will be updated with bullets[index].position.add(bullets[index].velocity) here above
                    bullets[index].velocity = reflectVector(bullets[index].velocity, normal);

                    /*
                    bullets[index].alive = false;
                    scene.remove(bullets[index]);
                    //scene.remove(meshes[key]);
                     */
                }
            }
        }
        //Check for bullet collisions with zombies
        for (var key in capsuleBoundingBoxes.zombie) {
            //console.log(boundingBoxes[key] ,key);
            if (capsuleBoundingBoxes.zombie[key] !== null && capsuleBoundingBoxes.zombie[key] !== undefined) { //the second check is to solve the fact that we were trying to access now something I deleted here below.
                var bulletBox = new THREE.Box3().setFromObject(bullets[index]);

                var capsuleBox = new THREE.Box3().setFromObject(capsuleBoundingBoxes.zombie[key].cBBox);

                if (bulletBox.intersectsBox(capsuleBox)) {
                    console.log('Hit:', key);
                    bullets[index].alive = false;
                    scene.remove(bullets[index]);
                    capsuleBoundingBoxes.zombie[key].hp -= 1;
                    if ((capsuleBoundingBoxes.zombie[key].hp) === 0) {
                        scene.remove(meshes[key]);
                        scene.remove(capsuleBoundingBoxes.zombie[key].cBBox);
                        delete capsuleBoundingBoxes.zombie[key]; //unless I continue to hit a 'GHOST' capsule box in that position that blocks my bullets because it was remaining in the array.
                        zombieCount -= 1;
                        randomDeathZombieSound();
                        console.log(zombieCount);
                        //Load final boss (finalboss)
                        if(zombieCount === 0){
                            addFinalBoss();
                        }
                        if(zombieCount < 0){
                            showWinScreen();
                        }
                    }
                }
            }
        }

            //check collision easter egg
        var bulletBox = new THREE.Box3().setFromObject(bullets[index]);
        var easterEggBox = new THREE.Box3().setFromObject(boxEasterEgg);
        if (bulletBox.intersectsBox(easterEggBox)) {
            console.log('Hit:', boxEasterEgg);
            bullets[index].alive = false;
            scene.remove(bullets[index]);
            boxEasterEggValue -= 1;
            if (boxEasterEggValue === 0){
                easterEgg();
            }
        }

    }
    //Update the final boss spotlight position
    updateFinalBossSpotlight();
    //final boss rage
    if (finalBossAdded) {
        finalBossRage();
    }

    //spacebar clicked to shoot, it creates a sphere geometry, bullets shoot
    if (keyboard[32] && player.canShoot <= 0){
        bulletSound();
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
            -0.01, //bullet cadence (cadenza)
            Math.cos(camera.rotation.y)  //being 45grades to give me direction of the bullet cos of y give me direction z
        )
        bullet.alive = true;
        setTimeout(function(){ //timeToLive of the bullets to clear up the scene
                bullet.alive = false;
                scene.remove(bullet);

        },1000);

        bullets.push(bullet);
        scene.add(bullet);
        player.canShoot = 20; //3 bullet per sec
    }
    if (player.canShoot > 0) {
        player.canShoot -= 1;
    }

    // position the gun in front of the camera (position weapon)
    var time = Date.now() * 0.0005;

    meshes["playerWeapon"].position.set(
        camera.position.x - Math.sin(camera.rotation.y + Math.PI/6) * 0.75,
        camera.position.y - 0.5 + Math.sin(time*4 + camera.position.x + camera.position.z)*0.01, //I added the camera.position.x and z to make the inhalation animation irregular when I'm moving
        camera.position.z  + Math.cos(camera.rotation.y + Math.PI/6) * 0.75
    );
    meshes["playerWeapon"].rotation.set(
        camera.rotation.x,
        camera.rotation.y - Math.PI,
        camera.rotation.z
    );

    const delta = clock.getDelta(); //the time passed since last frame
    mixers.forEach(mixer => mixer.update(delta)); //update the animation respect to the real time(delta)

    // Move zombie towards the camera
    for (const key in meshes) {
        if (key.startsWith('zombie')) { //check only the mesh that start with zombie that are obviously zombie, so I have all the meshes loaded in mesh without changing anything
            let zombie = meshes[key];
            if (zombie !== undefined && capsuleBoundingBoxes.zombie[key] !== undefined) { //the second check is added because I added the deletion of zombie with his capsule on the collision when he dies so to make the function not join something undefiend, go read on bullet collision with zombie fun why I've done it
                let actions = zombie.userData.actions; //animation logic

                const direction = new THREE.Vector3();
                direction.subVectors(camera.position, zombie.position).normalize(); //Calculate the direction towards the camera, using normalize to make the vector be of unit 1 and maintain the direction

                //Setup zombies' velocity
                const zombieSpeed = 1.6;

                const actualBoxPos = capsuleBoundingBoxes.zombie[key].cBBox.position.clone();
                const actualZombiePos = zombie.position.clone();
                //Update the position of the zombie only on X and Z to let him walk on the Y = 0 (ground)
                zombie.position.addScaledVector(new THREE.Vector3(direction.x, 0, direction.z), zombieSpeed * delta); //speed * delta si to make it consistent with the update of animation respect to delta

                //Update the position of the capsuleBoundingBox only on X and Z
                capsuleBoundingBoxes.zombie[key].cBBox.position.addScaledVector(new THREE.Vector3(direction.x, 0, direction.z), zombieSpeed * delta);

                //******************LEGGI**********
                //QUI FAI LA COLLISIONE DEL TIPO SALVI LA POS DI PRIMA SE LA BOUNDING TOCCA UNA MESH ZOMBIE TORNI ALLA POSIZIONE DI PRIMA


                // Calculate the rotation to let him look at the camera (player)
                const lookAtPosition = new THREE.Vector3(camera.position.x, zombie.position.y, camera.position.z);
                zombie
                    .lookAt(lookAtPosition);

                //zombie collision meshes
                if(checkCollisionZombieWithMeshes(capsuleBoundingBoxes.zombie[key].cBBox)) { //if this is true the zombie im blocking is the one making this true so the one on which we are updating position
                    capsuleBoundingBoxes.zombie[key].cBBox.position.copy(actualBoxPos);
                    zombie.position.copy(actualZombiePos);
                }
                //zombie collision player
                if (checkCollisionZombieWithPlayer(capsuleBoundingBoxes.zombie[key].cBBox)){
                    capsuleBoundingBoxes.zombie[key].cBBox.position.copy(actualBoxPos);
                    zombie.position.copy(actualZombiePos);

                    zombie.userData.actions.primary.stop();
                    zombie.userData.actions.secondary.play();

                    //Check if the zombie can attack using timestamp
                    const currentTime = Date.now();
                    if(!capsuleBoundingBoxes.zombie[key].lastAttackTime || currentTime - capsuleBoundingBoxes.zombie[key].lastAttackTime  >= 2500){
                        player.hp -= 1;
                        console.log(`Zombie attacked! Player HP: ${player.hp}`);
                        capsuleBoundingBoxes.zombie[key].lastAttackTime = currentTime;
                        showPlayerHealth(player.hp); //This function is on the html, to show hp when they hit me

                        //Show death screen when player health is zero or less
                        if (player.hp === 0) {
                            //play the tertiary animation
                            if (!actions.tertiary.isRunning()){
                                actions.secondary.stop();
                                actions.tertiary.play();
                            }
                            console.log("You are dead!")
                            deathSound();
                            showDeathScreen();
                        }
                    }
                } else{
                    //play the primary animation
                    if (!actions.primary.isRunning()){
                        actions.secondary.stop();
                        actions.primary.play();
                    }
                }
            }

        }
    }
    // Draw the scene from the perspective of the camera.
    renderer.render(scene, camera);
}

//create the finalBoss spotlight
var finalBossSpotlight = new THREE.SpotLight("#86cdff", 100); //need to set it black or transparent, then activate white and red meshes
finalBossSpotlight.angle = Math.PI / 4;
//finalBossSpotlight.penumbra = 0.1;
finalBossSpotlight.position.set(0, 10, 0); //initial position

var finalBossAdded = false;
var finalBossRaged = false;

function addFinalBoss() {
    if (!finalBossAdded) {
        // Set the zombie's rotation
        meshes["zombie"].rotation.set(0, Math.PI, 0);

        // Get a random position on the edge of the map
        const position = getRandomPositionOnEdge(mapSize);

        // Add a bounding box to the zombie
        addCapsuleBoundingBox(meshes["zombie"], new THREE.Vector3(0.08, 0.08, 0.08), position, "zombie", scene, capsuleBoundingBoxes);

        // Set the HP and last attack time for the zombie
        capsuleBoundingBoxes.zombie["zombie"].hp = 50; // Increase HP for the final boss
        capsuleBoundingBoxes.zombie["zombie"].lastAttackTime = 0;


        // Set spotlight position and target
        finalBossSpotlight.position.set(position.x, position.y + 10, position.z);
        finalBossSpotlight.target = meshes["zombie"];

        // Add the spotlight to the scene
        scene.add(finalBossSpotlight);
        //scene.add(finalBossSpotlight.target);
        scene.add(meshes["zombie"]);
        finalBossAdded = true;
    }
}

// Update function to keep the spotlight above the final boss
function updateFinalBossSpotlight() {
    if (finalBossAdded && meshes["zombie"]) {
        finalBossSpotlight.position.set(
            meshes["zombie"].position.x,
            meshes["zombie"].position.y + 10,
            meshes["zombie"].position.z
        );
        //finalBossSpotlight.target.updateMatrixWorld();
    }
}

//final boss go in rage
var bossInRageEffect = false;
function finalBossRage() {
    if (!bossInRageEffect) {//to let them start only one time
        if (capsuleBoundingBoxes.zombie["zombie"] && capsuleBoundingBoxes.zombie["zombie"].hp === 25 && capsuleBoundingBoxes.zombie["zombie"].hp) {
            console.log('Zombie is in rage mode, avoiding all collisions');

            // Color the zombie red
            colorFBXModel(meshes["zombie"], "red");
            finalBossSpotlight.color.set(0xff0000);
            finalBossRaged = true;

            showFinalBossRage();
            WoWDBMSound();
            bossInRageEffect = true;
        }
    }
}


function KeyDown(event) {
    if(player.hp > 0) { //check if player is alive and so if he can play
        keyboard[event.keyCode] = true;
    }
}
function KeyUp(event) {
    if (player.hp > 0){ //check if player is alive and so if he can play
        keyboard[event.keyCode] = false;
    }
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