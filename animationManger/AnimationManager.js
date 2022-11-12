import * as THREE from 'three';

import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { directionManager } from './DirectionManager.js';

export class AnimationManager {
    constructor(mixer) {
        this._animationClips = {}
        this._animationNames = ['back', 'fall', 'idle', 'jump', 'landing', 'left', 'right', 'run', 'walk'];
        this._animationNames.forEach((key) => {
            new FBXLoader().load(`./animation/${key}.fbx`, (object) => {
                const animationObject= object.animations[0];
                this._animationClips[key] = mixer.clipAction(animationObject);
                if (key === 'idle') {
                    this._previous = this._current = this._animationClips[key];
                    this._animationClips[key].play();
                } 
                if (key === 'jump') {
                    this._animationClips[key].setLoop(THREE.LoopOnce);
                    this._animationClips[key].clampWhenFinished = true;
                    this._animationClips[key].enable = true;
                }
            });
        })
    }

    getAnimationClip(key) {
        return this._animationClips[key];
    }

    changeAnimation(direction) {
        this._previous = this._current;
        if (directionManager.isJumping()) {
        this._current = this.getAnimationClip('jump');
        } else if (directionManager.isFalling()) {
            this._current = this.getAnimationClip('fall');
        } else if (direction.z > 1) {
            this._current = this.getAnimationClip('run');
        } else if (direction.z > 0) {
            this._current = this.getAnimationClip('walk');
        } else if (direction.z < 0) {
            this._current = this.getAnimationClip('back');
        } else if (direction.x > 0) {
            this._current = this.getAnimationClip('left');
        } else if (direction.x < 0) {
            this._current = this.getAnimationClip('right');
        } else {
            this._current = this.getAnimationClip('idle');
        }

        if (this._previous != this._current) {
            this._previous.fadeOut(0.5);
            this._current.reset().fadeIn(0.5).play();
        }
    }
}
