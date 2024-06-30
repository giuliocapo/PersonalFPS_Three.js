import * as THREE from 'three';
import {gui} from "./GUIManager";

var listener = new THREE.AudioListener;
var ambientVolume = {value: 1 };
export function initAmbientAudio(url, scene){

    scene.add(listener);
    const sound = new THREE.Audio(listener);
    const loader = new THREE.AudioLoader();
    // Function to handle the user gesture and start the audio
    function startAudio() {
        loader.load(url, (buffer) => {
            // This callback function is executed once the audio file is loaded

            // Set the loaded audio buffer to the audio source
            sound.setBuffer(buffer);

            // Set the initial volume
            sound.setVolume(ambientVolume.value);

            // Play the sound
            sound.play();
        });
        // Remove the event listener once audio has started
        window.removeEventListener('click', startAudio); //I added this part of code because without sometimes edge scene is buggo.
    }
    // Add an event listener for user gesture to start the audio
    window.addEventListener('click', startAudio);

    // Add GUI control for the ambient audio volume
    const AmbientAudioFolder = gui.addFolder('Ambient Audio');
    AmbientAudioFolder.add(ambientVolume, 'value', 0, 1).name('Volume').onChange((value) => {
        // Update the volume of the sound when changed via GUI
        sound.setVolume(value);
    });
    AmbientAudioFolder.open();
}

export function bulletSound(){
    //Create a new audio source
    const shootSound = new THREE.Audio(listener);

    //Create an AudioLoader to load the audio file
    const loader = new THREE.AudioLoader();

    //Load the sound and play it once it is ready
    loader.load('music/uzi_shot.mp3', (buffer) => {
        //This is the callback function that will execute once the audio file is loaded

        //Set the loaded audio buffer to the audio source
        shootSound.setBuffer(buffer);
        shootSound.setVolume(1);
        shootSound.play();
    });
}

//Easter egg function when you do something on the map launch this function killing the ambient sound inserting THE ZOMBIE SONG
export function easterEgg(){
    //Create a new audio source
    const shootSound = new THREE.Audio(listener);

    //Create an AudioLoader to load the audio file
    const loader = new THREE.AudioLoader();

    //Load the sound and play it once it is ready
    loader.load('music/Black Ops Zombies Soundtrack -  115 .mp3', (buffer) => {
        //This is the callback function that will execute once the audio file is loaded

        //Set the loaded audio buffer to the audio source
        shootSound.setBuffer(buffer);
        shootSound.setVolume(1);
        shootSound.play();
    });
}