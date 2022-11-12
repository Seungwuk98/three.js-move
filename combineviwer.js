import * as THREE from 'three';

import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js'
import { directionManager } from './animationManger/DirectionManager.js'
import { AnimationManager} from './animationManger/AnimationManager.js'
import { Octree } from 'three/addons/math/Octree.js';
import { Capsule } from 'three/addons/math/Capsule.js';



class CombiningLoad {

    constructor() {
        this._setCamera();
        this._setScene();
        this._setOctree();
        this._setGround();
        this._setLight();
        this._setLoader();
        this._setExporter();
        this._setRenderer();
        this._setControl();
        this._onWindowResize();
        this._link = document.createElement('a');
    }

    buildModel(url) {
        this._removeFromViewerAndAddCharacter(url);
        this._setAnimationClock();
        this._animate();
    }
    
    extractAnimation(url) {
        this._fbxLoader.load(url, (object) => {
            this._extractAnimation(object)
        });
    }

    exportThisAvatar() {
        this._gltfExporter.parse(this._model, (gltf) => {
            if (gltf instanceof ArrayBuffer) {
                this._saveArrayBuffer(gltf, 'avatar.glb');
            } else {
                const result = JSON.stringify( gltf, null, 2);
                this._saveString( result, 'avatar.gltf');
            }
        });
    }


    _save( blob, filename ) {
        this._link.href = URL.createObjectURL( blob );
        this._link.download = filename;
        this._link.click();
        // URL.revokeObjectURL( url ); breaks Firefox...
    }

    _setOctree() {
        this._octree = new Octree();
    }

    _addInOctree(object) {
        this._octree.fromGraphNode(object);
    }


    _saveString( text, filename ) {
        this._save( new Blob( [ text ], { type: 'text/plain' } ), filename );
    }

    _saveArrayBuffer( buffer, filename ) {
        this._save( new Blob( [ buffer ], { type: 'application/octet-stream' } ), filename );
    }

    _extractAnimation(object) {
        object.animations.forEach((value) => {
            this._animationDict.push(this._mixer.clipAction(value))
        });
        this._refreshGUI();
    }

    _setUrl(url) {
        this._url = url;
    }

