import * as THREE from 'three';

import { loadAvatar } from '../combineviwer.js';

export class DirectionManager {
    constructor() {
        this._keyboard = {'w':false, 'a':false, 's':false, 'd':false, 'shift':false, ' ':false};
        document.addEventListener("keydown", (event) => {
            const key = event.key.toLowerCase();
            this._keyboard[key] = true;
        })
        document.addEventListener("keyup", (event) => {
            const key = event.key.toLowerCase();
            this._keyboard[key] = false;
        });
        this._originalDirection = this._standardDirection = new THREE.Vector3(0,0,1);
        this._setFalling();
        this._jump = false;
        this._jumpStop = false;
        this._preventDuplicateJump = false;
    }

    _setFalling() {
        this._fallStart = new Date();
        this._fallSpeed = 0;
        this._fallAccelerate = 0.5;
    }

    setFalltime() {
        this._fallStart = new Date();
    }

    isFalling() {
        return this._getFallingFulltime() >= 200;
    }

    _getFallingFulltime() {
        return new Date() - this._fallStart;
    }

    applyFallAccelerate() {
        this._fallSpeed += this._fallAccelerate;
    }

    stopFalling() {
        this._fallSpeed = 0;
    }

    _jumpStart() {
        if (!this._preventDuplicateJump) {
            this._jump = true;
            this._jumpStop = true;
            this._preventDuplicateJump = true;
            setTimeout(() => {
                this._fallSpeed = -17;
            }, 500);
            setTimeout(() => {
                this._jump = false;
            }, 700);
            setTimeout(() => {
                this._jumpStop = false;
            }, 500);
        }
    }

    setModelCanJump() {
        this._preventDuplicateJump = false;
    }

    isJumping() {
        return this._jump;
    }

    getFallingSpeed() {
        return this._fallSpeed;
    }

    _getDirection() {
        this._direction = new THREE.Vector3(0,0,0);
        if (this._keyboard[' ']) {
            this._jumpStart();
        }
        if (this._keyboard['w']) {
            this._direction.add(new THREE.Vector3(0,0,1));
        }
        if (this._keyboard['a']) {
            this._direction.add(new THREE.Vector3(1,0,0));
        }
        if (this._keyboard['s']) {
            this._direction.add(new THREE.Vector3(0,0,-1));
        }
        if (this._keyboard['d']) {
            this._direction.add(new THREE.Vector3(-1,0,0));
        }
        if (this._direction.length() !== 0) {
            this._direction.normalize();
        }
        if (this._keyboard['shift']) {
            this._direction.multiplyScalar(1.3);
        }
        if (this._jumpStop) {
            this._direction = new THREE.Vector3(0,0,0);
        }
        this._originalDirection = this._direction.clone();
        this._direction.applyAxisAngle(new THREE.Vector3(0,1,0), this._getOffset());

        return this._direction
    }

    getOriginalDirection() {
        return this._originalDirection;
    }

    _getOffset() {
        const cameraDirection = loadAvatar.getCameraDirection();
        let angle = cameraDirection.angleTo(this._standardDirection);
        if (cameraDirection.x < 0) angle = 2*Math.PI - angle;
        return angle
    }

    getVelocity() {
        this._speed = 5;
        return this._getDirection().multiplyScalar(this._speed).setY(-this.getFallingSpeed());
    }
}

export const directionManager = new DirectionManager();