    _setCamera() {
        this._camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 1, 2000 );
        this._camera.position.set(0, 200, -400);
    }

    getCameraDirection() {
        const cameraDirection = new THREE.Vector3();
        this._camera.getWorldDirection(cameraDirection);
        cameraDirection.y = 0;
        cameraDirection.normalize();
        return cameraDirection;
    }

    _setScene() {
        this._scene = new THREE.Scene();
        this._scene.background = new THREE.Color(0xa0a0a0);
        this._scene.fog = new THREE.Fog(0xa0a0a0, 200, 1000);
    }

    _setGround() {
        const mesh = new THREE.Mesh( new THREE.PlaneGeometry( 2000, 2000 ), new THREE.MeshPhongMaterial( { color: 0x999999, depthWrite: false } ) );
        mesh.rotation.x = - Math.PI / 2;
        mesh.receiveShadow = true;
        this._scene.add( mesh );

        const grid = new THREE.GridHelper( 2000, 40, 0x000000, 0x000000 );
        grid.material.opacity = 0.2;
        grid.material.transparent = true;
        grid.receiveShadow = true;
        this._scene.add( grid );

        this._addInOctree(mesh);
        this._addInOctree(grid);
    }

    _setLight() {
        const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444);
        hemiLight.position.set(0, 200, 300);
        this._scene.add(hemiLight);
        
        const dirLight = new THREE.DirectionalLight(0xffffff);
        dirLight.position.set(-100, 200, 0);
        dirLight.castShadow = true;
        dirLight.shadow.camera.top = 500;
        dirLight.shadow.camera.bottom = -500;
        dirLight.shadow.camera.left = -500;
        dirLight.shadow.camera.right = 500;
        this._scene.add(dirLight);
    
        const dirLight2 = new THREE.DirectionalLight(0xffffff);
        dirLight.position.set(-100, 200, 0);
        dirLight.castShadow = true;
        dirLight.shadow.camera.top = 500;
        dirLight.shadow.camera.bottom = -500;
        dirLight.shadow.camera.left = -500;
        dirLight.shadow.camera.right = 500;
        this._scene.add(dirLight2);
    }

    _setLoader() {
        this._fbxLoader = new FBXLoader();
        this._gltfLoader = new GLTFLoader();
    }

    _setExporter() {
        this._gltfExporter = new GLTFExporter();
    }

    _setModel() {
        this._fbxLoader.load(this._url, (object) => {
            this._model = object;
            this._character = object;
            this._scene.add(object);
            
            this._mixer = new THREE.AnimationMixer(object);
            this._animationManager = new AnimationManager(this._mixer);
            this._setCapsuleForModel(object);
            object.traverse(child => {
                if (child instanceof THREE.Mesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
                if (child instanceof THREE.Bone) {
                    child.name = child.name.replace(/^mixamorig12|^mixamorig1|^mixamorig2/, 'mixamorig')
                }
            });
        });
    }

    _setCapsuleForModel(object) {
        const box = (new THREE.Box3).setFromObject(object);
        const height = box.max.y - box.min.y;
        const diameter = box.max.z - box.min.z;

        object._capsule = new Capsule(
            new THREE.Vector3(0, diameter/2, 0),
            new THREE.Vector3(0, height - diameter/2, 0),
            diameter/2
        );
    }
    
    _setRenderer() {
        this._renderer = new THREE.WebGLRenderer({ antialias: true });
        this._renderer.setPixelRatio( window.devicePixelRatio );
        this._renderer.setSize( window.innerWidth, window.innerHeight );
        this._renderer.shadowMap.enabled = true;
        this._renderer.shadowMap.type = THREE.VSMShadowMap;
        document.body.appendChild( this._renderer.domElement );
    }

    _setControl() {
        this._controls = new OrbitControls( this._camera, this._renderer.domElement );
        this._controls.target.set(0, 100, 0);
        this._controls.update();
    }

    _onWindowResize() {
        window.addEventListener('resize', () => {
            this._camera.aspect = window.innerWidth / window.innerHeight;
            this._camera.updateProjectionMatrix();
            
            this._renderer.setSize(window.innerWidth, window.innerHeight);
        })
    }

    _setAnimationClock() {
        this._clock = new THREE.Clock();
    }

    _animate() {
        requestAnimationFrame(this._animate.bind(this));
        const delta = this._clock.getDelta();
        this._renderer.render(this._scene, this._camera);
        if (this._mixer && this._animationManager) {
            this._mixer.update(delta);
            directionManager.applyFallAccelerate();
            this._collisionSetting();
            this._followCapsule();
            this._rotateModel();
            this._animationManager.changeAnimation(directionManager.getOriginalDirection());
        }
    }



    _rotateModel() {
        const angleCameraDirectionAxisY = Math.atan2(
            this._camera.position.x - this._model.position.x,
            this._camera.position.z - this._model.position.z
        ) + Math.PI;

        const rotateQuaternion = new THREE.Quaternion();
        rotateQuaternion.setFromAxisAngle(
            new THREE.Vector3(0,1,0),
            angleCameraDirectionAxisY
        );

        this._model.quaternion.rotateTowards(rotateQuaternion, THREE.MathUtils.degToRad(10));

    }

    _movingModelAndCamera() {
        const velocity = directionManager.getVelocity();
        this._model.position.set(
            this._model.position.x + velocity.x,
            this._model.position.y + velocity.y,
            this._model.position.z + velocity.z
        );
        this._camera.position.set(
            this._camera.position.x + velocity.x,
            this._camera.position.y + velocity.y,
            this._camera.position.z + velocity.z,
        );

        this._controls.target.set(this._model.position.x, this._model.position.y + 100, this._model.position.z);
    }

    _collisionSetting() {
        const velocity = directionManager.getVelocity();
        this._model._capsule.translate(velocity);
        
        const result = this._octree.capsuleIntersect(this._model._capsule);
        if (result) {
            this._model._capsule.translate(result.normal.multiplyScalar(result.depth));
            directionManager.stopFalling();
            directionManager.setFalltime();
            directionManager.setModelCanJump();
        }
    }


    _followCapsule() {
        const previousPosition = this._model.position.clone();
        this._model.position.set(
            this._model._capsule.start.x,
            this._model._capsule.start.y - this._model._capsule.radius,
            this._model._capsule.start.z
        );

        this._camera.position.set(
            this._camera.position.x + this._model.position.x - previousPosition.x,
            this._camera.position.y + this._model.position.y - previousPosition.y,
            this._camera.position.z + this._model.position.z - previousPosition.z
        )

        this._controls.target.set(this._model.position.x, this._model.position.y + 100, this._model.position.z);
    }



    _removeFromViewerAndAddCharacter(url) {
        if (this._character) this._scene.remove(this._character);
        this._setUrl(url);
        this._setModel();
    }

}

export let loadAvatar = new CombiningLoad();
loadAvatar.buildModel('./default.fbx')
